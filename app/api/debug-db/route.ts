/**
 * Debug endpoint - zistí stav databázy
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
    // Počet podľa zdroja
    const bazosCount = await prisma.property.count({
      where: { source: "BAZOS" },
    });
    
    const nehnutelnostiCount = await prisma.property.count({
      where: { source: "NEHNUTELNOSTI" },
    });
    
    const totalCount = await prisma.property.count();
    
    // Posledných 5 záznamov
    const recentProperties = await prisma.property.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        external_id: true,
        source: true,
        title: true,
        city: true,
        district: true,
        price: true,
        createdAt: true,
      },
    });
    
    // Posledné logy
    const recentLogs = await prisma.dataFetchLog.findMany({
      take: 10,
      orderBy: { fetchedAt: "desc" },
      select: {
        source: true,
        status: true,
        recordsCount: true,
        error: true,
        fetchedAt: true,
      },
    });

    return NextResponse.json({
      counts: {
        total: totalCount,
        bazos: bazosCount,
        nehnutelnosti: nehnutelnostiCount,
      },
      recentProperties,
      recentLogs,
    });

  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}
