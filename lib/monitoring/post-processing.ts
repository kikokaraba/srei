/**
 * Post-Processing - Calculate and update property metrics after scraping.
 * Výnos sa počíta z dostupných nájomných inzerátov (getComparableRents + fallback na priemer mesta).
 */

import { prisma } from "@/lib/prisma";
import {
  getComparableRents,
  getCityAverageRent,
  computeInvestmentMetricsFromRent,
} from "@/lib/analysis/yield-engine";
import { geocodeProperties } from "./geocoding";

interface ProcessingResult {
  daysOnMarketUpdated: number;
  metricsCalculated: number;
  rentEstimated: number;
  geocoded: number;
  errors: number;
}

/**
 * Run all post-processing tasks
 */
export async function runPostProcessing(): Promise<ProcessingResult> {
  const result: ProcessingResult = {
    daysOnMarketUpdated: 0,
    metricsCalculated: 0,
    rentEstimated: 0,
    geocoded: 0,
    errors: 0,
  };

  try {
    // 1. Update days on market
    result.daysOnMarketUpdated = await updateDaysOnMarket();
    
    // 2. Calculate investment metrics
    result.metricsCalculated = await calculateInvestmentMetrics();
    
    // 3. Estimate rent for sale properties
    result.rentEstimated = await estimateRentForSaleProperties();

    // 4. Geocode properties without coordinates (20 per run due to rate limits)
    const geoResult = await geocodeProperties(20);
    result.geocoded = geoResult.geocoded;

  } catch (error) {
    console.error("Post-processing error:", error);
    result.errors++;
  }

  return result;
}

/**
 * Update days_on_market for all active properties
 */
async function updateDaysOnMarket(): Promise<number> {
  const now = new Date();
  
  // Get all active properties with createdAt
  const properties = await prisma.property.findMany({
    where: { status: "ACTIVE" },
    select: { id: true, createdAt: true, first_listed_at: true },
  });

  let updated = 0;

  for (const prop of properties) {
    const listedDate = prop.first_listed_at || prop.createdAt;
    const daysOnMarket = Math.floor(
      (now.getTime() - listedDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    await prisma.property.update({
      where: { id: prop.id },
      data: { 
        days_on_market: daysOnMarket,
        first_listed_at: prop.first_listed_at || prop.createdAt,
      },
    });
    updated++;
  }

  return updated;
}

/**
 * Vypočíta investičné metriky pre predajné nehnuteľnosti bez metrík.
 * Odhad nájmu: najprv podobné nájomné inzeráty (mesto, okres, izby, plocha ±20%), potom fallback na priemer mesta.
 */
async function calculateInvestmentMetrics(): Promise<number> {
  const properties = await prisma.property.findMany({
    where: {
      status: "ACTIVE",
      listing_type: "PREDAJ",
      investmentMetrics: null,
      price: { gt: 0 },
    },
    select: {
      id: true,
      price: true,
      area_m2: true,
      city: true,
      district: true,
      rooms: true,
    },
    take: 150,
  });

  let calculated = 0;

  for (const prop of properties) {
    try {
      if (!prop.city?.trim()) continue;

      // 1) Podobné nájomné inzeráty (mesto, okres, izby, plocha ±20%) s fallbackmi v getComparableRents
      let monthlyRent: number | null = null;
      const rentData = await getComparableRents(
        prop.city,
        prop.district ?? null,
        prop.rooms ?? null,
        prop.area_m2 ?? null
      );
      if (rentData && rentData.sampleSize > 0) {
        monthlyRent = rentData.averageRent;
      }

      // 2) Fallback: priemerný nájom v meste (všetky PRENAJOM v meste)
      if (monthlyRent == null) {
        monthlyRent = await getCityAverageRent(prop.city);
      }

      if (monthlyRent == null || monthlyRent <= 0) continue;

      const metrics = computeInvestmentMetricsFromRent(prop.price, monthlyRent);
      if (metrics.gross_yield <= 0) continue;

      await prisma.investmentMetrics.upsert({
        where: { propertyId: prop.id },
        create: {
          propertyId: prop.id,
          gross_yield: metrics.gross_yield,
          net_yield: metrics.net_yield,
          cash_on_cash: metrics.cash_on_cash,
          price_to_rent_ratio: metrics.price_to_rent_ratio,
        },
        update: {
          gross_yield: metrics.gross_yield,
          net_yield: metrics.net_yield,
          cash_on_cash: metrics.cash_on_cash,
          price_to_rent_ratio: metrics.price_to_rent_ratio,
          calculated_at: new Date(),
        },
      });
      calculated++;
    } catch {
      // Skip this property
    }
  }

  return calculated;
}

/**
 * Estimate rent for sale properties based on similar rentals
 * Stores in a cache/map for quick access
 */
async function estimateRentForSaleProperties(): Promise<number> {
  // Get cities with rental data
  const rentalCities = await prisma.property.groupBy({
    by: ["city"],
    where: {
      listing_type: "PRENAJOM",
      status: "ACTIVE",
    },
    _avg: { price: true },
    _count: { id: true },
  });

  // Create city-level rent averages
  let estimated = 0;

  for (const cityData of rentalCities) {
    if (!cityData._avg.price || cityData._count.id < 3) continue;

    // Get average rent per m² for this city
    const rentals = await prisma.property.findMany({
      where: {
        listing_type: "PRENAJOM",
        status: "ACTIVE",
        city: cityData.city,
      },
      select: { price: true, area_m2: true },
    });

    const avgRentPerM2 = rentals.reduce((sum, r) => sum + (r.price / r.area_m2), 0) / rentals.length;

    // Update sale properties in this city with estimated rent data
    // We'll store this in the description or a separate field
    // For now, just count how many could be estimated
    const salePropsCount = await prisma.property.count({
      where: {
        listing_type: "PREDAJ",
        status: "ACTIVE",
        city: cityData.city,
        investmentMetrics: null,
      },
    });

    estimated += salePropsCount;
  }

  return estimated;
}

/**
 * Calculate market statistics for a city
 */
export async function calculateCityStats(city: string): Promise<{
  avgPrice: number;
  avgPricePerM2: number;
  avgRent: number;
  avgYield: number;
  propertyCount: number;
} | null> {
  const saleProps = await prisma.property.findMany({
    where: {
      city: { contains: city, mode: "insensitive" },
      listing_type: "PREDAJ",
      status: "ACTIVE",
    },
    select: { price: true, price_per_m2: true },
  });

  const rentalProps = await prisma.property.findMany({
    where: {
      city: { contains: city, mode: "insensitive" },
      listing_type: "PRENAJOM",
      status: "ACTIVE",
    },
    select: { price: true },
  });

  if (saleProps.length === 0) return null;

  const avgPrice = saleProps.reduce((sum, p) => sum + p.price, 0) / saleProps.length;
  const avgPricePerM2 = saleProps.reduce((sum, p) => sum + p.price_per_m2, 0) / saleProps.length;
  const avgRent = rentalProps.length > 0 
    ? rentalProps.reduce((sum, p) => sum + p.price, 0) / rentalProps.length 
    : 0;
  const avgYield = avgRent > 0 ? ((avgRent * 12) / avgPrice) * 100 : 0;

  return {
    avgPrice: Math.round(avgPrice),
    avgPricePerM2: Math.round(avgPricePerM2),
    avgRent: Math.round(avgRent),
    avgYield: Math.round(avgYield * 100) / 100,
    propertyCount: saleProps.length,
  };
}
