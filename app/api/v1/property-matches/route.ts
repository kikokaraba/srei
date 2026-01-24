import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  findMatchCandidates,
  getPropertyMatches,
  generateAndSaveFingerprint,
  runMatchingForNewProperties,
} from "@/lib/matching";

/**
 * GET - Získa zoznam všetkých matches alebo matches pre konkrétnu nehnuteľnosť
 */
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get("propertyId");
    const minScore = parseInt(searchParams.get("minScore") || "70", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const skip = (page - 1) * limit;

    // Ak je zadané propertyId, vráť matches pre konkrétnu nehnuteľnosť
    if (propertyId) {
      try {
        const result = await getPropertyMatches(propertyId);
        return NextResponse.json({
          success: true,
          data: result,
        });
      } catch (error) {
        return NextResponse.json(
          { success: false, error: "Property not found" },
          { status: 404 }
        );
      }
    }

    // Inak vráť zoznam všetkých matches
    const totalCount = await prisma.propertyMatch.count({
      where: {
        matchScore: { gte: minScore },
      },
    });

    const matches = await prisma.propertyMatch.findMany({
      where: {
        matchScore: { gte: minScore },
      },
      include: {
        primaryProperty: {
          include: {
            fingerprint: true,
          },
        },
        matchedProperty: {
          include: {
            fingerprint: true,
          },
        },
      },
      orderBy: {
        matchScore: "desc",
      },
      skip,
      take: limit,
    });

    // Formátuj výsledky
    const formattedMatches = matches.map((match) => ({
      id: match.id,
      score: match.matchScore,
      isConfirmed: match.isConfirmed,
      reasons: JSON.parse(match.matchReason),
      createdAt: match.createdAt,
      properties: [
        {
          id: match.primaryProperty.id,
          title: match.primaryProperty.title,
          price: match.primaryProperty.price,
          pricePerM2: match.primaryProperty.price_per_m2,
          areaM2: match.primaryProperty.area_m2,
          city: match.primaryProperty.city,
          district: match.primaryProperty.district,
          source: match.primaryProperty.source,
          sourceUrl: match.primaryProperty.source_url,
          listingType: match.primaryProperty.listing_type,
        },
        {
          id: match.matchedProperty.id,
          title: match.matchedProperty.title,
          price: match.matchedProperty.price,
          pricePerM2: match.matchedProperty.price_per_m2,
          areaM2: match.matchedProperty.area_m2,
          city: match.matchedProperty.city,
          district: match.matchedProperty.district,
          source: match.matchedProperty.source,
          sourceUrl: match.matchedProperty.source_url,
          listingType: match.matchedProperty.listing_type,
        },
      ],
      priceDifference: Math.abs(match.primaryProperty.price - match.matchedProperty.price),
      priceDifferencePercent: Math.abs(
        ((match.primaryProperty.price - match.matchedProperty.price) / 
          Math.min(match.primaryProperty.price, match.matchedProperty.price)) * 100
      ).toFixed(1),
      cheaperSource: match.primaryProperty.price < match.matchedProperty.price 
        ? match.primaryProperty.source 
        : match.matchedProperty.source,
    }));

    return NextResponse.json({
      success: true,
      data: formattedMatches,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasMore: page * limit < totalCount,
      },
    });
  } catch (error) {
    console.error("Error fetching property matches:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST - Nájdi matches pre nehnuteľnosť alebo spusti matching pre nové nehnuteľnosti
 */
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
    const { propertyId, runBatch, minScore = 70 } = body;

    // Batch matching pre nové nehnuteľnosti
    if (runBatch) {
      const result = await runMatchingForNewProperties(minScore);
      return NextResponse.json({
        success: true,
        data: {
          message: `Matching completed: ${result.matched} matches found from ${result.total} properties`,
          ...result,
        },
      });
    }

    // Matching pre konkrétnu nehnuteľnosť
    if (!propertyId) {
      return NextResponse.json(
        { success: false, error: "Property ID is required" },
        { status: 400 }
      );
    }

    // Načítaj nehnuteľnosť s fingerprint
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      include: { fingerprint: true },
    });

    if (!property) {
      return NextResponse.json(
        { success: false, error: "Property not found" },
        { status: 404 }
      );
    }

    // Vytvor fingerprint ak neexistuje
    if (!property.fingerprint) {
      await generateAndSaveFingerprint(property);
      // Znovu načítaj s fingerprint
      const updatedProperty = await prisma.property.findUnique({
        where: { id: propertyId },
        include: { fingerprint: true },
      });
      if (!updatedProperty) {
        return NextResponse.json(
          { success: false, error: "Failed to create fingerprint" },
          { status: 500 }
        );
      }
      Object.assign(property, updatedProperty);
    }

    // Nájdi matches
    const candidates = await findMatchCandidates(
      property as typeof property & { fingerprint: NonNullable<typeof property.fingerprint> },
      minScore
    );

    return NextResponse.json({
      success: true,
      data: {
        sourceProperty: {
          id: property.id,
          title: property.title,
          price: property.price,
          areaM2: property.area_m2,
          source: property.source,
        },
        matches: candidates.map((c) => ({
          propertyId: c.property.id,
          title: c.property.title,
          price: c.property.price,
          pricePerM2: c.property.price_per_m2,
          areaM2: c.property.area_m2,
          city: c.property.city,
          district: c.property.district,
          source: c.property.source,
          sourceUrl: c.property.source_url,
          score: c.score,
          reasons: c.reasons,
          priceDifference: Math.abs(property.price - c.property.price),
        })),
        totalMatches: candidates.length,
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
