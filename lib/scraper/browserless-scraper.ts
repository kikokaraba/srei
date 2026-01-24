/**
 * Browserless.io Scraper
 * 
 * Univerzálny scraper pre JS-rendered stránky
 * Podporuje: Nehnutelnosti.sk, Reality.sk
 */

import type { Browser, Page } from "playwright-core";
import type { SlovakCity, ListingType, PropertySource } from "@/generated/prisma/client";

// ============================================
// Types
// ============================================

export interface ScrapedProperty {
  externalId: string;
  source: PropertySource;
  title: string;
  description: string;
  price: number;
  pricePerM2: number;
  areaM2: number;
  city: SlovakCity;
  district: string;
  rooms?: number;
  listingType: ListingType;
  sourceUrl: string;
  imageUrl?: string;
}

export interface ScrapeResult {
  properties: ScrapedProperty[];
  pagesScraped: number;
  errors: string[];
  duration: number;
}

interface PortalConfig {
  name: string;
  baseUrl: string;
  source: PropertySource;
  selectors: {
    listingItem: string;
    title: string;
    price: string;
    area: string;
    location: string;
    link: string;
    nextPage: string;
  };
  categories: {
    path: string;
    listingType: ListingType;
    name: string;
  }[];
}

// ============================================
// Portal Configurations
// ============================================

const NEHNUTELNOSTI_CONFIG: PortalConfig = {
  name: "Nehnutelnosti.sk",
  baseUrl: "https://www.nehnutelnosti.sk",
  source: "NEHNUTELNOSTI",
  selectors: {
    listingItem: "[data-testid='search-result-card'], .MuiCard-root, article, .estate-item",
    title: "h2, h3, [data-testid='title'], .title",
    price: "[data-testid='price'], .price, .MuiTypography-root:has-text('€')",
    area: "[data-testid='area'], .area, :has-text('m²')",
    location: "[data-testid='location'], .location, .address",
    link: "a[href*='/detail/'], a[href*='/nehnutelnost/']",
    nextPage: "a[rel='next'], button:has-text('Ďalšia'), [aria-label='next']",
  },
  categories: [
    // Predaj
    { path: "/byty/predaj/", listingType: "PREDAJ", name: "Byty predaj" },
    { path: "/domy/predaj/", listingType: "PREDAJ", name: "Domy predaj" },
    { path: "/pozemky/predaj/", listingType: "PREDAJ", name: "Pozemky predaj" },
    { path: "/chaty-chalupy/predaj/", listingType: "PREDAJ", name: "Chaty a chalupy predaj" },
    { path: "/komercne-priestory/predaj/", listingType: "PREDAJ", name: "Komerčné priestory predaj" },
    { path: "/garaze/predaj/", listingType: "PREDAJ", name: "Garáže predaj" },
    // Prenájom
    { path: "/byty/prenajom/", listingType: "PRENAJOM", name: "Byty prenájom" },
    { path: "/domy/prenajom/", listingType: "PRENAJOM", name: "Domy prenájom" },
    { path: "/komercne-priestory/prenajom/", listingType: "PRENAJOM", name: "Komerčné priestory prenájom" },
    { path: "/garaze/prenajom/", listingType: "PRENAJOM", name: "Garáže prenájom" },
  ],
};

const REALITY_CONFIG: PortalConfig = {
  name: "Reality.sk",
  baseUrl: "https://www.reality.sk",
  source: "REALITY",
  selectors: {
    listingItem: ".estate-list__item, article.estate, .property-card, .listing-item",
    title: ".estate-list__title, h2 a, .property-title, .title",
    price: ".estate-list__price, .price, .property-price",
    area: ".estate-list__area, .area, .property-area, :has-text('m²')",
    location: ".estate-list__location, .location, .address",
    link: "a[href*='/detail/'], a[href*='/inzerat/'], h2 a",
    nextPage: ".pagination__next, a[rel='next'], .next-page",
  },
  categories: [
    // Predaj
    { path: "/byty/predaj/", listingType: "PREDAJ", name: "Byty predaj" },
    { path: "/domy/predaj/", listingType: "PREDAJ", name: "Domy predaj" },
    { path: "/pozemky/predaj/", listingType: "PREDAJ", name: "Pozemky predaj" },
    { path: "/chaty-chalupy/predaj/", listingType: "PREDAJ", name: "Chaty a chalupy predaj" },
    { path: "/komercne-nehnutelnosti/predaj/", listingType: "PREDAJ", name: "Komerčné nehnuteľnosti predaj" },
    { path: "/garaze-parkovanie/predaj/", listingType: "PREDAJ", name: "Garáže predaj" },
    // Prenájom
    { path: "/byty/prenajom/", listingType: "PRENAJOM", name: "Byty prenájom" },
    { path: "/domy/prenajom/", listingType: "PRENAJOM", name: "Domy prenájom" },
    { path: "/komercne-nehnutelnosti/prenajom/", listingType: "PRENAJOM", name: "Komerčné nehnuteľnosti prenájom" },
    { path: "/garaze-parkovanie/prenajom/", listingType: "PRENAJOM", name: "Garáže prenájom" },
  ],
};

export const PORTAL_CONFIGS: Record<string, PortalConfig> = {
  NEHNUTELNOSTI: NEHNUTELNOSTI_CONFIG,
  REALITY: REALITY_CONFIG,
};

// ============================================
// City Mapping
// ============================================

const CITY_MAP: Record<string, SlovakCity> = {
  "bratislava": "BRATISLAVA",
  "košice": "KOSICE",
  "kosice": "KOSICE",
  "prešov": "PRESOV",
  "presov": "PRESOV",
  "žilina": "ZILINA",
  "zilina": "ZILINA",
  "banská bystrica": "BANSKA_BYSTRICA",
  "banska bystrica": "BANSKA_BYSTRICA",
  "trnava": "TRNAVA",
  "trenčín": "TRENCIN",
  "trencin": "TRENCIN",
  "nitra": "NITRA",
  // Bratislava districts
  "petržalka": "BRATISLAVA",
  "ružinov": "BRATISLAVA",
  "staré mesto": "BRATISLAVA",
  "nové mesto": "BRATISLAVA",
  "karlova ves": "BRATISLAVA",
  "dúbravka": "BRATISLAVA",
  "rača": "BRATISLAVA",
  "vajnory": "BRATISLAVA",
  // Košice districts  
  "košice-juh": "KOSICE",
  "košice-západ": "KOSICE",
  "košice-sever": "KOSICE",
};

const CITY_SLUGS: Record<string, string> = {
  BRATISLAVA: "bratislava",
  KOSICE: "kosice",
  PRESOV: "presov",
  ZILINA: "zilina",
  BANSKA_BYSTRICA: "banska-bystrica",
  TRNAVA: "trnava",
  TRENCIN: "trencin",
  NITRA: "nitra",
};

// ============================================
// Helper Functions
// ============================================

function parseCity(text: string): { city: SlovakCity; district: string } | null {
  const normalized = text.toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  
  for (const [key, city] of Object.entries(CITY_MAP)) {
    const normalizedKey = key.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (normalized.includes(normalizedKey)) {
      const parts = text.split(/[,\-•–]/);
      const district = parts.length > 1 ? parts[1].trim() : parts[0].trim();
      return { city, district: district || "Centrum" };
    }
  }
  
  return null;
}

function parsePrice(text: string): number {
  const cleanText = text.replace(/\s+/g, "").replace(/[^\d]/g, "");
  const price = parseInt(cleanText, 10);
  
  if (price > 0 && price < 100000000) {
    return price;
  }
  return 0;
}

function parseArea(text: string): number {
  const match = text.match(/(\d+(?:[,\.]\d+)?)\s*m[²2]/i);
  if (match) {
    return parseFloat(match[1].replace(",", "."));
  }
  return 0;
}

function parseRooms(text: string): number | undefined {
  const match = text.match(/(\d+)\s*[-\s]?(?:izb|izbov)/i);
  return match ? parseInt(match[1], 10) : undefined;
}

// ============================================
// Browserless Connection
// ============================================

async function connectToBrowserless(): Promise<Browser> {
  const endpoint = process.env.BROWSER_WS_ENDPOINT;
  
  if (!endpoint) {
    throw new Error(
      "BROWSER_WS_ENDPOINT not configured. " +
      "Get your token from browserless.io and add: " +
      "BROWSER_WS_ENDPOINT=wss://production-sfo.browserless.io?token=YOUR_TOKEN"
    );
  }
  
  const { chromium } = await import("playwright-core");
  
  console.log("🌐 Connecting to Browserless...");
  const browser = await chromium.connect(endpoint);
  console.log("✅ Connected to Browserless");
  
  return browser;
}

// ============================================
// Scraping Functions
// ============================================

async function scrapeListPage(
  page: Page,
  config: PortalConfig,
  listingType: ListingType
): Promise<ScrapedProperty[]> {
  const properties: ScrapedProperty[] = [];
  
  // Wait for content to load
  await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(2000); // Extra wait for JS rendering
  
  // Find all listing items
  const items = await page.$$(config.selectors.listingItem);
  console.log(`Found ${items.length} listing items`);
  
  for (const item of items) {
    try {
      // Get link
      const linkElement = await item.$(config.selectors.link);
      const href = await linkElement?.getAttribute("href");
      if (!href) continue;
      
      // Get title
      const titleElement = await item.$(config.selectors.title);
      const title = await titleElement?.textContent() || "";
      if (!title.trim()) continue;
      
      // Get price
      const priceElement = await item.$(config.selectors.price);
      const priceText = await priceElement?.textContent() || "";
      const price = parsePrice(priceText);
      if (price === 0) continue;
      
      // Get area
      const areaElement = await item.$(config.selectors.area);
      const areaText = await areaElement?.textContent() || title;
      let area = parseArea(areaText);
      if (area === 0) area = parseArea(title);
      if (area === 0) area = 50; // Default
      
      // Get location
      const locationElement = await item.$(config.selectors.location);
      const locationText = await locationElement?.textContent() || title;
      const cityResult = parseCity(locationText);
      if (!cityResult) continue;
      
      // Parse rooms from title
      const rooms = parseRooms(title);
      
      // Build external ID from URL
      const idMatch = href.match(/\/(\d+)\/?(?:\?|$)|detail\/(\d+)|id[=\/](\d+)/i);
      const externalId = idMatch?.[1] || idMatch?.[2] || idMatch?.[3] || 
                         href.split("/").filter(Boolean).pop() || 
                         Date.now().toString();
      
      // Build full URL
      const sourceUrl = href.startsWith("http") ? href : `${config.baseUrl}${href}`;
      
      properties.push({
        externalId,
        source: config.source,
        title: title.trim().substring(0, 200),
        description: "",
        price,
        pricePerM2: Math.round(price / area),
        areaM2: area,
        city: cityResult.city,
        district: cityResult.district,
        rooms,
        listingType,
        sourceUrl,
      });
      
    } catch (error) {
      console.warn("Failed to parse listing item:", error);
    }
  }
  
  return properties;
}

export async function scrapePortal(
  portalKey: "NEHNUTELNOSTI" | "REALITY",
  options: {
    city?: SlovakCity;
    listingType?: ListingType;
    maxPages?: number;
    categoryPath?: string;
  } = {}
): Promise<ScrapeResult> {
  const startTime = Date.now();
  const config = PORTAL_CONFIGS[portalKey];
  const errors: string[] = [];
  const allProperties: ScrapedProperty[] = [];
  let pagesScraped = 0;
  
  const maxPages = options.maxPages || 3;
  const citySlug = options.city ? CITY_SLUGS[options.city] : "";
  
  let browser: Browser | null = null;
  
  try {
    browser = await connectToBrowserless();
    const context = await browser.newContext({
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      viewport: { width: 1920, height: 1080 },
      locale: "sk-SK",
    });
    
    // Block unnecessary resources
    await context.route("**/*.{png,jpg,jpeg,gif,webp,svg,woff,woff2}", route => route.abort());
    await context.route("**/analytics**", route => route.abort());
    await context.route("**/tracking**", route => route.abort());
    await context.route("**/facebook**", route => route.abort());
    await context.route("**/google-analytics**", route => route.abort());
    
    const page = await context.newPage();
    
    // Select categories to scrape
    const categories = options.categoryPath 
      ? config.categories.filter(c => c.path === options.categoryPath)
      : options.listingType
      ? config.categories.filter(c => c.listingType === options.listingType)
      : config.categories;
    
    for (const category of categories) {
      console.log(`\n📂 Scraping ${config.name} - ${category.name}`);
      
      let pageNum = 1;
      let hasNextPage = true;
      
      while (hasNextPage && pageNum <= maxPages) {
        // Build URL
        let url = `${config.baseUrl}${category.path}`;
        if (citySlug) url += `${citySlug}/`;
        if (pageNum > 1) {
          url += url.includes("?") ? `&page=${pageNum}` : `?page=${pageNum}`;
        }
        
        console.log(`  📄 Page ${pageNum}: ${url}`);
        
        try {
          await page.goto(url, { 
            waitUntil: "domcontentloaded",
            timeout: 30000 
          });
          
          const properties = await scrapeListPage(page, config, category.listingType);
          console.log(`  ✅ Found ${properties.length} properties`);
          
          allProperties.push(...properties);
          pagesScraped++;
          
          // Check for next page
          const nextButton = await page.$(config.selectors.nextPage);
          hasNextPage = !!nextButton && pageNum < maxPages;
          
          pageNum++;
          
          // Rate limiting
          await page.waitForTimeout(2000);
          
        } catch (error) {
          const errorMsg = `Error on page ${pageNum}: ${error instanceof Error ? error.message : "Unknown"}`;
          console.error(`  ❌ ${errorMsg}`);
          errors.push(errorMsg);
          hasNextPage = false;
        }
      }
    }
    
    await context.close();
    
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    errors.push(errorMsg);
    console.error("Scraping error:", errorMsg);
    
  } finally {
    if (browser) {
      await browser.close();
    }
  }
  
  const duration = Date.now() - startTime;
  
  console.log(`\n📊 Scraping complete:`);
  console.log(`  - Properties: ${allProperties.length}`);
  console.log(`  - Pages: ${pagesScraped}`);
  console.log(`  - Duration: ${(duration / 1000).toFixed(1)}s`);
  console.log(`  - Errors: ${errors.length}`);
  
  return {
    properties: allProperties,
    pagesScraped,
    errors,
    duration,
  };
}

// ============================================
// Test Function
// ============================================

export async function testBrowserlessConnection(): Promise<{
  success: boolean;
  message: string;
  browserVersion?: string;
}> {
  try {
    const browser = await connectToBrowserless();
    const version = browser.version();
    await browser.close();
    
    return {
      success: true,
      message: "Successfully connected to Browserless",
      browserVersion: version,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Connection failed",
    };
  }
}
