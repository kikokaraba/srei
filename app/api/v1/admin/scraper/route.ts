/**
 * Unified Scraper API
 * 
 * Endpoint pre manuálne spúšťanie scrapu zo všetkých zdrojov
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { PropertySource, SlovakCity, ListingType } from "@/generated/prisma/client";

// Scraper sources configuration
const SCRAPER_SOURCES = {
  BAZOS: {
    name: "Bazoš.sk",
    url: "https://reality.bazos.sk",
    enabled: true,
    description: "Inzertný portál - všetky nehnuteľnosti",
    categories: [
      // Predaj
      { path: "/byty/", type: "PREDAJ" as ListingType, name: "Byty predaj" },
      { path: "/domy/", type: "PREDAJ" as ListingType, name: "Domy predaj" },
      { path: "/pozemky/", type: "PREDAJ" as ListingType, name: "Pozemky predaj" },
      { path: "/chaty/", type: "PREDAJ" as ListingType, name: "Chaty predaj" },
      { path: "/komercne/", type: "PREDAJ" as ListingType, name: "Komerčné predaj" },
      { path: "/garaze/", type: "PREDAJ" as ListingType, name: "Garáže predaj" },
      // Prenájom
      { path: "/prenajom/byty/", type: "PRENAJOM" as ListingType, name: "Byty prenájom" },
      { path: "/prenajom/domy/", type: "PRENAJOM" as ListingType, name: "Domy prenájom" },
      { path: "/prenajom/komercne/", type: "PRENAJOM" as ListingType, name: "Komerčné prenájom" },
    ],
  },
  NEHNUTELNOSTI: {
    name: "Nehnutelnosti.sk",
    url: "https://www.nehnutelnosti.sk",
    enabled: true,
    description: "Najväčší realitný portál - všetky nehnuteľnosti",
    categories: [
      // Predaj
      { path: "/byty/predaj/", type: "PREDAJ" as ListingType, name: "Byty predaj" },
      { path: "/domy/predaj/", type: "PREDAJ" as ListingType, name: "Domy predaj" },
      { path: "/pozemky/predaj/", type: "PREDAJ" as ListingType, name: "Pozemky predaj" },
      { path: "/chaty-chalupy/predaj/", type: "PREDAJ" as ListingType, name: "Chaty a chalupy predaj" },
      { path: "/komercne-priestory/predaj/", type: "PREDAJ" as ListingType, name: "Komerčné priestory predaj" },
      { path: "/garaze/predaj/", type: "PREDAJ" as ListingType, name: "Garáže predaj" },
      // Prenájom
      { path: "/byty/prenajom/", type: "PRENAJOM" as ListingType, name: "Byty prenájom" },
      { path: "/domy/prenajom/", type: "PRENAJOM" as ListingType, name: "Domy prenájom" },
      { path: "/komercne-priestory/prenajom/", type: "PRENAJOM" as ListingType, name: "Komerčné priestory prenájom" },
      { path: "/garaze/prenajom/", type: "PRENAJOM" as ListingType, name: "Garáže prenájom" },
    ],
  },
  REALITY: {
    name: "Reality.sk",
    url: "https://www.reality.sk",
    enabled: true,
    description: "Druhý najväčší realitný portál - všetky nehnuteľnosti",
    categories: [
      // Predaj
      { path: "/byty/predaj/", type: "PREDAJ" as ListingType, name: "Byty predaj" },
      { path: "/domy/predaj/", type: "PREDAJ" as ListingType, name: "Domy predaj" },
      { path: "/pozemky/predaj/", type: "PREDAJ" as ListingType, name: "Pozemky predaj" },
      { path: "/chaty-chalupy/predaj/", type: "PREDAJ" as ListingType, name: "Chaty a chalupy predaj" },
      { path: "/komercne-nehnutelnosti/predaj/", type: "PREDAJ" as ListingType, name: "Komerčné nehnuteľnosti predaj" },
      { path: "/garaze-parkovanie/predaj/", type: "PREDAJ" as ListingType, name: "Garáže predaj" },
      // Prenájom
      { path: "/byty/prenajom/", type: "PRENAJOM" as ListingType, name: "Byty prenájom" },
      { path: "/domy/prenajom/", type: "PRENAJOM" as ListingType, name: "Domy prenájom" },
      { path: "/komercne-nehnutelnosti/prenajom/", type: "PRENAJOM" as ListingType, name: "Komerčné nehnuteľnosti prenájom" },
      { path: "/garaze-parkovanie/prenajom/", type: "PRENAJOM" as ListingType, name: "Garáže prenájom" },
    ],
  },
  TOPREALITY: {
    name: "TopReality.sk",
    url: "https://www.topreality.sk",
    enabled: false,
    description: "Ďalší realitný portál (v príprave)",
    categories: [],
  },
};

const CITY_SLUGS: Record<string, string> = {
  "Bratislava": "bratislava",
  "Košice": "kosice",
  "Prešov": "presov",
  "Žilina": "zilina",
  "Banská Bystrica": "banska-bystrica",
  "Trnava": "trnava",
  "Trenčín": "trencin",
  "Nitra": "nitra",
};

interface ScraperStats {
  source: string;
  pagesScraped: number;
  listingsFound: number;
  newListings: number;
  updatedListings: number;
  errors: number;
  duration: number;
}

/**
 * GET - Získať konfiguráciu a stav scraperov
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (user?.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Admin access required" }, { status: 403 });
    }

    // Get last scrape logs for each source
    const lastScrapes = await prisma.dataFetchLog.findMany({
      where: {
        source: { in: ["BAZOS", "NEHNUTELNOSTI", "REALITY", "STEALTH_BAZOS"] },
      },
      orderBy: { fetchedAt: "desc" },
      take: 20,
    });

    // Group by source
    const lastScrapeBySources: Record<string, typeof lastScrapes[0] | null> = {};
    for (const source of Object.keys(SCRAPER_SOURCES)) {
      lastScrapeBySources[source] = lastScrapes.find(l => 
        l.source === source || l.source === `STEALTH_${source}`
      ) || null;
    }

    // Get property counts by source
    const propertyCounts = await prisma.property.groupBy({
      by: ["source"],
      _count: { id: true },
    });

    const propertyCountBySource: Record<string, number> = {};
    for (const item of propertyCounts) {
      propertyCountBySource[item.source] = item._count.id;
    }

    return NextResponse.json({
      success: true,
      data: {
        sources: Object.entries(SCRAPER_SOURCES).map(([key, config]) => ({
          id: key,
          ...config,
          propertyCount: propertyCountBySource[key] || 0,
          lastScrape: lastScrapeBySources[key] ? {
            timestamp: lastScrapeBySources[key]!.fetchedAt,
            status: lastScrapeBySources[key]!.status,
            recordsCount: lastScrapeBySources[key]!.recordsCount,
            duration: lastScrapeBySources[key]!.duration_ms,
            error: lastScrapeBySources[key]!.error,
          } : null,
        })),
        cities: Object.entries(CITY_SLUGS).map(([name, slug]) => ({
          name,
          slug,
        })),
      },
    });
  } catch (error) {
    console.error("Scraper config error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    );
  }
}

/**
 * POST - Spustiť scraping
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (user?.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Admin access required" }, { status: 403 });
    }

    const body = await request.json();
    const { 
      sources = ["BAZOS"], 
      cities = ["Bratislava"],
      categories = ["byty-predaj"],
      testMode = true,
      maxPages = 1,
    } = body;

    console.log(`🚀 Starting scrape: sources=${sources.join(",")}, cities=${cities.join(",")}, testMode=${testMode}`);

    const results: ScraperStats[] = [];
    const startTime = Date.now();

    for (const sourceId of sources) {
      const sourceConfig = SCRAPER_SOURCES[sourceId as keyof typeof SCRAPER_SOURCES];
      if (!sourceConfig || !sourceConfig.enabled) {
        results.push({
          source: sourceId,
          pagesScraped: 0,
          listingsFound: 0,
          newListings: 0,
          updatedListings: 0,
          errors: 1,
          duration: 0,
        });
        continue;
      }

      try {
        const sourceStartTime = Date.now();
        const stats = await runSourceScrape(sourceId as PropertySource, sourceConfig, {
          cities,
          categories,
          testMode,
          maxPages,
        });
        
        results.push({
          source: sourceId,
          ...stats,
          duration: Date.now() - sourceStartTime,
        });

        // Log to database
        await prisma.dataFetchLog.create({
          data: {
            source: sourceId,
            status: stats.errors > 0 ? "partial" : "success",
            recordsCount: stats.newListings + stats.updatedListings,
            duration_ms: Date.now() - sourceStartTime,
            error: stats.errors > 0 ? `${stats.errors} errors` : null,
          },
        });

      } catch (error) {
        console.error(`Error scraping ${sourceId}:`, error);
        results.push({
          source: sourceId,
          pagesScraped: 0,
          listingsFound: 0,
          newListings: 0,
          updatedListings: 0,
          errors: 1,
          duration: 0,
        });

        await prisma.dataFetchLog.create({
          data: {
            source: sourceId,
            status: "error",
            recordsCount: 0,
            error: error instanceof Error ? error.message : "Unknown error",
          },
        });
      }
    }

    const totalDuration = Date.now() - startTime;
    const totalStats = {
      pagesScraped: results.reduce((sum, r) => sum + r.pagesScraped, 0),
      listingsFound: results.reduce((sum, r) => sum + r.listingsFound, 0),
      newListings: results.reduce((sum, r) => sum + r.newListings, 0),
      updatedListings: results.reduce((sum, r) => sum + r.updatedListings, 0),
      errors: results.reduce((sum, r) => sum + r.errors, 0),
    };

    return NextResponse.json({
      success: totalStats.errors === 0,
      stats: {
        ...totalStats,
        duration: `${Math.round(totalDuration / 1000)}s`,
      },
      breakdown: results.map(r => ({
        ...r,
        duration: `${Math.round(r.duration / 1000)}s`,
      })),
    });

  } catch (error) {
    console.error("Scraper error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    );
  }
}

/**
 * Spustí scraping pre jeden zdroj
 */
async function runSourceScrape(
  sourceId: PropertySource,
  config: typeof SCRAPER_SOURCES.BAZOS,
  options: {
    cities: string[];
    categories: string[];
    testMode: boolean;
    maxPages: number;
  }
): Promise<Omit<ScraperStats, "source" | "duration">> {
  const stats = {
    pagesScraped: 0,
    listingsFound: 0,
    newListings: 0,
    updatedListings: 0,
    errors: 0,
  };

  // Pre každé mesto a kategóriu
  for (const city of options.cities) {
    for (const categoryFilter of options.categories) {
      // Nájdi matching kategóriu
      const category = config.categories.find(c => {
        const catId = `${c.path.includes("byty") ? "byty" : "domy"}-${c.type.toLowerCase()}`;
        return catId === categoryFilter || categoryFilter === "all";
      });

      if (!category && categoryFilter !== "all") continue;

      const categoriesToScrape = categoryFilter === "all" ? config.categories : [category!];

      for (const cat of categoriesToScrape) {
        try {
          const pageStats = await scrapePage(sourceId, config.url, cat, city, options.maxPages);
          stats.pagesScraped += pageStats.pagesScraped;
          stats.listingsFound += pageStats.listingsFound;
          stats.newListings += pageStats.newListings;
          stats.updatedListings += pageStats.updatedListings;
        } catch (error) {
          console.error(`Error scraping ${sourceId} ${cat.name} ${city}:`, error);
          stats.errors++;
        }

        // Rate limiting
        if (!options.testMode) {
          await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000));
        }
      }
    }
  }

  return stats;
}

/**
 * Scrapuje jednu stránku/kategóriu
 */
async function scrapePage(
  sourceId: PropertySource,
  baseUrl: string,
  category: { path: string; type: ListingType; name: string },
  city: string,
  maxPages: number
): Promise<{ pagesScraped: number; listingsFound: number; newListings: number; updatedListings: number }> {
  const stats = { pagesScraped: 0, listingsFound: 0, newListings: 0, updatedListings: 0 };
  
  // Dynamický import scrapera
  const { getScraper } = await import("@/lib/scraper/sources");
  const scraper = getScraper(sourceId);
  
  if (!scraper) {
    console.log(`⚠️ No scraper available for ${sourceId}`);
    return stats;
  }

  const citySlug = CITY_SLUGS[city] || city.toLowerCase();
  
  for (let page = 1; page <= maxPages; page++) {
    try {
      const url = scraper.buildCategoryUrl(
        { name: category.name, path: category.path, listingType: category.type },
        city,
        page
      );
      
      console.log(`📄 Scraping: ${url}`);
      
      // Fetch page
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "sk-SK,sk;q=0.9,en;q=0.8",
        },
      });

      if (!response.ok) {
        console.error(`❌ Failed to fetch ${url}: ${response.status}`);
        continue;
      }

      const html = await response.text();
      
      // Parse with cheerio
      const cheerio = await import("cheerio");
      const $ = cheerio.load(html);
      
      const selectors = scraper.getSelectors();
      const listings = $(selectors.listingContainer);
      
      console.log(`  Found ${listings.length} listings on page ${page}`);
      stats.pagesScraped++;

      listings.each((_, element) => {
        try {
          const parsed = scraper.parseListingElement($, element, category.type);
          if (parsed) {
            stats.listingsFound++;
            // Tu by sa uložil listing do databázy
            // Pre teraz len počítame
          }
        } catch (e) {
          // Skip invalid listings
        }
      });

      // Check for next page
      const hasNextPage = $(selectors.nextPage).length > 0;
      if (!hasNextPage) break;

      // Rate limit
      await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

    } catch (error) {
      console.error(`Error scraping page ${page}:`, error);
    }
  }

  return stats;
}

export const runtime = "nodejs";
export const maxDuration = 300;
