/**
 * Admin Scraper API – výhradne Apify
 * GET: konfigurácia a posledné behy
 * POST: spustí Apify scraping (scrape-slovakia)
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAllScrapingTargets, getTargetsByPortal, triggerSlovakiaScraping } from "@/lib/scraper";

const SCRAPER_SOURCES = {
  BAZOS: {
    name: "Bazoš.sk",
    url: "https://reality.bazos.sk",
    enabled: true,
    description: "Inzertný portál – byty predaj a prenájom (Apify)",
  },
} as const;

/**
 * GET – konfigurácia a stav (DataFetchLog: apify-webhook, scrape-slovakia)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (user?.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Admin access required" }, { status: 403 });
    }

    const lastScrapes = await prisma.dataFetchLog.findMany({
      where: {
        source: { in: ["apify-webhook", "scrape-slovakia", "process-apify"] },
      },
      orderBy: { fetchedAt: "desc" },
      take: 30,
    });

    const lastBySource: Record<string, (typeof lastScrapes)[0] | null> = {};
    for (const key of Object.keys(SCRAPER_SOURCES)) {
      lastBySource[key] =
        lastScrapes.find(
          (l) =>
            l.source === "apify-webhook" ||
            l.source === "scrape-slovakia" ||
            l.source === "process-apify"
        ) ?? null;
    }

    const propertyCounts = await prisma.property.groupBy({
      by: ["source"],
      _count: { id: true },
    });
    const propertyCountBySource: Record<string, number> = {};
    for (const item of propertyCounts) {
      propertyCountBySource[item.source] = item._count.id;
    }

    const targets = getAllScrapingTargets();
    const byPortal = { bazos: getTargetsByPortal("bazos").length };

    return NextResponse.json({
      success: true,
      data: {
        sources: Object.entries(SCRAPER_SOURCES).map(([key, config]) => ({
          id: key,
          ...config,
          propertyCount: propertyCountBySource[key] ?? 0,
          lastScrape: lastBySource[key]
            ? {
                timestamp: lastBySource[key]!.fetchedAt,
                status: lastBySource[key]!.status,
                recordsCount: lastBySource[key]!.recordsCount,
                duration: lastBySource[key]!.duration_ms,
                error: lastBySource[key]!.error,
              }
            : null,
        })),
        apify: {
          configured: !!process.env.APIFY_API_KEY,
          totalTargets: targets.length,
          targetsByPortal: byPortal,
        },
        recentLogs: lastScrapes.slice(0, 10).map((l) => ({
          source: l.source,
          status: l.status,
          recordsCount: l.recordsCount,
          fetchedAt: l.fetchedAt,
          error: l.error,
        })),
      },
    });
  } catch (error) {
    console.error("Scraper config error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal error",
      },
      { status: 500 }
    );
  }
}

/**
 * POST – spustí Apify scraping (triggerSlovakiaScraping)
 * Body: { portals?: ["bazos"], useWebhook?: boolean }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (user?.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Admin access required" }, { status: 403 });
    }

    if (!process.env.APIFY_API_KEY) {
      return NextResponse.json(
        { success: false, error: "APIFY_API_KEY nie je nastavený" },
        { status: 503 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const portals: Array<"bazos"> =
      Array.isArray(body.portals) && body.portals.length > 0
        ? (body.portals as Array<"bazos">)
        : ["bazos"];
    const useWebhook = body.useWebhook !== false;

    const targets = getAllScrapingTargets();
    const filtered = targets.filter((t) => portals.includes(t.portal));

    const { runs, errors } = await triggerSlovakiaScraping(filtered, {
      useWebhook,
      portals,
    });

    if (errors.length > 0 && runs.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: errors.join("; "),
        },
        { status: 502 }
      );
    }

    await prisma.dataFetchLog.create({
      data: {
        source: "scrape-slovakia",
        status: errors.length > 0 ? "partial" : "success",
        recordsCount: runs.reduce((s, r) => s + r.urlCount, 0),
        error: errors.length > 0 ? errors.join("; ") : null,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Apify scraping spustený. Výsledky prídu cez webhook.",
      runs: runs.map((r) => ({ portal: r.portal, runId: r.runId, urlCount: r.urlCount })),
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Scraper POST error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal error",
      },
      { status: 500 }
    );
  }
}

export const runtime = "nodejs";
export const maxDuration = 60;
