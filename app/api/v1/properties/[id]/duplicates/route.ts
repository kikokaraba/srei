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
      include: {
        fingerprint: true,
      },
    });

    if (!property) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    // Find similar properties based on:
    // 1. Same city
    // 2. Similar area (±10%)
    // 3. Similar price (±15%)
    // 4. Same number of rooms (if available)
    const areaMin = property.area_m2 * 0.9;
    const areaMax = property.area_m2 * 1.1;
    const priceMin = property.price * 0.85;
    const priceMax = property.price * 1.15;

    const similarProperties = await prisma.property.findMany({
      where: {
        id: { not: property.id },
        city: { equals: property.city, mode: "insensitive" },
        area_m2: { gte: areaMin, lte: areaMax },
        price: { gte: priceMin, lte: priceMax },
        ...(property.rooms ? { rooms: property.rooms } : {}),
      },
      select: {
        id: true,
        source: true,
        price: true,
        title: true,
        source_url: true,
      },
    });

    if (similarProperties.length === 0) {
      return NextResponse.json({
        success: true,
        data: null,
      });
    }

    // Calculate statistics
    const allPrices = [property.price, ...similarProperties.map(p => p.price)];
    const minPrice = Math.min(...allPrices);
    const maxPrice = Math.max(...allPrices);
    const sources = [...new Set([property.source, ...similarProperties.map(p => p.source)])];

    const data = {
      count: similarProperties.length + 1,
      sources,
      priceRange: {
        min: minPrice,
        max: maxPrice,
      },
      savings: property.price > minPrice ? property.price - minPrice : null,
      duplicates: similarProperties,
    };

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Error fetching duplicates:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
