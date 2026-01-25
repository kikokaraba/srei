/**
 * Batch Investor Metrics API
 * 
 * Optimalizované API pre hromadné načítanie investor metrík
 * pre property listy (bez N+1 problému)
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface PriceHistoryPoint {
  price: number;
  date: string;
  changePercent: number | null;
}

interface PropertyBatchMetrics {
  propertyId: string;
  duplicateCount: number;
  bestPrice: number | null;
  savingsPercent: number | null;
  priceDrops: number;
  lastPriceChange: number | null; // percentuálna zmena
  daysOnMarket: number;
  trustIndicators: {
    hasMultipleSources: boolean;
    priceDropped: boolean;
    longOnMarket: boolean;
    freshListing: boolean;
  };
  // Price Story data
  priceStory: {
    originalPrice: number | null;
    currentPrice: number;
    totalChange: number | null;
    totalChangePercent: number | null;
    history: PriceHistoryPoint[];
  };
}

/**
 * POST /api/v1/investor/batch
 * 
 * Body: { propertyIds: string[] }
 * Returns: { [propertyId]: PropertyBatchMetrics }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { propertyIds } = body as { propertyIds?: string[] };

    if (!propertyIds || !Array.isArray(propertyIds) || propertyIds.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: "propertyIds array required" 
      }, { status: 400 });
    }

    // Limit to prevent abuse
    const limitedIds = propertyIds.slice(0, 50);

    // Fetch all properties with their price history
    const properties = await prisma.property.findMany({
      where: { id: { in: limitedIds } },
      select: {
        id: true,
        price: true,
        area_m2: true,
        rooms: true,
        city: true,
        createdAt: true,
        priceHistory: {
          orderBy: { recorded_at: "desc" },
          take: 5,
          select: { price: true, recorded_at: true },
        },
      },
    });

    // Create a map for quick lookup
    const propertyMap = new Map(properties.map(p => [p.id, p]));

    // Find duplicates for all properties in one query
    // Group by city + area_m2 (rounded) + rooms
    const duplicateGroups = await prisma.property.groupBy({
      by: ["city", "rooms"],
      where: {
        id: { in: limitedIds },
      },
      _count: { id: true },
      _min: { price: true },
    });

    // For each property, find similar ones
    const metricsMap: Record<string, PropertyBatchMetrics> = {};

    for (const prop of properties) {
      // Find duplicates
      const duplicates = await prisma.property.findMany({
        where: {
          id: { not: prop.id },
          city: prop.city,
          area_m2: { gte: prop.area_m2 - 10, lte: prop.area_m2 + 10 },
          rooms: prop.rooms,
        },
        select: { id: true, price: true },
        take: 10,
      });

      const duplicateCount = duplicates.length + 1;
      const allPrices = [prop.price, ...duplicates.map(d => d.price)];
      const bestPrice = Math.min(...allPrices);
      const savingsPercent = duplicateCount > 1 && bestPrice < prop.price
        ? Math.round(((prop.price - bestPrice) / prop.price) * 100)
        : null;

      // Price drops
      const priceHistory = prop.priceHistory;
      const priceDrops = priceHistory.filter((h, i, arr) => 
        i > 0 && h.price < arr[i - 1].price
      ).length;

      // Last price change
      let lastPriceChange: number | null = null;
      if (priceHistory.length >= 2) {
        const current = priceHistory[0].price;
        const previous = priceHistory[1].price;
        lastPriceChange = Math.round(((current - previous) / previous) * 100);
      }

      // Days on market
      const daysOnMarket = Math.floor(
        (Date.now() - prop.createdAt.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Build Price Story
      const originalPrice = priceHistory.length > 0 
        ? priceHistory[priceHistory.length - 1].price 
        : prop.price;
      const currentPrice = prop.price;
      const totalChange = originalPrice !== currentPrice 
        ? currentPrice - originalPrice 
        : null;
      const totalChangePercent = totalChange !== null 
        ? Math.round((totalChange / originalPrice) * 100) 
        : null;
      
      const historyPoints: PriceHistoryPoint[] = priceHistory.map((h, i, arr) => ({
        price: h.price,
        date: h.recorded_at.toISOString().split("T")[0],
        changePercent: i < arr.length - 1 
          ? Math.round(((h.price - arr[i + 1].price) / arr[i + 1].price) * 100)
          : null,
      })).reverse(); // oldest first for display

      metricsMap[prop.id] = {
        propertyId: prop.id,
        duplicateCount,
        bestPrice: duplicateCount > 1 ? bestPrice : null,
        savingsPercent,
        priceDrops,
        lastPriceChange,
        daysOnMarket,
        trustIndicators: {
          hasMultipleSources: duplicateCount > 1,
          priceDropped: priceDrops > 0,
          longOnMarket: daysOnMarket > 90,
          freshListing: daysOnMarket < 3,
        },
        priceStory: {
          originalPrice: priceHistory.length > 0 ? originalPrice : null,
          currentPrice,
          totalChange,
          totalChangePercent,
          history: historyPoints,
        },
      };
    }

    return NextResponse.json({
      success: true,
      data: metricsMap,
    });

  } catch (error) {
    console.error("Batch metrics error:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Internal error",
    }, { status: 500 });
  }
}
