import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const property = await prisma.property.findUnique({
      where: { id },
      include: {
        investmentMetrics: true,
        priceHistory: {
          orderBy: { recorded_at: "desc" },
          take: 10,
        },
      },
    });

    if (!property) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: property,
    });
  } catch (error) {
    console.error("Error fetching property:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
