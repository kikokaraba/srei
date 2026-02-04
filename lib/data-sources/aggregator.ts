// Agregátor dát zo všetkých zdrojov

import { fetchNBSPropertyPrices, fetchNBSNationalAverage, getHistoricalPriceData } from "./nbs";
import { fetchEconomicIndicators, fetchDemographicData, fetchHousingConstructionData } from "./statistics-sk";
import { MarketData, REGION_TO_CITIES } from "./types";

/**
 * Agregované trhové dáta pre všetky mestá
 * Vracia prázdne pole ak nie sú dostupné NBS dáta
 */
export async function getAggregatedMarketData(): Promise<MarketData[]> {
  const nbsResult = await fetchNBSPropertyPrices();

  if (!nbsResult.success || !nbsResult.data || nbsResult.data.length === 0) {
    return [];
  }

  const marketData: MarketData[] = [];

  Object.entries(REGION_TO_CITIES).forEach(([region, cities]) => {
    const regionData = nbsResult.data!.filter((d) => d.region === region);

    if (regionData.length === 0) return;

    const apartmentData = regionData.find((d) => d.propertyType === "APARTMENT");
    const houseData = regionData.find((d) => d.propertyType === "HOUSE");

    cities.forEach((city) => {
      const avgPrice =
        apartmentData && houseData
          ? apartmentData.pricePerSqm * 0.7 + houseData.pricePerSqm * 0.3
          : apartmentData?.pricePerSqm || houseData?.pricePerSqm || 0;

      if (avgPrice <= 0) return;

      const medianPrice = avgPrice * 0.93;
      const avgChangeYoY =
        apartmentData && houseData
          ? (apartmentData.changeYoY + houseData.changeYoY) / 2
          : apartmentData?.changeYoY ?? houseData?.changeYoY ?? 0;
      const avgChangeQoQ =
        apartmentData && houseData
          ? (apartmentData.changeQoQ + houseData.changeQoQ) / 2
          : apartmentData?.changeQoQ ?? houseData?.changeQoQ ?? 0;

      marketData.push({
        city,
        avgPricePerSqm: Math.round(avgPrice),
        medianPricePerSqm: Math.round(medianPrice),
        avgRent: 0,
        grossYield: 0,
        priceChangeYoY: Math.round(avgChangeYoY * 10) / 10,
        priceChangeQoQ: Math.round(avgChangeQoQ * 10) / 10,
        listingsCount: 0,
        avgDaysOnMarket: 0,
        demandIndex: 0,
        supplyIndex: 0,
        updatedAt: new Date(),
      });
    });
  });

  return marketData;
}

/**
 * Získa market data pre konkrétne mesto
 */
export async function getMarketDataByCity(city: string): Promise<MarketData | null> {
  const allData = await getAggregatedMarketData();
  return allData.find(d => d.city === city) || null;
}

/**
 * Získa súhrn trhu pre dashboard
 */
export async function getMarketSummary(): Promise<{
  nationalAvgPrice: number;
  nationalPriceChange: number;
  totalListings: number;
  avgYield: number;
  hottest: string | null;
  cheapest: string | null;
  economicIndicators: {
    gdpGrowth: number;
    inflation: number;
    unemployment: number;
    mortgageRate: number;
  };
}> {
  const [marketData, nbsAvg, economicResult] = await Promise.all([
    getAggregatedMarketData(),
    fetchNBSNationalAverage(),
    fetchEconomicIndicators(),
  ]);
  
  // Nájdi najhorúcejšie a najlacnejšie mesto
  const sortedByDemand = [...marketData].sort((a, b) => b.demandIndex - a.demandIndex);
  const sortedByPrice = [...marketData].sort((a, b) => a.avgPricePerSqm - b.avgPricePerSqm);
  
  const totalListings = marketData.reduce((sum, d) => sum + d.listingsCount, 0);
  const avgYieldSafe =
    marketData.length > 0
      ? marketData.reduce((sum, d) => sum + d.grossYield, 0) /
        marketData.length
      : 0;

  const economic = economicResult.data?.[0];
  const nationalAvgPrice = nbsAvg?.all ?? 0;
  const nationalPriceChange = nbsAvg?.changeYoY ?? 0;

  return {
    nationalAvgPrice,
    nationalPriceChange,
    totalListings,
    avgYield: Math.round(avgYieldSafe * 10) / 10,
    hottest: sortedByDemand[0]?.city ?? null,
    cheapest: sortedByPrice[0]?.city ?? null,
    economicIndicators: {
      gdpGrowth: economic?.gdpGrowth ?? 0,
      inflation: economic?.inflation ?? 0,
      unemployment: economic?.unemployment ?? 0,
      mortgageRate: 0,
    },
  };
}

/**
 * Získa historické cenové trendy
 */
export async function getPriceTrends(city?: string): Promise<{
  period: string;
  price: number;
  change: number;
}[]> {
  const historicalData = getHistoricalPriceData();
  
  // Agreguj podľa štvrťrokov
  const quarters = new Map<string, { prices: number[]; changes: number[] }>();
  
  historicalData.forEach(d => {
    const period = `${d.year}-Q${d.quarter}`;
    
    // Filter by city/region if specified
    if (city) {
      const regionForCity = Object.entries(REGION_TO_CITIES).find(([_, cities]) => 
        cities.includes(city)
      )?.[0];
      
      if (regionForCity && d.region !== regionForCity) {
        return;
      }
    }
    
    if (!quarters.has(period)) {
      quarters.set(period, { prices: [], changes: [] });
    }
    
    quarters.get(period)!.prices.push(d.pricePerSqm);
    quarters.get(period)!.changes.push(d.changeYoY);
  });
  
  const trends = Array.from(quarters.entries()).map(([period, data]) => ({
    period,
    price: Math.round(data.prices.reduce((a, b) => a + b, 0) / data.prices.length),
    change: Math.round((data.changes.reduce((a, b) => a + b, 0) / data.changes.length) * 10) / 10,
  }));
  
  return trends.sort((a, b) => a.period.localeCompare(b.period));
}

/**
 * Export všetkých zdrojových funkcií
 */
export {
  fetchNBSPropertyPrices,
  fetchNBSNationalAverage,
  getHistoricalPriceData,
  fetchEconomicIndicators,
  fetchDemographicData,
  fetchHousingConstructionData,
};
