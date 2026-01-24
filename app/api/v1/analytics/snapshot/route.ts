import { NextResponse } from "next/server";
import { analyticsRateLimiter } from "@/lib/rate-limit";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getAggregatedMarketData } from "@/lib/data-sources";

// Mapovanie miest na kódy krajov
const CITY_TO_REGION: Record<string, string> = {
  BRATISLAVA: "BA",
  KOSICE: "KE",
  ZILINA: "ZA",
  NITRA: "NR",
  PRESOV: "PO",
  BANSKA_BYSTRICA: "BB",
  TRNAVA: "TT",
  TRENCIN: "TN",
};

// Mapovanie kódov na slovenské názvy
const REGION_NAMES: Record<string, string> = {
  BA: "Bratislavský",
  KE: "Košický",
  ZA: "Žilinský",
  NR: "Nitriansky",
  PO: "Prešovský",
  BB: "Banskobystrický",
  TT: "Trnavský",
  TN: "Trenčiansky",
};

export async function GET() {
  try {
    // Rate limiting - skip ak rate limiter nie je dostupný
    try {
      const headersList = await headers();
      const ip = headersList.get("x-forwarded-for") || "unknown";
      
      const { success } = await analyticsRateLimiter.limit(ip);
      if (!success) {
        return NextResponse.json(
          { error: "Rate limit exceeded" },
          { status: 429 }
        );
      }
    } catch (rateLimitError) {
      console.warn("Rate limiter not available:", rateLimitError);
    }

    // Authentication check
    try {
      const session = await auth();
      if (!session) {
        console.warn("No session found, returning public data");
      }
    } catch (authError) {
      console.error("Auth error:", authError);
    }

    // Načítaj agregované trhové dáta z NBS a ŠÚ SR
    const marketData = await getAggregatedMarketData();
    
    // Spočítaj počet nehnuteľností v databáze pre každé mesto
    let propertyCounts = new Map<string, number>();
    try {
      const counts = await prisma.property.groupBy({
        by: ["city"],
        _count: { id: true },
      });
      propertyCounts = new Map(counts.map(p => [p.city, p._count.id]));
    } catch (dbError) {
      console.warn("Could not fetch property counts:", dbError);
    }
    
    // Transformuj na očakávaný formát s krajmi
    const analyticsData = marketData.map(data => {
      // Určenie trendu na základe YoY zmeny
      let trend: "stable" | "rising" | "falling" = "stable";
      if (data.priceChangeYoY > 3) trend = "rising";
      else if (data.priceChangeYoY < -1) trend = "falling";
      
      // Volatilita index (invertovaný demand/supply pomer)
      const volatility = Math.abs(data.demandIndex - data.supplyIndex) / 100;
      
      // Mapuj mesto na región
      const regionCode = CITY_TO_REGION[data.city] || data.city.slice(0, 2);
      
      return {
        region: regionCode,
        regionName: REGION_NAMES[regionCode] || regionCode,
        avg_price_m2: data.avgPricePerSqm,
        avg_rent_m2: data.avgRent,
        yield_benchmark: data.grossYield,
        volatility_index: Math.round(volatility * 100) / 100,
        properties_count: propertyCounts.get(data.city) || data.listingsCount,
        trend,
        last_updated: data.updatedAt.toISOString(),
        // Nové polia z reálnych dát
        price_change_yoy: data.priceChangeYoY,
        price_change_qoq: data.priceChangeQoQ,
        demand_index: data.demandIndex,
        supply_index: data.supplyIndex,
        avg_days_on_market: data.avgDaysOnMarket,
      };
    });

    return NextResponse.json({
      success: true,
      data: analyticsData,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Analytics snapshot error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
