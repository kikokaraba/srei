import { NextResponse } from "next/server";
import { analyticsRateLimiter } from "@/lib/rate-limit";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

// Mock data for Slovak cities
const mockAnalytics = {
  BRATISLAVA: {
    city: "BRATISLAVA",
    avg_price_m2: 3200,
    avg_rent_m2: 12.5,
    yield_benchmark: 4.7,
    volatility_index: 0.35,
    properties_count: 1247,
    trend: "stable" as const,
    last_updated: new Date().toISOString(),
  },
  KOSICE: {
    city: "KOSICE",
    avg_price_m2: 1850,
    avg_rent_m2: 8.2,
    yield_benchmark: 5.3,
    volatility_index: 0.42,
    properties_count: 892,
    trend: "rising" as const,
    last_updated: new Date().toISOString(),
  },
  NITRA: {
    city: "NITRA",
    avg_price_m2: 1650,
    avg_rent_m2: 7.8,
    yield_benchmark: 5.7,
    volatility_index: 0.38,
    properties_count: 456,
    trend: "rising" as const,
    last_updated: new Date().toISOString(),
  },
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
      // Pokračujeme bez rate limitingu
    }

    // Authentication check - ak nie je session, vrátime mock dáta (pre landing page)
    try {
      const session = await auth();
      if (!session) {
        // Vracame mock dáta aj bez auth, aby landing page fungoval
        console.warn("No session found, returning mock data");
      }
    } catch (authError) {
      console.error("Auth error:", authError);
      // Pokračujeme s mock dátami
    }

    // Return mock analytics data
    return NextResponse.json({
      success: true,
      data: Object.values(mockAnalytics),
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
