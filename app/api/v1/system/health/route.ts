// API Endpoint: /api/v1/system/health
// Vracia stav systému, scraperů a databázy

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    // Získaj posledné scraper logy
    const scraperLogs = await prisma.dataFetchLog.findMany({
      where: {
        source: { in: ["STEALTH_BAZOS", "FULL_SYNC", "NBS_CHECK"] },
      },
      orderBy: { fetchedAt: "desc" },
      take: 10,
    });
    
    // Agreguj logy podľa source
    const scraperMap = new Map<string, typeof scraperLogs[0]>();
    for (const log of scraperLogs) {
      if (!scraperMap.has(log.source)) {
        scraperMap.set(log.source, log);
      }
    }
    
    const scrapers = [
      {
        source: "Bazoš Stealth",
        ...(scraperMap.get("STEALTH_BAZOS") ? {
          lastRun: scraperMap.get("STEALTH_BAZOS")!.fetchedAt.toISOString(),
          status: scraperMap.get("STEALTH_BAZOS")!.status as "success" | "partial" | "blocked" | "error",
          recordsCount: scraperMap.get("STEALTH_BAZOS")!.recordsCount,
          duration: scraperMap.get("STEALTH_BAZOS")!.duration_ms 
            ? `${Math.round(scraperMap.get("STEALTH_BAZOS")!.duration_ms! / 1000)}s` 
            : undefined,
          error: scraperMap.get("STEALTH_BAZOS")!.error || undefined,
        } : {
          status: "never" as const,
        }),
      },
      {
        source: "NBS Data",
        ...(scraperMap.get("NBS_CHECK") ? {
          lastRun: scraperMap.get("NBS_CHECK")!.fetchedAt.toISOString(),
          status: scraperMap.get("NBS_CHECK")!.status as "success" | "partial" | "error",
          recordsCount: scraperMap.get("NBS_CHECK")!.recordsCount,
          duration: scraperMap.get("NBS_CHECK")!.duration_ms 
            ? `${Math.round(scraperMap.get("NBS_CHECK")!.duration_ms! / 1000)}s` 
            : undefined,
        } : {
          status: "never" as const,
        }),
      },
    ];
    
    // Database stats
    const [propertyCount, hotDealCount] = await Promise.all([
      prisma.property.count(),
      prisma.property.count({ where: { is_distressed: true } }),
    ]);
    
    return NextResponse.json({
      scrapers,
      database: {
        connected: true,
        totalProperties: propertyCount,
        totalHotDeals: hotDealCount,
      },
      lastUpdate: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error("System health error:", error);
    
    return NextResponse.json({
      scrapers: [],
      database: {
        connected: false,
        totalProperties: 0,
        totalHotDeals: 0,
      },
      lastUpdate: new Date().toISOString(),
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
