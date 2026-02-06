/**
 * Cron – AI enrichment lokality pre inzeráty s city=Slovensko/Neznáme
 * Volá sa: GET /api/cron/enrich-locations?limit=100
 */

import { NextResponse } from "next/server";
import { enrichLocations } from "@/lib/ai/enrich-locations";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(500, Math.max(1, parseInt(searchParams.get("limit") ?? "200", 10) || 200));

    const result = await enrichLocations({ limit, dryRun: false });

    return NextResponse.json({
      success: true,
      message: "Enrichment dokončený",
      ...result,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("[enrich-locations cron]", error);
    return NextResponse.json(
      { success: false, error: msg },
      { status: 500 }
    );
  }
}

export const runtime = "nodejs";
export const maxDuration = 120;
