/**
 * Public API - Market Stats
 * 
 * Štatistiky trhu pre Pro/Enterprise zákazníkov
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { SlovakCity, ListingType } from "@/generated/prisma/client";

async function validateApiKey(apiKey: string): Promise<boolean> {
  if (!apiKey) return false;
  
  const keyRecord = await prisma.apiKey.findUnique({
    where: { key: apiKey },
  });
  
  if (!keyRecord || !keyRecord.isActive) return false;
  
  const subscription = await prisma.subscription.findFirst({
    where: { 
      userId: keyRecord.userId,
      status: "ACTIVE",
      plan: { in: ["PREMIUM", "ENTERPRISE"] },
    },
  });
  
  return !!subscription;
}

/**
 * GET /api/v1/public/market-stats
 * 
 * Query parametre:
 * - city: SlovakCity
 * - listingType: PREDAJ | PRENAJOM
 * - days: number (default 30)
 */
export async function GET(request: NextRequest) {
  try {
    const apiKey = request.headers.get("X-API-Key") || request.headers.get("x-api-key");
    
    if (!apiKey || !(await validateApiKey(apiKey))) {
      return NextResponse.json({
        success: false,
        error: "Unauthorized",
        message: "Valid API key required",
      }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const city = searchParams.get("city") as SlovakCity | null;
    const listingType = (searchParams.get("listingType") as ListingType) || "PREDAJ";
    const days = parseInt(searchParams.get("days") || "30");
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    // Základné štatistiky
    const where: Record<string, unknown> = {
      listing_type: listingType,
    };
    if (city) where.city = city;
    
    const [
      totalProperties,
      avgPrice,
      priceStats,
      newToday,
      hotDeals,
    ] = await Promise.all([
      prisma.property.count({ where }),
      prisma.property.aggregate({
        where,
        _avg: { price: true, price_per_m2: true, area_m2: true },
        _min: { price: true },
        _max: { price: true },
      }),
      prisma.dailyMarketStats.findMany({
        where: {
          city: city || undefined,
          listingType,
          date: { gte: startDate },
        },
        orderBy: { date: "asc" },
        select: {
          date: true,
          avgPricePerM2: true,
          totalListings: true,
          newListings: true,
          hotDealsCount: true,
        },
      }),
      prisma.property.count({
        where: {
          ...where,
          createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
      }),
      prisma.property.count({
        where: {
          ...where,
          is_distressed: true,
        },
      }),
    ]);
    
    // Rozdelenie podľa miest
    const byCity = await prisma.property.groupBy({
      by: ["city"],
      where: { listing_type: listingType },
      _count: { id: true },
      _avg: { price_per_m2: true },
    });
    
    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalProperties,
          avgPrice: Math.round(avgPrice._avg.price || 0),
          avgPricePerM2: Math.round(avgPrice._avg.price_per_m2 || 0),
          avgArea: Math.round(avgPrice._avg.area_m2 || 0),
          minPrice: avgPrice._min.price,
          maxPrice: avgPrice._max.price,
          newToday,
          hotDeals,
        },
        trend: priceStats.map(s => ({
          date: s.date.toISOString().split("T")[0],
          avgPricePerM2: s.avgPricePerM2,
          totalListings: s.totalListings,
          newListings: s.newListings,
          hotDeals: s.hotDealsCount,
        })),
        byCity: byCity.map(c => ({
          city: c.city,
          count: c._count.id,
          avgPricePerM2: Math.round(c._avg.price_per_m2 || 0),
        })),
      },
      meta: {
        period: `${days} days`,
        listingType,
        city: city || "all",
        timestamp: new Date().toISOString(),
      },
    });
    
  } catch (error) {
    console.error("Market stats API error:", error);
    return NextResponse.json({
      success: false,
      error: "Internal server error",
    }, { status: 500 });
  }
}
