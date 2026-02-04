import { useQuery } from "@tanstack/react-query";

export interface UserPreferences {
  primaryCity: string | null;
  trackedRegions: string[];
  trackedDistricts: string[];
  trackedCities: string[];
  investmentType: string | null;
  minYield: number | null;
  maxPrice: number | null;
  minPrice: number | null;
  minPricePerM2?: number | null;
  maxPricePerM2?: number | null;
  minArea?: number | null;
  maxArea?: number | null;
  minRooms?: number | null;
  maxRooms?: number | null;
  condition?: string; // JSON array string
  energyCertificates?: string; // JSON array string
  minFloor?: number | null;
  maxFloor?: number | null;
  onlyDistressed?: boolean;
  maxYield?: number | null;
  minGrossYield?: number | null;
  maxGrossYield?: number | null;
  minCashOnCash?: number | null;
  maxDaysOnMarket?: number | null;
  minGapPercentage?: number | null;
  notifyMarketGaps: boolean;
  notifyPriceDrops: boolean;
  notifyNewProperties: boolean;
  notifyUrbanDevelopment: boolean;
  onboardingCompleted: boolean;
}

// Mapovanie región ID na kód pre API
const REGION_ID_TO_CODE: Record<string, string> = {
  BA: "BRATISLAVSKY",
  TT: "TRNAVSKY",
  TN: "TRENCIANSKY",
  NR: "NITRIANSKY",
  ZA: "ZILINSKY",
  BB: "BANSKOBYSTRICKY",
  PO: "PRESOVSKY",
  KE: "KOSICKY",
};

// Mapovanie okres ID na región
const DISTRICT_TO_REGION: Record<string, string> = {
  // Bratislavský kraj
  BA1: "BA", BA2: "BA", BA3: "BA", BA4: "BA", BA5: "BA",
  MA: "BA", PE_BA: "BA", SC: "BA",
  // Trnavský kraj
  DS: "TT", GA: "TT", HC: "TT", PN: "TT", SE: "TT", SK: "TT", TT_D: "TT",
  // Trenčiansky kraj
  BN: "TN", IL: "TN", MY: "TN", NM: "TN", PE_TN: "TN", PB: "TN", PU: "TN", TN_D: "TN",
  // Nitriansky kraj
  KN: "NR", LV: "NR", NR_D: "NR", NZ: "NR", SA: "NR", TO: "NR", ZM: "NR",
  // Žilinský kraj
  BY: "ZA", CA: "ZA", DK: "ZA", KM: "ZA", LM: "ZA", MT: "ZA", NO: "ZA", RK: "ZA", TR: "ZA", TS: "ZA", ZA_D: "ZA",
  // Banskobystrický kraj
  BB_D: "BB", BR: "BB", BS: "BB", DT: "BB", KA: "BB", LC: "BB", PT: "BB", RA: "BB", RS: "BB", VK: "BB", ZC: "BB", ZH: "BB", ZV: "BB",
  // Prešovský kraj
  BJ: "PO", HE: "PO", KK: "PO", LE: "PO", ML: "PO", PO_D: "PO", PP: "PO", SB: "PO", SK_PO: "PO", SL: "PO", SN: "PO", SP: "PO", SV: "PO", VT: "PO",
  // Košický kraj
  GE: "KE", KE1: "KE", KE2: "KE", KE3: "KE", KE4: "KE", KS: "KE", MI: "KE", RV: "KE", SO: "KE", SP_KE: "KE", TV: "KE",
};

/**
 * Bezpečne parsuje JSON string na pole
 */
function safeParseArray(value: unknown): string[] {
  if (!value) return [];
  
  // Ak už je to pole, vráť ho
  if (Array.isArray(value)) return value;
  
  // Ak je to string, skús ho parsovať
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  
  return [];
}

async function fetchPreferences(): Promise<UserPreferences | null> {
  try {
    const response = await fetch("/api/v1/user/preferences");
    const data = await response.json();
    if (!data.success || !data.data) {
      return null;
    }

    const prefs = data.data as Record<string, unknown>;
    return {
      primaryCity: prefs.primaryCity as string | null,
      trackedRegions: safeParseArray(prefs.trackedRegions),
      trackedDistricts: safeParseArray(prefs.trackedDistricts),
      trackedCities: safeParseArray(prefs.trackedCities),
      investmentType: prefs.investmentType as string | null,
      minYield: prefs.minYield as number | null,
      maxPrice: prefs.maxPrice as number | null,
      minPrice: prefs.minPrice as number | null,
      minPricePerM2: prefs.minPricePerM2 as number | null | undefined,
      maxPricePerM2: prefs.maxPricePerM2 as number | null | undefined,
      minArea: prefs.minArea as number | null | undefined,
      maxArea: prefs.maxArea as number | null | undefined,
      minRooms: prefs.minRooms as number | null | undefined,
      maxRooms: prefs.maxRooms as number | null | undefined,
      condition: prefs.condition as string | undefined,
      energyCertificates: prefs.energyCertificates as string | undefined,
      minFloor: prefs.minFloor as number | null | undefined,
      maxFloor: prefs.maxFloor as number | null | undefined,
      onlyDistressed: prefs.onlyDistressed as boolean | undefined,
      maxYield: prefs.maxYield as number | null | undefined,
      minGrossYield: prefs.minGrossYield as number | null | undefined,
      maxGrossYield: prefs.maxGrossYield as number | null | undefined,
      minCashOnCash: prefs.minCashOnCash as number | null | undefined,
      maxDaysOnMarket: prefs.maxDaysOnMarket as number | null | undefined,
      minGapPercentage: prefs.minGapPercentage as number | null | undefined,
      notifyMarketGaps: Boolean(prefs.notifyMarketGaps ?? true),
      notifyPriceDrops: Boolean(prefs.notifyPriceDrops ?? true),
      notifyNewProperties: Boolean(prefs.notifyNewProperties ?? true),
      notifyUrbanDevelopment: Boolean(prefs.notifyUrbanDevelopment ?? true),
      onboardingCompleted: Boolean(prefs.onboardingCompleted ?? false),
    };
  } catch (error) {
    console.error("Error fetching preferences:", error);
    return null;
  }
}

/**
 * Získa všetky regióny z preferencií (priame + odvodené z okresov)
 */
function getTrackedRegionCodes(prefs: UserPreferences | null): string[] {
  if (!prefs) return [];
  
  const regionCodes = new Set<string>();
  
  // Priamo vybrané regióny - s extra kontrolou
  const regions = Array.isArray(prefs.trackedRegions) ? prefs.trackedRegions : [];
  regions.forEach(regionId => {
    const code = REGION_ID_TO_CODE[regionId];
    if (code) regionCodes.add(code);
  });
  
  // Regióny z vybraných okresov - s extra kontrolou
  const districts = Array.isArray(prefs.trackedDistricts) ? prefs.trackedDistricts : [];
  districts.forEach(districtId => {
    const regionId = DISTRICT_TO_REGION[districtId];
    if (regionId) {
      const code = REGION_ID_TO_CODE[regionId];
      if (code) regionCodes.add(code);
    }
  });
  
  return Array.from(regionCodes);
}

export function useUserPreferences() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["user-preferences"],
    queryFn: fetchPreferences,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Získaj regióny ako kódy pre API (BRATISLAVSKY, KOSICKY, atď.)
  const trackedRegionCodes = getTrackedRegionCodes(data ?? null);
  
  // Ak nie sú žiadne preferencie, vráť všetky regióny
  const hasLocationPreferences = (data?.trackedRegions?.length || 0) > 0 || 
                                  (data?.trackedDistricts?.length || 0) > 0 || 
                                  (data?.trackedCities?.length || 0) > 0;

  return {
    preferences: data,
    isLoading,
    error,
    hasPreferences: !!data,
    trackedRegionCodes,
    hasLocationPreferences,
  };
}

export { REGION_ID_TO_CODE, DISTRICT_TO_REGION };
