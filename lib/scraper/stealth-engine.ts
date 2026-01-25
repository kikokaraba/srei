// Stealth Data Engine - Anti-block scraper s rotáciou UA a jitter
// Navrhnutý pre bezpečné a stabilné scrapovanie slovenských realitných portálov

import * as cheerio from "cheerio";
import { prisma } from "@/lib/prisma";
import { parseDescription } from "./parser";
import { createPropertyFingerprint } from "@/lib/deduplication/fingerprint";

// Async wrapper pre fingerprint (nečakáme na dokončenie)
async function createPropertyFingerprintAsync(propertyId: string): Promise<void> {
  try {
    await createPropertyFingerprint(propertyId);
  } catch (error) {
    console.error(`Fingerprint creation failed for ${propertyId}:`, error);
  }
}

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
  maxPagesPerCategory: 20, // 20 strán = ~600 inzerátov na kategóriu
  maxRequestsPerSession: 200,
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
  city: string;
  district: string;
  condition: "NOVOSTAVBA" | "REKONSTRUKCIA" | "POVODNY";
  listingType: "PREDAJ" | "PRENAJOM";
  sourceUrl: string;
  source?: "BAZOS" | "NEHNUTELNOSTI" | "REALITY";
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
 * Mapovanie lokalít na štandardizované názvy miest
 * DÔLEŽITÉ: Špecifickejšie patterny (napr. "košice-staré mesto") musia byť PRED
 * všeobecnejšími (napr. "staré mesto"), inak sa matchnú nesprávne!
 */
const CITY_MAP: Record<string, string> = {
  // === KOŠICE - mestské časti (MUSIA byť pred "staré mesto" atď.) ===
  "košice-staré mesto": "KOSICE",
  "kosice-stare mesto": "KOSICE",
  "košice - staré mesto": "KOSICE",
  "košice-juh": "KOSICE",
  "kosice-juh": "KOSICE",
  "košice - juh": "KOSICE",
  "košice-západ": "KOSICE",
  "kosice-zapad": "KOSICE",
  "košice - západ": "KOSICE",
  "košice-sever": "KOSICE",
  "kosice-sever": "KOSICE",
  "košice - sever": "KOSICE",
  "košice-dargovských hrdinov": "KOSICE",
  "košice-sídlisko ťahanovce": "KOSICE",
  "košice-šaca": "KOSICE",
  "košice-barca": "KOSICE",
  "košice-nad jazerom": "KOSICE",
  "košice-krásna": "KOSICE",
  "košice-myslava": "KOSICE",
  "košice-pereš": "KOSICE",
  "košice-poľov": "KOSICE",
  "košice-kavečany": "KOSICE",
  "košice-lorinčík": "KOSICE",
  "šaca": "KOSICE",
  "ťahanovce": "KOSICE",
  "tahanovce": "KOSICE",
  "dargovských hrdinov": "KOSICE",
  "furča": "KOSICE",
  "terasa": "KOSICE",
  "kuzmányho": "KOSICE",
  
  // === HLAVNÉ MESTÁ ===
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
  
  // === BRATISLAVA - mestské časti ===
  "bratislava-staré mesto": "BRATISLAVA",
  "bratislava - staré mesto": "BRATISLAVA",
  "bratislava-nové mesto": "BRATISLAVA",
  "bratislava - nové mesto": "BRATISLAVA",
  "bratislava-petržalka": "BRATISLAVA",
  "bratislava-ružinov": "BRATISLAVA",
  "petržalka": "BRATISLAVA",
  "petrzalka": "BRATISLAVA",
  "ružinov": "BRATISLAVA",
  "ruzinov": "BRATISLAVA",
  "staré mesto bratislava": "BRATISLAVA",
  "nové mesto bratislava": "BRATISLAVA",
  "karlova ves": "BRATISLAVA",
  "dúbravka": "BRATISLAVA",
  "dubravka": "BRATISLAVA",
  "rača": "BRATISLAVA",
  "raca": "BRATISLAVA",
  "vajnory": "BRATISLAVA",
  "podunajské biskupice": "BRATISLAVA",
  "vrakuňa": "BRATISLAVA",
  "lamač": "BRATISLAVA",
  "devín": "BRATISLAVA",
  "devínska nová ves": "BRATISLAVA",
  "záhorská bystrica": "BRATISLAVA",
  "čunovo": "BRATISLAVA",
  "rusovce": "BRATISLAVA",
  "jarovce": "BRATISLAVA",
  
  // === GENERICKÉ MESTSKÉ ČASTI (na konci - matchnú len ak nič špecifické nenašlo) ===
  // Tieto by mali matchnúť len ak text neobsahuje "košice" ani "bratislava"
  // Ale pre istotu sú až na konci
  
  // === OKOLIE VEĽKÝCH MIEST ===
  "senec": "BRATISLAVA",
  "pezinok": "BRATISLAVA",
  "malacky": "BRATISLAVA",
  "stupava": "BRATISLAVA",
  "svätý jur": "BRATISLAVA",
  "modra": "BRATISLAVA",
  "bernolákovo": "BRATISLAVA",
  "ivanka pri dunaji": "BRATISLAVA",
  "chorvátsky grob": "BRATISLAVA",
  "michalovce": "KOSICE",
  "spišská nová ves": "KOSICE",
  "poprad": "PRESOV",
  "martin": "ZILINA",
  "ružomberok": "ZILINA",
  "liptovský mikuláš": "ZILINA",
  "prievidza": "TRENCIN",
  "považská bystrica": "TRENCIN",
  "levice": "NITRA",
  "komárno": "NITRA",
  "nové zámky": "NITRA",
  "dunajská streda": "TRNAVA",
  "piešťany": "TRNAVA",
  "hlohovec": "TRNAVA",
  "zvolen": "BANSKA_BYSTRICA",
  "lučenec": "BANSKA_BYSTRICA",
  "rimavská sobota": "BANSKA_BYSTRICA",
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
 * Používa longest-match stratégiu - preferuje dlhšie (špecifickejšie) patterny
 */
function extractCity(location: string): { city: string; district: string } {
  const normalized = location.toLowerCase().trim();
  
  // Nájdi všetky matchnuté patterny a vyber najdlhší
  let bestMatch: { pattern: string; city: string } | null = null;
  
  for (const [pattern, city] of Object.entries(CITY_MAP)) {
    if (normalized.includes(pattern)) {
      if (!bestMatch || pattern.length > bestMatch.pattern.length) {
        bestMatch = { pattern, city };
      }
    }
  }
  
  if (bestMatch) {
    // Extrahuj okres z pôvodného textu
    const parts = location.split(",").map(p => p.trim());
    return {
      city: bestMatch.city,
      district: parts[0] || location,
    };
  }
  
  // Skús ešte základné regex pre "Košice" alebo "Bratislava" v texte
  if (/košice|kosice/i.test(location)) {
    return { city: "KOSICE", district: location.split(",")[0]?.trim() || "Košice" };
  }
  if (/bratislava/i.test(location)) {
    return { city: "BRATISLAVA", district: location.split(",")[0]?.trim() || "Bratislava" };
  }
  
  // Default - NEZNÁME namiesto Bratislava (lepšie vidieť chyby)
  console.warn(`⚠️ Nepodarilo sa určiť mesto pre: "${location}"`);
  return {
    city: "BRATISLAVA", // Stále default BA pre kompatibilitu, ale aspoň logujeme
    district: location.split(",")[0]?.trim() || "Neznámy",
  };
}

/**
 * Parsuje jeden inzerát z Cheerio elementu
 * Bazoš HTML štruktúra (2025/2026):
 * - h2 obsahuje anchor s linkom na /inzerat/{id}/
 * - Nasledujúci text obsahuje popis
 * - Cena je v bold/strong (napr. "149 000 €")
 * - Lokalita a PSČ sú za cenou
 */
export function parseListingElement(
  $: cheerio.CheerioAPI,
  element: Parameters<typeof $>[0],
  baseUrl: string,
  listingType: "PREDAJ" | "PRENAJOM" = "PREDAJ"
): ParsedListing | null {
  try {
    const $el = $(element);
    
    // Element je h2 s linkom alebo wrapper
    let href: string | undefined;
    let title: string = "";
    
    // Ak je element h2, link je priamo v ňom
    if ($el.is("h2")) {
      const $link = $el.find("a[href*='/inzerat/']").first();
      href = $link.attr("href");
      title = $link.text().trim();
    } else {
      // Skús nájsť link v elemente
      const $link = $el.find("a[href*='/inzerat/']").first();
      if ($link.length) {
        href = $link.attr("href");
        title = $link.text().trim();
      } else if ($el.is("a[href*='/inzerat/']")) {
        href = $el.attr("href");
        title = $el.text().trim();
      }
    }
    
    if (!href) return null;
    
    const externalIdMatch = href.match(/inzerat\/(\d+)/);
    const externalId = externalIdMatch?.[1] || "";
    if (!externalId) return null;
    
    // Vyčisti title
    title = title.replace(/\s+/g, " ").trim();
    if (!title || title.length < 5) return null;
    
    // Získaj kontext okolo h2 - zbierame text z okolitých elementov
    const $parent = $el.parent();
    
    // Hľadaj cenu a lokalitu v blízkych elementoch
    let priceText = "";
    let locationText = "";
    let description = "";
    
    // Prejdi nasledujúce elementy (siblings)
    let $current = $el.next();
    let siblingCount = 0;
    const maxSiblings = 10;
    
    while ($current.length && siblingCount < maxSiblings) {
      const text = $current.text().trim();
      
      // Cena v bold
      if ($current.is("b, strong") || $current.find("b, strong").length) {
        const boldText = $current.is("b, strong") ? text : $current.find("b, strong").first().text();
        if (boldText.includes("€") || /\d{2,3}[\s\u00a0]?\d{3}/.test(boldText)) {
          priceText = boldText;
        }
      }
      
      // PSČ pattern pre lokalitu (napr. "Košice 040 01")
      const pscMatch = text.match(/^([A-ZÁÉÍÓÚÝČĎĽŇŘŠŤŽa-záéíóúýčďľňřšťž\s-]+?)\s*(\d{3}\s?\d{2})/);
      if (pscMatch && !locationText) {
        locationText = pscMatch[1].trim();
      }
      
      // Ak je to dlhší text bez PSČ, je to asi popis
      if (text.length > 50 && !text.includes("€") && !description) {
        description = text.substring(0, 500);
      }
      
      $current = $current.next();
      siblingCount++;
    }
    
    // Fallback - hľadaj cenu v najbližších nasledujúcich elementoch s € symbolom
    // NEPOUŽÍVAJ parent.text() - obsahuje všetky inzeráty!
    if (!priceText) {
      // Skús nájsť bold element v najbližších 5 súrodencoch
      let $search = $el.next();
      for (let i = 0; i < 5 && $search.length; i++) {
        const boldEl = $search.is("b, strong") ? $search : $search.find("b, strong").first();
        if (boldEl.length) {
          const boldText = boldEl.text().trim();
          if (boldText.includes("€")) {
            priceText = boldText;
            break;
          }
        }
        $search = $search.next();
      }
    }
    
    // Fallback pre lokalitu z title
    if (!locationText) {
      // Skús extrahovať mesto z title (napr. "3-izb. byt Košice-Západ")
      const cityMatch = title.match(/(?:Bratislava|Košice|Prešov|Žilina|Nitra|Trnava|Trenčín|Banská Bystrica)(?:[-\s][A-Za-záéíóúýčďľňřšťž]+)?/i);
      if (cityMatch) {
        locationText = cityMatch[0];
      }
    }
    
    // Extrahuj hodnoty
    const isRent = listingType === "PRENAJOM";
    const price = extractPrice(priceText, isRent);
    const areaM2 = extractArea(title + " " + description);
    const { city, district } = extractCity(locationText || title);
    
    // Validácia
    const minPrice = isRent ? 50 : 5000;
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
async function getAveragePrice(city: string, district: string): Promise<number | null> {
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

// ============================================================================
// NEHNUTELNOSTI.SK PARSER
// ============================================================================

/**
 * Parsuje inzerát z nehnutelnosti.sk (2025/2026 MUI štruktúra)
 */
export function parseNehnutelnostiElement(
  $: cheerio.CheerioAPI,
  element: Parameters<typeof $>[0],
  baseUrl: string,
  listingType: "PREDAJ" | "PRENAJOM" = "PREDAJ"
): ParsedListing | null {
  try {
    const $el = $(element);
    
    // Nehnutelnosti.sk teraz používa Material UI - extrahujeme dáta z elementu
    // Hľadáme link na detail
    let href = $el.find("a[href*='/detail/']").first().attr("href");
    if (!href && $el.is("a") && $el.attr("href")?.includes("/detail/")) {
      href = $el.attr("href");
    }
    if (!href) return null;
    
    // Extrahuj ID z URL - formát: /detail/ABC123/nazov-bytu
    const idMatch = href.match(/\/detail\/([A-Za-z0-9]+)\//);
    const externalId = idMatch?.[1] || href.split("/").filter(Boolean).pop() || "";
    if (!externalId || externalId.length < 3) return null;
    
    // Extrahuj text z celého elementu
    const fullText = $el.text().replace(/\s+/g, " ").trim();
    
    // Extrahuj cenu - hľadáme vzor "123 456 €" alebo "123456€"
    const priceMatch = fullText.match(/(\d[\d\s]*)\s*€/);
    let price = 0;
    if (priceMatch) {
      price = parseInt(priceMatch[1].replace(/\s/g, ""), 10);
    }
    
    // Extrahuj plochu - hľadáme vzor "72 m²" alebo "72m²"
    const areaMatch = fullText.match(/(\d+(?:[.,]\d+)?)\s*m[²2]/i);
    let areaM2 = areaMatch ? parseFloat(areaMatch[1].replace(",", ".")) : 0;
    
    // Extrahuj nadpis z URL alebo z textu
    let title = "";
    const urlParts = href.split("/").filter(Boolean);
    if (urlParts.length >= 2) {
      // Nadpis je zvyčajne posledná časť URL
      title = urlParts[urlParts.length - 1]
        .replace(/-/g, " ")
        .replace(/^\d+\s*/, "")
        .trim();
    }
    if (!title || title.length < 5) {
      // Skús nájsť MuiTypography-h5 alebo podobný
      title = $el.find("[class*='Typography-h'], [class*='Typography-body']").first().text().trim();
    }
    if (!title || title.length < 5) {
      title = `Byt ${areaM2}m² - ${listingType === "PRENAJOM" ? "prenájom" : "predaj"}`;
    }
    
    // Lokalita - hľadaj v texte
    const { city, district } = extractCity(fullText);
    
    // Validácia
    const isRent = listingType === "PRENAJOM";
    const minPrice = isRent ? 100 : 10000;
    if (price < minPrice) return null;
    
    const finalArea = areaM2 > 0 ? areaM2 : 50;
    const pricePerM2 = Math.round(price / finalArea);
    
    // Stav nehnuteľnosti
    const { condition } = parseDescription(fullText, title);
    
    return {
      externalId,
      title: title.substring(0, 200),
      description: fullText.substring(0, 500),
      price,
      pricePerM2,
      areaM2: finalArea,
      city,
      district: district || "Centrum",
      condition,
      listingType,
      sourceUrl: href.startsWith("http") ? href : `https://www.nehnutelnosti.sk${href}`,
      source: "NEHNUTELNOSTI",
    };
  } catch (error) {
    console.error("[Nehnutelnosti] Parse error:", error);
    return null;
  }
}

// ============================================================================
// REALITY.SK PARSER
// ============================================================================

/**
 * Parsuje inzerát z reality.sk
 */
export function parseRealityElement(
  $: cheerio.CheerioAPI,
  element: Parameters<typeof $>[0],
  baseUrl: string,
  listingType: "PREDAJ" | "PRENAJOM" = "PREDAJ"
): ParsedListing | null {
  try {
    const $el = $(element);
    
    // Selektory pre reality.sk
    const selectors = {
      link: "a[href*='/detail/'], a.estate-card__link, a[href*='/inzerat/']",
      title: ".estate-card__title, h2, .title, .nadpis",
      price: ".estate-card__price, .price, .cena",
      area: ".estate-card__area, .area, .vymera",
      location: ".estate-card__location, .location, .lokalita",
    };
    
    // Extrahuj link
    let href = $el.find(selectors.link).first().attr("href");
    if (!href && $el.is("a")) {
      href = $el.attr("href");
    }
    if (!href) return null;
    
    // Extrahuj ID
    const idMatch = href.match(/\/detail\/(\d+)|id=(\d+)|\/(\d+)\/?$/);
    const externalId = idMatch?.[1] || idMatch?.[2] || idMatch?.[3] || href.split("/").filter(Boolean).pop() || "";
    if (!externalId) return null;
    
    // Nadpis
    let title = $el.find(selectors.title).first().text().trim();
    if (!title) {
      title = $el.find("a").first().text().trim();
    }
    if (!title) return null;
    
    // Cena
    const priceText = $el.find(selectors.price).first().text().trim() || $el.text();
    const isRent = listingType === "PRENAJOM";
    const price = extractPrice(priceText, isRent);
    
    // Plocha
    const areaText = $el.find(selectors.area).first().text().trim() || $el.text();
    let areaM2 = extractArea(areaText);
    if (areaM2 === 0) {
      areaM2 = extractArea(title);
    }
    
    // Lokalita
    const locationText = $el.find(selectors.location).first().text().trim() || $el.text();
    const { city, district } = extractCity(locationText || title);
    
    // Validácia
    const minPrice = isRent ? 100 : 10000;
    if (price < minPrice) return null;
    
    const finalArea = areaM2 > 0 ? areaM2 : 50;
    const pricePerM2 = Math.round(price / finalArea);
    
    // Popis
    const description = $el.find(".description, .text").first().text().trim();
    const { condition } = parseDescription(description + " " + title, title);
    
    return {
      externalId,
      title: title.substring(0, 200),
      description: description.substring(0, 1000),
      price,
      pricePerM2,
      areaM2: finalArea,
      city,
      district: district || "Centrum",
      condition,
      listingType,
      sourceUrl: href.startsWith("http") ? href : `${baseUrl}${href}`,
      source: "REALITY",
    };
  } catch (error) {
    console.error("[Reality] Parse error:", error);
    return null;
  }
}

// ============================================================================
// DATABASE SYNC & MARKET GAP DETECTION
// ============================================================================

/**
 * Upsert nehnuteľnosti s Market Gap detection
 */
export async function syncProperty(listing: ParsedListing): Promise<SyncResult> {
  const source = listing.source || "BAZOS";
  const slug = `${source.toLowerCase()}-${listing.externalId}`;
  
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
      source: source, // Dynamický zdroj
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
  
  // Vytvor fingerprint pre deduplikáciu (async, nečakáme)
  createPropertyFingerprintAsync(property.id).catch(console.error);
  
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
 * Získa selektory pre daný zdroj
 */
function getSelectorsForSource(source: "BAZOS" | "NEHNUTELNOSTI" | "REALITY") {
  switch (source) {
    case "BAZOS":
      return {
        listing: [
          // Nová štruktúra 2025/2026 - h2 s linkom na inzerát
          "h2:has(a[href*='/inzerat/'])",
          // Fallback selektory
          ".inzeraty .inzerat",
          ".vypis .inzerat", 
          ".inzeratynadpis",
          "[class*='inzerat']",
        ],
        nextPage: ["a:contains('Ďalšia')", "a[href*='/20/']", "a[href*='/40/']"],
        nextPageText: ["ďalšia", "Ďalšia", "další", ">>"],
      };
    case "NEHNUTELNOSTI":
      return {
        listing: [
          // MUI-based selectors (2025/2026) - find grid items containing detail links
          "div.MuiGrid2-root:has(a[href*='/detail/'])",
          "div.MuiBox-root:has(a[href*='/detail/'])",
          "div.MuiStack-root:has(a[href*='/detail/'])",
          // Fallback selectors
          "a[href*='/detail/']",
        ],
        nextPage: ["a[href*='page=']", "a[rel='next']", ".MuiPagination-ul a"],
        nextPageText: ["ďalšia", "další", "next", ">>", "›", "2", "3"],
      };
    case "REALITY":
      return {
        listing: [
          ".estate-card",
          ".property-card",
          ".listing-item",
          ".inzerat",
          "article.estate",
          "[data-id]",
        ],
        nextPage: [".pagination a", ".paging a", "a[rel='next']"],
        nextPageText: ["ďalšia", "další", "next", ">>", "›"],
      };
  }
}

/**
 * Vytvára URL pre daný zdroj a mesto
 */
function buildCategoryUrl(
  baseUrl: string, 
  path: string, 
  city: string | undefined, 
  source: "BAZOS" | "NEHNUTELNOSTI" | "REALITY",
  page?: number
): string {
  let url = `${baseUrl}${path}`;
  
  if (source === "BAZOS") {
    if (city) {
      url += `?hlokalita=${encodeURIComponent(city)}&humkreis=25`;
    }
  } else if (source === "NEHNUTELNOSTI" || source === "REALITY") {
    if (city) {
      const slug = CITY_SLUGS[city] || city.toLowerCase().replace(/\s+/g, "-");
      url += `${slug}/`;
    }
    if (page && page > 1) {
      url += `?p=${page}`;
    }
  }
  
  return url;
}

/**
 * Generická funkcia pre scrapovanie kategórie z akéhokoľvek zdroja
 */
export async function scrapeCategory(
  category: ScrapingCategory,
  city?: string,
  config: Partial<StealthConfig> = {}
): Promise<ScraperStats> {
  const cfg = { ...DEFAULT_CONFIG, ...config };
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
  
  const { baseUrl, path, listingType, source } = category;
  const selectors = getSelectorsForSource(source);
  let categoryUrl = buildCategoryUrl(baseUrl, path, city, source);
  
  console.log(`\n🏠 [${source}] Starting scrape: ${categoryUrl}`);
  console.log(`⚙️ Config: maxPages=${cfg.maxPagesPerCategory}, delay=${cfg.minDelay}-${cfg.maxDelay}ms`);
  
  let currentUrl: string | undefined = categoryUrl;
  let referer = baseUrl;
  
  while (currentUrl && stats.pagesScraped < cfg.maxPagesPerCategory) {
    // Náhodný delay pred requestom
    if (stats.pagesScraped > 0) {
      const delay = getRandomDelay(cfg.minDelay, cfg.maxDelay);
      console.log(`⏳ Waiting ${Math.round(delay / 1000)}s before next page...`);
      await sleep(delay);
    }
    
    // Fetch stránky
    const result = await fetchWithRetry(currentUrl, { config: cfg, referer });
    
    if (!result.success) {
      console.error(`❌ [${source}] Failed to fetch: ${result.error}`);
      stats.errors++;
      stats.debug = { ...stats.debug, fetchError: result.error };
      
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
    const htmlLength = result.html?.length || 0;
    console.log(`📄 [${source}] HTML loaded: ${htmlLength} bytes`);
    
    // Nájdi listing elementy
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let listingElements: any[] = [];
    let usedSelector = "";
    
    for (const selector of selectors.listing) {
      const found = $(selector).toArray();
      if (found.length > 0) {
        listingElements = found;
        usedSelector = selector;
        break;
      }
    }
    
    console.log(`📄 [${source}] Page ${stats.pagesScraped}: Found ${listingElements.length} listings (selector: ${usedSelector || 'none'})`);
    
    stats.debug = {
      ...stats.debug,
      htmlLength,
      usedSelector: usedSelector || "none",
      htmlPreview: listingElements.length === 0 ? result.html?.substring(0, 1000) : undefined,
    };
    
    if (listingElements.length === 0 && result.html) {
      console.log(`⚠️ [${source}] No listings found. HTML preview: ${result.html.substring(0, 500)}...`);
    }
    
    // Spracuj každý inzerát podľa zdroja
    for (const element of listingElements) {
      let listing: ParsedListing | null = null;
      
      switch (source) {
        case "BAZOS":
          listing = parseListingElement($, element, baseUrl, listingType);
          if (listing) listing.source = "BAZOS";
          break;
        case "NEHNUTELNOSTI":
          listing = parseNehnutelnostiElement($, element, baseUrl, listingType);
          break;
        case "REALITY":
          listing = parseRealityElement($, element, baseUrl, listingType);
          break;
      }
      
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
          console.warn(`⚠️ [${source}] Sync error: ${error}`);
          stats.errors++;
        }
      }
    }
    
    // Nájdi odkaz na ďalšiu stránku
    currentUrl = undefined;
    for (const pageSelector of selectors.nextPage) {
      $(pageSelector).each((_, el) => {
        const text = $(el).text().toLowerCase();
        const href = $(el).attr("href");
        
        for (const keyword of selectors.nextPageText) {
          if (text.includes(keyword) && href) {
            currentUrl = href.startsWith("http") ? href : `${baseUrl}${href}`;
            return false; // break
          }
        }
      });
      if (currentUrl) break;
    }
  }
  
  stats.duration = Date.now() - startTime;
  
  console.log(`\n✅ [${source}] Scrape completed:`);
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
 * Scrapuje Bazoš kategóriu (zachované pre spätnú kompatibilitu)
 */
export async function scrapeBazosCategory(
  categoryPath: string,
  city?: string,
  config: Partial<StealthConfig> = {},
  options: CategoryOptions = {}
): Promise<ScraperStats> {
  const category: ScrapingCategory = {
    name: "Legacy",
    baseUrl: options.baseUrl || "https://reality.bazos.sk",
    path: categoryPath,
    listingType: options.listingType || "PREDAJ",
    source: "BAZOS",
  };
  
  return scrapeCategory(category, city, config);
}

/**
 * Definícia kategórií pre scraping
 * Podporujeme viaceré zdroje: Bazoš, Nehnutelnosti.sk, Reality.sk
 */
interface ScrapingCategory {
  name: string;
  baseUrl: string;
  path: string;
  listingType: "PREDAJ" | "PRENAJOM";
  source: "BAZOS" | "NEHNUTELNOSTI" | "REALITY";
}

// Bazoš kategórie - aktualizované URL 2025/2026
const BAZOS_CATEGORIES: ScrapingCategory[] = [
  { name: "Byty predaj", baseUrl: "https://reality.bazos.sk", path: "/predam/byt/", listingType: "PREDAJ", source: "BAZOS" },
  { name: "Domy predaj", baseUrl: "https://reality.bazos.sk", path: "/predam/dom/", listingType: "PREDAJ", source: "BAZOS" },
  { name: "Byty prenájom", baseUrl: "https://reality.bazos.sk", path: "/prenajmu/byt/", listingType: "PRENAJOM", source: "BAZOS" },
  { name: "Domy prenájom", baseUrl: "https://reality.bazos.sk", path: "/prenajmu/dom/", listingType: "PRENAJOM", source: "BAZOS" },
];

// Nehnutelnosti.sk kategórie
const NEHNUTELNOSTI_CATEGORIES: ScrapingCategory[] = [
  { name: "Byty predaj", baseUrl: "https://www.nehnutelnosti.sk", path: "/byty/predaj/", listingType: "PREDAJ", source: "NEHNUTELNOSTI" },
  { name: "Domy predaj", baseUrl: "https://www.nehnutelnosti.sk", path: "/domy/predaj/", listingType: "PREDAJ", source: "NEHNUTELNOSTI" },
  { name: "Byty prenájom", baseUrl: "https://www.nehnutelnosti.sk", path: "/byty/prenajom/", listingType: "PRENAJOM", source: "NEHNUTELNOSTI" },
  { name: "Domy prenájom", baseUrl: "https://www.nehnutelnosti.sk", path: "/domy/prenajom/", listingType: "PRENAJOM", source: "NEHNUTELNOSTI" },
];

// Reality.sk kategórie
const REALITY_CATEGORIES: ScrapingCategory[] = [
  { name: "Byty predaj", baseUrl: "https://www.reality.sk", path: "/byty/predaj/", listingType: "PREDAJ", source: "REALITY" },
  { name: "Domy predaj", baseUrl: "https://www.reality.sk", path: "/domy/predaj/", listingType: "PREDAJ", source: "REALITY" },
  { name: "Byty prenájom", baseUrl: "https://www.reality.sk", path: "/byty/prenajom/", listingType: "PRENAJOM", source: "REALITY" },
  { name: "Domy prenájom", baseUrl: "https://www.reality.sk", path: "/domy/prenajom/", listingType: "PRENAJOM", source: "REALITY" },
];

// Všetky kategórie
const SCRAPING_CATEGORIES: ScrapingCategory[] = [
  ...BAZOS_CATEGORIES,
  ...NEHNUTELNOSTI_CATEGORIES,
  ...REALITY_CATEGORIES,
];

// Slugy miest pre nehnutelnosti.sk a reality.sk
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

/**
 * Kompletný scrape všetkých kategórií zo všetkých zdrojov
 */
export async function runStealthScrape(
  cities?: string[],
  config?: Partial<StealthConfig>,
  options?: { 
    listingTypes?: ("PREDAJ" | "PRENAJOM")[];
    sources?: ("BAZOS" | "NEHNUTELNOSTI" | "REALITY")[];
  }
): Promise<{
  totalStats: ScraperStats;
  categoryStats: { category: string; source: string; city?: string; stats: ScraperStats }[];
}> {
  const targetCities = cities || ["Bratislava", "Košice", "Žilina"];
  const allowedTypes = options?.listingTypes || ["PREDAJ", "PRENAJOM"];
  const allowedSources = options?.sources || ["BAZOS", "NEHNUTELNOSTI", "REALITY"];
  
  // Filtruj kategórie podľa požadovaných typov a zdrojov
  const categories = SCRAPING_CATEGORIES.filter(
    c => allowedTypes.includes(c.listingType) && allowedSources.includes(c.source)
  );
  
  const categoryStats: { category: string; source: string; city?: string; stats: ScraperStats }[] = [];
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
  
  console.log("🚀 Starting Multi-Source Stealth Scrape Engine");
  console.log(`📍 Cities: ${targetCities.join(", ")}`);
  console.log(`🌐 Sources: ${allowedSources.join(", ")}`);
  console.log(`📂 Categories: ${categories.length} total`);
  
  // Groupuj kategórie podľa zdroja pre lepší prehľad
  const sourceGroups = allowedSources.map(source => ({
    source,
    categories: categories.filter(c => c.source === source),
  }));
  
  for (const { source, categories: sourceCats } of sourceGroups) {
    if (sourceCats.length === 0) continue;
    
    console.log(`\n${"=".repeat(50)}`);
    console.log(`🌐 Starting ${source} scrape...`);
    console.log(`${"=".repeat(50)}`);
    
    for (const city of targetCities) {
      for (const cat of sourceCats) {
        // Dlhší delay medzi kategóriami
        if (categoryStats.length > 0) {
          // Dlhší delay medzi rôznymi zdrojmi
          const isNewSource = categoryStats.length > 0 && 
            categoryStats[categoryStats.length - 1].source !== source;
          const longDelay = getRandomDelay(
            isNewSource ? 15000 : 8000, 
            isNewSource ? 30000 : 15000
          );
          console.log(`\n⏳ Waiting ${Math.round(longDelay / 1000)}s before next category...`);
          await sleep(longDelay);
        }
        
        const stats = await scrapeCategory(cat, city, config);
        
        categoryStats.push({ 
          category: cat.name, 
          source: cat.source,
          city, 
          stats 
        });
        
        // Akumuluj do total
        totalStats.pagesScraped += stats.pagesScraped;
        totalStats.listingsFound += stats.listingsFound;
        totalStats.newListings += stats.newListings;
        totalStats.updatedListings += stats.updatedListings;
        totalStats.hotDeals += stats.hotDeals;
        totalStats.errors += stats.errors;
        totalStats.duration += stats.duration;
        
        // Ak sme boli blokovaní na tomto zdroji, preskočíme ho
        if (stats.blocked) {
          console.error(`\n🚫 [${source}] BLOCKED! Skipping this source...`);
          break;
        }
      }
      
      // Ak sme boli blokovaní, prejdeme na ďalšie mesto
      const lastStat = categoryStats[categoryStats.length - 1];
      if (lastStat?.stats.blocked) {
        break;
      }
    }
  }
  
  // Spočítaj blocked sources
  const blockedSources = new Set(
    categoryStats.filter(s => s.stats.blocked).map(s => s.source)
  );
  
  // Log do databázy
  await prisma.dataFetchLog.create({
    data: {
      source: `STEALTH_${allowedSources.join("_")}`,
      status: blockedSources.size === allowedSources.length 
        ? "blocked" 
        : totalStats.errors > 0 || blockedSources.size > 0 
          ? "partial" 
          : "success",
      recordsCount: totalStats.newListings + totalStats.updatedListings,
      error: blockedSources.size > 0 
        ? `Blocked: ${Array.from(blockedSources).join(", ")} | Cities: ${targetCities.join(", ")}` 
        : null,
      duration_ms: totalStats.duration,
    },
  });
  
  console.log("\n" + "=".repeat(50));
  console.log("📊 TOTAL STATS (ALL SOURCES):");
  console.log(`   📄 Pages: ${totalStats.pagesScraped}`);
  console.log(`   🏠 Listings: ${totalStats.listingsFound}`);
  console.log(`   🆕 New: ${totalStats.newListings}`);
  console.log(`   🔄 Updated: ${totalStats.updatedListings}`);
  console.log(`   🔥 Hot Deals: ${totalStats.hotDeals}`);
  console.log(`   ❌ Errors: ${totalStats.errors}`);
  console.log(`   ⏱️ Duration: ${Math.round(totalStats.duration / 1000)}s`);
  if (blockedSources.size > 0) {
    console.log(`   🚫 Blocked: ${Array.from(blockedSources).join(", ")}`);
  }
  console.log("=".repeat(50));
  
  return { totalStats, categoryStats };
}

/**
 * Scrapuje len konkrétny zdroj
 */
export async function runSourceScrape(
  source: "BAZOS" | "NEHNUTELNOSTI" | "REALITY",
  cities?: string[],
  config?: Partial<StealthConfig>,
  options?: { listingTypes?: ("PREDAJ" | "PRENAJOM")[] }
): Promise<{
  totalStats: ScraperStats;
  categoryStats: { category: string; city?: string; stats: ScraperStats }[];
}> {
  const result = await runStealthScrape(cities, config, {
    ...options,
    sources: [source],
  });
  
  return {
    totalStats: result.totalStats,
    categoryStats: result.categoryStats.map(({ category, city, stats }) => ({
      category,
      city,
      stats,
    })),
  };
}

// Export pre použitie v API
export { 
  DEFAULT_CONFIG, 
  USER_AGENTS,
  SCRAPING_CATEGORIES,
  BAZOS_CATEGORIES,
  NEHNUTELNOSTI_CATEGORIES,
  REALITY_CATEGORIES,
};
export type { StealthConfig, ScraperStats, ParsedListing, ScrapingCategory };
