// API endpoint pre mapu nehnuteľností
// GET /api/v1/properties/map

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    // Parse query parameters
    const city = searchParams.get("city");
    const listingType = searchParams.get("listingType");
    const priceMin = searchParams.get("priceMin");
    const priceMax = searchParams.get("priceMax");
    const hotDealsOnly = searchParams.get("hotDealsOnly") === "true";
    const hasCoordinates = searchParams.get("hasCoordinates") === "true";
    const limit = parseInt(searchParams.get("limit") || "500", 10);
    
    // Build where clause
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};
    
    // Filter by city
    if (city && city !== "ALL") {
      where.city = city;
    }
    
    // Filter by listing type
    if (listingType && listingType !== "ALL") {
      where.listing_type = listingType;
    }
    
    // Filter by price
    if (priceMin || priceMax) {
      where.price = {};
      if (priceMin) where.price.gte = parseFloat(priceMin);
      if (priceMax) where.price.lte = parseFloat(priceMax);
    }
    
    // Filter hot deals only
    if (hotDealsOnly) {
      where.is_distressed = true;
    }
    
    // Filter only properties with coordinates
    if (hasCoordinates) {
      where.latitude = { not: null };
      where.longitude = { not: null };
    }
    
    // Fetch properties
    const properties = await prisma.property.findMany({
      where,
      select: {
        id: true,
        title: true,
        price: true,
        price_per_m2: true,
        area_m2: true,
        city: true,
        district: true,
        latitude: true,
        longitude: true,
        condition: true,
        listing_type: true,
        is_distressed: true,
        source_url: true,
        rooms: true,
        source: true,
      },
      orderBy: [
        { is_distressed: "desc" }, // Hot deals first
        { createdAt: "desc" },
      ],
      take: Math.min(limit, 2000), // Max 2000 for performance
    });
    
    // Calculate stats
    const stats = {
      total: properties.length,
      withCoordinates: properties.filter(p => p.latitude && p.longitude).length,
      hotDeals: properties.filter(p => p.is_distressed).length,
      avgPricePerM2: properties.length > 0 
        ? Math.round(properties.reduce((sum, p) => sum + p.price_per_m2, 0) / properties.length)
        : 0,
      forSale: properties.filter(p => p.listing_type === "PREDAJ").length,
      forRent: properties.filter(p => p.listing_type === "PRENAJOM").length,
    };
    
    return NextResponse.json({
      success: true,
      properties,
      stats,
      filters: {
        city: city || "ALL",
        listingType: listingType || "ALL",
        priceMin: priceMin ? parseFloat(priceMin) : null,
        priceMax: priceMax ? parseFloat(priceMax) : null,
        hotDealsOnly,
      },
    });
    
  } catch (error) {
    console.error("Error fetching properties for map:", error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Internal error",
        properties: [],
        stats: { total: 0, withCoordinates: 0, hotDeals: 0, avgPricePerM2: 0, forSale: 0, forRent: 0 },
      },
      { status: 500 }
    );
  }
}
