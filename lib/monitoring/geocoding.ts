/**
 * Geocoding - Convert addresses to coordinates
 * 
 * Uses Nominatim (OpenStreetMap) - free, no API key needed
 * Rate limit: 1 request per second
 */

import { prisma } from "@/lib/prisma";
import { normalizeCityName, getCityCoordinates } from "@/lib/constants/cities";
import { Prisma, ListingType } from "@/generated/prisma/client";

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
 * Geocode address parts and return coordinates only.
 * For use in scripts (e.g. geocode-old-properties with AI enrichment).
 * Respect Nominatim rate limit: 1 req/s – caller must await delay between calls.
 */
export async function geocodeAddressToCoords(
  city: string,
  district?: string,
  street?: string
): Promise<{ latitude: number; longitude: number } | null> {
  const r = await geocodeAddress(city, district, street);
  return r ? { latitude: r.latitude, longitude: r.longitude } : null;
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
 * Get city center coordinates
 * Uses centralized city database from lib/constants/cities.ts
 */
export function getCityCenter(city: string): { lat: number; lng: number } | null {
  const normalized = normalizeCityName(city);
  if (!normalized) return null;
  return getCityCoordinates(normalized);
}

/**
 * Get all properties with coordinates for map display
 */
export async function getPropertiesForMap(filters?: {
  city?: string;
  minPrice?: number;
  maxPrice?: number;
  listingType?: ListingType;
  limit?: number;
}): Promise<{
  id: string;
  title: string;
  price: number;
  price_per_m2: number;
  latitude: number;
  longitude: number;
  city: string;
  rooms: number | null;
  area_m2: number;
  is_distressed: boolean;
}[]> {
  const where: Prisma.PropertyWhereInput = {
    status: "ACTIVE",
    latitude: { not: null },
    longitude: { not: null },
  };

  if (filters?.city) {
    where.city = { contains: filters.city, mode: "insensitive" };
  }
  if (filters?.minPrice != null || filters?.maxPrice != null) {
    where.price = {};
    if (filters?.minPrice != null) where.price.gte = filters.minPrice;
    if (filters?.maxPrice != null) where.price.lte = filters.maxPrice;
  }
  if (filters?.listingType) {
    where.listing_type = filters.listingType;
  }

  const take = Math.min(filters?.limit ?? 1000, 2000);

  const properties = await prisma.property.findMany({
    where,
    select: {
      id: true,
      title: true,
      price: true,
      price_per_m2: true,
      latitude: true,
      longitude: true,
      city: true,
      rooms: true,
      area_m2: true,
      is_distressed: true,
    },
    take,
  });

  return properties.filter((p): p is typeof p & { latitude: number; longitude: number } => 
    p.latitude != null && p.longitude != null
  );
}
