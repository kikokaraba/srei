import { useQuery } from "@tanstack/react-query";

interface UserPreferences {
  primaryCity: string | null;
  trackedRegions: string[];
  trackedDistricts: string[];
  trackedCities: string[];
  investmentType: string | null;
  minYield: number | null;
  maxPrice: number | null;
  minPrice: number | null;
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

async function fetchPreferences(): Promise<UserPreferences | null> {
  try {
    const response = await fetch("/api/v1/user/preferences");
    const data = await response.json();
    if (!data.success || !data.data) {
      return null;
    }

    const prefs = data.data;
    return {
      primaryCity: prefs.primaryCity,
      trackedRegions: prefs.trackedRegions
        ? JSON.parse(prefs.trackedRegions)
        : [],
      trackedDistricts: prefs.trackedDistricts
        ? JSON.parse(prefs.trackedDistricts)
        : [],
      trackedCities: prefs.trackedCities
        ? JSON.parse(prefs.trackedCities)
        : [],
      investmentType: prefs.investmentType,
      minYield: prefs.minYield,
      maxPrice: prefs.maxPrice,
      minPrice: prefs.minPrice,
      notifyMarketGaps: prefs.notifyMarketGaps ?? true,
      notifyPriceDrops: prefs.notifyPriceDrops ?? true,
      notifyNewProperties: prefs.notifyNewProperties ?? true,
      notifyUrbanDevelopment: prefs.notifyUrbanDevelopment ?? true,
      onboardingCompleted: prefs.onboardingCompleted ?? false,
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
  
  // Priamo vybrané regióny
  prefs.trackedRegions.forEach(regionId => {
    const code = REGION_ID_TO_CODE[regionId];
    if (code) regionCodes.add(code);
  });
  
  // Regióny z vybraných okresov
  prefs.trackedDistricts.forEach(districtId => {
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
