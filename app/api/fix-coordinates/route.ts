// Fix missing coordinates - assign city center coordinates
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Slovak city coordinates
const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  "BRATISLAVA": { lat: 48.1486, lng: 17.1077 },
  "KOSICE": { lat: 48.7164, lng: 21.2611 },
  "PRESOV": { lat: 48.9986, lng: 21.2391 },
  "ZILINA": { lat: 49.2231, lng: 18.7394 },
  "BANSKA_BYSTRICA": { lat: 48.7364, lng: 19.1458 },
  "TRNAVA": { lat: 48.3774, lng: 17.5883 },
  "TRENCIN": { lat: 48.8945, lng: 18.0444 },
  "NITRA": { lat: 48.3061, lng: 18.0833 },
  "MARTIN": { lat: 49.0636, lng: 18.9214 },
  "POPRAD": { lat: 49.0512, lng: 20.2943 },
  "PIESTANY": { lat: 48.7947, lng: 17.8382 },
  "ZVOLEN": { lat: 48.5744, lng: 19.1236 },
  "KOMARNO": { lat: 47.7631, lng: 18.1203 },
  "LUCENEC": { lat: 48.3306, lng: 19.6672 },
  "NOVE_ZAMKY": { lat: 47.9858, lng: 18.1619 },
};

export async function GET() {
  try {
    // Get properties without coordinates
    const propertiesWithoutCoords = await prisma.property.findMany({
      where: {
        OR: [
          { latitude: null },
          { longitude: null },
        ],
      },
      select: {
        id: true,
        city: true,
        title: true,
      },
    });

    let updated = 0;
    let skipped = 0;

    for (const property of propertiesWithoutCoords) {
      const cityKey = property.city?.toUpperCase().replace(/\s+/g, "_");
      const coords = cityKey ? CITY_COORDS[cityKey] : null;

      if (coords) {
        // Add small random offset so markers don't overlap exactly
        const offset = () => (Math.random() - 0.5) * 0.02; // ~1km radius
        
        await prisma.property.update({
          where: { id: property.id },
          data: {
            latitude: coords.lat + offset(),
            longitude: coords.lng + offset(),
          },
        });
        updated++;
      } else {
        skipped++;
        console.log(`Unknown city: ${property.city}`);
      }
    }

    return NextResponse.json({
      ok: true,
      totalWithoutCoords: propertiesWithoutCoords.length,
      updated,
      skipped,
      message: `Updated ${updated} properties with city-center coordinates`,
    });

  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : "Unknown",
    }, { status: 500 });
  }
}

export const runtime = "nodejs";
export const maxDuration = 30;
