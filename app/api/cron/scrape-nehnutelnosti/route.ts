/**
 * Cron Job - Scraping Nehnutelnosti.sk
 * 
 * Samostatný job pre Nehnutelnosti.sk - beží oddelene od Bazoš
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { scrapeNehnutelnosti, type ScrapedProperty } from "@/lib/scraper/simple-scraper";

// Konfigurácia
const CONFIG = {
  maxPagesPerCategory: 5, // 5 stránok × 2 kategórie = ~200 inzerátov
};

/**
 * Uloží nehnuteľnosti do databázy
 */
async function saveProperties(properties: ScrapedProperty[]): Promise<{ 
  new: number; 
  updated: number;
}> {
  let newCount = 0;
  let updatedCount = 0;

  for (const prop of properties) {
    try {
      // Skontroluj či už existuje
      const existing = await prisma.property.findFirst({
        where: {
          OR: [
            { external_id: prop.externalId },
            { source_url: prop.sourceUrl },
          ],
        },
      });

      if (existing) {
        // Aktualizuj ak sa zmenila cena
        if (existing.price !== prop.price) {
          await prisma.property.update({
            where: { id: existing.id },
            data: {
              price: prop.price,
              price_per_m2: prop.pricePerM2,
              updatedAt: new Date(),
            },
          });
          
          // Zaznamenaj históriu cien
          await prisma.priceHistory.create({
            data: {
              propertyId: existing.id,
              price: prop.price,
              price_per_m2: prop.pricePerM2,
            },
          });
          
          updatedCount++;
        }
      } else {
        // Nová nehnuteľnosť
        const slug = prop.title
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]+/g, "-")
          .substring(0, 100);

        await prisma.property.create({
          data: {
            external_id: prop.externalId,
            source: prop.source,
            title: prop.title,
            slug: `${slug}-${Date.now()}`,
            description: prop.description || "",
            price: prop.price,
            price_per_m2: prop.pricePerM2,
            area_m2: prop.areaM2,
            city: prop.city,
            district: prop.district,
            address: `${prop.city}${prop.district ? `, ${prop.district}` : ""}`,
            rooms: prop.rooms,
            listing_type: prop.listingType,
            condition: "POVODNY",
            energy_certificate: "NONE",
            source_url: prop.sourceUrl,
            is_distressed: false,
          },
        });
        
        newCount++;
      }
    } catch (error) {
      console.warn(`Failed to save property ${prop.externalId}:`, error);
    }
  }

  return { new: newCount, updated: updatedCount };
}

export async function GET() {
  const startTime = Date.now();
  
  console.log("\n" + "=".repeat(60));
  console.log("🟢 NEHNUTELNOSTI.SK SCRAPER - Starting");
  console.log("=".repeat(60) + "\n");

  try {
    // Scrape Nehnutelnosti.sk
    const result = await scrapeNehnutelnosti({
      maxPages: CONFIG.maxPagesPerCategory,
    });

    console.log(`\n✅ Scraped ${result.properties.length} properties from Nehnutelnosti.sk`);
    
    // Ulož do databázy
    const saveResult = await saveProperties(result.properties);
    
    // Log do databázy
    await prisma.dataFetchLog.create({
      data: {
        source: "CRON_NEHNUTELNOSTI",
        status: result.errors.length === 0 ? "success" : "partial",
        recordsCount: result.properties.length,
        duration_ms: Date.now() - startTime,
        error: result.errors.length > 0 ? JSON.stringify(result.errors.slice(0, 5)) : null,
      },
    });

    const totalInDb = await prisma.property.count();
    const duration = Date.now() - startTime;

    console.log("\n" + "=".repeat(60));
    console.log("📊 NEHNUTELNOSTI.SK COMPLETE");
    console.log("=".repeat(60));
    console.log(`  Found: ${result.properties.length}`);
    console.log(`  New: ${saveResult.new}`);
    console.log(`  Updated: ${saveResult.updated}`);
    console.log(`  Total in DB: ${totalInDb}`);
    console.log(`  Duration: ${Math.round(duration / 1000)}s`);
    console.log("=".repeat(60) + "\n");

    return NextResponse.json({
      success: true,
      portal: "NEHNUTELNOSTI",
      found: result.properties.length,
      new: saveResult.new,
      updated: saveResult.updated,
      errors: result.errors.length,
      totalInDatabase: totalInDb,
      duration: duration,
    });

  } catch (error) {
    console.error("❌ Nehnutelnosti.sk scraper error:", error);
    
    await prisma.dataFetchLog.create({
      data: {
        source: "CRON_NEHNUTELNOSTI",
        status: "error",
        recordsCount: 0,
        error: error instanceof Error ? error.message : "Unknown error",
      },
    });

    return NextResponse.json({
      success: false,
      portal: "NEHNUTELNOSTI",
      error: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}

export const runtime = "nodejs";
export const maxDuration = 300;
