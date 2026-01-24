// Typy pre dátové zdroje

// NBS - Ceny nehnuteľností
export interface NBSPropertyPrice {
  year: number;
  quarter: number;
  region: string; // Kraj
  propertyType: "APARTMENT" | "HOUSE" | "ALL";
  pricePerSqm: number; // EUR/m²
  priceIndex: number; // Index (100 = base year)
  changeYoY: number; // % zmena medziročne
  changeQoQ: number; // % zmena medzištvrťročne
  fetchedAt: Date;
}

// Štatistický úrad SR - DATAcube
export interface StatisticsData {
  code: string;
  name: string;
  value: number;
  unit: string;
  period: string; // YYYY-QQ alebo YYYY-MM
  region?: string;
  fetchedAt: Date;
}

// Agregované trhové dáta
export interface MarketData {
  city: string;
  avgPricePerSqm: number;
  medianPricePerSqm: number;
  avgRent: number;
  grossYield: number; // %
  priceChangeYoY: number; // %
  priceChangeQoQ: number; // %
  listingsCount: number;
  avgDaysOnMarket: number;
  demandIndex: number; // 0-100
  supplyIndex: number; // 0-100
  updatedAt: Date;
}

// Hypotekárne dáta
export interface MortgageRates {
  date: Date;
  avgRate1Year: number;
  avgRate3Year: number;
  avgRate5Year: number;
  avgRate10Year: number;
  avgRateAll: number;
  newMortgageVolume: number; // EUR mil
  avgLTV: number; // %
  fetchedAt: Date;
}

// Ekonomické ukazovatele
export interface EconomicIndicators {
  date: Date;
  gdpGrowth: number; // %
  inflation: number; // %
  unemployment: number; // %
  avgWage: number; // EUR
  wageGrowth: number; // %
  constructionIndex: number;
  consumerConfidence: number;
  fetchedAt: Date;
}

// Demografické dáta
export interface DemographicData {
  city: string;
  population: number;
  populationChange: number; // %
  avgAge: number;
  householdCount: number;
  avgHouseholdSize: number;
  migrationBalance: number;
  year: number;
  fetchedAt: Date;
}

// Výsledok fetchu
export interface FetchResult<T> {
  success: boolean;
  data?: T[];
  error?: string;
  source: string;
  fetchedAt: Date;
  nextUpdate?: Date;
}

// Konfigurácia zdroja
export interface DataSourceConfig {
  name: string;
  enabled: boolean;
  updateInterval: number; // minúty
  lastFetch?: Date;
  lastSuccess?: Date;
  errorCount: number;
}

// Mapovanie krajov na mestá
export const REGION_TO_CITIES: Record<string, string[]> = {
  "Bratislavský kraj": ["BRATISLAVA"],
  "Trnavský kraj": ["TRNAVA"],
  "Trenčiansky kraj": ["TRENCIN"],
  "Nitriansky kraj": ["NITRA"],
  "Žilinský kraj": ["ZILINA"],
  "Banskobystrický kraj": ["BANSKA_BYSTRICA"],
  "Prešovský kraj": ["PRESOV"],
  "Košický kraj": ["KOSICE"],
};

// Slovenské kraje
export const SLOVAK_REGIONS = [
  "Bratislavský kraj",
  "Trnavský kraj",
  "Trenčiansky kraj",
  "Nitriansky kraj",
  "Žilinský kraj",
  "Banskobystrický kraj",
  "Prešovský kraj",
  "Košický kraj",
] as const;

export type SlovakRegion = typeof SLOVAK_REGIONS[number];
