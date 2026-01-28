/**
 * Apify Webhook Endpoint
 * 
 * Tento endpoint:
 * 1. Prijíma notifikácie od Apify keď scraping skončí
 * 2. Sťahuje dáta z datasetu
 * 3. Čistí a normalizuje dáta
 * 4. Generuje fingerprint pre deduplikáciu
 * 5. Ukladá do databázy cez Prisma
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApifyDatasetItems, type ApifyScrapedItem } from "@/lib/scraper/apify-service";
import { generateCoreFingerprint } from "@/lib/matching/fingerprint";

// ============================================================================
// HELPER FUNKCIE PRE ČISTENIE DÁT
// ============================================================================

/**
 * Parsuje cenu z raw stringu
 * Príklady: "150 000 €", "150000", "Cena dohodou"
 */
function parsePrice(priceRaw: string | undefined): number {
  if (!priceRaw) return 0;
  
  const lower = priceRaw.toLowerCase();
  
  // Cena dohodou
  if (
    lower.includes("dohodou") ||
    lower.includes("dohoda") ||
    lower.includes("info v rk") ||
    lower.includes("na vyžiadanie")
  ) {
    return 0; // Špeciálna hodnota
  }
  
  // Vyčisti a parsuj
  const cleaned = priceRaw.replace(/[^0-9]/g, "");
  const price = parseInt(cleaned, 10);
  
  // Validácia
  if (price < 1000 || price > 50000000) {
    return 0;
  }
  
  return price;
}

/**
 * Parsuje plochu z raw stringu
 * Príklady: "85 m²", "85m2", "85"
 */
function parseArea(areaRaw: string | undefined): number {
  if (!areaRaw) return 0;
  
  const match = areaRaw.match(/(\d+(?:[.,]\d+)?)/);
  if (!match) return 0;
  
  const area = parseFloat(match[1].replace(",", "."));
  
  // Validácia (10 - 10000 m²)
  if (area < 10 || area > 10000) {
    return 0;
  }
  
  return area;
}

/**
 * Parsuje počet izieb
 */
function parseRooms(roomsRaw: string | undefined): number | null {
  if (!roomsRaw) return null;
  
  const match = roomsRaw.match(/(\d+)/);
  if (!match) return null;
  
  const rooms = parseInt(match[1], 10);
  return rooms > 0 && rooms < 20 ? rooms : null;
}

/**
 * Parsuje poschodie
 */
function parseFloor(floorRaw: string | undefined): number | null {
  if (!floorRaw) return null;
  
  const lower = floorRaw.toLowerCase();
  
  // Prízemie
  if (lower.includes("prízemie") || lower.includes("prízem")) {
    return 0;
  }
  
  // Suterén
  if (lower.includes("suterén") || lower.includes("pivot")) {
    return -1;
  }
  
  const match = floorRaw.match(/(\d+)/);
  if (!match) return null;
  
  return parseInt(match[1], 10);
}

/**
 * Normalizuje stav nehnuteľnosti
 */
function parseCondition(conditionRaw: string | undefined): string | null {
  if (!conditionRaw) return null;
  
  const lower = conditionRaw.toLowerCase();
  
  if (lower.includes("novostavba") || lower.includes("nová")) return "NOVOSTAVBA";
  if (lower.includes("komplet") && lower.includes("rekon")) return "KOMPLETNA_REKONSTRUKCIA";
  if (lower.includes("čiastoč") && lower.includes("rekon")) return "CIASTOCNA_REKONSTRUKCIA";
  if (lower.includes("pôvodný") || lower.includes("povodny")) return "POVODNY_STAV";
  if (lower.includes("dobrý") || lower.includes("dobry")) return "DOBRY_STAV";
  if (lower.includes("veľmi dobrý")) return "VELMI_DOBRY_STAV";
  
  return "NEZISTENY";
}

/**
 * Určí typ nehnuteľnosti z URL alebo titulku
 */
function detectPropertyType(url: string, title: string): string {
  const combined = (url + " " + title).toLowerCase();
  
  if (combined.includes("/byty/") || combined.includes("byt") || combined.includes("garsónka")) {
    return "BYT";
  }
  if (combined.includes("/domy/") || combined.includes("dom") || combined.includes("rodinný")) {
    return "DOM";
  }
  if (combined.includes("/pozemky/") || combined.includes("pozemok") || combined.includes("stavebný")) {
    return "POZEMOK";
  }
  if (combined.includes("/komercne/") || combined.includes("komerčn") || combined.includes("kancelár")) {
    return "KOMERCNE";
  }
  
  return "BYT"; // Default
}

/**
 * Určí typ transakcie z URL
 */
function detectTransactionType(url: string): string {
  const lower = url.toLowerCase();
  
  if (lower.includes("/prenajom/") || lower.includes("prenájom")) {
    return "PRENAJOM";
  }
  
  return "PREDAJ";
}

/**
 * Generuje slug z titulku
 */
function generateSlug(title: string, externalId: string): string {
  const base = title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .substring(0, 80);
  
  return `${base}-${externalId.slice(-8)}`;
}

/**
 * Extrahuje externalId z URL
 */
function extractExternalId(url: string): string {
  // Nehnutelnosti.sk: /detail/abc123/
  const nehnutMatch = url.match(/\/detail\/([^\/]+)/);
  if (nehnutMatch) return `nh-${nehnutMatch[1]}`;
  
  // Bazoš: /inzerat/12345/
  const bazosMatch = url.match(/\/inzerat\/(\d+)/);
  if (bazosMatch) return `bz-${bazosMatch[1]}`;
  
  // Fallback
  return `uk-${Date.now()}`;
}

// ============================================================================
// SPRACOVANIE JEDNÉHO ITEMU
// ============================================================================

async function processItem(item: ApifyScrapedItem): Promise<{
  success: boolean;
  action: "created" | "updated" | "skipped";
  error?: string;
}> {
  try {
    const price = parsePrice(item.price_raw);
    const area = parseArea(item.area_m2);
    const city = item.location?.city || "Slovensko";
    
    // Validácia - musí mať aspoň niečo užitočné (cena ALEBO plocha ALEBO obrázky)
    const isPriceNegotiable = item.price_raw?.toLowerCase().includes("dohodou");
    const hasPrice = price > 0 || isPriceNegotiable;
    const hasArea = area > 0;
    const hasImages = (item.images || []).length > 0;
    const hasTitle = !!item.title;
    
    // Musí mať aspoň titulok a (cenu ALEBO plochu)
    if (!hasTitle) {
      return { success: false, action: "skipped", error: "Missing title" };
    }
    
    if (!hasPrice && !hasArea) {
      return { success: false, action: "skipped", error: "Missing both price and area" };
    }
    
    const externalId = extractExternalId(item.url);
    const propertyType = detectPropertyType(item.url, item.title || "");
    const listingType = detectTransactionType(item.url);
    
    // Generuj fingerprint pre deduplikáciu
    const fingerprint = generateCoreFingerprint({
      city,
      district: item.location?.district || "",
      area_m2: area,
      rooms: parseRooms(item.rooms),
    });
    
    const pricePerM2 = area > 0 ? Math.round(price / area) : 0;
    const slug = generateSlug(item.title || "nehnutelnost", externalId);
    
    // Priprav dáta pre Prisma (snake_case podľa schémy)
    const images = item.images || [];
    const thumbnailUrl = images.length > 0 ? (images[0].startsWith("//") ? `https:${images[0]}` : images[0]) : null;
    const propertyData = {
      title: item.title || "Bez názvu",
      slug,
      description: item.description || "",
      price,
      price_per_m2: pricePerM2,
      area_m2: area,
      rooms: parseRooms(item.rooms),
      floor: parseFloor(item.floor),
      condition: parseCondition(item.condition) || "NEZISTENY",
      energy_certificate: "NEZISTENY" as const,
      city,
      district: item.location?.district || "",
      street: item.location?.street || null,
      address: item.location?.full || city,
      photos: JSON.stringify(images),
      thumbnail_url: thumbnailUrl,
      photo_count: images.length,
      source: item.portal === "nehnutelnosti" ? "NEHNUTELNOSTI" : 
              item.portal === "bazos" ? "BAZOS" : "REALITY",
      source_url: item.url,
      external_id: externalId,
      listing_type: listingType === "PRENAJOM" ? "PRENAJOM" : "PREDAJ",
      status: "ACTIVE" as const,
      last_seen_at: new Date(),
    };
    
    // Upsert - vytvor alebo aktualizuj
    const existing = await prisma.property.findFirst({
      where: {
        OR: [
          { external_id: externalId },
          { source_url: item.url },
        ],
      },
    });
    
    if (existing) {
      // Aktualizuj existujúcu
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
      
      // Pridaj do histórie cien ak sa zmenila
      if (existing.price !== price && price > 0) {
        await prisma.priceHistory.create({
          data: {
            propertyId: existing.id,
            price,
            price_per_m2: pricePerM2,
          },
        });
      }
      
      return { success: true, action: "updated" };
    } else {
      // Vytvor novú
      const newProperty = await prisma.property.create({
        data: propertyData as any, // Type assertion kvôli Prisma
      });
      
      // Pridaj prvú cenu do histórie
      if (price > 0) {
        await prisma.priceHistory.create({
          data: {
            propertyId: newProperty.id,
            price,
            price_per_m2: pricePerM2,
          },
        });
      }
      
      return { success: true, action: "created" };
    }
    
  } catch (error) {
    return {
      success: false,
      action: "skipped",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// ============================================================================
// WEBHOOK HANDLER
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    
    console.log("📥 [Webhook] Received Apify notification:", {
      resourceId: payload.resourceId,
      datasetId: payload.datasetId,
      portal: payload.portal,
      status: payload.status,
    });
    
    // Validácia
    if (!payload.datasetId) {
      return NextResponse.json(
        { success: false, error: "Missing datasetId" },
        { status: 400 }
      );
    }
    
    // Stiahni dáta z Apify
    console.log("📦 [Webhook] Fetching dataset items...");
    const items = await getApifyDatasetItems(payload.datasetId);
    console.log(`📊 [Webhook] Received ${items.length} items`);
    
    // Spracuj každý item
    const stats = {
      total: items.length,
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [] as string[],
    };
    
    for (const item of items) {
      const result = await processItem(item);
      
      if (result.action === "created") stats.created++;
      else if (result.action === "updated") stats.updated++;
      else stats.skipped++;
      
      if (result.error) {
        stats.errors.push(result.error);
      }
    }
    
    console.log("✅ [Webhook] Processing complete:", stats);
    
    return NextResponse.json({
      success: true,
      portal: payload.portal,
      stats,
    });
    
  } catch (error) {
    console.error("❌ [Webhook] Error:", error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * GET - Health check
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    message: "Apify webhook endpoint is ready",
    timestamp: new Date().toISOString(),
  });
}
