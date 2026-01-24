/**
 * Bazoš.sk Scraper Implementation
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
  "b. bystrica": "BANSKA_BYSTRICA",
  "trnava": "TRNAVA",
  "trenčín": "TRENCIN",
  "trencin": "TRENCIN",
  "nitra": "NITRA",
  // Bratislava - mestské časti
  "petržalka": "BRATISLAVA",
  "ružinov": "BRATISLAVA",
  "staré mesto": "BRATISLAVA",
  "nové mesto": "BRATISLAVA",
  "karlova ves": "BRATISLAVA",
  "dúbravka": "BRATISLAVA",
  "lamač": "BRATISLAVA",
  "devín": "BRATISLAVA",
  "devínska nová ves": "BRATISLAVA",
  "záhorská bystrica": "BRATISLAVA",
  "rača": "BRATISLAVA",
  "vajnory": "BRATISLAVA",
  "podunajské biskupice": "BRATISLAVA",
  "vrakuňa": "BRATISLAVA",
  "iii": "BRATISLAVA",
  "iv": "BRATISLAVA",
  "v": "BRATISLAVA",
  // Košice
  "staré mesto košice": "KOSICE",
  "juh": "KOSICE",
  "západ": "KOSICE",
  "sever": "KOSICE",
  "šaca": "KOSICE",
  "dargovských hrdinov": "KOSICE",
  "sídlisko ťahanovce": "KOSICE",
  "košice-okolie": "KOSICE",
};

export class BazosScraper extends BaseScraper {
  constructor(config = {}) {
    super("BAZOS", config);
  }

  getSourceName(): string {
    return "Bazoš.sk";
  }

  getBaseUrl(): string {
    return "https://reality.bazos.sk";
  }

  getCategories(): ScrapingCategory[] {
    return [
      { name: "Byty predaj", path: "/byty/", listingType: "PREDAJ" },
      { name: "Domy predaj", path: "/domy/", listingType: "PREDAJ" },
      { name: "Byty prenájom", path: "/prenajom/byty/", listingType: "PRENAJOM" },
      { name: "Domy prenájom", path: "/prenajom/domy/", listingType: "PRENAJOM" },
    ];
  }

  getSelectors() {
    return {
      listingContainer: ".inzeratynadpis",
      title: "h2, a",
      price: "b, strong",
      area: "",
      location: "",
      link: "a[href*='/inzerat/']",
      nextPage: ".strankovani a:contains('Ďalšia')",
    };
  }

  buildCategoryUrl(category: ScrapingCategory, city?: string, page?: number): string {
    let url = `${this.config.baseUrl}${category.path}`;
    
    const params: string[] = [];
    if (city) {
      params.push(`hlokalita=${encodeURIComponent(city)}`);
      params.push("humkreis=25");
    }
    if (page && page > 1) {
      params.push(`strana=${page}`);
    }
    
    if (params.length > 0) {
      url += `?${params.join("&")}`;
    }
    
    return url;
  }

  parsePrice(text: string, isRent: boolean = false): number {
    // Pre prenájom hľadáme mesačnú cenu
    if (isRent) {
      const rentMatch = text.match(/(\d{2,4})\s*€\s*(?:\/\s*mes|mesačne|mes\.)/i);
      if (rentMatch) {
        return parseInt(rentMatch[1].replace(/[\s\u00a0.,]/g, ""), 10);
      }
    }
    
    // Štandardná cena
    const priceMatch = text.match(/(\d{1,3}[\s\u00a0.,]?\d{3}[\s\u00a0.,]?\d{0,3})\s*€/i);
    if (priceMatch) {
      const cleanPrice = priceMatch[1].replace(/[\s\u00a0.,]/g, "");
      const price = parseInt(cleanPrice, 10);
      if (price > 0 && price < 100000000) {
        return price;
      }
    }
    
    // Fallback - hľadaj akékoľvek 5-7 ciferné číslo
    const fallbackMatch = text.match(/(\d{5,7})/);
    if (fallbackMatch) {
      return parseInt(fallbackMatch[1], 10);
    }
    
    return 0;
  }

  parseArea(text: string): number {
    const areaMatch = text.match(/(\d{2,4}(?:[,\.]\d{1,2})?)\s*m[²2]/i);
    if (areaMatch) {
      return parseFloat(areaMatch[1].replace(",", "."));
    }
    
    const altMatch = text.match(/(\d{2,4})\s*(?:štvorcov|metrov|m2)/i);
    if (altMatch) {
      return parseFloat(altMatch[1]);
    }
    
    return 0;
  }

  parseCity(text: string): { city: SlovakCity; district: string } | null {
    const normalized = normalizeText(text);
    
    for (const [key, city] of Object.entries(CITY_MAP)) {
      if (normalized.includes(removeDiacritics(key).toLowerCase())) {
        // Skús extrahovať district
        const parts = text.split(/[,\-]/);
        const district = parts.length > 1 ? parts[0].trim() : "Centrum";
        return { city, district };
      }
    }
    
    // Default fallback
    return { city: "BRATISLAVA", district: "Centrum" };
  }

  parseListingElement(
    $: cheerio.CheerioAPI,
    element: cheerio.Element,
    listingType: ListingType
  ): ParsedListing | null {
    try {
      const $el = $(element);
      
      // Extrahuj link a externalId
      let href = $el.find("a[href*='/inzerat/']").first().attr("href");
      if (!href) {
        href = $el.closest("a[href*='/inzerat/']").first().attr("href");
      }
      if (!href) return null;
      
      const externalIdMatch = href.match(/inzerat\/(\d+)/);
      const externalId = externalIdMatch?.[1] || "";
      if (!externalId) return null;
      
      // Nadpis
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
      
      // Popis
      let description = "";
      const $nextSibling = $el.next();
      if ($nextSibling.length) {
        description = $nextSibling.text().trim();
      }
      
      // Cena
      let priceText = "";
      $grandparent.find("b, strong").each((_, el) => {
        const text = $(el).text();
        if (text.includes("€") || /\d{2,3}\s?\d{3}/.test(text)) {
          priceText = text;
          return false;
        }
      });
      
      if (!priceText) {
        const priceMatch = fullText.match(/(\d{1,3}[\s\u00a0]?\d{3}[\s\u00a0]?\d{3}|\d{2,3}[\s\u00a0]?\d{3})\s*€/);
        if (priceMatch) {
          priceText = priceMatch[0];
        }
      }
      
      // Lokalita
      let locationText = "";
      const pscMatch = fullText.match(/([A-ZÁÉÍÓÚÝČĎĽŇŘŠŤŽa-záéíóúýčďľňřšťž\s]+)\s*(\d{3}\s?\d{2})/);
      if (pscMatch) {
        locationText = pscMatch[1].trim();
      }
      
      // Extrahuj hodnoty
      const isRent = listingType === "PRENAJOM";
      const price = this.parsePrice(priceText, isRent);
      const areaM2 = this.parseArea(title + " " + description + " " + fullText);
      const cityResult = this.parseCity(locationText || title);
      
      if (!cityResult) return null;
      
      // Validácia
      const minPrice = isRent ? 100 : 10000;
      if (price < minPrice) {
        return null;
      }
      
      const finalArea = areaM2 > 0 ? areaM2 : 50;
      const pricePerM2 = Math.round(price / finalArea);
      
      // Extrahuj stav
      const { condition } = parseDescription(description + " " + title, title);
      
      return {
        externalId,
        source: "BAZOS",
        title: title.substring(0, 200) || "Bez názvu",
        description: description.substring(0, 1000),
        price,
        pricePerM2,
        areaM2: finalArea,
        city: cityResult.city,
        district: cityResult.district || "Centrum",
        condition,
        listingType,
        sourceUrl: href.startsWith("http") ? href : `${this.config.baseUrl}${href}`,
      };
    } catch (error) {
      console.error("[Bazoš] Parse error:", error);
      return null;
    }
  }
}

// Export singleton instance
export const bazosScraper = new BazosScraper();
