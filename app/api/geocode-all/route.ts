/**
 * Geocode All Properties - One-time bulk geocoding
 * 
 * Geocodes properties without coordinates using city centers as fallback
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// City center coordinates for Slovakia
const CITY_CENTERS: Record<string, { lat: number; lng: number }> = {
  "bratislava": { lat: 48.1486, lng: 17.1077 },
  "kosice": { lat: 48.7164, lng: 21.2611 },
  "presov": { lat: 48.9984, lng: 21.2331 },
  "zilina": { lat: 49.2231, lng: 18.7394 },
  "banska bystrica": { lat: 48.7395, lng: 19.1530 },
  "nitra": { lat: 48.3069, lng: 18.0864 },
  "trnava": { lat: 48.3774, lng: 17.5883 },
  "trencin": { lat: 48.8945, lng: 18.0444 },
  "martin": { lat: 49.0636, lng: 18.9214 },
  "poprad": { lat: 49.0600, lng: 20.2974 },
  "prievidza": { lat: 48.7745, lng: 18.6247 },
  "zvolen": { lat: 48.5762, lng: 19.1360 },
  "povazska bystrica": { lat: 49.1214, lng: 18.4214 },
  "michalovce": { lat: 48.7545, lng: 21.9191 },
  "nove zamky": { lat: 47.9858, lng: 18.1619 },
  "komarno": { lat: 47.7631, lng: 18.1285 },
  "levice": { lat: 48.2162, lng: 18.6067 },
  "lucenec": { lat: 48.3318, lng: 19.6675 },
  "rimavska sobota": { lat: 48.3821, lng: 20.0217 },
  "ruzomberok": { lat: 49.0765, lng: 19.3071 },
  "liptovsky mikulas": { lat: 49.0833, lng: 19.6219 },
  "dolny kubin": { lat: 49.2117, lng: 19.2981 },
  "cadca": { lat: 49.4379, lng: 18.7919 },
  "humenne": { lat: 48.9294, lng: 21.9067 },
  "bardejov": { lat: 49.2926, lng: 21.2763 },
  "vranov nad toplou": { lat: 48.8816, lng: 21.6847 },
  "snina": { lat: 48.9869, lng: 22.1516 },
  "kezmarok": { lat: 49.1354, lng: 20.4287 },
  "stara lubovna": { lat: 49.3021, lng: 20.6845 },
  "spisska nova ves": { lat: 48.9459, lng: 20.5616 },
  "trebisov": { lat: 48.6204, lng: 21.7168 },
  "roznava": { lat: 48.6599, lng: 20.5281 },
  "galanta": { lat: 48.1900, lng: 17.7272 },
  "dunajska streda": { lat: 47.9935, lng: 17.6189 },
  "piestany": { lat: 48.5941, lng: 17.8325 },
  "hlohovec": { lat: 48.4259, lng: 17.8022 },
  "skalica": { lat: 48.8439, lng: 17.2263 },
  "senica": { lat: 48.6810, lng: 17.3661 },
  "pezinok": { lat: 48.2911, lng: 17.2696 },
  "senec": { lat: 48.2195, lng: 17.3987 },
  "malacky": { lat: 48.4368, lng: 17.0159 },
  "partizanske": { lat: 48.6283, lng: 18.3789 },
  "dubnica nad vahom": { lat: 48.9612, lng: 18.1737 },
  "nove mesto nad vahom": { lat: 48.7575, lng: 17.8301 },
  "brezno": { lat: 48.8059, lng: 19.6407 },
  "ziar nad hronom": { lat: 48.5890, lng: 18.8544 },
  "velky krtis": { lat: 48.2096, lng: 19.3486 },
  "sala": { lat: 48.1510, lng: 17.8775 },
  "sturovo": { lat: 47.7976, lng: 18.7183 },
  "namestovo": { lat: 49.4082, lng: 19.4794 },
  "svidnik": { lat: 49.3054, lng: 21.5676 },
  "sobrance": { lat: 48.7453, lng: 22.1803 },
};

function normalizeCity(city: string): string {
  return city
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function getCityCoordinates(city: string): { lat: number; lng: number } | null {
  const normalized = normalizeCity(city);
  
  // Direct match
  if (CITY_CENTERS[normalized]) {
    return CITY_CENTERS[normalized];
  }
  
  // Partial match (for city parts like "Kosice - Stare Mesto")
  for (const [key, coords] of Object.entries(CITY_CENTERS)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return coords;
    }
  }
  
  // Default to center of Slovakia
  return { lat: 48.6690, lng: 19.6990 };
}

export async function GET() {
  try {
    // Get all properties without coordinates
    const properties = await prisma.property.findMany({
      where: {
        OR: [
          { latitude: null },
          { longitude: null },
        ],
      },
      select: {
        id: true,
        city: true,
      },
    });

    console.log(`📍 Geocoding ${properties.length} properties...`);

    let updated = 0;
    let failed = 0;

    for (const prop of properties) {
      const coords = getCityCoordinates(prop.city);
      
      if (coords) {
        // Add small random offset to prevent all markers overlapping
        const offset = () => (Math.random() - 0.5) * 0.02; // ~1km variance
        
        await prisma.property.update({
          where: { id: prop.id },
          data: {
            latitude: coords.lat + offset(),
            longitude: coords.lng + offset(),
          },
        });
        updated++;
      } else {
        failed++;
      }
    }

    // Get stats
    const withCoords = await prisma.property.count({
      where: {
        latitude: { not: null },
        longitude: { not: null },
      },
    });

    const total = await prisma.property.count();

    return NextResponse.json({
      success: true,
      processed: properties.length,
      updated,
      failed,
      stats: {
        withCoordinates: withCoords,
        total,
        percentage: Math.round((withCoords / total) * 100),
      },
    });

  } catch (error) {
    console.error("Geocoding error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
