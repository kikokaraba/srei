import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SlovakCity } from "@/generated/prisma/client";

export async function GET(request: Request) {
  try {
    // V development móde povolíme prístup aj bez auth
    if (process.env.NODE_ENV === "development") {
      console.warn("Development mode: skipping auth check");
    } else {
      const session = await auth();
      if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get("propertyId");
    const city = searchParams.get("city");

    if (propertyId) {
      // Získame urban development projekty v blízkosti nehnuteľnosti
      const property = await prisma.property.findUnique({
        where: { id: propertyId },
        include: {
          propertyImpacts: {
            include: {
              urbanDevelopment: true,
            },
          },
        },
      });

      if (!property) {
        return NextResponse.json({ error: "Property not found" }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        data: {
          propertyId: property.id,
          impacts: property.propertyImpacts.map((impact) => ({
            id: impact.id,
            distance: impact.distance_meters,
            estimatedAppreciation: impact.estimated_appreciation,
            development: {
              name: impact.urbanDevelopment.name,
              type: impact.urbanDevelopment.type,
              status: impact.urbanDevelopment.status,
              plannedCompletion: impact.urbanDevelopment.planned_completion,
              expectedImpact: impact.urbanDevelopment.expected_impact,
            },
          })),
        },
      });
    }

    if (city) {
      // Získame všetky urban development projekty v meste
      const developments = await prisma.urbanDevelopment.findMany({
        where: {
          city: city as SlovakCity,
        },
        include: {
          _count: {
            select: { propertyImpacts: true },
          },
        },
        orderBy: {
          planned_completion: "asc",
        },
      });

      return NextResponse.json({
        success: true,
        data: developments,
        count: developments.length,
      });
    }

    // Všetky projekty
    const developments = await prisma.urbanDevelopment.findMany({
      include: {
        _count: {
          select: { propertyImpacts: true },
        },
      },
      orderBy: {
        planned_completion: "asc",
      },
      take: 100,
    });

    return NextResponse.json({
      success: true,
      data: developments,
      count: developments.length,
    });
  } catch (error) {
    console.error("Urban development error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
