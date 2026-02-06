/**
 * Cron Job - Scraping Bazoš Reality
 * 
 * Samostatný job pre Bazoš - beží oddelene od Nehnutelnosti.sk
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { scrapeBazos, type ScrapedProperty } from "@/lib/scraper/simple-scraper";

// Konfigurácia – vyšší objem pre plnú databázu
const CONFIG = {
  maxPagesPerCategory: 10, // 10 stránok × 3 kategórie = ~600 inzerátov
};

/**
 * Uloží nehnuteľnosti do databázy
 */
async function saveProperties(properties: ScrapedProperty[]): Promise<{ 
  new: number; 
  updated: number;
  errors: number;
  duplicates: number;
}> {
  let newCount = 0;
  let updatedCount = 0;
  let errorCount = 0;
  let duplicateCount = 0;

  console.log(`\n💾 Saving ${properties.length} properties...`);

  for (const prop of properties) {
    try {
      // Skontroluj či už existuje podľa external_id
      const existingById = await prisma.property.findFirst({
        where: { external_id: prop.externalId },
      });

      if (existingById) {
        duplicateCount++;
        if (existingById.price !== prop.price) {
          await prisma.property.update({
            where: { id: existingById.id },
            data: {
              price: prop.price,
              price_per_m2: prop.pricePerM2,
              updatedAt: new Date(),
            },
          });
          
          await prisma.priceHistory.create({
            data: {
              propertyId: existingById.id,
              price: prop.price,
              price_per_m2: prop.pricePerM2,
            },
          });
          
          updatedCount++;
        }
        continue;
      }

      // Skontroluj podľa source_url
      const existingByUrl = await prisma.property.findFirst({
        where: { source_url: prop.sourceUrl },
      });

      if (existingByUrl) {
        duplicateCount++;
        if (existingByUrl.price !== prop.price) {
          await prisma.property.update({
            where: { id: existingByUrl.id },
            data: {
              price: prop.price,
              price_per_m2: prop.pricePerM2,
              updatedAt: new Date(),
            },
          });
          updatedCount++;
        }
        continue;
      }

      // Nová nehnuteľnosť
      const baseSlug = prop.title
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .substring(0, 80);
      
      const uniqueSlug = `${baseSlug}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

      await prisma.property.create({
        data: {
          external_id: prop.externalId,
          source: prop.source,
          title: prop.title,
          slug: uniqueSlug,
          description: prop.description || "",
          price: prop.price,
          price_per_m2: prop.pricePerM2,
          area_m2: prop.areaM2,
          city: prop.city,
          district: prop.district || prop.city,
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
      
      if (newCount % 10 === 0) {
        console.log(`  ✓ Created ${newCount} new properties...`);
      }
      
    } catch (error) {
      errorCount++;
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error(`❌ Failed to save ${prop.externalId}: ${errorMessage}`);
      
      if (errorCount <= 3) {
        console.error(`  Property data:`, {
          externalId: prop.externalId,
          title: prop.title.substring(0, 50),
          city: prop.city,
          price: prop.price,
        });
      }
    }
  }

  console.log(`\n📊 Save Summary:`);
  console.log(`  - Duplicates: ${duplicateCount}`);
  console.log(`  - New: ${newCount}`);
  console.log(`  - Updated: ${updatedCount}`);
  console.log(`  - Errors: ${errorCount}`);

  return { new: newCount, updated: updatedCount, errors: errorCount, duplicates: duplicateCount };
}

export async function GET() {
  const startTime = Date.now();
  
  console.log("\n" + "=".repeat(60));
  console.log("🟡 BAZOS SCRAPER - Starting");
  console.log("=".repeat(60) + "\n");

  try {
    // Scrape Bazoš
    const result = await scrapeBazos({
      maxPages: CONFIG.maxPagesPerCategory,
    });

    console.log(`\n✅ Scraped ${result.properties.length} properties from Bazos`);
    
    // Ulož do databázy
    const saveResult = await saveProperties(result.properties);
    
    // Log do databázy
    await prisma.dataFetchLog.create({
      data: {
        source: "CRON_BAZOS",
        status: result.errors.length === 0 ? "success" : "partial",
        recordsCount: result.properties.length,
        duration_ms: Date.now() - startTime,
        error: result.errors.length > 0 ? JSON.stringify(result.errors.slice(0, 5)) : null,
      },
    });

    const totalInDb = await prisma.property.count();
    const duration = Date.now() - startTime;

    console.log("\n" + "=".repeat(60));
    console.log("📊 BAZOS COMPLETE");
    console.log("=".repeat(60));
    console.log(`  Found: ${result.properties.length}`);
    console.log(`  New: ${saveResult.new}`);
    console.log(`  Updated: ${saveResult.updated}`);
    console.log(`  Total in DB: ${totalInDb}`);
    console.log(`  Duration: ${Math.round(duration / 1000)}s`);
    console.log("=".repeat(60) + "\n");

    return NextResponse.json({
      success: true,
      portal: "BAZOS",
      found: result.properties.length,
      new: saveResult.new,
      updated: saveResult.updated,
      duplicates: saveResult.duplicates,
      saveErrors: saveResult.errors,
      scrapeErrors: result.errors.length,
      totalInDatabase: totalInDb,
      duration: duration,
    });

  } catch (error) {
    console.error("❌ Bazos scraper error:", error);
    
    await prisma.dataFetchLog.create({
      data: {
        source: "CRON_BAZOS",
        status: "error",
        recordsCount: 0,
        error: error instanceof Error ? error.message : "Unknown error",
      },
    });

    return NextResponse.json({
      success: false,
      portal: "BAZOS",
      error: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}

export const runtime = "nodejs";
export const maxDuration = 300;
