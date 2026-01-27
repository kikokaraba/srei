/**
 * Slovakia-Wide Scraping Endpoint
 * 
 * Scrapuje celé Slovensko zo všetkých portálov
 * Spúšťa sa cez cron alebo manuálne
 */

import { NextRequest, NextResponse } from "next/server";
import { 
  getAllScrapingTargets, 
  getTargetsByPortal,
  batchTargets,
  slovakiaScraper,
  type ScrapingTarget,
  getScrapingStats
} from "@/lib/scraper/slovakia-scraper";
import { 
  scrapeBazosCategory,
} from "@/lib/scraper/stealth-engine";
import { prisma } from "@/lib/prisma";

// ============================================================================
// SCRAPER FUNCTIONS PER PORTAL
// ============================================================================

async function scrapeNehnutelnosti(target: ScrapingTarget) {
  // Nehnutelnosti.sk zatiaľ nie je implementovaný
  // Vracia placeholder kým nebude hotový Apify aktor
  return {
    listingsFound: 0,
    newListings: 0,
    updatedListings: 0,
    errors: ["Nehnutelnosti.sk: Čakáme na Apify aktor - použite Bazoš"],
  };
}

async function scrapeBazos(target: ScrapingTarget) {
  let listingsFound = 0;
  let newListings = 0;
  let updatedListings = 0;
  const errors: string[] = [];
  
  try {
    // Použij existujúci stealth scraper ktorý už funguje
    const result = await scrapeBazosCategory(target.url, undefined, {}, { maxPages: 3 });
    
    listingsFound = result.total;
    newListings = result.new;
    updatedListings = result.updated;
    
    if (result.errors > 0) {
      errors.push(`${result.errors} listings failed to process`);
    }
    
  } catch (err) {
    errors.push(`Bazoš scrape failed: ${err}`);
  }
  
  return { listingsFound, newListings, updatedListings, errors };
}

async function scrapeReality(target: ScrapingTarget) {
  return {
    listingsFound: 0,
    newListings: 0,
    updatedListings: 0,
    errors: ["Reality.sk scraper not yet implemented"],
  };
}

async function scrapeTopReality(target: ScrapingTarget) {
  return {
    listingsFound: 0,
    newListings: 0,
    updatedListings: 0,
    errors: ["TopReality.sk scraper not yet implemented"],
  };
}

// ============================================================================
// MAIN SCRAPER DISPATCHER
// ============================================================================

async function scrapeTarget(target: ScrapingTarget) {
  switch (target.portal) {
    case "nehnutelnosti":
      return scrapeNehnutelnosti(target);
    case "bazos":
      return scrapeBazos(target);
    case "reality":
      return scrapeReality(target);
    case "topreality":
      return scrapeTopReality(target);
    default:
      return {
        listingsFound: 0,
        newListings: 0,
        updatedListings: 0,
        errors: [`Unknown portal: ${target.portal}`],
      };
  }
}

// ============================================================================
// API HANDLERS
// ============================================================================

/**
 * POST - Spustí scraping
 * Query params:
 * - portal: "nehnutelnosti" | "bazos" | "reality" | "topreality" | "all"
 * - region: region ID (optional)
 * - batch: batch number to process (optional)
 * - batchSize: size of each batch (default 10)
 */
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const portal = searchParams.get("portal") || "bazos"; // Default na bazos
    const region = searchParams.get("region");
    const batchNum = searchParams.get("batch");
    const batchSize = parseInt(searchParams.get("batchSize") || "5");
    
    // Získaj targets
    let targets = portal === "all" 
      ? getAllScrapingTargets() 
      : getTargetsByPortal(portal as any);
    
    // Filter by region
    if (region) {
      targets = targets.filter(t => t.region === region || !t.region);
    }
    
    // Ak je batch, spracuj len daný batch
    if (batchNum !== null) {
      const batches = batchTargets(targets, batchSize);
      const batchIndex = parseInt(batchNum);
      
      if (batchIndex >= 0 && batchIndex < batches.length) {
        targets = batches[batchIndex];
      } else {
        return NextResponse.json({
          success: false,
          error: `Invalid batch number. Available: 0-${batches.length - 1}`,
        }, { status: 400 });
      }
    }
    
    // Limit na max 5 targets per request (Vercel timeout je 10s na free tier)
    targets = targets.slice(0, 5);
    
    console.log(`🇸🇰 Starting Slovakia scrape: ${targets.length} targets`);
    
    // Spusti scraping
    const results = await slovakiaScraper.run(targets, scrapeTarget, {
      delayBetweenRequests: 2000, // 2s medzi requestmi
    });
    
    // Sumarizuj výsledky
    const summary = {
      totalTargets: targets.length,
      completed: results.length,
      totalListings: results.reduce((sum, r) => sum + r.listingsFound, 0),
      newListings: results.reduce((sum, r) => sum + r.newListings, 0),
      updatedListings: results.reduce((sum, r) => sum + r.updatedListings, 0),
      failed: results.filter(r => r.errors.length > 0).length,
      duration: results.reduce((sum, r) => sum + r.duration, 0),
    };
    
    return NextResponse.json({
      success: true,
      ...summary,
      results: results.map(r => ({
        portal: r.target.portal,
        region: r.target.region || "all",
        propertyType: r.target.propertyType,
        url: r.target.url,
        listingsFound: r.listingsFound,
        new: r.newListings,
        updated: r.updatedListings,
        errors: r.errors,
      })),
    });
    
  } catch (error) {
    console.error("Slovakia scrape error:", error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}

/**
 * GET - Získa štatistiky a stav scrapingu
 */
export async function GET() {
  try {
    const stats = getScrapingStats();
    const progress = slovakiaScraper.getProgress();
    const isActive = slovakiaScraper.isActive();
    
    // Získaj počet nehnuteľností v DB
    const dbStats = await prisma.property.groupBy({
      by: ["source"],
      _count: true,
    });
    
    const lastScrape = await prisma.property.findFirst({
      orderBy: { updatedAt: "desc" },
      select: { updatedAt: true },
    });
    
    return NextResponse.json({
      success: true,
      scraping: {
        isActive,
        progress: isActive ? progress : null,
      },
      targets: stats,
      database: {
        bySource: dbStats.reduce((acc, s) => ({ ...acc, [s.source]: s._count }), {}),
        lastUpdate: lastScrape?.updatedAt,
      },
    });
  } catch (error) {
    return NextResponse.json({
      success: true,
      scraping: { isActive: false },
      targets: getScrapingStats(),
      database: { bySource: {}, lastUpdate: null },
      note: "Database not connected - stats unavailable",
    });
  }
}
