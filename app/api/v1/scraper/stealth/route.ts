// API Endpoint: /api/v1/scraper/stealth
// Bezpečný endpoint pre spustenie Stealth Scraper

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { 
  runStealthScrape, 
  scrapeBazosCategory,
  type StealthConfig 
} from "@/lib/scraper/stealth-engine";

// Bezpečnostné tokeny
const CRON_SECRET = process.env.CRON_SECRET;
const ENGINE_API_KEY = process.env.ENGINE_API_KEY;

/**
 * POST /api/v1/scraper/stealth
 * Spustí Stealth scraper
 * 
 * Body:
 * - cities?: string[] - zoznam miest na scrape (default: ["Bratislava", "Košice", "Žilina"])
 * - category?: string - konkrétna kategória ("/predaj/byty/" alebo "/predaj/domy/")
 * - config?: Partial<StealthConfig> - vlastná konfigurácia
 * - testMode?: boolean - ak true, scrapuje len 1 stranu 1 mesta
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Autentifikácia
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: 401 }
      );
    }
    
    // 2. Parse body
    const body = await request.json().catch(() => ({}));
    const { cities, category, config, testMode } = body;
    
    console.log(`🚀 Stealth scrape started by ${authResult.user}`);
    console.log(`⚙️ Options:`, { cities, category, testMode });
    
    // 3. Test mode - scrapuj len 1 stranu 1 mesta
    if (testMode) {
      const testCity = cities?.[0] || "Nitra";
      const testCategory = category || "/";
      
      console.log(`🧪 TEST MODE: ${testCity} - ${testCategory}`);
      
      const stats = await scrapeBazosCategory(testCategory, testCity, {
        maxPagesPerCategory: 1,
        ...config,
      });
      
      return NextResponse.json({
        success: true,
        testMode: true,
        stats: {
          pagesScraped: stats.pagesScraped,
          listingsFound: stats.listingsFound,
          newListings: stats.newListings,
          hotDeals: stats.hotDeals,
          errors: stats.errors,
          blocked: stats.blocked,
          duration: `${Math.round(stats.duration / 1000)}s`,
        },
        debug: stats.debug,
      });
    }
    
    // 4. Plný scrape
    const { totalStats, categoryStats } = await runStealthScrape(cities, config);
    
    return NextResponse.json({
      success: !totalStats.blocked,
      blocked: totalStats.blocked,
      stats: {
        pagesScraped: totalStats.pagesScraped,
        listingsFound: totalStats.listingsFound,
        newListings: totalStats.newListings,
        updatedListings: totalStats.updatedListings,
        hotDeals: totalStats.hotDeals,
        errors: totalStats.errors,
        duration: `${Math.round(totalStats.duration / 1000)}s`,
      },
      breakdown: categoryStats.map(c => ({
        category: c.category,
        city: c.city,
        listings: c.stats.listingsFound,
        new: c.stats.newListings,
        hotDeals: c.stats.hotDeals,
      })),
    });
    
  } catch (error) {
    console.error("Stealth scraper error:", error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/v1/scraper/stealth
 * Vracia stav posledného scrapu a Hot Deals
 * Prístup: všetci prihlásení používatelia (nie len admin)
 */
export async function GET(request: NextRequest) {
  try {
    // Jednoduchá autentifikácia - stačí byť prihlásený
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }
    
    const { prisma } = await import("@/lib/prisma");
    const { REGIONS, DISTRICTS } = await import("@/lib/constants/slovakia-locations");
    
    // Parse query params for filtering
    const { searchParams } = new URL(request.url);
    const regionsParam = searchParams.get("regions");
    const districtsParam = searchParams.get("districts");
    const citiesParam = searchParams.get("cities");
    
    // Build city filter from regions, districts, and cities
    const allCities: string[] = [];
    
    if (regionsParam) {
      const regionIds = regionsParam.split(",").filter(Boolean);
      for (const regionId of regionIds) {
        const region = REGIONS[regionId];
        if (region) {
          for (const districtId of region.districts) {
            const district = DISTRICTS[districtId];
            if (district?.cities) {
              allCities.push(...district.cities);
            }
          }
        }
      }
    }
    
    if (districtsParam) {
      const districtIds = districtsParam.split(",").filter(Boolean);
      for (const districtId of districtIds) {
        const district = DISTRICTS[districtId];
        if (district?.cities) {
          allCities.push(...district.cities);
        }
      }
    }
    
    if (citiesParam) {
      allCities.push(...citiesParam.split(",").filter(Boolean));
    }
    
    // Remove duplicates
    const uniqueCities = [...new Set(allCities)];
    
    // Posledný scrape log
    const lastScrape = await prisma.dataFetchLog.findFirst({
      where: { source: "STEALTH_BAZOS" },
      orderBy: { fetchedAt: "desc" },
    });
    
    // Build where clause
    const whereClause: Record<string, unknown> = {
      is_distressed: true,
      createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }, // Posledných 7 dní
    };
    
    // Add city filter if specified
    if (uniqueCities.length > 0) {
      whereClause.city = { in: uniqueCities };
    }
    
    // Hot Deals (is_distressed = true)
    const hotDeals = await prisma.property.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        marketGaps: true,
      },
    });
    
    // Štatistiky
    const statsWhere: Record<string, unknown> = {
      createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // Posledných 24 hodín
    };
    if (uniqueCities.length > 0) {
      statsWhere.city = { in: uniqueCities };
    }
    
    const stats = await prisma.property.aggregate({
      where: statsWhere,
      _count: { id: true },
    });
    
    return NextResponse.json({
      success: true,
      lastScrape: lastScrape ? {
        timestamp: lastScrape.fetchedAt.toISOString(),
        status: lastScrape.status,
        recordsCount: lastScrape.recordsCount,
        duration: lastScrape.duration_ms ? `${Math.round(lastScrape.duration_ms / 1000)}s` : null,
        error: lastScrape.error,
      } : null,
      hotDeals: hotDeals.map(deal => ({
        id: deal.id,
        title: deal.title,
        city: deal.city,
        district: deal.district,
        price: deal.price,
        pricePerM2: deal.price_per_m2,
        areaM2: deal.area_m2,
        gapPercentage: deal.marketGaps?.[0]?.gap_percentage,
        potentialProfit: deal.marketGaps?.[0]?.potential_profit,
        sourceUrl: deal.source_url,
        createdAt: deal.createdAt.toISOString(),
      })),
      stats: {
        newLast24h: stats._count.id,
        totalHotDeals: hotDeals.length,
      },
    });
    
  } catch (error) {
    console.error("Stealth status error:", error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}

/**
 * Autentifikácia requestu
 */
async function authenticateRequest(request: NextRequest): Promise<{
  success: boolean;
  user?: string;
  error?: string;
}> {
  const authHeader = request.headers.get("authorization");
  
  // API key
  if (ENGINE_API_KEY && authHeader === `Bearer ${ENGINE_API_KEY}`) {
    return { success: true, user: "api-key" };
  }
  
  // Cron secret
  if (CRON_SECRET && authHeader === `Bearer ${CRON_SECRET}`) {
    return { success: true, user: "cron" };
  }
  
  // Admin session
  try {
    const session = await auth();
    if (session?.user?.role === "ADMIN") {
      return { success: true, user: session.user.email || "admin" };
    }
    if (session?.user) {
      return { success: false, error: "Insufficient permissions" };
    }
  } catch {
    // Session check failed
  }
  
  return { success: false, error: "Unauthorized" };
}

// Runtime config
export const runtime = "nodejs";
export const maxDuration = 300; // 5 minút
