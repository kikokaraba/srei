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

/**
 * GET /api/v1/investor/metrics
 * 
 * Query params:
 * - type: "momentum" | "trust" | "negotiation" | "story"
 * - city: string (pre momentum)
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
    const city = searchParams.get("city") as string | null;
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

        // Nájdi duplicity (podobné properties s rovnakými parametrami)
        const duplicates = await prisma.property.findMany({
          where: {
            id: { not: property.id },
            city: property.city,
            area_m2: { gte: property.area_m2 - 5, lte: property.area_m2 + 5 },
            rooms: property.rooms,
            price: { gte: property.price * 0.85, lte: property.price * 1.15 },
          },
          select: { id: true, price: true, source: true },
          take: 10,
        });

        const [trustScore, negotiation, story, momentum] = await Promise.all([
          calculateTrustScore(property),
          calculateNegotiationPower(property),
          getPriceStory(propertyId),
          calculatePriceMomentum(property.city, property.district || undefined),
        ]);

        const hasDuplicates = duplicates.length > 0;
        const bestPrice = hasDuplicates 
          ? Math.min(property.price, ...duplicates.map(d => d.price))
          : property.price;

        return NextResponse.json({
          success: true,
          data: {
            // Flat structure for easy badge rendering
            trustScore: trustScore.score,
            redFlags: trustScore.redFlags,
            greenFlags: trustScore.greenFlags,
            negotiationPower: negotiation.score,
            suggestedDiscount: negotiation.suggestedDiscount,
            priceDrops: story?.priceDrops || 0,
            daysOnMarket: story?.daysOnMarket || 0,
            hasDuplicates,
            duplicateCount: duplicates.length + 1,
            bestPrice,
            currentPrice: property.price,
            // Full data for detail view
            property: {
              id: property.id,
              title: property.title,
              price: property.price,
              pricePerM2: property.price_per_m2,
              city: property.city,
              district: property.district,
            },
            trustScoreFull: trustScore,
            negotiationFull: negotiation,
            priceStory: story,
            momentum,
            duplicates: duplicates.map(d => ({
              id: d.id,
              price: d.price,
              source: d.source,
            })),
          },
        });
      }
      
      case "quick": {
        // Rýchle metriky pre property kartu (optimalizované)
        if (!propertyId) {
          return NextResponse.json({ 
            success: false, 
            error: "propertyId required" 
          }, { status: 400 });
        }

        const property = await prisma.property.findUnique({
          where: { id: propertyId },
          include: {
            priceHistory: {
              orderBy: { recorded_at: "desc" },
              take: 5,
            },
          },
        });

        if (!property) {
          return NextResponse.json({ success: false, error: "Property not found" }, { status: 404 });
        }

        // Rýchly výpočet bez ťažkých queries
        const daysOnMarket = Math.floor(
          (Date.now() - property.createdAt.getTime()) / (1000 * 60 * 60 * 24)
        );
        
        const priceDrops = property.priceHistory.filter((h, i, arr) => 
          i > 0 && h.price < arr[i - 1].price
        ).length;

        // Zjednodušený trust score
        let trustScore = 70;
        const redFlags: string[] = [];
        const greenFlags: string[] = [];

        if (daysOnMarket > 180) {
          trustScore -= 20;
          redFlags.push(`${daysOnMarket} dní na trhu`);
        } else if (daysOnMarket < 7) {
          greenFlags.push("Čerstvý inzerát");
        }

        if (priceDrops > 0) {
          trustScore += 10;
          greenFlags.push(`${priceDrops}x zníženie ceny`);
        }

        // Check duplicates count only
        const duplicateCount = await prisma.property.count({
          where: {
            id: { not: property.id },
            city: property.city,
            area_m2: { gte: property.area_m2 - 5, lte: property.area_m2 + 5 },
            rooms: property.rooms,
          },
        });

        return NextResponse.json({
          success: true,
          data: {
            trustScore: Math.max(0, Math.min(100, trustScore)),
            redFlags,
            greenFlags,
            negotiationPower: daysOnMarket > 60 ? 70 : daysOnMarket > 30 ? 50 : 30,
            suggestedDiscount: daysOnMarket > 90 ? 15 : daysOnMarket > 60 ? 10 : 5,
            priceDrops,
            daysOnMarket,
            hasDuplicates: duplicateCount > 0,
            duplicateCount: duplicateCount + 1,
            currentPrice: property.price,
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
    const { cities } = body as { cities?: string[] };

    const targetCities: string[] = cities || [
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
