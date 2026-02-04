/**
 * API endpoint for map data
 * Returns properties with coordinates for map display
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getPropertiesForMap, getCityCenter } from "@/lib/monitoring/geocoding";
import { ListingType } from "@/generated/prisma/client";

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
    const listingTypeParam = searchParams.get("listingType");
    const listingType = (listingTypeParam === "PREDAJ" || listingTypeParam === "PRENAJOM") ? listingTypeParam as ListingType : undefined;
    const limitParam = searchParams.get("limit");
    const limit = limitParam ? Math.min(parseInt(limitParam, 10) || 5000, 10000) : 5000;
    const includeWithoutCoords = searchParams.get("includeWithoutCoords") === "true" || searchParams.get("includeWithoutCoords") === "1";

    const properties = await getPropertiesForMap({
      city,
      minPrice,
      maxPrice,
      listingType,
      limit,
      includeWithoutCoords,
    });

    const byCity: Record<string, { count: number; totalPricePerM2: number; hotDeals: number }> = {};
    for (const p of properties) {
      const key = p.city.trim();
      if (!byCity[key]) byCity[key] = { count: 0, totalPricePerM2: 0, hotDeals: 0 };
      byCity[key].count++;
      byCity[key].totalPricePerM2 += p.price_per_m2 ?? (p.area_m2 > 0 ? p.price / p.area_m2 : 0);
      if (p.is_distressed) byCity[key].hotDeals++;
    }
    const citySummary: { name: string; lat: number; lng: number; properties: number; hotDeals: number; avgPrice: number }[] = [];
    for (const [cityName, data] of Object.entries(byCity)) {
      const coords = getCityCenter(cityName);
      if (coords) {
        citySummary.push({
          name: cityName,
          lat: coords.lat,
          lng: coords.lng,
          properties: data.count,
          hotDeals: data.hotDeals,
          avgPrice: data.count > 0 ? Math.round(data.totalPricePerM2 / data.count) : 0,
        });
      }
    }
    citySummary.sort((a, b) => b.properties - a.properties);

    return NextResponse.json({
      success: true,
      count: properties.length,
      data: properties,
      properties,
      citySummary,
    });

  } catch (error) {
    console.error("Error fetching map data:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
