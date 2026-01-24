// Cron Job: Send Telegram Notifications
// Runs periodically to send pending notifications

import { NextRequest, NextResponse } from "next/server";
import {
  notifyUnnotifiedMarketGaps,
  sendDailySummaryToAll,
} from "@/lib/telegram/notifications";

// Verify cron secret
function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  
  if (!cronSecret) return true; // Allow if not configured (dev)
  
  return authHeader === `Bearer ${cronSecret}`;
}

export async function GET(request: NextRequest) {
  // Verify authorization
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const type = url.searchParams.get("type") || "realtime";

  try {
    switch (type) {
      case "realtime": {
        // Send notifications for new market gaps
        const result = await notifyUnnotifiedMarketGaps();
        
        return NextResponse.json({
          success: true,
          type: "realtime",
          processed: result.processed,
          notified: result.notified,
          timestamp: new Date().toISOString(),
        });
      }

      case "daily": {
        // Send daily summary to all subscribed users
        const sentCount = await sendDailySummaryToAll();
        
        return NextResponse.json({
          success: true,
          type: "daily_summary",
          sentTo: sentCount,
          timestamp: new Date().toISOString(),
        });
      }

      default:
        return NextResponse.json(
          { error: "Invalid notification type" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Telegram notification cron error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
