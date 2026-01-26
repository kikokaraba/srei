import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Get the property first
    const property = await prisma.property.findUnique({
      where: { id },
    });

    if (!property) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    // Only calculate for sale properties
    if (property.listing_type !== "PREDAJ") {
      return NextResponse.json({
        success: true,
        data: null,
        message: "Estimated rent only available for sale properties",
      });
    }

    // Find similar rental properties in the same city with similar characteristics
    const areaMin = property.area_m2 * 0.8;
    const areaMax = property.area_m2 * 1.2;

    const similarRentals = await prisma.property.findMany({
      where: {
        listing_type: "PRENAJOM",
        city: { contains: property.city, mode: "insensitive" },
        area_m2: { gte: areaMin, lte: areaMax },
        ...(property.rooms ? { rooms: property.rooms } : {}),
      },
      select: {
        id: true,
        price: true,
        area_m2: true,
        rooms: true,
        district: true,
        title: true,
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    if (similarRentals.length === 0) {
      // Try without rooms constraint
      const broaderSearch = await prisma.property.findMany({
        where: {
          listing_type: "PRENAJOM",
          city: { contains: property.city, mode: "insensitive" },
          area_m2: { gte: areaMin, lte: areaMax },
        },
        select: {
          id: true,
          price: true,
          area_m2: true,
          rooms: true,
          district: true,
          title: true,
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      });

      if (broaderSearch.length === 0) {
        return NextResponse.json({
          success: true,
          data: null,
          message: "No similar rental properties found for estimation",
        });
      }

      // Calculate estimated rent from broader search
      const prices = broaderSearch.map((r) => r.price);
      const avgRent = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
      const minRent = Math.min(...prices);
      const maxRent = Math.max(...prices);

      return NextResponse.json({
        success: true,
        data: {
          estimatedRent: avgRent,
          rentRange: { min: minRent, max: maxRent },
          basedOnCount: broaderSearch.length,
          confidence: "low", // broader search = lower confidence
          grossYield: ((avgRent * 12) / property.price) * 100,
          similarProperties: broaderSearch.slice(0, 5),
        },
      });
    }

    // Calculate statistics from similar rentals
    const prices = similarRentals.map((r) => r.price).sort((a, b) => a - b);
    const avgRent = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
    const medianRent = prices[Math.floor(prices.length / 2)];
    const minRent = Math.min(...prices);
    const maxRent = Math.max(...prices);

    // Determine confidence based on sample size and similarity
    let confidence: "high" | "medium" | "low" = "low";
    if (similarRentals.length >= 10) confidence = "high";
    else if (similarRentals.length >= 5) confidence = "medium";

    // Calculate potential gross yield
    const grossYield = ((avgRent * 12) / property.price) * 100;

    return NextResponse.json({
      success: true,
      data: {
        estimatedRent: avgRent,
        medianRent,
        rentRange: { min: minRent, max: maxRent },
        basedOnCount: similarRentals.length,
        confidence,
        grossYield: Math.round(grossYield * 100) / 100,
        // Show a few similar properties for reference
        similarProperties: similarRentals.slice(0, 5).map((r) => ({
          id: r.id,
          price: r.price,
          area_m2: r.area_m2,
          rooms: r.rooms,
          district: r.district,
        })),
      },
    });
  } catch (error) {
    console.error("Error estimating rent:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
