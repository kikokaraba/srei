// Market Logic - Detekcia Market Gaps a Liquidity analýza

import { prisma } from "@/lib/prisma";
import type { MarketGapResult, LiquidityMetrics, ParsedListingData } from "@/lib/scraper/types";

/**
 * Konfigurácia pre Market Gap detekciu
 */
const MARKET_GAP_CONFIG = {
  // Minimálny percentuálny rozdiel pre označenie ako "gap"
  minGapPercentage: 15,
  
  // Váhy pre výpočet confidence
  weights: {
    streetMatch: 0.4,      // Ak máme dáta z rovnakej ulice
    districtMatch: 0.3,    // Ak máme dáta z okresu
    conditionMatch: 0.2,   // Ak sedí stav nehnuteľnosti
    recentData: 0.1,       // Ak sú dáta čerstvé
  },
  
  // Minimálny počet porovnateľných nehnuteľností pre vysokú confidence
  minComparables: {
    HIGH: 10,
    MEDIUM: 5,
    LOW: 1,
  },
};

/**
 * Získa priemerné ceny pre lokalitu
 */
async function getLocationPrices(
  city: string,
  district: string,
  street?: string
): Promise<{
  streetAvg: number | null;
  streetMedian: number | null;
  streetCount: number;
  districtAvg: number | null;
  districtMedian: number | null;
  districtCount: number;
}> {
  // Najprv skús StreetAnalytics pre presnú ulicu
  let streetData = null;
  if (street) {
    streetData = await prisma.streetAnalytics.findFirst({
      where: {
        city,
        district,
        street: { contains: street, mode: "insensitive" },
      },
      orderBy: { last_updated: "desc" },
    });
  }
  
  // Potom MarketAnalytics pre okres/mesto
  const marketData = await prisma.marketAnalytics.findFirst({
    where: { city },
    orderBy: { timestamp: "desc" },
  });
  
  // Ak nemáme StreetAnalytics, vypočítaj z Property tabuľky
  let districtStats = null;
  if (!marketData) {
    districtStats = await prisma.property.aggregate({
      where: {
        city,
        district: { contains: district, mode: "insensitive" },
      },
      _avg: { price_per_m2: true },
      _count: { id: true },
    });
  }
  
  return {
    streetAvg: streetData?.avg_price_m2 || null,
    streetMedian: streetData?.median_price_m2 || null,
    streetCount: streetData?.property_count || 0,
    districtAvg: marketData?.avg_price_m2 || districtStats?._avg.price_per_m2 || null,
    districtMedian: null,
    districtCount: districtStats?._count.id || 0,
  };
}

/**
 * Detekuje Market Gap pre jednu nehnuteľnosť
 */
export async function detectMarketGap(
  listing: ParsedListingData
): Promise<MarketGapResult | null> {
  const prices = await getLocationPrices(listing.city, listing.district, listing.street);
  
  // Priorita: ulica > okres
  const referencePrice = prices.streetAvg || prices.districtAvg;
  
  if (!referencePrice) {
    // Nemáme referenčné dáta
    return null;
  }
  
  // Vypočítaj gap
  const gapPercentage = ((referencePrice - listing.pricePerM2) / referencePrice) * 100;
  
  // Je to gap?
  if (gapPercentage < MARKET_GAP_CONFIG.minGapPercentage) {
    return null;
  }
  
  // Urč confidence
  let confidence: "HIGH" | "MEDIUM" | "LOW" = "LOW";
  const comparableCount = prices.streetCount || prices.districtCount;
  
  if (prices.streetAvg && comparableCount >= MARKET_GAP_CONFIG.minComparables.HIGH) {
    confidence = "HIGH";
  } else if (comparableCount >= MARKET_GAP_CONFIG.minComparables.MEDIUM) {
    confidence = "MEDIUM";
  }
  
  // Vypočítaj potenciálny profit (pri predaji za referenčnú cenu)
  const potentialProfit = (referencePrice - listing.pricePerM2) * listing.areaM2;
  
  // Dôvody pre gap
  const reasons: string[] = [];
  
  if (gapPercentage >= 25) {
    reasons.push("Výrazne pod trhovou cenou (>25%)");
  } else if (gapPercentage >= 20) {
    reasons.push("Významne pod trhovou cenou (>20%)");
  } else {
    reasons.push("Pod trhovou cenou (>15%)");
  }
  
  if (listing.condition === "POVODNY") {
    reasons.push("Pôvodný stav - potenciál pre rekonštrukciu");
  }
  
  if (prices.streetAvg) {
    reasons.push(`Porovnané s ${prices.streetCount} nehnuteľnosťami v ulici`);
  } else {
    reasons.push(`Porovnané s trhovým priemerom okresu`);
  }
  
  return {
    propertyId: listing.externalId,
    gapPercentage: Math.round(gapPercentage * 10) / 10,
    streetAvgPrice: prices.streetAvg || 0,
    districtAvgPrice: prices.districtAvg || 0,
    potentialProfit: Math.round(potentialProfit),
    confidence,
    reasons,
  };
}

/**
 * Uloží Market Gap do databázy
 */
export async function saveMarketGap(
  propertyId: string,
  gap: MarketGapResult
): Promise<void> {
  await prisma.marketGap.upsert({
    where: { propertyId },
    update: {
      gap_percentage: gap.gapPercentage,
      potential_profit: gap.potentialProfit,
      street_avg_price: gap.streetAvgPrice || gap.districtAvgPrice,
      detected_at: new Date(),
    },
    create: {
      propertyId,
      gap_percentage: gap.gapPercentage,
      potential_profit: gap.potentialProfit,
      street_avg_price: gap.streetAvgPrice || gap.districtAvgPrice,
    },
  });
}

/**
 * Aktualizuje Liquidity metriky - sleduje ako dlho sú nehnuteľnosti na trhu
 */
export async function updateLiquidity(
  externalId: string,
  sourceUrl: string,
  isStillActive: boolean
): Promise<{ isNew: boolean; daysOnMarket?: number }> {
  // Nájdi existujúci property podľa source_url
  const existing = await prisma.property.findFirst({
    where: {
      OR: [
        { source_url: sourceUrl },
        { slug: { contains: externalId } },
      ],
    },
  });
  
  if (!existing) {
    // Nový inzerát
    return { isNew: true };
  }
  
  if (isStillActive) {
    // Inzerát stále existuje - aktualizuj updatedAt
    await prisma.property.update({
      where: { id: existing.id },
      data: { updatedAt: new Date() },
    });
    return { isNew: false };
  } else {
    // Inzerát zmizol - vypočítaj days_on_market
    const firstListed = existing.first_listed_at || existing.createdAt;
    const daysOnMarket = Math.floor(
      (Date.now() - firstListed.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    // Ulož do histórie
    await prisma.property.update({
      where: { id: existing.id },
      data: {
        days_on_market: daysOnMarket,
        // Môžeme pridať sold_at alebo removed_at pole
      },
    });
    
    return { isNew: false, daysOnMarket };
  }
}

/**
 * Vypočíta Liquidity metriky pre lokalitu
 */
export async function calculateLiquidityMetrics(
  city: string,
  district?: string
): Promise<LiquidityMetrics> {
  const where = district
    ? { city, district: { contains: district, mode: "insensitive" as const } }
    : { city };
  
  // Priemerný a mediánový čas na trhu
  const daysStats = await prisma.property.aggregate({
    where: {
      ...where,
      days_on_market: { gt: 0 },
    },
    _avg: { days_on_market: true },
    _count: { id: true },
  });
  
  // Aktívne inzeráty (aktualizované za posledných 7 dní)
  const activeListings = await prisma.property.count({
    where: {
      ...where,
      updatedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
    },
  });
  
  // Predané/zmiznuté za posledný mesiac
  const soldLastMonth = await prisma.property.count({
    where: {
      ...where,
      days_on_market: { gt: 0 },
      updatedAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    },
  });
  
  // Turnover rate
  const turnoverRate = activeListings > 0 ? (soldLastMonth / activeListings) * 100 : 0;
  
  return {
    city,
    district: district || "Celé mesto",
    avgDaysOnMarket: Math.round(daysStats._avg.days_on_market || 0),
    medianDaysOnMarket: Math.round(daysStats._avg.days_on_market || 0), // Zjednodušené
    soldLastMonth,
    activeListings,
    turnoverRate: Math.round(turnoverRate * 10) / 10,
  };
}

/**
 * Aktualizuje StreetAnalytics s novými dátami
 */
export async function updateStreetAnalytics(
  city: string,
  district: string,
  street: string,
  pricePerM2: number
): Promise<void> {
  await prisma.streetAnalytics.upsert({
    where: {
      city_district_street: { city, district, street },
    },
    update: {
      // Inkrementálna aktualizácia priemeru
      avg_price_m2: {
        // Toto by malo byť správne vypočítané, ale pre zjednodušenie
        set: pricePerM2,
      },
      property_count: { increment: 1 },
      last_updated: new Date(),
    },
    create: {
      city,
      district,
      street,
      avg_price_m2: pricePerM2,
      median_price_m2: pricePerM2,
      property_count: 1,
    },
  });
}

/**
 * Získa top Market Gaps pre dashboard
 */
export async function getTopMarketGaps(limit: number = 10): Promise<MarketGapResult[]> {
  const gaps = await prisma.marketGap.findMany({
    where: {
      gap_percentage: { gte: MARKET_GAP_CONFIG.minGapPercentage },
      notified: false,
    },
    orderBy: { gap_percentage: "desc" },
    take: limit,
    include: {
      property: {
        select: {
          id: true,
          title: true,
          city: true,
          district: true,
          price_per_m2: true,
          area_m2: true,
        },
      },
    },
  });
  
  return gaps.map(gap => ({
    propertyId: gap.propertyId,
    gapPercentage: gap.gap_percentage,
    streetAvgPrice: gap.street_avg_price,
    districtAvgPrice: gap.street_avg_price, // Zjednodušené
    potentialProfit: gap.potential_profit || 0,
    confidence: gap.gap_percentage >= 25 ? "HIGH" : gap.gap_percentage >= 20 ? "MEDIUM" : "LOW",
    reasons: [`${gap.gap_percentage.toFixed(1)}% pod trhovou cenou`],
  }));
}
