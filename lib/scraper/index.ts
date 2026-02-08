// Scraper Module – výhradne Apify (webhook + process-apify)

export * from "./types";

export { parseListingUrl, SUPPORTED_PORTALS } from "./url-parser";

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

// Cieľové URL pre Apify (Nehnutelnosti.sk + Bazoš)
export {
  getAllScrapingTargets,
  getTargetsByPortal,
  getTargetsByRegion,
  getTargetsByPropertyType,
  batchTargets,
  getScrapingStats,
  type ScrapingTarget,
} from "./slovakia-scraper";

// Apify Service – spúšťanie scrapingu a spracovanie výsledkov
export {
  runApifyScraper,
  triggerSlovakiaScraping,
  runTopRealityScraper,
  getApifyDatasetItems,
  getApifyDatasetItemsRaw,
  getApifyRunStatus,
  waitForApifyRun,
  type ApifyScrapedItem,
  type TopRealityInput,
  type TopRealityDatasetItem,
} from "./apify-service";

// Page funkcie pre Apify (nehnutelnosti-config)
export { BAZOS_PAGE_FUNCTION, REALITY_PAGE_FUNCTION } from "./nehnutelnosti-config";

export { normalizeImages } from "./normalize-images";
