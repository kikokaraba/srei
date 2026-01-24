// Database stats endpoint
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const [
      propertyCount,
      hotDeals,
      withCoords,
      byCityRaw,
    ] = await Promise.all([
      prisma.property.count(),
      prisma.property.count({ where: { is_distressed: true } }),
      prisma.property.count({ where: { latitude: { not: null } } }),
      prisma.property.groupBy({
        by: ['city'],
        _count: true,
        orderBy: { _count: { city: 'desc' } },
        take: 10,
      }),
    ]);

    return NextResponse.json({ 
      ok: true,
      stats: {
        totalProperties: propertyCount,
        hotDeals,
        withCoordinates: withCoords,
        topCities: byCityRaw.map(c => ({ city: c.city, count: c._count })),
      }
    });
  } catch (error) {
    return NextResponse.json({ 
      ok: false, 
      error: error instanceof Error ? error.message : "Unknown",
    }, { status: 500 });
  }
}

export const runtime = "nodejs";
export const maxDuration = 15;
