import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { confirmMatch } from "@/lib/matching";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET - Získa detail match
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;

    const match = await prisma.propertyMatch.findUnique({
      where: { id },
      include: {
        primaryProperty: {
          include: {
            priceHistory: {
              orderBy: { recorded_at: "desc" },
              take: 5,
            },
          },
        },
        matchedProperty: {
          include: {
            priceHistory: {
              orderBy: { recorded_at: "desc" },
              take: 5,
            },
          },
        },
      },
    });

    if (!match) {
      return NextResponse.json(
        { success: false, error: "Match not found" },
        { status: 404 }
      );
    }

    const priceDifference = Math.abs(match.primaryProperty.price - match.matchedProperty.price);
    const cheaperProperty = match.primaryProperty.price < match.matchedProperty.price
      ? match.primaryProperty
      : match.matchedProperty;
    const moreExpensiveProperty = match.primaryProperty.price >= match.matchedProperty.price
      ? match.primaryProperty
      : match.matchedProperty;

    return NextResponse.json({
      success: true,
      data: {
        id: match.id,
        score: match.matchScore,
        reasons: JSON.parse(match.matchReason),
        isConfirmed: match.isConfirmed,
        confirmedBy: match.confirmedBy,
        createdAt: match.createdAt,
        comparison: {
          priceDifference,
          priceDifferencePercent: ((priceDifference / moreExpensiveProperty.price) * 100).toFixed(1),
          cheaperSource: cheaperProperty.source,
          savings: priceDifference,
        },
        properties: [
          {
            id: match.primaryProperty.id,
            title: match.primaryProperty.title,
            description: match.primaryProperty.description,
            price: match.primaryProperty.price,
            pricePerM2: match.primaryProperty.price_per_m2,
            areaM2: match.primaryProperty.area_m2,
            rooms: match.primaryProperty.rooms,
            floor: match.primaryProperty.floor,
            city: match.primaryProperty.city,
            district: match.primaryProperty.district,
            address: match.primaryProperty.address,
            condition: match.primaryProperty.condition,
            source: match.primaryProperty.source,
            sourceUrl: match.primaryProperty.source_url,
            listingType: match.primaryProperty.listing_type,
            daysOnMarket: match.primaryProperty.days_on_market,
            priceHistory: match.primaryProperty.priceHistory,
            isCheaper: match.primaryProperty.price <= match.matchedProperty.price,
          },
          {
            id: match.matchedProperty.id,
            title: match.matchedProperty.title,
            description: match.matchedProperty.description,
            price: match.matchedProperty.price,
            pricePerM2: match.matchedProperty.price_per_m2,
            areaM2: match.matchedProperty.area_m2,
            rooms: match.matchedProperty.rooms,
            floor: match.matchedProperty.floor,
            city: match.matchedProperty.city,
            district: match.matchedProperty.district,
            address: match.matchedProperty.address,
            condition: match.matchedProperty.condition,
            source: match.matchedProperty.source,
            sourceUrl: match.matchedProperty.source_url,
            listingType: match.matchedProperty.listing_type,
            daysOnMarket: match.matchedProperty.days_on_market,
            priceHistory: match.matchedProperty.priceHistory,
            isCheaper: match.matchedProperty.price <= match.primaryProperty.price,
          },
        ],
      },
    });
  } catch (error) {
    console.error("Error fetching match detail:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST - Potvrď alebo odmietni match
 */
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { action } = body; // "confirm" alebo "reject"

    if (!["confirm", "reject"].includes(action)) {
      return NextResponse.json(
        { success: false, error: "Invalid action. Use 'confirm' or 'reject'" },
        { status: 400 }
      );
    }

    const isConfirmed = action === "confirm";
    const updatedMatch = await confirmMatch(id, isConfirmed, session.user.id);

    return NextResponse.json({
      success: true,
      data: {
        id: updatedMatch.id,
        isConfirmed: updatedMatch.isConfirmed,
        confirmedBy: updatedMatch.confirmedBy,
        message: isConfirmed ? "Match confirmed" : "Match rejected",
      },
    });
  } catch (error) {
    console.error("Error confirming match:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Odstráň match
 */
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;

    await prisma.propertyMatch.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      data: { message: "Match deleted" },
    });
  } catch (error) {
    console.error("Error deleting match:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
