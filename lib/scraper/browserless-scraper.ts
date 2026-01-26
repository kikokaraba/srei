/**
 * Browserless.io BaaS Scraper
 * 
 * Používa Browserless.io Browsers as a Service (BaaS) s Playwright
 * Docs: https://docs.browserless.io/baas/start
 * 
 * Kľúčové funkcie:
 * - Stealth mode pre obídenie bot detekcie
 * - Playwright connectOverCDP pre spoľahlivé pripojenie
 * - Optimalizované launch options
 */

import type { ListingType, PropertySource } from "@/generated/prisma";

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
  city: string;
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
  listingSelector: string;
  selectors: {
    title: string;
    price: string;
    area: string;
    location: string;
    link: string;
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

export const PORTAL_CONFIGS: Record<string, PortalConfig> = {
  NEHNUTELNOSTI: {
    name: "Nehnutelnosti.sk",
    baseUrl: "https://www.nehnutelnosti.sk",
    source: "NEHNUTELNOSTI",
    listingSelector: "article, [data-testid='search-result-card'], .advertisement-item, .MuiBox-root a[href*='/detail/']",
    selectors: {
      title: "h2 a, h3 a, [data-testid='title'] a, .advertisement-item__title a",
      price: ".advertisement-item__price, [data-testid='price'], .price, span:has-text('€')",
      area: ".advertisement-item__info, [data-testid='area'], .area, span:has-text('m²')",
      location: ".advertisement-item__location, [data-testid='location'], .location",
      link: "a[href*='/detail/']",
    },
    categories: [
      // Len predaj - najdôležitejšie kategórie
      { path: "/byty/predaj/", listingType: "PREDAJ", name: "Byty predaj" },
      { path: "/domy/predaj/", listingType: "PREDAJ", name: "Domy predaj" },
    ],
  },
  REALITY: {
    name: "Reality.sk",
    baseUrl: "https://www.reality.sk",
    source: "REALITY",
    listingSelector: ".estate-list__item, article.estate, .property-item",
    selectors: {
      title: ".estate-list__title a, h2 a, .title a",
      price: ".estate-list__price, .price",
      area: ".estate-list__area, .area",
      location: ".estate-list__location, .location",
      link: "a[href*='/detail/']",
    },
    categories: [
      { path: "/byty/predaj/", listingType: "PREDAJ", name: "Byty predaj" },
      { path: "/domy/predaj/", listingType: "PREDAJ", name: "Domy predaj" },
      { path: "/byty/prenajom/", listingType: "PRENAJOM", name: "Byty prenájom" },
      { path: "/domy/prenajom/", listingType: "PRENAJOM", name: "Domy prenájom" },
    ],
  },
  TOPREALITY: {
    name: "TopReality.sk",
    baseUrl: "https://www.topreality.sk",
    source: "TOPREALITY",
    listingSelector: ".property-item, .estate-item, article, [data-id]",
    selectors: {
      title: ".property-title a, h2 a, .title a",
      price: ".property-price, .price",
      area: ".property-area, .area",
      location: ".property-location, .location",
      link: "a[href*='/detail/'], a[href*='/inzerat/']",
    },
    categories: [
      { path: "/vyhladavanie/predaj/byty/", listingType: "PREDAJ", name: "Byty predaj" },
      { path: "/vyhladavanie/predaj/domy/", listingType: "PREDAJ", name: "Domy predaj" },
      { path: "/vyhladavanie/prenajom/byty/", listingType: "PRENAJOM", name: "Byty prenájom" },
      { path: "/vyhladavanie/prenajom/domy/", listingType: "PRENAJOM", name: "Domy prenájom" },
    ],
  },
  BAZOS: {
    name: "Bazoš Reality",
    baseUrl: "https://reality.bazos.sk",
    source: "BAZOS",
    listingSelector: ".inzeraty .inzerat, .vypis .inzerat, .inzeraty tr.inzerat",
    selectors: {
      title: "a[href*='/inzerat/']",
      price: "b, strong, .cena",
      area: "span:has-text('m²'), span:has-text('m2')",
      location: ".psc, span:has-text('0'), span:has-text('8'), span:has-text('9')",
      link: "a[href*='/inzerat/']",
    },
    categories: [
      { path: "/predam/byt/", listingType: "PREDAJ", name: "Byty predaj" },
      { path: "/predam/dom/", listingType: "PREDAJ", name: "Domy predaj" },
      { path: "/prenajmu/byt/", listingType: "PRENAJOM", name: "Byty prenájom" },
      { path: "/prenajmu/dom/", listingType: "PRENAJOM", name: "Domy prenájom" },
    ],
  },
};

// ============================================
// City Mapping
// ============================================

const CITY_MAP: Record<string, string> = {
  "bratislava": "Bratislava",
  "košice": "Košice", "kosice": "Košice",
  "prešov": "Prešov", "presov": "Prešov",
  "žilina": "Žilina", "zilina": "Žilina",
  "banská bystrica": "Banská Bystrica", "banska bystrica": "Banská Bystrica",
  "trnava": "Trnava",
  "trenčín": "Trenčín", "trencin": "Trenčín",
  "nitra": "Nitra",
  "poprad": "Poprad",
  "martin": "Martin",
  "zvolen": "Zvolen",
  "prievidza": "Prievidza",
  "nové zámky": "Nové Zámky",
  "michalovce": "Michalovce",
  "piešťany": "Piešťany",
  "senec": "Senec",
  "pezinok": "Pezinok",
  "malacky": "Malacky",
  "petržalka": "Bratislava",
  "ružinov": "Bratislava",
  "staré mesto": "Bratislava",
  "dúbravka": "Bratislava",
  "karlova ves": "Bratislava",
};

// PSČ to City mapping
const PSC_TO_CITY: Record<string, string> = {
  "8": "Bratislava",
  "040": "Košice", "041": "Košice", "042": "Košice", "043": "Košice",
  "080": "Prešov", "081": "Prešov", "082": "Prešov",
  "010": "Žilina", "011": "Žilina", "012": "Žilina",
  "974": "Banská Bystrica", "975": "Banská Bystrica",
  "917": "Trnava", "918": "Trnava",
  "949": "Nitra", "950": "Nitra",
  "911": "Trenčín", "912": "Trenčín",
};

// ============================================
// Helper Functions
// ============================================

function parseCity(text: string): { city: string; district: string } | null {
  const normalized = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  
  for (const [key, city] of Object.entries(CITY_MAP)) {
    const normalizedKey = key.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (normalized.includes(normalizedKey)) {
      const parts = text.split(/[,\-•–]/);
      const district = parts.length > 1 ? parts[1].trim() : parts[0].trim();
      return { city, district: district || "Centrum" };
    }
  }
  
  // PSČ detection
  const pscMatch = text.match(/(\d{3}\s?\d{2})/);
  if (pscMatch) {
    const psc = pscMatch[1].replace(/\s/g, "");
    const prefix3 = psc.substring(0, 3);
    if (PSC_TO_CITY[prefix3]) return { city: PSC_TO_CITY[prefix3], district: PSC_TO_CITY[prefix3] };
    const prefix1 = psc.substring(0, 1);
    if (PSC_TO_CITY[prefix1]) return { city: PSC_TO_CITY[prefix1], district: PSC_TO_CITY[prefix1] };
  }
  
  return null;
}

function parsePrice(text: string): number {
  const cleanText = text.replace(/\s+/g, "").replace(/[^\d]/g, "");
  const price = parseInt(cleanText, 10);
  return (price > 0 && price < 100000000) ? price : 0;
}

function parseArea(text: string): number {
  const match = text.match(/(\d+(?:[,\.]\d+)?)\s*m[²2]/i);
  return match ? parseFloat(match[1].replace(",", ".")) : 0;
}

function parseRooms(text: string): number | undefined {
  const match = text.match(/(\d+)\s*[-\s]?(?:izb|izbov)/i);
  return match ? parseInt(match[1], 10) : undefined;
}

/**
 * Build Browserless WebSocket URL with stealth mode
 * Based on: https://docs.browserless.io/baas/launch-options
 */
function buildBrowserlessUrl(): string {
  const endpoint = process.env.BROWSER_WS_ENDPOINT || "";
  
  // Extract token
  const tokenMatch = endpoint.match(/token=([^&]+)/);
  const token = tokenMatch?.[1] || "";
  
  if (!token) {
    throw new Error("BROWSER_WS_ENDPOINT not configured. Set: wss://production-sfo.browserless.io?token=YOUR_TOKEN");
  }
  
  // Use stealth route for better anti-detection
  // Docs: https://docs.browserless.io/baas/bot-detection/stealth
  const launchOptions = {
    headless: true,
    stealth: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-accelerated-2d-canvas",
      "--disable-gpu",
      "--window-size=1920,1080",
    ],
  };
  
  const queryParams = new URLSearchParams({
    token,
    launch: JSON.stringify(launchOptions),
  });
  
  // Use /stealth route for best anti-detection
  return `wss://production-sfo.browserless.io/stealth?${queryParams.toString()}`;
}

// ============================================
// Main Scraping Function using BaaS
// ============================================

export async function scrapePortal(
  portalKey: "BAZOS" | "NEHNUTELNOSTI" | "REALITY" | "TOPREALITY",
  options: {
    city?: string;
    listingType?: ListingType;
    maxPages?: number;
    categoryPath?: string;
  } = {}
): Promise<ScrapeResult> {
  const startTime = Date.now();
  const config = PORTAL_CONFIGS[portalKey];
  
  if (!config) {
    return {
      properties: [],
      pagesScraped: 0,
      errors: [`Unknown portal: ${portalKey}`],
      duration: 0,
    };
  }

  const errors: string[] = [];
  const allProperties: ScrapedProperty[] = [];
  let pagesScraped = 0;
  const maxPages = options.maxPages || 3;

  console.log(`\n📦 Scraping ${config.name} with Browserless BaaS...`);

  // Dynamic import of playwright-core
  const { chromium } = await import("playwright-core");
  
  let browser;
  
  try {
    // Connect to Browserless using CDP (recommended method)
    // Docs: https://docs.browserless.io/baas/quick-start
    const wsUrl = buildBrowserlessUrl();
    console.log("🔗 Connecting to Browserless...");
    
    browser = await chromium.connectOverCDP(wsUrl, {
      timeout: 30000,
    });
    
    console.log("✅ Connected to Browserless");
    
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      locale: "sk-SK",
    });
    
    // Block unnecessary resources for speed
    await context.route("**/*.{png,jpg,jpeg,gif,webp,svg,woff,woff2,ico}", route => route.abort());
    await context.route("**/analytics**", route => route.abort());
    await context.route("**/google-analytics**", route => route.abort());
    await context.route("**/facebook**", route => route.abort());
    
    const page = await context.newPage();
    
    // Select categories
    const categories = options.categoryPath 
      ? config.categories.filter(c => c.path === options.categoryPath)
      : options.listingType
      ? config.categories.filter(c => c.listingType === options.listingType)
      : config.categories;

    for (const category of categories) {
      console.log(`\n📂 ${category.name}`);
      
      for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
        try {
          // Build URL
          let url = `${config.baseUrl}${category.path}`;
          if (portalKey === "BAZOS" && pageNum > 1) {
            url += `${(pageNum - 1) * 20}/`;
          } else if (pageNum > 1) {
            url += url.includes("?") ? `&page=${pageNum}` : `?page=${pageNum}`;
          }
          
          console.log(`  📄 Page ${pageNum}: ${url}`);
          
          await page.goto(url, { 
            waitUntil: "domcontentloaded",
            timeout: 20000,
          });
          
          // Wait for content
          await page.waitForTimeout(1000);
          
          // Get all listings
          const listings = await page.$$(config.listingSelector);
          console.log(`  📋 Found ${listings.length} listings`);
          
          for (const listing of listings) {
            try {
              // Get link and title
              const linkEl = await listing.$(config.selectors.link);
              if (!linkEl) continue;
              
              const href = await linkEl.getAttribute("href");
              const title = await linkEl.textContent();
              if (!href || !title?.trim()) continue;
              
              // Get price
              const priceEl = await listing.$(config.selectors.price);
              const priceText = await priceEl?.textContent() || "";
              const price = parsePrice(priceText);
              
              const minPrice = category.listingType === "PRENAJOM" ? 100 : 10000;
              if (price < minPrice) continue;
              
              // Get area
              let area = 0;
              const areaEl = await listing.$(config.selectors.area);
              if (areaEl) {
                const areaText = await areaEl.textContent() || "";
                area = parseArea(areaText);
              }
              if (area === 0) area = parseArea(title);
              if (area === 0) area = 50;
              
              // Get location
              let cityResult = parseCity(title);
              if (!cityResult) {
                const locEl = await listing.$(config.selectors.location);
                if (locEl) {
                  const locText = await locEl.textContent() || "";
                  cityResult = parseCity(locText);
                }
              }
              if (!cityResult) {
                cityResult = { city: "Neznáme", district: "Neznáme" };
              }
              
              // Extract ID
              const idMatch = href.match(/\/(\d+)\/?(?:\?|$)|detail\/(\d+)|inzerat\/(\d+)/i);
              const externalId = idMatch?.[1] || idMatch?.[2] || idMatch?.[3] || 
                                 href.split("/").filter(Boolean).pop() || Date.now().toString();
              
              // Build URL
              const sourceUrl = href.startsWith("http") ? href : `${config.baseUrl}${href}`;
              
              allProperties.push({
                externalId,
                source: config.source,
                title: title.trim().substring(0, 200),
                description: "",
                price,
                pricePerM2: Math.round(price / area),
                areaM2: area,
                city: cityResult.city,
                district: cityResult.district,
                rooms: parseRooms(title),
                listingType: category.listingType,
                sourceUrl,
              });
              
            } catch (e) {
              // Skip individual listing errors
            }
          }
          
          pagesScraped++;
          
          // Stop if less than 5 results
          if (listings.length < 5) {
            console.log(`  ⏹️ Reached last page`);
            break;
          }
          
          // Small delay between pages
          await page.waitForTimeout(500);
          
        } catch (error) {
          const errorMsg = `Error on page ${pageNum}: ${error instanceof Error ? error.message : "Unknown"}`;
          console.error(`  ❌ ${errorMsg}`);
          errors.push(errorMsg);
        }
      }
    }
    
    await context.close();
    
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    errors.push(errorMsg);
    console.error("❌ Scraping error:", errorMsg);
  } finally {
    if (browser) {
      await browser.close();
    }
  }

  const duration = Date.now() - startTime;

  console.log(`\n📊 ${config.name} Complete:`);
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
// Test Connection
// ============================================

export async function testBrowserlessConnection(): Promise<{
  success: boolean;
  message: string;
  browserVersion?: string;
}> {
  try {
    const wsUrl = buildBrowserlessUrl();
    const { chromium } = await import("playwright-core");
    
    console.log("Testing Browserless connection...");
    const browser = await chromium.connectOverCDP(wsUrl, { timeout: 15000 });
    const version = browser.version();
    await browser.close();
    
    return {
      success: true,
      message: "Successfully connected to Browserless BaaS with stealth mode",
      browserVersion: version,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Connection failed",
    };
  }
}
