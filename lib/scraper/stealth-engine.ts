// Stealth Data Engine - Anti-block scraper s rotáciou UA a jitter
// Navrhnutý pre bezpečné a stabilné scrapovanie slovenských realitných portálov

import * as cheerio from "cheerio";
import { prisma } from "@/lib/prisma";
import type { SlovakCity } from "@/generated/prisma/client";
import { parseDescription } from "./parser";

// ============================================================================
// KONFIGURÁCIA
// ============================================================================

/**
 * Rotácia User-Agentov - 10 reálnych prehliadačov
 */
const USER_AGENTS = [
  // Chrome Windows
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
  // Chrome Mac
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  // Firefox Windows
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
  // Firefox Mac
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0",
  // Safari Mac
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15",
  // Edge Windows
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0",
  // Chrome Linux
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  // Mobile Chrome Android
  "Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
  // Mobile Safari iPhone
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1",
];

/**
 * Konfigurácia stealth engine
 */
interface StealthConfig {
  // Jitter - náhodné oneskorenie medzi requestami (ms)
  minDelay: number;
  maxDelay: number;
  
  // Retry konfigurácia
  maxRetries: number;
  baseBackoff: number; // ms
  maxBackoff: number;  // ms
  
  // Limity pre bezpečné scrapovanie
  maxPagesPerCategory: number;
  maxRequestsPerSession: number;
  
  // Proxy (voliteľné)
  proxyUrl?: string;
  scraperApiKey?: string;
}

const DEFAULT_CONFIG: StealthConfig = {
  minDelay: 3000,  // 3 sekundy
  maxDelay: 7000,  // 7 sekúnd
  maxRetries: 5,
  baseBackoff: 2000,
  maxBackoff: 60000, // 1 minúta max
  maxPagesPerCategory: 3, // Len prvé 3 strany
  maxRequestsPerSession: 50,
};

// ============================================================================
// UTILITY FUNKCIE
// ============================================================================

/**
 * Náhodný výber User-Agenta
 */
function getRandomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

/**
 * Náhodný jitter delay (simulácia ľudského správania)
 */
function getRandomDelay(min: number = DEFAULT_CONFIG.minDelay, max: number = DEFAULT_CONFIG.maxDelay): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Sleep s náhodným jitterom
 */
async function sleep(ms: number): Promise<void> {
  const jitter = Math.floor(Math.random() * 500); // ±500ms jitter
  return new Promise(resolve => setTimeout(resolve, ms + jitter));
}

/**
 * Exponenciálny backoff kalkulácia
 */
function calculateBackoff(attempt: number, base: number = DEFAULT_CONFIG.baseBackoff): number {
  const backoff = base * Math.pow(2, attempt);
  const jitter = Math.random() * 1000;
  return Math.min(backoff + jitter, DEFAULT_CONFIG.maxBackoff);
}

// ============================================================================
// FETCH WITH RETRY + ANTI-BLOCK
// ============================================================================

interface FetchOptions {
  config?: Partial<StealthConfig>;
  referer?: string;
}

interface FetchResult {
  success: boolean;
  html?: string;
  statusCode?: number;
  error?: string;
  retryCount: number;
}

/**
 * Fetch s rotáciou UA, jitter a exponenciálnym backoff
 * Pripravené na integráciu s proxy službami (ScraperAPI, Bright Data)
 */
export async function fetchWithRetry(
  url: string,
  options: FetchOptions = {}
): Promise<FetchResult> {
  const config = { ...DEFAULT_CONFIG, ...options.config };
  let lastError: string = "";
  
  for (let attempt = 0; attempt < config.maxRetries; attempt++) {
    try {
      // Rotuj User-Agent pre každý pokus
      const userAgent = getRandomUserAgent();
      
      // Priprav URL - podpora pre ScraperAPI
      let fetchUrl = url;
      const headers: Record<string, string> = {
        "User-Agent": userAgent,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "sk-SK,sk;q=0.9,cs;q=0.8,en-US;q=0.7,en;q=0.6",
        "Accept-Encoding": "gzip, deflate, br",
        "Connection": "keep-alive",
        "Upgrade-Insecure-Requests": "1",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "same-origin",
        "Cache-Control": "max-age=0",
      };
      
      // Pridaj referer ak je k dispozícii
      if (options.referer) {
        headers["Referer"] = options.referer;
      }
      
      // ScraperAPI integrácia (ak je nastavená)
      if (config.scraperApiKey) {
        fetchUrl = `http://api.scraperapi.com?api_key=${config.scraperApiKey}&url=${encodeURIComponent(url)}&country_code=sk`;
      }
      
      // Proxy integrácia (ak je nastavená)
      const fetchOptions: RequestInit = {
        headers,
        redirect: "follow",
      };
      
      console.log(`🌐 Attempt ${attempt + 1}/${config.maxRetries}: ${url.substring(0, 60)}...`);
      
      const response = await fetch(fetchUrl, fetchOptions);
      
      // Úspech
      if (response.ok) {
        const html = await response.text();
        
        // Validácia - skontroluj či sme nedostali captcha alebo block page
        if (html.includes("captcha") || html.includes("blocked") || html.includes("Access Denied")) {
          throw new Error("CAPTCHA_DETECTED");
        }
        
        return {
          success: true,
          html,
          statusCode: response.status,
          retryCount: attempt,
        };
      }
      
      // HTTP 403 Forbidden - pravdepodobne blokovaný
      if (response.status === 403) {
        console.warn(`⚠️ HTTP 403 - Pravdepodobne blokovaný. Čakám na backoff...`);
        lastError = "HTTP 403 Forbidden - Blocked";
        
        const backoff = calculateBackoff(attempt);
        console.log(`⏳ Backoff: ${Math.round(backoff / 1000)}s`);
        await sleep(backoff);
        continue;
      }
      
      // HTTP 429 Too Many Requests
      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get("retry-after") || "60", 10);
        console.warn(`⚠️ HTTP 429 - Rate limited. Čakám ${retryAfter}s...`);
        lastError = "HTTP 429 Too Many Requests";
        
        await sleep(retryAfter * 1000);
        continue;
      }
      
      // Iné chyby
      lastError = `HTTP ${response.status}`;
      const backoff = calculateBackoff(attempt);
      await sleep(backoff);
      
    } catch (error) {
      lastError = error instanceof Error ? error.message : "Unknown error";
      
      // CAPTCHA detekovaná - dlhší backoff
      if (lastError === "CAPTCHA_DETECTED") {
        console.error("🚫 CAPTCHA detekovaná! Zastavujem na 5 minút...");
        await sleep(5 * 60 * 1000);
        continue;
      }
      
      // Network error - kratší backoff
      const backoff = calculateBackoff(attempt);
      console.warn(`❌ Error: ${lastError}. Backoff: ${Math.round(backoff / 1000)}s`);
      await sleep(backoff);
    }
  }
  
  return {
    success: false,
    error: lastError,
    retryCount: DEFAULT_CONFIG.maxRetries,
  };
}

// ============================================================================
// INTELIGENTNÝ PARSING
// ============================================================================

interface ParsedListing {
  externalId: string;
  title: string;
  description: string;
  price: number;
  pricePerM2: number;
  areaM2: number;
  city: SlovakCity;
  district: string;
  condition: "NOVOSTAVBA" | "REKONSTRUKCIA" | "POVODNY";
  listingType: "PREDAJ" | "PRENAJOM";
  sourceUrl: string;
}

/**
 * Regex patterny pre extrakciu dát
 * Vylepšené pre rôzne formáty cien na Bazoši
 */
const PATTERNS = {
  // Cena - viacero formátov:
  // "149 000 €", "149000€", "149 000€", "1 200 000 €", "85000 €"
  price: /(\d{1,3}[\s\u00a0.,]?\d{3}[\s\u00a0.,]?\d{0,3})\s*€/i,
  // Alternatívne formáty bez €
  priceAlt: /(\d{1,3}[\s\u00a0.,]?\d{3}[\s\u00a0.,]?\d{0,3})\s*(?:eur|euro)/i,
  // Prenájom - mesačne
  priceRent: /(\d{2,4})\s*€\s*(?:\/\s*mes|mesačne|mes\.)/i,
  // Plocha
  area: /(\d{2,4}(?:[,\.]\d{1,2})?)\s*m[²2]/i,
  areaAlt: /(\d{2,4})\s*(?:štvorcov|metrov|m2)/i,
};

/**
 * Mapovanie lokalít na SlovakCity enum
 */
const CITY_MAP: Record<string, SlovakCity> = {
  // Hlavné mestá
  "bratislava": "BRATISLAVA",
  "košice": "KOSICE",
  "kosice": "KOSICE",
  "prešov": "PRESOV",
  "presov": "PRESOV",
  "žilina": "ZILINA",
  "zilina": "ZILINA",
  "banská bystrica": "BANSKA_BYSTRICA",
  "banska bystrica": "BANSKA_BYSTRICA",
  "b. bystrica": "BANSKA_BYSTRICA",
  "trnava": "TRNAVA",
  "trenčín": "TRENCIN",
  "trencin": "TRENCIN",
  "nitra": "NITRA",
  
  // Bratislava - mestské časti
  "petržalka": "BRATISLAVA",
  "petrzalka": "BRATISLAVA",
  "ružinov": "BRATISLAVA",
  "ruzinov": "BRATISLAVA",
  "staré mesto": "BRATISLAVA",
  "stare mesto": "BRATISLAVA",
  "nové mesto": "BRATISLAVA",
  "nove mesto": "BRATISLAVA",
  "karlova ves": "BRATISLAVA",
  "dúbravka": "BRATISLAVA",
  "dubravka": "BRATISLAVA",
  "rača": "BRATISLAVA",
  "raca": "BRATISLAVA",
  "vajnory": "BRATISLAVA",
  "podunajské biskupice": "BRATISLAVA",
  "vrakuňa": "BRATISLAVA",
  
  // Košice - mestské časti
  "košice-staré mesto": "KOSICE",
  "košice-juh": "KOSICE",
  "košice-západ": "KOSICE",
  "košice-sever": "KOSICE",
  "šaca": "KOSICE",
  
  // Okolie veľkých miest (mapujeme na najbližšie veľké mesto)
  "senec": "BRATISLAVA",
  "pezinok": "BRATISLAVA",
  "malacky": "BRATISLAVA",
  "stupava": "BRATISLAVA",
};

/**
 * Extrahuje cenu z textu
 */
function extractPrice(text: string, isRent: boolean = false): number {
  // Pre prenájom hľadáme mesačnú cenu
  if (isRent) {
    const rentMatch = text.match(PATTERNS.priceRent);
    if (rentMatch) {
      return parseInt(rentMatch[1].replace(/[\s\u00a0.,]/g, ""), 10);
    }
  }
  
  // Štandardná cena
  let match = text.match(PATTERNS.price);
  if (match) {
    // Odstráň medzery, bodky, čiarky a konvertuj
    const cleanPrice = match[1].replace(/[\s\u00a0.,]/g, "");
    const price = parseInt(cleanPrice, 10);
    
    // Validácia - cena musí byť rozumná
    if (price > 0 && price < 100000000) {
      return price;
    }
  }
  
  // Skús alternatívny formát (EUR bez symbolu €)
  match = text.match(PATTERNS.priceAlt);
  if (match) {
    const cleanPrice = match[1].replace(/[\s\u00a0.,]/g, "");
    return parseInt(cleanPrice, 10);
  }
  
  // Posledný pokus - nájdi akékoľvek číslo s 5-6 ciframi (typická cena bytu)
  const fallbackMatch = text.match(/(\d{5,7})/);
  if (fallbackMatch) {
    return parseInt(fallbackMatch[1], 10);
  }
  
  return 0;
}

/**
 * Extrahuje plochu z textu
 */
function extractArea(text: string): number {
  let match = text.match(PATTERNS.area);
  if (match) {
    return parseFloat(match[1].replace(",", "."));
  }
  
  match = text.match(PATTERNS.areaAlt);
  if (match) {
    return parseFloat(match[1]);
  }
  
  return 0;
}

/**
 * Extrahuje mesto z lokácie
 */
function extractCity(location: string): { city: SlovakCity; district: string } {
  const normalized = location.toLowerCase().trim();
  
  for (const [pattern, city] of Object.entries(CITY_MAP)) {
    if (normalized.includes(pattern)) {
      // Extrahuj okres
      const parts = location.split(",").map(p => p.trim());
      return {
        city,
        district: parts[0] || location,
      };
    }
  }
  
  // Default
  return {
    city: "BRATISLAVA",
    district: location.split(",")[0]?.trim() || "Neznámy",
  };
}

/**
 * Parsuje jeden inzerát z Cheerio elementu
 * Bazoš HTML štruktúra (2024/2025):
 * - .inzeratynadpis obsahuje nadpis s linkom
 * - Nasledujúci element obsahuje popis
 * - Cena je v <b> tagu
 * - Lokalita je text s mestom a PSČ
 */
export function parseListingElement(
  $: cheerio.CheerioAPI,
  element: Parameters<typeof $>[0],
  baseUrl: string,
  listingType: "PREDAJ" | "PRENAJOM" = "PREDAJ"
): ParsedListing | null {
  try {
    const $el = $(element);
    
    // Extrahuj link a externalId - hľadáme v aktuálnom elemente aj v rodičovi
    let href = $el.find("a[href*='/inzerat/']").first().attr("href");
    if (!href) {
      href = $el.closest("a[href*='/inzerat/']").first().attr("href");
    }
    if (!href && $el.is("a")) {
      const elHref = $el.attr("href");
      if (elHref?.includes("/inzerat/")) {
        href = elHref;
      }
    }
    if (!href) return null;
    
    const externalIdMatch = href.match(/inzerat\/(\d+)/);
    const externalId = externalIdMatch?.[1] || "";
    if (!externalId) return null;
    
    // Nadpis - môže byť v h2, alebo priamo text linku
    let title = $el.find("h2").first().text().trim();
    if (!title) {
      title = $el.find("a[href*='/inzerat/']").first().text().trim();
    }
    if (!title) {
      title = $el.text().trim().split("\n")[0] || "";
    }
    
    // Získaj rodičovský kontajner pre viac info
    const $parent = $el.parent();
    const $grandparent = $parent.parent();
    const fullText = $grandparent.text();
    
    // Popis - hľadáme v nasledujúcom elemente alebo v texte
    let description = "";
    const $nextSibling = $el.next();
    if ($nextSibling.length) {
      description = $nextSibling.text().trim();
    }
    
    // Cena - hľadáme v bold texte alebo s € symbolom
    let priceText = "";
    $grandparent.find("b, strong").each((_, el) => {
      const text = $(el).text();
      if (text.includes("€") || /\d{2,3}\s?\d{3}/.test(text)) {
        priceText = text;
        return false; // break
      }
    });
    
    // Ak sme nenašli cenu v bold, skúsime regex na celý text
    if (!priceText) {
      const priceMatch = fullText.match(/(\d{1,3}[\s\u00a0]?\d{3}[\s\u00a0]?\d{3}|\d{2,3}[\s\u00a0]?\d{3})\s*€/);
      if (priceMatch) {
        priceText = priceMatch[0];
      }
    }
    
    // Lokalita - hľadáme PSČ pattern (3 číslice medzera 2 číslice) alebo názov mesta
    let locationText = "";
    const pscMatch = fullText.match(/([A-ZÁÉÍÓÚÝČĎĽŇŘŠŤŽa-záéíóúýčďľňřšťž\s]+)\s*(\d{3}\s?\d{2})/);
    if (pscMatch) {
      locationText = pscMatch[1].trim();
    }
    
    // Extrahuj hodnoty - pre prenájom iná logika
    const isRent = listingType === "PRENAJOM";
    const price = extractPrice(priceText, isRent);
    const areaM2 = extractArea(title + " " + description + " " + fullText);
    const { city, district } = extractCity(locationText || title);
    
    // Validácia - pre prenájom nižšia minimálna cena
    const minPrice = isRent ? 100 : 10000;
    if (price < minPrice) {
      return null;
    }
    
    // Ak nemáme plochu, skúsime ju odhadnúť z názvu alebo preskočíme
    const finalArea = areaM2 > 0 ? areaM2 : 50; // Default 50m² ak nenájdeme
    
    // Vypočítaj cenu za m²
    const pricePerM2 = Math.round(price / finalArea);
    
    // Extrahuj stav z popisu
    const { condition } = parseDescription(description + " " + title, title);
    
    return {
      externalId,
      title: title.substring(0, 200) || "Bez názvu",
      description: description.substring(0, 1000),
      price,
      pricePerM2,
      areaM2: finalArea,
      city,
      district: district || "Centrum",
      condition,
      listingType,
      sourceUrl: href.startsWith("http") ? href : `${baseUrl}${href}`,
    };
  } catch (error) {
    console.error("Parse error:", error);
    return null;
  }
}

// ============================================================================
// DATABASE SYNC & MARKET GAP DETECTION
// ============================================================================

interface SyncResult {
  isNew: boolean;
  isHotDeal: boolean;
  propertyId: string;
  gapPercentage?: number;
}

/**
 * Získa priemernú cenu pre lokalitu
 */
async function getAveragePrice(city: SlovakCity, district: string): Promise<number | null> {
  // Najprv skús StreetAnalytics
  const streetAvg = await prisma.streetAnalytics.findFirst({
    where: {
      city,
      district: { contains: district, mode: "insensitive" },
    },
    select: { avg_price_m2: true },
  });
  
  if (streetAvg?.avg_price_m2) {
    return streetAvg.avg_price_m2;
  }
  
  // Fallback na MarketAnalytics
  const marketAvg = await prisma.marketAnalytics.findFirst({
    where: { city },
    select: { avg_price_m2: true },
    orderBy: { timestamp: "desc" },
  });
  
  if (marketAvg?.avg_price_m2) {
    return marketAvg.avg_price_m2;
  }
  
  // Fallback na priemer z Property tabuľky
  const propAvg = await prisma.property.aggregate({
    where: { city },
    _avg: { price_per_m2: true },
  });
  
  return propAvg._avg.price_per_m2 || null;
}

/**
 * Upsert nehnuteľnosti s Market Gap detection
 */
export async function syncProperty(listing: ParsedListing): Promise<SyncResult> {
  const slug = `bazos-${listing.externalId}`;
  
  // Skontroluj či existuje
  const existing = await prisma.property.findFirst({
    where: {
      OR: [
        { slug },
        { source_url: listing.sourceUrl },
      ],
    },
  });
  
  if (existing) {
    // Existuje - aktualizuj len last_seen_at
    await prisma.property.update({
      where: { id: existing.id },
      data: { updatedAt: new Date() },
    });
    
    return {
      isNew: false,
      isHotDeal: existing.is_distressed || false,
      propertyId: existing.id,
    };
  }
  
  // Nový inzerát - skontroluj Market Gap
  const avgPrice = await getAveragePrice(listing.city, listing.district);
  let isHotDeal = false;
  let gapPercentage: number | undefined;
  
  if (avgPrice && avgPrice > 0) {
    gapPercentage = ((avgPrice - listing.pricePerM2) / avgPrice) * 100;
    
    // Je o 15% lacnejší ako priemer = Hot Deal
    if (gapPercentage >= 15) {
      isHotDeal = true;
      console.log(`🔥 HOT DEAL: ${listing.title} - ${gapPercentage.toFixed(1)}% pod priemerom!`);
    }
  }
  
  // Vytvor nový záznam
  const property = await prisma.property.create({
    data: {
      slug,
      external_id: listing.externalId,
      source: "BAZOS", // Bazos scraper
      title: listing.title,
      description: listing.description,
      city: listing.city,
      district: listing.district,
      address: `${listing.district}, ${listing.city}`, // Adresa z lokácie
      price: listing.price,
      area_m2: listing.areaM2,
      price_per_m2: listing.pricePerM2,
      condition: listing.condition,
      energy_certificate: "NONE", // Default, ak nie je špecifikovaný
      listing_type: listing.listingType, // Predaj alebo prenájom
      source_url: listing.sourceUrl,
      is_distressed: isHotDeal, // Používame is_distressed ako is_hot_deal
      first_listed_at: new Date(),
    },
  });
  
  // Ulož Market Gap ak existuje
  if (gapPercentage && gapPercentage > 0) {
    await prisma.marketGap.create({
      data: {
        propertyId: property.id,
        gap_percentage: gapPercentage,
        street_avg_price: avgPrice!,
        potential_profit: Math.round((avgPrice! - listing.pricePerM2) * listing.areaM2),
      },
    });
  }
  
  // Pridaj do price history
  await prisma.priceHistory.create({
    data: {
      propertyId: property.id,
      price: listing.price,
      price_per_m2: listing.pricePerM2,
    },
  });
  
  return {
    isNew: true,
    isHotDeal,
    propertyId: property.id,
    gapPercentage,
  };
}

// ============================================================================
// HLAVNÝ SCRAPER
// ============================================================================

interface ScraperStats {
  pagesScraped: number;
  listingsFound: number;
  newListings: number;
  updatedListings: number;
  hotDeals: number;
  errors: number;
  duration: number;
  blocked: boolean;
  debug?: {
    htmlLength?: number;
    usedSelector?: string;
    htmlPreview?: string;
    fetchError?: string;
  };
}

interface CategoryOptions {
  listingType?: "PREDAJ" | "PRENAJOM";
  baseUrl?: string;
}

/**
 * Scrapuje Bazoš kategóriu (byty/domy) pre dané mesto
 */
export async function scrapeBazosCategory(
  category: string,
  city?: string,
  config: Partial<StealthConfig> = {},
  options: CategoryOptions = {}
): Promise<ScraperStats> {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const listingType = options.listingType || "PREDAJ";
  const startTime = Date.now();
  const stats: ScraperStats = {
    pagesScraped: 0,
    listingsFound: 0,
    newListings: 0,
    updatedListings: 0,
    hotDeals: 0,
    errors: 0,
    duration: 0,
    blocked: false,
    debug: {},
  };
  
  const baseUrl = options.baseUrl || "https://reality.bazos.sk";
  // Bazoš URL štruktúra: základná URL s query parametrami
  // Príklad: https://reality.bazos.sk/byty/?hlokalita=Nitra&humkreis=25
  let categoryUrl = `${baseUrl}${category}`;
  
  // Pridaj mesto do URL ak je špecifikované
  if (city) {
    // Bazoš hľadá podľa lokality cez parameter "hlokalita"
    categoryUrl += `?hlokalita=${encodeURIComponent(city)}&humkreis=25`;
  }
  
  console.log(`\n🏠 Starting scrape: ${categoryUrl}`);
  console.log(`⚙️ Config: maxPages=${cfg.maxPagesPerCategory}, delay=${cfg.minDelay}-${cfg.maxDelay}ms`);
  
  let currentUrl: string | undefined = categoryUrl;
  let referer = baseUrl;
  
  while (currentUrl && stats.pagesScraped < cfg.maxPagesPerCategory) {
    // Náhodný delay pred requestom (simulácia ľudského správania)
    if (stats.pagesScraped > 0) {
      const delay = getRandomDelay(cfg.minDelay, cfg.maxDelay);
      console.log(`⏳ Waiting ${Math.round(delay / 1000)}s before next page...`);
      await sleep(delay);
    }
    
    // Fetch stránky
    const result = await fetchWithRetry(currentUrl, { config: cfg, referer });
    
    if (!result.success) {
      console.error(`❌ Failed to fetch: ${result.error}`);
      stats.errors++;
      stats.debug = { ...stats.debug, fetchError: result.error };
      
      // Ak sme boli blokovaní, zastavíme
      if (result.error?.includes("403") || result.error?.includes("CAPTCHA")) {
        stats.blocked = true;
        break;
      }
      
      break;
    }
    
    stats.pagesScraped++;
    referer = currentUrl;
    
    // Parse HTML
    const $ = cheerio.load(result.html!);
    
    // Debug: Loguj HTML snippet pre diagnostiku
    const htmlLength = result.html?.length || 0;
    console.log(`📄 HTML loaded: ${htmlLength} bytes`);
    
    // Bazoš 2024/2025 selektory - skúšame viacero variantov
    const selectors = [
      ".inzeraty .inzerat",
      ".vypis .inzerat", 
      ".inzeratynadpis",
      ".inzeratyflex",
      "[class*='inzerat']",
      ".nadpis",
      "table.inzeraty tr",
    ];
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let listingElements: any[] = [];
    let usedSelector = "";
    
    for (const selector of selectors) {
      const found = $(selector).toArray();
      if (found.length > 0) {
        listingElements = found;
        usedSelector = selector;
        break;
      }
    }
    
    console.log(`📄 Page ${stats.pagesScraped}: Found ${listingElements.length} listings (selector: ${usedSelector || 'none'})`);
    
    // Debug: Uložíme debug info
    stats.debug = {
      ...stats.debug,
      htmlLength: htmlLength,
      usedSelector: usedSelector || "none",
      htmlPreview: listingElements.length === 0 ? result.html?.substring(0, 1000) : undefined,
    };
    
    // Debug: Ak nič nenašiel, ukáž prvých 500 znakov HTML
    if (listingElements.length === 0 && result.html) {
      console.log(`⚠️ No listings found. HTML preview: ${result.html.substring(0, 500)}...`);
    }
    
    // Spracuj každý inzerát
    for (const element of listingElements) {
      const listing = parseListingElement($, element, baseUrl, listingType);
      
      if (listing) {
        stats.listingsFound++;
        
        try {
          const syncResult = await syncProperty(listing);
          
          if (syncResult.isNew) {
            stats.newListings++;
          } else {
            stats.updatedListings++;
          }
          
          if (syncResult.isHotDeal) {
            stats.hotDeals++;
          }
        } catch (error) {
          console.warn(`⚠️ Sync error: ${error}`);
          stats.errors++;
        }
      }
    }
    
    // Nájdi odkaz na ďalšiu stránku
    currentUrl = undefined;
    $(".strankovani a, .pagination a").each((_, el) => {
      const text = $(el).text().toLowerCase();
      if (text.includes("ďalšia") || text.includes("další") || text === ">>") {
        const href = $(el).attr("href");
        if (href) {
          currentUrl = href.startsWith("http") ? href : `${baseUrl}${href}`;
        }
      }
    });
  }
  
  stats.duration = Date.now() - startTime;
  
  console.log(`\n✅ Scrape completed:`);
  console.log(`   📄 Pages: ${stats.pagesScraped}`);
  console.log(`   🏠 Listings: ${stats.listingsFound}`);
  console.log(`   🆕 New: ${stats.newListings}`);
  console.log(`   🔄 Updated: ${stats.updatedListings}`);
  console.log(`   🔥 Hot Deals: ${stats.hotDeals}`);
  console.log(`   ❌ Errors: ${stats.errors}`);
  console.log(`   ⏱️ Duration: ${Math.round(stats.duration / 1000)}s`);
  
  return stats;
}

/**
 * Definícia kategórií pre scraping
 * Bazoš má rôzne subdomény pre predaj a prenájom
 */
interface ScrapingCategory {
  name: string;
  baseUrl: string;
  path: string;
  listingType: "PREDAJ" | "PRENAJOM";
}

const SCRAPING_CATEGORIES: ScrapingCategory[] = [
  // Predaj - reality.bazos.sk
  { name: "Byty predaj", baseUrl: "https://reality.bazos.sk", path: "/byty/", listingType: "PREDAJ" },
  { name: "Domy predaj", baseUrl: "https://reality.bazos.sk", path: "/domy/", listingType: "PREDAJ" },
  // Prenájom - prenajom.bazos.sk  
  { name: "Byty prenájom", baseUrl: "https://reality.bazos.sk", path: "/prenajom/byty/", listingType: "PRENAJOM" },
  { name: "Domy prenájom", baseUrl: "https://reality.bazos.sk", path: "/prenajom/domy/", listingType: "PRENAJOM" },
];

/**
 * Kompletný scrape všetkých kategórií
 */
export async function runStealthScrape(
  cities?: string[],
  config?: Partial<StealthConfig>,
  options?: { listingTypes?: ("PREDAJ" | "PRENAJOM")[] }
): Promise<{
  totalStats: ScraperStats;
  categoryStats: { category: string; city?: string; stats: ScraperStats }[];
}> {
  const targetCities = cities || ["Bratislava", "Košice", "Žilina"];
  const allowedTypes = options?.listingTypes || ["PREDAJ", "PRENAJOM"];
  
  // Filtruj kategórie podľa požadovaných typov
  const categories = SCRAPING_CATEGORIES.filter(c => allowedTypes.includes(c.listingType));
  
  const categoryStats: { category: string; city?: string; stats: ScraperStats }[] = [];
  const totalStats: ScraperStats = {
    pagesScraped: 0,
    listingsFound: 0,
    newListings: 0,
    updatedListings: 0,
    hotDeals: 0,
    errors: 0,
    duration: 0,
    blocked: false,
  };
  
  console.log("🚀 Starting Stealth Scrape Engine");
  console.log(`📍 Cities: ${targetCities.join(", ")}`);
  console.log(`📂 Categories: ${categories.map(c => c.name).join(", ")}`);
  
  for (const city of targetCities) {
    for (const cat of categories) {
      // Dlhší delay medzi mestami/kategóriami
      if (categoryStats.length > 0) {
        const longDelay = getRandomDelay(10000, 20000);
        console.log(`\n⏳ Waiting ${Math.round(longDelay / 1000)}s before next category...`);
        await sleep(longDelay);
      }
      
      const stats = await scrapeBazosCategory(
        cat.path, 
        city, 
        config,
        { listingType: cat.listingType, baseUrl: cat.baseUrl }
      );
      
      categoryStats.push({ category: cat.name, city, stats });
      
      // Akumuluj do total
      totalStats.pagesScraped += stats.pagesScraped;
      totalStats.listingsFound += stats.listingsFound;
      totalStats.newListings += stats.newListings;
      totalStats.updatedListings += stats.updatedListings;
      totalStats.hotDeals += stats.hotDeals;
      totalStats.errors += stats.errors;
      totalStats.duration += stats.duration;
      
      // Ak sme boli blokovaní, zastavíme
      if (stats.blocked) {
        console.error("\n🚫 BLOCKED! Stopping scrape to prevent IP ban.");
        totalStats.blocked = true;
        break;
      }
    }
    
    if (totalStats.blocked) break;
  }
  
  // Log do databázy
  await prisma.dataFetchLog.create({
    data: {
      source: "STEALTH_BAZOS",
      status: totalStats.blocked ? "blocked" : totalStats.errors > 0 ? "partial" : "success",
      recordsCount: totalStats.newListings + totalStats.updatedListings,
      error: totalStats.blocked ? "IP blocked or CAPTCHA detected" : null,
      duration_ms: totalStats.duration,
    },
  });
  
  console.log("\n" + "=".repeat(50));
  console.log("📊 TOTAL STATS:");
  console.log(`   📄 Pages: ${totalStats.pagesScraped}`);
  console.log(`   🏠 Listings: ${totalStats.listingsFound}`);
  console.log(`   🆕 New: ${totalStats.newListings}`);
  console.log(`   🔄 Updated: ${totalStats.updatedListings}`);
  console.log(`   🔥 Hot Deals: ${totalStats.hotDeals}`);
  console.log(`   ❌ Errors: ${totalStats.errors}`);
  console.log(`   ⏱️ Duration: ${Math.round(totalStats.duration / 1000)}s`);
  console.log("=".repeat(50));
  
  return { totalStats, categoryStats };
}

// Export pre použitie v API
export { DEFAULT_CONFIG, USER_AGENTS };
export type { StealthConfig, ScraperStats, ParsedListing };
