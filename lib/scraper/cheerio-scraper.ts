// Cheerio Scraper - Fallback scraper bez potreby browsera
// Používa sa keď Playwright nie je dostupný (napr. na Vercel serverless)

import * as cheerio from "cheerio";
import type { RawListingData, ScrapeError } from "./types";
import { BAZOS_CONFIG } from "./bazos";

/**
 * Bazoš HTML Selektory pre Cheerio
 */
const SELECTORS = {
  // Zoznam inzerátov
  listingRow: ".inzeraty .inzerat, .vypis .inzerat",
  listingLink: "a[href*='/inzerat/']",
  listingTitle: ".nadpis a, h2 a, .nazov",
  listingPrice: ".cena, .inzeratcena",
  listingLocation: ".lokalita, .inzeratlok",
  listingImage: "img[src*='img.bazos']",
  pagination: ".strankovani a",
  
  // Detail
  detailDescription: ".popis",
  detailImages: ".carousel img, .gallery img",
  detailParams: "table.tabulka tr",
};

/**
 * Fetch s retry a exponenciálnym backoff
 */
async function fetchWithRetry(
  url: string,
  retries: number = 3
): Promise<Response> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": BAZOS_CONFIG.userAgent,
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "sk-SK,sk;q=0.9,en;q=0.8",
          "Accept-Encoding": "gzip, deflate, br",
          "Cache-Control": "no-cache",
        },
      });
      
      if (response.ok) {
        return response;
      }
      
      // 429 Too Many Requests - čakaj dlhšie
      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get("retry-after") || "60", 10);
        console.log(`⏳ Rate limited, waiting ${retryAfter}s...`);
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
        continue;
      }
      
      throw new Error(`HTTP ${response.status}`);
      
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt < retries) {
        const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
        console.log(`🔄 Retry ${attempt}/${retries} in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError || new Error("Fetch failed after retries");
}

/**
 * Extrahuje plochu z textu
 */
function extractArea(text: string): string {
  const match = text.match(/(\d+)\s*m[²2]/i);
  return match ? `${match[1]} m²` : "";
}

/**
 * Scrapuje zoznam inzerátov pomocou Cheerio
 */
export async function scrapeListingPageCheerio(
  pageUrl: string
): Promise<{
  listings: RawListingData[];
  nextPageUrl?: string;
  errors: ScrapeError[];
}> {
  const errors: ScrapeError[] = [];
  const listings: RawListingData[] = [];
  
  try {
    console.log(`📄 Fetching: ${pageUrl}`);
    const response = await fetchWithRetry(pageUrl);
    const html = await response.text();
    
    const $ = cheerio.load(html);
    
    // Detekcia štruktúry
    const listingRows = $(SELECTORS.listingRow);
    
    if (listingRows.length === 0) {
      // Skús alternatívny selektor
      const altRows = $("div[class*='inzerat']");
      
      if (altRows.length === 0) {
        errors.push({
          type: "STRUCTURE_CHANGE",
          message: "Nenašli sa žiadne inzeráty - možná zmena HTML štruktúry",
          url: pageUrl,
        });
        return { listings, errors };
      }
    }
    
    // Parsuj každý inzerát
    listingRows.each((_, element) => {
      try {
        const $el = $(element);
        
        // Link a externalId
        const $link = $el.find(SELECTORS.listingLink).first();
        const href = $link.attr("href");
        
        if (!href) return;
        
        const fullUrl = href.startsWith("http") ? href : `${BAZOS_CONFIG.baseUrl}${href}`;
        const externalIdMatch = href.match(/inzerat\/(\d+)/);
        const externalId = externalIdMatch?.[1] || href;
        
        // Základné údaje
        const title = $el.find(SELECTORS.listingTitle).first().text().trim();
        const priceRaw = $el.find(SELECTORS.listingPrice).first().text().trim();
        const locationRaw = $el.find(SELECTORS.listingLocation).first().text().trim();
        
        // Plocha - hľadaj v celom texte
        const fullText = $el.text();
        const areaRaw = extractArea(fullText);
        
        // Obrázok
        const $img = $el.find(SELECTORS.listingImage).first();
        const imageUrl = $img.attr("src") || $img.attr("data-src") || "";
        
        if (title) {
          listings.push({
            externalId,
            sourceUrl: fullUrl,
            title,
            description: "",
            priceRaw,
            locationRaw,
            areaRaw,
            imageUrls: imageUrl ? [imageUrl] : [],
          });
        }
      } catch (itemError) {
        console.warn("Failed to parse item:", itemError);
      }
    });
    
    // Ďalšia stránka
    let nextPageUrl: string | undefined;
    const $pagination = $(SELECTORS.pagination);
    
    $pagination.each((_, el) => {
      const $a = $(el);
      const text = $a.text().toLowerCase();
      
      if (text.includes("ďalšia") || text.includes(">>") || text.includes("další")) {
        const href = $a.attr("href");
        if (href) {
          nextPageUrl = href.startsWith("http") ? href : `${BAZOS_CONFIG.baseUrl}${href}`;
        }
      }
    });
    
    console.log(`✅ Found ${listings.length} listings`);
    
    return { listings, nextPageUrl, errors };
    
  } catch (error) {
    errors.push({
      type: "NETWORK_ERROR",
      message: error instanceof Error ? error.message : "Unknown error",
      url: pageUrl,
    });
    return { listings, errors };
  }
}

/**
 * Scrapuje detail inzerátu
 */
export async function scrapeListingDetailCheerio(
  url: string
): Promise<{
  data: Partial<RawListingData> | null;
  errors: ScrapeError[];
}> {
  const errors: ScrapeError[] = [];
  
  try {
    const response = await fetchWithRetry(url);
    const html = await response.text();
    
    const $ = cheerio.load(html);
    
    // Popis
    const description = $(SELECTORS.detailDescription).first().text().trim();
    
    // Obrázky
    const imageUrls: string[] = [];
    $(SELECTORS.detailImages).each((_, img) => {
      const src = $(img).attr("src") || $(img).attr("data-src");
      if (src && !imageUrls.includes(src)) {
        imageUrls.push(src);
      }
    });
    
    // Parametre z tabuľky
    let sellerName = "";
    let sellerPhone = "";
    let postedAt = "";
    
    $(SELECTORS.detailParams).each((_, row) => {
      const $row = $(row);
      const label = $row.find("td").first().text().toLowerCase();
      const value = $row.find("td").last().text().trim();
      
      if (label.includes("meno") || label.includes("predaj")) {
        sellerName = value;
      }
      if (label.includes("telef")) {
        sellerPhone = value;
      }
      if (label.includes("dátum") || label.includes("datum")) {
        postedAt = value;
      }
    });
    
    return {
      data: {
        description,
        imageUrls,
        sellerName,
        sellerPhone,
        postedAt,
      },
      errors,
    };
    
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
 * Kompletný scrape s Cheerio
 */
export async function scrapeWithCheerio(
  categoryUrl: string,
  maxListings: number = 100
): Promise<{
  listings: RawListingData[];
  errors: ScrapeError[];
}> {
  const allListings: RawListingData[] = [];
  const allErrors: ScrapeError[] = [];
  
  let pageUrl: string | undefined = categoryUrl;
  let pageCount = 0;
  
  while (pageUrl && allListings.length < maxListings && pageCount < BAZOS_CONFIG.maxPages) {
    const { listings, nextPageUrl, errors } = await scrapeListingPageCheerio(pageUrl);
    
    allErrors.push(...errors);
    
    // Kritická chyba - zastav
    if (errors.some(e => e.type === "STRUCTURE_CHANGE")) {
      break;
    }
    
    // Získaj detaily
    for (const listing of listings) {
      if (allListings.length >= maxListings) break;
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const { data: details, errors: detailErrors } = await scrapeListingDetailCheerio(
        listing.sourceUrl
      );
      
      allErrors.push(...detailErrors);
      
      allListings.push({
        ...listing,
        description: details?.description || listing.description,
        imageUrls: details?.imageUrls?.length ? details.imageUrls : listing.imageUrls,
        sellerName: details?.sellerName,
        sellerPhone: details?.sellerPhone,
        postedAt: details?.postedAt,
      });
    }
    
    pageUrl = nextPageUrl;
    pageCount++;
    
    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 3000));
  }
  
  return { listings: allListings, errors: allErrors };
}
