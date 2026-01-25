/**
 * Simple Scraper - Priamy fetch bez Browserless
 * Používa Cheerio na parsovanie HTML
 */

import * as cheerio from "cheerio";
import type { ListingType, PropertySource } from "@/generated/prisma/client";

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
}

export interface ScrapeResult {
  properties: ScrapedProperty[];
  pagesScraped: number;
  errors: string[];
  duration: number;
}

// User agents pre rotáciu
const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
];

function getRandomUA(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

async function fetchPage(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": getRandomUA(),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "sk-SK,sk;q=0.9,cs;q=0.8,en;q=0.7",
        "Accept-Encoding": "gzip, deflate, br",
        "Cache-Control": "no-cache",
        "Pragma": "no-cache",
      },
    });
    
    if (!response.ok) {
      console.error(`HTTP ${response.status} for ${url}`);
      return null;
    }
    
    return await response.text();
  } catch (error) {
    console.error(`Fetch error for ${url}:`, error);
    return null;
  }
}

function parsePrice(text: string): number {
  const cleaned = text.replace(/\s+/g, "").replace(/[^\d]/g, "");
  const price = parseInt(cleaned, 10);
  return (price > 0 && price < 100000000) ? price : 0;
}

function parseArea(text: string): number {
  const match = text.match(/(\d+(?:[,\.]\d+)?)\s*m[²2]/i);
  return match ? parseFloat(match[1].replace(",", ".")) : 0;
}

function parseCity(text: string): { city: string; district: string } {
  const normalized = text.toLowerCase();
  
  const cityMap: Record<string, string> = {
    "bratislava": "Bratislava",
    "košice": "Košice", "kosice": "Košice",
    "prešov": "Prešov", "presov": "Prešov",
    "žilina": "Žilina", "zilina": "Žilina",
    "banská bystrica": "Banská Bystrica",
    "trnava": "Trnava",
    "trenčín": "Trenčín", "trencin": "Trenčín",
    "nitra": "Nitra",
    "poprad": "Poprad",
    "martin": "Martin",
  };
  
  for (const [key, city] of Object.entries(cityMap)) {
    if (normalized.includes(key)) {
      return { city, district: text.split(",")[0]?.trim() || city };
    }
  }
  
  return { city: "Slovensko", district: text.split(",")[0]?.trim() || "Neznáme" };
}

/**
 * Scrapuje Bazoš Reality
 */
export async function scrapeBazos(options: {
  maxPages?: number;
  listingType?: ListingType;
} = {}): Promise<ScrapeResult> {
  const startTime = Date.now();
  const maxPages = options.maxPages || 5;
  const errors: string[] = [];
  const properties: ScrapedProperty[] = [];
  let pagesScraped = 0;
  
  // Kategórie na scrapovanie
  const categories = [
    { path: "/predam/byt/", listingType: "PREDAJ" as ListingType, name: "Byty predaj" },
    { path: "/predam/dom/", listingType: "PREDAJ" as ListingType, name: "Domy predaj" },
  ];
  
  // Ak je špecifikovaný typ, filtruj
  const categoriesToScrape = options.listingType 
    ? categories.filter(c => c.listingType === options.listingType)
    : categories;
  
  console.log(`\n🚀 Starting Simple Bazos Scraper`);
  console.log(`📂 Categories: ${categoriesToScrape.map(c => c.name).join(", ")}`);
  console.log(`📄 Max pages per category: ${maxPages}`);
  
  for (const category of categoriesToScrape) {
    console.log(`\n📂 ${category.name}`);
    
    for (let page = 0; page < maxPages; page++) {
      const offset = page * 20;
      const url = `https://reality.bazos.sk${category.path}${offset > 0 ? offset + "/" : ""}`;
      
      console.log(`  📄 Page ${page + 1}: ${url}`);
      
      // Delay medzi requestami
      if (page > 0) {
        await new Promise(r => setTimeout(r, 2000 + Math.random() * 1000));
      }
      
      const html = await fetchPage(url);
      
      if (!html) {
        errors.push(`Failed to fetch ${url}`);
        continue;
      }
      
      pagesScraped++;
      
      const $ = cheerio.load(html);
      
      // Bazoš štruktúra: h2.nadpis obsahuje link na inzerát
      // Cena je v nasledujúcom <b> tagu
      const listings = $("h2.nadpis, .nadpis");
      
      console.log(`  📋 Found ${listings.length} listing headers`);
      
      listings.each((_, el) => {
        try {
          const $el = $(el);
          const $link = $el.find("a[href*='/inzerat/']").first();
          
          if (!$link.length) return;
          
          const href = $link.attr("href") || "";
          const title = $link.text().trim();
          
          if (!href || !title || title.length < 5) return;
          
          // External ID
          const idMatch = href.match(/inzerat\/(\d+)/);
          const externalId = idMatch?.[1] || "";
          if (!externalId) return;
          
          // Cena - hľadaj v nasledujúcich elementoch
          let priceText = "";
          let $current = $el.next();
          for (let i = 0; i < 5 && $current.length; i++) {
            const text = $current.text();
            if (text.includes("€")) {
              priceText = text;
              break;
            }
            const $bold = $current.find("b, strong").first();
            if ($bold.length && $bold.text().match(/\d/)) {
              priceText = $bold.text();
              break;
            }
            $current = $current.next();
          }
          
          const price = parsePrice(priceText);
          if (price < 10000) return; // Filter príliš lacné
          
          // Plocha z titulu
          let areaM2 = parseArea(title);
          if (areaM2 === 0) areaM2 = 50; // Default
          
          // Mesto z titulu
          const { city, district } = parseCity(title);
          
          // Izby
          const roomsMatch = title.match(/(\d)\s*[-\s]?izb/i);
          const rooms = roomsMatch ? parseInt(roomsMatch[1], 10) : undefined;
          
          properties.push({
            externalId,
            source: "BAZOS",
            title: title.substring(0, 200),
            description: "",
            price,
            pricePerM2: Math.round(price / areaM2),
            areaM2,
            city,
            district,
            rooms,
            listingType: category.listingType,
            sourceUrl: href.startsWith("http") ? href : `https://reality.bazos.sk${href}`,
          });
          
        } catch (e) {
          // Skip individual errors
        }
      });
      
      // Ak málo výsledkov, koniec kategórie
      if (listings.length < 10) {
        console.log(`  ⏹️ Reached last page`);
        break;
      }
    }
  }
  
  const duration = Date.now() - startTime;
  
  console.log(`\n📊 Scraping Complete:`);
  console.log(`  - Properties: ${properties.length}`);
  console.log(`  - Pages: ${pagesScraped}`);
  console.log(`  - Errors: ${errors.length}`);
  console.log(`  - Duration: ${(duration / 1000).toFixed(1)}s`);
  
  return {
    properties,
    pagesScraped,
    errors,
    duration,
  };
}

/**
 * Test scraper - vráti sample dáta
 */
export async function testSimpleScraper(): Promise<{
  success: boolean;
  message: string;
  sampleData?: ScrapedProperty[];
}> {
  try {
    const result = await scrapeBazos({ maxPages: 1 });
    
    return {
      success: result.properties.length > 0,
      message: result.properties.length > 0 
        ? `Found ${result.properties.length} properties`
        : `No properties found. Errors: ${result.errors.join(", ")}`,
      sampleData: result.properties.slice(0, 3),
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
