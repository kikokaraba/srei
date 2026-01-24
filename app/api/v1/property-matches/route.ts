import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  normalizeAddress,
  getAreaRange,
  createFingerprintHash,
  calculateMatchScore,
} from "@/lib/property-matching";

// POST - Nájdi potenciálne matches pre nehnuteľnosť
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { propertyId, minScore = 50 } = body;

    if (!propertyId) {
      return NextResponse.json(
        { success: false, error: "Property ID is required" },
        { status: 400 }
      );
    }

    // Načítaj zdrojovú nehnuteľnosť
    const sourceProperty = await prisma.property.findUnique({
      where: { id: propertyId },
    });

    if (!sourceProperty) {
      return NextResponse.json(
        { success: false, error: "Property not found" },
        { status: 404 }
      );
    }

    // Vytvor/aktualizuj fingerprint
    const addressNormalized = normalizeAddress(sourceProperty.address);
    const cityDistrict = `${sourceProperty.city}-${sourceProperty.district}`;
    const areaRange = getAreaRange(sourceProperty.area_m2);
    const fingerprintHash = createFingerprintHash(
      addressNormalized,
      cityDistrict,
      areaRange,
      sourceProperty.rooms
    );

    await prisma.propertyFingerprint.upsert({
      where: { propertyId },
      update: {
        addressNormalized,
        cityDistrict,
        areaRange,
        fingerprintHash,
      },
      create: {
        propertyId,
        addressNormalized,
        cityDistrict,
        areaRange,
        roomsRange: sourceProperty.rooms?.toString() || null,
        fingerprintHash,
      },
    });

    // Nájdi potenciálne matches
    // Najprv podľa fingerprint hash (presná zhoda)
    const exactMatches = await prisma.propertyFingerprint.findMany({
      where: {
        fingerprintHash,
        propertyId: { not: propertyId },
      },
      include: {
        property: true,
      },
    });

    // Potom podľa mesta a okresu + podobnej plochy
    const similarProperties = await prisma.property.findMany({
      where: {
        id: { not: propertyId },
        city: sourceProperty.city,
        district: sourceProperty.district,
        area_m2: {
          gte: sourceProperty.area_m2 * 0.85,
          lte: sourceProperty.area_m2 * 1.15,
        },
      },
      take: 50,
    });

    // Spočítaj skóre pre všetky potenciálne matches
    const matches: Array<{
      propertyId: string;
      property: typeof sourceProperty;
      score: number;
      reasons: string[];
    }> = [];

    // Presné matches
    for (const match of exactMatches) {
      const { score, reasons } = calculateMatchScore(
        sourceProperty,
        match.property
      );
      if (score >= minScore) {
        matches.push({
          propertyId: match.propertyId,
          property: match.property,
          score,
          reasons,
        });
      }
    }

    // Podobné nehnuteľnosti
    for (const property of similarProperties) {
      // Preskoč, ak už je v matches
      if (matches.some((m) => m.propertyId === property.id)) continue;

      const { score, reasons } = calculateMatchScore(sourceProperty, property);
      if (score >= minScore) {
        matches.push({
          propertyId: property.id,
          property,
          score,
          reasons,
        });
      }
    }

    // Zoraď podľa skóre
    matches.sort((a, b) => b.score - a.score);

    // Ulož matches do databázy
    for (const match of matches) {
      // Skontroluj, či už existuje
      const existing = await prisma.propertyMatch.findFirst({
        where: {
          OR: [
            { primaryPropertyId: propertyId, matchedPropertyId: match.propertyId },
            { primaryPropertyId: match.propertyId, matchedPropertyId: propertyId },
          ],
        },
      });

      if (!existing) {
        await prisma.propertyMatch.create({
          data: {
            primaryPropertyId: propertyId,
            matchedPropertyId: match.propertyId,
            matchScore: match.score,
            matchReason: JSON.stringify(match.reasons),
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        sourceProperty: {
          id: sourceProperty.id,
          title: sourceProperty.title,
          address: sourceProperty.address,
        },
        matches: matches.map((m) => ({
          propertyId: m.propertyId,
          title: m.property.title,
          address: m.property.address,
          price: m.property.price,
          area_m2: m.property.area_m2,
          source_url: m.property.source_url,
          score: m.score,
          reasons: m.reasons,
        })),
        totalMatches: matches.length,
      },
    });
  } catch (error) {
    console.error("Error finding property matches:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
