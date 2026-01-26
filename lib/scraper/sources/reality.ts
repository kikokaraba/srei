/**
 * Reality.sk Scraper Implementation
 * Druhý najväčší realitný portál na Slovensku
 */

import * as cheerio from "cheerio";
import {
  BaseScraper,
  ParsedListing,
  ScrapingCategory,
  normalizeText,
  removeDiacritics,
} from "../base-scraper";
import type { ListingType } from "@/generated/prisma/client";
import { parseDescription } from "../parser";

// Mapovanie lokalít na štandardizované názvy miest
const CITY_MAP: Record<string, string> = {
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
  // Bratislava časti
  "petržalka": "BRATISLAVA",
  "ružinov": "BRATISLAVA",
  "staré mesto": "BRATISLAVA",
  "nové mesto": "BRATISLAVA",
  "karlova ves": "BRATISLAVA",
  "dúbravka": "BRATISLAVA",
  // Košice časti
  "košice-juh": "KOSICE",
  "košice-západ": "KOSICE",
  "košice-sever": "KOSICE",
};

// Reality.sk URL slugy pre mestá
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

export class RealityScraper extends BaseScraper {
  constructor(config = {}) {
    super("REALITY", config);
  }

  getSourceName(): string {
    return "Reality.sk";
  }

  getBaseUrl(): string {
    return "https://www.reality.sk";
  }

  getCategories(): ScrapingCategory[] {
    return [
      { name: "Byty predaj", path: "/byty/predaj/", listingType: "PREDAJ" },
      { name: "Domy predaj", path: "/domy/predaj/", listingType: "PREDAJ" },
      { name: "Byty prenájom", path: "/byty/prenajom/", listingType: "PRENAJOM" },
      { name: "Domy prenájom", path: "/domy/prenajom/", listingType: "PRENAJOM" },
    ];
  }

  getSelectors() {
    return {
      listingContainer: ".estate-list__item, .property-item, .listing-item, article.estate",
      title: ".estate-list__title, .property-title, h2 a, .title a",
      price: ".estate-list__price, .property-price, .price",
      area: ".estate-list__area, .property-area, .area",
      location: ".estate-list__location, .property-location, .location",
      link: "a[href*='/detail/'], a[href*='/inzerat/'], h2 a",
      nextPage: ".pagination__next, a[rel='next'], .pagination a:last-child",
    };
  }

  buildCategoryUrl(category: ScrapingCategory, city?: string, page?: number): string {
    let url = `${this.config.baseUrl}${category.path}`;
    
    if (city) {
      const slug = CITY_SLUGS[city] || city.toLowerCase().replace(/\s+/g, "-");
      url += `${slug}/`;
    }
    
    if (page && page > 1) {
      url += `?strana=${page}`;
    }
    
    return url;
  }

  parsePrice(text: string, isRent: boolean = false): number {
    const cleanText = text.replace(/\s+/g, " ").trim();
    
    if (isRent) {
      const rentMatch = cleanText.match(/(\d[\d\s]*)\s*€\s*(?:\/\s*mes|mesačne|mes\.)/i);
      if (rentMatch) {
        return parseInt(rentMatch[1].replace(/\s/g, ""), 10);
      }
    }
    
    const priceMatch = cleanText.match(/(\d[\d\s]*)\s*€/i);
    if (priceMatch) {
      const price = parseInt(priceMatch[1].replace(/\s/g, ""), 10);
      if (price > 0 && price < 100000000) {
        return price;
      }
    }
    
    return 0;
  }

  parseArea(text: string): number {
    const areaMatch = text.match(/(\d+(?:[,\.]\d+)?)\s*m[²2]/i);
    if (areaMatch) {
      return parseFloat(areaMatch[1].replace(",", "."));
    }
    return 0;
  }

  parseCity(text: string): { city: string; district: string } | null {
    const normalized = normalizeText(text);
    
    for (const [key, city] of Object.entries(CITY_MAP)) {
      if (normalized.includes(removeDiacritics(key).toLowerCase())) {
        const parts = text.split(/[,\-•]/);
        const district = parts.length > 1 ? parts[1].trim() : parts[0].trim();
        return { city, district: district || "Centrum" };
      }
    }
    
    return null;
  }

  parseListingElement(
    $: cheerio.CheerioAPI,
    element: Parameters<typeof $>[0],
    listingType: ListingType
  ): ParsedListing | null {
    try {
      const $el = $(element);
      const selectors = this.getSelectors();
      
      // Extrahuj link a externalId
      const $link = $el.find(selectors.link).first();
      let href = $link.attr("href");
      
      if (!href && $el.is("a")) {
        href = $el.attr("href");
      }
      
      if (!href) return null;
      
      // Extrahuj ID z URL
      const idMatch = href.match(/\/detail\/(\d+)|\/(\d+)\/|id[=\/](\d+)/i);
      const externalId = idMatch?.[1] || idMatch?.[2] || idMatch?.[3] || "";
      
      if (!externalId) {
        // Použi hash z URL
        const urlParts = href.split("/").filter(Boolean);
        if (urlParts.length === 0) return null;
      }
      
      // Nadpis
      let title = $el.find(selectors.title).first().text().trim();
      if (!title) {
        title = $link.text().trim();
      }
      if (!title) return null;
      
      // Cena
      const priceText = $el.find(selectors.price).first().text().trim();
      const isRent = listingType === "PRENAJOM";
      const price = this.parsePrice(priceText, isRent);
      
      // Plocha
      const areaText = $el.find(selectors.area).first().text().trim();
      let areaM2 = this.parseArea(areaText);
      if (areaM2 === 0) {
        areaM2 = this.parseArea(title);
      }
      
      // Lokalita
      const locationText = $el.find(selectors.location).first().text().trim();
      const cityResult = this.parseCity(locationText || title);
      
      if (!cityResult) return null;
      
      // Validácia
      const minPrice = isRent ? 100 : 10000;
      if (price < minPrice) {
        return null;
      }
      
      const finalArea = areaM2 > 0 ? areaM2 : 50;
      const pricePerM2 = Math.round(price / finalArea);
      
      // Popis
      const description = $el.find(".description, .text, .estate-list__description").first().text().trim();
      
      // Stav
      const { condition } = parseDescription(description + " " + title, title);
      
      // Izby
      const roomsMatch = title.match(/(\d+)\s*[-\s]?(?:izb|izbov)/i);
      const rooms = roomsMatch ? parseInt(roomsMatch[1], 10) : undefined;
      
      return {
        externalId: externalId || href.split("/").filter(Boolean).pop() || Date.now().toString(),
        source: "REALITY",
        title: title.substring(0, 200),
        description: description.substring(0, 1000),
        price,
        pricePerM2,
        areaM2: finalArea,
        city: cityResult.city,
        district: cityResult.district,
        rooms,
        condition,
        listingType,
        sourceUrl: href.startsWith("http") ? href : `${this.config.baseUrl}${href}`,
      };
    } catch (error) {
      console.error("[Reality.sk] Parse error:", error);
      return null;
    }
  }
}

// Export singleton instance
export const realityScraper = new RealityScraper();
