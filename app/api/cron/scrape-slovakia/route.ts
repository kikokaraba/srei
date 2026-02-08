/**
 * Slovakia-Wide Scraping Endpoint
 *
 * Spúšťa scraping cez Apify s rezidenčnými SK proxy.
 * Pri portal=all spúšťa naraz Bazos + Top Reality. Výsledky sa spracujú cez webhook.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getTargetsByPortal,
  getScrapingStats,
  type ScrapingTarget,
} from "@/lib/scraper/slovakia-scraper";
import { triggerSlovakiaScraping, runTopRealityScraper } from "@/lib/scraper/apify-service";
import { prisma } from "@/lib/prisma";
import { SLOVAK_CITIES } from "@/lib/constants/cities";

/** Mestá pre Top Reality (celé Slovensko) */
const VILLAGES_WHOLE_SLOVAKIA = SLOVAK_CITIES.map((c) => c.name);

// ============================================================================
// API HANDLERS
// ============================================================================

/**
 * POST - Spustí Apify scraping
 * Query params:
 * - portal: "bazos" | "topreality" | "all" (default: all = Bazos + Top Reality naraz)
 * - limit: max počet URL pre Bazos (default: 10)
 */
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const portal = searchParams.get("portal") || "all";
    const limit = parseInt(searchParams.get("limit") || "10");

    if (!process.env.APIFY_API_KEY) {
      return NextResponse.json(
        { success: false, error: "APIFY_API_KEY is not set" },
        { status: 503 }
      );
    }

    const runs: Array<{ portal: string; runId: string; urlCount?: number }> = [];
    const errors: string[] = [];

    if (portal === "all") {
      // Paralelne spusti Bazos + Top Reality
      const bazosTargets = getTargetsByPortal("bazos")
        .filter((t) => t.propertyType === "byty")
        .slice(0, limit);

      if (bazosTargets.length === 0) {
        return NextResponse.json({
          success: false,
          error: "No Bazos targets (byty) found",
        }, { status: 400 });
      }

      console.log(`🚀 Starting dual scrape: Bazos (${bazosTargets.length} URLs) + Top Reality`);
      const [bazosResult, topRealityResult] = await Promise.all([
        triggerSlovakiaScraping(bazosTargets, {
          useWebhook: true,
          portals: ["bazos"],
        }),
        runTopRealityScraper(
          {
            maxRequestsPerCrawl: 500,
            language: "sk",
            type: "sell",
            kind: {
              flats: ["2 room flat", "3 room flat", "4 room flat"],
              houses: [],
              premises: [],
              objects: [],
              plots: [],
            },
            village: VILLAGES_WHOLE_SLOVAKIA,
            sort: "date_desc",
          },
          { useWebhook: true }
        ).then((r) => ({ runId: r.data.id, datasetId: (r.data as { defaultDatasetId?: string }).defaultDatasetId })).catch((err) => {
          const msg = err instanceof Error ? err.message : "Unknown error";
          errors.push(`topreality: ${msg}`);
          return null;
        }),
      ]);

      runs.push(...bazosResult.runs);
      if (bazosResult.errors.length) errors.push(...bazosResult.errors);
      if (topRealityResult) {
        runs.push({ portal: "topreality", runId: topRealityResult.runId });
      }
    } else if (portal === "topreality") {
      const result = await runTopRealityScraper(
        {
          maxRequestsPerCrawl: 500,
          language: "sk",
          type: "sell",
          kind: {
            flats: ["2 room flat", "3 room flat", "4 room flat"],
            houses: [],
            premises: [],
            objects: [],
            plots: [],
          },
          village: VILLAGES_WHOLE_SLOVAKIA,
          sort: "date_desc",
        },
        { useWebhook: true }
      );
      runs.push({
        portal: "topreality",
        runId: result.data.id,
      });
    } else {
      // portal === "bazos"
      let targets: ScrapingTarget[] = getTargetsByPortal("bazos");
      targets = targets.filter((t) => t.propertyType === "byty").slice(0, limit);
      if (targets.length === 0) {
        return NextResponse.json({
          success: false,
          error: `No targets found for portal: ${portal}`,
        }, { status: 400 });
      }
      const result = await triggerSlovakiaScraping(targets, {
        useWebhook: true,
        portals: ["bazos"],
      });
      runs.push(...result.runs);
      if (result.errors.length) errors.push(...result.errors);
    }

    return NextResponse.json({
      success: true,
      message: portal === "all" ? "Bazos + Top Reality scraping spustené" : `Apify scraping spustený (${portal})`,
      portal,
      runs,
      errors,
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
        all: "POST /api/cron/scrape-slovakia (default: Bazos + Top Reality naraz)",
        bazos: "POST /api/cron/scrape-slovakia?portal=bazos&limit=20",
        topreality: "POST /api/cron/scrape-slovakia?portal=topreality",
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
