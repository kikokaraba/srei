/**
 * AI Alerts API
 * GET - list unread alerts for user
 * PATCH - mark alerts as read
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const limit = Math.min(50, parseInt(request.nextUrl.searchParams.get("limit") || "20", 10) || 20);
  const unreadOnly = request.nextUrl.searchParams.get("unreadOnly") !== "false";

  try {
    const where: { userId: string; readAt?: { equals: null } } = {
      userId: session.user.id,
    };
    if (unreadOnly) {
      where.readAt = { equals: null };
    }

    const alerts = await prisma.aIAlert.findMany({
      where,
      include: {
        property: {
          select: {
            id: true,
            title: true,
            price: true,
            price_per_m2: true,
            city: true,
            district: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    const unreadCount = await prisma.aIAlert.count({
      where: { userId: session.user.id, readAt: null },
    });

    return NextResponse.json({
      success: true,
      data: {
        alerts: alerts.map((a) => ({
          id: a.id,
          type: a.type,
          propertyId: a.propertyId,
          metadata: JSON.parse(a.metadata || "{}"),
          readAt: a.readAt,
          createdAt: a.createdAt,
          property: a.property,
        })),
        unreadCount,
      },
    });
  } catch (error) {
    console.error("AI Alerts GET error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { alertIds, markAllRead } = body;

    if (markAllRead) {
      await prisma.aIAlert.updateMany({
        where: { userId: session.user.id, readAt: null },
        data: { readAt: new Date() },
      });
      return NextResponse.json({ success: true, message: "All alerts marked as read" });
    }

    if (Array.isArray(alertIds) && alertIds.length > 0) {
      await prisma.aIAlert.updateMany({
        where: {
          id: { in: alertIds },
          userId: session.user.id,
        },
        data: { readAt: new Date() },
      });
      return NextResponse.json({ success: true, message: "Alerts marked as read" });
    }

    return NextResponse.json({ success: false, error: "No alerts to mark" }, { status: 400 });
  } catch (error) {
    console.error("AI Alerts PATCH error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
