/**
 * Simple Scraper - Priamy fetch bez Browserless
 * Používa Cheerio na parsovanie HTML
 * 
 * Aktualizované pre 2026: Bazoš + Nehnutelnosti.sk
 */

import * as cheerio from "cheerio";
import type { ListingType, PropertySource } from "@/generated/prisma/client";
import { getCityFromPsc } from "./psc-map";
import { extractLocationWithAI } from "@/lib/ai/location-extraction";

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
  street?: string;
  rooms?: number;
  floor?: number;
  condition?: string;
  listingType: ListingType;
  sourceUrl: string;
  // Fotky
  imageUrls?: string[];
  // Kontakt
  sellerName?: string;
  sellerPhone?: string;
}

export interface ScrapeResult {
  properties: ScrapedProperty[];
  pagesScraped: number;
  errors: string[];
  duration: number;
}

// User agents pre rotáciu - aktuálne 2026
const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_3_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3.1 Safari/605.1.15",
];

function getRandomUA(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

async function fetchPage(url: string): Promise<string | null> {
  try {
    console.log(`  🌐 Fetching: ${url}`);
    
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    
    const response = await fetch(url, {
      headers: {
        "User-Agent": getRandomUA(),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "sk-SK,sk;q=0.9,cs;q=0.8,en-US;q=0.7,en;q=0.6",
        "Accept-Encoding": "gzip, deflate, br",
        "DNT": "1",
        "Connection": "keep-alive",
        "Upgrade-Insecure-Requests": "1",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-User": "?1",
        "Cache-Control": "max-age=0",
      },
      signal: controller.signal,
    });
    
    clearTimeout(timeout);
    
    if (!response.ok) {
      console.error(`  ❌ HTTP ${response.status} for ${url}`);
      return null;
    }
    
    const html = await response.text();
    console.log(`  ✓ Received ${html.length} bytes`);
    return html;
  } catch (error) {
    console.error(`  ❌ Fetch error for ${url}:`, error instanceof Error ? error.message : "Unknown");
    return null;
  }
}

function parsePrice(text: string): number {
  // Detekcia "cena dohodou" a podobných variantov
  const lowerText = text.toLowerCase();
  if (
    lowerText.includes("dohodou") ||
    lowerText.includes("dohoda") ||
    lowerText.includes("dohodě") ||
    lowerText.includes("info v rk") ||
    lowerText.includes("cena v rk") ||
    lowerText.includes("na vyžiadanie")
  ) {
    return -1; // Špeciálna hodnota pre "cena dohodou"
  }
  
  // Odstrániť všetky nečíselné znaky okrem číslic a medzier
  const cleaned = text.replace(/[^\d\s]/g, "").replace(/\s+/g, "");
  const price = parseInt(cleaned, 10);
  return (price > 1000 && price < 100000000) ? price : 0;
}

function parseArea(text: string): number {
  // Hľadaj pattern: číslo + m² alebo m2
  const match = text.match(/(\d+(?:[,\.]\d+)?)\s*m[²2]/i);
  if (match) {
    return parseFloat(match[1].replace(",", "."));
  }
  // Skús hľadať len číslo v kontexte
  const numMatch = text.match(/(\d{2,3})\s*(?:m|metrov)/i);
  return numMatch ? parseFloat(numMatch[1]) : 0;
}

// Slovenské mestá pre parsing
const SLOVAK_CITIES: Record<string, string> = {
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
  "pezinok": "Pezinok",
  "senec": "Senec",
  "malacky": "Malacky",
  "skalica": "Skalica",
  "senica": "Senica",
  "hlohovec": "Hlohovec",
  "sered": "Sereď",
  "galanta": "Galanta",
  "samorin": "Šamorín",
  "sala": "Šaľa",
  "sturovo": "Štúrovo",
  "partizanske": "Partizánske",
  "nove mesto nad vahom": "Nové Mesto nad Váhom",
  "dubnica nad vahom": "Dubnica nad Váhom",
  "povazska bystrica": "Považská Bystrica",
  "bytca": "Bytča",
  "cadca": "Čadca",
  "dolny kubin": "Dolný Kubín",
  "namestovo": "Námestovo",
  "kysucke nove mesto": "Kysucké Nové Mesto",
  "tvrdosin": "Tvrdošín",
  "brezno": "Brezno",
  "ziar nad hronom": "Žiar nad Hronom",
  "zarnovica": "Žarnovica",
  "kremnica": "Kremnica",
  "rimavska sobota": "Rimavská Sobota",
  "roznava": "Rožňava",
  "revuca": "Revúca",
  "velky krtis": "Veľký Krtíš",
  "kezmarok": "Kežmarok",
  "stara lubovna": "Stará Ľubovňa",
  "svit": "Svit",
  "stropkov": "Stropkov",
  "svidnik": "Svidník",
  "bardejov": "Bardejov",
  "vranov nad toplou": "Vranov nad Topľou",
  "snina": "Snina",
  "sobrance": "Sobrance",
  "trebisov": "Trebišov",
  "secovce": "Sečovce",
  "kralovsky chlmec": "Kráľovský Chlmec",
  "medzilaborce": "Medzilaborce",
  // Bratislavské časti
  "petrzalka": "Bratislava",
  "ruzinov": "Bratislava",
  "dubravka": "Bratislava",
  "nove mesto": "Bratislava",
  "stare mesto": "Bratislava",
  "karlova ves": "Bratislava",
  "devinska nova ves": "Bratislava",
  "devin": "Bratislava",
  "lamac": "Bratislava",
  "raca": "Bratislava",
  "vajnory": "Bratislava",
  "podunajske biskupice": "Bratislava",
  "vrakuna": "Bratislava",
  "jarovce": "Bratislava",
  "rusovce": "Bratislava",
  "cunovo": "Bratislava",
  // Košické časti
  "terasa": "Košice",
  "tahanovce": "Košice",
  "saca": "Košice",
  "sidlisko kvo": "Košice",
  "stare mesto kosice": "Košice",
  "juh": "Košice",
  "sever": "Košice",
  "zapad": "Košice",
  "dargovskych hrdinov": "Košice",
};

function parseCity(text: string): { city: string; district: string } {
  const normalized = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  
  // Hľadaj známe mestá
  for (const [key, city] of Object.entries(SLOVAK_CITIES)) {
    if (normalized.includes(key)) {
      // Skús extrahovať okres
      const districtMatch = text.match(/([^,]+)/);
      return { 
        city, 
        district: districtMatch?.[1]?.trim() || city 
      };
    }
  }
  
  const pscCity = getCityFromPsc(text);
  if (pscCity) return { city: pscCity, district: pscCity };
  
  // Fallback - skús extrahovať prvé slovo s veľkým písmenom
  const words = text.split(/[\s,;]+/).filter(w => w.length > 2);
  for (const word of words) {
    // Preskočiť bežné slová
    const skip = ["predaj", "prenájom", "byt", "dom", "izb", "izbový", "nova", "nová", "stará", "pri", "nad", "pod", "ulica", "ul"];
    if (skip.some(s => word.toLowerCase().includes(s))) continue;
    if (/^\d/.test(word)) continue;
    
    if (word[0] === word[0].toUpperCase() && word.length > 3) {
      return { city: word, district: word };
    }
  }
  
  return { city: "Slovensko", district: "Neznáme" };
}

/** AI dopĺňanie lokality pre inzeráty s city=Slovensko (voliteľné, len pri ANTHROPIC_API_KEY) */
async function enrichUnknownLocationsWithAI(
  properties: ScrapedProperty[]
): Promise<void> {
  const toEnrich = properties.filter((p) => p.city === "Slovensko");
  if (toEnrich.length === 0 || !process.env.ANTHROPIC_API_KEY) return;

  for (const p of toEnrich) {
    try {
      const aiLocation = await extractLocationWithAI({
        title: p.title,
        description: p.description || undefined,
        locationText: undefined,
        address: undefined,
      });
      if (aiLocation?.city) {
        p.city = aiLocation.city;
        p.district = aiLocation.district ?? aiLocation.city;
      }
    } catch {
      /* skip per-item errors */
    }
  }
}

/**
 * Scrapuje Bazoš Reality - AKTUALIZOVANÉ 2026
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
  
  // Kategórie - PREDAJ
  const categories = [
    { path: "/predam/byt/", listingType: "PREDAJ" as ListingType, name: "Byty" },
    { path: "/predam/dom/", listingType: "PREDAJ" as ListingType, name: "Domy" },
    { path: "/predam/pozemok/", listingType: "PREDAJ" as ListingType, name: "Pozemky" },
  ];
  
  const categoriesToScrape = options.listingType 
    ? categories.filter(c => c.listingType === options.listingType)
    : categories;
  
  console.log(`\n🚀 Starting Bazos Scraper (2026 selectors)`);
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
        await new Promise(r => setTimeout(r, 800 + Math.random() * 400));
      }
      
      const html = await fetchPage(url);
      
      if (!html) {
        errors.push(`Failed to fetch ${url}`);
        continue;
      }
      
      pagesScraped++;
      
      const $ = cheerio.load(html);
      
      // BAZOŠ 2026 SELEKTORY:
      // Každý inzerát je v elemente s triedou obsahujúcou "inzeraty" alebo v div.inzeraty
      // Linky sú v formáte: /inzerat/CISLO/nazov.php
      // Cena je v elemente s € symbolom
      
      let foundOnPage = 0;
      
      // Hľadaj všetky linky na inzeráty
      const links = $("a[href*='/inzerat/']");
      const processedIds = new Set<string>();
      
      links.each((_, el) => {
        try {
          const $link = $(el);
          const href = $link.attr("href") || "";
          
          // Extrahuj ID z URL
          const idMatch = href.match(/\/inzerat\/(\d+)\//);
          if (!idMatch) return;
          
          const externalId = idMatch[1];
          
          // Skip duplicity
          if (processedIds.has(externalId)) return;
          processedIds.add(externalId);
          
          // Titulok
          const title = $link.text().trim();
          if (!title || title.length < 5 || title.length > 300) return;
          
          // Nájdi parent container
          const $container = $link.closest("div, article, section").first();
          const containerText = $container.length ? $container.text() : "";
          
          // Cena - hľadaj v okolí
          let price = 0;
          const pricePatterns = [
            /(\d[\d\s,.]*)\s*€/g,
            /(\d[\d\s,.]*)\s*eur/gi,
          ];
          
          for (const pattern of pricePatterns) {
            const matches = containerText.matchAll(pattern);
            for (const match of matches) {
              const p = parsePrice(match[1]);
              if (p > price && p < 50000000) {
                price = p;
              }
            }
          }
          
          if (price < 10000) return; // Filter príliš lacné
          
          // Plocha z titulu alebo kontextu
          let areaM2 = parseArea(title);
          if (areaM2 === 0) {
            areaM2 = parseArea(containerText);
          }
          if (areaM2 === 0 || areaM2 < 10) areaM2 = 50; // Default
          
          // Mesto z kontextu
          let { city, district } = parseCity(title);
          if (city === "Slovensko") {
            const cityResult = parseCity(containerText);
            if (cityResult.city !== "Slovensko") {
              city = cityResult.city;
              district = cityResult.district;
            }
          }
          
          // Izby z titulu
          const roomsMatch = title.match(/(\d)\s*[-\s]?izb/i);
          const rooms = roomsMatch ? parseInt(roomsMatch[1], 10) : undefined;
          
          // Fotky - hľadaj obrázky v containeri
          const imageUrls: string[] = [];
          $container.find("img").each((_, img) => {
            const src = $(img).attr("src") || $(img).attr("data-src") || "";
            // Filtruj len fotky inzerátov (nie ikony, loga)
            if (src && (src.includes("img.bazos") || src.includes("reality.bazos")) && !src.includes("logo")) {
              // Konvertuj thumbnail na väčšiu verziu ak je to možné
              const fullSrc = src.replace("/thm/", "/img/").replace("_t.", ".");
              if (!imageUrls.includes(fullSrc)) {
                imageUrls.push(fullSrc);
              }
            }
          });
          
          foundOnPage++;
          
          properties.push({
            externalId: `bazos_${externalId}`,
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
            imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
          });
          
        } catch (e) {
          // Skip individual errors
        }
      });
      
      console.log(`  ✓ Found ${foundOnPage} listings on page`);

      if (foundOnPage < 3) {
        console.log(`  ⏹️ Reached last page or no more listings`);
        break;
      }
    }
  }
  
  await enrichUnknownLocationsWithAI(properties);

  const duration = Date.now() - startTime;
  console.log(`\n📊 Bazos Scraping Complete:`);
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
 * Scrapuje Nehnutelnosti.sk - AKTUALIZOVANÉ 2026
 * Poznámka: Stránka používa Next.js, obsah je čiastočne JS-rendered
 */
export async function scrapeNehnutelnosti(options: {
  maxPages?: number;
} = {}): Promise<ScrapeResult> {
  const startTime = Date.now();
  const maxPages = options.maxPages || 3;
  const errors: string[] = [];
  const properties: ScrapedProperty[] = [];
  let pagesScraped = 0;
  
  // Kategórie – len byty (ostatné typy prídeme neskôr)
  const categories = [
    { path: "/predaj/byty/", name: "Byty" },
  ];
  
  console.log(`\n🚀 Starting Nehnutelnosti.sk Scraper (2026 selectors)`);
  console.log(`📂 Categories: ${categories.map(c => c.name).join(", ")}`);
  console.log(`📄 Max pages per category: ${maxPages}`);
  
  for (const category of categories) {
    console.log(`\n📂 ${category.name}`);
    
    for (let page = 1; page <= maxPages; page++) {
      const url = `https://www.nehnutelnosti.sk${category.path}?page=${page}`;
      
      console.log(`  📄 Page ${page}: ${url}`);
      
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
      
      // NEHNUTELNOSTI.SK 2026 SELEKTORY:
      // Linky sú v formáte: /detail/ID/nazov
      // Obsah je v kartách s obrázkami
      
      let foundOnPage = 0;
      const processedIds = new Set<string>();
      
      // Hľadaj všetky linky na detail
      $("a[href*='/detail/']").each((_, el) => {
        try {
          const $link = $(el);
          const href = $link.attr("href") || "";
          
          // Extrahuj ID z URL (nehnutelnosti používa base64-like ID)
          const idMatch = href.match(/\/detail\/([^/]+)\//);
          if (!idMatch) return;
          
          const externalId = idMatch[1];
          
          // Skip duplicity a krátke ID
          if (processedIds.has(externalId) || externalId.length < 5) return;
          processedIds.add(externalId);
          
          // Nájdi najväčší parent container
          let $container = $link.parent();
          for (let i = 0; i < 5 && $container.length; i++) {
            if ($container.text().length > 100) break;
            $container = $container.parent();
          }
          
          const containerText = $container.text();
          
          // Titulok - hľadaj H2/H3 alebo text linku
          let title = "";
          const $heading = $container.find("h2, h3").first();
          if ($heading.length) {
            title = $heading.text().trim();
          }
          if (!title || title.length < 10) {
            title = $link.text().trim();
          }
          if (!title || title.length < 10) return;
          
          // Odstráň časti titulu ktoré nie sú relevantné
          title = title.replace(/^PREMIUM\s*/i, "").trim();
          if (title.length < 10 || title.length > 300) return;
          
          // Cena
          const priceMatch = containerText.match(/(\d[\d\s,.]*)\s*€/);
          const price = priceMatch ? parsePrice(priceMatch[1]) : 0;
          if (price < 10000) return;
          
          // Plocha
          const areaMatch = containerText.match(/(\d+(?:[,\.]\d+)?)\s*m[²2]/);
          const areaM2 = areaMatch ? parseFloat(areaMatch[1].replace(",", ".")) : 50;
          
          // Lokalita
          let { city, district } = parseCity(containerText);
          if (city === "Slovensko") {
            // Skús z title
            const cityFromTitle = parseCity(title);
            if (cityFromTitle.city !== "Slovensko") {
              city = cityFromTitle.city;
              district = cityFromTitle.district;
            }
          }
          
          // Izby
          const roomsMatch = containerText.match(/(\d)\s*[-\s]?izb/i);
          const rooms = roomsMatch ? parseInt(roomsMatch[1], 10) : undefined;
          
          // Fotky - hľadaj obrázky v containeri
          const imageUrls: string[] = [];
          $container.find("img").each((_, img) => {
            const src = $(img).attr("src") || $(img).attr("data-src") || "";
            // Filtruj len fotky inzerátov (nie ikony, loga, placeholdery)
            // DÔLEŽITÉ: nehnutelnosti.sk používa img.unitedclassifieds.sk pre obrázky!
            if (src && 
                (src.includes("nehnutelnosti.sk") || 
                 src.includes("unitedclassifieds.sk") || 
                 src.includes("cdn.") || 
                 src.includes("images.") ||
                 src.includes("img.")) && 
                !src.includes("logo") && 
                !src.includes("icon") &&
                !src.includes("placeholder") &&
                !src.includes("/_next/static") &&
                src.length > 30) {
              // Skús získať väčšiu verziu ak je thumbnail
              const fullSrc = src.replace("/thumb/", "/").replace("_thumb", "").replace("_small", "");
              if (!imageUrls.includes(fullSrc)) {
                imageUrls.push(fullSrc);
              }
            }
          });
          
          foundOnPage++;
          
          properties.push({
            externalId: `neh_${externalId}`,
            source: "NEHNUTELNOSTI",
            title: title.substring(0, 200),
            description: "",
            price,
            pricePerM2: areaM2 > 0 ? Math.round(price / areaM2) : 0,
            areaM2,
            city,
            district,
            rooms,
            listingType: "PREDAJ",
            sourceUrl: href.startsWith("http") ? href : `https://www.nehnutelnosti.sk${href}`,
            imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
          });
          
        } catch (e) {
          // Skip individual errors
        }
      });
      
      console.log(`  ✓ Found ${foundOnPage} listings on page`);
      
      if (foundOnPage < 3) {
        console.log(`  ⏹️ Reached last page or no more listings`);
        break;
      }
    }
  }

  await enrichUnknownLocationsWithAI(properties);

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
 * Scrapuje všetky portály
 */
export async function scrapeAll(options: {
  maxPages?: number;
} = {}): Promise<ScrapeResult> {
  const startTime = Date.now();
  const allProperties: ScrapedProperty[] = [];
  const allErrors: string[] = [];
  let totalPages = 0;
  
  console.log("\n🚀 Starting Full Scrape - Bazos + Nehnutelnosti.sk");
  
  // 1. Scrape Bazoš (priorita - funguje spoľahlivejšie)
  try {
    console.log("\n--- BAZOS ---");
    const bazosResult = await scrapeBazos({ maxPages: options.maxPages || 3 });
    allProperties.push(...bazosResult.properties);
    allErrors.push(...bazosResult.errors);
    totalPages += bazosResult.pagesScraped;
    console.log(`✓ Bazos: ${bazosResult.properties.length} properties`);
  } catch (e) {
    const errMsg = `Bazos error: ${e instanceof Error ? e.message : "Unknown"}`;
    console.error(`❌ ${errMsg}`);
    allErrors.push(errMsg);
  }
  
  // Pauza medzi portálmi
  await new Promise(r => setTimeout(r, 2000));
  
  // 2. Scrape Nehnutelnosti.sk
  try {
    console.log("\n--- NEHNUTELNOSTI.SK ---");
    const nehResult = await scrapeNehnutelnosti({ maxPages: options.maxPages || 2 });
    allProperties.push(...nehResult.properties);
    allErrors.push(...nehResult.errors);
    totalPages += nehResult.pagesScraped;
    console.log(`✓ Nehnutelnosti.sk: ${nehResult.properties.length} properties`);
  } catch (e) {
    const errMsg = `Nehnutelnosti error: ${e instanceof Error ? e.message : "Unknown"}`;
    console.error(`❌ ${errMsg}`);
    allErrors.push(errMsg);
  }
  
  const duration = Date.now() - startTime;
  
  // Deduplikácia podľa podobnosti (rovnaký titul + mesto + cena)
  const uniqueProps: ScrapedProperty[] = [];
  const seen = new Set<string>();
  
  for (const prop of allProperties) {
    const key = `${prop.title.toLowerCase().substring(0, 50)}_${prop.city}_${prop.price}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueProps.push(prop);
    }
  }
  
  console.log(`\n📊 Full Scrape Complete:`);
  console.log(`  - Total Raw: ${allProperties.length}`);
  console.log(`  - After Dedup: ${uniqueProps.length}`);
  console.log(`  - Pages: ${totalPages}`);
  console.log(`  - Errors: ${allErrors.length}`);
  console.log(`  - Duration: ${(duration / 1000).toFixed(1)}s`);
  
  return {
    properties: uniqueProps,
    pagesScraped: totalPages,
    errors: allErrors,
    duration,
  };
}

/**
 * Test scraper
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
