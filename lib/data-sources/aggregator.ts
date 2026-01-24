// Agregátor dát zo všetkých zdrojov

import { fetchNBSPropertyPrices, fetchNBSNationalAverage, getHistoricalPriceData } from "./nbs";
import { fetchEconomicIndicators, fetchDemographicData, fetchHousingConstructionData } from "./statistics-sk";
import { MarketData, REGION_TO_CITIES } from "./types";

/**
 * Agregované trhové dáta pre všetky mestá
 */
export async function getAggregatedMarketData(): Promise<MarketData[]> {
  const nbsResult = await fetchNBSPropertyPrices();
  
  if (!nbsResult.success || !nbsResult.data) {
    throw new Error("Failed to fetch NBS data");
  }
  
  // Mapovanie NBS dát na mestá
  const marketData: MarketData[] = [];
  
  // Priemerné nájomné a yield podľa mesta (odhad)
  const rentEstimates: Record<string, { rent: number; yield: number }> = {
    BRATISLAVA: { rent: 18.5, yield: 5.8 },
    KOSICE: { rent: 11.2, yield: 5.5 },
    ZILINA: { rent: 12.5, yield: 5.6 },
    NITRA: { rent: 10.8, yield: 6.0 },
    PRESOV: { rent: 9.5, yield: 5.5 },
    BANSKA_BYSTRICA: { rent: 9.8, yield: 6.1 },
    TRNAVA: { rent: 12.0, yield: 5.7 },
    TRENCIN: { rent: 10.5, yield: 5.5 },
  };
  
  // Market indicators (simulované)
  const marketIndicators: Record<string, { listings: number; daysOnMarket: number; demandIndex: number; supplyIndex: number }> = {
    BRATISLAVA: { listings: 4250, daysOnMarket: 35, demandIndex: 78, supplyIndex: 45 },
    KOSICE: { listings: 1850, daysOnMarket: 48, demandIndex: 65, supplyIndex: 55 },
    ZILINA: { listings: 980, daysOnMarket: 42, demandIndex: 72, supplyIndex: 48 },
    NITRA: { listings: 720, daysOnMarket: 55, demandIndex: 58, supplyIndex: 62 },
    PRESOV: { listings: 650, daysOnMarket: 52, demandIndex: 55, supplyIndex: 58 },
    BANSKA_BYSTRICA: { listings: 580, daysOnMarket: 58, demandIndex: 52, supplyIndex: 65 },
    TRNAVA: { listings: 620, daysOnMarket: 45, demandIndex: 68, supplyIndex: 52 },
    TRENCIN: { listings: 480, daysOnMarket: 50, demandIndex: 55, supplyIndex: 60 },
  };
  
  // Pre každý región vytvoríme market data
  Object.entries(REGION_TO_CITIES).forEach(([region, cities]) => {
    const regionData = nbsResult.data!.filter(d => d.region === region);
    
    if (regionData.length === 0) return;
    
    const apartmentData = regionData.find(d => d.propertyType === "APARTMENT");
    const houseData = regionData.find(d => d.propertyType === "HOUSE");
    
    cities.forEach(city => {
      const rentInfo = rentEstimates[city] || { rent: 10, yield: 5.5 };
      const indicators = marketIndicators[city] || { listings: 500, daysOnMarket: 50, demandIndex: 50, supplyIndex: 50 };
      
      // Priemerná cena ako kombinacia bytov a domov (70% byty, 30% domy)
      const avgPrice = apartmentData && houseData
        ? apartmentData.pricePerSqm * 0.7 + houseData.pricePerSqm * 0.3
        : apartmentData?.pricePerSqm || houseData?.pricePerSqm || 2000;
      
      // Median je typicky o 5-10% nižší ako priemer
      const medianPrice = avgPrice * 0.93;
      
      const avgChangeYoY = apartmentData && houseData
        ? (apartmentData.changeYoY + houseData.changeYoY) / 2
        : apartmentData?.changeYoY || houseData?.changeYoY || 5;
      
      const avgChangeQoQ = apartmentData && houseData
        ? (apartmentData.changeQoQ + houseData.changeQoQ) / 2
        : apartmentData?.changeQoQ || houseData?.changeQoQ || 1.5;
      
      marketData.push({
        city,
        avgPricePerSqm: Math.round(avgPrice),
        medianPricePerSqm: Math.round(medianPrice),
        avgRent: rentInfo.rent,
        grossYield: rentInfo.yield,
        priceChangeYoY: Math.round(avgChangeYoY * 10) / 10,
        priceChangeQoQ: Math.round(avgChangeQoQ * 10) / 10,
        listingsCount: indicators.listings,
        avgDaysOnMarket: indicators.daysOnMarket,
        demandIndex: indicators.demandIndex,
        supplyIndex: indicators.supplyIndex,
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
  hottest: string;
  cheapest: string;
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
  const avgYield = marketData.reduce((sum, d) => sum + d.grossYield, 0) / marketData.length;
  
  const economic = economicResult.data?.[0];
  
  return {
    nationalAvgPrice: nbsAvg.all,
    nationalPriceChange: nbsAvg.changeYoY,
    totalListings,
    avgYield: Math.round(avgYield * 10) / 10,
    hottest: sortedByDemand[0]?.city || "BRATISLAVA",
    cheapest: sortedByPrice[0]?.city || "BANSKA_BYSTRICA",
    economicIndicators: {
      gdpGrowth: economic?.gdpGrowth || 2.1,
      inflation: economic?.inflation || 3.8,
      unemployment: economic?.unemployment || 5.2,
      mortgageRate: 4.2, // Aktuálna priemerná hypotekárna sadzba
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
