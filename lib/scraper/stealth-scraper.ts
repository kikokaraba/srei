/**
 * Profesionálny Stealth Scraper pre slovenské realitné portály
 * 
 * Funkcie:
 * - Stealth mode (obchádza detekciu botov)
 * - AutoScroll pre lazy-loading obrázkov
 * - Náhodné pauzy simulujúce ľudské správanie
 * - Extrakcia obrázkov v plnej kvalite
 * - Residential proxy support
 */

import type { Browser, BrowserContext, Page } from "playwright-core";
import type { RawListingData, ScrapeError } from "./types";

// ============================================================================
// KONFIGURÁCIA
// ============================================================================

interface StealthConfig {
  browserWSEndpoint?: string;
  executablePath?: string;
  headless: boolean;
  navigationTimeout: number;
  proxy?: {
    server: string;
    username?: string;
    password?: string;
  };
  // Slovenské residential proxy pre Nehnutelnosti.sk
  useResidentialProxy: boolean;
}

const DEFAULT_STEALTH_CONFIG: StealthConfig = {
  browserWSEndpoint: process.env.BROWSER_WS_ENDPOINT,
  executablePath: process.env.BROWSER_EXECUTABLE_PATH,
  headless: true,
  navigationTimeout: 45000,
  useResidentialProxy: false,
};

// ============================================================================
// STEALTH UTILITIES
// ============================================================================

/**
 * Náhodné číslo v rozsahu (simulácia ľudského správania)
 */
function randomDelay(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Náhodná pauza medzi akciami
 */
async function humanDelay(minMs: number = 1000, maxMs: number = 3000): Promise<void> {
  const delay = randomDelay(minMs, maxMs);
  await new Promise(resolve => setTimeout(resolve, delay));
}

/**
 * Náhodný user agent (rotácia)
 */
function getRandomUserAgent(): string {
  const userAgents = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  ];
  return userAgents[Math.floor(Math.random() * userAgents.length)];
}

// ============================================================================
// AUTO-SCROLL (pre lazy-loading obrázkov)
// ============================================================================

/**
 * AutoScroll - prejde celú stránku pre načítanie lazy-loaded obsahu
 * Simuluje ľudské scrollovanie s náhodnými pauzami
 */
async function autoScroll(page: Page, maxScrolls: number = 15): Promise<void> {
  await page.evaluate(async (maxScrolls) => {
    await new Promise<void>((resolve) => {
      let totalHeight = 0;
      let scrollCount = 0;
      const distance = 300 + Math.floor(Math.random() * 200); // 300-500px
      
      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;
        scrollCount++;

        // Náhodný "pohľad" na obsah
        if (Math.random() > 0.7) {
          window.scrollBy(0, -50); // Malý scroll späť
        }

        if (totalHeight >= scrollHeight - window.innerHeight || scrollCount >= maxScrolls) {
          clearInterval(timer);
          // Scroll späť na vrch
          window.scrollTo(0, 0);
          resolve();
        }
      }, 150 + Math.floor(Math.random() * 100)); // 150-250ms medzi scrollmi
    });
  }, maxScrolls);
}

/**
 * Scroll k elementu (pre detaily)
 */
async function scrollToElement(page: Page, selector: string): Promise<void> {
  try {
    await page.evaluate((sel) => {
      const element = document.querySelector(sel);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, selector);
    await humanDelay(500, 1000);
  } catch {
    // Element neexistuje, pokračuj
  }
}

// ============================================================================
// IMAGE EXTRACTION (plná kvalita)
// ============================================================================

/**
 * Extrahuje URL obrázkov v najvyššej kvalite
 * Hľadá originálne URL namiesto thumbnailov
 */
async function extractHighQualityImages(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const images: string[] = [];
    const seenUrls = new Set<string>();

    // Stratégia 1: Galéria obrázkov (data atribúty)
    document.querySelectorAll("[data-src], [data-original], [data-full], [data-zoom]").forEach((el) => {
      const src = el.getAttribute("data-src") || 
                  el.getAttribute("data-original") || 
                  el.getAttribute("data-full") ||
                  el.getAttribute("data-zoom");
      if (src && !seenUrls.has(src)) {
        seenUrls.add(src);
        images.push(src);
      }
    });

    // Stratégia 2: Obrázky v galérii
    document.querySelectorAll(".gallery img, .photo-gallery img, .fotorama img, .lightbox img, .swiper-slide img").forEach((img) => {
      const el = img as HTMLImageElement;
      // Preferuj data-src (lazy load) nad src (thumbnail)
      const src = el.getAttribute("data-src") || el.getAttribute("data-lazy") || el.src;
      if (src && !seenUrls.has(src) && !src.includes("placeholder") && !src.includes("loading")) {
        seenUrls.add(src);
        // Nahraď thumbnail rozlíšenie za originál
        const highRes = src
          .replace(/_thumb/g, "")
          .replace(/_small/g, "")
          .replace(/_medium/g, "")
          .replace(/\/thumb\//g, "/original/")
          .replace(/\/small\//g, "/large/")
          .replace(/\?w=\d+/g, "")
          .replace(/\?h=\d+/g, "")
          .replace(/&w=\d+/g, "")
          .replace(/&h=\d+/g, "");
        images.push(highRes);
      }
    });

    // Stratégia 3: Všetky img elementy v content area
    document.querySelectorAll(".content img, .detail img, .inzerat img, article img, main img").forEach((img) => {
      const el = img as HTMLImageElement;
      if (el.naturalWidth > 100 && el.naturalHeight > 100) { // Ignoruj ikony
        const src = el.src;
        if (src && !seenUrls.has(src) && !src.includes("logo") && !src.includes("icon")) {
          seenUrls.add(src);
          images.push(src);
        }
      }
    });

    // Stratégia 4: Background images
    document.querySelectorAll("[style*='background-image']").forEach((el) => {
      const style = (el as HTMLElement).style.backgroundImage;
      const match = style.match(/url\(['"]?(.+?)['"]?\)/);
      if (match && match[1] && !seenUrls.has(match[1])) {
        seenUrls.add(match[1]);
        images.push(match[1]);
      }
    });

    // Filtruj a vráť unikátne URL
    return images.filter((url) => {
      try {
        new URL(url);
        return true;
      } catch {
        return url.startsWith("/"); // Relatívne URL
      }
    });
  });
}

// ============================================================================
// STEALTH BROWSER MANAGER
// ============================================================================

class StealthBrowserManager {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;

  async getContext(config: StealthConfig = DEFAULT_STEALTH_CONFIG): Promise<BrowserContext> {
    if (this.context) {
      return this.context;
    }

    const { chromium } = await import("playwright-core");

    // Pripoj sa k browseru
    if (config.browserWSEndpoint) {
      console.log("🔗 Connecting to remote browser with stealth...");
      this.browser = await chromium.connect(config.browserWSEndpoint);
    } else if (config.executablePath) {
      console.log("🖥️ Launching local stealth browser...");
      this.browser = await chromium.launch({
        executablePath: config.executablePath,
        headless: config.headless,
        args: [
          "--disable-blink-features=AutomationControlled",
          "--disable-dev-shm-usage",
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-infobars",
          "--window-size=1920,1080",
          "--start-maximized",
        ],
      });
    } else {
      throw new Error("Browser not configured. Set BROWSER_WS_ENDPOINT or BROWSER_EXECUTABLE_PATH");
    }

    // Vytvor stealth context
    this.context = await this.browser.newContext({
      userAgent: getRandomUserAgent(),
      viewport: { width: 1920, height: 1080 },
      locale: "sk-SK",
      timezoneId: "Europe/Bratislava",
      geolocation: { latitude: 48.1486, longitude: 17.1077 }, // Bratislava
      permissions: ["geolocation"],
      javaScriptEnabled: true,
      ignoreHTTPSErrors: true,
      // Stealth: pridaj cookies ako reálny užívateľ
      extraHTTPHeaders: {
        "Accept-Language": "sk-SK,sk;q=0.9,en;q=0.8",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Encoding": "gzip, deflate, br",
        "Connection": "keep-alive",
        "Upgrade-Insecure-Requests": "1",
        "Cache-Control": "max-age=0",
      },
    });

    // Stealth: Odstráň webdriver flag
    await this.context.addInitScript(() => {
      // Odstráň navigator.webdriver
      Object.defineProperty(navigator, "webdriver", {
        get: () => undefined,
      });

      // Prepiš navigator.plugins
      Object.defineProperty(navigator, "plugins", {
        get: () => [1, 2, 3, 4, 5],
      });

      // Prepiš navigator.languages
      Object.defineProperty(navigator, "languages", {
        get: () => ["sk-SK", "sk", "en-US", "en"],
      });

      // Chrome runtime
      (window as any).chrome = {
        runtime: {},
      };

      // Permissions
      const originalQuery = window.navigator.permissions.query;
      window.navigator.permissions.query = (parameters: any) =>
        parameters.name === "notifications"
          ? Promise.resolve({ state: Notification.permission } as PermissionStatus)
          : originalQuery(parameters);
    });

    return this.context;
  }

  async close(): Promise<void> {
    if (this.context) {
      await this.context.close();
      this.context = null;
    }
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}

const stealthManager = new StealthBrowserManager();

// ============================================================================
// NEHNUTELNOSTI.SK SCRAPER
// ============================================================================

const NEHNUTELNOSTI_SELECTORS = {
  // Listing page
  listingCard: ".advertisement-item, .estate-card, [data-testid='estate-card']",
  listingLink: "a[href*='/detail/']",
  listingTitle: ".advertisement-item__title, .estate-card__title, h2",
  listingPrice: ".advertisement-item__price, .estate-card__price, .price",
  listingLocation: ".advertisement-item__location, .estate-card__location, .location",
  listingArea: ".advertisement-item__area, .estate-card__area, [class*='area']",
  listingRooms: ".advertisement-item__rooms, .estate-card__rooms, [class*='room']",
  pagination: ".pagination, nav[aria-label*='page']",
  nextPage: "a[rel='next'], .pagination__next, [aria-label='Ďalšia stránka']",
  
  // Detail page
  detailTitle: "h1, .estate-detail__title",
  detailPrice: ".estate-detail__price, .price-main",
  detailDescription: ".estate-detail__description, .description, [class*='popis']",
  detailGallery: ".estate-detail__gallery, .gallery, .photo-gallery",
  detailParams: ".estate-detail__params, .parameters, table",
  detailContact: ".estate-detail__contact, .contact-info",
};

/**
 * Scrapuje zoznam inzerátov z Nehnutelnosti.sk
 */
export async function scrapeNehnutelnostiList(
  pageUrl: string,
  config: StealthConfig = DEFAULT_STEALTH_CONFIG
): Promise<{
  listings: RawListingData[];
  nextPageUrl?: string;
  errors: ScrapeError[];
}> {
  const errors: ScrapeError[] = [];
  const listings: RawListingData[] = [];
  let page: Page | null = null;

  try {
    const context = await stealthManager.getContext(config);
    page = await context.newPage();

    // Náhodná pauza pred navigáciou
    await humanDelay(1000, 2000);

    console.log(`🔍 [Nehnutelnosti.sk] Navigating to: ${pageUrl}`);
    const response = await page.goto(pageUrl, {
      waitUntil: "domcontentloaded",
      timeout: config.navigationTimeout,
    });

    if (!response?.ok()) {
      errors.push({
        type: "NETWORK_ERROR",
        message: `HTTP ${response?.status()}`,
        url: pageUrl,
      });
      return { listings, errors };
    }

    // Počkaj na JavaScript
    await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});

    // AutoScroll pre lazy-loading
    console.log("📜 AutoScrolling for lazy-loaded content...");
    await autoScroll(page, 10);
    await humanDelay(1500, 2500);

    // Extrahuj inzeráty
    const cards = await page.$$(NEHNUTELNOSTI_SELECTORS.listingCard);
    console.log(`📦 Found ${cards.length} listing cards`);

    for (const card of cards) {
      try {
        const linkElement = await card.$(NEHNUTELNOSTI_SELECTORS.listingLink);
        const href = await linkElement?.getAttribute("href");
        if (!href) continue;

        const fullUrl = href.startsWith("http") ? href : `https://www.nehnutelnosti.sk${href}`;
        const externalIdMatch = href.match(/\/detail\/([^\/]+)/);
        const externalId = externalIdMatch?.[1] || href.replace(/[^a-zA-Z0-9]/g, "");

        const title = await card.$eval(
          NEHNUTELNOSTI_SELECTORS.listingTitle,
          el => el.textContent?.trim() || ""
        ).catch(() => "");

        const priceRaw = await card.$eval(
          NEHNUTELNOSTI_SELECTORS.listingPrice,
          el => el.textContent?.trim() || ""
        ).catch(() => "");

        const locationRaw = await card.$eval(
          NEHNUTELNOSTI_SELECTORS.listingLocation,
          el => el.textContent?.trim() || ""
        ).catch(() => "");

        const areaRaw = await card.$eval(
          NEHNUTELNOSTI_SELECTORS.listingArea,
          el => el.textContent?.trim() || ""
        ).catch(() => "");

        if (title) {
          listings.push({
            externalId,
            sourceUrl: fullUrl,
            title,
            description: "",
            priceRaw,
            locationRaw,
            areaRaw,
            imageUrls: [],
          });
        }
      } catch (err) {
        console.warn("Failed to parse listing card:", err);
      }
    }

    // Nájdi next page
    const nextPageLink = await page.$(NEHNUTELNOSTI_SELECTORS.nextPage);
    let nextPageUrl: string | undefined;
    if (nextPageLink) {
      const href = await nextPageLink.getAttribute("href");
      if (href) {
        nextPageUrl = href.startsWith("http") ? href : `https://www.nehnutelnosti.sk${href}`;
      }
    }

    console.log(`✅ [Nehnutelnosti.sk] Extracted ${listings.length} listings`);
    return { listings, nextPageUrl, errors };

  } catch (error) {
    errors.push({
      type: "NETWORK_ERROR",
      message: error instanceof Error ? error.message : "Unknown error",
      url: pageUrl,
    });
    return { listings, errors };
  } finally {
    if (page) await page.close();
  }
}

/**
 * Scrapuje detail inzerátu z Nehnutelnosti.sk
 */
export async function scrapeNehnutelnostiDetail(
  url: string,
  config: StealthConfig = DEFAULT_STEALTH_CONFIG
): Promise<{
  data: Partial<RawListingData> | null;
  errors: ScrapeError[];
}> {
  const errors: ScrapeError[] = [];
  let page: Page | null = null;

  try {
    const context = await stealthManager.getContext(config);
    page = await context.newPage();

    // Náhodná pauza
    await humanDelay(2000, 4000);

    const response = await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: config.navigationTimeout,
    });

    if (!response?.ok()) {
      errors.push({
        type: "NETWORK_ERROR",
        message: `HTTP ${response?.status()}`,
        url,
      });
      return { data: null, errors };
    }

    await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});

    // AutoScroll pre všetky obrázky
    await autoScroll(page, 8);
    await humanDelay(1000, 2000);

    // Scroll k galérii
    await scrollToElement(page, NEHNUTELNOSTI_SELECTORS.detailGallery);

    // Extrahuj popis
    const description = await page.$eval(
      NEHNUTELNOSTI_SELECTORS.detailDescription,
      el => el.textContent?.trim() || ""
    ).catch(() => "");

    // Extrahuj obrázky v plnej kvalite
    const imageUrls = await extractHighQualityImages(page);
    console.log(`📸 Extracted ${imageUrls.length} high-quality images`);

    // Extrahuj parametre (izby, poschodie, atď.)
    const paramsText = await page.$eval(
      NEHNUTELNOSTI_SELECTORS.detailParams,
      el => el.textContent || ""
    ).catch(() => "");

    // Extrahuj kontakt
    const contactInfo = await page.$eval(
      NEHNUTELNOSTI_SELECTORS.detailContact,
      el => el.textContent?.trim() || ""
    ).catch(() => "");

    return {
      data: {
        description,
        imageUrls,
        paramsRaw: paramsText,
        sellerName: contactInfo,
      },
      errors,
    };

  } catch (error) {
    errors.push({
      type: "NETWORK_ERROR",
      message: error instanceof Error ? error.message : "Unknown error",
      url,
    });
    return { data: null, errors };
  } finally {
    if (page) await page.close();
  }
}

// ============================================================================
// EXPORT
// ============================================================================

export {
  stealthManager,
  autoScroll,
  extractHighQualityImages,
  humanDelay,
  getRandomUserAgent,
  NEHNUTELNOSTI_SELECTORS,
};

export type { StealthConfig };

/**
 * Cleanup - volaj pri ukončení
 */
export async function closeStealthBrowser(): Promise<void> {
  await stealthManager.close();
}
