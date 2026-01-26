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
    const minPrice = searchParams.get("minPrice") ? parseFloat(searchParams.get("minPrice")!) : undefined;
    const maxPrice = searchParams.get("maxPrice") ? parseFloat(searchParams.get("maxPrice")!) : undefined;
    const listingType = searchParams.get("listingType") || undefined;

    const properties = await getPropertiesForMap({
      city,
      minPrice,
      maxPrice,
      listingType,
    });

    return NextResponse.json({
      success: true,
      count: properties.length,
      data: properties,
    });

  } catch (error) {
    console.error("Error fetching map data:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
