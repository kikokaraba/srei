// Data Intelligence Engine - Hlavný orchestrátor scrapingu a analýzy

import { prisma } from "@/lib/prisma";
import type { PropertyCondition, EnergyCertificate } from "@/generated/prisma/client";
import { normalizeCityName, getCityCoordinates } from "@/lib/constants/cities";
import type { 
  ScrapeResult, 
  SyncReport, 
  ParsedListingData, 
  ScrapeError,
  MarketGapResult,
  RawListingData,
} from "./types";
import { 
  BAZOS_CONFIG, 
  parseListing, 
  rateLimitWait,
  parseLocation,
} from "./bazos";
import { 
  detectMarketGap, 
  saveMarketGap, 
  updateLiquidity,
  updateStreetAnalytics,
} from "@/lib/analysis/market-logic";

// Scraper imports - dynamicky vyberieme najlepší dostupný
import { scrapeWithCheerio, scrapeListingPageCheerio } from "./cheerio-scraper";

/**
 * Konfigurácia scrapingu
 */
interface ScrapeOptions {
  usePlaywright?: boolean;
  maxListings?: number;
  categories?: string[];
}

const DEFAULT_OPTIONS: ScrapeOptions = {
  usePlaywright: !!process.env.BROWSER_WS_ENDPOINT || !!process.env.BROWSER_EXECUTABLE_PATH,
  maxListings: 200,
  categories: ["/predaj/byty/", "/prenajom/byty/"],
};

/**
 * Dynamicky importuje Playwright scraper ak je dostupný
 */
async function getPlaywrightScraper() {
  try {
    const playwright = await import("./playwright-scraper");
    return playwright;
  } catch {
    console.log("⚠️ Playwright not available, using Cheerio fallback");
    return null;
  }
}

/**
 * Logger pre metriky
 */
class ScrapeLogger {
  private startTime: number;
  private metrics: {
    totalFound: number;
    newListings: number;
    updatedListings: number;
    removedListings: number;
    marketGapsDetected: number;
    errors: ScrapeError[];
  };
  
  constructor() {
    this.startTime = Date.now();
    this.metrics = {
      totalFound: 0,
      newListings: 0,
      updatedListings: 0,
      removedListings: 0,
      marketGapsDetected: 0,
      errors: [],
    };
  }
  
  incrementTotal() { this.metrics.totalFound++; }
  incrementNew() { this.metrics.newListings++; }
  incrementUpdated() { this.metrics.updatedListings++; }
  incrementRemoved() { this.metrics.removedListings++; }
  incrementGaps() { this.metrics.marketGapsDetected++; }
  addError(error: ScrapeError) { this.metrics.errors.push(error); }
  
  getResult(source: string): ScrapeResult {
    return {
      success: this.metrics.errors.filter(e => e.type === "STRUCTURE_CHANGE").length === 0,
      source,
      ...this.metrics,
      duration: Date.now() - this.startTime,
      timestamp: new Date(),
    };
  }
}

/**
 * Generuje unikátny slug pre nehnuteľnosť
 */
function generateSlug(listing: ParsedListingData): string {
  const citySlug = listing.city.toLowerCase().replace(/_/g, "-");
  const districtSlug = listing.district
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
  const areaSlug = `${listing.areaM2}m2`;
  const idSlug = listing.externalId.slice(-8);
  
  return `${citySlug}-${districtSlug}-${areaSlug}-${idSlug}`;
}

/**
 * Uloží alebo aktualizuje nehnuteľnosť v databáze
 */
async function upsertProperty(
  listing: ParsedListingData,
  logger: ScrapeLogger
): Promise<{ propertyId: string; isNew: boolean }> {
  const slug = generateSlug(listing);
  
  // Skontroluj či už existuje
  const existing = await prisma.property.findFirst({
    where: {
      OR: [
        { slug },
        { source_url: listing.sourceUrl },
      ],
    },
  });
  
  if (existing) {
    // Aktualizuj existujúci
    await prisma.property.update({
      where: { id: existing.id },
      data: {
        price: listing.price,
        price_per_m2: listing.pricePerM2,
        updatedAt: new Date(),
      },
    });
    
    // Pridaj do price history ak sa cena zmenila
    if (existing.price !== listing.price) {
      await prisma.priceHistory.create({
        data: {
          propertyId: existing.id,
          price: listing.price,
          price_per_m2: listing.pricePerM2,
        },
      });
    }
    
    logger.incrementUpdated();
    return { propertyId: existing.id, isNew: false };
  }
  
  // Normalize city name and get coordinates
  const normalizedCity = normalizeCityName(listing.city) || listing.city;
  const coords = getCityCoordinates(normalizedCity);
  
  // Add small random offset to coordinates to prevent exact overlaps
  const offset = () => (Math.random() - 0.5) * 0.015; // ~750m variance
  
  // Vytvor nový
  const property = await prisma.property.create({
    data: {
      slug,
      title: listing.title,
      description: listing.description,
      city: normalizedCity,
      district: listing.district,
      street: listing.street,
      address: listing.address,
      price: listing.price,
      area_m2: listing.areaM2,
      price_per_m2: listing.pricePerM2,
      rooms: listing.rooms,
      floor: listing.floor,
      condition: listing.condition,
      energy_certificate: listing.energyCertificate,
      source_url: listing.sourceUrl,
      first_listed_at: listing.postedAt || new Date(),
      // Add coordinates if available
      latitude: coords ? coords.lat + offset() : null,
      longitude: coords ? coords.lng + offset() : null,
    },
  });
  
  // Pridaj do price history
  await prisma.priceHistory.create({
    data: {
      propertyId: property.id,
      price: listing.price,
      price_per_m2: listing.pricePerM2,
    },
  });
  
  logger.incrementNew();
  return { propertyId: property.id, isNew: true };
}

/**
 * Spracuje jeden listing - uloží do DB, detekuje gap, aktualizuje analytiky
 */
async function processListing(
  listing: ParsedListingData,
  logger: ScrapeLogger
): Promise<MarketGapResult | null> {
  try {
    // 1. Ulož do databázy
    const { propertyId, isNew } = await upsertProperty(listing, logger);
    
    // 2. Aktualizuj Street Analytics
    if (listing.street) {
      await updateStreetAnalytics(
        listing.city,
        listing.district,
        listing.street,
        listing.pricePerM2
      );
    }
    
    // 3. Detekuj Market Gap
    const gap = await detectMarketGap(listing);
    
    if (gap) {
      await saveMarketGap(propertyId, gap);
      logger.incrementGaps();
      
      // Označ nehnuteľnosť ako high_potential
      await prisma.property.update({
        where: { id: propertyId },
        data: { is_distressed: true }, // Používame is_distressed ako high_potential
      });
      
      return gap;
    }
    
    return null;
    
  } catch (error) {
    logger.addError({
      type: "PARSE_ERROR",
      message: error instanceof Error ? error.message : "Unknown error",
      url: listing.sourceUrl,
    });
    return null;
  }
}

/**
 * Scrape Bazoš - hlavná funkcia
 * Automaticky vyberie najlepší dostupný scraper (Playwright > Cheerio)
 */
export async function scrapeBazos(options: ScrapeOptions = {}): Promise<ScrapeResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const logger = new ScrapeLogger();
  const processedIds = new Set<string>();
  
  console.log("🔍 Starting Bazoš scrape...");
  console.log(`⚙️ Config: Playwright=${opts.usePlaywright}, MaxListings=${opts.maxListings}`);
  
  try {
    // Vyber scraper
    let playwrightScraper = null;
    if (opts.usePlaywright) {
      playwrightScraper = await getPlaywrightScraper();
    }
    
    for (const category of opts.categories || DEFAULT_OPTIONS.categories!) {
      const categoryUrl = `${BAZOS_CONFIG.baseUrl}${category}`;
      console.log(`📂 Scraping category: ${category}`);
      
      let rawListings: RawListingData[] = [];
      let scrapeErrors: ScrapeError[] = [];
      
      // Použij Playwright alebo Cheerio
      if (playwrightScraper) {
        console.log("🎭 Using Playwright scraper");
        const result = await playwrightScraper.scrapeWithDetails(
          categoryUrl,
          Math.floor((opts.maxListings || 200) / opts.categories!.length)
        );
        rawListings = result.listings;
        scrapeErrors = result.errors;
      } else {
        console.log("🍵 Using Cheerio scraper");
        const result = await scrapeWithCheerio(
          categoryUrl,
          Math.floor((opts.maxListings || 200) / opts.categories!.length)
        );
        rawListings = result.listings;
        scrapeErrors = result.errors;
      }
      
      // Log errors
      scrapeErrors.forEach(e => logger.addError(e));
      
      // Spracuj listings
      for (const raw of rawListings) {
        logger.incrementTotal();
        processedIds.add(raw.externalId);
        
        const { data: listing, errors: parseErrors } = parseListing(raw);
        parseErrors.forEach(e => logger.addError(e));
        
        if (listing) {
          await processListing(listing, logger);
        }
      }
    }
    
    // Detekuj zmiznuté inzeráty (liquidity tracking)
    await detectRemovedListings(processedIds, logger);
    
    // Cleanup Playwright browser ak bol použitý
    if (opts.usePlaywright) {
      const playwrightScraper = await getPlaywrightScraper();
      await playwrightScraper?.closeBrowser();
    }
    
  } catch (error) {
    logger.addError({
      type: "NETWORK_ERROR",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
  
  const result = logger.getResult("BAZOS");
  console.log(`✅ Bazoš scrape completed:`, {
    total: result.totalFound,
    new: result.newListings,
    updated: result.updatedListings,
    gaps: result.marketGapsDetected,
    errors: result.errors.length,
    duration: `${result.duration}ms`,
  });
  
  return result;
}

/**
 * Detekuje inzeráty ktoré zmizli z webu
 */
async function detectRemovedListings(
  activeIds: Set<string>,
  logger: ScrapeLogger
): Promise<void> {
  // Nájdi všetky aktívne properties z Bazoš
  const existingProperties = await prisma.property.findMany({
    where: {
      source_url: { contains: "bazos.sk" },
      days_on_market: 0, // Ešte neboli označené ako predané
    },
    select: {
      id: true,
      slug: true,
      source_url: true,
      first_listed_at: true,
      createdAt: true,
    },
  });
  
  for (const property of existingProperties) {
    // Extrahuj externalId z slug alebo URL
    const externalIdMatch = property.source_url?.match(/inzerat\/(\d+)/);
    const externalId = externalIdMatch?.[1];
    
    if (externalId && !activeIds.has(externalId)) {
      // Inzerát zmizol - pravdepodobne predaný
      const firstListed = property.first_listed_at || property.createdAt;
      const daysOnMarket = Math.floor(
        (Date.now() - firstListed.getTime()) / (1000 * 60 * 60 * 24)
      );
      
      await prisma.property.update({
        where: { id: property.id },
        data: { days_on_market: daysOnMarket },
      });
      
      logger.incrementRemoved();
    }
  }
}

/**
 * Hlavná sync funkcia - spúšťa všetky scrapery a analýzy
 */
export async function runFullSync(): Promise<SyncReport> {
  const startedAt = new Date();
  const sources: { source: string; result: ScrapeResult }[] = [];
  const allGaps: MarketGapResult[] = [];
  const allErrors: ScrapeError[] = [];
  let liquidityUpdates = 0;
  
  console.log("🚀 Starting full data sync...");
  
  try {
    // 1. Scrape Bazoš
    const bazosResult = await scrapeBazos();
    sources.push({ source: "BAZOS", result: bazosResult });
    allErrors.push(...bazosResult.errors);
    
    // Tu by boli ďalšie scrapery (nehnutelnosti.sk, reality.sk, atď.)
    
    // 2. Získaj detekované gaps
    const gaps = await prisma.marketGap.findMany({
      where: {
        detected_at: { gte: startedAt },
        notified: false,
      },
      include: { property: true },
    });
    
    for (const gap of gaps) {
      allGaps.push({
        propertyId: gap.propertyId,
        gapPercentage: gap.gap_percentage,
        streetAvgPrice: gap.street_avg_price,
        districtAvgPrice: gap.street_avg_price,
        potentialProfit: gap.potential_profit || 0,
        confidence: gap.gap_percentage >= 25 ? "HIGH" : "MEDIUM",
        reasons: [`${gap.gap_percentage}% pod trhovou cenou`],
      });
    }
    
    // 3. Počet liquidity updates
    liquidityUpdates = sources.reduce((sum, s) => sum + s.result.removedListings, 0);
    
  } catch (error) {
    allErrors.push({
      type: "NETWORK_ERROR",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
  
  const completedAt = new Date();
  
  // Log do databázy
  await prisma.dataFetchLog.create({
    data: {
      source: "FULL_SYNC",
      status: allErrors.length === 0 ? "success" : "partial",
      recordsCount: sources.reduce((sum, s) => sum + s.result.newListings + s.result.updatedListings, 0),
      error: allErrors.length > 0 ? JSON.stringify(allErrors.slice(0, 10)) : null,
      duration_ms: completedAt.getTime() - startedAt.getTime(),
    },
  });
  
  const report: SyncReport = {
    success: allErrors.filter(e => e.type === "STRUCTURE_CHANGE").length === 0,
    startedAt,
    completedAt,
    duration: completedAt.getTime() - startedAt.getTime(),
    sources,
    marketGaps: allGaps,
    liquidityUpdates,
    errors: allErrors,
  };
  
  console.log("✅ Full sync completed:", {
    duration: `${report.duration}ms`,
    sources: sources.length,
    gaps: allGaps.length,
    errors: allErrors.length,
  });
  
  return report;
}

/**
 * Export pre použitie v API
 */
export { ScrapeLogger };
