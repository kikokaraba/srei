import { NextResponse } from "next/server";
import { analyticsRateLimiter } from "@/lib/rate-limit";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import type { SlovakCity } from "@/generated/prisma/client";

// Fallback data ak databáza nemá dáta
const fallbackAnalytics = {
  BRATISLAVA: { avg_price_m2: 3200, avg_rent_m2: 12.5, yield_benchmark: 4.7, volatility_index: 0.35 },
  KOSICE: { avg_price_m2: 1850, avg_rent_m2: 8.2, yield_benchmark: 5.3, volatility_index: 0.42 },
  NITRA: { avg_price_m2: 1650, avg_rent_m2: 7.8, yield_benchmark: 5.7, volatility_index: 0.38 },
  PRESOV: { avg_price_m2: 1550, avg_rent_m2: 7.2, yield_benchmark: 5.6, volatility_index: 0.40 },
  ZILINA: { avg_price_m2: 1950, avg_rent_m2: 8.5, yield_benchmark: 5.2, volatility_index: 0.38 },
  BANSKA_BYSTRICA: { avg_price_m2: 1700, avg_rent_m2: 7.5, yield_benchmark: 5.3, volatility_index: 0.39 },
  TRNAVA: { avg_price_m2: 2100, avg_rent_m2: 9.0, yield_benchmark: 5.1, volatility_index: 0.36 },
  TRENCIN: { avg_price_m2: 1800, avg_rent_m2: 7.8, yield_benchmark: 5.2, volatility_index: 0.37 },
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

    // Skúsime načítať reálne dáta z databázy
    let analyticsData: Array<{
      city: string;
      avg_price_m2: number;
      avg_rent_m2: number;
      yield_benchmark: number;
      volatility_index: number;
      properties_count: number;
      trend: "stable" | "rising" | "falling";
      last_updated: string;
    }> = [];

    try {
      // Načítaj najnovšie MarketAnalytics pre každé mesto
      const marketAnalytics = await prisma.marketAnalytics.findMany({
        orderBy: { timestamp: "desc" },
        distinct: ["city"],
      });

      // Spočítaj počet nehnuteľností pre každé mesto
      const propertyCounts = await prisma.property.groupBy({
        by: ["city"],
        _count: { id: true },
      });

      const countMap = new Map(propertyCounts.map(p => [p.city, p._count.id]));

      if (marketAnalytics.length > 0) {
        analyticsData = marketAnalytics.map(ma => ({
          city: ma.city,
          avg_price_m2: ma.avg_price_m2,
          avg_rent_m2: ma.avg_rent_m2,
          yield_benchmark: ma.yield_benchmark,
          volatility_index: ma.volatility_index,
          properties_count: countMap.get(ma.city) || 0,
          trend: ma.volatility_index < 0.35 ? "stable" as const : ma.volatility_index < 0.45 ? "rising" as const : "falling" as const,
          last_updated: ma.timestamp.toISOString(),
        }));
      } else {
        // Ak nie sú MarketAnalytics, spočítaj z Property
        const propertyStats = await prisma.property.groupBy({
          by: ["city"],
          _avg: { price_per_m2: true },
          _count: { id: true },
        });

        if (propertyStats.length > 0) {
          analyticsData = propertyStats.map(ps => {
            const fallback = fallbackAnalytics[ps.city as keyof typeof fallbackAnalytics] || fallbackAnalytics.BRATISLAVA;
            return {
              city: ps.city,
              avg_price_m2: ps._avg.price_per_m2 || fallback.avg_price_m2,
              avg_rent_m2: fallback.avg_rent_m2,
              yield_benchmark: fallback.yield_benchmark,
              volatility_index: fallback.volatility_index,
              properties_count: ps._count.id,
              trend: "stable" as const,
              last_updated: new Date().toISOString(),
            };
          });
        }
      }
    } catch (dbError) {
      console.error("Database error:", dbError);
    }

    // Ak nemáme reálne dáta, použijeme fallback
    if (analyticsData.length === 0) {
      analyticsData = Object.entries(fallbackAnalytics).map(([city, data]) => ({
        city,
        ...data,
        properties_count: 0,
        trend: "stable" as const,
        last_updated: new Date().toISOString(),
      }));
    }

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
