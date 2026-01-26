/**
 * Abstraktný Base Scraper Framework
 * Poskytuje jednotné rozhranie pre všetky realitné portály
 */

import * as cheerio from "cheerio";
import type { PropertySource, ListingType } from "@/generated/prisma/client";

// ============================================================================
// TYPY A ROZHRANIA
// ============================================================================

/**
 * Surové dáta z inzerátu pred spracovaním
 */
export interface RawListing {
  externalId: string;
  title: string;
  description: string;
  priceText: string;
  areaText: string;
  locationText: string;
  sourceUrl: string;
  imageUrls?: string[];
  rawHtml?: string;
}

/**
 * Spracované dáta z inzerátu
 */
export interface ParsedListing {
  externalId: string;
  source: PropertySource;
  title: string;
  description: string;
  price: number;
  pricePerM2: number;
  areaM2: number;
  city: string;
  district: string;
  street?: string;
  rooms?: number;
  floor?: number;
  condition: "NOVOSTAVBA" | "REKONSTRUKCIA" | "POVODNY";
  listingType: ListingType;
  sourceUrl: string;
  imageUrls?: string[];
}

/**
 * Konfigurácia scrapera
 */
export interface ScraperConfig {
  // Základná URL portálu
  baseUrl: string;
  
  // Limity
  maxPagesPerCategory: number;
  maxRequestsPerSession: number;
  
  // Oneskorenia (ms)
  minDelay: number;
  maxDelay: number;
  
  // Retry logika
  maxRetries: number;
  baseBackoff: number;
  maxBackoff: number;
  
  // Proxy (voliteľné)
  proxyUrl?: string;
  scraperApiKey?: string;
}

/**
 * Výsledok scrape operácie
 */
export interface ScrapeResult {
  success: boolean;
  listings: ParsedListing[];
  pagesScraped: number;
  errors: string[];
  blocked: boolean;
  duration: number;
}

/**
 * Kategória na scrapovanie
 */
export interface ScrapingCategory {
  name: string;
  path: string;
  listingType: ListingType;
}

// ============================================================================
// UTILITY FUNKCIE
// ============================================================================

/**
 * Rotácia User-Agentov
 */
const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15",
];

export function getRandomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

export function getRandomDelay(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export async function sleep(ms: number): Promise<void> {
  const jitter = Math.floor(Math.random() * 500);
  return new Promise(resolve => setTimeout(resolve, ms + jitter));
}

export function calculateBackoff(attempt: number, base: number = 2000, max: number = 60000): number {
  const backoff = base * Math.pow(2, attempt);
  const jitter = Math.random() * 1000;
  return Math.min(backoff + jitter, max);
}

/**
 * Odstráni diakritiku z textu
 */
export function removeDiacritics(text: string): string {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/**
 * Normalizuje text pre porovnávanie
 */
export function normalizeText(text: string): string {
  return removeDiacritics(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// ============================================================================
// ABSTRAKTNÁ TRIEDA
// ============================================================================

/**
 * Abstraktná trieda pre všetky scrapery
 * Každý portál implementuje vlastnú verziu
 */
export abstract class BaseScraper {
  protected config: ScraperConfig;
  protected source: PropertySource;

  constructor(source: PropertySource, config: Partial<ScraperConfig> = {}) {
    this.source = source;
    this.config = {
      baseUrl: this.getBaseUrl(),
      maxPagesPerCategory: 3,
      maxRequestsPerSession: 50,
      minDelay: 3000,
      maxDelay: 7000,
      maxRetries: 5,
      baseBackoff: 2000,
      maxBackoff: 60000,
      ...config,
    };
  }

  /**
   * Vráti názov zdroja
   */
  abstract getSourceName(): string;

  /**
   * Vráti základnú URL portálu
   */
  abstract getBaseUrl(): string;

  /**
   * Vráti zoznam kategórií na scrapovanie
   */
  abstract getCategories(): ScrapingCategory[];

  /**
   * Vráti CSS selektory pre parsovanie
   */
  abstract getSelectors(): {
    listingContainer: string;
    title: string;
    price: string;
    area: string;
    location: string;
    link: string;
    nextPage?: string;
  };

  /**
   * Parsuje surové dáta z HTML elementu
   */
  abstract parseListingElement(
    $: cheerio.CheerioAPI,
    element: Parameters<typeof $>[0],
    listingType: ListingType
  ): ParsedListing | null;

  /**
   * Extrahuje cenu z textu
   */
  abstract parsePrice(text: string, isRent?: boolean): number;

  /**
   * Extrahuje plochu z textu
   */
  abstract parseArea(text: string): number;

  /**
   * Mapuje lokalitu na štandardizovaný názov mesta
   */
  abstract parseCity(text: string): { city: string; district: string } | null;

  /**
   * Zostav URL pre kategóriu a mesto
   */
  abstract buildCategoryUrl(category: ScrapingCategory, city?: string, page?: number): string;

  /**
   * Fetch s retry logikou
   */
  async fetchWithRetry(url: string, referer?: string): Promise<{ success: boolean; html?: string; error?: string }> {
    for (let attempt = 0; attempt < this.config.maxRetries; attempt++) {
      try {
        const userAgent = getRandomUserAgent();
        const headers: Record<string, string> = {
          "User-Agent": userAgent,
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
          "Accept-Language": "sk-SK,sk;q=0.9,cs;q=0.8,en-US;q=0.7,en;q=0.6",
          "Accept-Encoding": "gzip, deflate, br",
          "Connection": "keep-alive",
          "Upgrade-Insecure-Requests": "1",
          "Cache-Control": "max-age=0",
        };

        if (referer) {
          headers["Referer"] = referer;
        }

        let fetchUrl = url;
        if (this.config.scraperApiKey) {
          fetchUrl = `http://api.scraperapi.com?api_key=${this.config.scraperApiKey}&url=${encodeURIComponent(url)}&country_code=sk`;
        }

        console.log(`🌐 [${this.getSourceName()}] Attempt ${attempt + 1}: ${url.substring(0, 60)}...`);
        
        const response = await fetch(fetchUrl, { headers, redirect: "follow" });

        if (response.ok) {
          const html = await response.text();
          
          if (html.includes("captcha") || html.includes("blocked") || html.includes("Access Denied")) {
            throw new Error("CAPTCHA_DETECTED");
          }

          return { success: true, html };
        }

        if (response.status === 403 || response.status === 429) {
          const backoff = calculateBackoff(attempt, this.config.baseBackoff, this.config.maxBackoff);
          console.warn(`⚠️ HTTP ${response.status} - Backoff: ${Math.round(backoff / 1000)}s`);
          await sleep(backoff);
          continue;
        }

        return { success: false, error: `HTTP ${response.status}` };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Unknown error";
        
        if (errorMsg === "CAPTCHA_DETECTED") {
          console.error("🚫 CAPTCHA detected! Waiting 5 minutes...");
          await sleep(5 * 60 * 1000);
          continue;
        }

        const backoff = calculateBackoff(attempt, this.config.baseBackoff, this.config.maxBackoff);
        console.warn(`❌ Error: ${errorMsg}. Backoff: ${Math.round(backoff / 1000)}s`);
        await sleep(backoff);
      }
    }

    return { success: false, error: "Max retries exceeded" };
  }

  /**
   * Scrapuje jednu kategóriu pre dané mesto
   */
  async scrapeCategory(category: ScrapingCategory, city?: string): Promise<ScrapeResult> {
    const startTime = Date.now();
    const result: ScrapeResult = {
      success: true,
      listings: [],
      pagesScraped: 0,
      errors: [],
      blocked: false,
      duration: 0,
    };

    console.log(`\n🏠 [${this.getSourceName()}] Scraping: ${category.name} - ${city || "all"}`);

    for (let page = 1; page <= this.config.maxPagesPerCategory; page++) {
      if (page > 1) {
        const delay = getRandomDelay(this.config.minDelay, this.config.maxDelay);
        console.log(`⏳ Waiting ${Math.round(delay / 1000)}s...`);
        await sleep(delay);
      }

      const url = this.buildCategoryUrl(category, city, page);
      const fetchResult = await this.fetchWithRetry(url, this.config.baseUrl);

      if (!fetchResult.success || !fetchResult.html) {
        result.errors.push(fetchResult.error || "Fetch failed");
        if (fetchResult.error?.includes("CAPTCHA") || fetchResult.error?.includes("403")) {
          result.blocked = true;
          break;
        }
        continue;
      }

      result.pagesScraped++;
      const $ = cheerio.load(fetchResult.html);
      const selectors = this.getSelectors();
      const elements = $(selectors.listingContainer).toArray();

      for (const element of elements) {
        try {
          const listing = this.parseListingElement($, element, category.listingType);
          if (listing) {
            result.listings.push(listing);
          }
        } catch (error) {
          result.errors.push(`Parse error: ${error instanceof Error ? error.message : "Unknown"}`);
        }
      }

      // Check if there's a next page
      if (selectors.nextPage && $(selectors.nextPage).length === 0) {
        break;
      }
    }

    result.duration = Date.now() - startTime;
    result.success = result.pagesScraped > 0 && !result.blocked;

    console.log(`✅ [${this.getSourceName()}] Done: ${result.listings.length} listings, ${result.pagesScraped} pages, ${result.errors.length} errors`);

    return result;
  }

  /**
   * Scrapuje všetky kategórie pre všetky mestá
   */
  async scrapeAll(cities?: string[]): Promise<ScrapeResult> {
    const startTime = Date.now();
    const allListings: ParsedListing[] = [];
    const allErrors: string[] = [];
    let totalPages = 0;
    let blocked = false;

    const categories = this.getCategories();
    const targetCities = cities || ["Bratislava", "Košice", "Žilina"];

    console.log(`🚀 [${this.getSourceName()}] Starting full scrape`);
    console.log(`📍 Cities: ${targetCities.join(", ")}`);
    console.log(`📂 Categories: ${categories.map(c => c.name).join(", ")}`);

    for (const city of targetCities) {
      for (const category of categories) {
        if (blocked) break;

        // Delay between categories
        if (totalPages > 0) {
          const longDelay = getRandomDelay(10000, 20000);
          console.log(`\n⏳ Waiting ${Math.round(longDelay / 1000)}s before next category...`);
          await sleep(longDelay);
        }

        const result = await this.scrapeCategory(category, city);
        
        allListings.push(...result.listings);
        allErrors.push(...result.errors);
        totalPages += result.pagesScraped;
        
        if (result.blocked) {
          blocked = true;
          break;
        }
      }
      
      if (blocked) break;
    }

    return {
      success: totalPages > 0 && !blocked,
      listings: allListings,
      pagesScraped: totalPages,
      errors: allErrors,
      blocked,
      duration: Date.now() - startTime,
    };
  }
}

// Export types
export type { PropertySource, ListingType };
