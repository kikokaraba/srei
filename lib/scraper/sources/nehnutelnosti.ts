/**
 * Nehnutelnosti.sk Scraper Implementation
 * Najväčší realitný portál na Slovensku
 */

import * as cheerio from "cheerio";
import {
  BaseScraper,
  ParsedListing,
  ScrapingCategory,
  normalizeText,
  removeDiacritics,
} from "../base-scraper";
import type { SlovakCity, ListingType } from "@/generated/prisma/client";
import { parseDescription } from "../parser";

// Mapovanie lokalít na SlovakCity enum
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
  // Bratislava časti
  "petržalka": "BRATISLAVA",
  "ružinov": "BRATISLAVA",
  "staré mesto": "BRATISLAVA",
  "nové mesto": "BRATISLAVA",
  "karlova ves": "BRATISLAVA",
  "dúbravka": "BRATISLAVA",
  // Košice časti
  "staré mesto košice": "KOSICE",
  "košice-juh": "KOSICE",
  "košice-západ": "KOSICE",
  "košice-sever": "KOSICE",
};

// Nehnutelnosti.sk URL slugy pre mestá
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

export class NehnutelnostiScraper extends BaseScraper {
  constructor(config = {}) {
    super("NEHNUTELNOSTI", config);
  }

  getSourceName(): string {
    return "Nehnutelnosti.sk";
  }

  getBaseUrl(): string {
    return "https://www.nehnutelnosti.sk";
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
      // Nehnutelnosti.sk používa rôzne selektory
      listingContainer: ".advertisement-item, .property-list__item, [data-testid='property-card'], .inzerat",
      title: ".advertisement-item__title, .property-title, h2 a, .title",
      price: ".advertisement-item__price, .property-price, .price, .cena",
      area: ".advertisement-item__area, .property-area, .area, .vymera",
      location: ".advertisement-item__location, .property-location, .location, .lokalita",
      link: "a[href*='/detail/'], a[href*='/inzerat/']",
      nextPage: ".pagination__next, .pagination a:contains('Ďalšia'), a[rel='next']",
    };
  }

  buildCategoryUrl(category: ScrapingCategory, city?: string, page?: number): string {
    let url = `${this.config.baseUrl}${category.path}`;
    
    if (city) {
      const slug = CITY_SLUGS[city] || city.toLowerCase().replace(/\s+/g, "-");
      url += `${slug}/`;
    }
    
    if (page && page > 1) {
      url += `?p=${page}`;
    }
    
    return url;
  }

  parsePrice(text: string, isRent: boolean = false): number {
    // Nehnutelnosti.sk formáty: "185 000 €", "1 200 €/mes"
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
    // Formáty: "75 m²", "75m2", "75 m2"
    const areaMatch = text.match(/(\d+(?:[,\.]\d+)?)\s*m[²2]/i);
    if (areaMatch) {
      return parseFloat(areaMatch[1].replace(",", "."));
    }
    return 0;
  }

  parseCity(text: string): { city: SlovakCity; district: string } | null {
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
      
      if (!href) {
        // Skús nájsť link priamo na elemente
        if ($el.is("a")) {
          href = $el.attr("href");
        }
      }
      
      if (!href) return null;
      
      // Extrahuj ID z URL
      const idMatch = href.match(/\/detail\/(\d+)|\/(\d+)\/?$/);
      const externalId = idMatch?.[1] || idMatch?.[2] || "";
      if (!externalId) {
        // Skús hash z URL
        const hashId = href.split("/").filter(Boolean).pop() || "";
        if (!hashId) return null;
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
        // Skús extrahovať z titulku
        areaM2 = this.parseArea(title);
      }
      
      // Lokalita
      const locationText = $el.find(selectors.location).first().text().trim();
      const cityResult = this.parseCity(locationText || title);
      
      if (!cityResult) {
        // Fallback - pokús sa extrahovať z URL alebo iného zdroja
        return null;
      }
      
      // Validácia
      const minPrice = isRent ? 100 : 10000;
      if (price < minPrice) {
        return null;
      }
      
      const finalArea = areaM2 > 0 ? areaM2 : 50;
      const pricePerM2 = Math.round(price / finalArea);
      
      // Popis
      const description = $el.find(".description, .advertisement-item__description, .text").first().text().trim();
      
      // Stav
      const { condition } = parseDescription(description + " " + title, title);
      
      // Extrahuj počet izieb z titulku
      const roomsMatch = title.match(/(\d+)\s*[-\s]?(?:izb|izbov)/i);
      const rooms = roomsMatch ? parseInt(roomsMatch[1], 10) : undefined;
      
      return {
        externalId: externalId || href.split("/").filter(Boolean).pop() || "",
        source: "NEHNUTELNOSTI",
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
      console.error("[Nehnutelnosti] Parse error:", error);
      return null;
    }
  }
}

// Export singleton instance
export const nehnutelnostiScraper = new NehnutelnostiScraper();
