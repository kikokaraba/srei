/**
 * Cron Job - Automatický scraping všetkých portálov
 * 
 * Spúšťa sa automaticky cez Vercel Cron alebo manuálne
 * 
 * Vercel cron: pridaj do vercel.json:
 * {
 *   "crons": [
 *     { "path": "/api/cron/scrape-all", "schedule": "0 3,15 * * *" }
 *   ]
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { scrapePortal, type ScrapedProperty } from "@/lib/scraper/browserless-scraper";
import { notifyHotDeal, notifyUnnotifiedMarketGaps } from "@/lib/telegram/notifications";
import type { ListingType } from "@/generated/prisma/client";

// Scraper teraz scrapuje CELÉ SLOVENSKO - všetky mestá a obce
// Nie je potrebné špecifikovať mestá - portály vracajú všetky inzeráty

// Konfigurácia scrapingu - FAST MODE
const SCRAPE_CONFIG = {
  // Koľko stránok na kategóriu (3 stránky = ~60-90 inzerátov, rýchle)
  maxPagesPerCategory: 3,
  
  // Portály na scrapovanie (všetky 4 hlavné SK portály vrátane Bazoš)
  portals: ["BAZOS", "NEHNUTELNOSTI", "REALITY", "TOPREALITY"] as const,
  
  // Delay medzi portálmi (ms) - krátky delay
  delayBetweenRequests: 500,
};

interface ScrapeStats {
  portal: string;
  city: string;
  propertiesFound: number;
  newProperties: number;
  updatedProperties: number;
  errors: string[];
  duration: number;
}

/**
 * Uloží nehnuteľnosti do databázy a detekuje hot deals
 */
async function saveProperties(properties: ScrapedProperty[]): Promise<{ 
  new: number; 
  updated: number;
  hotDeals: string[]; // property IDs to notify
}> {
  let newCount = 0;
  let updatedCount = 0;
  const hotDeals: string[] = [];

  for (const prop of properties) {
    try {
      const existing = await prisma.property.findFirst({
        where: { 
          source: prop.source, 
          external_id: prop.externalId 
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
              price_per_m2: prop.pricePerM2 
            },
          });
          
          updatedCount++;
        }
      } else {
        // Vytvor novú nehnuteľnosť
        const slug = prop.title
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]+/g, "-")
          .substring(0, 100) + "-" + prop.externalId.slice(-8);

        // Skontroluj či je to potenciálny hot deal
        // Porovnaj s priemernou cenou v meste
        const avgInCity = await prisma.property.aggregate({
          where: { city: prop.city, area_m2: { gte: prop.areaM2 - 20, lte: prop.areaM2 + 20 } },
          _avg: { price_per_m2: true },
        });
        
        const isHotDeal = avgInCity._avg.price_per_m2 
          ? prop.pricePerM2 < avgInCity._avg.price_per_m2 * 0.85 // 15% pod priemerom
          : false;

        const newProperty = await prisma.property.create({
          data: {
            external_id: prop.externalId,
            source: prop.source,
            title: prop.title,
            slug,
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
            is_distressed: isHotDeal,
          },
        });
        
        if (isHotDeal) {
          hotDeals.push(newProperty.id);
        }
        
        newCount++;
      }
    } catch (error) {
      console.warn(`Failed to save property ${prop.externalId}:`, error);
    }
  }

  return { new: newCount, updated: updatedCount, hotDeals };
}

/**
 * GET - Spustí kompletný scraping všetkých portálov
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  // Verifikácia cron secret (voliteľné)
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    // Ak nie je cron secret, skontroluj či je to admin
    // Pre jednoduchosť povolíme bez autentifikácie pre cron
    console.log("⚠️ Running without CRON_SECRET verification");
  }

  console.log("\n" + "=".repeat(60));
  console.log("🚀 STARTING FULL SCRAPE - All Portals, All Cities");
  console.log("=".repeat(60) + "\n");

  const allStats: ScrapeStats[] = [];
  let totalNew = 0;
  let totalUpdated = 0;
  let totalFound = 0;
  const allHotDeals: string[] = []; // Zbieraj hot deals pre notifikácie

  // Pre každý portál
  for (const portal of SCRAPE_CONFIG.portals) {
    console.log(`\n📦 Portal: ${portal}`);
    console.log("-".repeat(40));

    try {
      const portalStart = Date.now();
      
      // Scrapuj všetky kategórie naraz (scrapePortal to robí automaticky)
      const result = await scrapePortal(portal, {
        maxPages: SCRAPE_CONFIG.maxPagesPerCategory,
      });

      console.log(`  ✅ Found ${result.properties.length} properties`);
      
      // Ulož do databázy
      const saveResult = await saveProperties(result.properties);
      
      const stats: ScrapeStats = {
        portal,
        city: "ALL",
        propertiesFound: result.properties.length,
        newProperties: saveResult.new,
        updatedProperties: saveResult.updated,
        errors: result.errors,
        duration: Date.now() - portalStart,
      };

      allStats.push(stats);
      totalNew += saveResult.new;
      totalUpdated += saveResult.updated;
      totalFound += result.properties.length;
      
      // Zbieraj hot deals
      allHotDeals.push(...saveResult.hotDeals);

      console.log(`  💾 Saved: ${saveResult.new} new, ${saveResult.updated} updated`);
      console.log(`  ⏱️ Duration: ${Math.round(stats.duration / 1000)}s`);

      // Log do databázy
      await prisma.dataFetchLog.create({
        data: {
          source: `CRON_${portal}`,
          status: result.errors.length === 0 ? "success" : "partial",
          recordsCount: result.properties.length,
          duration_ms: stats.duration,
          error: result.errors.length > 0 ? JSON.stringify(result.errors.slice(0, 5)) : null,
        },
      });

      // Delay pred ďalším portálom
      await new Promise(r => setTimeout(r, SCRAPE_CONFIG.delayBetweenRequests));

    } catch (error) {
      console.error(`  ❌ Error scraping ${portal}:`, error);
      
      allStats.push({
        portal,
        city: "ALL",
        propertiesFound: 0,
        newProperties: 0,
        updatedProperties: 0,
        errors: [error instanceof Error ? error.message : "Unknown error"],
        duration: 0,
      });

      await prisma.dataFetchLog.create({
        data: {
          source: `CRON_${portal}`,
          status: "error",
          recordsCount: 0,
          error: error instanceof Error ? error.message : "Unknown error",
        },
      });
    }
  }

  const totalDuration = Date.now() - startTime;

  console.log("\n" + "=".repeat(60));
  console.log("📊 SCRAPING COMPLETE");
  console.log("=".repeat(60));
  console.log(`  Total found: ${totalFound}`);
  console.log(`  New properties: ${totalNew}`);
  console.log(`  Updated: ${totalUpdated}`);
  console.log(`  Hot deals found: ${allHotDeals.length}`);
  console.log(`  Duration: ${Math.round(totalDuration / 1000)}s`);
  console.log("=".repeat(60) + "\n");

  // === TELEGRAM NOTIFIKÁCIE ===
  let notificationsSent = 0;
  
  // Pošli notifikácie pre hot deals (max 10)
  console.log("📱 Sending Telegram notifications...");
  for (const propertyId of allHotDeals.slice(0, 10)) {
    try {
      const count = await notifyHotDeal(propertyId);
      notificationsSent += count;
    } catch (error) {
      console.warn(`Failed to send notification for ${propertyId}:`, error);
    }
  }
  
  // Notifikuj aj o neoznámených market gaps
  try {
    const gapResult = await notifyUnnotifiedMarketGaps();
    notificationsSent += gapResult.notified;
    console.log(`  📢 Notified ${gapResult.notified} market gaps`);
  } catch (error) {
    console.warn("Failed to notify market gaps:", error);
  }
  
  console.log(`  ✅ Sent ${notificationsSent} Telegram notifications\n`);

  // Spočítaj celkový počet nehnuteľností v databáze
  const totalInDb = await prisma.property.count();

  return NextResponse.json({
    success: true,
    summary: {
      totalFound,
      totalNew,
      totalUpdated,
      hotDealsFound: allHotDeals.length,
      totalInDatabase: totalInDb,
      notificationsSent,
      duration: `${Math.round(totalDuration / 1000)}s`,
    },
    details: allStats.map(s => ({
      ...s,
      duration: `${Math.round(s.duration / 1000)}s`,
    })),
  });
}

// Pre Vercel - dlhší timeout
export const runtime = "nodejs";
export const maxDuration = 300; // 5 minút
