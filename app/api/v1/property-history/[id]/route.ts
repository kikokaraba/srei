import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET - Získanie histórie nehnuteľnosti (snapshots, cenová história, zmeny)
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id: propertyId } = await params;

    // Načítaj nehnuteľnosť s históriou
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      include: {
        // Cenová história
        priceHistory: {
          orderBy: { recorded_at: "desc" },
        },
        // Snímky (fotky, popis, cena v čase)
        snapshots: {
          orderBy: { snapshotAt: "desc" },
        },
        // Investičné metriky
        investmentMetrics: true,
        // Matching s inými nehnuteľnosťami
        primaryMatches: {
          include: {
            matchedProperty: {
              select: {
                id: true,
                title: true,
                address: true,
                price: true,
                area_m2: true,
                source_url: true,
                createdAt: true,
              },
            },
          },
        },
        matchedBy: {
          include: {
            primaryProperty: {
              select: {
                id: true,
                title: true,
                address: true,
                price: true,
                area_m2: true,
                source_url: true,
                createdAt: true,
              },
            },
          },
        },
      },
    });

    if (!property) {
      return NextResponse.json(
        { success: false, error: "Property not found" },
        { status: 404 }
      );
    }

    // Spočítaj zmeny
    const priceChanges = property.priceHistory.length > 1
      ? property.priceHistory.slice(0, -1).map((ph, idx) => ({
          from: property.priceHistory[idx + 1].price,
          to: ph.price,
          change: ph.price - property.priceHistory[idx + 1].price,
          changePercent: ((ph.price - property.priceHistory[idx + 1].price) / property.priceHistory[idx + 1].price) * 100,
          date: ph.recorded_at,
        }))
      : [];

    // Kombinuj matches
    const allMatches = [
      ...property.primaryMatches.map((m) => ({
        matchId: m.id,
        property: m.matchedProperty,
        matchScore: m.matchScore,
        matchReason: JSON.parse(m.matchReason),
        isConfirmed: m.isConfirmed,
      })),
      ...property.matchedBy.map((m) => ({
        matchId: m.id,
        property: m.primaryProperty,
        matchScore: m.matchScore,
        matchReason: JSON.parse(m.matchReason),
        isConfirmed: m.isConfirmed,
      })),
    ];

    // Timeline - kombinácia všetkých udalostí
    const timeline = [
      // Prvé zverejnenie
      {
        type: "listed" as const,
        date: property.first_listed_at || property.createdAt,
        data: { price: property.priceHistory[property.priceHistory.length - 1]?.price || property.price },
      },
      // Cenové zmeny
      ...priceChanges.map((pc) => ({
        type: "price_change" as const,
        date: pc.date,
        data: pc,
      })),
      // Zmeny snímok
      ...property.snapshots
        .filter((s) => s.photosChanged || s.descriptionChanged || s.priceChange)
        .map((s) => ({
          type: "update" as const,
          date: s.snapshotAt,
          data: {
            photosChanged: s.photosChanged,
            descriptionChanged: s.descriptionChanged,
            priceChange: s.priceChange,
            priceChangePercent: s.priceChangePercent,
          },
        })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return NextResponse.json({
      success: true,
      data: {
        property: {
          id: property.id,
          title: property.title,
          address: property.address,
          city: property.city,
          district: property.district,
          price: property.price,
          area_m2: property.area_m2,
          price_per_m2: property.price_per_m2,
          rooms: property.rooms,
          condition: property.condition,
          source_url: property.source_url,
          first_listed_at: property.first_listed_at,
          days_on_market: property.days_on_market,
          investmentMetrics: property.investmentMetrics,
        },
        priceHistory: property.priceHistory,
        snapshots: property.snapshots,
        priceChanges,
        matches: allMatches,
        timeline,
        stats: {
          daysOnMarket: property.days_on_market,
          totalPriceChanges: priceChanges.length,
          totalPriceChange: priceChanges.reduce((sum, pc) => sum + pc.change, 0),
          matchesCount: allMatches.length,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching property history:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
