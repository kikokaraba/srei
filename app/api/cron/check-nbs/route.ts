// Cron endpoint pre kontrolu nových NBS dát
// Spúšťa sa denne a posiela notifikáciu ak sú nové dáta

import { NextRequest, NextResponse } from "next/server";
import { runNBSDataCheck } from "@/lib/data-sources/nbs-scraper";

const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: NextRequest) {
  // Verifikuj cron secret
  const authHeader = request.headers.get("authorization");
  
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  try {
    const result = await runNBSDataCheck();
    
    return NextResponse.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("NBS check cron error:", error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export const runtime = "nodejs";
export const maxDuration = 30;
