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
import { getApifyDatasetItems } from "@/lib/scraper/apify-service";
import { prisma } from "@/lib/prisma";
import { generateCoreFingerprint } from "@/lib/matching/fingerprint";

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

// ============================================================================
// API HANDLER
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const datasetId = searchParams.get("datasetId");
    const portal = searchParams.get("portal") || "nehnutelnosti";
    
    if (!datasetId) {
      return NextResponse.json({
        success: false,
        error: "Missing datasetId parameter",
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
        const city = item.location?.city || "Slovensko";
        
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
          district: item.location?.district || "",
          area_m2: area,
          rooms: parseRooms(item.rooms),
        });
        
        const propertyData = {
          title: item.title,
          slug,
          description: item.description || "",
          price,
          price_per_m2: pricePerM2,
          area_m2: area,
          rooms: parseRooms(item.rooms),
          floor: parseFloor(item.floor),
          condition: item.condition || "NEZISTENY",
          energy_certificate: "NEZISTENY" as const,
          city,
          district: item.location?.district || "",
          street: item.location?.street || null,
          address: item.location?.full || city,
          photos: JSON.stringify(item.images || []),
          photo_count: (item.images || []).length,
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
          const newProperty = await prisma.property.create({
            data: propertyData as any,
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
        }
        
      } catch (error) {
        stats.errors.push(error instanceof Error ? error.message : "Unknown error");
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
