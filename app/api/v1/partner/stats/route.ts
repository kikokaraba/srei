/**
 * Partner dashboard – štatistiky a história provízií. Len PARTNER.
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const BASE_URL = process.env.NEXTAUTH_URL || "https://sria.sk";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const partner = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        role: true,
        partnerRef: true,
        iban: true,
      },
    });

    if (!partner || partner.role !== "PARTNER") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [activeReferrals, todayEarnings, totalPending, commissions] = await Promise.all([
      prisma.user.count({
        where: {
          referredByUserId: partner.id,
          subscription: {
            status: "ACTIVE",
          },
        },
      }),
      prisma.commission.aggregate({
        where: {
          partnerId: partner.id,
          createdAt: { gte: todayStart },
        },
        _sum: { amount: true },
      }),
      prisma.commission.aggregate({
        where: {
          partnerId: partner.id,
          status: "PENDING",
        },
        _sum: { amount: true },
      }),
      prisma.commission.findMany({
        where: { partnerId: partner.id },
        orderBy: { createdAt: "desc" },
        take: 50,
        include: {
          user: { select: { email: true, name: true } },
        },
      }),
    ]);

    const referralLink = partner.partnerRef
      ? `${BASE_URL}/auth/signup?ref=${encodeURIComponent(partner.partnerRef)}`
      : null;

    return NextResponse.json({
      success: true,
      data: {
        referralLink,
        partnerRef: partner.partnerRef,
        iban: partner.iban ?? null,
        activeReferrals,
        todayEarnings: todayEarnings._sum.amount ?? 0,
        totalPending: totalPending._sum.amount ?? 0,
        history: commissions.map((c) => ({
          id: c.id,
          amount: c.amount,
          status: c.status,
          createdAt: c.createdAt.toISOString(),
          payer: { email: c.user.email, name: c.user.name },
        })),
      },
    });
  } catch (e) {
    console.error("[partner/stats]", e);
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}
