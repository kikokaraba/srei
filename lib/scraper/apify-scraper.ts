/**
 * Apify Scraper Integration
 * 
 * Používa Apify infraštruktúru pre profesionálny scraping:
 * - Residential proxies
 * - Anti-bot detection
 * - Automatic retries
 * - Scalable infrastructure
 */

import type { RawListingData, ScrapeError } from "./types";

const APIFY_API_KEY = process.env.APIFY_API_KEY;
const APIFY_BASE_URL = "https://api.apify.com/v2";

// ============================================================================
// TYPY
// ============================================================================

interface ApifyRunInput {
  startUrls: Array<{ url: string }>;
  maxRequestsPerCrawl?: number;
  proxyConfiguration?: {
    useApifyProxy: boolean;
    apifyProxyGroups?: string[];
    apifyProxyCountry?: string;
  };
}

interface ApifyRunResult {
  id: string;
  status: "READY" | "RUNNING" | "SUCCEEDED" | "FAILED" | "ABORTED";
  defaultDatasetId: string;
}

interface ApifyDatasetItem {
  url: string;
  title?: string;
  price?: string;
  priceValue?: number;
  location?: string;
  area?: string;
  areaValue?: number;
  rooms?: string;
  roomsValue?: number;
  description?: string;
  images?: string[];
  sellerName?: string;
  sellerPhone?: string;
  publishedAt?: string;
  [key: string]: unknown;
}

// ============================================================================
// APIFY API HELPERS
// ============================================================================

async function apifyRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  if (!APIFY_API_KEY) {
    throw new Error("APIFY_API_KEY is not set");
  }

  const url = `${APIFY_BASE_URL}${endpoint}`;
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${APIFY_API_KEY}`,
    ...options.headers,
  };

  const response = await fetch(url, { ...options, headers });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Apify API error: ${response.status} - ${error}`);
  }

  return response.json();
}

// ============================================================================
// WEB SCRAPER ACTOR
// ============================================================================

/**
 * Spustí Apify Web Scraper pre dané URL
 * Používa ich Playwright-based scraper s residential proxies
 */
export async function runApifyWebScraper(
  urls: string[],
  options: {
    maxRequests?: number;
    useResidentialProxy?: boolean;
    waitForResults?: boolean;
    timeout?: number;
  } = {}
): Promise<{
  runId: string;
  datasetId: string;
  items: ApifyDatasetItem[];
}> {
  const {
    maxRequests = 100,
    useResidentialProxy = true,
    waitForResults = true,
    timeout = 300000, // 5 minutes
  } = options;

  // Apify Web Scraper Actor ID
  const actorId = "apify/web-scraper";

  // Input pre Web Scraper
  const input = {
    startUrls: urls.map(url => ({ url })),
    maxRequestsPerCrawl: maxRequests,
    proxyConfiguration: {
      useApifyProxy: true,
      apifyProxyGroups: useResidentialProxy ? ["RESIDENTIAL"] : ["DATACENTER"],
      apifyProxyCountry: "SK", // Slovenské IP
    },
    // Page function - extrahuje dáta zo stránky
    pageFunction: `
      async function pageFunction(context) {
        const { $, request, log } = context;
        
        // Detekuj portál
        const url = request.url;
        let data = { url };
        
        if (url.includes('nehnutelnosti.sk')) {
          data = {
            url,
            title: $('h1').text().trim(),
            price: $('.estate-detail__price, .price-main').text().trim(),
            location: $('.estate-detail__location, .location').text().trim(),
            area: $('[class*="area"], [class*="plocha"]').first().text().trim(),
            rooms: $('[class*="room"], [class*="izb"]').first().text().trim(),
            description: $('.estate-detail__description, .description').text().trim(),
            images: $('.gallery img, .photo-gallery img').map((i, el) => $(el).attr('src') || $(el).attr('data-src')).get(),
            sellerName: $('.contact-info, .estate-detail__contact').text().trim(),
          };
        } else if (url.includes('bazos.sk')) {
          data = {
            url,
            title: $('h1, .nadpis').text().trim(),
            price: $('.cena, .inzeratcena').text().trim(),
            location: $('.lokalita, [class*="lokac"]').text().trim(),
            description: $('.popis, .text').text().trim(),
            images: $('.obrazky img, .gallery img').map((i, el) => $(el).attr('src')).get(),
            sellerName: $('.kontakt, .predajca').text().trim(),
            sellerPhone: $('a[href^="tel:"]').attr('href')?.replace('tel:', ''),
          };
        } else if (url.includes('reality.sk')) {
          data = {
            url,
            title: $('h1').text().trim(),
            price: $('.price, [class*="cena"]').first().text().trim(),
            location: $('.location, [class*="lokac"]').text().trim(),
            area: $('[class*="area"]').first().text().trim(),
            description: $('.description, [class*="popis"]').text().trim(),
            images: $('.gallery img').map((i, el) => $(el).attr('src') || $(el).attr('data-src')).get(),
          };
        }
        
        return data;
      }
    `,
    // Pre-navigation hooks
    preNavigationHooks: `
      [
        async ({ page }) => {
          // Stealth mode
          await page.setExtraHTTPHeaders({
            'Accept-Language': 'sk-SK,sk;q=0.9,en;q=0.8'
          });
        }
      ]
    `,
  };

  console.log(`🚀 Starting Apify Web Scraper for ${urls.length} URLs...`);

  // Spusti actor
  const run = await apifyRequest<{ data: ApifyRunResult }>(
    `/acts/${actorId}/runs`,
    {
      method: "POST",
      body: JSON.stringify(input),
    }
  );

  const runId = run.data.id;
  const datasetId = run.data.defaultDatasetId;

  console.log(`📦 Run started: ${runId}`);

  if (!waitForResults) {
    return { runId, datasetId, items: [] };
  }

  // Čakaj na dokončenie
  const startTime = Date.now();
  let status = run.data.status;

  while (status === "RUNNING" || status === "READY") {
    if (Date.now() - startTime > timeout) {
      throw new Error(`Apify run timeout after ${timeout}ms`);
    }

    await new Promise(resolve => setTimeout(resolve, 5000)); // Check every 5s

    const runStatus = await apifyRequest<{ data: ApifyRunResult }>(
      `/acts/${actorId}/runs/${runId}`
    );
    status = runStatus.data.status;
    console.log(`⏳ Run status: ${status}`);
  }

  if (status !== "SUCCEEDED") {
    throw new Error(`Apify run failed with status: ${status}`);
  }

  // Získaj výsledky z datasetu
  const dataset = await apifyRequest<{ items: ApifyDatasetItem[] }>(
    `/datasets/${datasetId}/items`
  );

  console.log(`✅ Apify scrape completed: ${dataset.items.length} items`);

  return { runId, datasetId, items: dataset.items };
}

// ============================================================================
// PLAYWRIGHT SCRAPER (pre komplexné stránky)
// ============================================================================

/**
 * Spustí Apify Playwright Scraper pre JavaScript-heavy stránky
 */
export async function runApifyPlaywrightScraper(
  urls: string[],
  pageFunction: string,
  options: {
    maxRequests?: number;
    timeout?: number;
  } = {}
): Promise<ApifyDatasetItem[]> {
  const { maxRequests = 50, timeout = 600000 } = options;

  const actorId = "apify/playwright-scraper";

  const input = {
    startUrls: urls.map(url => ({ url })),
    maxRequestsPerCrawl: maxRequests,
    proxyConfiguration: {
      useApifyProxy: true,
      apifyProxyGroups: ["RESIDENTIAL"],
      apifyProxyCountry: "SK",
    },
    pageFunction,
    preNavigationHooks: `
      [
        async ({ page }) => {
          // Auto-scroll pre lazy loading
          await page.evaluate(async () => {
            await new Promise((resolve) => {
              let totalHeight = 0;
              const distance = 300;
              const timer = setInterval(() => {
                window.scrollBy(0, distance);
                totalHeight += distance;
                if (totalHeight >= document.body.scrollHeight) {
                  clearInterval(timer);
                  resolve();
                }
              }, 200);
            });
          });
        }
      ]
    `,
  };

  const run = await apifyRequest<{ data: ApifyRunResult }>(
    `/acts/${actorId}/runs`,
    {
      method: "POST",
      body: JSON.stringify(input),
    }
  );

  // Čakaj na dokončenie
  const startTime = Date.now();
  let status = run.data.status;

  while (status === "RUNNING" || status === "READY") {
    if (Date.now() - startTime > timeout) {
      throw new Error(`Playwright scraper timeout`);
    }
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const runStatus = await apifyRequest<{ data: ApifyRunResult }>(
      `/acts/${actorId}/runs/${run.data.id}`
    );
    status = runStatus.data.status;
  }

  if (status !== "SUCCEEDED") {
    throw new Error(`Playwright scraper failed: ${status}`);
  }

  const dataset = await apifyRequest<{ items: ApifyDatasetItem[] }>(
    `/datasets/${run.data.defaultDatasetId}/items`
  );

  return dataset.items;
}

// ============================================================================
// NEHNUTELNOSTI.SK SCRAPER
// ============================================================================

const NEHNUTELNOSTI_PAGE_FUNCTION = `
async function pageFunction(context) {
  const { page, request, log } = context;
  const url = request.url;
  
  // Čakaj na načítanie
  await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
  
  // Auto-scroll pre lazy loading obrázkov
  await page.evaluate(async () => {
    for (let i = 0; i < 10; i++) {
      window.scrollBy(0, 500);
      await new Promise(r => setTimeout(r, 300));
    }
    window.scrollTo(0, 0);
  });
  
  // Extrahuj dáta
  const data = await page.evaluate(() => {
    const results = [];
    
    // Listing page
    document.querySelectorAll('.advertisement-item, .estate-card, [data-testid="estate-card"]').forEach(card => {
      const link = card.querySelector('a[href*="/detail/"]');
      if (!link) return;
      
      results.push({
        url: link.href,
        title: card.querySelector('h2, .title')?.textContent?.trim(),
        price: card.querySelector('.price, [class*="price"]')?.textContent?.trim(),
        location: card.querySelector('.location, [class*="location"]')?.textContent?.trim(),
        area: card.querySelector('[class*="area"]')?.textContent?.trim(),
        thumbnail: card.querySelector('img')?.src,
      });
    });
    
    // Detail page
    if (results.length === 0 && document.querySelector('h1')) {
      const images = [];
      document.querySelectorAll('.gallery img, [class*="photo"] img').forEach(img => {
        const src = img.getAttribute('data-src') || img.getAttribute('src');
        if (src && !src.includes('placeholder')) images.push(src);
      });
      
      results.push({
        url: window.location.href,
        title: document.querySelector('h1')?.textContent?.trim(),
        price: document.querySelector('.price-main, [class*="price"]')?.textContent?.trim(),
        location: document.querySelector('.location, [class*="address"]')?.textContent?.trim(),
        area: document.querySelector('[class*="area"]')?.textContent?.trim(),
        rooms: document.querySelector('[class*="room"]')?.textContent?.trim(),
        description: document.querySelector('.description, [class*="popis"]')?.textContent?.trim(),
        images,
        sellerName: document.querySelector('.contact-info, [class*="agent"]')?.textContent?.trim(),
      });
    }
    
    return results;
  });
  
  return data;
}
`;

/**
 * Scrapuje Nehnutelnosti.sk cez Apify
 */
export async function scrapeNehnutelnostiApify(
  urls: string[]
): Promise<{
  listings: RawListingData[];
  errors: ScrapeError[];
}> {
  const errors: ScrapeError[] = [];
  const listings: RawListingData[] = [];

  try {
    const items = await runApifyPlaywrightScraper(
      urls,
      NEHNUTELNOSTI_PAGE_FUNCTION,
      { maxRequests: urls.length * 50 }
    );

    for (const item of items) {
      if (!item.url || !item.title) continue;

      // Parse price
      let price = 0;
      if (item.price) {
        const priceMatch = item.price.replace(/\s/g, "").match(/(\d+)/);
        if (priceMatch) price = parseInt(priceMatch[1]);
      }

      // Parse area
      let area = 0;
      if (item.area) {
        const areaMatch = item.area.match(/(\d+)/);
        if (areaMatch) area = parseInt(areaMatch[1]);
      }

      listings.push({
        externalId: item.url.split("/").pop() || item.url,
        sourceUrl: item.url,
        title: item.title,
        description: item.description || "",
        priceRaw: item.price || "",
        locationRaw: item.location || "",
        areaRaw: item.area || "",
        imageUrls: item.images || [],
        sellerName: item.sellerName,
      });
    }

    console.log(`📊 Nehnutelnosti.sk: ${listings.length} listings extracted`);

  } catch (error) {
    errors.push({
      type: "NETWORK_ERROR",
      message: error instanceof Error ? error.message : "Apify scrape failed",
      url: urls[0],
    });
  }

  return { listings, errors };
}

// ============================================================================
// BAZOŠ SCRAPER
// ============================================================================

const BAZOS_PAGE_FUNCTION = `
async function pageFunction(context) {
  const { page, request } = context;
  const url = request.url;
  
  await page.waitForLoadState('domcontentloaded');
  
  const data = await page.evaluate(() => {
    const results = [];
    
    // Listing page
    document.querySelectorAll('.inzeraty .inzerat, .vypis .vypis-item').forEach(item => {
      const link = item.querySelector('a[href*="/inzerat/"]');
      if (!link) return;
      
      results.push({
        url: link.href,
        title: item.querySelector('.nadpis, h2')?.textContent?.trim(),
        price: item.querySelector('.cena, [class*="cena"]')?.textContent?.trim(),
        location: item.querySelector('.lokalita, [class*="lokac"]')?.textContent?.trim(),
        thumbnail: item.querySelector('img')?.src,
      });
    });
    
    // Detail page
    if (results.length === 0 && document.querySelector('h1')) {
      const images = [];
      document.querySelectorAll('.obrazky img, .gallery img').forEach(img => {
        if (img.src) images.push(img.src);
      });
      
      results.push({
        url: window.location.href,
        title: document.querySelector('h1')?.textContent?.trim(),
        price: document.querySelector('.cena, .inzeratcena')?.textContent?.trim(),
        location: document.querySelector('.lokalita')?.textContent?.trim(),
        description: document.querySelector('.popis')?.textContent?.trim(),
        images,
        sellerPhone: document.querySelector('a[href^="tel:"]')?.href?.replace('tel:', ''),
      });
    }
    
    return results;
  });
  
  return data;
}
`;

/**
 * Scrapuje Bazoš.sk cez Apify
 */
export async function scrapeBazosApify(
  urls: string[]
): Promise<{
  listings: RawListingData[];
  errors: ScrapeError[];
}> {
  const errors: ScrapeError[] = [];
  const listings: RawListingData[] = [];

  try {
    const items = await runApifyPlaywrightScraper(
      urls,
      BAZOS_PAGE_FUNCTION,
      { maxRequests: urls.length * 30 }
    );

    for (const item of items) {
      if (!item.url || !item.title) continue;

      listings.push({
        externalId: item.url.match(/inzerat\/(\d+)/)?.[1] || item.url,
        sourceUrl: item.url,
        title: item.title,
        description: item.description || "",
        priceRaw: item.price || "",
        locationRaw: item.location || "",
        areaRaw: "",
        imageUrls: item.images || [],
        sellerPhone: item.sellerPhone,
      });
    }

    console.log(`📊 Bazoš: ${listings.length} listings extracted`);

  } catch (error) {
    errors.push({
      type: "NETWORK_ERROR",
      message: error instanceof Error ? error.message : "Apify scrape failed",
      url: urls[0],
    });
  }

  return { listings, errors };
}

// ============================================================================
// EXPORT
// ============================================================================

export { APIFY_API_KEY };
