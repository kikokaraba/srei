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
  type StealthConfig,
  type ScraperStats,
  type ParsedListing,
} from "./stealth-engine";
