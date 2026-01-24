// Cron Job: /api/cron/scraper-stealth
// Automatický Multi-Source Stealth Scraper
// Podporuje: Bazoš, Nehnutelnosti.sk, Reality.sk
// Spúšťa sa o 3:00 a 14:00

import { NextRequest, NextResponse } from "next/server";
import { runStealthScrape, runSourceScrape } from "@/lib/scraper/stealth-engine";

const CRON_SECRET = process.env.CRON_SECRET;

// Validné zdroje
const VALID_SOURCES = ["BAZOS", "NEHNUTELNOSTI", "REALITY"] as const;
type SourceType = typeof VALID_SOURCES[number];

export async function GET(request: NextRequest) {
  try {
    // Autentifikácia cron jobu
    const authHeader = request.headers.get("authorization");
    
    // Vercel cron jobs posielajú secret v header
    if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
      // Skús aj query parameter (fallback)
      const secretParam = request.nextUrl.searchParams.get("secret");
      if (secretParam !== CRON_SECRET) {
        return NextResponse.json(
          { success: false, error: "Unauthorized" },
          { status: 401 }
        );
      }
    }
    
    // Parsuj query parametre
    const sourcesParam = request.nextUrl.searchParams.get("sources");
    const citiesParam = request.nextUrl.searchParams.get("cities");
    const typesParam = request.nextUrl.searchParams.get("types");
    
    // Určenie zdrojov
    let sources: SourceType[] = ["BAZOS", "NEHNUTELNOSTI", "REALITY"];
    if (sourcesParam) {
      const requestedSources = sourcesParam.split(",").map(s => s.trim().toUpperCase());
      sources = requestedSources.filter(s => 
        VALID_SOURCES.includes(s as SourceType)
      ) as SourceType[];
    }
    
    // Určenie miest
    const cities = citiesParam 
      ? citiesParam.split(",").map(c => c.trim())
      : ["Bratislava", "Košice", "Žilina", "Banská Bystrica", "Nitra"];
    
    // Určenie typov (PREDAJ/PRENAJOM)
    const listingTypes: ("PREDAJ" | "PRENAJOM")[] = typesParam
      ? typesParam.split(",").map(t => t.trim().toUpperCase() as "PREDAJ" | "PRENAJOM")
      : ["PREDAJ", "PRENAJOM"];
    
    console.log("🕐 Cron Job: Starting Multi-Source Stealth Scraper...");
    console.log(`📅 Time: ${new Date().toISOString()}`);
    console.log(`🌐 Sources: ${sources.join(", ")}`);
    console.log(`📍 Cities: ${cities.join(", ")}`);
    console.log(`📋 Types: ${listingTypes.join(", ")}`);
    
    // Konfigurácia - prispôsobená podľa test módu
    const isTestMode = request.nextUrl.searchParams.get("test") === "true";
    
    const cronConfig = isTestMode ? {
      // Test mód - rýchly, len 1 strana, minimálny delay
      maxPagesPerCategory: 1,
      minDelay: 500,
      maxDelay: 1000,
      maxRetries: 1,
    } : {
      // Produkčný mód - bezpečnejšie nastavenia
      maxPagesPerCategory: 2,
      minDelay: 5000,
      maxDelay: 12000,
      maxRetries: 3,
    };
    
    // Spusti scrape
    const { totalStats, categoryStats } = await runStealthScrape(
      cities, 
      cronConfig,
      { sources, listingTypes }
    );
    
    // Zoskup štatistiky podľa zdroja
    const statsBySource: Record<string, { new: number; total: number; blocked: boolean }> = {};
    for (const stat of categoryStats) {
      if (!statsBySource[stat.source]) {
        statsBySource[stat.source] = { new: 0, total: 0, blocked: false };
      }
      statsBySource[stat.source].new += stat.stats.newListings;
      statsBySource[stat.source].total += stat.stats.listingsFound;
      if (stat.stats.blocked) {
        statsBySource[stat.source].blocked = true;
      }
    }
    
    console.log("✅ Cron Job completed:", {
      success: !totalStats.blocked,
      new: totalStats.newListings,
      hotDeals: totalStats.hotDeals,
      duration: `${Math.round(totalStats.duration / 1000)}s`,
      bySource: statsBySource,
    });
    
    return NextResponse.json({
      success: !totalStats.blocked,
      timestamp: new Date().toISOString(),
      config: {
        sources,
        cities,
        listingTypes,
      },
      stats: {
        pagesScraped: totalStats.pagesScraped,
        listingsFound: totalStats.listingsFound,
        newListings: totalStats.newListings,
        hotDeals: totalStats.hotDeals,
        errors: totalStats.errors,
        blocked: totalStats.blocked,
        duration: `${Math.round(totalStats.duration / 1000)}s`,
      },
      bySource: statsBySource,
    });
    
  } catch (error) {
    console.error("❌ Cron Job error:", error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// Runtime config
export const runtime = "nodejs";
export const maxDuration = 300; // 5 minút max
