// Data Sources - Centrálny export

// Typy
export * from "./types";

// NBS
export {
  fetchNBSPropertyPrices,
  fetchNBSNationalAverage,
  fetchNBSPricesByRegion,
  getHistoricalPriceData,
} from "./nbs";

// NBS Scraper
export {
  checkForNewNBSData,
  scrapeNBSData,
  sendNewDataNotification,
  runNBSDataCheck,
} from "./nbs-scraper";

// Štatistický úrad SR
export {
  getAvailableDatasets,
  getDatasetInfo,
  fetchHousingConstructionData,
  fetchEconomicIndicators,
  fetchDemographicData,
  fetchConstructionPriceIndex,
} from "./statistics-sk";

// Agregátor
export {
  getAggregatedMarketData,
  getMarketDataByCity,
  getMarketSummary,
  getPriceTrends,
} from "./aggregator";
