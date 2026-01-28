/**
 * API endpoint for map data
 * Returns properties with coordinates for map display
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getPropertiesForMap } from "@/lib/monitoring/geocoding";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const city = searchParams.get("city") || undefined;
    const minP = searchParams.get("minPrice") ?? searchParams.get("priceMin");
    const maxP = searchParams.get("maxPrice") ?? searchParams.get("priceMax");
    const minPrice = minP != null && minP !== "" && !Number.isNaN(parseFloat(minP)) ? parseFloat(minP) : undefined;
    const maxPrice = maxP != null && maxP !== "" && !Number.isNaN(parseFloat(maxP)) ? parseFloat(maxP) : undefined;
    const listingType = searchParams.get("listingType") || undefined;
    const limitParam = searchParams.get("limit");
    const limit = limitParam ? Math.min(parseInt(limitParam, 10) || 1000, 2000) : undefined;

    const properties = await getPropertiesForMap({
      city,
      minPrice,
      maxPrice,
      listingType,
      limit,
    });

    return NextResponse.json({
      success: true,
      count: properties.length,
      data: properties,
      properties,
    });

  } catch (error) {
    console.error("Error fetching map data:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
