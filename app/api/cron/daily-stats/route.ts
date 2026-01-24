/**
 * Daily Statistics Cron Job
 * Runs daily to collect and aggregate market statistics
 * 
 * Schedule: Daily at 11 PM (after all scraping is done)
 */

import { NextResponse } from "next/server";
import { 
  createDailyStats, 
  createPropertySnapshots,
  createMonthlyStats,
} from "@/lib/analytics/market-stats";

export async function GET() {
  const start = Date.now();
  const results: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
  };

  try {
    // 1. Create daily market statistics
    console.log("📊 Creating daily market statistics...");
    const dailyStats = await createDailyStats();
    results.dailyStats = {
      count: dailyStats.length,
      message: `Created ${dailyStats.length} daily stat records`,
    };

    // 2. Create property snapshots (only for changed properties)
    console.log("📸 Creating property snapshots...");
    const snapshots = await createPropertySnapshots();
    results.snapshots = snapshots;

    // 3. Create/update monthly stats (on last day of month or daily update)
    const today = new Date();
    const isEndOfMonth = today.getDate() === new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    
    if (isEndOfMonth) {
      console.log("📅 Creating monthly statistics...");
      const monthlyStats = await createMonthlyStats();
      results.monthlyStats = {
        count: monthlyStats.length,
        message: `Created ${monthlyStats.length} monthly stat records`,
      };
    }

    const duration = Date.now() - start;
    
    return NextResponse.json({
      success: true,
      duration: `${duration}ms`,
      results,
    });
  } catch (error) {
    console.error("Daily stats error:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      duration: `${Date.now() - start}ms`,
    }, { status: 500 });
  }
}

export const runtime = "nodejs";
export const maxDuration = 60;
