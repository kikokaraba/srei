// Data Scheduler - Pravidelný zber dát
// Na Vercel použijeme Cron Jobs (vercel.json)

import { prisma } from "@/lib/prisma";
import { fetchNBSPropertyPrices } from "./nbs";
import { fetchEconomicIndicators, fetchDemographicData } from "./statistics-sk";
import { getAggregatedMarketData } from "./aggregator";

// Mapovanie regiónov na enum hodnoty
const REGION_ENUM_MAP: Record<string, "BRATISLAVSKY" | "TRNAVSKY" | "TRENCIANSKY" | "NITRIANSKY" | "ZILINSKY" | "BANSKOBYSTRICKY" | "PRESOVSKY" | "KOSICKY"> = {
  "Bratislavský kraj": "BRATISLAVSKY",
  "Trnavský kraj": "TRNAVSKY",
  "Trenčiansky kraj": "TRENCIANSKY",
  "Nitriansky kraj": "NITRIANSKY",
  "Žilinský kraj": "ZILINSKY",
  "Banskobystrický kraj": "BANSKOBYSTRICKY",
  "Prešovský kraj": "PRESOVSKY",
  "Košický kraj": "KOSICKY",
};

/**
 * Synchronizuje NBS dáta do databázy
 * Spúšťať: štvrťročne (po publikácii NBS dát)
 */
export async function syncNBSData(): Promise<{ success: boolean; recordsCount: number; error?: string }> {
  const startTime = Date.now();
  
  try {
    const result = await fetchNBSPropertyPrices();
    
    if (!result.success || !result.data) {
      throw new Error(result.error || "Failed to fetch NBS data");
    }
    
    let recordsCount = 0;
    
    for (const item of result.data) {
      const regionEnum = REGION_ENUM_MAP[item.region];
      if (!regionEnum) continue;
      
      await prisma.nBSPropertyPrice.upsert({
        where: {
          year_quarter_region_propertyType: {
            year: item.year,
            quarter: item.quarter,
            region: regionEnum,
            propertyType: item.propertyType,
          },
        },
        update: {
          pricePerSqm: item.pricePerSqm,
          priceIndex: item.priceIndex,
          changeYoY: item.changeYoY,
          changeQoQ: item.changeQoQ,
          fetchedAt: new Date(),
        },
        create: {
          year: item.year,
          quarter: item.quarter,
          region: regionEnum,
          propertyType: item.propertyType,
          pricePerSqm: item.pricePerSqm,
          priceIndex: item.priceIndex,
          changeYoY: item.changeYoY,
          changeQoQ: item.changeQoQ,
        },
      });
      
      recordsCount++;
    }
    
    // Log úspešný fetch
    await prisma.dataFetchLog.create({
      data: {
        source: "NBS",
        status: "success",
        recordsCount,
        duration_ms: Date.now() - startTime,
      },
    });
    
    return { success: true, recordsCount };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    // Log chybu
    await prisma.dataFetchLog.create({
      data: {
        source: "NBS",
        status: "error",
        error: errorMessage,
        duration_ms: Date.now() - startTime,
      },
    });
    
    return { success: false, recordsCount: 0, error: errorMessage };
  }
}

/**
 * Synchronizuje ekonomické ukazovatele
 * Spúšťať: mesačne
 */
export async function syncEconomicIndicators(): Promise<{ success: boolean; error?: string }> {
  const startTime = Date.now();
  
  try {
    const result = await fetchEconomicIndicators();
    
    if (!result.success || !result.data || result.data.length === 0) {
      throw new Error(result.error || "No economic data received");
    }
    
    const data = result.data[0];
    
    await prisma.economicIndicator.create({
      data: {
        date: new Date(),
        gdpGrowth: data.gdpGrowth,
        inflation: data.inflation,
        unemployment: data.unemployment,
        avgWage: data.avgWage,
        wageGrowth: data.wageGrowth,
        constructionIndex: data.constructionIndex,
        consumerConfidence: data.consumerConfidence,
        mortgageRate: 4.2, // TODO: fetch from NBS
      },
    });
    
    await prisma.dataFetchLog.create({
      data: {
        source: "SUSR_ECONOMIC",
        status: "success",
        recordsCount: 1,
        duration_ms: Date.now() - startTime,
      },
    });
    
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    await prisma.dataFetchLog.create({
      data: {
        source: "SUSR_ECONOMIC",
        status: "error",
        error: errorMessage,
        duration_ms: Date.now() - startTime,
      },
    });
    
    return { success: false, error: errorMessage };
  }
}

/**
 * Synchronizuje trhové dáta pre mestá
 * Spúšťať: denne
 */
export async function syncCityMarketData(): Promise<{ success: boolean; recordsCount: number; error?: string }> {
  const startTime = Date.now();
  
  try {
    const marketData = await getAggregatedMarketData();
    let recordsCount = 0;
    
    for (const data of marketData) {
      await prisma.cityMarketData.create({
        data: {
          city: data.city as "BRATISLAVA" | "KOSICE" | "PRESOV" | "ZILINA" | "BANSKA_BYSTRICA" | "TRNAVA" | "TRENCIN" | "NITRA",
          date: new Date(),
          avgPricePerSqm: data.avgPricePerSqm,
          medianPricePerSqm: data.medianPricePerSqm,
          priceChangeYoY: data.priceChangeYoY,
          priceChangeQoQ: data.priceChangeQoQ,
          avgRentPerSqm: data.avgRent,
          grossYield: data.grossYield,
          listingsCount: data.listingsCount,
          avgDaysOnMarket: data.avgDaysOnMarket,
          demandIndex: data.demandIndex,
          supplyIndex: data.supplyIndex,
        },
      });
      
      recordsCount++;
    }
    
    await prisma.dataFetchLog.create({
      data: {
        source: "MARKET_DATA",
        status: "success",
        recordsCount,
        duration_ms: Date.now() - startTime,
      },
    });
    
    return { success: true, recordsCount };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    await prisma.dataFetchLog.create({
      data: {
        source: "MARKET_DATA",
        status: "error",
        error: errorMessage,
        duration_ms: Date.now() - startTime,
      },
    });
    
    return { success: false, recordsCount: 0, error: errorMessage };
  }
}

/**
 * Synchronizuje demografické dáta
 * Spúšťať: ročne
 */
export async function syncDemographicData(): Promise<{ success: boolean; recordsCount: number; error?: string }> {
  const startTime = Date.now();
  const currentYear = new Date().getFullYear();
  
  try {
    const cities = ["BRATISLAVA", "KOSICE", "ZILINA", "NITRA", "PRESOV", "BANSKA_BYSTRICA", "TRNAVA", "TRENCIN"] as const;
    let recordsCount = 0;
    
    for (const city of cities) {
      const demographics = await fetchDemographicData(city);
      
      const population = demographics.find(d => d.code === "population")?.value || 0;
      const popChange = demographics.find(d => d.code === "pop_change")?.value || 0;
      const avgAge = demographics.find(d => d.code === "avg_age")?.value || 40;
      
      await prisma.cityDemographics.upsert({
        where: {
          city_year: {
            city,
            year: currentYear,
          },
        },
        update: {
          population: Math.round(population),
          populationChange: popChange,
          avgAge,
          fetchedAt: new Date(),
        },
        create: {
          city,
          year: currentYear,
          population: Math.round(population),
          populationChange: popChange,
          avgAge,
        },
      });
      
      recordsCount++;
    }
    
    await prisma.dataFetchLog.create({
      data: {
        source: "DEMOGRAPHICS",
        status: "success",
        recordsCount,
        duration_ms: Date.now() - startTime,
      },
    });
    
    return { success: true, recordsCount };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    await prisma.dataFetchLog.create({
      data: {
        source: "DEMOGRAPHICS",
        status: "error",
        error: errorMessage,
        duration_ms: Date.now() - startTime,
      },
    });
    
    return { success: false, recordsCount: 0, error: errorMessage };
  }
}

/**
 * Spustí všetky synchronizácie
 */
export async function runAllSync(): Promise<{
  nbs: { success: boolean; recordsCount: number };
  economic: { success: boolean };
  market: { success: boolean; recordsCount: number };
  demographics: { success: boolean; recordsCount: number };
}> {
  const [nbs, economic, market, demographics] = await Promise.all([
    syncNBSData(),
    syncEconomicIndicators(),
    syncCityMarketData(),
    syncDemographicData(),
  ]);
  
  return { nbs, economic, market, demographics };
}
