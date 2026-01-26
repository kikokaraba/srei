/**
 * Geocoding - Convert addresses to coordinates
 * 
 * Uses Nominatim (OpenStreetMap) - free, no API key needed
 * Rate limit: 1 request per second
 */

import { prisma } from "@/lib/prisma";

interface GeocodingResult {
  latitude: number;
  longitude: number;
  displayName: string;
}

/**
 * Geocode an address using Nominatim (OpenStreetMap)
 */
async function geocodeAddress(
  city: string,
  district?: string,
  street?: string
): Promise<GeocodingResult | null> {
  try {
    // Build search query - more specific = better results
    let query = city;
    if (district) query = `${district}, ${city}`;
    if (street) query = `${street}, ${district || city}`;
    
    // Add Slovakia to improve accuracy
    query += ", Slovensko";

    const url = `https://nominatim.openstreetmap.org/search?` + new URLSearchParams({
      q: query,
      format: "json",
      limit: "1",
      countrycodes: "sk",
    });

    const response = await fetch(url, {
      headers: {
        "User-Agent": "SREI-RealEstateApp/1.0 (contact@srei.sk)",
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      console.warn(`Geocoding failed: HTTP ${response.status}`);
      return null;
    }

    const data = await response.json();
    
    if (!data || data.length === 0) {
      // Try with just city
      if (district || street) {
        return geocodeAddress(city);
      }
      return null;
    }

    return {
      latitude: parseFloat(data[0].lat),
      longitude: parseFloat(data[0].lon),
      displayName: data[0].display_name,
    };
  } catch (error) {
    console.error("Geocoding error:", error);
    return null;
  }
}

/**
 * Geocode properties that don't have coordinates yet
 */
export async function geocodeProperties(limit: number = 20): Promise<{
  processed: number;
  geocoded: number;
  failed: number;
}> {
  // Get properties without coordinates
  const properties = await prisma.property.findMany({
    where: {
      status: "ACTIVE",
      OR: [
        { latitude: null },
        { longitude: null },
      ],
    },
    select: {
      id: true,
      city: true,
      district: true,
      address: true,
    },
    take: limit,
  });

  let geocoded = 0;
  let failed = 0;

  for (const prop of properties) {
    try {
      // Extract street from address if possible
      const addressParts = prop.address.split(",").map(s => s.trim());
      const street = addressParts.length > 2 ? addressParts[addressParts.length - 1] : undefined;

      const result = await geocodeAddress(prop.city, prop.district, street);

      if (result) {
        await prisma.property.update({
          where: { id: prop.id },
          data: {
            latitude: result.latitude,
            longitude: result.longitude,
          },
        });
        geocoded++;
        console.log(`📍 Geocoded: ${prop.city} → ${result.latitude}, ${result.longitude}`);
      } else {
        failed++;
      }

      // Rate limiting - 1 request per second for Nominatim
      await new Promise(resolve => setTimeout(resolve, 1100));

    } catch (error) {
      failed++;
      console.error(`Failed to geocode ${prop.id}:`, error);
    }
  }

  return {
    processed: properties.length,
    geocoded,
    failed,
  };
}

/**
 * Get city center coordinates (cached)
 */
const CITY_CENTERS: Record<string, { lat: number; lng: number }> = {
  "Bratislava": { lat: 48.1486, lng: 17.1077 },
  "Košice": { lat: 48.7164, lng: 21.2611 },
  "Prešov": { lat: 48.9984, lng: 21.2331 },
  "Žilina": { lat: 49.2231, lng: 18.7394 },
  "Banská Bystrica": { lat: 48.7395, lng: 19.1530 },
  "Nitra": { lat: 48.3069, lng: 18.0864 },
  "Trnava": { lat: 48.3774, lng: 17.5883 },
  "Trenčín": { lat: 48.8945, lng: 18.0444 },
  "Martin": { lat: 49.0636, lng: 18.9214 },
  "Poprad": { lat: 49.0600, lng: 20.2974 },
  "Prievidza": { lat: 48.7745, lng: 18.6247 },
  "Zvolen": { lat: 48.5762, lng: 19.1360 },
  "Považská Bystrica": { lat: 49.1214, lng: 18.4214 },
  "Michalovce": { lat: 48.7545, lng: 21.9191 },
  "Nové Zámky": { lat: 47.9858, lng: 18.1619 },
};

export function getCityCenter(city: string): { lat: number; lng: number } | null {
  // Try exact match first
  if (CITY_CENTERS[city]) {
    return CITY_CENTERS[city];
  }
  
  // Try case-insensitive match
  const normalizedCity = city.toLowerCase();
  for (const [name, coords] of Object.entries(CITY_CENTERS)) {
    if (name.toLowerCase() === normalizedCity) {
      return coords;
    }
  }
  
  return null;
}

/**
 * Get all properties with coordinates for map display
 */
export async function getPropertiesForMap(filters?: {
  city?: string;
  minPrice?: number;
  maxPrice?: number;
  listingType?: string;
}): Promise<{
  id: string;
  title: string;
  price: number;
  latitude: number;
  longitude: number;
  city: string;
  rooms: number | null;
  area_m2: number;
}[]> {
  const where: any = {
    status: "ACTIVE",
    latitude: { not: null },
    longitude: { not: null },
  };

  if (filters?.city) {
    where.city = { contains: filters.city, mode: "insensitive" };
  }
  if (filters?.minPrice) {
    where.price = { gte: filters.minPrice };
  }
  if (filters?.maxPrice) {
    where.price = { ...where.price, lte: filters.maxPrice };
  }
  if (filters?.listingType) {
    where.listing_type = filters.listingType;
  }

  const properties = await prisma.property.findMany({
    where,
    select: {
      id: true,
      title: true,
      price: true,
      latitude: true,
      longitude: true,
      city: true,
      rooms: true,
      area_m2: true,
    },
    take: 1000, // Limit for performance
  });

  return properties.filter(p => p.latitude && p.longitude) as any;
}
