// Bazoš Scraper - Scraper pre reality.bazos.sk

import type { RawListingData, ParsedListingData, ScrapeError, ScraperConfig } from "./types";
import { parseDescription, parsePrice, parseArea } from "./parser";

/**
 * Konfigurácia pre Bazoš
 */
export const BAZOS_CONFIG: ScraperConfig = {
  source: "BAZOS",
  baseUrl: "https://reality.bazos.sk",
  rateLimit: 30, // 30 requests per minute
  maxPages: 50,
  retryAttempts: 3,
  userAgent: "Mozilla/5.0 (compatible; SRIA-Bot/1.0; +https://sria.sk/bot)",
};

/**
 * Mapovanie Bazoš regiónov na štandardizované názvy miest
 */
const BAZOS_CITY_MAP: Record<string, string> = {
  "bratislava": "BRATISLAVA",
  "kosice": "KOSICE",
  "presov": "PRESOV",
  "zilina": "ZILINA",
  "banska-bystrica": "BANSKA_BYSTRICA",
  "banska bystrica": "BANSKA_BYSTRICA",
  "trnava": "TRNAVA",
  "trencin": "TRENCIN",
  "nitra": "NITRA",
  // Okresy mapované na mestá
  "petrzalka": "BRATISLAVA",
  "ruzinov": "BRATISLAVA",
  "nove-mesto": "BRATISLAVA",
  "stare-mesto": "BRATISLAVA",
  "karlova-ves": "BRATISLAVA",
  "dubravka": "BRATISLAVA",
};

/**
 * Parsuje lokáciu z Bazoš formátu
 */
export function parseLocation(locationRaw: string): {
  city: string;
  district: string;
  street?: string;
} {
  const normalized = locationRaw.toLowerCase().trim();
  
  // Skús nájsť mesto
  for (const [pattern, city] of Object.entries(BAZOS_CITY_MAP)) {
    if (normalized.includes(pattern)) {
      // Extrahuj okres (časť pred/za mestom)
      const parts = locationRaw.split(",").map(p => p.trim());
      const district = parts.length > 1 ? parts[0] : parts[0];
      const street = parts.length > 2 ? parts[1] : undefined;
      
      return { city, district, street };
    }
  }
  
  // Default - Bratislava ak sa nedá určiť
  return {
    city: "BRATISLAVA",
    district: locationRaw.split(",")[0]?.trim() || "Neznámy",
    street: undefined,
  };
}

/**
 * Parsuje cenu z Bazoš formátu ("159 000 €" alebo "159000€")
 */
export function parseBazosPrice(priceRaw: string): number {
  // Odstráň všetko okrem číslic
  const digits = priceRaw.replace(/[^\d]/g, "");
  const price = parseInt(digits, 10);
  
  // Validácia - realistická cena bytu je 30k - 2M €
  if (price >= 30000 && price <= 2000000) {
    return price;
  }
  
  // Možno je cena v tisícoch (159 = 159 000)
  if (price >= 30 && price <= 2000) {
    return price * 1000;
  }
  
  return 0;
}

/**
 * Parsuje plochu z Bazoš formátu ("85 m²" alebo "85m2")
 */
export function parseBazosArea(areaRaw: string): number {
  const match = areaRaw.match(/(\d+)/);
  if (match) {
    const area = parseInt(match[1], 10);
    // Validácia - realistická plocha bytu je 15-500 m²
    if (area >= 15 && area <= 500) {
      return area;
    }
  }
  return 0;
}

/**
 * Extrahuje externalId z URL
 */
export function extractExternalId(url: string): string {
  // Format: https://reality.bazos.sk/inzerat/12345678/...
  const match = url.match(/inzerat\/(\d+)/);
  return match ? match[1] : url;
}

/**
 * Scrapuje jednu stránku s výpisom inzerátov
 * POZNÁMKA: Toto je mock implementácia - v produkcii by sa použil puppeteer/playwright
 */
export async function scrapeListingPage(pageUrl: string): Promise<{
  listings: RawListingData[];
  nextPageUrl?: string;
  errors: ScrapeError[];
}> {
  const errors: ScrapeError[] = [];
  
  try {
    // V produkcii by sme použili puppeteer alebo playwright
    // Pre teraz simulujeme fetch
    const response = await fetch(pageUrl, {
      headers: {
        "User-Agent": BAZOS_CONFIG.userAgent,
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "sk-SK,sk;q=0.9",
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const html = await response.text();
    
    // Detekcia zmeny štruktúry - hľadáme kľúčové elementy
    if (!html.includes("inzerat") && !html.includes("nadpis")) {
      errors.push({
        type: "STRUCTURE_CHANGE",
        message: "Bazoš HTML štruktúra sa zmenila - chýbajú očakávané elementy",
        url: pageUrl,
      });
      return { listings: [], errors };
    }
    
    // Tu by bol reálny parsing HTML
    // Pre demo vrátime prázdny zoznam - v produkcii by sa použil cheerio/jsdom
    const listings: RawListingData[] = [];
    
    // Nájdi odkaz na ďalšiu stránku
    const nextPageMatch = html.match(/href="([^"]*)"[^>]*>\s*Ďalšia/i);
    const nextPageUrl = nextPageMatch ? `${BAZOS_CONFIG.baseUrl}${nextPageMatch[1]}` : undefined;
    
    return { listings, nextPageUrl, errors };
    
  } catch (error) {
    errors.push({
      type: "NETWORK_ERROR",
      message: error instanceof Error ? error.message : "Unknown error",
      url: pageUrl,
    });
    return { listings: [], errors };
  }
}

/**
 * Scrapuje detail jedného inzerátu
 */
export async function scrapeListingDetail(url: string): Promise<{
  data: RawListingData | null;
  errors: ScrapeError[];
}> {
  const errors: ScrapeError[] = [];
  
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": BAZOS_CONFIG.userAgent,
        "Accept": "text/html,application/xhtml+xml",
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const html = await response.text();
    
    // V produkcii by tu bol reálny parsing
    // Pre demo vrátime null
    return { data: null, errors };
    
  } catch (error) {
    errors.push({
      type: "NETWORK_ERROR",
      message: error instanceof Error ? error.message : "Unknown error",
      url,
    });
    return { data: null, errors };
  }
}

/**
 * Konvertuje surové dáta na ParsedListingData
 */
export function parseListing(raw: RawListingData): {
  data: ParsedListingData | null;
  errors: ScrapeError[];
} {
  const errors: ScrapeError[] = [];
  
  try {
    // Parsuj cenu
    const price = parseBazosPrice(raw.priceRaw);
    if (price === 0) {
      errors.push({
        type: "VALIDATION_ERROR",
        message: "Neplatná cena",
        field: "price",
        rawValue: raw.priceRaw,
      });
      return { data: null, errors };
    }
    
    // Parsuj plochu
    const areaM2 = parseBazosArea(raw.areaRaw);
    if (areaM2 === 0) {
      errors.push({
        type: "VALIDATION_ERROR",
        message: "Neplatná plocha",
        field: "area",
        rawValue: raw.areaRaw,
      });
      return { data: null, errors };
    }
    
    // Parsuj lokáciu
    const location = parseLocation(raw.locationRaw);
    
    // Parsuj popis
    const descriptionData = parseDescription(raw.description, raw.title);
    
    // Vypočítaj cenu za m²
    const pricePerM2 = Math.round(price / areaM2);
    
    const data: ParsedListingData = {
      externalId: raw.externalId,
      sourceUrl: raw.sourceUrl,
      title: raw.title,
      description: raw.description,
      price,
      pricePerM2,
      city: location.city,
      district: location.district,
      street: location.street,
      address: raw.locationRaw,
      areaM2,
      rooms: descriptionData.rooms,
      floor: descriptionData.floor,
      totalFloors: descriptionData.totalFloors,
      condition: descriptionData.condition,
      energyCertificate: descriptionData.energyCertificate,
      hasElevator: descriptionData.hasElevator,
      hasBalcony: descriptionData.hasBalcony,
      hasParking: descriptionData.hasParking,
      hasGarage: descriptionData.hasGarage,
      hasCellar: descriptionData.hasCellar,
      insulationType: descriptionData.insulationType,
      heatingType: descriptionData.heatingType,
      yearBuilt: descriptionData.yearBuilt,
      imageUrls: raw.imageUrls,
      postedAt: raw.postedAt ? new Date(raw.postedAt) : undefined,
      sellerName: raw.sellerName,
      sellerPhone: raw.sellerPhone,
    };
    
    return { data, errors };
    
  } catch (error) {
    errors.push({
      type: "PARSE_ERROR",
      message: error instanceof Error ? error.message : "Unknown parse error",
      url: raw.sourceUrl,
    });
    return { data: null, errors };
  }
}

/**
 * Rate limiter - čaká medzi requestami
 */
export async function rateLimitWait(): Promise<void> {
  const delayMs = (60 / BAZOS_CONFIG.rateLimit) * 1000;
  await new Promise(resolve => setTimeout(resolve, delayMs));
}
