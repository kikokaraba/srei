/**
 * Debug endpoint - zobrazí surové dáta z DB
 * 
 * ADMIN ONLY - requires admin authentication
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  // Admin auth check
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden - Admin only" }, { status: 403 });
  }
  try {
    // Posledných 20 nehnuteľností
    const properties = await prisma.property.findMany({
      take: 20,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        price: true,
        area_m2: true,
        price_per_m2: true,
        city: true,
        district: true,
        source: true,
        listing_type: true,
        source_url: true,
        createdAt: true,
      },
    });

    // Agregácie
    const stats = await prisma.property.groupBy({
      by: ["price"],
      _count: true,
      orderBy: { _count: { price: "desc" } },
      take: 10,
    });

    const uniquePrices = await prisma.property.findMany({
      distinct: ["price"],
      select: { price: true },
      take: 50,
    });

    return NextResponse.json({
      success: true,
      totalProperties: await prisma.property.count(),
      last20: properties,
      mostCommonPrices: stats,
      uniquePricesCount: uniquePrices.length,
      uniquePrices: uniquePrices.map(p => p.price),
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown",
    }, { status: 500 });
  }
}

export const runtime = "nodejs";
