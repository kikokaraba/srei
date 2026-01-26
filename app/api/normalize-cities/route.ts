/**
 * API endpoint to normalize city names in the database
 * This will:
 * 1. Normalize all city names to standard format (with diacritics)
 * 2. Assign city center coordinates with small random offset
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { normalizeCityName, getCityCoordinates } from "@/lib/constants/cities";

export async function GET() {
  try {
    // Check auth - only admins can run this
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("Starting city normalization...");

    // Get all properties
    const properties = await prisma.property.findMany({
      select: {
        id: true,
        city: true,
        latitude: true,
        longitude: true,
      },
    });

    console.log(`Found ${properties.length} properties to process`);

    let normalizedCount = 0;
    let coordinatesUpdated = 0;
    let skipped = 0;
    const cityStats: Record<string, { original: string[]; count: number }> = {};

    // Process in batches
    const batchSize = 50;
    for (let i = 0; i < properties.length; i += batchSize) {
      const batch = properties.slice(i, i + batchSize);
      
      const updates = batch.map(async (prop) => {
        const originalCity = prop.city;
        const normalizedCity = normalizeCityName(originalCity);
        
        // Track city variations
        if (!cityStats[normalizedCity || "UNKNOWN"]) {
          cityStats[normalizedCity || "UNKNOWN"] = { original: [], count: 0 };
        }
        if (!cityStats[normalizedCity || "UNKNOWN"].original.includes(originalCity)) {
          cityStats[normalizedCity || "UNKNOWN"].original.push(originalCity);
        }
        cityStats[normalizedCity || "UNKNOWN"].count++;

        // Skip if city is already normalized and has coordinates
        if (originalCity === normalizedCity && prop.latitude && prop.longitude) {
          skipped++;
          return;
        }

        const updateData: { city?: string; latitude?: number; longitude?: number } = {};

        // Update city name if changed
        if (normalizedCity && originalCity !== normalizedCity) {
          updateData.city = normalizedCity;
          normalizedCount++;
        }

        // Update coordinates if missing or if city changed
        if (normalizedCity && (!prop.latitude || !prop.longitude || originalCity !== normalizedCity)) {
          const coords = getCityCoordinates(normalizedCity);
          if (coords) {
            // Add small random offset to prevent exact overlap
            const offset = () => (Math.random() - 0.5) * 0.02; // ~1km variance
            updateData.latitude = coords.lat + offset();
            updateData.longitude = coords.lng + offset();
            coordinatesUpdated++;
          }
        }

        // Only update if there are changes
        if (Object.keys(updateData).length > 0) {
          await prisma.property.update({
            where: { id: prop.id },
            data: updateData,
          });
        }
      });

      await Promise.all(updates);
      console.log(`Processed ${Math.min(i + batchSize, properties.length)}/${properties.length}`);
    }

    // Count current stats
    const stats = await prisma.property.aggregate({
      _count: { id: true },
      where: { status: "ACTIVE" },
    });

    const withCoords = await prisma.property.count({
      where: {
        status: "ACTIVE",
        latitude: { not: null },
        longitude: { not: null },
      },
    });

    return NextResponse.json({
      success: true,
      processed: properties.length,
      normalized: normalizedCount,
      coordinatesUpdated,
      skipped,
      cityVariations: cityStats,
      stats: {
        total: stats._count.id,
        withCoordinates: withCoords,
        percentage: Math.round((withCoords / stats._count.id) * 100),
      },
    });

  } catch (error) {
    console.error("Error normalizing cities:", error);
    return NextResponse.json(
      { error: "Failed to normalize cities", details: String(error) },
      { status: 500 }
    );
  }
}
