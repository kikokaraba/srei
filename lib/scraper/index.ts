// Scraper Module - Centrálny export

// Types
export * from "./types";

// Parser
export {
  parseCondition,
  parseEnergyCertificate,
  parseFloor,
  parseElevator,
  parseBalcony,
  parseParking,
  parseCellar,
  parseInsulation,
  parseHeating,
  parseYearBuilt,
  parseRooms,
  parseArea,
  parsePrice,
  parseDescription,
} from "./parser";

// Bazoš Scraper
export {
  BAZOS_CONFIG,
  parseLocation,
  parseBazosPrice,
  parseBazosArea,
  extractExternalId,
  scrapeListingPage,
  scrapeListingDetail,
  parseListing,
  rateLimitWait,
} from "./bazos";

// Cheerio Scraper (fallback)
export {
  scrapeListingPageCheerio,
  scrapeListingDetailCheerio,
  scrapeWithCheerio,
} from "./cheerio-scraper";

// Playwright Scraper
export {
  scrapeListingPagePlaywright,
  scrapeListingDetailPlaywright,
  scrapeWithDetails,
  closeBrowser,
  BAZOS_SELECTORS,
  browserManager,
  type PlaywrightConfig,
} from "./playwright-scraper";

// Engine
export {
  scrapeBazos,
  runFullSync,
  ScrapeLogger,
} from "./engine";

// Stealth Engine
export {
  fetchWithRetry,
  parseListingElement,
  syncProperty,
  scrapeBazosCategory,
  runStealthScrape,
  DEFAULT_CONFIG as STEALTH_CONFIG,
  USER_AGENTS,
  type ScraperStats,
  type ParsedListing,
} from "./stealth-engine";

// Professional Stealth Scraper (Nehnutelnosti.sk)
export {
  scrapeNehnutelnostiList,
  scrapeNehnutelnostiDetail,
  autoScroll,
  extractHighQualityImages,
  humanDelay,
  getRandomUserAgent,
  closeStealthBrowser,
  stealthManager,
  NEHNUTELNOSTI_SELECTORS,
  type StealthConfig,
} from "./stealth-scraper";

// Slovakia-Wide Scraper
export {
  getAllScrapingTargets,
  getTargetsByPortal,
  getTargetsByRegion,
  getTargetsByPropertyType,
  batchTargets,
  getScrapingStats,
  slovakiaScraper,
  SlovakiaScraper,
  type ScrapingTarget,
  type ScrapingProgress,
  type ScrapingResult,
} from "./slovakia-scraper";

// Apify Scraper (Professional infrastructure)
export {
  runApifyWebScraper,
  runApifyPlaywrightScraper,
  scrapeNehnutelnostiApify,
  scrapeBazosApify,
} from "./apify-scraper";

// Apify Service (Production scraping with webhooks)
export {
  runApifyScraper,
  triggerSlovakiaScraping,
  getApifyDatasetItems,
  getApifyRunStatus,
  waitForApifyRun,
  type ApifyScrapedItem,
} from "./apify-service";

// Page Functions pre jednotlivé portály
export {
  NEHNUTELNOSTI_PAGE_FUNCTION,
  BAZOS_PAGE_FUNCTION,
  REALITY_PAGE_FUNCTION,
} from "./nehnutelnosti-config";
