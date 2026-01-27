import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    // Celkový počet nehnuteľností
    const totalProperties = await prisma.property.count();

    // Aktívne nehnuteľnosti
    const activeProperties = await prisma.property.count({
      where: { status: "ACTIVE" }
    });

    // Nové dnes
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const newToday = await prisma.property.count({
      where: {
        createdAt: { gte: today }
      }
    });

    // Nové tento týždeň
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const newThisWeek = await prisma.property.count({
      where: {
        createdAt: { gte: weekAgo }
      }
    });

    // Podľa mesta
    const byCity = await prisma.property.groupBy({
      by: ["city"],
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 20
    });

    // Podľa zdroja
    const bySource = await prisma.property.groupBy({
      by: ["source"],
      _count: { id: true },
      orderBy: { _count: { id: "desc" } }
    });

    return NextResponse.json({
      success: true,
      data: {
        totalProperties,
        activeProperties,
        newToday,
        newThisWeek,
        byCity: byCity.map(item => ({
          city: item.city,
          count: item._count.id
        })),
        bySource: bySource.map(item => ({
          source: item.source,
          count: item._count.id
        }))
      }
    });

  } catch (error) {
    console.error("Error fetching scraping stats:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}
