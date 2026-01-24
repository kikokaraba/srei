import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  calculateTrend,
  predictPrice,
  compareToMarket,
} from "@/lib/predictions/trend-analysis";
import {
  calculateInvestmentScore,
  assessRisk,
} from "@/lib/predictions/investment-score";
import type { PriceDataPoint } from "@/lib/predictions/types";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get("propertyId");
    const city = searchParams.get("city");
    const type = searchParams.get("type") || "property"; // "property" | "city" | "market"

    // City-level analysis
    if (type === "city" && city) {
      const cityAnalysis = await analyzeCityTrends(city);
      return NextResponse.json({ success: true, data: cityAnalysis });
    }

    // Market overview
    if (type === "market") {
      const marketAnalysis = await analyzeMarket();
      return NextResponse.json({ success: true, data: marketAnalysis });
    }

    // Property-specific analysis
    if (propertyId) {
      const propertyAnalysis = await analyzeProperty(propertyId);
      if (!propertyAnalysis) {
        return NextResponse.json({ success: false, error: "Property not found" }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: propertyAnalysis });
    }

    return NextResponse.json({ success: false, error: "Missing parameters" }, { status: 400 });
  } catch (error) {
    console.error("Error in predictions:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

async function analyzeProperty(propertyId: string) {
  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    include: {
      priceHistory: {
        orderBy: { recorded_at: "asc" },
      },
      investmentMetrics: true,
    },
  });

  if (!property) return null;

  // Get market data for comparison
  const marketData = await prisma.property.aggregate({
    where: { city: property.city },
    _avg: {
      price_per_m2: true,
      days_on_market: true,
    },
  });

  const avgYield = await prisma.investmentMetrics.aggregate({
    where: {
      property: { city: property.city },
    },
    _avg: {
      gross_yield: true,
    },
  });

  // Prepare historical data
  const historicalData: PriceDataPoint[] = property.priceHistory.map((ph) => ({
    date: ph.recorded_at,
    price: ph.price,
    pricePerM2: ph.price_per_m2,
  }));

  // Add current price if no history
  if (historicalData.length === 0) {
    historicalData.push({
      date: property.createdAt,
      price: property.price,
      pricePerM2: property.price_per_m2,
    });
  }

  // Calculate trends
  const trend1m = calculateTrend(historicalData, "1m");
  const trend3m = calculateTrend(historicalData, "3m");
  const trend1y = calculateTrend(historicalData, "1y");

  // Price prediction
  const prediction6m = predictPrice(historicalData, 6);
  const prediction1y = predictPrice(historicalData, 12);

  // Market comparison
  const allCityPrices = await prisma.property.findMany({
    where: { city: property.city },
    select: { price_per_m2: true },
  });

  const districtPrices = await prisma.property.findMany({
    where: { city: property.city, district: property.district },
    select: { price_per_m2: true },
  });

  const comparison = compareToMarket(
    property.price_per_m2,
    allCityPrices.map((p) => p.price_per_m2),
    districtPrices.map((p) => p.price_per_m2)
  );

  // Investment score
  const investmentScore = calculateInvestmentScore(
    {
      price: property.price,
      pricePerM2: property.price_per_m2,
      grossYield: property.investmentMetrics?.gross_yield,
      netYield: property.investmentMetrics?.net_yield,
      daysOnMarket: property.days_on_market,
      condition: property.condition,
      city: property.city,
      district: property.district,
      isDistressed: property.is_distressed,
    },
    {
      avgPricePerM2: marketData._avg.price_per_m2 || 2000,
      avgYield: avgYield._avg.gross_yield || 5,
      avgDaysOnMarket: marketData._avg.days_on_market || 45,
    }
  );

  // Risk assessment
  const riskAssessment = assessRisk(
    {
      price: property.price,
      pricePerM2: property.price_per_m2,
      grossYield: property.investmentMetrics?.gross_yield,
      daysOnMarket: property.days_on_market,
      condition: property.condition,
      city: property.city,
    },
    {
      avgPricePerM2: marketData._avg.price_per_m2 || 2000,
      avgYield: avgYield._avg.gross_yield || 5,
      avgDaysOnMarket: marketData._avg.days_on_market || 45,
    }
  );

  return {
    propertyId,
    analyzedAt: new Date(),
    trends: {
      "1m": trend1m,
      "3m": trend3m,
      "1y": trend1y,
    },
    predictions: {
      "6m": {
        predictedPricePerM2: prediction6m.predicted,
        confidence: prediction6m.confidence,
        range: prediction6m.range,
      },
      "1y": {
        predictedPricePerM2: prediction1y.predicted,
        confidence: prediction1y.confidence,
        range: prediction1y.range,
      },
    },
    marketComparison: comparison,
    investmentScore,
    riskAssessment,
  };
}

async function analyzeCityTrends(city: string) {
  // Get all properties in city
  const properties = await prisma.property.findMany({
    where: { city: city as any },
    include: {
      priceHistory: {
        orderBy: { recorded_at: "asc" },
      },
      investmentMetrics: true,
    },
  });

  // Get price history for the city
  const allHistory = properties.flatMap((p) =>
    p.priceHistory.map((ph) => ({
      date: ph.recorded_at,
      price: ph.price,
      pricePerM2: ph.price_per_m2,
    }))
  );

  // Add current prices if no history
  if (allHistory.length < 10) {
    properties.forEach((p) => {
      allHistory.push({
        date: p.createdAt,
        price: p.price,
        pricePerM2: p.price_per_m2,
      });
    });
  }

  // Sort by date
  allHistory.sort((a, b) => a.date.getTime() - b.date.getTime());

  // Calculate trends
  const trend3m = calculateTrend(allHistory, "3m");
  const trend1y = calculateTrend(allHistory, "1y");

  // Predictions
  const prediction6m = predictPrice(allHistory, 6);
  const prediction1y = predictPrice(allHistory, 12);

  // Current stats
  const stats = await prisma.property.aggregate({
    where: { city: city as any },
    _avg: {
      price: true,
      price_per_m2: true,
    },
    _count: true,
  });

  // District breakdown
  const districts = await prisma.property.groupBy({
    by: ["district"],
    where: { city: city as any },
    _avg: {
      price_per_m2: true,
    },
    _count: true,
  });

  const topDistricts = districts
    .sort((a, b) => (b._avg.price_per_m2 || 0) - (a._avg.price_per_m2 || 0))
    .slice(0, 5)
    .map((d) => ({
      district: d.district,
      avgPricePerM2: Math.round(d._avg.price_per_m2 || 0),
      propertyCount: d._count,
    }));

  return {
    city,
    analyzedAt: new Date(),
    stats: {
      totalProperties: stats._count,
      avgPrice: Math.round(stats._avg.price || 0),
      avgPricePerM2: Math.round(stats._avg.price_per_m2 || 0),
    },
    trends: {
      "3m": { ...trend3m, city },
      "1y": { ...trend1y, city },
    },
    predictions: {
      "6m": {
        predictedPricePerM2: prediction6m.predicted,
        confidence: prediction6m.confidence,
        range: prediction6m.range,
      },
      "1y": {
        predictedPricePerM2: prediction1y.predicted,
        confidence: prediction1y.confidence,
        range: prediction1y.range,
      },
    },
    topDistricts,
  };
}

async function analyzeMarket() {
  // Get overview for all cities
  const cities = [
    "BRATISLAVA",
    "KOSICE",
    "PRESOV",
    "ZILINA",
    "BANSKA_BYSTRICA",
    "TRNAVA",
    "TRENCIN",
    "NITRA",
  ];

  const cityStats = await Promise.all(
    cities.map(async (city) => {
      const stats = await prisma.property.aggregate({
        where: { city: city as any },
        _avg: {
          price_per_m2: true,
        },
        _count: true,
      });

      const yieldStats = await prisma.investmentMetrics.aggregate({
        where: {
          property: { city: city as any },
        },
        _avg: {
          gross_yield: true,
        },
      });

      return {
        city,
        propertyCount: stats._count,
        avgPricePerM2: Math.round(stats._avg.price_per_m2 || 0),
        avgYield: Math.round((yieldStats._avg.gross_yield || 0) * 10) / 10,
      };
    })
  );

  // Overall market stats
  const overallStats = await prisma.property.aggregate({
    _avg: {
      price: true,
      price_per_m2: true,
    },
    _count: true,
  });

  const overallYield = await prisma.investmentMetrics.aggregate({
    _avg: {
      gross_yield: true,
    },
  });

  return {
    analyzedAt: new Date(),
    overall: {
      totalProperties: overallStats._count,
      avgPrice: Math.round(overallStats._avg.price || 0),
      avgPricePerM2: Math.round(overallStats._avg.price_per_m2 || 0),
      avgYield: Math.round((overallYield._avg.gross_yield || 0) * 10) / 10,
    },
    cities: cityStats.sort((a, b) => b.avgPricePerM2 - a.avgPricePerM2),
    insights: generateMarketInsights(cityStats),
  };
}

function generateMarketInsights(
  cityStats: Array<{
    city: string;
    propertyCount: number;
    avgPricePerM2: number;
    avgYield: number;
  }>
) {
  const insights: string[] = [];

  // Highest yield city
  const highestYield = [...cityStats].sort((a, b) => b.avgYield - a.avgYield)[0];
  if (highestYield && highestYield.avgYield > 0) {
    insights.push(
      `Najvyšší priemerný výnos ponúka ${highestYield.city} s ${highestYield.avgYield}%`
    );
  }

  // Best value city
  const bestValue = [...cityStats]
    .filter((c) => c.avgYield > 0)
    .sort((a, b) => a.avgPricePerM2 / a.avgYield - b.avgPricePerM2 / b.avgYield)[0];
  if (bestValue) {
    insights.push(
      `Najlepší pomer cena/výnos má ${bestValue.city}`
    );
  }

  // Most active market
  const mostActive = [...cityStats].sort((a, b) => b.propertyCount - a.propertyCount)[0];
  if (mostActive) {
    insights.push(
      `Najaktívnejší trh je v ${mostActive.city} s ${mostActive.propertyCount} nehnuteľnosťami`
    );
  }

  return insights;
}
