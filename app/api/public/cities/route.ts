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

// Normalize city names for matching
function normalizeCity(city: string): string {
  return city
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove diacritics
    .toLowerCase()
    .trim();
}

// Create normalized lookup
const CITY_COORDS_NORMALIZED: Record<string, { name: string; lat: number; lng: number }> = {};
for (const [name, coords] of Object.entries(CITY_COORDS)) {
  CITY_COORDS_NORMALIZED[normalizeCity(name)] = { name, ...coords };
}

export async function GET() {
  try {
    // Get TOTAL property count first (regardless of city matching)
    const [totalCount, totalHotDeals] = await Promise.all([
      prisma.property.count(),
      prisma.property.count({ where: { is_distressed: true } }),
    ]);

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

    // Aggregate by normalized city name
    const cityAggregated = new Map<string, { properties: number; avgPrice: number; hotDeals: number }>();
    
    for (const c of cityStats) {
      const normalized = normalizeCity(c.city);
      const match = CITY_COORDS_NORMALIZED[normalized];
      
      if (match) {
        const existing = cityAggregated.get(match.name) || { properties: 0, avgPrice: 0, hotDeals: 0 };
        existing.properties += c._count.id;
        existing.avgPrice = Math.round(c._avg.price_per_m2 || existing.avgPrice || 0);
        existing.hotDeals += hotDealsMap.get(c.city) || 0;
        cityAggregated.set(match.name, existing);
      }
    }

    // Format data for maps
    const cities = Array.from(cityAggregated.entries())
      .map(([name, data]) => ({
        name,
        lat: CITY_COORDS[name].lat,
        lng: CITY_COORDS[name].lng,
        properties: data.properties,
        avgPrice: data.avgPrice,
        hotDeals: data.hotDeals,
      }))
      .sort((a, b) => b.properties - a.properties);

    // Use TOTAL counts (all properties, not just matched cities)
    const totals = {
      properties: totalCount,
      hotDeals: totalHotDeals,
      cities: cities.length > 0 ? cities.length : Object.keys(CITY_COORDS).length,
    };

    return NextResponse.json({
      success: true,
      data: {
        cities,
        totals,
      },
      live: totalCount > 0,
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
