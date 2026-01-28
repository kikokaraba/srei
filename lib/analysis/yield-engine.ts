/**
 * Yield Engine - Výpočet výnosnosti nehnuteľností
 * 
 * Spája predajné a nájomné dáta pre výpočet:
 * - Gross Yield (hrubá výnosnosť)
 * - Net Yield (čistá výnosnosť)
 * - Price-to-Rent ratio
 * - Payback period
 */

import { prisma } from "@/lib/prisma";

// ============================================================================
// TYPY
// ============================================================================

export interface YieldData {
  averageRent: number;         // Priemerný mesačný nájom v lokalite
  rentRange: { min: number; max: number };
  sampleSize: number;          // Počet nájomných inzerátov použitých
  grossYield: number;          // Hrubá ročná výnosnosť (%)
  netYield: number;            // Čistá ročná výnosnosť po nákladoch (%)
  priceToRent: number;         // Pomer ceny k ročnému nájmu
  paybackYears: number;        // Počet rokov na splatenie
  monthlyExpenses: number;     // Odhadované mesačné náklady
  monthlyProfit: number;       // Čistý mesačný zisk
}

export interface MarketComparison {
  propertyYield: number;
  cityAverage: number;
  districtAverage: number;
  countryAverage: number;
  rating: "EXCELLENT" | "GOOD" | "AVERAGE" | "BELOW_AVERAGE" | "POOR";
  percentile: number;
}

// ============================================================================
// KONŠTANTY
// ============================================================================

// Odhadované mesačné náklady ako % z nájmu
const EXPENSE_RATES = {
  propertyTax: 0.01,      // Daň z nehnuteľností (~1% ročne)
  maintenance: 0.05,      // Údržba a opravy
  insurance: 0.02,        // Poistenie
  management: 0.08,       // Správa (ak externe)
  vacancy: 0.05,          // Neobsadenosť
  reserves: 0.05,         // Rezerva na väčšie opravy
};

const TOTAL_EXPENSE_RATE = Object.values(EXPENSE_RATES).reduce((a, b) => a + b, 0);

// ============================================================================
// HLAVNÉ FUNKCIE
// ============================================================================

/**
 * Vypočíta yield pre konkrétnu nehnuteľnosť
 */
export async function calculatePropertyYield(
  propertyId: string
): Promise<YieldData | null> {
  // Získaj nehnuteľnosť
  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    select: {
      price: true,
      area_m2: true,
      rooms: true,
      city: true,
      district: true,
      listing_type: true,
    },
  });

  if (!property || property.listing_type !== "PREDAJ" || property.price <= 0) {
    return null;
  }

  // Nájdi porovnateľné nájmy
  const rentData = await getComparableRents(
    property.city,
    property.district,
    property.rooms,
    property.area_m2
  );

  if (!rentData || rentData.sampleSize === 0) {
    return null;
  }

  return calculateYieldMetrics(property.price, rentData.averageRent, rentData);
}

/**
 * Vypočíta yield pre ľubovoľnú cenu a lokalitu
 */
export async function calculateYieldForLocation(
  price: number,
  city: string,
  district?: string,
  rooms?: number,
  area_m2?: number
): Promise<YieldData | null> {
  const rentData = await getComparableRents(city, district, rooms, area_m2);

  if (!rentData || rentData.sampleSize === 0) {
    return null;
  }

  return calculateYieldMetrics(price, rentData.averageRent, rentData);
}

/**
 * Získa priemerné nájmy v lokalite.
 * Priorita: mesto + okres + počet izieb + plocha (±20%). Scraping je zameraný na byty,
 * takže PRENAJOM dáta sú z bytov; pri zavedení property_type môžeme filtrovať výhradne BYT.
 */
export async function getComparableRents(
  city: string,
  district?: string | null,
  rooms?: number | null,
  area_m2?: number | null
): Promise<{
  averageRent: number;
  rentRange: { min: number; max: number };
  sampleSize: number;
} | null> {
  // Základný filter
  const baseWhere = {
    listing_type: "PRENAJOM" as const,
    city,
    price: { gt: 100, lt: 5000 }, // Rozumný rozsah pre nájmy
    status: "ACTIVE" as const,
  };

  // Najprv skús presný match
  let rentals = await prisma.property.findMany({
    where: {
      ...baseWhere,
      ...(district && { district }),
      ...(rooms && { rooms }),
      ...(area_m2 && {
        area_m2: {
          gte: area_m2 * 0.8,
          lte: area_m2 * 1.2,
        },
      }),
    },
    select: { price: true },
    take: 100,
  });

  // Ak málo výsledkov, rozšír na celé mesto
  if (rentals.length < 5 && district) {
    rentals = await prisma.property.findMany({
      where: {
        ...baseWhere,
        ...(rooms && { rooms }),
      },
      select: { price: true },
      take: 100,
    });
  }

  // Ak stále málo, vezmi len mesto a približnú plochu
  if (rentals.length < 3) {
    rentals = await prisma.property.findMany({
      where: baseWhere,
      select: { price: true },
      take: 100,
    });
  }

  if (rentals.length === 0) {
    return null;
  }

  const prices = rentals.map((r) => r.price);
  const averageRent = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);

  return {
    averageRent,
    rentRange: {
      min: Math.min(...prices),
      max: Math.max(...prices),
    },
    sampleSize: rentals.length,
  };
}

/**
 * Vypočíta všetky yield metriky
 */
function calculateYieldMetrics(
  purchasePrice: number,
  monthlyRent: number,
  rentData: { averageRent: number; rentRange: { min: number; max: number }; sampleSize: number }
): YieldData {
  const annualRent = monthlyRent * 12;
  const monthlyExpenses = Math.round(monthlyRent * TOTAL_EXPENSE_RATE);
  const annualExpenses = monthlyExpenses * 12;
  const netAnnualIncome = annualRent - annualExpenses;

  const grossYield = (annualRent / purchasePrice) * 100;
  const netYield = (netAnnualIncome / purchasePrice) * 100;
  const priceToRent = purchasePrice / annualRent;
  const paybackYears = purchasePrice / netAnnualIncome;
  const monthlyProfit = monthlyRent - monthlyExpenses;

  return {
    averageRent: rentData.averageRent,
    rentRange: rentData.rentRange,
    sampleSize: rentData.sampleSize,
    grossYield: Math.round(grossYield * 100) / 100,
    netYield: Math.round(netYield * 100) / 100,
    priceToRent: Math.round(priceToRent * 10) / 10,
    paybackYears: Math.round(paybackYears * 10) / 10,
    monthlyExpenses,
    monthlyProfit,
  };
}

// ============================================================================
// POROVNANIE S TRHOM
// ============================================================================

/**
 * Porovná yield nehnuteľnosti s priemerom trhu
 */
export async function compareToMarket(
  propertyYield: number,
  city: string,
  district?: string
): Promise<MarketComparison> {
  // Získaj priemery (zjednodušené - v produkcii by boli predpočítané)
  const countryAverage = 4.5; // Slovenský priemer
  
  // Získaj priemer mesta
  const cityYields = await getCityAverageYield(city);
  const cityAverage = cityYields || countryAverage;

  // Získaj priemer okresu
  const districtYields = district 
    ? await getDistrictAverageYield(city, district) 
    : cityAverage;
  const districtAverage = districtYields || cityAverage;

  // Percentil a rating
  const percentile = calculatePercentile(propertyYield, countryAverage);
  const rating = getRating(propertyYield);

  return {
    propertyYield,
    cityAverage,
    districtAverage,
    countryAverage,
    rating,
    percentile,
  };
}

async function getCityAverageYield(city: string): Promise<number | null> {
  const sales = await prisma.property.aggregate({
    where: { city, listing_type: "PREDAJ", price: { gt: 10000 }, status: "ACTIVE" },
    _avg: { price_per_m2: true },
  });

  const rents = await prisma.property.aggregate({
    where: { city, listing_type: "PRENAJOM", price: { gt: 100 }, status: "ACTIVE" },
    _avg: { price_per_m2: true },
  });

  if (!sales._avg.price_per_m2 || !rents._avg.price_per_m2) return null;

  // Yield = (mesačný nájom * 12) / kúpna cena * 100
  // Per m2: (rent_m2 * 12) / sale_m2 * 100
  const yield_ = (rents._avg.price_per_m2 * 12) / sales._avg.price_per_m2 * 100;
  return Math.round(yield_ * 100) / 100;
}

async function getDistrictAverageYield(city: string, district: string): Promise<number | null> {
  const sales = await prisma.property.aggregate({
    where: { city, district, listing_type: "PREDAJ", price: { gt: 10000 }, status: "ACTIVE" },
    _avg: { price_per_m2: true },
  });

  const rents = await prisma.property.aggregate({
    where: { city, district, listing_type: "PRENAJOM", price: { gt: 100 }, status: "ACTIVE" },
    _avg: { price_per_m2: true },
  });

  if (!sales._avg.price_per_m2 || !rents._avg.price_per_m2) return null;

  const yield_ = (rents._avg.price_per_m2 * 12) / sales._avg.price_per_m2 * 100;
  return Math.round(yield_ * 100) / 100;
}

function calculatePercentile(yield_: number, average: number): number {
  // Zjednodušený výpočet percentilu
  const ratio = yield_ / average;
  if (ratio >= 1.5) return 95;
  if (ratio >= 1.3) return 85;
  if (ratio >= 1.1) return 70;
  if (ratio >= 0.9) return 50;
  if (ratio >= 0.7) return 30;
  return 15;
}

function getRating(yield_: number): MarketComparison["rating"] {
  if (yield_ >= 7) return "EXCELLENT";
  if (yield_ >= 5.5) return "GOOD";
  if (yield_ >= 4) return "AVERAGE";
  if (yield_ >= 2.5) return "BELOW_AVERAGE";
  return "POOR";
}

// ============================================================================
// EXPORT PRE DASHBOARD
// ============================================================================

/**
 * Získa yield štatistiky pre dashboard
 */
export async function getYieldStats(city?: string): Promise<{
  averageGrossYield: number;
  averageNetYield: number;
  bestYieldDistricts: Array<{ district: string; yield: number }>;
  priceToRentTrend: "RISING" | "STABLE" | "FALLING";
}> {
  const where = {
    status: "ACTIVE" as const,
    ...(city && { city }),
  };

  // Agregácie
  const [salesStats, rentStats] = await Promise.all([
    prisma.property.aggregate({
      where: { ...where, listing_type: "PREDAJ", price: { gt: 10000 } },
      _avg: { price_per_m2: true },
      _count: true,
    }),
    prisma.property.aggregate({
      where: { ...where, listing_type: "PRENAJOM", price: { gt: 100 } },
      _avg: { price_per_m2: true },
      _count: true,
    }),
  ]);

  let averageGrossYield = 4.5; // Default
  if (salesStats._avg.price_per_m2 && rentStats._avg.price_per_m2) {
    averageGrossYield = (rentStats._avg.price_per_m2 * 12) / salesStats._avg.price_per_m2 * 100;
  }

  const averageNetYield = averageGrossYield * (1 - TOTAL_EXPENSE_RATE);

  return {
    averageGrossYield: Math.round(averageGrossYield * 100) / 100,
    averageNetYield: Math.round(averageNetYield * 100) / 100,
    bestYieldDistricts: [], // TODO: Implementovať
    priceToRentTrend: "STABLE",
  };
}
