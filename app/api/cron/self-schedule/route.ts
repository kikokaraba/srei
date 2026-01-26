/**
 * Self-Scheduling Cron Trigger
 * 
 * This endpoint triggers itself after a delay, creating a continuous loop.
 * Works on Railway without external cron services.
 * 
 * How it works:
 * 1. Execute the scraping job
 * 2. Schedule next run by calling itself after delay
 * 3. Repeat forever
 * 
 * To start the loop, call this endpoint once manually.
 * To stop, set CRON_ENABLED=false in environment.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const SCRAPE_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

export const maxDuration = 300;

export async function GET(request: NextRequest) {
  const enabled = process.env.CRON_ENABLED !== "false";
  
  if (!enabled) {
    return NextResponse.json({ 
      success: false, 
      message: "Cron is disabled. Set CRON_ENABLED=true to enable." 
    });
  }

  console.log("🔄 Self-scheduling cron triggered");

  try {
    // Get base URL
    const baseUrl = process.env.RAILWAY_URL || 
                    process.env.NEXTAUTH_URL || 
                    `https://${request.headers.get("host")}`;

    // Execute scraping
    console.log("📦 Running scrape-paginated...");
    const scrapeResponse = await fetch(`${baseUrl}/api/cron/scrape-paginated`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    
    const scrapeResult = await scrapeResponse.json();
    console.log("✅ Scrape result:", scrapeResult.results || scrapeResult);

    // Log this run
    await prisma.dataFetchLog.create({
      data: {
        source: "self-scheduler",
        status: "success",
        recordsCount: scrapeResult.results?.newProperties || 0,
        duration_ms: scrapeResult.duration_ms || 0,
      },
    });

    // Schedule next run using fire-and-forget fetch
    // This creates a continuous loop
    const nextRunTime = new Date(Date.now() + SCRAPE_INTERVAL_MS);
    console.log(`⏰ Next run scheduled for: ${nextRunTime.toISOString()}`);

    // Fire and forget - don't await
    setTimeout(async () => {
      try {
        await fetch(`${baseUrl}/api/cron/self-schedule`, {
          method: "GET",
        });
      } catch (e) {
        console.error("Failed to schedule next run:", e);
      }
    }, SCRAPE_INTERVAL_MS);

    return NextResponse.json({
      success: true,
      message: "Scrape completed, next run scheduled",
      scrapeResult: scrapeResult.results || scrapeResult,
      nextRun: nextRunTime.toISOString(),
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("❌ Self-scheduler error:", message);

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
