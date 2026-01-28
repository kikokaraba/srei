/**
 * Scrape Status - Check current progress of paginated scraper
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // Get progress
    const progress = await prisma.scrapeProgress.findUnique({
      where: { source: "NEHNUTELNOSTI" },
    });

    // Get property counts
    const totalProperties = await prisma.property.count();
    const activeProperties = await prisma.property.count({
      where: { status: "ACTIVE" },
    });
    const todayNew = await prisma.property.count({
      where: {
        createdAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      },
    });

    // Get recent logs
    const recentLogs = await prisma.dataFetchLog.findMany({
      where: { source: "paginated-scraper" },
      orderBy: { fetchedAt: "desc" },
      take: 5,
    });

    // Calculate ETA (byty-only: predaj + prenajom)
    let eta = null;
    if (progress && !progress.isComplete) {
      const categories = ["byty-predaj", "byty-prenajom"];
      const categoryIndex = categories.indexOf(progress.category);
      const pagesPerCategory = progress.totalPages / Math.max(1, categories.length);
      const totalPagesRemaining = 
        Math.max(0, pagesPerCategory - progress.currentPage) + 
        Math.max(0, (categories.length - 1 - categoryIndex)) * pagesPerCategory;
      
      const runsRemaining = Math.ceil(totalPagesRemaining / 20);
      const minutesRemaining = runsRemaining * 10;
      
      eta = {
        runsRemaining,
        minutesRemaining,
        hoursRemaining: (minutesRemaining / 60).toFixed(1),
      };
    }

    return NextResponse.json({
      success: true,
      progress: progress ? {
        category: progress.category,
        currentPage: progress.currentPage,
        totalPages: progress.totalPages,
        percentComplete: progress.isComplete ? 100 : 
          Math.round((progress.currentPage / progress.totalPages) * 100),
        totalScraped: progress.totalScraped,
        totalNew: progress.totalNew,
        totalUpdated: progress.totalUpdated,
        totalErrors: progress.totalErrors,
        isComplete: progress.isComplete,
        cycleCount: progress.cycleCount,
        lastRunAt: progress.lastRunAt,
        startedAt: progress.startedAt,
        completedAt: progress.completedAt,
      } : null,
      database: {
        totalProperties,
        activeProperties,
        newToday: todayNew,
      },
      eta,
      recentRuns: recentLogs.map(log => ({
        status: log.status,
        recordsCount: log.recordsCount,
        duration_ms: log.duration_ms,
        fetchedAt: log.fetchedAt,
      })),
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
