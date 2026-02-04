/**
 * GET /api/v1/rent-stats
 *
 * Agregované štatistiky nájmov (listing_type = PRENAJOM) pre nájomný dashboard.
 * Query: city?, district?, rooms?, propertyType?, areaMin?, areaMax?
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const city = searchParams.get("city")?.trim() || undefined;
    const district = searchParams.get("district")?.trim() || undefined;
    const roomsParam = searchParams.get("rooms"); // 1,2,3,4
    const propertyType = searchParams.get("propertyType")?.trim() || undefined;
    const areaMin = searchParams.get("areaMin");
    const areaMax = searchParams.get("areaMax");

    const where: Prisma.PropertyWhereInput = {
      status: "ACTIVE",
      listing_type: "PRENAJOM",
      property_type: "BYT", // Aplikácia zobrazuje len byty
    };
    if (city) where.city = { equals: city, mode: "insensitive" };
    if (district) where.district = { contains: district, mode: "insensitive" };
    if (roomsParam !== null && roomsParam !== undefined && roomsParam !== "") {
      const r = parseInt(roomsParam, 10);
      if (!Number.isNaN(r) && r >= 0) where.rooms = r;
    }
    const numAreaMin = areaMin ? parseFloat(areaMin) : undefined;
    const numAreaMax = areaMax ? parseFloat(areaMax) : undefined;
    if (numAreaMin != null && !Number.isNaN(numAreaMin) || numAreaMax != null && !Number.isNaN(numAreaMax)) {
      where.area_m2 = {
        ...(numAreaMin != null && !Number.isNaN(numAreaMin) ? { gte: numAreaMin } : {}),
        ...(numAreaMax != null && !Number.isNaN(numAreaMax) ? { lte: numAreaMax } : {}),
      };
    }

    const [byCity, byRooms, summary, areaBuckets] = await Promise.all([
      prisma.property.groupBy({
        by: ["city"],
        where,
        _count: { id: true },
        _avg: { price: true, price_per_m2: true, area_m2: true },
        _min: { price: true },
        _max: { price: true },
      }),
      prisma.property.groupBy({
        by: ["rooms"],
        where: { ...where, rooms: { not: null } },
        _count: { id: true },
        _avg: { price: true, area_m2: true },
        _min: { price: true },
        _max: { price: true },
      }),
      prisma.property.aggregate({
        where,
        _count: { id: true },
        _avg: { price: true, price_per_m2: true, area_m2: true },
        _min: { price: true },
        _max: { price: true },
      }),
      Promise.all([
        prisma.property.aggregate({ where: { ...where, area_m2: { gte: 0, lt: 40 } }, _count: { id: true }, _avg: { price: true } }),
        prisma.property.aggregate({ where: { ...where, area_m2: { gte: 40, lt: 60 } }, _count: { id: true }, _avg: { price: true } }),
        prisma.property.aggregate({ where: { ...where, area_m2: { gte: 60, lt: 80 } }, _count: { id: true }, _avg: { price: true } }),
        prisma.property.aggregate({ where: { ...where, area_m2: { gte: 80, lt: 100 } }, _count: { id: true }, _avg: { price: true } }),
        prisma.property.aggregate({ where: { ...where, area_m2: { gte: 100 } }, _count: { id: true }, _avg: { price: true } }),
      ]),
    ]);

    const areaLabels = ["do 40 m²", "40–60 m²", "60–80 m²", "80–100 m²", "100+ m²"];
    const byAreaRange = areaBuckets.map((agg, i) => ({
      range: areaLabels[i],
      rangeKey: i,
      count: agg._count.id,
      avgRent: agg._count.id > 0 ? Math.round((agg._avg.price ?? 0)) : null,
    }));

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalListings: summary._count.id,
          avgRent: summary._count.id > 0 ? Math.round(summary._avg.price ?? 0) : null,
          avgRentPerM2: summary._count.id > 0 ? Math.round((summary._avg.price_per_m2 ?? 0) * 100) / 100 : null,
          avgArea: summary._count.id > 0 ? Math.round((summary._avg.area_m2 ?? 0) * 10) / 10 : null,
          minRent: summary._min.price ?? null,
          maxRent: summary._max.price ?? null,
        },
        byCity: byCity.map((c) => ({
          city: c.city,
          count: c._count.id,
          avgRent: Math.round(c._avg.price ?? 0),
          avgRentPerM2: c._avg.price_per_m2 != null ? Math.round(c._avg.price_per_m2 * 100) / 100 : null,
          avgArea: c._avg.area_m2 != null ? Math.round(c._avg.area_m2 * 10) / 10 : null,
          minRent: c._min.price ?? null,
          maxRent: c._max.price ?? null,
        })).sort((a, b) => b.count - a.count),
        byRooms: byRooms
          .filter((r) => r.rooms != null)
          .map((r) => ({
            rooms: r.rooms as number,
            count: r._count.id,
            avgRent: Math.round(r._avg.price ?? 0),
            avgArea: r._avg.area_m2 != null ? Math.round(r._avg.area_m2 * 10) / 10 : null,
            minRent: r._min.price ?? null,
            maxRent: r._max.price ?? null,
          }))
          .sort((a, b) => a.rooms - b.rooms),
        byAreaRange,
      },
      meta: {
        filters: { city, district, rooms: roomsParam ?? null, propertyType, areaMin: areaMin ?? null, areaMax: areaMax ?? null },
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Rent stats API error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
