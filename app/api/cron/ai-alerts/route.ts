/**
 * Cron: AI Alerts
 * Price drop + Better match notifications
 * Runs periodically (e.g. hourly)
 */

import { NextRequest, NextResponse } from "next/server";
import { runAIAlerts } from "@/lib/ai/ai-alerts";

function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return true;
  return authHeader === `Bearer ${cronSecret}`;
}

export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { betterMatch } = await runAIAlerts();

    return NextResponse.json({
      success: true,
      created: { betterMatch },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("AI Alerts cron error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export const maxDuration = 120;
