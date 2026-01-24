/**
 * Fair Value API - Quick property valuation
 * Returns whether a property is overpriced, underpriced, or fair
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const propertyId = request.nextUrl.searchParams.get("propertyId");

  if (!propertyId) {
    return NextResponse.json({ success: false, error: "Missing propertyId" }, { status: 400 });
  }

  try {
    // Get the property
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      select: {
        id: true,
        price: true,
        price_per_m2: true,
        area_m2: true,
        city: true,
        district: true,
        rooms: true,
        condition: true,
      },
    });

    if (!property) {
      return NextResponse.json({ success: false, error: "Property not found" }, { status: 404 });
    }

    // Find comparable properties (same city, similar area ±20%)
    const areaMin = property.area_m2 * 0.8;
    const areaMax = property.area_m2 * 1.2;

    const comparables = await prisma.property.findMany({
      where: {
        id: { not: propertyId },
        city: property.city,
        area_m2: { gte: areaMin, lte: areaMax },
        listing_type: "PREDAJ",
        rooms: property.rooms ? { gte: property.rooms - 1, lte: property.rooms + 1 } : undefined,
      },
      select: {
        price_per_m2: true,
        price: true,
      },
      take: 100,
    });

    if (comparables.length < 3) {
      return NextResponse.json({
        success: true,
        data: {
          status: "insufficient_data",
          message: "Nedostatok podobných nehnuteľností",
          comparablesCount: comparables.length,
        },
      });
    }

    // Calculate statistics
    const pricesPerM2 = comparables.map(c => c.price_per_m2).sort((a, b) => a - b);
    const avgPricePerM2 = pricesPerM2.reduce((a, b) => a + b, 0) / pricesPerM2.length;
    const medianPricePerM2 = pricesPerM2[Math.floor(pricesPerM2.length / 2)];

    // Use median for more robust comparison
    const fairValue = Math.round(medianPricePerM2 * property.area_m2);
    const difference = property.price - fairValue;
    const differencePercent = Math.round((difference / fairValue) * 100);

    // Determine status
    let status: "great_deal" | "good_deal" | "fair" | "overpriced" | "very_overpriced";
    let label: string;
    let color: string;

    if (differencePercent <= -15) {
      status = "great_deal";
      label = "Výborná cena!";
      color = "emerald";
    } else if (differencePercent <= -5) {
      status = "good_deal";
      label = "Dobrá cena";
      color = "green";
    } else if (differencePercent <= 5) {
      status = "fair";
      label = "Férová cena";
      color = "blue";
    } else if (differencePercent <= 15) {
      status = "overpriced";
      label = "Mierne predražené";
      color = "amber";
    } else {
      status = "very_overpriced";
      label = "Predražené";
      color = "red";
    }

    return NextResponse.json({
      success: true,
      data: {
        status,
        label,
        color,
        fairValue,
        currentPrice: property.price,
        difference,
        differencePercent,
        avgPricePerM2: Math.round(avgPricePerM2),
        medianPricePerM2: Math.round(medianPricePerM2),
        comparablesCount: comparables.length,
      },
    });
  } catch (error) {
    console.error("Fair value error:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}

export const runtime = "nodejs";
