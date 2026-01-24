import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getHistoricalPrices,
  getHistoricalPricesForCity,
  getRegionStats,
  getYearlyAverages,
  compareRegions,
  HISTORICAL_DATA,
  REGION_LABELS,
  CITY_TO_REGION,
} from "@/lib/data-sources/historical-prices";

/**
 * GET /api/v1/price-history
 * 
 * Parametre:
 * - region: Kód regiónu (BRATISLAVSKY, KOSICKY, ...)
 * - city: Kód mesta (BRATISLAVA, KOSICE, ...) - mapuje sa na región
 * - type: "full" | "yearly" | "stats" | "compare"
 * - compare: Kód druhého regiónu pre porovnanie
 * - from: Rok od (default 2005)
 * - to: Rok do (default 2025)
 */
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const region = searchParams.get("region");
    const city = searchParams.get("city");
    const type = searchParams.get("type") || "full";
    const compareWith = searchParams.get("compare");
    const fromYear = parseInt(searchParams.get("from") || "2005");
    const toYear = parseInt(searchParams.get("to") || "2025");

    // Zisti región z mesta alebo priamo
    let targetRegion = region;
    if (city && !region) {
      targetRegion = CITY_TO_REGION[city];
    }

    // Ak nie je zadaný región, vráť prehľad všetkých
    if (!targetRegion) {
      const overview = Object.entries(HISTORICAL_DATA).map(([code, data]) => {
        const stats = getRegionStats(code);
        return {
          code,
          name: REGION_LABELS[code] || data.region,
          currentPrice: stats?.currentPrice || 0,
          change1Y: stats?.priceChange1Y || 0,
          change5Y: stats?.priceChange5Y || 0,
        };
      });

      return NextResponse.json({
        success: true,
        data: {
          overview,
          availableRegions: Object.keys(HISTORICAL_DATA),
          source: "NBS - Národná banka Slovenska",
          period: "2005 - 2025 (štvrťročne)",
        },
      });
    }

    // Porovnanie dvoch regiónov
    if (type === "compare" && compareWith) {
      const comparison = compareRegions(targetRegion, compareWith);
      if (!comparison) {
        return NextResponse.json(
          { success: false, error: "Invalid regions for comparison" },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        data: {
          ...comparison,
          source: "NBS - Národná banka Slovenska",
        },
      });
    }

    // Štatistiky pre región
    if (type === "stats") {
      const stats = getRegionStats(targetRegion);
      if (!stats) {
        return NextResponse.json(
          { success: false, error: "Region not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: {
          region: targetRegion,
          name: REGION_LABELS[targetRegion],
          stats,
          source: "NBS - Národná banka Slovenska",
        },
      });
    }

    // Ročné priemery
    if (type === "yearly") {
      const yearlyData = getYearlyAverages(targetRegion);
      const filteredData = yearlyData.filter(
        (d) => d.year >= fromYear && d.year <= toYear
      );

      return NextResponse.json({
        success: true,
        data: {
          region: targetRegion,
          name: REGION_LABELS[targetRegion],
          yearly: filteredData,
          source: "NBS - Národná banka Slovenska",
        },
      });
    }

    // Plné štvrťročné dáta
    const historicalData = getHistoricalPrices(targetRegion);
    if (!historicalData) {
      return NextResponse.json(
        { success: false, error: "Region not found" },
        { status: 404 }
      );
    }

    // Filtruj podľa rokov
    const filteredData = {
      ...historicalData,
      data: historicalData.data.filter(
        (d) => d.year >= fromYear && d.year <= toYear
      ),
    };

    // Pridaj štatistiky
    const stats = getRegionStats(targetRegion);

    return NextResponse.json({
      success: true,
      data: {
        ...filteredData,
        name: REGION_LABELS[targetRegion],
        stats,
        source: "NBS - Národná banka Slovenska",
        lastUpdate: "Q3 2025",
      },
    });
  } catch (error) {
    console.error("Error in price-history:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
