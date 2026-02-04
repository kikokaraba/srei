/**
 * Single Listing Scraper - Scrapuje jeden inzerát podľa URL
 * Podporované: Bazoš, Nehnutelnosti.sk
 */

import * as cheerio from "cheerio";
import type { PropertySource, ListingType } from "@/generated/prisma/client";
import type { ScrapedProperty } from "./ingestion-pipeline";
import { parseListingUrl } from "./url-parser";
import { parseDescription } from "./parser";
import { getCityFromPsc } from "./psc-map";
import { extractLocationWithAI } from "@/lib/ai/location-extraction";

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
];

const SLOVAK_CITIES: Record<string, string> = {
  "bratislava": "Bratislava", "kosice": "Košice", "presov": "Prešov",
  "zilina": "Žilina", "banska bystrica": "Banská Bystrica", "trnava": "Trnava",
  "trencin": "Trenčín", "nitra": "Nitra", "petrzalka": "Bratislava",
  "ruzinov": "Bratislava", "dubravka": "Bratislava", "nove mesto": "Bratislava",
  "stare mesto": "Bratislava", "karlova ves": "Bratislava",
};

function getRandomUA(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

async function fetchPage(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    
    const response = await fetch(url, {
      headers: {
        "User-Agent": getRandomUA(),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "sk-SK,sk;q=0.9,en;q=0.8",
      },
      signal: controller.signal,
    });
    
    clearTimeout(timeout);
    if (!response.ok) return null;
    return await response.text();
  } catch {
    return null;
  }
}

function parsePrice(text: string): number {
  const lower = text.toLowerCase();
  if (lower.includes("dohodou") || lower.includes("dohoda") || lower.includes("v rk")) {
    return -1;
  }
  const cleaned = text.replace(/[^\d\s]/g, "").replace(/\s+/g, "");
  const price = parseInt(cleaned, 10);
  return price > 1000 && price < 100000000 ? price : 0;
}

function parseArea(text: string): number {
  const match = text.match(/(\d+(?:[,\.]\d+)?)\s*m[²2]/i);
  return match ? parseFloat(match[1].replace(",", ".")) : 0;
}

function parseCity(text: string): { city: string; district: string } {
  const normalized = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  for (const [key, city] of Object.entries(SLOVAK_CITIES)) {
    if (normalized.includes(key)) {
      const districtMatch = text.match(/([^,]+)/);
      return { city, district: districtMatch?.[1]?.trim() || city };
    }
  }

  const pscCity = getCityFromPsc(text);
  if (pscCity) return { city: pscCity, district: pscCity };

  const words = text.split(/[\s,;]+/).filter((w) => w.length > 2);
  for (const word of words) {
    if (word[0] === word[0].toUpperCase() && word.length > 3) {
      return { city: word, district: word };
    }
  }
  return { city: "Slovensko", district: "Neznáme" };
}

/** Odstráni zo textu skripty, právne texty a boilerplate; vráti prvý riadok/vetu vhodnú ako titulok */
function sanitizeTitle(raw: string, maxLen = 150): string {
  if (!raw || !raw.trim()) return "";
  let t = raw
    .replace(/\s+/g, " ")
    .trim();
  // Odstrániť bloky vyzerajúce ako JS/skripty
  t = t
    .replace(/requestAnimationFrame\s*\([^)]*\)[^;]*;?/gi, " ")
    .replace(/\$RT\s*=\s*[^;]+;?/g, " ")
    .replace(/function\s*\([^)]*\)\s*\{[^}]*\}/g, " ")
    .replace(/<[^>]+>/g, " ");
  // Odstrániť známe footer/menu reťazce
  const junk = [
    "United Classifieds",
    "s.r.o.",
    "GDPR",
    "Ochrana osobných údajov",
    "Ochrana údajov",
    "Všeobecné obchodné podmienky",
    "Cookies",
    "Súhlasím",
    "©",
    "všetky práva vyhradené",
    "Realitné kancelárie",
    "Magazín",
    "Užitočné info",
    "Developerské projekty",
    "novostavby",
    "Ocenenie nehnuteľnosti",
    "Hypotekárna kalkulačka",
    "Ceny realít",
    "Zmluvy",
    "Pridať inzerát",
    "Prihlásiť sa",
    "Ako inzerovať",
    "Podmienky inzercie",
    "Firemná inzercia",
    "Nastavenie súkromia",
    "Nahlásenie nelegálneho obsahu",
    "Pripomienky Nehnuteľnosti na Facebooku",
  ];
  for (const j of junk) {
    const re = new RegExp(j.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    t = t.replace(re, " ");
  }
  t = t.replace(/\s+/g, " ").trim();
  // Prvý riadok resp. prvých maxLen znakov
  const firstLine = t.split(/\n/)[0]?.trim() || t;
  const out = firstLine.substring(0, maxLen).trim();
  return out.length >= 3 ? out : "";
}

/** Vyčistí popis od skriptov a boilerplate; obmedzí dĺžku */
function sanitizeDescription(raw: string, maxLen = 5000): string {
  if (!raw || !raw.trim()) return "";
  let t = raw
    .replace(/\s+/g, " ")
    .trim();
  t = t
    .replace(/requestAnimationFrame\s*\([^)]*\)[^;]*;?/gi, " ")
    .replace(/\$RT\s*=\s*[^;]+;?/g, " ")
    .replace(/function\s*\([^)]*\)\s*\{[^}]*\}/g, " ");
  const junk = [
    "United Classifieds",
    "s.r.o.",
    "GDPR",
    "Ochrana osobných údajov",
    "Všeobecné obchodné podmienky",
    "©",
    "všetky práva vyhradené",
  ];
  for (const j of junk) {
    const re = new RegExp(j.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    t = t.replace(re, " ");
  }
  t = t.replace(/\s+/g, " ").trim();
  return t.substring(0, maxLen);
}

/**
 * Scrapuje detail Bazoš inzerátu
 */
async function scrapeBazosDetail(url: string): Promise<ScrapedProperty | null> {
  const html = await fetchPage(url);
  if (!html) return null;
  
  const $ = cheerio.load(html);
  const fullText = $("body").text();
  
  // Titulok – len z nadpisu, nie z body (môže obsahovať skripty)
  const rawTitle =
    $("h1").first().text().trim() ||
    $(".nadpis").first().text().trim() ||
    $("title").text().split("|")[0].trim();
  const title = sanitizeTitle(rawTitle, 200);
  if (!title || title.length < 5) return null;
  
  // Cena
  let price = parsePrice($(".cena, .inzeratcena, [class*='cena']").first().text());
  if (price === 0) {
    const priceMatch = fullText.match(/(\d[\d\s,.]*)\s*€/);
    price = priceMatch ? parsePrice(priceMatch[1]) : 0;
  }
  if (price === 0 && !fullText.toLowerCase().includes("dohodou")) return null;
  
  // Plocha
  let areaM2 = parseArea(fullText);
  if (areaM2 === 0) areaM2 = parseArea(title);
  if (areaM2 === 0 || areaM2 < 5) areaM2 = 50;

  const rawDesc = $(".popis, .description, [class*='popis']").first().text().trim();

  // Lokalita
  const locationElText = $(".lokalita, .inzeratlok, [class*='lokalit']").first().text();
  let { city, district } = parseCity(locationElText || fullText);
  if (city === "Slovensko") {
    const fromTitle = parseCity(title);
    if (fromTitle.city !== "Slovensko") {
      city = fromTitle.city;
      district = fromTitle.district;
    }
  }
  if (city === "Slovensko") {
    const aiLocation = await extractLocationWithAI({
      title,
      description: rawDesc,
      locationText: locationElText,
      address: undefined,
    });
    if (aiLocation?.city) {
      city = aiLocation.city;
      district = aiLocation.district ?? city;
    }
  }

  const description = sanitizeDescription(rawDesc, 5000);
  const { condition } = parseDescription(description + " " + title, title);
  
  // Izby
  const roomsMatch = (title + fullText).match(/(\d)\s*[-\s]?izb/i);
  const rooms = roomsMatch ? parseInt(roomsMatch[1], 10) : undefined;
  
  // Fotky
  const imageUrls: string[] = [];
  $("img[src*='img.bazos'], img[src*='reality.bazos']").each((_, img) => {
    const src = $(img).attr("src") || $(img).attr("data-src") || "";
    if (src && !src.includes("logo") && !imageUrls.includes(src)) {
      const fullSrc = src.replace("/thm/", "/img/").replace("_t.", ".");
      imageUrls.push(fullSrc.startsWith("http") ? fullSrc : `https:${fullSrc}`);
    }
  });
  
  const idMatch = url.match(/\/inzerat\/(\d+)/);
  const externalId = idMatch ? `bazos_${idMatch[1]}` : `bazos_${Date.now()}`;
  
  // Cena dohodou: price -1, ingestion pipeline to spracuje
  const finalPrice = price === -1 ? -1 : price;
  
  const pricePerM2 = finalPrice > 0 && areaM2 > 0 ? Math.round(finalPrice / areaM2) : 0;
  
  return {
    externalId,
    source: "BAZOS",
    title: title.substring(0, 200),
    description: description || "",
    price: finalPrice,
    pricePerM2,
    areaM2,
    city,
    district,
    rooms,
    condition,
    listingType: url.includes("prenajom") ? "PRENAJOM" : "PREDAJ",
    sourceUrl: url,
    imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
  };
}

/**
 * Scrapuje detail Nehnutelnosti.sk inzerátu
 */
async function scrapeNehnutelnostiDetail(url: string): Promise<ScrapedProperty | null> {
  const html = await fetchPage(url);
  if (!html) return null;
  
  const $ = cheerio.load(html);
  const fullText = $("body").text();
  
  // Skús JSON-LD (ak existuje)
  interface JsonLdData {
    name?: string;
    description?: string;
    address?: { addressLocality?: string };
    offers?: { price?: number };
  }
  let jsonLd: JsonLdData | null = null;
  const ldScripts = $('script[type="application/ld+json"]');
  for (let i = 0; i < ldScripts.length; i++) {
    try {
      const parsed = JSON.parse($(ldScripts[i]).html() || "{}") as JsonLdData & { "@type"?: string };
      if (parsed["@type"] === "Product" || parsed.name) {
        jsonLd = parsed;
        break;
      }
    } catch {
      // skip
    }
  }
  
  const rawTitle =
    (jsonLd?.name ?? null) ||
    $("h1").first().text().trim() ||
    $("[data-testid='listing-title'], .property-title, .advertisement-title").first().text().trim() ||
    $("title").text().split("|")[0].trim();
  const title = sanitizeTitle(String(rawTitle || ""), 200);
  if (!title || title.length < 5) return null;
  
  let price = 0;
  const ldPrice = jsonLd?.offers?.price;
  if (ldPrice !== undefined && ldPrice !== null) {
    price = Number(ldPrice);
  }
  if (price === 0) {
    const priceMatch = fullText.match(/(\d[\d\s,.]*)\s*€/);
    price = priceMatch ? parsePrice(priceMatch[1]) : 0;
  }
  if (price === 0 && !fullText.toLowerCase().includes("dohodou")) return null;
  
  let areaM2 = parseArea(fullText);
  if (areaM2 === 0) areaM2 = parseArea(title);
  if (areaM2 === 0 || areaM2 < 5) areaM2 = 50;

  const ldDesc = jsonLd?.description;
  const rawDesc = (
    ldDesc ||
    $(".description, .advertisement-description, [class*='description']").first().text() ||
    ""
  ).trim();

  const locationElText =
    jsonLd?.address?.addressLocality ||
    $(".location, .advertisement-location, [class*='location']").first().text() ||
    "";
  let { city, district } = parseCity(locationElText || fullText);
  if (city === "Slovensko") {
    const fromTitle = parseCity(title);
    if (fromTitle.city !== "Slovensko") {
      city = fromTitle.city;
      district = fromTitle.district;
    }
  }
  if (city === "Slovensko") {
    const aiLocation = await extractLocationWithAI({
      title,
      description: rawDesc,
      locationText: locationElText,
      address: undefined,
    });
    if (aiLocation?.city) {
      city = aiLocation.city;
      district = aiLocation.district ?? city;
    }
  }

  const description = sanitizeDescription(rawDesc, 5000);
  const { condition } = parseDescription(description + " " + title, title);
  
  const roomsMatch = (title + fullText).match(/(\d)\s*[-\s]?izb/i);
  const rooms = roomsMatch ? parseInt(roomsMatch[1], 10) : undefined;
  
  const imageUrls: string[] = [];
  $("img[src*='nehnutelnosti'], img[src*='unitedclassifieds'], img[src*='cdn.']").each((_, img) => {
    const src = $(img).attr("src") || $(img).attr("data-src") || "";
    if (src && !src.includes("logo") && !src.includes("icon") && !imageUrls.includes(src) && src.length > 30) {
      imageUrls.push(src.startsWith("http") ? src : `https:${src}`);
    }
  });
  
  const idMatch = url.match(/\/detail\/([^/]+)/);
  const rawId = idMatch?.[1] || "";
  const externalId = rawId ? `neh_${rawId}` : `neh_${Date.now()}`;
  const finalPrice = price === -1 ? -1 : price;
  const pricePerM2 = finalPrice > 0 && areaM2 > 0 ? Math.round(finalPrice / areaM2) : 0;
  
  return {
    externalId,
    source: "NEHNUTELNOSTI",
    title: title.substring(0, 200),
    description: description || "",
    price: finalPrice,
    pricePerM2,
    areaM2,
    city,
    district,
    rooms,
    condition,
    listingType: url.includes("prenajom") ? "PRENAJOM" : "PREDAJ",
    sourceUrl: url,
    imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
  };
}

/**
 * Scrapuje jeden inzerát podľa URL
 */
export async function scrapeSingleListing(
  rawUrl: string
): Promise<{ property: ScrapedProperty | null; error?: string }> {
  const parsed = parseListingUrl(rawUrl);
  
  if (!parsed.isValid) {
    return { property: null, error: parsed.error || "Neplatná URL" };
  }
  
  switch (parsed.source) {
    case "BAZOS": {
      const prop = await scrapeBazosDetail(parsed.sourceUrl);
      if (!prop) {
        return { property: null, error: "Nepodarilo sa načítať inzerát (Bazoš)" };
      }
      return { property: prop };
    }
    case "NEHNUTELNOSTI": {
      const prop = await scrapeNehnutelnostiDetail(parsed.sourceUrl);
      if (!prop) {
        return { property: null, error: "Nepodarilo sa načítať inzerát (Nehnutelnosti.sk)" };
      }
      return { property: prop };
    }
    case "REALITY":
    case "TOPREALITY":
      return { property: null, error: "Portál momentálne nie je podporovaný. Použite Bazoš alebo Nehnutelnosti.sk." };
    default:
      return { property: null, error: "Nepodporovaný portál" };
  }
}
