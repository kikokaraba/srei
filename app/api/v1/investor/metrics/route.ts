/**
 * Investor Metrics API
 * 
 * Pokročilé metriky pre profesionálnych investorov
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { 
  calculatePriceMomentum,
  calculateTrustScore,
  calculateNegotiationPower,
  getPriceStory,
} from "@/lib/analysis/investor-metrics";
import type { SlovakCity } from "@/generated/prisma/client";

/**
 * GET /api/v1/investor/metrics
 * 
 * Query params:
 * - type: "momentum" | "trust" | "negotiation" | "story"
 * - city: SlovakCity (pre momentum)
 * - district: string (pre momentum)
 * - propertyId: string (pre trust, negotiation, story)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const city = searchParams.get("city") as SlovakCity | null;
    const district = searchParams.get("district");
    const propertyId = searchParams.get("propertyId");

    switch (type) {
      case "momentum": {
        if (!city) {
          return NextResponse.json({ 
            success: false, 
            error: "City parameter required for momentum" 
          }, { status: 400 });
        }

        const momentum = await calculatePriceMomentum(city, district || undefined);
        
        return NextResponse.json({
          success: true,
          data: momentum,
        });
      }

      case "trust": {
        if (!propertyId) {
          return NextResponse.json({ 
            success: false, 
            error: "propertyId required for trust score" 
          }, { status: 400 });
        }

        const property = await prisma.property.findUnique({
          where: { id: propertyId },
        });

        if (!property) {
          return NextResponse.json({ success: false, error: "Property not found" }, { status: 404 });
        }

        const trustScore = await calculateTrustScore(property);
        
        return NextResponse.json({
          success: true,
          data: trustScore,
        });
      }

      case "negotiation": {
        if (!propertyId) {
          return NextResponse.json({ 
            success: false, 
            error: "propertyId required for negotiation power" 
          }, { status: 400 });
        }

        const property = await prisma.property.findUnique({
          where: { id: propertyId },
        });

        if (!property) {
          return NextResponse.json({ success: false, error: "Property not found" }, { status: 404 });
        }

        const negotiation = await calculateNegotiationPower(property);
        
        return NextResponse.json({
          success: true,
          data: negotiation,
        });
      }

      case "story": {
        if (!propertyId) {
          return NextResponse.json({ 
            success: false, 
            error: "propertyId required for price story" 
          }, { status: 400 });
        }

        const story = await getPriceStory(propertyId);
        
        if (!story) {
          return NextResponse.json({ success: false, error: "Property not found" }, { status: 404 });
        }

        return NextResponse.json({
          success: true,
          data: story,
        });
      }

      case "full": {
        // Kompletná analýza pre property
        if (!propertyId) {
          return NextResponse.json({ 
            success: false, 
            error: "propertyId required" 
          }, { status: 400 });
        }

        const property = await prisma.property.findUnique({
          where: { id: propertyId },
        });

        if (!property) {
          return NextResponse.json({ success: false, error: "Property not found" }, { status: 404 });
        }

        const [trustScore, negotiation, story, momentum] = await Promise.all([
          calculateTrustScore(property),
          calculateNegotiationPower(property),
          getPriceStory(propertyId),
          calculatePriceMomentum(property.city, property.district || undefined),
        ]);

        return NextResponse.json({
          success: true,
          data: {
            property: {
              id: property.id,
              title: property.title,
              price: property.price,
              pricePerM2: property.price_per_m2,
              city: property.city,
              district: property.district,
            },
            trustScore,
            negotiation,
            priceStory: story,
            momentum,
            // Quick summary for UI
            investorSummary: {
              trustLevel: trustScore.level,
              negotiationScore: negotiation.score,
              suggestedDiscount: negotiation.suggestedDiscount,
              marketTrend: momentum.trend,
              signal: momentum.signal,
              topRedFlags: trustScore.redFlags.slice(0, 2),
              topGreenFlags: trustScore.greenFlags.slice(0, 2),
            },
          },
        });
      }

      default:
        return NextResponse.json({
          success: false,
          error: "Invalid type. Use: momentum, trust, negotiation, story, or full",
        }, { status: 400 });
    }

  } catch (error) {
    console.error("Investor metrics error:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Internal error",
    }, { status: 500 });
  }
}

/**
 * POST /api/v1/investor/metrics/batch
 * 
 * Hromadný výpočet momentum pre všetky mestá
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { cities } = body as { cities?: SlovakCity[] };

    const targetCities: SlovakCity[] = cities || [
      "BRATISLAVA", "KOSICE", "PRESOV", "ZILINA",
      "BANSKA_BYSTRICA", "TRNAVA", "TRENCIN", "NITRA"
    ];

    const results = await Promise.all(
      targetCities.map(city => calculatePriceMomentum(city))
    );

    // Sort by change to highlight opportunities
    const sorted = results.sort((a, b) => a.changePercent30d - b.changePercent30d);

    return NextResponse.json({
      success: true,
      data: {
        momentumByCity: sorted,
        summary: {
          fallingMarkets: sorted.filter(m => m.trend === "falling").map(m => m.city),
          risingMarkets: sorted.filter(m => m.trend === "rising").map(m => m.city),
          bestNegotiationOpportunity: sorted[0]?.city,
          hottest: sorted[sorted.length - 1]?.city,
        },
      },
    });

  } catch (error) {
    console.error("Batch momentum error:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Internal error",
    }, { status: 500 });
  }
}
