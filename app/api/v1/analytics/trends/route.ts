/**
 * Market Trends API
 * Returns historical market data and trends
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getMarketTrends, getRemovedListingsStats } from "@/lib/analytics/market-stats";
import type { SlovakCity, ListingType } from "@/generated/prisma/client";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const city = (request.nextUrl.searchParams.get("city") || "BRATISLAVA") as SlovakCity;
  const listingType = (request.nextUrl.searchParams.get("listingType") || "PREDAJ") as ListingType;

  try {
    const [trends, removedStats] = await Promise.all([
      getMarketTrends(city, listingType),
      getRemovedListingsStats(city),
    ]);

    // Calculate summary metrics
    const dailyTrend = trends.daily.length >= 2 
      ? trends.daily[trends.daily.length - 1].avgPricePerM2 - trends.daily[0].avgPricePerM2
      : 0;
    
    const monthlyTrend = trends.monthly.length >= 2
      ? trends.monthly[trends.monthly.length - 1].avgPricePerM2 - trends.monthly[0].avgPricePerM2
      : 0;

    return NextResponse.json({
      success: true,
      data: {
        city,
        listingType,
        trends: {
          daily: trends.daily.map(d => ({
            date: d.date,
            avgPrice: d.avgPrice,
            avgPricePerM2: d.avgPricePerM2,
            totalListings: d.totalListings,
            newListings: d.newListings,
            removedListings: d.removedListings,
            hotDealsPercent: d.hotDealsPercent,
          })),
          monthly: trends.monthly.map(m => ({
            year: m.year,
            month: m.month,
            avgPrice: m.avgPrice,
            avgPricePerM2: m.avgPricePerM2,
            totalListings: m.totalListings,
            priceChangePercent: m.priceChangePercent,
          })),
        },
        lifecycle: {
          byStatus: trends.lifecycle,
          avgDaysOnMarket: removedStats.byCity.find(c => c.city === city)?._avg.daysOnMarket || 0,
          quickSales: removedStats.quickSales,
          slowMovers: removedStats.slowMovers,
          priceDrops: removedStats.priceDrops,
          priceIncreases: removedStats.priceIncreases,
        },
        summary: {
          dailyTrendPerM2: dailyTrend,
          monthlyTrendPerM2: monthlyTrend,
          direction: monthlyTrend > 0 ? "UP" : monthlyTrend < 0 ? "DOWN" : "STABLE",
        },
      },
    });
  } catch (error) {
    console.error("Trends API error:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}

export const runtime = "nodejs";
