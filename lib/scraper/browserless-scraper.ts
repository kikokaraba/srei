/**
 * Browserless.io Scraper - REST API Version
 * 
 * Používa Browserless.io /scrape REST API pre rýchle a spoľahlivé scrapovanie
 * Výhody oproti WebSocket:
 * - Rýchlejšie - žiadne manažovanie browser state
 * - Spoľahlivejšie - Browserless rieši všetko
 * - Jednoduchšie - len POST requesty
 * 
 * Docs: https://docs.browserless.io/rest-apis/scrape
 */

import type { ListingType, PropertySource } from "@/generated/prisma/client";

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
  categories: {
    path: string;
    listingType: ListingType;
    name: string;
  }[];
}

// Browserless Scrape API response
interface BrowserlessScrapeResponse {
  data: Array<{
    selector: string;
    results: Array<{
      text: string;
      html: string;
      attributes: Array<{ name: string; value: string }>;
    }>;
  }>;
}

// ============================================
// Portal Configurations
// ============================================

const PORTAL_CONFIGS: Record<string, PortalConfig> = {
  NEHNUTELNOSTI: {
    name: "Nehnutelnosti.sk",
    baseUrl: "https://www.nehnutelnosti.sk",
    source: "NEHNUTELNOSTI",
    listingSelector: "[data-testid='search-result-card'], .MuiCard-root, article",
    categories: [
      { path: "/byty/predaj/", listingType: "PREDAJ", name: "Byty predaj" },
      { path: "/domy/predaj/", listingType: "PREDAJ", name: "Domy predaj" },
      { path: "/byty/prenajom/", listingType: "PRENAJOM", name: "Byty prenájom" },
      { path: "/domy/prenajom/", listingType: "PRENAJOM", name: "Domy prenájom" },
    ],
  },
  REALITY: {
    name: "Reality.sk",
    baseUrl: "https://www.reality.sk",
    source: "REALITY",
    listingSelector: ".estate-list__item, article.estate, .property-card",
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
    listingSelector: ".property-item, .estate-item, article.listing, [data-id]",
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
    listingSelector: ".inzeraty .inzerat, .vypis .inzerat, table.inzeraty tr",
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
  "levice": "Levice",
  "liptovský mikuláš": "Liptovský Mikuláš",
  "ružomberok": "Ružomberok",
  "humenné": "Humenné",
  "bardejov": "Bardejov",
  "senec": "Senec",
  "pezinok": "Pezinok",
  "malacky": "Malacky",
  "dunajská streda": "Dunajská Streda",
  "komárno": "Komárno",
  // Bratislava mestské časti
  "petržalka": "Bratislava",
  "ružinov": "Bratislava",
  "staré mesto": "Bratislava",
  "nové mesto": "Bratislava",
  "karlova ves": "Bratislava",
  "dúbravka": "Bratislava",
  "rača": "Bratislava",
};

// PSČ to City mapping for Bazoš
const PSC_TO_CITY: Record<string, string> = {
  "8": "Bratislava",
  "040": "Košice", "041": "Košice", "042": "Košice", "043": "Košice",
  "080": "Prešov", "081": "Prešov", "082": "Prešov",
  "010": "Žilina", "011": "Žilina", "012": "Žilina",
  "974": "Banská Bystrica", "975": "Banská Bystrica", "976": "Banská Bystrica",
  "917": "Trnava", "918": "Trnava", "919": "Trnava",
  "949": "Nitra", "950": "Nitra", "951": "Nitra",
  "911": "Trenčín", "912": "Trenčín", "913": "Trenčín",
};

// ============================================
// Helper Functions
// ============================================

function parseCity(text: string): { city: string; district: string } | null {
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
  
  // Fallback - extract first part
  const parts = text.split(/[,\-•–]/);
  if (parts.length > 0 && parts[0].trim().length > 2) {
    const extractedCity = parts[0].trim();
    const district = parts.length > 1 ? parts[1].trim() : "";
    const formattedCity = extractedCity.charAt(0).toUpperCase() + extractedCity.slice(1).toLowerCase();
    return { city: formattedCity, district: district || "Centrum" };
  }
  
  return null;
}

function parseCityFromPSC(text: string): string | null {
  const pscMatch = text.match(/(\d{3}\s?\d{2})/);
  if (pscMatch) {
    const psc = pscMatch[1].replace(/\s/g, "");
    // Check 3-digit prefix first
    const prefix3 = psc.substring(0, 3);
    if (PSC_TO_CITY[prefix3]) return PSC_TO_CITY[prefix3];
    // Check 1-digit prefix (for Bratislava)
    const prefix1 = psc.substring(0, 1);
    if (PSC_TO_CITY[prefix1]) return PSC_TO_CITY[prefix1];
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

function getApiToken(): string {
  const endpoint = process.env.BROWSER_WS_ENDPOINT || "";
  const tokenMatch = endpoint.match(/token=([^&]+)/);
  return tokenMatch?.[1] || "";
}

function getApiBaseUrl(): string {
  // Extract base URL from BROWSER_WS_ENDPOINT
  // wss://production-sfo.browserless.io?token=xxx -> https://production-sfo.browserless.io
  const endpoint = process.env.BROWSER_WS_ENDPOINT || "";
  const match = endpoint.match(/wss?:\/\/([^/?]+)/);
  return match ? `https://${match[1]}` : "https://production-sfo.browserless.io";
}

// ============================================
// Browserless REST API Scraper
// ============================================

/**
 * Scrape a single page using Browserless /scrape REST API
 */
async function scrapePageWithRestApi(
  url: string,
  config: PortalConfig,
  listingType: ListingType
): Promise<ScrapedProperty[]> {
  const token = getApiToken();
  const baseUrl = getApiBaseUrl();
  
  if (!token) {
    console.error("❌ BROWSER_WS_ENDPOINT not configured or missing token");
    return [];
  }

  const apiUrl = `${baseUrl}/scrape?token=${token}`;
  
  // Build request body based on Browserless docs
  const requestBody = {
    url,
    elements: [
      { selector: config.listingSelector }
    ],
    gotoOptions: {
      waitUntil: "networkidle2",
      timeout: 15000
    },
    // Block unnecessary resources for speed
    rejectResourceTypes: ["image", "font", "media", "stylesheet"],
    // Continue on errors
    bestAttempt: true,
    // Short wait after load
    waitForTimeout: 500
  };

  try {
    console.log(`  📄 Fetching: ${url}`);
    
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache"
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`  ❌ API Error ${response.status}: ${errorText.substring(0, 200)}`);
      return [];
    }

    const result = await response.json() as BrowserlessScrapeResponse;
    
    // Parse the results
    const properties: ScrapedProperty[] = [];
    
    if (!result.data || result.data.length === 0) {
      console.log(`  ⚠️ No data returned`);
      return [];
    }

    const listings = result.data[0]?.results || [];
    console.log(`  ✅ Found ${listings.length} raw listings`);

    for (const listing of listings) {
      try {
        const html = listing.html || "";
        const text = listing.text || "";
        
        // Skip empty or too short listings
        if (text.length < 20) continue;
        
        // Extract data from HTML/text
        const property = parseListingData(html, text, config, listingType, url);
        if (property) {
          properties.push(property);
        }
      } catch (error) {
        // Skip failed listings
      }
    }

    console.log(`  📦 Parsed ${properties.length} valid properties`);
    return properties;

  } catch (error) {
    console.error(`  ❌ Fetch error:`, error instanceof Error ? error.message : error);
    return [];
  }
}

/**
 * Parse listing data from HTML and text
 */
function parseListingData(
  html: string,
  text: string,
  config: PortalConfig,
  listingType: ListingType,
  pageUrl: string
): ScrapedProperty | null {
  // Extract title - usually first link or heading
  const titleMatch = html.match(/<a[^>]*>([^<]+)<\/a>/) || 
                     html.match(/<h[23][^>]*>([^<]+)<\/h[23]>/);
  const title = titleMatch?.[1]?.trim() || text.split("\n")[0]?.trim() || "";
  if (!title || title.length < 5) return null;

  // Extract link
  const linkMatch = html.match(/href="([^"]*(?:detail|inzerat|nehnutelnost)[^"]*)"/i) ||
                    html.match(/href="(\/[^"]+)"/);
  const href = linkMatch?.[1] || "";
  if (!href) return null;
  
  // Build full URL
  const sourceUrl = href.startsWith("http") ? href : `${config.baseUrl}${href}`;
  
  // Extract external ID
  const idMatch = href.match(/\/(\d+)\/?(?:\?|$)|detail\/(\d+)|id[=\/](\d+)|inzerat\/(\d+)/i);
  const externalId = idMatch?.[1] || idMatch?.[2] || idMatch?.[3] || idMatch?.[4] ||
                     href.split("/").filter(Boolean).pop() || Date.now().toString();

  // Extract price
  const priceMatch = text.match(/(\d[\d\s]*)\s*€/);
  let price = 0;
  if (priceMatch) {
    price = parseInt(priceMatch[1].replace(/\s/g, ""), 10);
  }
  
  // Minimum price check
  const minPrice = listingType === "PRENAJOM" ? 100 : 10000;
  if (price < minPrice) return null;

  // Extract area
  let area = parseArea(text);
  if (area === 0) area = parseArea(html);
  if (area === 0) area = 50; // Default

  // Extract location
  let cityResult = parseCity(text);
  if (!cityResult) {
    // Try PSC-based detection
    const cityFromPsc = parseCityFromPSC(text);
    if (cityFromPsc) {
      cityResult = { city: cityFromPsc, district: cityFromPsc };
    }
  }
  if (!cityResult) {
    // Default based on title
    if (title.toLowerCase().includes("bratislava")) {
      cityResult = { city: "Bratislava", district: "Bratislava" };
    } else if (title.toLowerCase().includes("košice")) {
      cityResult = { city: "Košice", district: "Košice" };
    } else {
      cityResult = { city: "Neznáme", district: "Neznáme" };
    }
  }

  // Extract rooms
  const rooms = parseRooms(text) || parseRooms(title);

  return {
    externalId,
    source: config.source,
    title: title.substring(0, 200),
    description: "",
    price,
    pricePerM2: Math.round(price / area),
    areaM2: area,
    city: cityResult.city,
    district: cityResult.district,
    rooms,
    listingType,
    sourceUrl,
  };
}

/**
 * Build URL for category page
 */
function buildCategoryUrl(config: PortalConfig, categoryPath: string, pageNum: number): string {
  let url = `${config.baseUrl}${categoryPath}`;
  
  if (config.source === "BAZOS") {
    // Bazoš uses offset
    if (pageNum > 1) {
      const offset = (pageNum - 1) * 20;
      url += `${offset}/`;
    }
  } else {
    // Other portals use page parameter
    if (pageNum > 1) {
      url += url.includes("?") ? `&page=${pageNum}` : `?page=${pageNum}`;
    }
  }
  
  return url;
}

// ============================================
// Main Scraping Function
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

  console.log(`\n📦 Scraping ${config.name}...`);

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
        const url = buildCategoryUrl(config, category.path, pageNum);
        const properties = await scrapePageWithRestApi(url, config, category.listingType);
        
        allProperties.push(...properties);
        pagesScraped++;

        // Stop if we got less than 5 results (probably last page)
        if (properties.length < 5) {
          console.log(`  ⏹️ Reached last page`);
          break;
        }

        // Small delay between pages to avoid rate limiting
        await new Promise(r => setTimeout(r, 300));

      } catch (error) {
        const errorMsg = `Error on page ${pageNum}: ${error instanceof Error ? error.message : "Unknown"}`;
        console.error(`  ❌ ${errorMsg}`);
        errors.push(errorMsg);
      }
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
// Test Function
// ============================================

export async function testBrowserlessConnection(): Promise<{
  success: boolean;
  message: string;
  browserVersion?: string;
}> {
  const token = getApiToken();
  const baseUrl = getApiBaseUrl();
  
  if (!token) {
    return {
      success: false,
      message: "BROWSER_WS_ENDPOINT not configured or missing token",
    };
  }

  try {
    // Test with a simple scrape request
    const response = await fetch(`${baseUrl}/scrape?token=${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: "https://example.com",
        elements: [{ selector: "h1" }],
        gotoOptions: { timeout: 5000 }
      })
    });

    if (response.ok) {
      return {
        success: true,
        message: "Successfully connected to Browserless REST API",
        browserVersion: "REST API v2",
      };
    } else {
      return {
        success: false,
        message: `API returned ${response.status}: ${response.statusText}`,
      };
    }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Connection failed",
    };
  }
}

export { PORTAL_CONFIGS };
