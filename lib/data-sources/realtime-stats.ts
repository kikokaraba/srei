/**
 * Real-time Market Statistics
 * 
 * Vypočítané z aktuálnych scrapovaných dát
 * Nahradzuje zastaralé NBS/ŠÚ štatistiky
 */

import { prisma } from "@/lib/prisma";

// Mapovanie miest na kraje
const CITY_TO_REGION: Record<string, string> = {
  BRATISLAVA: "Bratislavský kraj",
  KOSICE: "Košický kraj",
  PRESOV: "Prešovský kraj",
  ZILINA: "Žilinský kraj",
  BANSKA_BYSTRICA: "Banskobystrický kraj",
  TRNAVA: "Trnavský kraj",
  TRENCIN: "Trenčiansky kraj",
  NITRA: "Nitriansky kraj",
};

const ALL_CITIES: string[] = [
  "BRATISLAVA", "KOSICE", "PRESOV", "ZILINA",
  "BANSKA_BYSTRICA", "TRNAVA", "TRENCIN", "NITRA"
];

export interface RealtimeRegionStats {
  region: string;
  city: string;
  avgPricePerM2: number;
  medianPricePerM2: number;
  avgPrice: number;
  propertyCount: number;
  changeVsLastMonth: number | null;
  changeVsLastWeek: number | null;
  dataFreshness: string; // "live", "24h", "7d"
  lastUpdated: Date;
}

export interface RealtimeMarketOverview {
  nationalAvg: number;
  nationalMedian: number;
  totalProperties: number;
  newLast24h: number;
  newLast7d: number;
  priceChangeLast30d: number | null;
  regions: RealtimeRegionStats[];
  generatedAt: Date;
  dataSource: string;
}

/**
 * Získa real-time štatistiky z aktuálnych scrapovaných dát
 */
export async function getRealtimeMarketStats(): Promise<RealtimeMarketOverview> {
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Celkové štatistiky
  const [totalCount, newLast24h, newLast7d] = await Promise.all([
    prisma.property.count({ where: { listing_type: "PREDAJ" } }),
    prisma.property.count({ 
      where: { listing_type: "PREDAJ", createdAt: { gte: oneDayAgo } } 
    }),
    prisma.property.count({ 
      where: { listing_type: "PREDAJ", createdAt: { gte: oneWeekAgo } } 
    }),
  ]);

  // Národný priemer (bez cena dohodou – is_negotiable / price 0)
  const nationalStats = await prisma.property.aggregate({
    where: { 
      listing_type: "PREDAJ",
      price_per_m2: { gt: 0 },
      is_negotiable: false,
    },
    _avg: { price_per_m2: true, price: true },
    _count: { id: true },
  });

  // Regionálne štatistiky
  const regionStats: RealtimeRegionStats[] = [];

  for (const city of ALL_CITIES) {
    const cityMatch = { city: { equals: city, mode: "insensitive" as const } };
    const [currentStats, lastMonthStats, lastWeekStats] = await Promise.all([
      prisma.property.aggregate({
        where: {
          ...cityMatch,
          listing_type: "PREDAJ",
          price_per_m2: { gt: 0 },
          is_negotiable: false,
        },
        _avg: { price_per_m2: true, price: true },
        _count: { id: true },
      }),
      prisma.property.aggregate({
        where: {
          ...cityMatch,
          listing_type: "PREDAJ",
          price_per_m2: { gt: 0 },
          is_negotiable: false,
          createdAt: { lte: oneMonthAgo },
        },
        _avg: { price_per_m2: true },
      }),
      prisma.property.aggregate({
        where: {
          ...cityMatch,
          listing_type: "PREDAJ",
          price_per_m2: { gt: 0 },
          is_negotiable: false,
          createdAt: { lte: oneWeekAgo },
        },
        _avg: { price_per_m2: true },
      }),
    ]);

    const avgPricePerM2 = currentStats._avg.price_per_m2 || 0;
    const lastMonthAvg = lastMonthStats._avg.price_per_m2;
    const lastWeekAvg = lastWeekStats._avg.price_per_m2;

    // Vypočítaj zmeny
    const changeVsLastMonth = lastMonthAvg && avgPricePerM2
      ? Math.round(((avgPricePerM2 - lastMonthAvg) / lastMonthAvg) * 1000) / 10
      : null;
    
    const changeVsLastWeek = lastWeekAvg && avgPricePerM2
      ? Math.round(((avgPricePerM2 - lastWeekAvg) / lastWeekAvg) * 1000) / 10
      : null;

    // Median (aproximácia - skutočný median by bol drahší na výpočet)
    const medianEstimate = avgPricePerM2 * 0.95; // Median je typicky o 5% nižší

    regionStats.push({
      region: CITY_TO_REGION[city] || city,
      city,
      avgPricePerM2: Math.round(avgPricePerM2),
      medianPricePerM2: Math.round(medianEstimate),
      avgPrice: Math.round(currentStats._avg.price || 0),
      propertyCount: currentStats._count.id,
      changeVsLastMonth,
      changeVsLastWeek,
      dataFreshness: "live",
      lastUpdated: now,
    });
  }

  // Zoraď podľa ceny (najdrahšie prvé)
  regionStats.sort((a, b) => b.avgPricePerM2 - a.avgPricePerM2);

  // Celková zmena za 30 dní
  const oldestMonthStats = await prisma.property.aggregate({
    where: { 
      listing_type: "PREDAJ",
      price_per_m2: { gt: 0 },
      is_negotiable: false,
      createdAt: { lte: oneMonthAgo },
    },
    _avg: { price_per_m2: true },
  });

  const nationalAvg = nationalStats._avg.price_per_m2 || 0;
  const priceChangeLast30d = oldestMonthStats._avg.price_per_m2 && nationalAvg
    ? Math.round(((nationalAvg - oldestMonthStats._avg.price_per_m2) / oldestMonthStats._avg.price_per_m2) * 1000) / 10
    : null;

  return {
    nationalAvg: Math.round(nationalAvg),
    nationalMedian: Math.round(nationalAvg * 0.95),
    totalProperties: totalCount,
    newLast24h,
    newLast7d,
    priceChangeLast30d,
    regions: regionStats,
    generatedAt: now,
    dataSource: "SRIA Real-time Data (scraped)",
  };
}

/**
 * Získa real-time štatistiky pre konkrétne mesto
 */
export async function getRealtimeCityStats(city: string): Promise<RealtimeRegionStats | null> {
  const stats = await getRealtimeMarketStats();
  return stats.regions.find(r => r.city === city) || null;
}

/**
 * Súhrn trhu výhradne z živých dát (DB) – pre widget Ekonomika.
 * Žiadne NBS/ŠÚ odhady, len scrapované inzeráty + InvestmentMetrics.
 */
export async function getMarketSummaryLive(): Promise<{
  nationalAvgPrice: number;
  nationalPriceChange: number | null;
  totalListings: number;
  avgYield: number | null;
  hottest: string;
  cheapest: string;
  dataSource: string;
  generatedAt: Date;
}> {
  const stats = await getRealtimeMarketStats();
  const regions = stats.regions;

  // Try to get yield data, fallback to null if InvestmentMetrics table doesn't exist
  let avgYield: number | null = null;
  try {
    const yieldAgg = await prisma.investmentMetrics.aggregate({
      _avg: { gross_yield: true },
      _count: { id: true },
      where: { gross_yield: { gt: 0 } },
    });
    avgYield =
      (yieldAgg._count.id > 0 && yieldAgg._avg.gross_yield != null)
        ? Math.round(yieldAgg._avg.gross_yield * 10) / 10
        : null;
  } catch (error) {
    console.log("InvestmentMetrics table not available, using fallback yield");
    avgYield = null; // Fallback when table doesn't exist
  }

  const withChange = regions.filter((r) => r.changeVsLastMonth != null);
  const hottest =
    withChange.length > 0
      ? withChange.reduce((a, b) =>
          (a.changeVsLastMonth ?? 0) >= (b.changeVsLastMonth ?? 0) ? a : b
        ).city
      : regions.reduce((a, b) =>
          a.propertyCount >= b.propertyCount ? a : b
        ).city;
  const cheapest =
    regions.length > 0
      ? regions.reduce((a, b) =>
          a.avgPricePerM2 <= b.avgPricePerM2 ? a : b
        ).city
      : "BRATISLAVA";

  return {
    nationalAvgPrice: stats.nationalAvg,
    nationalPriceChange: stats.priceChangeLast30d,
    totalListings: stats.totalProperties,
    avgYield,
    hottest,
    cheapest,
    dataSource: stats.dataSource,
    generatedAt: stats.generatedAt,
  };
}

/** Region code (BA, KE, …) pre analytické karty */
const CITY_TO_REGION_CODE: Record<string, string> = {
  BRATISLAVA: "BA",
  KOSICE: "KE",
  ZILINA: "ZA",
  NITRA: "NR",
  PRESOV: "PO",
  BANSKA_BYSTRICA: "BB",
  TRNAVA: "TT",
  TRENCIN: "TN",
};

const REGION_NAMES: Record<string, string> = {
  BA: "Bratislavský",
  KE: "Košický",
  ZA: "Žilinský",
  NR: "Nitriansky",
  PO: "Prešovský",
  BB: "Banskobystrický",
  TT: "Trnavský",
  TN: "Trenčiansky",
};

export interface AnalyticsSnapshotLiveItem {
  region: string;
  regionName: string;
  avg_price_m2: number;
  avg_rent_m2: number;
  yield_benchmark: number;
  volatility_index: number;
  properties_count: number;
  trend: "rising" | "falling" | "stable";
  last_updated: string;
  change_vs_last_week: number | null;
}

/**
 * Snapshot pre Analytické karty – výhradne z živých dát (realtime + InvestmentMetrics).
 */
export async function getAnalyticsSnapshotLive(): Promise<{
  data: AnalyticsSnapshotLiveItem[];
  newLast7d: number;
  timestamp: string;
}> {
  const stats = await getRealtimeMarketStats();
  
  // Try to get investment metrics, fallback to empty array if table doesn't exist
  let metricsRows: Array<{ gross_yield: number; property: { city: string } | null }> = [];
  try {
    metricsRows = await prisma.investmentMetrics.findMany({
      where: { gross_yield: { gt: 0 } },
      select: { gross_yield: true, property: { select: { city: true } } },
    });
  } catch (error) {
    console.log("InvestmentMetrics table not available for analytics snapshot");
    metricsRows = []; // Fallback when table doesn't exist
  }

  const yieldByCity = new Map<string, { sum: number; count: number }>();
  for (const m of metricsRows) {
    const c = (m.property?.city ?? "").toUpperCase();
    if (!c) continue;
    const cur = yieldByCity.get(c) ?? { sum: 0, count: 0 };
    cur.sum += m.gross_yield;
    cur.count++;
    yieldByCity.set(c, cur);
  }

  const data: AnalyticsSnapshotLiveItem[] = stats.regions.map((r) => {
    const code = CITY_TO_REGION_CODE[r.city] ?? r.city.slice(0, 2);
    const y = yieldByCity.get(r.city);
    const yieldBench = y && y.count > 0 ? Math.round((y.sum / y.count) * 10) / 10 : 0;
    let trend: "rising" | "falling" | "stable" = "stable";
    if (r.changeVsLastMonth != null) {
      if (r.changeVsLastMonth > 0.5) trend = "rising";
      else if (r.changeVsLastMonth < -0.5) trend = "falling";
    }
    const vol = r.changeVsLastMonth != null
      ? Math.min(1, Math.round(Math.abs(r.changeVsLastMonth) / 10 * 100) / 100)
      : 0;

    return {
      region: code,
      regionName: REGION_NAMES[code] ?? code,
      avg_price_m2: r.avgPricePerM2,
      avg_rent_m2: 0,
      yield_benchmark: yieldBench,
      volatility_index: vol,
      properties_count: r.propertyCount,
      trend,
      last_updated: r.lastUpdated.toISOString(),
      change_vs_last_week: r.changeVsLastWeek,
    };
  });

  return {
    data,
    newLast7d: stats.newLast7d,
    timestamp: stats.generatedAt.toISOString(),
  };
}

/**
 * Porovnanie: Naše dáta vs NBS (pre transparentnosť)
 */
export async function getDataComparison(): Promise<{
  ourData: { avg: number; source: string; freshness: string };
  nbsData: { avg: number; source: string; period: string };
  difference: number;
  differencePercent: number;
}> {
  const ourStats = await getRealtimeMarketStats();
  
  // NBS Q3 2025 dáta (hardcoded - aktuálne najnovšie dostupné)
  const nbsAvg = 2500; // Priemer zo všetkých regiónov
  
  const difference = ourStats.nationalAvg - nbsAvg;
  const differencePercent = Math.round((difference / nbsAvg) * 1000) / 10;

  return {
    ourData: {
      avg: ourStats.nationalAvg,
      source: "SRIA scraped data",
      freshness: "Real-time",
    },
    nbsData: {
      avg: nbsAvg,
      source: "NBS",
      period: "Q3 2025",
    },
    difference,
    differencePercent,
  };
}
