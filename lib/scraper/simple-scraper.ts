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
  const normalized = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  
  const cityMap: Record<string, string> = {
    "bratislava": "Bratislava",
    "kosice": "Košice",
    "presov": "Prešov",
    "zilina": "Žilina",
    "banska bystrica": "Banská Bystrica",
    "trnava": "Trnava",
    "trencin": "Trenčín",
    "nitra": "Nitra",
    "poprad": "Poprad",
    "martin": "Martin",
    "zvolen": "Zvolen",
    "prievidza": "Prievidza",
    "michalovce": "Michalovce",
    "spisska nova ves": "Spišská Nová Ves",
    "humenne": "Humenné",
    "levice": "Levice",
    "komarno": "Komárno",
    "nove zamky": "Nové Zámky",
    "dunajska streda": "Dunajská Streda",
    "ruzomberok": "Ružomberok",
    "liptovsky mikulas": "Liptovský Mikuláš",
    "lucenec": "Lučenec",
    "piestany": "Piešťany",
    "terasa": "Košice",
    "petrzalka": "Bratislava",
    "ruzinov": "Bratislava",
    "dubravka": "Bratislava",
    "tahanovce": "Košice",
  };
  
  for (const [key, city] of Object.entries(cityMap)) {
    if (normalized.includes(key)) {
      return { city, district: text.split(",")[0]?.trim() || city };
    }
  }
  
  // Skús nájsť PSČ a určiť mesto
  const pscMatch = text.match(/(\d{3})\s?(\d{2})/);
  if (pscMatch) {
    const psc = pscMatch[1];
    const pscToCity: Record<string, string> = {
      "811": "Bratislava", "821": "Bratislava", "831": "Bratislava", "841": "Bratislava", "851": "Bratislava",
      "040": "Košice", "041": "Košice", "042": "Košice", "043": "Košice", "044": "Košice",
      "080": "Prešov", "081": "Prešov", "082": "Prešov",
      "010": "Žilina", "011": "Žilina", "012": "Žilina",
      "974": "Banská Bystrica", "975": "Banská Bystrica",
      "917": "Trnava", "918": "Trnava",
      "949": "Nitra", "950": "Nitra",
      "911": "Trenčín", "912": "Trenčín",
      "058": "Poprad", "059": "Poprad",
    };
    
    if (pscToCity[psc]) {
      return { city: pscToCity[psc], district: pscToCity[psc] };
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
  
  // Kategórie na scrapovanie - CELÉ SLOVENSKO (iba PREDAJ)
  const categories = [
    { path: "/predam/byt/", listingType: "PREDAJ" as ListingType, name: "Byty" },
    { path: "/predam/dom/", listingType: "PREDAJ" as ListingType, name: "Domy" },
    { path: "/predam/pozemok/", listingType: "PREDAJ" as ListingType, name: "Pozemky" },
    { path: "/predam/chata/", listingType: "PREDAJ" as ListingType, name: "Chaty a chalupy" },
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
      
      // Delay medzi requestami - kratší pre Vercel limit
      if (page > 0) {
        await new Promise(r => setTimeout(r, 1000 + Math.random() * 500));
      }
      
      const html = await fetchPage(url);
      
      if (!html) {
        errors.push(`Failed to fetch ${url}`);
        continue;
      }
      
      pagesScraped++;
      
      const $ = cheerio.load(html);
      
      // Bazoš štruktúra 2026:
      // - Každý inzerát má <h2> s linkom na /inzerat/
      // - Cena je v <b> alebo <strong> tagu s € symbolom
      // - Lokalita je text s PSČ
      
      // Nájdi všetky h2 elementy ktoré obsahujú link na inzerát
      const h2Elements = $("h2");
      let foundOnPage = 0;
      
      h2Elements.each((_, el) => {
        try {
          const $h2 = $(el);
          const $link = $h2.find("a[href*='/inzerat/']");
          
          if (!$link.length) return;
          
          const href = $link.attr("href") || "";
          const title = $link.text().trim();
          
          if (!href || !title || title.length < 5) return;
          
          // External ID
          const idMatch = href.match(/inzerat\/(\d+)/);
          const externalId = idMatch?.[1] || "";
          if (!externalId) return;
          
          // Nájdi cenu - hľadaj najbližší <b> alebo <strong> s € v celom kontexte
          // Bazoš má cenu ako **245 000 €** čo je <b> alebo <strong>
          let priceText = "";
          
          // Hľadaj v parent containeroch
          const $parent = $h2.parent();
          const $grandparent = $parent.parent();
          
          // Skús nájsť cenu v okolí
          const nearbyText = $grandparent.text() || $parent.text() || "";
          const priceMatch = nearbyText.match(/(\d[\d\s]*)\s*€/);
          if (priceMatch) {
            priceText = priceMatch[0];
          }
          
          // Ak nenájdeme cenu v okolí, hľadaj v nasledujúcich elementoch
          if (!priceText) {
            let $current = $h2.next();
            for (let i = 0; i < 10 && $current.length; i++) {
              const text = $current.text();
              const match = text.match(/(\d[\d\s]*)\s*€/);
              if (match) {
                priceText = match[0];
                break;
              }
              $current = $current.next();
            }
          }
          
          const price = parsePrice(priceText);
          if (price < 10000) return; // Filter príliš lacné
          
          // Plocha z titulu alebo popisu
          let areaM2 = parseArea(title);
          if (areaM2 === 0) {
            areaM2 = parseArea(nearbyText);
          }
          if (areaM2 === 0) areaM2 = 50; // Default
          
          // Mesto z titulu alebo z okolia (hľadaj PSČ pattern)
          let { city, district } = parseCity(title);
          if (city === "Slovensko") {
            // Skús nájsť mesto v okolí
            const cityResult = parseCity(nearbyText);
            if (cityResult.city !== "Slovensko") {
              city = cityResult.city;
              district = cityResult.district;
            }
          }
          
          // Izby
          const roomsMatch = title.match(/(\d)\s*[-\s]?izb/i);
          const rooms = roomsMatch ? parseInt(roomsMatch[1], 10) : undefined;
          
          foundOnPage++;
          
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
      
      console.log(`  📋 Found ${foundOnPage} listings on page`);
      
      // Ak málo výsledkov, koniec kategórie
      if (foundOnPage < 5) {
        console.log(`  ⏹️ Reached last page or no more listings`);
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
 * Scrapuje Nehnutelnosti.sk
 */
export async function scrapeNehnutelnosti(options: {
  maxPages?: number;
} = {}): Promise<ScrapeResult> {
  const startTime = Date.now();
  const maxPages = options.maxPages || 5;
  const errors: string[] = [];
  const properties: ScrapedProperty[] = [];
  let pagesScraped = 0;
  
  // Kategórie na scrapovanie - CELÉ SLOVENSKO (iba PREDAJ)
  const categories = [
    { path: "/predaj/byty/", name: "Byty" },
    { path: "/predaj/domy/", name: "Domy" },
    { path: "/predaj/pozemky/", name: "Pozemky" },
  ];
  
  console.log(`\n🚀 Starting Nehnutelnosti.sk Scraper`);
  console.log(`📂 Categories: ${categories.map(c => c.name).join(", ")}`);
  console.log(`📄 Max pages per category: ${maxPages}`);
  
  for (const category of categories) {
    console.log(`\n📂 ${category.name}`);
    
    for (let page = 1; page <= maxPages; page++) {
      const url = `https://www.nehnutelnosti.sk${category.path}?page=${page}`;
      
      console.log(`  📄 Page ${page}: ${url}`);
      
      // Delay medzi requestami - kratší pre Vercel limit
      if (page > 1) {
        await new Promise(r => setTimeout(r, 1000 + Math.random() * 500));
      }
      
      const html = await fetchPage(url);
      
      if (!html) {
        errors.push(`Failed to fetch ${url}`);
        continue;
      }
      
      pagesScraped++;
      
      const $ = cheerio.load(html);
      
      // Nehnutelnosti.sk štruktúra:
      // - Listings sú v kartách s linkom na /detail/
      // - Každý má title, cenu, lokalitu, výmeru
      
      let foundOnPage = 0;
      
      // Nájdi všetky linky na detail
      $("a[href*='/detail/']").each((_, el) => {
        try {
          const $link = $(el);
          const href = $link.attr("href") || "";
          
          // Preskočiť duplikáty (každý listing má viac linkov)
          if (!href.includes("/detail/") || href.includes("?")) return;
          
          // Nájdi parent container
          const $container = $link.closest("[class*='listing'], [class*='card'], article, section").first();
          if (!$container.length) return;
          
          // Extrahuj ID z URL
          const idMatch = href.match(/detail\/([^/]+)/);
          const externalId = idMatch?.[1] || "";
          if (!externalId || externalId.length < 5) return;
          
          // Deduplication - check if already added
          if (properties.some(p => p.externalId === externalId)) return;
          
          // Extrahuj text z containera
          const containerText = $container.text();
          
          // Title - nájdi h2 alebo hlavný nadpis
          let title = $container.find("h2, h3").first().text().trim();
          if (!title || title.length < 5) {
            title = $link.text().trim();
          }
          if (!title || title.length < 5) return;
          
          // Cena - hľadaj pattern s €
          const priceMatch = containerText.match(/(\d[\d\s,.]*)\s*€/);
          const price = priceMatch ? parsePrice(priceMatch[0]) : 0;
          if (price < 10000) return;
          
          // Plocha
          const areaMatch = containerText.match(/(\d+(?:[,\.]\d+)?)\s*m[²2]/);
          const areaM2 = areaMatch ? parseFloat(areaMatch[1].replace(",", ".")) : 50;
          
          // Lokalita - hľadaj okres alebo mesto
          let city = "Slovensko";
          let district = "";
          
          const locationMatch = containerText.match(/(Bratislava|Košice|Žilina|Prešov|Nitra|Trenčín|Trnava|Banská Bystrica)/i);
          if (locationMatch) {
            city = locationMatch[1];
            district = city;
          }
          
          // Izby
          const roomsMatch = containerText.match(/(\d)\s*[-\s]?izb/i);
          const rooms = roomsMatch ? parseInt(roomsMatch[1], 10) : undefined;
          
          foundOnPage++;
          
          properties.push({
            externalId,
            source: "NEHNUTELNOSTI",
            title: title.substring(0, 200),
            description: "",
            price,
            pricePerM2: Math.round(price / areaM2),
            areaM2,
            city,
            district,
            rooms,
            listingType: "PREDAJ",
            sourceUrl: href.startsWith("http") ? href : `https://www.nehnutelnosti.sk${href}`,
          });
          
        } catch (e) {
          // Skip individual errors
        }
      });
      
      console.log(`  📋 Found ${foundOnPage} listings on page`);
      
      // Ak málo výsledkov, koniec kategórie
      if (foundOnPage < 5) {
        console.log(`  ⏹️ Reached last page or no more listings`);
        break;
      }
    }
  }
  
  const duration = Date.now() - startTime;
  
  console.log(`\n📊 Nehnutelnosti.sk Scraping Complete:`);
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
 * Scrapuje OBA portály
 */
export async function scrapeAll(options: {
  maxPages?: number;
} = {}): Promise<ScrapeResult> {
  const startTime = Date.now();
  const allProperties: ScrapedProperty[] = [];
  const allErrors: string[] = [];
  let totalPages = 0;
  
  console.log("\n🚀 Starting FULL scrape - Bazos + Nehnutelnosti.sk");
  
  // Scrape Bazos
  try {
    const bazosResult = await scrapeBazos({ maxPages: options.maxPages });
    allProperties.push(...bazosResult.properties);
    allErrors.push(...bazosResult.errors);
    totalPages += bazosResult.pagesScraped;
  } catch (e) {
    allErrors.push(`Bazos error: ${e instanceof Error ? e.message : "Unknown"}`);
  }
  
  // Scrape Nehnutelnosti.sk
  try {
    const nehnutelnostiResult = await scrapeNehnutelnosti({ maxPages: options.maxPages });
    allProperties.push(...nehnutelnostiResult.properties);
    allErrors.push(...nehnutelnostiResult.errors);
    totalPages += nehnutelnostiResult.pagesScraped;
  } catch (e) {
    allErrors.push(`Nehnutelnosti error: ${e instanceof Error ? e.message : "Unknown"}`);
  }
  
  const duration = Date.now() - startTime;
  
  console.log(`\n📊 FULL Scraping Complete:`);
  console.log(`  - Total Properties: ${allProperties.length}`);
  console.log(`  - Total Pages: ${totalPages}`);
  console.log(`  - Errors: ${allErrors.length}`);
  console.log(`  - Duration: ${(duration / 1000).toFixed(1)}s`);
  
  return {
    properties: allProperties,
    pagesScraped: totalPages,
    errors: allErrors,
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
