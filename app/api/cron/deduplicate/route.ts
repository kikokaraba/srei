/**
 * Deduplikácia nehnuteľností - cron job
 * 
 * Spúšťa sa automaticky po každom scrapovaní
 * alebo manuálne cez API
 */

import { NextResponse } from "next/server";
import { runFullDeduplication } from "@/lib/deduplication/fingerprint";

export async function GET() {
  const start = Date.now();

  try {
    const result = await runFullDeduplication();

    return NextResponse.json({
      success: true,
      duration: `${Date.now() - start}ms`,
      fingerprintsCreated: result.fingerprintsCreated,
      matchesFound: result.matchesFound,
      message: `Vytvorených ${result.fingerprintsCreated} fingerprintov, nájdených ${result.matchesFound} duplicít`,
    });
  } catch (error) {
    console.error("Deduplication error:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      duration: `${Date.now() - start}ms`,
    }, { status: 500 });
  }
}

export const runtime = "nodejs";
export const maxDuration = 60;
