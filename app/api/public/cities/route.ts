// Public cities stats endpoint for landing page maps
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Cache the response for 5 minutes
export const revalidate = 300;

// Slovak cities with GPS coordinates
const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  "Bratislava": { lat: 48.1486, lng: 17.1077 },
  "Košice": { lat: 48.7164, lng: 21.2611 },
  "Prešov": { lat: 48.9986, lng: 21.2391 },
  "Žilina": { lat: 49.2231, lng: 18.7394 },
  "Banská Bystrica": { lat: 48.7364, lng: 19.1458 },
  "Trnava": { lat: 48.3774, lng: 17.5883 },
  "Trenčín": { lat: 48.8945, lng: 18.0444 },
  "Nitra": { lat: 48.3061, lng: 18.0833 },
  "Poprad": { lat: 49.0512, lng: 20.2943 },
  "Martin": { lat: 49.0636, lng: 18.9214 },
  "Piešťany": { lat: 48.7947, lng: 17.8382 },
  "Zvolen": { lat: 48.5744, lng: 19.1236 },
};

export async function GET() {
  try {
    // Get property stats grouped by city
    const cityStats = await prisma.property.groupBy({
      by: ["city"],
      _count: { id: true },
      _avg: { price_per_m2: true },
    });

    // Get hot deals count per city
    const hotDealsByCity = await prisma.property.groupBy({
      by: ["city"],
      where: { is_distressed: true },
      _count: { id: true },
    });

    // Create a map for quick lookup
    const hotDealsMap = new Map(
      hotDealsByCity.map(h => [h.city, h._count.id])
    );

    // Format data for maps
    const cities = cityStats
      .filter(c => CITY_COORDS[c.city]) // Only cities we have coords for
      .map(c => ({
        name: c.city,
        lat: CITY_COORDS[c.city].lat,
        lng: CITY_COORDS[c.city].lng,
        properties: c._count.id,
        avgPrice: Math.round(c._avg.price_per_m2 || 0),
        hotDeals: hotDealsMap.get(c.city) || 0,
      }))
      .sort((a, b) => b.properties - a.properties);

    // Calculate totals
    const totals = {
      properties: cities.reduce((sum, c) => sum + c.properties, 0),
      hotDeals: cities.reduce((sum, c) => sum + c.hotDeals, 0),
      cities: cities.length,
    };

    return NextResponse.json({
      success: true,
      data: {
        cities,
        totals,
      },
      live: totals.properties > 0,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Public cities stats error:", error);
    return NextResponse.json({
      success: true,
      data: {
        cities: [],
        totals: { properties: 0, hotDeals: 0, cities: 0 },
      },
      live: false,
      updatedAt: new Date().toISOString(),
    });
  }
}
