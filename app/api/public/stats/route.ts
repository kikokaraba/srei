// Public stats endpoint for landing page
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 300;

export async function GET() {
  try {
    // Try to get real stats from database
    const [totalProperties, hotDeals, totalUsers] = await Promise.all([
      prisma.property.count(),
      prisma.property.count({ where: { is_distressed: true } }),
      prisma.user.count(),
    ]);

    // TODO: Calculate real yield when InvestmentMetrics table is populated
    // For now, use benchmark yield for Slovak real estate market
    const avgYield = 5.2;

    return NextResponse.json({
      success: true,
      stats: {
        totalProperties,
        hotDeals,
        totalUsers,
        avgYield: avgYield.toFixed(1),
      },
      live: totalProperties > 0,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    // Return empty stats if database fails
    console.error("Public stats error:", error);
    return NextResponse.json({
      success: true,
      stats: {
        totalProperties: 0,
        hotDeals: 0,
        totalUsers: 0,
        avgYield: "0",
      },
      live: false,
      updatedAt: new Date().toISOString(),
    });
  }
}
