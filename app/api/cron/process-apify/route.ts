/**
 * Manuálne spracovanie Apify výsledkov
 * 
 * Tento endpoint stiahne dáta z Apify datasetu a uloží ich do databázy.
 * Použite ho ak webhook nefunguje.
 * 
 * Query params:
 * - datasetId: ID Apify datasetu (required)
 * - portal: "nehnutelnosti" | "bazos" (default: nehnutelnosti)
 */

import { NextRequest, NextResponse } from "next/server";
import { getApifyDatasetItems, getApifyRunStatus } from "@/lib/scraper/apify-service";
import { prisma } from "@/lib/prisma";
import { generateCoreFingerprint } from "@/lib/matching/fingerprint";

// Geocoding pomocou Nominatim (OpenStreetMap)
async function geocodeAddress(city: string, district?: string, street?: string): Promise<{ lat: number; lng: number } | null> {
  try {
    let query = city;
    if (district) query = `${district}, ${city}`;
    if (street) query = `${street}, ${district || city}`;
    query += ", Slovensko";

    const url = `https://nominatim.openstreetmap.org/search?` + new URLSearchParams({
      q: query,
      format: "json",
      limit: "1",
      countrycodes: "sk",
    });

    const response = await fetch(url, {
      headers: {
        "User-Agent": "SRIA-RealEstateApp/1.0",
        "Accept": "application/json",
      },
    });

    if (!response.ok) return null;

    const data = await response.json();
    if (!data || data.length === 0) {
      // Fallback - skús len mesto
      if (district || street) {
        return geocodeAddress(city);
      }
      return null;
    }

    return {
      lat: parseFloat(data[0].lat),
      lng: parseFloat(data[0].lon),
    };
  } catch {
    return null;
  }
}

// ============================================================================
// HELPER FUNKCIE
// ============================================================================

function parsePrice(priceRaw: string | undefined): number {
  if (!priceRaw) return 0;
  const lower = priceRaw.toLowerCase();
  if (lower.includes("dohodou") || lower.includes("info v rk")) return 0;
  const cleaned = priceRaw.replace(/[^0-9]/g, "");
  const price = parseInt(cleaned, 10);
  if (price < 1000 || price > 50000000) return 0;
  return price;
}

function parseArea(areaRaw: string | undefined): number {
  if (!areaRaw) return 0;
  const match = areaRaw.match(/(\d+(?:[.,]\d+)?)/);
  if (!match) return 0;
  const area = parseFloat(match[1].replace(",", "."));
  if (area < 10 || area > 10000) return 0;
  return area;
}

function parseRooms(roomsRaw: string | undefined): number | null {
  if (!roomsRaw) return null;
  const match = roomsRaw.match(/(\d+)/);
  if (!match) return null;
  const rooms = parseInt(match[1], 10);
  return rooms > 0 && rooms < 20 ? rooms : null;
}

function parseFloor(floorRaw: string | undefined): number | null {
  if (!floorRaw) return null;
  const lower = floorRaw.toLowerCase();
  if (lower.includes("prízemie")) return 0;
  if (lower.includes("suterén")) return -1;
  const match = floorRaw.match(/(\d+)/);
  if (!match) return null;
  return parseInt(match[1], 10);
}

function extractExternalId(url: string): string {
  const nehnutMatch = url.match(/\/detail\/([^\/]+)/);
  if (nehnutMatch) return `nh-${nehnutMatch[1]}`;
  const bazosMatch = url.match(/\/inzerat\/(\d+)/);
  if (bazosMatch) return `bz-${bazosMatch[1]}`;
  return `uk-${Date.now()}`;
}

function detectListingType(url: string): "PREDAJ" | "PRENAJOM" {
  const lower = url.toLowerCase();
  if (lower.includes("/prenajom/") || lower.includes("prenájom")) return "PRENAJOM";
  return "PREDAJ";
}

function generateSlug(title: string, externalId: string): string {
  const base = title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .substring(0, 80);
  return `${base}-${externalId.slice(-8)}`;
}

function mapCondition(condition: string | undefined | null): "POVODNY" | "REKONSTRUKCIA" | "NOVOSTAVBA" {
  if (!condition) return "POVODNY";
  const lower = condition.toLowerCase();
  
  if (lower.includes("novostavba") || lower.includes("nový") || lower.includes("nova")) {
    return "NOVOSTAVBA";
  }
  if (lower.includes("rekonstrukc") || lower.includes("rekonštruk") || lower.includes("čiastočná") || lower.includes("kompletná")) {
    return "REKONSTRUKCIA";
  }
  // Pôvodný stav ako default
  return "POVODNY";
}

// Slovenské mestá pre extrakciu
const SLOVAK_CITIES = [
  "Bratislava", "Košice", "Prešov", "Žilina", "Nitra", "Banská Bystrica", 
  "Trnava", "Trenčín", "Martin", "Poprad", "Zvolen", "Považská Bystrica",
  "Michalovce", "Spišská Nová Ves", "Komárno", "Levice", "Humenné",
  "Bardejov", "Liptovský Mikuláš", "Ružomberok", "Piešťany", "Topoľčany",
  "Dubnica nad Váhom", "Čadca", "Dunajská Streda", "Skalica", "Pezinok",
  "Senec", "Malacky", "Galanta", "Šaľa", "Nové Zámky", "Partizánske",
  "Hlohovec", "Senica", "Myjava", "Nové Mesto nad Váhom", "Púchov",
  "Prievidza", "Handlová", "Žiar nad Hronom", "Brezno", "Lučenec",
  "Rimavská Sobota", "Veľký Krtíš", "Kežmarok", "Stará Ľubovňa",
  "Svidník", "Snina", "Vranov nad Topľou", "Trebišov", "Rožňava",
  "Sobrance", "Dolný Kubín", "Námestovo", "Tvrdošín"
];

function parseLocationString(locationStr: string): { city: string; district: string; street: string } {
  const result = { city: "", district: "", street: "" };
  if (!locationStr) return result;
  
  // Rozdeľ podľa čiarky
  const parts = locationStr.split(",").map(s => s.trim());
  
  // Hľadaj známe mestá v častiach
  for (const part of parts) {
    for (const city of SLOVAK_CITIES) {
      if (part.toLowerCase().includes(city.toLowerCase())) {
        result.city = city;
        break;
      }
    }
    if (result.city) break;
  }
  
  // Prvá časť je často ulica
  if (parts[0] && !SLOVAK_CITIES.some(c => parts[0].toLowerCase().includes(c.toLowerCase()))) {
    result.street = parts[0];
  }
  
  // Hľadaj okres
  const okresMatch = locationStr.match(/okres\s+([^,]+)/i);
  if (okresMatch) {
    result.district = okresMatch[1].trim();
  } else if (parts.length >= 2) {
    // Druhá časť môže byť mestská časť
    result.district = parts[1];
  }
  
  return result;
}

function extractCityFromUrl(url: string): string {
  const cityMap: Record<string, string> = {
    "bratislava": "Bratislava",
    "kosice": "Košice", 
    "zilina": "Žilina",
    "presov": "Prešov",
    "nitra": "Nitra",
    "trnava": "Trnava",
    "trencin": "Trenčín",
    "banska-bystrica": "Banská Bystrica",
    "martin": "Martin",
    "poprad": "Poprad",
    "zvolen": "Zvolen",
    "michalovce": "Michalovce",
    "humenne": "Humenné",
    "bardejov": "Bardejov",
    "liptovsky-mikulas": "Liptovský Mikuláš",
    "ruzomberok": "Ružomberok",
    "piestany": "Piešťany",
    "komarno": "Komárno",
    "levice": "Levice",
    "dunajska-streda": "Dunajská Streda",
    "pezinok": "Pezinok",
    "senec": "Senec",
    "malacky": "Malacky"
  };
  
  const lower = url.toLowerCase();
  for (const [key, value] of Object.entries(cityMap)) {
    if (lower.includes(`/${key}/`) || lower.includes(`/${key}-`) || lower.includes(`-${key}/`)) {
      return value;
    }
  }
  
  return "Slovensko";
}

function extractCityFromText(text: string): string | null {
  const lower = text.toLowerCase();
  for (const city of SLOVAK_CITIES) {
    if (lower.includes(city.toLowerCase())) {
      return city;
    }
  }
  return null;
}

// ============================================================================
// API HANDLER
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    let datasetId = searchParams.get("datasetId");
    const runId = searchParams.get("runId");
    const portal = searchParams.get("portal") || "nehnutelnosti";
    
    // Ak máme runId, získame z neho datasetId
    if (runId && !datasetId) {
      console.log(`🔍 [ProcessApify] Getting dataset from run: ${runId}`);
      const runStatus = await getApifyRunStatus(runId);
      datasetId = runStatus.datasetId;
      console.log(`📦 [ProcessApify] Found dataset: ${datasetId}`);
    }
    
    if (!datasetId) {
      return NextResponse.json({
        success: false,
        error: "Missing datasetId or runId parameter",
      }, { status: 400 });
    }
    
    console.log(`📦 [ProcessApify] Fetching dataset: ${datasetId}`);
    
    // Stiahni dáta z Apify
    const items = await getApifyDatasetItems(datasetId);
    console.log(`📊 [ProcessApify] Received ${items.length} items`);
    
    const stats = {
      total: items.length,
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [] as string[],
    };
    
    // Spracuj každý item
    for (const item of items) {
      try {
        const price = parsePrice(item.price_raw);
        const area = parseArea(item.area_m2);
        
        // Extrahuj mesto z location (môže byť string alebo objekt)
        let city = "Slovensko";
        let district = "";
        let street = "";
        
        const loc = item.location as string | { city?: string; district?: string; full?: string; street?: string } | undefined;
        
        console.log(`🏠 [ProcessApify] Location raw:`, JSON.stringify(loc));
        
        if (typeof loc === "string") {
          // Bazoš vracia location ako string
          const parts = loc.split(",").map((s: string) => s.trim());
          city = parts[0] || "Slovensko";
          district = parts[1] || "";
          street = parts[2] || "";
        } else if (loc) {
          // Nehnutelnosti vracia objekt
          if (loc.city) city = loc.city;
          if (loc.district) district = loc.district;
          if (loc.street) street = loc.street;
          
          // Ak nemáme city, skús parsovať z full
          if (city === "Slovensko" && loc.full) {
            const parsed = parseLocationString(loc.full);
            if (parsed.city) city = parsed.city;
            if (parsed.district && !district) district = parsed.district;
            if (parsed.street && !street) street = parsed.street;
          }
        }
        
        // Extrahuj mesto z URL ak stále nemáme
        if (city === "Slovensko" && item.url) {
          city = extractCityFromUrl(item.url);
        }
        
        // Ak stále nemáme, skús z titulku
        if (city === "Slovensko" && item.title) {
          const titleCity = extractCityFromText(item.title);
          if (titleCity) city = titleCity;
        }
        
        console.log(`📍 [ProcessApify] Parsed: city=${city}, district=${district}, street=${street}`);
        
        // Základná validácia - musí mať aspoň titulok
        if (!item.title) {
          stats.skipped++;
          continue;
        }
        
        const externalId = extractExternalId(item.url);
        const listingType = detectListingType(item.url);
        const pricePerM2 = area > 0 ? Math.round(price / area) : 0;
        const slug = generateSlug(item.title, externalId);
        
        const fingerprint = generateCoreFingerprint({
          city,
          district,
          area_m2: area,
          rooms: parseRooms(item.rooms),
        });
        
        const images = item.images || [];
        const thumbnailUrl = images.length > 0 ? (images[0].startsWith("//") ? `https:${images[0]}` : images[0]) : null;
        const propertyData = {
          title: item.title,
          slug,
          description: item.description || "",
          price,
          price_per_m2: pricePerM2,
          area_m2: area,
          rooms: parseRooms(item.rooms),
          floor: parseFloor(item.floor),
          condition: mapCondition(item.condition),
          energy_certificate: "NONE" as const,
          city,
          district,
          street: street || null,
          address: (typeof loc === "string" ? loc : (loc?.full || city)),
          photos: JSON.stringify(images),
          thumbnail_url: thumbnailUrl,
          photo_count: images.length,
          source: portal.toUpperCase() === "NEHNUTELNOSTI" ? "NEHNUTELNOSTI" : 
                  portal.toUpperCase() === "BAZOS" ? "BAZOS" : "REALITY",
          source_url: item.url,
          external_id: externalId,
          listing_type: listingType,
          status: "ACTIVE" as const,
          last_seen_at: new Date(),
        };
        
        // Skontroluj či už existuje
        const existing = await prisma.property.findFirst({
          where: {
            OR: [
              { external_id: externalId },
              { source_url: item.url },
            ],
          },
        });
        
        if (existing) {
          await prisma.property.update({
            where: { id: existing.id },
            data: {
              price: propertyData.price,
              price_per_m2: propertyData.price_per_m2,
              photos: propertyData.photos,
              thumbnail_url: propertyData.thumbnail_url,
              photo_count: propertyData.photo_count,
              last_seen_at: new Date(),
              status: "ACTIVE",
            },
          });
          
          if (existing.price !== price && price > 0) {
            await prisma.priceHistory.create({
              data: {
                propertyId: existing.id,
                price,
                price_per_m2: pricePerM2,
              },
            });
          }
          
          stats.updated++;
        } else {
          console.log(`➕ [ProcessApify] Creating: ${item.title?.substring(0, 50)} - ${city}`);
          
          // Geocoding - získaj GPS súradnice z adresy
          let latitude: number | null = null;
          let longitude: number | null = null;
          
          try {
            const coords = await geocodeAddress(city, district, street);
            if (coords) {
              latitude = coords.lat;
              longitude = coords.lng;
              console.log(`📍 [ProcessApify] Geocoded: ${city} → ${latitude}, ${longitude}`);
            }
            // Rate limiting pre Nominatim (1 req/sec)
            await new Promise(r => setTimeout(r, 1100));
          } catch (e) {
            console.warn(`⚠️ [ProcessApify] Geocoding failed for ${city}`);
          }
          
          const newProperty = await prisma.property.create({
            data: {
              ...propertyData,
              latitude,
              longitude,
            } as any,
          });
          
          if (price > 0) {
            await prisma.priceHistory.create({
              data: {
                propertyId: newProperty.id,
                price,
                price_per_m2: pricePerM2,
              },
            });
          }
          
          stats.created++;
          console.log(`✅ [ProcessApify] Created: ${newProperty.id}`);
        }
        
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Unknown error";
        console.error(`❌ [ProcessApify] Error processing item: ${item.url}`, errorMsg);
        stats.errors.push(`${item.url}: ${errorMsg}`);
        stats.skipped++;
      }
    }
    
    console.log("✅ [ProcessApify] Complete:", stats);
    
    return NextResponse.json({
      success: true,
      datasetId,
      portal,
      stats,
    });
    
  } catch (error) {
    console.error("❌ [ProcessApify] Error:", error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: "Use POST with ?datasetId=xxx to process Apify results",
    example: "/api/cron/process-apify?datasetId=abc123&portal=nehnutelnosti",
  });
}
