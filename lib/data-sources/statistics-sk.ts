// Štatistický úrad SR - DATAcube API
// Zdroj: https://data.statistics.sk/api/

import { StatisticsData, FetchResult, EconomicIndicators } from "./types";

const API_BASE = "https://data.statistics.sk/api/v2";

// Kódy relevantných datasetov
const DATASET_CODES = {
  // Bytová výstavba
  HOUSING_CONSTRUCTION: "st2012rs", // Dokončené byty
  BUILDING_PERMITS: "st2003rs", // Stavebné povolenia
  
  // Ekonomické ukazovatele
  GDP: "nu1002qs", // HDP
  INFLATION: "sp0007ms", // Inflácia
  UNEMPLOYMENT: "pr0205qs", // Nezamestnanosť
  WAGES: "pr0201qs", // Priemerné mzdy
  
  // Demografické
  POPULATION: "om7102rr", // Obyvateľstvo
  MIGRATION: "om7104rr", // Migrácia
  
  // Cenové indexy
  CONSTRUCTION_PRICES: "sp0025qs", // Index cien v stavebníctve
};

/**
 * Všeobecná funkcia pre fetch z DATAcube API
 */
async function fetchFromDATAcube<T>(
  endpoint: string,
  params?: Record<string, string>
): Promise<T | null> {
  try {
    const url = new URL(`${API_BASE}${endpoint}`);
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });
    }
    
    const response = await fetch(url.toString(), {
      headers: {
        "Accept": "application/json",
      },
      next: { revalidate: 3600 }, // Cache for 1 hour
    });
    
    if (!response.ok) {
      console.error(`DATAcube API error: ${response.status}`);
      return null;
    }
    
    return await response.json();
  } catch (error) {
    console.error("DATAcube fetch error:", error);
    return null;
  }
}

/**
 * Získa zoznam všetkých dostupných datasetov
 */
export async function getAvailableDatasets(): Promise<string[]> {
  const result = await fetchFromDATAcube<{ link: { href: string }[] }>("/collection?lang=sk");
  
  if (!result?.link) {
    return [];
  }
  
  return result.link.map(l => l.href);
}

/**
 * Získa informácie o konkrétnom datasete
 */
export async function getDatasetInfo(code: string): Promise<unknown> {
  return await fetchFromDATAcube(`/dataset/${code}?lang=sk`);
}

/**
 * Získa dáta o bytovej výstavbe
 * Načítava sa z DATAcube API (prázdne do implementácie)
 */
export async function fetchHousingConstructionData(): Promise<
  FetchResult<StatisticsData>
> {
  return {
    success: true,
    data: [],
    source: "Štatistický úrad SR - DATAcube",
    fetchedAt: new Date(),
  };
}

/**
 * Získa ekonomické ukazovatele
 * Načítavajú sa z DATAcube API (prázdne do implementácie)
 */
export async function fetchEconomicIndicators(): Promise<
  FetchResult<EconomicIndicators>
> {
  return {
    success: true,
    data: [],
    source: "Štatistický úrad SR",
    fetchedAt: new Date(),
  };
}

/**
 * Získa demografické dáta pre mestá
 * Načítavajú sa z DATAcube API (prázdne do implementácie)
 */
export async function fetchDemographicData(
  _city?: string
): Promise<StatisticsData[]> {
  return [];
}

/**
 * Získa index cien v stavebníctve
 * Načítava sa z DATAcube API (prázdne do implementácie)
 */
export async function fetchConstructionPriceIndex(): Promise<{
  currentIndex: number;
  changeYoY: number;
  period: string;
}> {
  return {
    currentIndex: 0,
    changeYoY: 0,
    period: "—",
  };
}
