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
      // Preskočiť inzeráty bez fotiek (lazy loading - scraper ich nevidí)
      const hasPhotos = prop.imageUrls && prop.imageUrls.length > 0;
      
      // Skontroluj či už existuje podľa external_id
      const existingById = await prisma.property.findFirst({
        where: { external_id: prop.externalId },
      });

      if (existingById) {
        duplicateCount++;
        // Aktualizuj ak sa zmenila cena alebo fotky
        const hasPhotoChanges = prop.imageUrls && prop.imageUrls.length > 0 && 
          (!existingById.photos || existingById.photos === "[]");
        
        if (existingById.price !== prop.price || hasPhotoChanges) {
          await prisma.property.update({
            where: { id: existingById.id },
            data: {
              price: prop.price,
              price_per_m2: prop.pricePerM2,
              // Aktualizuj fotky ak existujú a chýbajú v DB
              ...(hasPhotoChanges && {
                photos: JSON.stringify(prop.imageUrls),
                thumbnail_url: prop.imageUrls![0],
                photo_count: prop.imageUrls!.length,
              }),
              updatedAt: new Date(),
            },
          });
          
          if (existingById.price !== prop.price) {
            await prisma.priceHistory.create({
              data: {
                propertyId: existingById.id,
                price: prop.price,
                price_per_m2: prop.pricePerM2,
              },
            });
          }
          
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
        const hasPhotoChanges = prop.imageUrls && prop.imageUrls.length > 0 && 
          (!existingByUrl.photos || existingByUrl.photos === "[]");
        
        if (existingByUrl.price !== prop.price || hasPhotoChanges) {
          await prisma.property.update({
            where: { id: existingByUrl.id },
            data: {
              price: prop.price,
              price_per_m2: prop.pricePerM2,
              ...(hasPhotoChanges && {
                photos: JSON.stringify(prop.imageUrls),
                thumbnail_url: prop.imageUrls![0],
                photo_count: prop.imageUrls!.length,
              }),
              updatedAt: new Date(),
            },
          });
          updatedCount++;
        }
        continue;
      }

      // Preskočiť nové inzeráty bez fotiek
      if (!hasPhotos) {
        continue;
      }
      
      // Nová nehnuteľnosť - vytvor unikátny slug
      const baseSlug = prop.title
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .substring(0, 80);
      
      // Pridaj random suffix pre unikátnosť
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
          // Fotky
          photos: prop.imageUrls && prop.imageUrls.length > 0 ? JSON.stringify(prop.imageUrls) : "[]",
          thumbnail_url: prop.imageUrls && prop.imageUrls.length > 0 ? prop.imageUrls[0] : null,
          photo_count: prop.imageUrls?.length || 0,
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
      
      // Log first few errors in detail
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
  console.log(`  - Duplicates (already in DB): ${duplicateCount}`);
  console.log(`  - New properties created: ${newCount}`);
  console.log(`  - Price updates: ${updatedCount}`);
  console.log(`  - Errors: ${errorCount}`);

  return { new: newCount, updated: updatedCount, errors: errorCount, duplicates: duplicateCount };
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
      duplicates: saveResult.duplicates,
      saveErrors: saveResult.errors,
      scrapeErrors: result.errors.length,
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
