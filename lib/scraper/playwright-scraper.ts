// Playwright Scraper - Robustný scraper s podporou headless browsera

import type { Browser, BrowserContext, Page, LaunchOptions } from "playwright-core";
import type { RawListingData, ScrapeError, ScraperConfig } from "./types";
import { BAZOS_CONFIG } from "./bazos";

/**
 * Konfigurácia pre Playwright
 */
interface PlaywrightConfig {
  // Browser endpoint (Browserless, Bright Data, alebo lokálny)
  browserWSEndpoint?: string;
  // Alternatívne: executable path pre lokálny browser
  executablePath?: string;
  // Headless mód
  headless: boolean;
  // Timeout pre navigáciu (ms)
  navigationTimeout: number;
  // User agent
  userAgent: string;
  // Viewport
  viewport: { width: number; height: number };
  // Proxy (voliteľné)
  proxy?: {
    server: string;
    username?: string;
    password?: string;
  };
}

const DEFAULT_CONFIG: PlaywrightConfig = {
  browserWSEndpoint: process.env.BROWSER_WS_ENDPOINT,
  executablePath: process.env.BROWSER_EXECUTABLE_PATH,
  headless: true,
  navigationTimeout: 30000,
  userAgent: BAZOS_CONFIG.userAgent,
  viewport: { width: 1920, height: 1080 },
};

/**
 * Bazoš HTML Selektory - centralizované pre jednoduchú údržbu
 * Ak Bazoš zmení štruktúru, upravíš len tu
 */
const BAZOS_SELECTORS = {
  // Listing page (zoznam inzerátov)
  listingContainer: ".inzeraty, .inzerat, [class*='inzer']",
  listingItem: ".inzeraty .inzerat, .inzeraty > div, .vypis .vypis-item",
  listingLink: "a[href*='/inzerat/']",
  listingTitle: ".nadpis, h2, .nazov, .title",
  listingPrice: ".cena, .price, [class*='cena']",
  listingLocation: ".lokalita, .location, [class*='lokac']",
  listingArea: "[class*='plocha'], [class*='m2'], [class*='area']",
  listingImage: "img[src*='img.bazos'], .obrazok img",
  pagination: ".strankovani, .pagination, nav[aria-label*='page']",
  nextPage: "a:has-text('Ďalšia'), a:has-text('ďalšia'), a:has-text('>>')",
  
  // Detail page (detail inzerátu)
  detailTitle: "h1, .nadpis, .nazov",
  detailPrice: ".cena, .inzeratcena, [class*='cena']",
  detailDescription: ".popis, .text, [class*='popis']",
  detailLocation: ".lokalita, .info-lokalita, [class*='lokac']",
  detailImages: ".obrazky img, .gallery img, .foto img",
  detailSeller: ".kontakt, .prodejce, [class*='predaj']",
  detailPhone: "a[href^='tel:'], [class*='telefon']",
  detailDate: ".datum, .date, [class*='datu']",
  detailParams: ".parametre, .params, table",
};

/**
 * Singleton pre browser management
 */
class BrowserManager {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  
  async getBrowser(config: PlaywrightConfig = DEFAULT_CONFIG): Promise<Browser> {
    if (this.browser?.isConnected()) {
      return this.browser;
    }
    
    // Dynamický import playwright-core
    const { chromium } = await import("playwright-core");
    
    // Pripoj sa k vzdialenému browseru (Browserless, Bright Data)
    if (config.browserWSEndpoint) {
      console.log("🌐 Connecting to remote browser...");
      this.browser = await chromium.connect(config.browserWSEndpoint);
    } 
    // Lokálny browser
    else if (config.executablePath) {
      console.log("🖥️ Launching local browser...");
      const launchOptions: LaunchOptions = {
        executablePath: config.executablePath,
        headless: config.headless,
      };
      if (config.proxy) {
        launchOptions.proxy = config.proxy;
      }
      this.browser = await chromium.launch(launchOptions);
    }
    // Fallback - pokus o nájdenie systémového Chrome
    else {
      throw new Error(
        "Browser not configured. Set BROWSER_WS_ENDPOINT or BROWSER_EXECUTABLE_PATH in .env"
      );
    }
    
    return this.browser;
  }
  
  async getContext(config: PlaywrightConfig = DEFAULT_CONFIG): Promise<BrowserContext> {
    if (this.context) {
      return this.context;
    }
    
    const browser = await this.getBrowser(config);
    
    this.context = await browser.newContext({
      userAgent: config.userAgent,
      viewport: config.viewport,
      locale: "sk-SK",
      timezoneId: "Europe/Bratislava",
      // Anti-detection
      javaScriptEnabled: true,
      ignoreHTTPSErrors: true,
    });
    
    // Blokuj zbytočné resources pre rýchlejšie načítanie
    await this.context.route("**/*.{png,jpg,jpeg,gif,webp,svg,woff,woff2}", route => route.abort());
    await this.context.route("**/analytics**", route => route.abort());
    await this.context.route("**/tracking**", route => route.abort());
    
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

const browserManager = new BrowserManager();

/**
 * Čaká na element s exponenciálnym backoff
 */
async function waitForSelector(
  page: Page,
  selector: string,
  timeout: number = 10000
): Promise<boolean> {
  try {
    await page.waitForSelector(selector, { timeout });
    return true;
  } catch {
    return false;
  }
}

/**
 * Detekuje či sa štruktúra stránky zmenila
 */
async function detectStructureChange(page: Page): Promise<ScrapeError | null> {
  // Skontroluj či existujú očakávané elementy
  const hasListings = await page.$(BAZOS_SELECTORS.listingContainer);
  const hasItems = await page.$$(BAZOS_SELECTORS.listingItem);
  
  if (!hasListings && hasItems.length === 0) {
    // Skontroluj či nie sme na chybovej stránke
    const pageText = await page.textContent("body");
    
    if (pageText?.includes("404") || pageText?.includes("nenájdená")) {
      return {
        type: "NETWORK_ERROR",
        message: "Stránka nenájdená (404)",
        url: page.url(),
      };
    }
    
    // Možná zmena štruktúry
    return {
      type: "STRUCTURE_CHANGE",
      message: "Bazoš HTML štruktúra sa zmenila - selektory nenašli očakávané elementy",
      url: page.url(),
    };
  }
  
  return null;
}

/**
 * Scrapuje zoznam inzerátov z jednej stránky
 */
export async function scrapeListingPagePlaywright(
  pageUrl: string,
  config: PlaywrightConfig = DEFAULT_CONFIG
): Promise<{
  listings: RawListingData[];
  nextPageUrl?: string;
  errors: ScrapeError[];
}> {
  const errors: ScrapeError[] = [];
  const listings: RawListingData[] = [];
  let page: Page | null = null;
  
  try {
    const context = await browserManager.getContext(config);
    page = await context.newPage();
    
    // Naviguj na stránku
    console.log(`📄 Navigating to: ${pageUrl}`);
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
    
    // Počkaj na načítanie obsahu
    await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});
    
    // Detekuj zmenu štruktúry
    const structureError = await detectStructureChange(page);
    if (structureError) {
      errors.push(structureError);
      return { listings, errors };
    }
    
    // Extrahuj inzeráty
    const items = await page.$$(BAZOS_SELECTORS.listingItem);
    
    for (const item of items) {
      try {
        // Extrahuj link a externalId
        const linkElement = await item.$(BAZOS_SELECTORS.listingLink);
        const href = await linkElement?.getAttribute("href");
        
        if (!href) continue;
        
        const fullUrl = href.startsWith("http") ? href : `${BAZOS_CONFIG.baseUrl}${href}`;
        const externalIdMatch = href.match(/inzerat\/(\d+)/);
        const externalId = externalIdMatch?.[1] || href;
        
        // Extrahuj základné údaje
        const title = await item.$eval(
          BAZOS_SELECTORS.listingTitle,
          el => el.textContent?.trim() || ""
        ).catch(() => "");
        
        const priceRaw = await item.$eval(
          BAZOS_SELECTORS.listingPrice,
          el => el.textContent?.trim() || ""
        ).catch(() => "");
        
        const locationRaw = await item.$eval(
          BAZOS_SELECTORS.listingLocation,
          el => el.textContent?.trim() || ""
        ).catch(() => "");
        
        const areaRaw = await item.$eval(
          BAZOS_SELECTORS.listingArea,
          el => el.textContent?.trim() || ""
        ).catch(() => "");
        
        // Extrahuj obrázok
        const imageUrl = await item.$eval(
          BAZOS_SELECTORS.listingImage,
          (el: HTMLImageElement) => el.src
        ).catch(() => "");
        
        if (title && (priceRaw || locationRaw)) {
          listings.push({
            externalId,
            sourceUrl: fullUrl,
            title,
            description: "", // Vyplní sa pri detail scrape
            priceRaw,
            locationRaw,
            areaRaw,
            imageUrls: imageUrl ? [imageUrl] : [],
          });
        }
      } catch (itemError) {
        // Skip problematic item, continue with others
        console.warn("Failed to parse listing item:", itemError);
      }
    }
    
    // Nájdi odkaz na ďalšiu stránku
    const nextPageLink = await page.$(BAZOS_SELECTORS.nextPage);
    let nextPageUrl: string | undefined;
    
    if (nextPageLink) {
      const href = await nextPageLink.getAttribute("href");
      if (href) {
        nextPageUrl = href.startsWith("http") ? href : `${BAZOS_CONFIG.baseUrl}${href}`;
      }
    }
    
    console.log(`✅ Found ${listings.length} listings on page`);
    
    return { listings, nextPageUrl, errors };
    
  } catch (error) {
    errors.push({
      type: "NETWORK_ERROR",
      message: error instanceof Error ? error.message : "Unknown error",
      url: pageUrl,
    });
    return { listings, errors };
    
  } finally {
    if (page) {
      await page.close();
    }
  }
}

/**
 * Scrapuje detail jedného inzerátu
 */
export async function scrapeListingDetailPlaywright(
  url: string,
  config: PlaywrightConfig = DEFAULT_CONFIG
): Promise<{
  data: Partial<RawListingData> | null;
  errors: ScrapeError[];
}> {
  const errors: ScrapeError[] = [];
  let page: Page | null = null;
  
  try {
    const context = await browserManager.getContext(config);
    page = await context.newPage();
    
    // Naviguj na detail
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
    
    await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {});
    
    // Extrahuj popis
    const description = await page.$eval(
      BAZOS_SELECTORS.detailDescription,
      el => el.textContent?.trim() || ""
    ).catch(() => "");
    
    // Extrahuj všetky obrázky
    const imageUrls = await page.$$eval(
      BAZOS_SELECTORS.detailImages,
      (imgs: HTMLImageElement[]) => imgs.map(img => img.src).filter(Boolean)
    ).catch(() => []);
    
    // Extrahuj kontakt predajcu
    const sellerName = await page.$eval(
      BAZOS_SELECTORS.detailSeller,
      el => el.textContent?.trim() || ""
    ).catch(() => "");
    
    // Extrahuj telefón
    const sellerPhone = await page.$eval(
      BAZOS_SELECTORS.detailPhone,
      el => {
        const href = el.getAttribute("href");
        return href?.replace("tel:", "") || el.textContent?.trim() || "";
      }
    ).catch(() => "");
    
    // Extrahuj dátum pridania
    const postedAtRaw = await page.$eval(
      BAZOS_SELECTORS.detailDate,
      el => el.textContent?.trim() || ""
    ).catch(() => "");
    
    return {
      data: {
        description,
        imageUrls,
        sellerName,
        sellerPhone,
        postedAt: postedAtRaw,
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
    if (page) {
      await page.close();
    }
  }
}

/**
 * Kompletný scrape - zoznam + detaily
 */
export async function scrapeWithDetails(
  categoryUrl: string,
  maxListings: number = 100,
  config: PlaywrightConfig = DEFAULT_CONFIG
): Promise<{
  listings: RawListingData[];
  errors: ScrapeError[];
}> {
  const allListings: RawListingData[] = [];
  const allErrors: ScrapeError[] = [];
  
  let pageUrl: string | undefined = categoryUrl;
  let pageCount = 0;
  
  try {
    while (pageUrl && allListings.length < maxListings && pageCount < BAZOS_CONFIG.maxPages) {
      const { listings, nextPageUrl, errors } = await scrapeListingPagePlaywright(pageUrl, config);
      
      allErrors.push(...errors);
      
      // Ak je kritická chyba štruktúry, zastav
      if (errors.some(e => e.type === "STRUCTURE_CHANGE")) {
        break;
      }
      
      // Získaj detaily pre každý listing
      for (const listing of listings) {
        if (allListings.length >= maxListings) break;
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const { data: details, errors: detailErrors } = await scrapeListingDetailPlaywright(
          listing.sourceUrl,
          config
        );
        
        allErrors.push(...detailErrors);
        
        if (details) {
          allListings.push({
            ...listing,
            description: details.description || listing.description,
            imageUrls: details.imageUrls?.length ? details.imageUrls : listing.imageUrls,
            sellerName: details.sellerName,
            sellerPhone: details.sellerPhone,
            postedAt: details.postedAt,
          });
        } else {
          allListings.push(listing);
        }
      }
      
      pageUrl = nextPageUrl;
      pageCount++;
      
      // Rate limiting medzi stránkami
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
    
  } finally {
    // Cleanup - zatvor browser
    await browserManager.close();
  }
  
  return { listings: allListings, errors: allErrors };
}

/**
 * Cleanup function - volaj pri ukončení aplikácie
 */
export async function closeBrowser(): Promise<void> {
  await browserManager.close();
}

/**
 * Export browser manager pre pokročilé použitie
 */
export { browserManager, BAZOS_SELECTORS, DEFAULT_CONFIG };
export type { PlaywrightConfig };
