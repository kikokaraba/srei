// Cron: scrapovanie úrokových sadzieb bánk (hypotéky)
// GET/POST s CRON_SECRET

import { NextRequest, NextResponse } from "next/server";
import { scrapeAllBankRates } from "@/lib/data-sources/bank-rates-scraper";

const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await scrapeAllBankRates();
    return NextResponse.json({
      success: result.success,
      banksScraped: result.banksScraped,
      banksFailed: result.banksFailed,
      totalRates: result.totalRates,
      errors: result.errors,
      durationMs: result.durationMs,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Scrape bank rates cron error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}

export const runtime = "nodejs";
export const maxDuration = 120;
