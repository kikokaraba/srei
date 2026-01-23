import { useQuery } from "@tanstack/react-query";

interface UserPreferences {
  primaryCity: string | null;
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

export function useUserPreferences() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["user-preferences"],
    queryFn: fetchPreferences,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    preferences: data,
    isLoading,
    error,
    hasPreferences: !!data,
  };
}
