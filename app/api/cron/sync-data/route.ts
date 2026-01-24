// Cron endpoint pre synchronizáciu dát
// Nastavenie v vercel.json alebo externý scheduler

import { NextRequest, NextResponse } from "next/server";
import { runAllSync, syncNBSData, syncEconomicIndicators, syncCityMarketData } from "@/lib/data-sources/scheduler";

// Verifikácia cron tokenu (pre bezpečnosť)
const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: NextRequest) {
  // Verifikuj cron secret
  const authHeader = request.headers.get("authorization");
  
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  const searchParams = request.nextUrl.searchParams;
  const type = searchParams.get("type") || "all";
  
  try {
    let result;
    
    switch (type) {
      case "nbs":
        result = await syncNBSData();
        break;
      case "economic":
        result = await syncEconomicIndicators();
        break;
      case "market":
        result = await syncCityMarketData();
        break;
      case "all":
      default:
        result = await runAllSync();
        break;
    }
    
    return NextResponse.json({
      success: true,
      type,
      result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Cron sync error:", error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// Konfigurácia pre Vercel Cron
export const runtime = "nodejs";
export const maxDuration = 60; // Max 60 sekúnd
