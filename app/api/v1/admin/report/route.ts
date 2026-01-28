/**
 * Investor Report API
 * Alpha, Hunter alerts, AI efficiency, referral, Live vs NBS. Admin-only.
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getDataComparison } from "@/lib/data-sources/realtime-stats";

const MS_30D = 30 * 24 * 60 * 60 * 1000;

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });
    if (user?.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const since = new Date(Date.now() - MS_30D);

    // --- Alpha opportunities today (Gap > 10% AND PriceDrop > 5%) ---
    const gapsWithDrop = await prisma.marketGap.findMany({
      where: { gap_percentage: { gte: 10 } },
      include: {
        property: {
          select: {
            id: true,
            price: true,
            priceHistory: { orderBy: { recorded_at: "asc" }, take: 20 },
          },
        },
      },
    });
    let alphaOpportunitiesToday = 0;
    for (const g of gapsWithDrop) {
      const ph = g.property.priceHistory;
      if (ph.length < 2) continue;
      const firstPrice = ph[0].price;
      const currentPrice = g.property.price;
      if (firstPrice <= 0) continue;
      const dropPct = ((firstPrice - currentPrice) / firstPrice) * 100;
      if (dropPct >= 5) alphaOpportunitiesToday++;
    }

    // --- Referral pending payout (sum Commission PENDING) ---
    const pending = await prisma.commission.aggregate({
      where: { status: "PENDING" },
      _sum: { amount: true },
    });
    const referralPendingPayout = pending._sum.amount ?? 0;

    // --- Live vs NBS (naše vs NBS priemer) ---
    let liveVsNbs: {
      ourAvgPricePerM2: number;
      nbsAvgPricePerM2: number;
      differencePercent: number;
      source: string;
      nbsPeriod: string;
    } | null = null;
    try {
      const comp = await getDataComparison();
      liveVsNbs = {
        ourAvgPricePerM2: comp.ourData.avg,
        nbsAvgPricePerM2: comp.nbsData.avg,
        differencePercent: comp.differencePercent,
        source: comp.ourData.source,
        nbsPeriod: comp.nbsData.period,
      };
    } catch {
      /* ignore */
    }

    // --- Alpha (Market vs Hunter) ---
    const [allProps, hunterProps, gaps] = await Promise.all([
      prisma.property.findMany({
        where: { createdAt: { gte: since } },
        select: { price: true, area_m2: true },
      }),
      prisma.property.findMany({
        where: {
          createdAt: { gte: since },
          marketGaps: {
            some: { gap_percentage: { gte: 10 } },
          },
        },
        select: { price: true, area_m2: true },
      }),
      prisma.marketGap.findMany({
        where: { detected_at: { gte: since } },
        include: { property: true },
      }),
    ]);

    const avgMarket = allProps.length ? allProps.reduce((s, p) => s + p.price, 0) / allProps.length : 0;
    const avgHunter = hunterProps.length
      ? hunterProps.reduce((s, p) => s + p.price, 0) / hunterProps.length
      : 0;
    const totalPotentialAlpha = gaps.reduce((s, g) => {
      const v = g.potential_profit ?? (g.street_avg_price * (g.property.area_m2 || 1) - g.property.price);
      return s + Math.max(0, v);
    }, 0);

    // --- Hunter alerts by day ---
    const logs = await prisma.dataFetchLog.findMany({
      where: {
        source: "apify-webhook",
        fetchedAt: { gte: since },
        hunterAlertsSent: { not: null },
      },
      select: { fetchedAt: true, hunterAlertsSent: true },
      orderBy: { fetchedAt: "asc" },
    });

    const byDay = new Map<string, number>();
    for (const l of logs) {
      const day = l.fetchedAt.toISOString().slice(0, 10);
      byDay.set(day, (byDay.get(day) ?? 0) + (l.hunterAlertsSent ?? 0));
    }
    const hunterAlertsDaily = Array.from(byDay.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // --- Discovery speed (approx: avg webhook run duration per property) ---
    const runLogs = await prisma.dataFetchLog.findMany({
      where: { source: "apify-webhook", fetchedAt: { gte: since }, recordsCount: { gt: 0 } },
      select: { duration_ms: true, recordsCount: true },
    });
    let avgDiscoveryMin: number | null = null;
    if (runLogs.length) {
      const totalMs = runLogs.reduce((s, r) => s + (r.duration_ms ?? 0), 0);
      const totalRecords = runLogs.reduce((s, r) => s + (r.recordsCount ?? 0), 0);
      if (totalRecords > 0) avgDiscoveryMin = Math.round((totalMs / 1000 / 60) * (1 / totalRecords) * 10) / 10;
    }

    // --- AI efficiency ---
    const [withAi, total] = await Promise.all([
      prisma.property.count({
        where: {
          createdAt: { gte: since },
          investmentSummary: { not: null },
        },
      }),
      prisma.property.count({ where: { createdAt: { gte: since } } }),
    ]);
    const aiEfficiencyPct = total > 0 ? Math.round((withAi / total) * 100) : 0;

    // --- Referral leaderboard ---
    const refs = await prisma.referralCode.findMany({
      orderBy: { referredCount: "desc" },
      take: 20,
    });
    const referralLeaderboard = refs.map((r) => ({
      code: r.code,
      partner: r.partnerName,
      referred: r.referredCount,
      converted: r.convertedCount,
      commission: r.paidCommission,
      commissionPct: r.commissionPct,
    }));

    return NextResponse.json({
      success: true,
      data: {
        alpha: {
          avgMarketPrice: Math.round(avgMarket),
          avgHunterPrice: Math.round(avgHunter),
          totalPotentialAlpha: Math.round(totalPotentialAlpha),
          hunterCount: hunterProps.length,
          marketCount: allProps.length,
          opportunitiesToday: alphaOpportunitiesToday,
        },
        hunter: {
          alertsDaily: hunterAlertsDaily,
          totalAlerts: hunterAlertsDaily.reduce((s, d) => s + d.count, 0),
          avgDiscoveryMin,
        },
        ai: {
          efficiencyPct: aiEfficiencyPct,
          withAi,
          total,
        },
        referral: {
          leaderboard: referralLeaderboard,
          pendingPayout: Math.round(referralPendingPayout * 100) / 100,
        },
        liveVsNbs,
      },
    });
  } catch (e) {
    console.error("[admin/report]", e);
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}
