/**
 * Cron: Top Reality Scraper (Apify Actor appealing_jingle/top-reality-scraper)
 *
 * POST – spustí Top Reality scraping. Výsledky prídu cez webhook s portal: "topreality".
 * Query / body: village, type (sell/rent), maxRequestsPerCrawl, ...
 */

import { NextRequest, NextResponse } from "next/server";
import { runTopRealityScraper } from "@/lib/scraper/apify-service";
import { prisma } from "@/lib/prisma";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    if (!process.env.APIFY_API_KEY) {
      return NextResponse.json(
        { success: false, error: "APIFY_API_KEY is not set" },
        { status: 503 }
      );
    }

    let body: Record<string, unknown> = {};
    try {
      body = await request.json();
    } catch {
      /* empty body ok */
    }

    const village = (body.village as string[] | undefined) ?? ["Bratislava", "Košice"];
    const type = (body.type as string) === "rent" ? "rent" : "sell";
    const maxRequestsPerCrawl = Math.min(
      Math.max(Number(body.maxRequestsPerCrawl) || 100, 10),
      1000
    );

    const result = await runTopRealityScraper(
      {
        maxRequestsPerCrawl,
        language: "sk",
        type,
        kind: {
          flats: ["2 room flat", "3 room flat", "4 room flat"],
          houses: [],
          premises: [],
          objects: [],
          plots: [],
        },
        village,
        sort: "date_desc",
      },
      { useWebhook: true }
    );

    await prisma.dataFetchLog.create({
      data: {
        source: "scrape-topreality",
        status: "success",
        recordsCount: 0,
        error: null,
      },
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      message: "Top Reality scraping spustený. Výsledky prídu cez webhook.",
      runId: result.data.id,
      datasetId: (result.data as { defaultDatasetId?: string }).defaultDatasetId ?? null,
      village,
      type,
      maxRequestsPerCrawl,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Scrape Top Reality error:", message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

/**
 * GET – info o Top Reality scrapingu
 */
export async function GET() {
  const lastLog = await prisma.dataFetchLog.findFirst({
    where: { source: "scrape-topreality" },
    orderBy: { fetchedAt: "desc" },
  });
  const count = await prisma.property.count({ where: { source: "TOPREALITY" } });
  return NextResponse.json({
    success: true,
    apifyConfigured: !!process.env.APIFY_API_KEY,
    webhookUrl: `${process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL}/api/webhooks/apify`,
    usage: "POST /api/cron/scrape-topreality with optional body: { village: string[], type: 'sell'|'rent', maxRequestsPerCrawl: number }",
    database: { topRealityCount: count, lastRun: lastLog?.fetchedAt },
  });
}
