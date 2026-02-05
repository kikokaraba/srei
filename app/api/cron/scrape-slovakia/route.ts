/**
 * Slovakia-Wide Scraping Endpoint
 * 
 * Spúšťa scraping cez Apify s rezidenčnými SK proxy
 * Výsledky sa spracujú cez webhook
 */

import { NextRequest, NextResponse } from "next/server";
import { 
  getAllScrapingTargets, 
  getTargetsByPortal,
  getScrapingStats,
  type ScrapingTarget,
} from "@/lib/scraper/slovakia-scraper";
import { triggerSlovakiaScraping } from "@/lib/scraper/apify-service";
import { prisma } from "@/lib/prisma";

// ============================================================================
// API HANDLERS
// ============================================================================

/**
 * POST - Spustí Apify scraping
 * Query params:
 * - portal: "nehnutelnosti" | "bazos" | "all" (default: nehnutelnosti)
 * - limit: max počet URL (default: 10)
 */
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const portal = searchParams.get("portal") || "nehnutelnosti";
    const limit = parseInt(searchParams.get("limit") || "10");
    
    // Získaj targets
    let targets: ScrapingTarget[];
    
    if (portal === "all") {
      targets = getAllScrapingTargets();
    } else {
      targets = getTargetsByPortal(portal as any);
    }

    // Aplikácia scrapuje len byty (ostatné typy prídeme neskôr)
    targets = targets.filter((t) => t.propertyType === "byty");

    // Limit počet URL
    targets = targets.slice(0, limit);
    
    if (targets.length === 0) {
      return NextResponse.json({
        success: false,
        error: `No targets found for portal: ${portal}`,
      }, { status: 400 });
    }
    
    console.log(`🚀 Starting Apify scrape: ${targets.length} targets for ${portal}`);
    
    // Spusti Apify scraping
    const result = await triggerSlovakiaScraping(targets, {
      useWebhook: true,
      portals: portal === "all" ? ["nehnutelnosti", "bazos"] : [portal],
    });
    
    return NextResponse.json({
      success: true,
      message: "Apify scraping spustený",
      portal,
      targetsCount: targets.length,
      runs: result.runs,
      errors: result.errors,
      note: "Výsledky prídu cez webhook do /api/webhooks/apify",
    });
    
  } catch (error) {
    console.error("Apify scrape error:", error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}

/**
 * GET - Získa štatistiky
 */
export async function GET() {
  try {
    const stats = getScrapingStats();
    
    // Získaj počet nehnuteľností v DB
    const dbStats = await prisma.property.groupBy({
      by: ["source"],
      _count: true,
    });
    
    const totalProperties = await prisma.property.count();
    
    const lastScrape = await prisma.property.findFirst({
      orderBy: { updatedAt: "desc" },
      select: { updatedAt: true },
    });
    
    return NextResponse.json({
      success: true,
      apifyConfigured: !!process.env.APIFY_API_KEY,
      webhookUrl: `${process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL}/api/webhooks/apify`,
      targets: stats,
      database: {
        totalProperties,
        bySource: dbStats.reduce((acc: Record<string, number>, s) => ({ ...acc, [s.source ?? "unknown"]: s._count }), {}),
        lastUpdate: lastScrape?.updatedAt,
      },
      usage: {
        nehnutelnosti: "POST /api/cron/scrape-slovakia?portal=nehnutelnosti",
        bazos: "POST /api/cron/scrape-slovakia?portal=bazos",
        all: "POST /api/cron/scrape-slovakia?portal=all&limit=20",
      },
    });
  } catch (error) {
    return NextResponse.json({
      success: true,
      apifyConfigured: !!process.env.APIFY_API_KEY,
      targets: getScrapingStats(),
      database: { totalProperties: 0, bySource: {}, lastUpdate: null },
      note: "Database not connected",
    });
  }
}
