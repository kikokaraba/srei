import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (user?.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    // Get stats
    const [
      totalUsers,
      totalProperties,
      totalSavedProperties,
      usersByRole,
      propertiesByCity,
      recentUsers,
      activeUsers,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.property.count(),
      prisma.savedProperty.count(),
      prisma.user.groupBy({
        by: ["role"],
        _count: true,
      }),
      prisma.property.groupBy({
        by: ["city"],
        _count: true,
      }),
      prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
          _count: {
            select: {
              savedProperties: true,
            },
          },
        },
      }),
      // Users active in last 7 days (with preferences or saved properties)
      prisma.user.count({
        where: {
          OR: [
            { preferences: { updatedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } },
            { savedProperties: { some: { savedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } } },
          ],
        },
      }),
    ]);

    // Calculate growth (users created in last 30 days)
    const newUsersLast30Days = await prisma.user.count({
      where: {
        createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        overview: {
          totalUsers,
          totalProperties,
          totalSavedProperties,
          activeUsers,
          newUsersLast30Days,
        },
        usersByRole: usersByRole.map((r) => ({
          role: r.role,
          count: r._count,
        })),
        propertiesByCity: propertiesByCity.map((c) => ({
          city: c.city,
          count: c._count,
        })),
        recentUsers,
      },
    });
  } catch (error) {
    console.error("Error fetching admin stats:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
