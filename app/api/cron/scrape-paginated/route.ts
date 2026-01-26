/**
 * Paginated Scraper - Postupne scrapuje celý portál
 * 
 * Každý run scrapne 20 stránok, potom pokračuje kde skončil.
 * Po prejdení všetkých stránok začne odznova.
 * 
 * Schedule: Každých 10 minút počas budovania DB
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as cheerio from "cheerio";

// Konfigurácia
const CONFIG = {
  pagesPerRun: 20,           // Stránok za jeden run
  delayBetweenPages: 1500,   // ms medzi stránkami
  estimatedTotalPages: 775,  // Odhad celkových stránok
  baseUrl: "https://www.nehnutelnosti.sk",
};

// Kategórie na scraping
const CATEGORIES = [
  { slug: "byty/predaj", name: "byty-predaj", listingType: "PREDAJ" },
  { slug: "domy/predaj", name: "domy-predaj", listingType: "PREDAJ" },
  { slug: "byty/prenajom", name: "byty-prenajom", listingType: "PRENAJOM" },
];

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
];

export const maxDuration = 300;

interface ScrapedProperty {
  externalId: string;
  title: string;
  price: number;
  pricePerM2: number;
  areaM2: number;
  city: string;
  district: string;
  rooms: number | null;
  sourceUrl: string;
  listingType: string;
  description: string;
}

export async function GET(request: Request) {
  const startTime = Date.now();
  
  console.log("🚀 Starting paginated scraper...");

  try {
    // Získaj alebo vytvor progress
    let progress = await prisma.scrapeProgress.findUnique({
      where: { source: "NEHNUTELNOSTI" },
    });

    if (!progress) {
      progress = await prisma.scrapeProgress.create({
        data: {
          source: "NEHNUTELNOSTI",
          currentPage: 1,
          totalPages: CONFIG.estimatedTotalPages,
          category: CATEGORIES[0].name,
        },
      });
      console.log("📋 Created new scrape progress tracker");
    }

    // Nájdi aktuálnu kategóriu
    const categoryIndex = CATEGORIES.findIndex(c => c.name === progress.category);
    const currentCategory = CATEGORIES[categoryIndex] || CATEGORIES[0];

    console.log(`📍 Position: ${currentCategory.name} - Page ${progress.currentPage}`);

    // Scrapni stránky
    const results = {
      pagesScraped: 0,
      propertiesFound: 0,
      newProperties: 0,
      updatedProperties: 0,
      errors: 0,
    };

    let currentPage = progress.currentPage;
    let reachedEnd = false;

    for (let i = 0; i < CONFIG.pagesPerRun; i++) {
      try {
        const url = `${CONFIG.baseUrl}/${currentCategory.slug}/?p[page]=${currentPage}`;
        console.log(`📄 Scraping: ${url}`);

        const properties = await scrapePage(url, currentCategory.listingType);
        
        if (properties.length === 0) {
          console.log(`📭 Page ${currentPage} is empty - reached end of category`);
          reachedEnd = true;
          break;
        }

        results.pagesScraped++;
        results.propertiesFound += properties.length;

        // Ulož properties
        for (const prop of properties) {
          try {
            const saveResult = await saveProperty(prop);
            if (saveResult === "new") results.newProperties++;
            else if (saveResult === "updated") results.updatedProperties++;
          } catch (error) {
            results.errors++;
          }
        }

        currentPage++;

        // Delay medzi stránkami
        if (i < CONFIG.pagesPerRun - 1) {
          await new Promise(r => setTimeout(r, CONFIG.delayBetweenPages));
        }

      } catch (error) {
        console.error(`❌ Error on page ${currentPage}:`, error);
        results.errors++;
        currentPage++;
      }
    }

    // Aktualizuj progress
    let nextCategory = currentCategory.name;
    let nextPage = currentPage;
    let isComplete = false;
    let cycleCount = progress.cycleCount;

    if (reachedEnd) {
      // Prejdi na ďalšiu kategóriu
      const nextCategoryIndex = categoryIndex + 1;
      
      if (nextCategoryIndex >= CATEGORIES.length) {
        // Dokončil všetky kategórie - začni odznova
        nextCategory = CATEGORIES[0].name;
        nextPage = 1;
        isComplete = true;
        cycleCount++;
        console.log(`🔄 Completed full cycle #${cycleCount}! Starting over...`);
      } else {
        nextCategory = CATEGORIES[nextCategoryIndex].name;
        nextPage = 1;
        console.log(`➡️ Moving to next category: ${nextCategory}`);
      }
    }

    await prisma.scrapeProgress.update({
      where: { source: "NEHNUTELNOSTI" },
      data: {
        currentPage: nextPage,
        category: nextCategory,
        totalScraped: { increment: results.propertiesFound },
        totalNew: { increment: results.newProperties },
        totalUpdated: { increment: results.updatedProperties },
        totalErrors: { increment: results.errors },
        lastRunAt: new Date(),
        isComplete,
        completedAt: isComplete ? new Date() : undefined,
        cycleCount,
      },
    });

    const duration = Date.now() - startTime;

    // Log
    await prisma.dataFetchLog.create({
      data: {
        source: "paginated-scraper",
        status: results.errors > results.pagesScraped ? "partial" : "success",
        recordsCount: results.propertiesFound,
        duration_ms: duration,
      },
    });

    console.log(`\n📊 Run Complete:`);
    console.log(`  - Pages scraped: ${results.pagesScraped}`);
    console.log(`  - Properties found: ${results.propertiesFound}`);
    console.log(`  - New: ${results.newProperties}`);
    console.log(`  - Updated: ${results.updatedProperties}`);
    console.log(`  - Errors: ${results.errors}`);
    console.log(`  - Duration: ${duration}ms`);
    console.log(`  - Next: ${nextCategory} page ${nextPage}`);

    return NextResponse.json({
      success: true,
      results,
      progress: {
        category: nextCategory,
        page: nextPage,
        cycleCount,
        isComplete,
      },
      duration_ms: duration,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("❌ Paginated scraper failed:", errorMessage);

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

async function scrapePage(url: string, listingType: string): Promise<ScrapedProperty[]> {
  const userAgent = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];

  const response = await fetch(url, {
    headers: {
      "User-Agent": userAgent,
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "sk,cs;q=0.9,en;q=0.8",
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);
  const properties: ScrapedProperty[] = [];

  // Nehnutelnosti.sk selektory
  $("article.advertisement-item, div.advertisement-item, .inzerat, .property-item, [data-testid='property-item']").each((_, element) => {
    try {
      const $el = $(element);
      
      // Názov
      const title = $el.find("h2 a, .title a, .advertisement-item--content__title a, a.advertisement-item--content__title").first().text().trim() ||
                    $el.find("a").first().attr("title") || "";
      
      if (!title || title.length < 5) return;

      // URL
      let sourceUrl = $el.find("a").first().attr("href") || "";
      if (sourceUrl && !sourceUrl.startsWith("http")) {
        sourceUrl = `${CONFIG.baseUrl}${sourceUrl}`;
      }

      // External ID z URL
      const externalIdMatch = sourceUrl.match(/\/(\d+)\/?$/);
      const externalId = externalIdMatch ? externalIdMatch[1] : sourceUrl;

      // Cena
      const priceText = $el.find(".advertisement-item--content__price, .price, .cena").first().text();
      const priceMatch = priceText.replace(/\s/g, "").match(/(\d+)/);
      const price = priceMatch ? parseInt(priceMatch[1], 10) : 0;

      if (price < 1000) return; // Skip invalid

      // Plocha
      const areaText = $el.find(".advertisement-item--content__info, .info, .parametre").text();
      const areaMatch = areaText.match(/(\d+)\s*m²/);
      const areaM2 = areaMatch ? parseInt(areaMatch[1], 10) : 50;

      // Izby
      const roomsMatch = areaText.match(/(\d+)\s*(?:izb|room)/i);
      const rooms = roomsMatch ? parseInt(roomsMatch[1], 10) : null;

      // Lokalita
      const locationText = $el.find(".advertisement-item--content__info--location, .location, .lokalita").first().text().trim();
      const locationParts = locationText.split(",").map(s => s.trim());
      const city = locationParts[0] || "Slovensko";
      const district = locationParts[1] || locationParts[0] || "";

      // Popis
      const description = $el.find(".advertisement-item--content__text, .description, .popis").first().text().trim();

      properties.push({
        externalId: `neh-${externalId}`,
        title,
        price,
        pricePerM2: areaM2 > 0 ? Math.round(price / areaM2) : price,
        areaM2,
        city,
        district,
        rooms,
        sourceUrl,
        listingType,
        description: description.substring(0, 500),
      });

    } catch (error) {
      // Skip this property
    }
  });

  return properties;
}

async function saveProperty(prop: ScrapedProperty): Promise<"new" | "updated" | "duplicate"> {
  // Check if exists
  const existing = await prisma.property.findFirst({
    where: {
      OR: [
        { external_id: prop.externalId },
        { source_url: prop.sourceUrl },
      ],
    },
  });

  if (existing) {
    // Check for price change
    if (existing.price !== prop.price) {
      await prisma.property.update({
        where: { id: existing.id },
        data: {
          price: prop.price,
          price_per_m2: prop.pricePerM2,
          last_seen_at: new Date(),
          updatedAt: new Date(),
        },
      });

      await prisma.priceHistory.create({
        data: {
          propertyId: existing.id,
          price: prop.price,
          price_per_m2: prop.pricePerM2,
        },
      });

      return "updated";
    }

    // Just update last_seen
    await prisma.property.update({
      where: { id: existing.id },
      data: { last_seen_at: new Date() },
    });

    return "duplicate";
  }

  // Create new
  const slug = prop.title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .substring(0, 80);

  const uniqueSlug = `${slug}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

  await prisma.property.create({
    data: {
      external_id: prop.externalId,
      source: "NEHNUTELNOSTI",
      title: prop.title,
      slug: uniqueSlug,
      description: prop.description,
      price: prop.price,
      price_per_m2: prop.pricePerM2,
      area_m2: prop.areaM2,
      city: prop.city,
      district: prop.district,
      address: `${prop.city}${prop.district ? `, ${prop.district}` : ""}`,
      rooms: prop.rooms,
      listing_type: prop.listingType as "PREDAJ" | "PRENAJOM",
      condition: "POVODNY",
      energy_certificate: "NONE",
      source_url: prop.sourceUrl,
      is_distressed: false,
      status: "ACTIVE",
      last_seen_at: new Date(),
    },
  });

  return "new";
}

// POST pre manuálny trigger
export async function POST(request: Request) {
  return GET(request);
}
