/**
 * Browserless.io Scraper
 * 
 * Univerzálny scraper pre JS-rendered stránky
 * Podporuje: Nehnutelnosti.sk, Reality.sk
 */

import type { Browser, Page } from "playwright-core";
import type { ListingType, PropertySource } from "@/generated/prisma/client";

// ============================================
// Types
// ============================================

export interface ScrapedProperty {
  externalId: string;
  source: PropertySource;
  title: string;
  description: string;
  price: number;
  pricePerM2: number;
  areaM2: number;
  city: string;      // Názov mesta/obce
  district: string;  // Okres alebo mestská časť
  rooms?: number;
  listingType: ListingType;
  sourceUrl: string;
  imageUrl?: string;
}

export interface ScrapeResult {
  properties: ScrapedProperty[];
  pagesScraped: number;
  errors: string[];
  duration: number;
}

interface PortalConfig {
  name: string;
  baseUrl: string;
  source: PropertySource;
  selectors: {
    listingItem: string;
    title: string;
    price: string;
    area: string;
    location: string;
    link: string;
    nextPage: string;
  };
  categories: {
    path: string;
    listingType: ListingType;
    name: string;
  }[];
}

// ============================================
// Portal Configurations
// ============================================

const NEHNUTELNOSTI_CONFIG: PortalConfig = {
  name: "Nehnutelnosti.sk",
  baseUrl: "https://www.nehnutelnosti.sk",
  source: "NEHNUTELNOSTI",
  selectors: {
    listingItem: "[data-testid='search-result-card'], .MuiCard-root, article, .estate-item",
    title: "h2, h3, [data-testid='title'], .title",
    price: "[data-testid='price'], .price, .MuiTypography-root:has-text('€')",
    area: "[data-testid='area'], .area, :has-text('m²')",
    location: "[data-testid='location'], .location, .address",
    link: "a[href*='/detail/'], a[href*='/nehnutelnost/']",
    nextPage: "a[rel='next'], button:has-text('Ďalšia'), [aria-label='next']",
  },
  categories: [
    // Predaj
    { path: "/byty/predaj/", listingType: "PREDAJ", name: "Byty predaj" },
    { path: "/domy/predaj/", listingType: "PREDAJ", name: "Domy predaj" },
    { path: "/pozemky/predaj/", listingType: "PREDAJ", name: "Pozemky predaj" },
    { path: "/chaty-chalupy/predaj/", listingType: "PREDAJ", name: "Chaty a chalupy predaj" },
    { path: "/komercne-priestory/predaj/", listingType: "PREDAJ", name: "Komerčné priestory predaj" },
    { path: "/garaze/predaj/", listingType: "PREDAJ", name: "Garáže predaj" },
    // Prenájom
    { path: "/byty/prenajom/", listingType: "PRENAJOM", name: "Byty prenájom" },
    { path: "/domy/prenajom/", listingType: "PRENAJOM", name: "Domy prenájom" },
    { path: "/komercne-priestory/prenajom/", listingType: "PRENAJOM", name: "Komerčné priestory prenájom" },
    { path: "/garaze/prenajom/", listingType: "PRENAJOM", name: "Garáže prenájom" },
  ],
};

const REALITY_CONFIG: PortalConfig = {
  name: "Reality.sk",
  baseUrl: "https://www.reality.sk",
  source: "REALITY",
  selectors: {
    listingItem: ".estate-list__item, article.estate, .property-card, .listing-item",
    title: ".estate-list__title, h2 a, .property-title, .title",
    price: ".estate-list__price, .price, .property-price",
    area: ".estate-list__area, .area, .property-area, :has-text('m²')",
    location: ".estate-list__location, .location, .address",
    link: "a[href*='/detail/'], a[href*='/inzerat/'], h2 a",
    nextPage: ".pagination__next, a[rel='next'], .next-page",
  },
  categories: [
    // Predaj
    { path: "/byty/predaj/", listingType: "PREDAJ", name: "Byty predaj" },
    { path: "/domy/predaj/", listingType: "PREDAJ", name: "Domy predaj" },
    { path: "/pozemky/predaj/", listingType: "PREDAJ", name: "Pozemky predaj" },
    { path: "/chaty-chalupy/predaj/", listingType: "PREDAJ", name: "Chaty a chalupy predaj" },
    { path: "/komercne-nehnutelnosti/predaj/", listingType: "PREDAJ", name: "Komerčné nehnuteľnosti predaj" },
    { path: "/garaze-parkovanie/predaj/", listingType: "PREDAJ", name: "Garáže predaj" },
    // Prenájom
    { path: "/byty/prenajom/", listingType: "PRENAJOM", name: "Byty prenájom" },
    { path: "/domy/prenajom/", listingType: "PRENAJOM", name: "Domy prenájom" },
    { path: "/komercne-nehnutelnosti/prenajom/", listingType: "PRENAJOM", name: "Komerčné nehnuteľnosti prenájom" },
    { path: "/garaze-parkovanie/prenajom/", listingType: "PRENAJOM", name: "Garáže prenájom" },
  ],
};

const TOPREALITY_CONFIG: PortalConfig = {
  name: "TopReality.sk",
  baseUrl: "https://www.topreality.sk",
  source: "TOPREALITY",
  selectors: {
    listingItem: ".property-item, .estate-item, article.listing, .list-item, [data-id]",
    title: ".property-title, h2 a, .title, .estate-title",
    price: ".property-price, .price, .estate-price, :has-text('€')",
    area: ".property-area, .area, .estate-area, :has-text('m²')",
    location: ".property-location, .location, .address, .estate-location",
    link: "a[href*='/detail/'], a[href*='/inzerat/'], a[href*='/nehnutelnost/'], h2 a",
    nextPage: ".pagination-next, a[rel='next'], .next, button:has-text('Ďalšia')",
  },
  categories: [
    // Predaj
    { path: "/vyhladavanie/predaj/byty/", listingType: "PREDAJ", name: "Byty predaj" },
    { path: "/vyhladavanie/predaj/domy/", listingType: "PREDAJ", name: "Domy predaj" },
    { path: "/vyhladavanie/predaj/pozemky/", listingType: "PREDAJ", name: "Pozemky predaj" },
    { path: "/vyhladavanie/predaj/chaty-chalupy/", listingType: "PREDAJ", name: "Chaty a chalupy predaj" },
    { path: "/vyhladavanie/predaj/komercne-nehnutelnosti/", listingType: "PREDAJ", name: "Komerčné nehnuteľnosti predaj" },
    { path: "/vyhladavanie/predaj/garaze/", listingType: "PREDAJ", name: "Garáže predaj" },
    // Prenájom
    { path: "/vyhladavanie/prenajom/byty/", listingType: "PRENAJOM", name: "Byty prenájom" },
    { path: "/vyhladavanie/prenajom/domy/", listingType: "PRENAJOM", name: "Domy prenájom" },
    { path: "/vyhladavanie/prenajom/komercne-nehnutelnosti/", listingType: "PRENAJOM", name: "Komerčné nehnuteľnosti prenájom" },
    { path: "/vyhladavanie/prenajom/garaze/", listingType: "PRENAJOM", name: "Garáže prenájom" },
  ],
};

const BAZOS_CONFIG: PortalConfig = {
  name: "Bazoš Reality",
  baseUrl: "https://reality.bazos.sk",
  source: "BAZOS",
  selectors: {
    listingItem: "h2:has(a[href*='/inzerat/']), .inzeraty .inzerat, .vypis .inzerat",
    title: "a[href*='/inzerat/']",
    price: "b, strong",
    area: ":has-text('m²'), :has-text('m2')",
    location: ":has-text('040'), :has-text('811'), :has-text('821'), :has-text('831'), :has-text('841'), :has-text('851')",
    link: "a[href*='/inzerat/']",
    nextPage: "a:has-text('Ďalšia'), a:has-text('další')",
  },
  categories: [
    // Predaj
    { path: "/predam/byt/", listingType: "PREDAJ", name: "Byty predaj" },
    { path: "/predam/dom/", listingType: "PREDAJ", name: "Domy predaj" },
    { path: "/predam/pozemok/", listingType: "PREDAJ", name: "Pozemky predaj" },
    { path: "/predam/chata/", listingType: "PREDAJ", name: "Chaty predaj" },
    // Prenájom
    { path: "/prenajmu/byt/", listingType: "PRENAJOM", name: "Byty prenájom" },
    { path: "/prenajmu/dom/", listingType: "PRENAJOM", name: "Domy prenájom" },
  ],
};

export const PORTAL_CONFIGS: Record<string, PortalConfig> = {
  NEHNUTELNOSTI: NEHNUTELNOSTI_CONFIG,
  REALITY: REALITY_CONFIG,
  TOPREALITY: TOPREALITY_CONFIG,
  BAZOS: BAZOS_CONFIG,
};

// ============================================
// City Mapping
// ============================================

// Mapovanie lokalít na štandardizované názvy miest
// Obsahuje všetky slovenské mestá a významné obce
const CITY_MAP: Record<string, string> = {
  // Krajské mestá
  "bratislava": "Bratislava",
  "košice": "Košice", "kosice": "Košice",
  "prešov": "Prešov", "presov": "Prešov",
  "žilina": "Žilina", "zilina": "Žilina",
  "banská bystrica": "Banská Bystrica", "banska bystrica": "Banská Bystrica",
  "trnava": "Trnava",
  "trenčín": "Trenčín", "trencin": "Trenčín",
  "nitra": "Nitra",
  
  // Okresné mestá a významné mestá (abecedne)
  "bánovce nad bebravou": "Bánovce nad Bebravou",
  "bardejov": "Bardejov",
  "brezno": "Brezno",
  "bytča": "Bytča",
  "čadca": "Čadca", "cadca": "Čadca",
  "detva": "Detva",
  "dolný kubín": "Dolný Kubín", "dolny kubin": "Dolný Kubín",
  "dubnica nad váhom": "Dubnica nad Váhom",
  "dunajská streda": "Dunajská Streda",
  "fiľakovo": "Fiľakovo",
  "galanta": "Galanta",
  "gelnica": "Gelnica",
  "hlohovec": "Hlohovec",
  "hnúšťa": "Hnúšťa",
  "humenné": "Humenné", "humenne": "Humenné",
  "ilava": "Ilava",
  "kežmarok": "Kežmarok", "kezmarok": "Kežmarok",
  "komárno": "Komárno", "komarno": "Komárno",
  "krupina": "Krupina",
  "kysucké nové mesto": "Kysucké Nové Mesto",
  "leopoldov": "Leopoldov",
  "levice": "Levice",
  "levoča": "Levoča", "levoca": "Levoča",
  "liptovský mikuláš": "Liptovský Mikuláš", "liptovsky mikulas": "Liptovský Mikuláš",
  "lučenec": "Lučenec", "lucenec": "Lučenec",
  "malacky": "Malacky",
  "martin": "Martin",
  "medzilaborce": "Medzilaborce",
  "michalovce": "Michalovce",
  "modra": "Modra",
  "myjava": "Myjava",
  "námestovo": "Námestovo", "namestovo": "Námestovo",
  "nová baňa": "Nová Baňa",
  "nová dubnica": "Nová Dubnica",
  "nové mesto nad váhom": "Nové Mesto nad Váhom",
  "nové zámky": "Nové Zámky", "nove zamky": "Nové Zámky",
  "partizánske": "Partizánske", "partizanske": "Partizánske",
  "pezinok": "Pezinok",
  "piešťany": "Piešťany", "piestany": "Piešťany",
  "poltár": "Poltár",
  "poprad": "Poprad",
  "považská bystrica": "Považská Bystrica",
  "prievidza": "Prievidza",
  "púchov": "Púchov", "puchov": "Púchov",
  "revúca": "Revúca",
  "rimavská sobota": "Rimavská Sobota",
  "rožňava": "Rožňava", "roznava": "Rožňava",
  "ružomberok": "Ružomberok", "ruzomberok": "Ružomberok",
  "sabinov": "Sabinov",
  "senec": "Senec",
  "senica": "Senica",
  "skalica": "Skalica",
  "snina": "Snina",
  "sobrance": "Sobrance",
  "spišská nová ves": "Spišská Nová Ves",
  "stará ľubovňa": "Stará Ľubovňa",
  "stropkov": "Stropkov",
  "stupava": "Stupava",
  "svidník": "Svidník", "svidnik": "Svidník",
  "svit": "Svit",
  "šahy": "Šahy",
  "šaľa": "Šaľa", "sala": "Šaľa",
  "šamorín": "Šamorín",
  "šaštín-stráže": "Šaštín-Stráže",
  "štúrovo": "Štúrovo", "sturovo": "Štúrovo",
  "šurany": "Šurany",
  "topoľčany": "Topoľčany", "topolcany": "Topoľčany",
  "trebišov": "Trebišov", "trebisov": "Trebišov",
  "trenčianske teplice": "Trenčianske Teplice",
  "trstená": "Trstená",
  "turčianske teplice": "Turčianske Teplice",
  "turzovka": "Turzovka",
  "tvrdošín": "Tvrdošín", "tvrdosin": "Tvrdošín",
  "veľké kapušany": "Veľké Kapušany",
  "veľký krtíš": "Veľký Krtíš",
  "veľký meder": "Veľký Meder",
  "vranov nad topľou": "Vranov nad Topľou",
  "vráble": "Vráble",
  "vrútky": "Vrútky",
  "vysoké tatry": "Vysoké Tatry",
  "žarnovica": "Žarnovica",
  "žiar nad hronom": "Žiar nad Hronom",
  "zlaté moravce": "Zlaté Moravce",
  "zvolen": "Zvolen",
  
  // Bratislava mestské časti
  "petržalka": "Bratislava",
  "ružinov": "Bratislava",
  "staré mesto": "Bratislava",
  "nové mesto": "Bratislava",
  "karlova ves": "Bratislava",
  "dúbravka": "Bratislava",
  "rača": "Bratislava",
  "vajnory": "Bratislava",
  "devín": "Bratislava",
  "lamač": "Bratislava",
  "vrakuňa": "Bratislava",
  "podunajské biskupice": "Bratislava",
  
  // Košice mestské časti  
  "košice-juh": "Košice",
  "košice-západ": "Košice",
  "košice-sever": "Košice",
  "košice-staré mesto": "Košice",
  "dargovských hrdinov": "Košice",
  "ťahanovce": "Košice",
  "šaca": "Košice",
};

// Pre URL building - slug verzie miest
const CITY_SLUGS: Record<string, string> = {
  "Bratislava": "bratislava",
  "Košice": "kosice",
  "Prešov": "presov",
  "Žilina": "zilina",
  "Banská Bystrica": "banska-bystrica",
  "Trnava": "trnava",
  "Trenčín": "trencin",
  "Nitra": "nitra",
  "Poprad": "poprad",
  "Martin": "martin",
  "Zvolen": "zvolen",
  "Prievidza": "prievidza",
  "Nové Zámky": "nove-zamky",
  "Michalovce": "michalovce",
  "Piešťany": "piestany",
  "Levice": "levice",
  "Topoľčany": "topolcany",
  "Liptovský Mikuláš": "liptovsky-mikulas",
  "Ružomberok": "ruzomberok",
  "Dubnica nad Váhom": "dubnica-nad-vahom",
  "Čadca": "cadca",
  "Humenné": "humenne",
  "Bardejov": "bardejov",
  "Trebišov": "trebisov",
  "Lučenec": "lucenec",
  "Senec": "senec",
  "Pezinok": "pezinok",
  "Malacky": "malacky",
  "Dunajská Streda": "dunajska-streda",
  "Komárno": "komarno",
};

// ============================================
// Helper Functions
// ============================================

function parseCity(text: string): { city: string; district: string } | null {
  const normalized = text.toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  
  // Najprv skúsime nájsť v mape
  for (const [key, city] of Object.entries(CITY_MAP)) {
    const normalizedKey = key.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (normalized.includes(normalizedKey)) {
      const parts = text.split(/[,\-•–]/);
      const district = parts.length > 1 ? parts[1].trim() : parts[0].trim();
      return { city, district: district || "Centrum" };
    }
  }
  
  // Ak nie je v mape, extrahuj prvú časť ako mesto
  // (pre menšie obce ktoré nie sú v mape)
  const parts = text.split(/[,\-•–]/);
  if (parts.length > 0 && parts[0].trim().length > 2) {
    const extractedCity = parts[0].trim();
    const district = parts.length > 1 ? parts[1].trim() : "";
    // Capitalize first letter
    const formattedCity = extractedCity.charAt(0).toUpperCase() + extractedCity.slice(1).toLowerCase();
    return { city: formattedCity, district: district || "Centrum" };
  }
  
  return null;
}

function parsePrice(text: string): number {
  const cleanText = text.replace(/\s+/g, "").replace(/[^\d]/g, "");
  const price = parseInt(cleanText, 10);
  
  if (price > 0 && price < 100000000) {
    return price;
  }
  return 0;
}

function parseArea(text: string): number {
  const match = text.match(/(\d+(?:[,\.]\d+)?)\s*m[²2]/i);
  if (match) {
    return parseFloat(match[1].replace(",", "."));
  }
  return 0;
}

function parseRooms(text: string): number | undefined {
  const match = text.match(/(\d+)\s*[-\s]?(?:izb|izbov)/i);
  return match ? parseInt(match[1], 10) : undefined;
}

// ============================================
// Browserless Connection
// ============================================

async function connectToBrowserless(): Promise<Browser> {
  const endpoint = process.env.BROWSER_WS_ENDPOINT;
  
  if (!endpoint) {
    throw new Error(
      "BROWSER_WS_ENDPOINT not configured. " +
      "Get your token from browserless.io and add: " +
      "BROWSER_WS_ENDPOINT=wss://production-sfo.browserless.io?token=YOUR_TOKEN"
    );
  }
  
  const { chromium } = await import("playwright-core");
  
  console.log("🌐 Connecting to Browserless...");
  const browser = await chromium.connect(endpoint);
  console.log("✅ Connected to Browserless");
  
  return browser;
}

// ============================================
// Scraping Functions
// ============================================

/**
 * Špeciálny parser pre Bazoš - má inú štruktúru HTML
 */
async function scrapeBazosListPage(
  page: Page,
  config: PortalConfig,
  listingType: ListingType
): Promise<ScrapedProperty[]> {
  const properties: ScrapedProperty[] = [];
  
  await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(1500);
  
  // Bazoš má inzeráty ako h2 s linkami
  const listings = await page.$$("h2:has(a[href*='/inzerat/'])");
  console.log(`Found ${listings.length} Bazoš listings`);
  
  for (const listing of listings) {
    try {
      // Získaj link a title
      const linkEl = await listing.$("a[href*='/inzerat/']");
      if (!linkEl) continue;
      
      const href = await linkEl.getAttribute("href");
      const title = await linkEl.textContent();
      if (!href || !title?.trim()) continue;
      
      // External ID z URL
      const idMatch = href.match(/inzerat\/(\d+)/);
      const externalId = idMatch?.[1] || "";
      if (!externalId) continue;
      
      // Získaj okolité elementy pre cenu a lokalitu
      // Bazoš má cenu v <b> tagu a lokalitu s PSČ v nasledujúcich elementoch
      const parent = await listing.evaluateHandle(el => el.parentElement);
      const parentText = await parent.evaluate(el => el?.textContent || "");
      
      // Cena - hľadáme vzor "123 456 €" alebo "123456€"
      const priceMatch = parentText.match(/(\d[\d\s]*)\s*€/);
      let price = 0;
      if (priceMatch) {
        price = parseInt(priceMatch[1].replace(/\s/g, ""), 10);
      }
      
      // Pre prenájom nižšia minimálna cena
      const minPrice = listingType === "PRENAJOM" ? 100 : 10000;
      if (price < minPrice) continue;
      
      // Plocha z title alebo textu
      let area = parseArea(title);
      if (area === 0) area = parseArea(parentText);
      if (area === 0) area = 50;
      
      // Lokalita - hľadáme mesto v title alebo texte
      let cityResult = parseCity(title);
      if (!cityResult) {
        // Skús nájsť PSČ a určiť mesto
        const pscMatch = parentText.match(/(\d{3}\s?\d{2})/);
        if (pscMatch) {
          const psc = pscMatch[1].replace(/\s/g, "");
          // PSČ mapping pre hlavné mestá
          if (psc.startsWith("8")) cityResult = { city: "Bratislava", district: "Bratislava" };
          else if (psc.startsWith("040") || psc.startsWith("041") || psc.startsWith("042") || psc.startsWith("043")) 
            cityResult = { city: "Košice", district: "Košice" };
          else if (psc.startsWith("080") || psc.startsWith("081") || psc.startsWith("082")) 
            cityResult = { city: "Prešov", district: "Prešov" };
          else if (psc.startsWith("010") || psc.startsWith("011") || psc.startsWith("012")) 
            cityResult = { city: "Žilina", district: "Žilina" };
          else if (psc.startsWith("974") || psc.startsWith("975") || psc.startsWith("976")) 
            cityResult = { city: "Banská Bystrica", district: "Banská Bystrica" };
          else if (psc.startsWith("917") || psc.startsWith("918") || psc.startsWith("919")) 
            cityResult = { city: "Trnava", district: "Trnava" };
          else if (psc.startsWith("949") || psc.startsWith("950") || psc.startsWith("951")) 
            cityResult = { city: "Nitra", district: "Nitra" };
          else if (psc.startsWith("911") || psc.startsWith("912") || psc.startsWith("913")) 
            cityResult = { city: "Trenčín", district: "Trenčín" };
        }
      }
      
      // Ak stále nemáme mesto, skús z title
      if (!cityResult) {
        const titleLower = title.toLowerCase();
        if (titleLower.includes("bratislava") || titleLower.includes("petržalka") || titleLower.includes("ružinov"))
          cityResult = { city: "Bratislava", district: "Bratislava" };
        else if (titleLower.includes("košice"))
          cityResult = { city: "Košice", district: "Košice" };
        else if (titleLower.includes("žilina"))
          cityResult = { city: "Žilina", district: "Žilina" };
        else if (titleLower.includes("prešov"))
          cityResult = { city: "Prešov", district: "Prešov" };
        else
          cityResult = { city: "Bratislava", district: "Neznámy" }; // Default
      }
      
      const rooms = parseRooms(title);
      const sourceUrl = href.startsWith("http") ? href : `${config.baseUrl}${href}`;
      
      properties.push({
        externalId,
        source: "BAZOS",
        title: title.trim().substring(0, 200),
        description: "",
        price,
        pricePerM2: Math.round(price / area),
        areaM2: area,
        city: cityResult.city,
        district: cityResult.district,
        rooms,
        listingType,
        sourceUrl,
      });
      
    } catch (error) {
      console.warn("Failed to parse Bazoš listing:", error);
    }
  }
  
  return properties;
}

async function scrapeListPage(
  page: Page,
  config: PortalConfig,
  listingType: ListingType
): Promise<ScrapedProperty[]> {
  // Špeciálne spracovanie pre Bazoš
  if (config.source === "BAZOS") {
    return scrapeBazosListPage(page, config, listingType);
  }
  
  const properties: ScrapedProperty[] = [];
  
  // Wait for content to load
  await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(2000); // Extra wait for JS rendering
  
  // Find all listing items
  const items = await page.$$(config.selectors.listingItem);
  console.log(`Found ${items.length} listing items`);
  
  for (const item of items) {
    try {
      // Get link
      const linkElement = await item.$(config.selectors.link);
      const href = await linkElement?.getAttribute("href");
      if (!href) continue;
      
      // Get title
      const titleElement = await item.$(config.selectors.title);
      const title = await titleElement?.textContent() || "";
      if (!title.trim()) continue;
      
      // Get price
      const priceElement = await item.$(config.selectors.price);
      const priceText = await priceElement?.textContent() || "";
      const price = parsePrice(priceText);
      if (price === 0) continue;
      
      // Get area
      const areaElement = await item.$(config.selectors.area);
      const areaText = await areaElement?.textContent() || title;
      let area = parseArea(areaText);
      if (area === 0) area = parseArea(title);
      if (area === 0) area = 50; // Default
      
      // Get location
      const locationElement = await item.$(config.selectors.location);
      const locationText = await locationElement?.textContent() || title;
      const cityResult = parseCity(locationText);
      if (!cityResult) continue;
      
      // Parse rooms from title
      const rooms = parseRooms(title);
      
      // Build external ID from URL
      const idMatch = href.match(/\/(\d+)\/?(?:\?|$)|detail\/(\d+)|id[=\/](\d+)|inzerat\/(\d+)/i);
      const externalId = idMatch?.[1] || idMatch?.[2] || idMatch?.[3] || idMatch?.[4] ||
                         href.split("/").filter(Boolean).pop() || 
                         Date.now().toString();
      
      // Build full URL
      const sourceUrl = href.startsWith("http") ? href : `${config.baseUrl}${href}`;
      
      properties.push({
        externalId,
        source: config.source,
        title: title.trim().substring(0, 200),
        description: "",
        price,
        pricePerM2: Math.round(price / area),
        areaM2: area,
        city: cityResult.city,
        district: cityResult.district,
        rooms,
        listingType,
        sourceUrl,
      });
      
    } catch (error) {
      console.warn("Failed to parse listing item:", error);
    }
  }
  
  return properties;
}

export async function scrapePortal(
  portalKey: "NEHNUTELNOSTI" | "REALITY" | "TOPREALITY",
  options: {
    city?: string;        // Názov mesta (nepovinné - ak nie je, scrapuje všetko)
    listingType?: ListingType;
    maxPages?: number;
    categoryPath?: string;
  } = {}
): Promise<ScrapeResult> {
  const startTime = Date.now();
  const config = PORTAL_CONFIGS[portalKey];
  const errors: string[] = [];
  const allProperties: ScrapedProperty[] = [];
  let pagesScraped = 0;
  
  const maxPages = options.maxPages || 10; // Default 10 stránok na kategóriu
  const citySlug = options.city ? CITY_SLUGS[options.city] : "";
  
  let browser: Browser | null = null;
  
  try {
    browser = await connectToBrowserless();
    const context = await browser.newContext({
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      viewport: { width: 1920, height: 1080 },
      locale: "sk-SK",
    });
    
    // Block unnecessary resources
    await context.route("**/*.{png,jpg,jpeg,gif,webp,svg,woff,woff2}", route => route.abort());
    await context.route("**/analytics**", route => route.abort());
    await context.route("**/tracking**", route => route.abort());
    await context.route("**/facebook**", route => route.abort());
    await context.route("**/google-analytics**", route => route.abort());
    
    const page = await context.newPage();
    
    // Select categories to scrape
    const categories = options.categoryPath 
      ? config.categories.filter(c => c.path === options.categoryPath)
      : options.listingType
      ? config.categories.filter(c => c.listingType === options.listingType)
      : config.categories;
    
    for (const category of categories) {
      console.log(`\n📂 Scraping ${config.name} - ${category.name}`);
      
      let pageNum = 1;
      let hasNextPage = true;
      
      while (hasNextPage && pageNum <= maxPages) {
        // Build URL
        let url = `${config.baseUrl}${category.path}`;
        if (citySlug) url += `${citySlug}/`;
        if (pageNum > 1) {
          url += url.includes("?") ? `&page=${pageNum}` : `?page=${pageNum}`;
        }
        
        console.log(`  📄 Page ${pageNum}: ${url}`);
        
        try {
          await page.goto(url, { 
            waitUntil: "domcontentloaded",
            timeout: 30000 
          });
          
          const properties = await scrapeListPage(page, config, category.listingType);
          console.log(`  ✅ Found ${properties.length} properties`);
          
          allProperties.push(...properties);
          pagesScraped++;
          
          // Check for next page
          const nextButton = await page.$(config.selectors.nextPage);
          hasNextPage = !!nextButton && pageNum < maxPages;
          
          pageNum++;
          
          // Rate limiting
          await page.waitForTimeout(2000);
          
        } catch (error) {
          const errorMsg = `Error on page ${pageNum}: ${error instanceof Error ? error.message : "Unknown"}`;
          console.error(`  ❌ ${errorMsg}`);
          errors.push(errorMsg);
          hasNextPage = false;
        }
      }
    }
    
    await context.close();
    
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    errors.push(errorMsg);
    console.error("Scraping error:", errorMsg);
    
  } finally {
    if (browser) {
      await browser.close();
    }
  }
  
  const duration = Date.now() - startTime;
  
  console.log(`\n📊 Scraping complete:`);
  console.log(`  - Properties: ${allProperties.length}`);
  console.log(`  - Pages: ${pagesScraped}`);
  console.log(`  - Duration: ${(duration / 1000).toFixed(1)}s`);
  console.log(`  - Errors: ${errors.length}`);
  
  return {
    properties: allProperties,
    pagesScraped,
    errors,
    duration,
  };
}

// ============================================
// Test Function
// ============================================

export async function testBrowserlessConnection(): Promise<{
  success: boolean;
  message: string;
  browserVersion?: string;
}> {
  try {
    const browser = await connectToBrowserless();
    const version = browser.version();
    await browser.close();
    
    return {
      success: true,
      message: "Successfully connected to Browserless",
      browserVersion: version,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Connection failed",
    };
  }
}
