/**
 * API - Historické dáta trhu
 * 
 * Vracia agregované štatistiky z PropertyLifecycle tabuľky
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const city = searchParams.get("city");

    // Base where clause
    const whereClause = city ? { city } : {};

    // Get total stats
    const [totalStats, cityStats, recentlySold] = await Promise.all([
      // Aggregated stats
      prisma.propertyLifecycle.aggregate({
        where: whereClause,
        _count: true,
        _avg: {
          daysOnMarket: true,
          priceChange: true,
          priceChangePercent: true,
        },
      }),

      // Stats by city
      prisma.propertyLifecycle.groupBy({
        by: ["city"],
        where: whereClause,
        _count: true,
        _avg: {
          finalPrice: true,
          area_m2: true,
          daysOnMarket: true,
          priceChange: true,
          priceChangePercent: true,
        },
        orderBy: {
          _count: {
            city: "desc",
          },
        },
        take: 20,
      }),

      // Recent sold/removed
      prisma.propertyLifecycle.findMany({
        where: whereClause,
        orderBy: { lastSeenAt: "desc" },
        take: 20,
        select: {
          id: true,
          title: true,
          city: true,
          initialPrice: true,
          finalPrice: true,
          priceChange: true,
          daysOnMarket: true,
          lastSeenAt: true,
        },
      }),
    ]);

    // Calculate monthly stats
    const monthlyData = await prisma.propertyLifecycle.findMany({
      where: whereClause,
      select: {
        lastSeenAt: true,
        finalPrice: true,
        area_m2: true,
      },
    });

    // Group by month
    const monthlyMap: Record<string, { count: number; totalPrice: number; totalPricePerM2: number }> = {};
    
    for (const item of monthlyData) {
      const monthKey = new Date(item.lastSeenAt).toISOString().slice(0, 7); // YYYY-MM
      if (!monthlyMap[monthKey]) {
        monthlyMap[monthKey] = { count: 0, totalPrice: 0, totalPricePerM2: 0 };
      }
      monthlyMap[monthKey].count++;
      monthlyMap[monthKey].totalPrice += item.finalPrice;
      if (item.area_m2 > 0) {
        monthlyMap[monthKey].totalPricePerM2 += item.finalPrice / item.area_m2;
      }
    }

    const monthlyStats = Object.entries(monthlyMap)
      .map(([month, stats]) => ({
        month: formatMonth(month),
        count: stats.count,
        avgPrice: Math.round(stats.totalPrice / stats.count),
        avgPricePerM2: Math.round(stats.totalPricePerM2 / stats.count),
        avgDaysOnMarket: 0, // Would need separate query
      }))
      .sort((a, b) => b.month.localeCompare(a.month))
      .slice(0, 12);

    // Format city stats with price per m2
    const formattedCityStats = cityStats.map((cs) => ({
      city: cs.city,
      totalSold: cs._count,
      avgPrice: Math.round(cs._avg.finalPrice || 0),
      avgPricePerM2: cs._avg.area_m2 && cs._avg.finalPrice 
        ? Math.round(cs._avg.finalPrice / cs._avg.area_m2) 
        : 0,
      avgDaysOnMarket: Math.round(cs._avg.daysOnMarket || 0),
      avgPriceChange: Math.round(cs._avg.priceChange || 0),
      avgPriceChangePercent: cs._avg.priceChangePercent || 0,
    }));

    return NextResponse.json({
      success: true,
      data: {
        totalSold: totalStats._count,
        avgDaysOnMarket: Math.round(totalStats._avg.daysOnMarket || 0),
        avgPriceChange: Math.round(totalStats._avg.priceChange || 0),
        avgPriceChangePercent: totalStats._avg.priceChangePercent || 0,
        cityStats: formattedCityStats,
        monthlyStats,
        recentlySold: recentlySold.map((item) => ({
          ...item,
          lastSeenAt: item.lastSeenAt.toISOString(),
        })),
      },
    });

  } catch (error) {
    console.error("Market history error:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      data: {
        totalSold: 0,
        avgDaysOnMarket: 0,
        avgPriceChange: 0,
        avgPriceChangePercent: 0,
        cityStats: [],
        monthlyStats: [],
        recentlySold: [],
      },
    });
  }
}

function formatMonth(monthStr: string): string {
  const [year, month] = monthStr.split("-");
  const monthNames = [
    "Január", "Február", "Marec", "Apríl", "Máj", "Jún",
    "Júl", "August", "September", "Október", "November", "December"
  ];
  return `${monthNames[parseInt(month, 10) - 1]} ${year}`;
}
