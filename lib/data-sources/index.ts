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
