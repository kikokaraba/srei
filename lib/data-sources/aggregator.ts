// Agregátor dát zo všetkých zdrojov

import { prisma } from "@/lib/prisma";
import { fetchNBSPropertyPrices, fetchNBSNationalAverage, getHistoricalPriceData } from "./nbs";
import { fetchEconomicIndicators, fetchDemographicData, fetchHousingConstructionData } from "./statistics-sk";
import { MarketData, REGION_TO_CITIES } from "./types";

const AGGREGATOR_CITIES = Object.values(REGION_TO_CITIES).flat();
const UNIQUE_CITIES = [...new Set(AGGREGATOR_CITIES)];

/**
 * Agregované trhové dáta z DB (scrapované inzeráty) keď NBS dáta chýbajú
 */
async function getAggregatedMarketDataFromDB(): Promise<MarketData[]> {
  const marketData: MarketData[] = [];
  const now = new Date();
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  for (const city of UNIQUE_CITIES) {
    const cityMatch = { city: { equals: city, mode: "insensitive" as const } };
    const [saleAgg, rentAgg, countSale, countRent] = await Promise.all([
      prisma.property.aggregate({
        where: { ...cityMatch, listing_type: "PREDAJ", price_per_m2: { gt: 0 } },
        _avg: { price_per_m2: true, price: true },
        _count: { id: true },
      }),
      prisma.property.aggregate({
        where: { ...cityMatch, listing_type: "PRENAJOM", price_per_m2: { gt: 0 } },
        _avg: { price_per_m2: true, price: true },
        _count: { id: true },
      }),
      prisma.property.count({ where: { ...cityMatch, listing_type: "PREDAJ" } }),
      prisma.property.count({ where: { ...cityMatch, listing_type: "PRENAJOM" } }),
    ]);

    const avgPricePerSqm = saleAgg._avg.price_per_m2 ?? 0;
    if (avgPricePerSqm <= 0) continue;

    const avgRentPerSqm = rentAgg._avg.price_per_m2 ?? 0;
    const grossYield =
      avgPricePerSqm > 0 && avgRentPerSqm > 0
        ? Math.round((avgRentPerSqm * 12 / avgPricePerSqm) * 1000) / 10
        : 0;

    const prevMonthAgg = await prisma.property.aggregate({
      where: {
        ...cityMatch,
        listing_type: "PREDAJ",
        price_per_m2: { gt: 0 },
        createdAt: { lte: oneMonthAgo },
      },
      _avg: { price_per_m2: true },
    });
    const prevAvg = prevMonthAgg._avg.price_per_m2;
    const priceChangeYoY = prevAvg && prevAvg > 0
      ? Math.round(((avgPricePerSqm - prevAvg) / prevAvg) * 1000) / 10
      : 0;
    const priceChangeQoQ = priceChangeYoY;

    const demandIndex = countSale + countRent > 0
      ? Math.min(100, Math.round((countSale / Math.max(1, countRent)) * 25))
      : 0;
    const supplyIndex = Math.min(100, Math.round((saleAgg._count.id / 50) * 100));

    marketData.push({
      city,
      avgPricePerSqm: Math.round(avgPricePerSqm),
      medianPricePerSqm: Math.round(avgPricePerSqm * 0.93),
      avgRent: Math.round(avgRentPerSqm) || 0,
      grossYield,
      priceChangeYoY,
      priceChangeQoQ,
      listingsCount: saleAgg._count.id,
      avgDaysOnMarket: 0,
      demandIndex,
      supplyIndex,
      updatedAt: now,
    });
  }

  return marketData;
}

/**
 * Agregované trhové dáta pre všetky mestá
 * Používa NBS ak sú dáta, inak živé dáta z DB (scrapované inzeráty)
 */
export async function getAggregatedMarketData(): Promise<MarketData[]> {
  const nbsResult = await fetchNBSPropertyPrices();

  if (nbsResult.success && nbsResult.data && nbsResult.data.length > 0) {
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

  return getAggregatedMarketDataFromDB();
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
  const [marketData, nbsAvg, economicResult, latestMortgage] = await Promise.all([
    getAggregatedMarketData(),
    fetchNBSNationalAverage(),
    fetchEconomicIndicators(),
    prisma.mortgageRate.findFirst({ orderBy: { date: "desc" }, select: { ratePct: true } }),
  ]);

  const sortedByDemand = [...marketData].sort((a, b) => b.demandIndex - a.demandIndex);
  const sortedByPrice = [...marketData].sort((a, b) => a.avgPricePerSqm - b.avgPricePerSqm);
  const totalListings = marketData.reduce((sum, d) => sum + d.listingsCount, 0);
  const avgYieldSafe =
    marketData.length > 0
      ? marketData.reduce((sum, d) => sum + d.grossYield, 0) / marketData.length
      : 0;

  const economic = economicResult.data?.[0];
  const nationalAvgPrice = nbsAvg?.all ?? (marketData.length > 0
    ? Math.round(
        marketData.reduce((s, d) => s + d.avgPricePerSqm, 0) / marketData.length
      )
    : 0);
  const nationalPriceChange = nbsAvg?.changeYoY ?? (marketData.length > 0
    ? marketData.reduce((s, d) => s + d.priceChangeYoY, 0) / marketData.length
    : 0);

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
      mortgageRate: latestMortgage?.ratePct ?? 0,
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
