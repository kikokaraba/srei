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
 * 
 * VYLEPŠENIA v2:
 * - Používa ingestion-pipeline pre robustné ukladanie
 * - Detailné logovanie prečo sa neuložilo
 * - Validácia dát pred uložením
 * - ScraperRun tabuľka pre sledovanie behov
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { scrapeAll } from "@/lib/scraper/simple-scraper";
import { ingestProperties, validateHtml } from "@/lib/scraper/ingestion-pipeline";
import { notifyUnnotifiedMarketGaps } from "@/lib/telegram/notifications";

// Konfigurácia scrapingu - Vercel má limit 300s
const SCRAPE_CONFIG = {
  // 3 stránky per kategória - Bazoš má 3 kategórie, Nehnutelnosti 2
  // = max 5 * 3 + 3 * 2 = 21 stránok celkovo
  maxPagesPerCategory: 3,
  
  // Portály - Bazoš + Nehnutelnosti.sk
  portals: ["BAZOS", "NEHNUTELNOSTI"] as const,
  
  // Ingestion pipeline settings
  batchSize: 50,
  delayBetweenBatches: 100,
};

/**
 * GET - Spustí kompletný scraping všetkých portálov
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  // Verifikácia cron secret (voliteľné)
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    console.log("⚠️ Running without CRON_SECRET verification");
  }

  console.log("\n" + "=".repeat(60));
  console.log("🚀 STARTING FULL SCRAPE - All Portals, All Cities");
  console.log("   Using Ingestion Pipeline v2 with validation & logging");
  console.log("=".repeat(60) + "\n");

  let runId: string | null = null;
  let ingestionStats: {
    found: number;
    savedNew: number;
    savedUpdated: number;
    skippedDuplicate: number;
    skippedInvalidPrice: number;
    skippedInvalidArea: number;
    skippedMissingCity: number;
    skippedBlocked: number;
    skippedValidation: number;
    skippedDbError: number;
    errors: Array<{ externalId: string; sourceUrl: string; reason: string; message: string }>;
  } | null = null;
  let scrapeErrors: string[] = [];

  // Scrape ALL portals using simple scraper
  console.log(`\n📦 Phase 1: Scraping ALL portals (Bazos + Nehnutelnosti.sk)`);
  console.log("-".repeat(40));

  try {
    // Použij scrapeAll - scrapuje Bazos aj Nehnutelnosti.sk
    const result = await scrapeAll({
      maxPages: SCRAPE_CONFIG.maxPagesPerCategory,
    });

    console.log(`  ✅ Scraping complete: ${result.properties.length} properties found`);
    console.log(`  📄 Pages scraped: ${result.pagesScraped}`);
    
    if (result.errors.length > 0) {
      console.log(`  ⚠️ Scrape errors: ${result.errors.length}`);
      scrapeErrors = result.errors;
    }
    
    // === INGESTION PIPELINE ===
    console.log(`\n📥 Phase 2: Ingestion Pipeline`);
    console.log("-".repeat(40));
    
    const ingestionResult = await ingestProperties(
      result.properties,
      "CRON_ALL_PORTALS",
      {
        batchSize: SCRAPE_CONFIG.batchSize,
        delayBetweenBatches: SCRAPE_CONFIG.delayBetweenBatches,
        pagesScraped: result.pagesScraped,
      }
    );
    
    runId = ingestionResult.runId;
    ingestionStats = ingestionResult.stats;

  } catch (error) {
    console.error(`  ❌ Error:`, error);
    scrapeErrors.push(error instanceof Error ? error.message : "Unknown error");

    await prisma.dataFetchLog.create({
      data: {
        source: "CRON_ALL_PORTALS",
        status: "error",
        recordsCount: 0,
        error: error instanceof Error ? error.message : "Unknown error",
      },
    });
  }

  const totalDuration = Date.now() - startTime;

  // === TELEGRAM NOTIFIKÁCIE ===
  let notificationsSent = 0;
  
  console.log("\n📱 Phase 3: Telegram Notifications");
  console.log("-".repeat(40));
  
  try {
    const gapResult = await notifyUnnotifiedMarketGaps();
    notificationsSent += gapResult.notified;
    console.log(`  📢 Notified ${gapResult.notified} market gaps`);
  } catch (error) {
    console.warn("  ⚠️ Failed to notify market gaps:", error);
  }

  // Spočítaj celkový počet nehnuteľností v databáze
  const totalInDb = await prisma.property.count();

  // === SUMMARY ===
  console.log("\n" + "=".repeat(60));
  console.log("📊 SCRAPING COMPLETE - SUMMARY");
  console.log("=".repeat(60));
  console.log(`  Run ID: ${runId || "N/A"}`);
  console.log(`  Duration: ${Math.round(totalDuration / 1000)}s`);
  console.log(`  Total in Database: ${totalInDb}`);
  
  if (ingestionStats) {
    console.log(`  ────────────────────────────`);
    console.log(`  📥 Found:           ${ingestionStats.found}`);
    console.log(`  ✨ Saved New:       ${ingestionStats.savedNew}`);
    console.log(`  🔄 Saved Updated:   ${ingestionStats.savedUpdated}`);
    console.log(`  ⏭️  Duplicates:      ${ingestionStats.skippedDuplicate}`);
    console.log(`  ❌ Validation:      ${ingestionStats.skippedInvalidPrice + ingestionStats.skippedInvalidArea + ingestionStats.skippedMissingCity + ingestionStats.skippedValidation}`);
    console.log(`  🛑 DB Errors:       ${ingestionStats.skippedDbError}`);
    
    // Výpočet úspešnosti
    const successRate = ingestionStats.found > 0 
      ? Math.round((ingestionStats.savedNew + ingestionStats.savedUpdated + ingestionStats.skippedDuplicate) / ingestionStats.found * 100)
      : 0;
    console.log(`  📈 Success Rate:    ${successRate}%`);
  }
  
  console.log("=".repeat(60) + "\n");

  return NextResponse.json({
    success: true,
    runId,
    summary: {
      totalFound: ingestionStats?.found || 0,
      totalNew: ingestionStats?.savedNew || 0,
      totalUpdated: ingestionStats?.savedUpdated || 0,
      totalDuplicate: ingestionStats?.skippedDuplicate || 0,
      totalInDatabase: totalInDb,
      notificationsSent,
      duration: `${Math.round(totalDuration / 1000)}s`,
    },
    breakdown: ingestionStats ? {
      found: ingestionStats.found,
      savedNew: ingestionStats.savedNew,
      savedUpdated: ingestionStats.savedUpdated,
      skipped: {
        duplicate: ingestionStats.skippedDuplicate,
        invalidPrice: ingestionStats.skippedInvalidPrice,
        invalidArea: ingestionStats.skippedInvalidArea,
        missingCity: ingestionStats.skippedMissingCity,
        validation: ingestionStats.skippedValidation,
        dbError: ingestionStats.skippedDbError,
      },
      sampleErrors: ingestionStats.errors.slice(0, 10).map(e => ({
        id: e.externalId,
        reason: e.reason,
        message: e.message.substring(0, 100),
      })),
    } : null,
    scrapeErrors: scrapeErrors.slice(0, 5),
  });
}

// Pre Vercel - dlhší timeout
export const runtime = "nodejs";
export const maxDuration = 300; // 5 minút
