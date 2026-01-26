/**
 * Master Record System
 * 
 * Zoskupuje duplicitné inzeráty rovnakej nehnuteľnosti
 * z rôznych portálov pod jeden "Master Record"
 */

import { prisma } from "@/lib/prisma";
import type { Property, PropertySource} from "@/generated/prisma";

// ============================================
// TYPES
// ============================================

export interface MasterRecord {
  id: string;
  bestPrice: number;
  bestPriceSource: PropertySource;
  highestPrice: number;
  priceDifference: number; // % rozdiel medzi najlepšou a najhoršou cenou
  listings: DuplicateListing[];
  property: {
    title: string;
    city: string;
    district: string | null;
    area: number;
    rooms: number | null;
  };
  recommendation: string;
}

export interface DuplicateListing {
  id: string;
  source: PropertySource;
  price: number;
  pricePerM2: number;
  url: string | null;
  daysOnMarket: number;
  lastPriceChange: number | null; // % zmena
  isBestPrice: boolean;
}

export interface DuplicateGroup {
  fingerprint: string;
  properties: Property[];
  count: number;
}

// ============================================
// FINGERPRINT MATCHING
// ============================================

/**
 * Vytvorí fingerprint pre nehnuteľnosť na základe:
 * - Mesto + Okres
 * - Plocha (±5 m²)
 * - Počet izieb
 * - Cenové rozpätie (±15%)
 */
function createFingerprint(property: Property): string {
  const areaGroup = Math.round(property.area_m2 / 5) * 5; // Zaokrúhlené na 5 m²
  const priceGroup = Math.round(property.price / 10000) * 10000; // Zaokrúhlené na 10k
  
  return `${property.city}|${property.district || ""}|${areaGroup}|${property.rooms || 0}|${priceGroup}`;
}

/**
 * Rozšírený fingerprint matching s fuzzy logikou
 */
async function findSimilarProperties(property: Property): Promise<Property[]> {
  const areaTolerance = 5; // ±5 m²
  const priceTolerance = 0.15; // ±15%

  const similar = await prisma.property.findMany({
    where: {
      city: property.city,
      district: property.district,
      area_m2: {
        gte: property.area_m2 - areaTolerance,
        lte: property.area_m2 + areaTolerance,
      },
      price: {
        gte: property.price * (1 - priceTolerance),
        lte: property.price * (1 + priceTolerance),
      },
      rooms: property.rooms,
      id: { not: property.id },
      listing_type: property.listing_type,
    },
    orderBy: { price: "asc" },
  });

  return similar;
}

// ============================================
// MASTER RECORD CREATION
// ============================================

/**
 * Vytvorí Master Record pre property a jej duplicity
 */
export async function createMasterRecord(propertyId: string): Promise<MasterRecord | null> {
  const property = await prisma.property.findUnique({
    where: { id: propertyId },
  });

  if (!property) return null;

  const similar = await findSimilarProperties(property);
  const allListings = [property, ...similar];

  if (allListings.length === 1) {
    // Žiadne duplicity
    return null;
  }

  // Nájdi najlepšiu a najhoršiu cenu
  const sortedByPrice = allListings.sort((a, b) => a.price - b.price);
  const bestPrice = sortedByPrice[0].price;
  const highestPrice = sortedByPrice[sortedByPrice.length - 1].price;
  const priceDifference = ((highestPrice - bestPrice) / bestPrice) * 100;

  // Vytvor listings
  const listings: DuplicateListing[] = await Promise.all(
    allListings.map(async (p) => {
      const daysOnMarket = Math.floor(
        (Date.now() - p.createdAt.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Získaj poslednú zmenu ceny
      const priceHistory = await prisma.priceHistory.findMany({
        where: { propertyId: p.id },
        orderBy: { recorded_at: "desc" },
        take: 2,
      });

      let lastPriceChange: number | null = null;
      if (priceHistory.length >= 2) {
        const current = priceHistory[0].price;
        const previous = priceHistory[1].price;
        lastPriceChange = ((current - previous) / previous) * 100;
      }

      return {
        id: p.id,
        source: p.source,
        price: p.price,
        pricePerM2: p.price_per_m2 || 0,
        url: p.source_url,
        daysOnMarket,
        lastPriceChange: lastPriceChange ? Math.round(lastPriceChange * 10) / 10 : null,
        isBestPrice: p.price === bestPrice,
      };
    })
  );

  // Vytvor odporúčanie
  let recommendation: string;
  if (priceDifference > 10) {
    recommendation = `Rovnaká nehnuteľnosť je u ${sortedByPrice[0].source} o ${Math.round(priceDifference)}% lacnejšia! Kontaktuj túto realitku.`;
  } else if (priceDifference > 5) {
    recommendation = `Nájdených ${allListings.length} inzerátov. Rozdiel ${Math.round(priceDifference)}% - porovnaj podmienky.`;
  } else {
    recommendation = `Nájdených ${allListings.length} inzerátov s podobnou cenou. Vyber podľa realitky.`;
  }

  return {
    id: `master_${property.id}`,
    bestPrice,
    bestPriceSource: sortedByPrice[0].source,
    highestPrice,
    priceDifference: Math.round(priceDifference * 10) / 10,
    listings,
    property: {
      title: property.title,
      city: property.city,
      district: property.district,
      area: property.area_m2,
      rooms: property.rooms,
    },
    recommendation,
  };
}

// ============================================
// BULK DUPLICATE DETECTION
// ============================================

/**
 * Nájde všetky duplicitné skupiny v databáze
 */
export async function findAllDuplicateGroups(
  city?: string,
  limit: number = 50
): Promise<DuplicateGroup[]> {
  const where: Record<string, unknown> = {};
  if (city) where.city = city;

  // Získaj všetky properties
  const properties = await prisma.property.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 500, // Limit pre performance
  });

  // Zoskup podľa fingerprint
  const groups = new Map<string, Property[]>();

  for (const property of properties) {
    const fingerprint = createFingerprint(property);
    const existing = groups.get(fingerprint) || [];
    existing.push(property);
    groups.set(fingerprint, existing);
  }

  // Filtruj len skupiny s duplicitami
  const duplicateGroups: DuplicateGroup[] = [];

  for (const [fingerprint, props] of groups) {
    if (props.length > 1) {
      // Skontroluj že sú z rôznych zdrojov
      const sources = new Set(props.map(p => p.source));
      if (sources.size > 1) {
        duplicateGroups.push({
          fingerprint,
          properties: props.sort((a, b) => a.price - b.price),
          count: props.length,
        });
      }
    }
  }

  // Zoraď podľa počtu duplicít
  return duplicateGroups
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

/**
 * Štatistiky duplicít
 */
export async function getDuplicateStats(city?: string): Promise<{
  totalDuplicateGroups: number;
  totalDuplicateListings: number;
  potentialSavings: number;
  topSavings: Array<{
    city: string;
    savings: number;
    count: number;
  }>;
}> {
  const groups = await findAllDuplicateGroups(city, 100);

  let totalDuplicateListings = 0;
  let potentialSavings = 0;
  const savingsByCity = new Map<string, { savings: number; count: number }>();

  for (const group of groups) {
    totalDuplicateListings += group.count;
    
    const prices = group.properties.map(p => p.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const savings = maxPrice - minPrice;
    
    potentialSavings += savings;

    const cityKey = group.properties[0].city;
    const existing = savingsByCity.get(cityKey) || { savings: 0, count: 0 };
    existing.savings += savings;
    existing.count++;
    savingsByCity.set(cityKey, existing);
  }

  const topSavings = Array.from(savingsByCity.entries())
    .map(([city, data]) => ({ city, ...data }))
    .sort((a, b) => b.savings - a.savings)
    .slice(0, 5);

  return {
    totalDuplicateGroups: groups.length,
    totalDuplicateListings,
    potentialSavings,
    topSavings,
  };
}
