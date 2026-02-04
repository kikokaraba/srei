/**
 * Historické ceny nehnuteľností na Slovensku (2005-2025)
 * 
 * Zdroj: NBS (Národná banka Slovenska)
 * https://nbs.sk/statisticke-udaje/vybrane-makroekonomicke-ukazovatele/ceny-nehnutelnosti-na-byvanie/
 * 
 * Dáta sú štvrťročné, v EUR/m² pre byty
 * Index: 2010 = 100
 */

export interface HistoricalPricePoint {
  year: number;
  quarter: number;
  pricePerM2: number;
  index: number; // 2010 = 100
}

export interface RegionHistoricalData {
  region: string;
  regionCode: string;
  data: HistoricalPricePoint[];
}

// Mapovanie miest na kraje
export const CITY_TO_REGION: Record<string, string> = {
  BRATISLAVA: "BRATISLAVSKY",
  KOSICE: "KOSICKY",
  PRESOV: "PRESOVSKY",
  ZILINA: "ZILINSKY",
  BANSKA_BYSTRICA: "BANSKOBYSTRICKY",
  TRNAVA: "TRNAVSKY",
  TRENCIN: "TRENCIANSKY",
  NITRA: "NITRIANSKY",
};

/** Mapovanie kódu kraja (NBS) na mesto pre DB dotazy */
export const REGION_TO_CITY: Record<string, string> = {
  BRATISLAVSKY: "BRATISLAVA",
  KOSICKY: "KOSICE",
  PRESOVSKY: "PRESOV",
  ZILINSKY: "ZILINA",
  BANSKOBYSTRICKY: "BANSKA_BYSTRICA",
  TRNAVSKY: "TRNAVA",
  TRENCIANSKY: "TRENCIN",
  NITRIANSKY: "NITRA",
};

export const REGION_LABELS: Record<string, string> = {
  BRATISLAVSKY: "Bratislavský kraj",
  KOSICKY: "Košický kraj",
  PRESOVSKY: "Prešovský kraj",
  ZILINSKY: "Žilinský kraj",
  BANSKOBYSTRICKY: "Banskobystrický kraj",
  TRNAVSKY: "Trnavský kraj",
  TRENCIANSKY: "Trenčiansky kraj",
  NITRIANSKY: "Nitriansky kraj",
  SLOVENSKO: "Slovensko (priemer)",
};

// Historické dáta – načítavajú sa z NBS/DB (prázdne do implementácie)
export const HISTORICAL_DATA: Record<string, RegionHistoricalData> = {};

/**
 * Získa historické dáta pre región
 */
export function getHistoricalPrices(regionCode: string): RegionHistoricalData | null {
  return HISTORICAL_DATA[regionCode] || null;
}

/**
 * Získa historické dáta pre mesto (mapované na kraj)
 */
export function getHistoricalPricesForCity(cityCode: string): RegionHistoricalData | null {
  const regionCode = CITY_TO_REGION[cityCode];
  if (!regionCode) return null;
  return HISTORICAL_DATA[regionCode] || null;
}

/**
 * Porovná vývoj cien dvoch regiónov
 */
export function compareRegions(region1: string, region2: string): {
  region1: RegionHistoricalData;
  region2: RegionHistoricalData;
  comparison: {
    year: number;
    quarter: number;
    difference: number; // Rozdiel v %
    differenceAbsolute: number; // Rozdiel v EUR
  }[];
} | null {
  const data1 = HISTORICAL_DATA[region1];
  const data2 = HISTORICAL_DATA[region2];
  
  if (!data1 || !data2) return null;
  
  const comparison = data1.data.map((point, i) => ({
    year: point.year,
    quarter: point.quarter,
    difference: Math.round(((point.pricePerM2 - data2.data[i].pricePerM2) / data2.data[i].pricePerM2) * 100),
    differenceAbsolute: point.pricePerM2 - data2.data[i].pricePerM2,
  }));
  
  return { region1: data1, region2: data2, comparison };
}

/**
 * Získa štatistiky pre región
 */
export function getRegionStats(regionCode: string): {
  currentPrice: number;
  priceChange1Y: number;
  priceChange5Y: number;
  priceChange10Y: number;
  allTimeHigh: number;
  allTimeLow: number;
  averagePrice: number;
} | null {
  const data = HISTORICAL_DATA[regionCode];
  if (!data) return null;
  
  const prices = data.data.map(d => d.pricePerM2);
  const current = prices[prices.length - 1];
  const oneYearAgo = prices[prices.length - 5] || prices[0]; // 4 quarters ago
  const fiveYearsAgo = prices[prices.length - 21] || prices[0]; // 20 quarters ago
  const tenYearsAgo = prices[prices.length - 41] || prices[0]; // 40 quarters ago
  
  return {
    currentPrice: current,
    priceChange1Y: Math.round(((current - oneYearAgo) / oneYearAgo) * 100 * 10) / 10,
    priceChange5Y: Math.round(((current - fiveYearsAgo) / fiveYearsAgo) * 100 * 10) / 10,
    priceChange10Y: Math.round(((current - tenYearsAgo) / tenYearsAgo) * 100 * 10) / 10,
    allTimeHigh: Math.max(...prices),
    allTimeLow: Math.min(...prices),
    averagePrice: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length),
  };
}

/**
 * Získa ročné priemery pre graf
 */
export function getYearlyAverages(regionCode: string): {
  year: number;
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
}[] {
  const data = HISTORICAL_DATA[regionCode];
  if (!data) return [];
  
  const yearlyData: Record<number, number[]> = {};
  
  data.data.forEach(point => {
    if (!yearlyData[point.year]) {
      yearlyData[point.year] = [];
    }
    yearlyData[point.year].push(point.pricePerM2);
  });
  
  return Object.entries(yearlyData).map(([year, prices]) => ({
    year: parseInt(year),
    avgPrice: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length),
    minPrice: Math.min(...prices),
    maxPrice: Math.max(...prices),
  }));
}
