/**
 * Real-time Market Statistics API
 * 
 * Poskytuje aktuálne trhové štatistiky vypočítané zo scrapovaných dát
 * Nahradzuje zastaralé NBS/ŠÚ dáta
 */

import { NextRequest, NextResponse } from "next/server";

const NO_STORE = { "Cache-Control": "private, no-store, max-age=0, must-revalidate" };
import { auth } from "@/lib/auth";
import { 
  getRealtimeMarketStats, 
  getRealtimeCityStats,
  getDataComparison,
} from "@/lib/data-sources/realtime-stats";

/**
 * GET /api/v1/market/realtime
 * 
 * Query params:
 * - city: string (pre konkrétne mesto)
 * - compare: boolean (porovnanie s NBS)
 */
export async function GET(request: NextRequest) {
  try {
    // Auth check removed - public endpoint for dashboard widgets
    // const session = await auth();
    // if (!session?.user?.id) {
    //   return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    // }

    const { searchParams } = new URL(request.url);
    const city = searchParams.get("city") as string | null;
    const compare = searchParams.get("compare") === "true";

    // Porovnanie s NBS
    if (compare) {
      const comparison = await getDataComparison();
      return NextResponse.json(
        {
          success: true,
          data: comparison,
          note: "Naše real-time dáta vs. oficiálne NBS štatistiky (Q3 2025)",
        },
        { headers: NO_STORE }
      );
    }

    // Konkrétne mesto
    if (city) {
      const cityStats = await getRealtimeCityStats(city);
      
      if (!cityStats) {
      return NextResponse.json(
        { success: false, error: "City not found" },
        { status: 404, headers: NO_STORE }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: cityStats,
        dataSource: "SRIA Real-time (scraped)",
        freshness: "live",
      },
      { headers: NO_STORE }
    );
  }

    // Celkový prehľad
    const stats = await getRealtimeMarketStats();

    return NextResponse.json(
      {
        success: true,
        data: {
          overview: {
            nationalAvg: stats.nationalAvg,
            nationalMedian: stats.nationalMedian,
            totalProperties: stats.totalProperties,
            newLast24h: stats.newLast24h,
            newLast7d: stats.newLast7d,
            priceChangeLast30d: stats.priceChangeLast30d,
          },
          regions: stats.regions.map(r => ({
            region: r.region,
            city: r.city,
            avgPricePerM2: r.avgPricePerM2,
            propertyCount: r.propertyCount,
            changeVsLastMonth: r.changeVsLastMonth,
            changeVsLastWeek: r.changeVsLastWeek,
          })),
          generatedAt: stats.generatedAt,
          dataSource: stats.dataSource,
        },
        note: "Real-time dáta vypočítané z aktuálnych inzerátov. Aktualizované každú hodinu.",
      },
      { headers: NO_STORE }
    );
  } catch (error) {
    console.error("Realtime market stats error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal error",
      },
      { status: 500, headers: NO_STORE }
    );
  }
}
