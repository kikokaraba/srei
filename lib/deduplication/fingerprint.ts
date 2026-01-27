/**
 * Property Fingerprinting & Deduplication System
 * 
 * Párovanie rovnakých nehnuteľností z rôznych zdrojov
 */

import { prisma } from "@/lib/prisma";
import crypto from "crypto";

// Normalizácia textu - odstráni diakritiku, lowercases, removes extra spaces
function normalizeText(text: string | null | undefined): string {
  if (!text) return "";
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove diacritics
    .replace(/[^a-z0-9\s]/g, "") // keep only alphanumeric
    .replace(/\s+/g, " ")
    .trim();
}

// Normalizácia adresy
function normalizeAddress(address: string | null, street: string | null, city: string): string {
  const parts = [
    normalizeText(street),
    normalizeText(address),
    normalizeText(city),
  ].filter(Boolean);
  return parts.join(" ");
}

// Zaokrúhlenie plochy na range
function getAreaRange(area: number): string {
  if (area < 30) return "0-30";
  if (area < 50) return "30-50";
  if (area < 70) return "50-70";
  if (area < 90) return "70-90";
  if (area < 120) return "90-120";
  if (area < 150) return "120-150";
  return "150+";
}

// Zaokrúhlenie ceny na range
function getPriceRange(price: number): string {
  if (price < 50000) return "0-50k";
  if (price < 100000) return "50-100k";
  if (price < 150000) return "100-150k";
  if (price < 200000) return "150-200k";
  if (price < 300000) return "200-300k";
  if (price < 500000) return "300-500k";
  return "500k+";
}

// Zaokrúhlenie poschodia
function getFloorRange(floor: number | null): string | null {
  if (floor === null || floor === undefined) return null;
  if (floor <= 0) return "ground";
  if (floor <= 3) return "1-3";
  if (floor <= 6) return "4-6";
  return "7+";
}

// Vytvorenie hash z normalizovaných hodnôt
function createFingerprintHash(data: {
  addressNormalized: string;
  cityDistrict: string;
  areaRange: string;
  roomsRange: string | null;
  priceRange: string;
}): string {
  const str = `${data.cityDistrict}|${data.areaRange}|${data.addressNormalized.substring(0, 50)}`;
  return crypto.createHash("md5").update(str).digest("hex");
}

/**
 * Vytvorí fingerprint pre nehnuteľnosť
 */
export async function createPropertyFingerprint(propertyId: string): Promise<void> {
  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    include: { fingerprint: true },
  });

  if (!property) return;

  const addressNormalized = normalizeAddress(property.address, property.street, property.city);
  const cityDistrict = `${property.city}-${normalizeText(property.district)}`;
  const areaRange = getAreaRange(property.area_m2);
  const roomsRange = property.rooms?.toString() || null;
  const priceRange = getPriceRange(property.price);
  const floorRange = getFloorRange(property.floor);
  const titleNormalized = normalizeText(property.title);
  const descriptionHash = property.description 
    ? crypto.createHash("md5").update(property.description.substring(0, 500)).digest("hex")
    : null;

  const fingerprintHash = createFingerprintHash({
    addressNormalized,
    cityDistrict,
    areaRange,
    roomsRange,
    priceRange,
  });

  await prisma.propertyFingerprint.upsert({
    where: { propertyId },
    create: {
      propertyId,
      addressNormalized,
      cityDistrict,
      areaRange,
      roomsRange,
      priceRange,
      floorRange,
      titleNormalized,
      descriptionHash,
      fingerprintHash,
    },
    update: {
      addressNormalized,
      cityDistrict,
      areaRange,
      roomsRange,
      priceRange,
      floorRange,
      titleNormalized,
      descriptionHash,
      fingerprintHash,
    },
  });
}

/**
 * Nájde potenciálne duplicity pre nehnuteľnosť
 */
export async function findPotentialDuplicates(
  propertyId: string,
  minScore: number = 70
): Promise<Array<{ propertyId: string; score: number; reasons: string[] }>> {
  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    include: { fingerprint: true },
  });

  if (!property?.fingerprint) return [];

  // Nájdi kandidátov s podobným fingerprintom
  const candidates = await prisma.propertyFingerprint.findMany({
    where: {
      propertyId: { not: propertyId },
      cityDistrict: property.fingerprint.cityDistrict,
      areaRange: property.fingerprint.areaRange,
    },
    include: {
      property: true,
    },
  });

  const results: Array<{ propertyId: string; score: number; reasons: string[] }> = [];

  for (const candidate of candidates) {
    const { score, reasons } = calculateMatchScore(property, candidate.property, property.fingerprint, candidate);
    
    if (score >= minScore) {
      results.push({
        propertyId: candidate.propertyId,
        score,
        reasons,
      });
    }
  }

  // Zoradiť podľa skóre zostupne
  return results.sort((a, b) => b.score - a.score);
}

/**
 * Vypočíta skóre zhody medzi dvoma nehnuteľnosťami
 */
function calculateMatchScore(
  prop1: { price: number; area_m2: number; rooms: number | null; floor: number | null; city: string; district: string; street: string | null; source: string },
  prop2: { price: number; area_m2: number; rooms: number | null; floor: number | null; city: string; district: string; street: string | null; source: string },
  fp1: { addressNormalized: string; titleNormalized: string | null; descriptionHash: string | null },
  fp2: { addressNormalized: string; titleNormalized: string | null; descriptionHash: string | null }
): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  // Rovnaký zdroj = nemôže byť duplicita (už má unikátny external_id)
  if (prop1.source === prop2.source) {
    return { score: 0, reasons: ["Rovnaký zdroj"] };
  }

  // Mesto a okres (povinné)
  if (prop1.city === prop2.city && prop1.district === prop2.district) {
    score += 20;
    reasons.push("Rovnaké mesto a okres (+20)");
  } else {
    return { score: 0, reasons: ["Iné mesto/okres"] };
  }

  // Plocha - tolerancia 5%
  const areaDiff = Math.abs(prop1.area_m2 - prop2.area_m2) / Math.max(prop1.area_m2, prop2.area_m2);
  if (areaDiff < 0.02) {
    score += 25;
    reasons.push("Rovnaká plocha ±2% (+25)");
  } else if (areaDiff < 0.05) {
    score += 15;
    reasons.push("Podobná plocha ±5% (+15)");
  } else if (areaDiff < 0.10) {
    score += 5;
    reasons.push("Približná plocha ±10% (+5)");
  }

  // Cena - tolerancia 5%
  // Ak je jedna z cien 0 (cena dohodou), nepridávaj body za cenu
  if (prop1.price === 0 || prop2.price === 0) {
    // Cena dohodou - nepridávaj body, ale ani nepenalizuj
    reasons.push("Cena dohodou - ignorované");
  } else {
    const priceDiff = Math.abs(prop1.price - prop2.price) / Math.max(prop1.price, prop2.price);
    if (priceDiff < 0.02) {
      score += 20;
      reasons.push("Rovnaká cena ±2% (+20)");
    } else if (priceDiff < 0.05) {
      score += 15;
      reasons.push("Podobná cena ±5% (+15)");
    } else if (priceDiff < 0.10) {
      score += 8;
      reasons.push("Približná cena ±10% (+8)");
    }
  }

  // Počet izieb
  if (prop1.rooms && prop2.rooms && prop1.rooms === prop2.rooms) {
    score += 15;
    reasons.push("Rovnaký počet izieb (+15)");
  }

  // Poschodie
  if (prop1.floor !== null && prop2.floor !== null && prop1.floor === prop2.floor) {
    score += 10;
    reasons.push("Rovnaké poschodie (+10)");
  }

  // Ulica (ak je dostupná)
  if (prop1.street && prop2.street) {
    const street1 = normalizeText(prop1.street);
    const street2 = normalizeText(prop2.street);
    if (street1 === street2) {
      score += 20;
      reasons.push("Rovnaká ulica (+20)");
    } else if (street1.includes(street2) || street2.includes(street1)) {
      score += 10;
      reasons.push("Podobná ulica (+10)");
    }
  }

  // Adresa podobnosť
  const addrSimilarity = calculateStringSimilarity(fp1.addressNormalized, fp2.addressNormalized);
  if (addrSimilarity > 0.8) {
    score += 15;
    reasons.push(`Veľmi podobná adresa (${Math.round(addrSimilarity * 100)}%) (+15)`);
  } else if (addrSimilarity > 0.6) {
    score += 8;
    reasons.push(`Podobná adresa (${Math.round(addrSimilarity * 100)}%) (+8)`);
  }

  // Názov podobnosť
  if (fp1.titleNormalized && fp2.titleNormalized) {
    const titleSimilarity = calculateStringSimilarity(fp1.titleNormalized, fp2.titleNormalized);
    if (titleSimilarity > 0.7) {
      score += 10;
      reasons.push(`Podobný názov (${Math.round(titleSimilarity * 100)}%) (+10)`);
    }
  }

  // Description hash match (vysoká pravdepodobnosť duplicity)
  if (fp1.descriptionHash && fp2.descriptionHash && fp1.descriptionHash === fp2.descriptionHash) {
    score += 25;
    reasons.push("Identický popis (+25)");
  }

  return { score: Math.min(score, 100), reasons };
}

/**
 * Jednoduchý výpočet podobnosti reťazcov (Jaccard similarity)
 */
function calculateStringSimilarity(str1: string, str2: string): number {
  if (!str1 || !str2) return 0;
  
  const words1 = new Set(str1.split(" "));
  const words2 = new Set(str2.split(" "));
  
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  
  return intersection.size / union.size;
}

/**
 * Vytvorí match záznam medzi dvoma nehnuteľnosťami
 */
export async function createPropertyMatch(
  primaryPropertyId: string,
  matchedPropertyId: string,
  score: number,
  reasons: string[]
): Promise<void> {
  // Vždy ukladaj s nižším ID ako primary (deterministické)
  const [primary, matched] = primaryPropertyId < matchedPropertyId 
    ? [primaryPropertyId, matchedPropertyId]
    : [matchedPropertyId, primaryPropertyId];

  await prisma.propertyMatch.upsert({
    where: {
      primaryPropertyId_matchedPropertyId: {
        primaryPropertyId: primary,
        matchedPropertyId: matched,
      },
    },
    create: {
      primaryPropertyId: primary,
      matchedPropertyId: matched,
      matchScore: score,
      matchReason: JSON.stringify(reasons),
    },
    update: {
      matchScore: score,
      matchReason: JSON.stringify(reasons),
    },
  });
}

/**
 * Spustí deduplikáciu pre všetky nehnuteľnosti bez fingerprints
 */
export async function runFullDeduplication(): Promise<{
  fingerprintsCreated: number;
  matchesFound: number;
}> {
  // 1. Vytvor fingerprints pre všetky nehnuteľnosti bez nich
  const propertiesWithoutFingerprint = await prisma.property.findMany({
    where: {
      fingerprint: null,
    },
    select: { id: true },
  });

  let fingerprintsCreated = 0;
  for (const prop of propertiesWithoutFingerprint) {
    await createPropertyFingerprint(prop.id);
    fingerprintsCreated++;
  }

  // 2. Nájdi duplicity pre každú nehnuteľnosť
  const allProperties = await prisma.property.findMany({
    select: { id: true },
  });

  let matchesFound = 0;
  const processedPairs = new Set<string>();

  for (const prop of allProperties) {
    const duplicates = await findPotentialDuplicates(prop.id, 70);
    
    for (const dup of duplicates) {
      // Vytvor unikátny kľúč pre pár
      const pairKey = [prop.id, dup.propertyId].sort().join("-");
      if (processedPairs.has(pairKey)) continue;
      
      processedPairs.add(pairKey);
      await createPropertyMatch(prop.id, dup.propertyId, dup.score, dup.reasons);
      matchesFound++;
    }
  }

  return { fingerprintsCreated, matchesFound };
}

/**
 * Získa zjednotený pohľad na nehnuteľnosť s dátami zo všetkých zdrojov
 */
export async function getUnifiedPropertyView(propertyId: string): Promise<{
  primary: unknown;
  sources: Array<{ source: string; url: string | null; price: number; lastUpdate: Date }>;
  priceComparison: { lowest: number; highest: number; average: number };
} | null> {
  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    include: {
      primaryMatches: {
        include: {
          matchedProperty: true,
        },
      },
      matchedBy: {
        include: {
          primaryProperty: true,
        },
      },
    },
  });

  if (!property) return null;

  // Zbieraj všetky prepojené nehnuteľnosti
  const allProperties = [
    property,
    ...property.primaryMatches.map(m => m.matchedProperty),
    ...property.matchedBy.map(m => m.primaryProperty),
  ];

  const sources = allProperties.map(p => ({
    source: p.source,
    url: p.source_url,
    price: p.price,
    lastUpdate: p.updatedAt,
  }));

  const prices = allProperties.map(p => p.price);
  const priceComparison = {
    lowest: Math.min(...prices),
    highest: Math.max(...prices),
    average: prices.reduce((a, b) => a + b, 0) / prices.length,
  };

  return {
    primary: property,
    sources,
    priceComparison,
  };
}
