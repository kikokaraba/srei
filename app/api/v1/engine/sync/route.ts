// API Endpoint: /api/v1/engine/sync
// Spúšťa Data Intelligence Engine a vracia report

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { runFullSync, scrapeBazos } from "@/lib/scraper/engine";
import { getTopMarketGaps, calculateLiquidityMetrics } from "@/lib/analysis/market-logic";
import type { SyncReport } from "@/lib/scraper/types";

// Bezpečnostný token pre cron jobs
const CRON_SECRET = process.env.CRON_SECRET;
const ENGINE_API_KEY = process.env.ENGINE_API_KEY;

/**
 * POST /api/v1/engine/sync
 * Spúšťa synchronizáciu dát
 * 
 * Query params:
 * - source: "all" | "bazos" | "nehnutelnosti" (default: "all")
 * - dryRun: "true" | "false" (default: "false")
 * 
 * Headers:
 * - Authorization: Bearer <token> (admin session alebo API key)
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Autentifikácia
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: 401 }
      );
    }
    
    // 2. Parse query params
    const searchParams = request.nextUrl.searchParams;
    const source = searchParams.get("source") || "all";
    const dryRun = searchParams.get("dryRun") === "true";
    
    console.log(`🚀 Engine sync started by ${authResult.user}`, { source, dryRun });
    
    // 3. Dry run - len vráti aktuálny stav
    if (dryRun) {
      const gaps = await getTopMarketGaps(10);
      return NextResponse.json({
        success: true,
        dryRun: true,
        currentGaps: gaps.length,
        message: "Dry run - no sync performed",
      });
    }
    
    // 4. Spusti sync
    let report: SyncReport;
    
    switch (source) {
      case "bazos":
        const bazosResult = await scrapeBazos();
        report = {
          success: bazosResult.success,
          startedAt: new Date(Date.now() - bazosResult.duration),
          completedAt: new Date(),
          duration: bazosResult.duration,
          sources: [{ source: "BAZOS", result: bazosResult }],
          marketGaps: [],
          liquidityUpdates: bazosResult.removedListings,
          errors: bazosResult.errors,
        };
        break;
        
      case "all":
      default:
        report = await runFullSync();
        break;
    }
    
    // 5. Získaj top investičné príležitosti
    const topGaps = await getTopMarketGaps(5);
    
    // 6. Priprav response
    const response = {
      success: report.success,
      report: {
        duration: `${report.duration}ms`,
        startedAt: report.startedAt.toISOString(),
        completedAt: report.completedAt.toISOString(),
        sources: report.sources.map(s => ({
          name: s.source,
          totalFound: s.result.totalFound,
          newListings: s.result.newListings,
          updatedListings: s.result.updatedListings,
          removedListings: s.result.removedListings,
          marketGapsDetected: s.result.marketGapsDetected,
          errors: s.result.errors.length,
        })),
        summary: {
          totalNew: report.sources.reduce((sum, s) => sum + s.result.newListings, 0),
          totalUpdated: report.sources.reduce((sum, s) => sum + s.result.updatedListings, 0),
          totalGaps: report.marketGaps.length,
          liquidityUpdates: report.liquidityUpdates,
          totalErrors: report.errors.length,
        },
      },
      investmentOpportunities: topGaps.map(gap => ({
        propertyId: gap.propertyId,
        gapPercentage: `${gap.gapPercentage}%`,
        potentialProfit: `€${gap.potentialProfit.toLocaleString()}`,
        confidence: gap.confidence,
        reasons: gap.reasons,
      })),
      errors: report.errors.slice(0, 10).map(e => ({
        type: e.type,
        message: e.message,
        url: e.url,
      })),
    };
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error("Engine sync error:", error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/v1/engine/sync
 * Vracia stav poslednej synchronizácie a aktuálne príležitosti
 */
export async function GET(request: NextRequest) {
  try {
    // Autentifikácia
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: 401 }
      );
    }
    
    // Získaj posledný sync log
    const { prisma } = await import("@/lib/prisma");
    
    const lastSync = await prisma.dataFetchLog.findFirst({
      where: { source: "FULL_SYNC" },
      orderBy: { fetchedAt: "desc" },
    });
    
    // Získaj aktuálne Market Gaps
    const gaps = await getTopMarketGaps(10);
    
    // Získaj Liquidity metriky pre hlavné mestá
    const liquidityMetrics = await Promise.all([
      calculateLiquidityMetrics("BRATISLAVA"),
      calculateLiquidityMetrics("KOSICE"),
      calculateLiquidityMetrics("ZILINA"),
    ]);
    
    return NextResponse.json({
      success: true,
      lastSync: lastSync ? {
        timestamp: lastSync.fetchedAt.toISOString(),
        status: lastSync.status,
        recordsCount: lastSync.recordsCount,
        duration: lastSync.duration_ms ? `${lastSync.duration_ms}ms` : null,
      } : null,
      marketGaps: {
        total: gaps.length,
        topOpportunities: gaps.slice(0, 5).map(gap => ({
          propertyId: gap.propertyId,
          gapPercentage: `${gap.gapPercentage}%`,
          potentialProfit: `€${gap.potentialProfit.toLocaleString()}`,
          confidence: gap.confidence,
        })),
      },
      liquidity: liquidityMetrics.map(m => ({
        city: m.city,
        avgDaysOnMarket: m.avgDaysOnMarket,
        activeListings: m.activeListings,
        soldLastMonth: m.soldLastMonth,
        turnoverRate: `${m.turnoverRate}%`,
      })),
    });
    
  } catch (error) {
    console.error("Engine status error:", error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}

/**
 * Autentifikácia requestu
 */
async function authenticateRequest(request: NextRequest): Promise<{
  success: boolean;
  user?: string;
  error?: string;
}> {
  const authHeader = request.headers.get("authorization");
  
  // 1. Skontroluj API key
  if (ENGINE_API_KEY && authHeader === `Bearer ${ENGINE_API_KEY}`) {
    return { success: true, user: "api-key" };
  }
  
  // 2. Skontroluj cron secret
  if (CRON_SECRET && authHeader === `Bearer ${CRON_SECRET}`) {
    return { success: true, user: "cron" };
  }
  
  // 3. Skontroluj admin session
  try {
    const session = await auth();
    if (session?.user?.role === "ADMIN") {
      return { success: true, user: session.user.email || "admin" };
    }
    if (session?.user) {
      return { success: false, error: "Insufficient permissions" };
    }
  } catch {
    // Session check failed
  }
  
  return { success: false, error: "Unauthorized" };
}

// Runtime config
export const runtime = "nodejs";
export const maxDuration = 300; // 5 minút pre full sync
