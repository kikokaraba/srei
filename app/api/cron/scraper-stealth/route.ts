// Cron Job: /api/cron/scraper-stealth
// Automatický Stealth Scraper - spúšťa sa o 3:00 a 14:00

import { NextRequest, NextResponse } from "next/server";
import { runStealthScrape } from "@/lib/scraper/stealth-engine";

const CRON_SECRET = process.env.CRON_SECRET;

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
    
    console.log("🕐 Cron Job: Starting Stealth Scraper...");
    console.log(`📅 Time: ${new Date().toISOString()}`);
    
    // Konfigurácia pre cron - konzervativnejšie nastavenia
    const cronConfig = {
      maxPagesPerCategory: 3, // Len prvé 3 strany
      minDelay: 5000,         // 5-10 sekúnd delay
      maxDelay: 10000,
      maxRetries: 3,
    };
    
    // Cieľové mestá - najväčšie mestá SK
    const cities = ["Bratislava", "Košice", "Žilina", "Banská Bystrica", "Nitra"];
    
    // Spusti scrape
    const { totalStats, categoryStats } = await runStealthScrape(cities, cronConfig);
    
    console.log("✅ Cron Job completed:", {
      success: !totalStats.blocked,
      new: totalStats.newListings,
      hotDeals: totalStats.hotDeals,
      duration: `${Math.round(totalStats.duration / 1000)}s`,
    });
    
    return NextResponse.json({
      success: !totalStats.blocked,
      timestamp: new Date().toISOString(),
      stats: {
        pagesScraped: totalStats.pagesScraped,
        listingsFound: totalStats.listingsFound,
        newListings: totalStats.newListings,
        hotDeals: totalStats.hotDeals,
        errors: totalStats.errors,
        blocked: totalStats.blocked,
        duration: `${Math.round(totalStats.duration / 1000)}s`,
      },
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
