/**
 * Property Matching Engine
 * Hľadá duplicitné nehnuteľnosti naprieč portálmi
 */

import { prisma } from "@/lib/prisma";
import type { Property, PropertyMatch, PropertyFingerprint } from "@/generated/prisma/client";
import { createFingerprint, removeDiacritics, normalizeAddress } from "./fingerprint";

// ============================================================================
// TYPY
// ============================================================================

export interface MatchCandidate {
  property: Property & { fingerprint: PropertyFingerprint | null };
  score: number;
  reasons: MatchReason[];
}

export interface MatchReason {
  field: string;
  description: string;
  score: number;
}

export interface MatchResult {
  primaryProperty: Property;
  matches: MatchCandidate[];
  totalCandidates: number;
}

// ============================================================================
// SIMILARITY FUNKCIE
// ============================================================================

/**
 * Levenshtein distance pre porovnanie stringov
 */
function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;
  
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
  
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j - 1] + 1,
          dp[i - 1][j] + 1,
          dp[i][j - 1] + 1
        );
      }
    }
  }
  
  return dp[m][n];
}

/**
 * Similarity score medzi dvoma stringami (0-100)
 */
function stringSimilarity(str1: string, str2: string): number {
  if (!str1 || !str2) return 0;
  if (str1 === str2) return 100;
  
  const maxLen = Math.max(str1.length, str2.length);
  if (maxLen === 0) return 100;
  
  const distance = levenshteinDistance(str1.toLowerCase(), str2.toLowerCase());
  return Math.round((1 - distance / maxLen) * 100);
}

/**
 * Porovná dve čísla s toleranciou
 */
function numberSimilarity(num1: number, num2: number, tolerance: number = 0.1): number {
  if (num1 === num2) return 100;
  
  const diff = Math.abs(num1 - num2);
  const avg = (num1 + num2) / 2;
  const percentDiff = diff / avg;
  
  if (percentDiff <= tolerance) {
    return Math.round((1 - percentDiff / tolerance) * 100);
  }
  
  return 0;
}

// ============================================================================
// MATCHING ENGINE
// ============================================================================

/**
 * Nájde kandidátov na match pre danú nehnuteľnosť
 */
export async function findMatchCandidates(
  property: Property & { fingerprint: PropertyFingerprint | null },
  minScore: number = 60
): Promise<MatchCandidate[]> {
  if (!property.fingerprint) {
    console.warn(`Property ${property.id} has no fingerprint`);
    return [];
  }

  // Fáza 1: Rýchly filter cez fingerprint
  const candidateFingerprints = await prisma.propertyFingerprint.findMany({
    where: {
      propertyId: { not: property.id },
      // Rovnaké mesto a podobná plocha
      cityDistrict: property.fingerprint.cityDistrict,
      areaRange: property.fingerprint.areaRange,
    },
    include: {
      property: true,
    },
  });

  // Fáza 2: Detailné porovnanie
  const candidates: MatchCandidate[] = [];

  for (const fp of candidateFingerprints) {
    // Preskočiť ak je z toho istého zdroja
    if (fp.property.source === property.source) continue;

    const reasons: MatchReason[] = [];
    let totalScore = 0;
    let maxPossibleScore = 0;

    // 1. Porovnaj mesto a okres (weight: 20)
    maxPossibleScore += 20;
    if (fp.cityDistrict === property.fingerprint.cityDistrict) {
      totalScore += 20;
      reasons.push({ field: "cityDistrict", description: "Rovnaké mesto a okres", score: 20 });
    }

    // 2. Porovnaj plochu (weight: 25)
    maxPossibleScore += 25;
    const areaSimilarity = numberSimilarity(fp.property.area_m2, property.area_m2, 0.05);
    if (areaSimilarity > 80) {
      const score = Math.round(25 * areaSimilarity / 100);
      totalScore += score;
      reasons.push({ field: "area", description: `Podobná plocha (${areaSimilarity}%)`, score });
    }

    // 3. Porovnaj izby (weight: 15)
    if (property.rooms && fp.property.rooms) {
      maxPossibleScore += 15;
      if (property.rooms === fp.property.rooms) {
        totalScore += 15;
        reasons.push({ field: "rooms", description: "Rovnaký počet izieb", score: 15 });
      }
    }

    // 4. Porovnaj cenu (weight: 15)
    maxPossibleScore += 15;
    const priceSimilarity = numberSimilarity(fp.property.price, property.price, 0.15);
    if (priceSimilarity > 60) {
      const score = Math.round(15 * priceSimilarity / 100);
      totalScore += score;
      reasons.push({ field: "price", description: `Podobná cena (${priceSimilarity}%)`, score });
    }

    // 5. Porovnaj adresu (weight: 25)
    maxPossibleScore += 25;
    const addr1 = normalizeAddress(property.address);
    const addr2 = normalizeAddress(fp.property.address);
    const addressSimilarity = stringSimilarity(addr1, addr2);
    if (addressSimilarity > 50) {
      const score = Math.round(25 * addressSimilarity / 100);
      totalScore += score;
      reasons.push({ field: "address", description: `Podobná adresa (${addressSimilarity}%)`, score });
    }

    // Vypočítaj finálne skóre
    const finalScore = Math.round((totalScore / maxPossibleScore) * 100);

    if (finalScore >= minScore) {
      candidates.push({
        property: { ...fp.property, fingerprint: fp },
        score: finalScore,
        reasons,
      });
    }
  }

  // Zoraď podľa skóre
  candidates.sort((a, b) => b.score - a.score);

  return candidates;
}

/**
 * Uloží match do databázy
 */
export async function saveMatch(
  primaryPropertyId: string,
  matchedPropertyId: string,
  score: number,
  reasons: MatchReason[]
): Promise<PropertyMatch> {
  // Zabezpeč konzistentné poradie (menšie ID ako primary)
  const [primary, matched] = primaryPropertyId < matchedPropertyId
    ? [primaryPropertyId, matchedPropertyId]
    : [matchedPropertyId, primaryPropertyId];

  return prisma.propertyMatch.upsert({
    where: {
      primaryPropertyId_matchedPropertyId: {
        primaryPropertyId: primary,
        matchedPropertyId: matched,
      },
    },
    update: {
      matchScore: score,
      matchReason: JSON.stringify(reasons),
    },
    create: {
      primaryPropertyId: primary,
      matchedPropertyId: matched,
      matchScore: score,
      matchReason: JSON.stringify(reasons),
    },
  });
}

/**
 * Spustí matching pre všetky nové nehnuteľnosti
 */
export async function runMatchingForNewProperties(
  minScore: number = 70
): Promise<{ matched: number; total: number }> {
  // Nájdi nehnuteľnosti bez matchov
  const properties = await prisma.property.findMany({
    where: {
      primaryMatches: { none: {} },
      matchedBy: { none: {} },
      fingerprint: { isNot: null },
    },
    include: {
      fingerprint: true,
    },
    take: 50,
  });

  let matched = 0;

  for (const property of properties) {
    const candidates = await findMatchCandidates(
      property as Property & { fingerprint: PropertyFingerprint | null },
      minScore
    );

    for (const candidate of candidates) {
      await saveMatch(
        property.id,
        candidate.property.id,
        candidate.score,
        candidate.reasons
      );
      matched++;
    }
  }

  return { matched, total: properties.length };
}

/**
 * Získa všetky matches pre nehnuteľnosť
 */
export async function getPropertyMatches(propertyId: string): Promise<{
  property: Property;
  matches: Array<{
    matchedProperty: Property;
    score: number;
    reasons: MatchReason[];
    isConfirmed: boolean;
  }>;
}> {
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

  if (!property) {
    throw new Error("Property not found");
  }

  const matches = [
    ...property.primaryMatches.map(m => ({
      matchedProperty: m.matchedProperty,
      score: m.matchScore,
      reasons: JSON.parse(m.matchReason) as MatchReason[],
      isConfirmed: m.isConfirmed,
    })),
    ...property.matchedBy.map(m => ({
      matchedProperty: m.primaryProperty,
      score: m.matchScore,
      reasons: JSON.parse(m.matchReason) as MatchReason[],
      isConfirmed: m.isConfirmed,
    })),
  ];

  return {
    property,
    matches,
  };
}

/**
 * Potvrdí alebo odmietne match
 */
export async function confirmMatch(
  matchId: string,
  confirmed: boolean,
  userId: string
): Promise<PropertyMatch> {
  return prisma.propertyMatch.update({
    where: { id: matchId },
    data: {
      isConfirmed: confirmed,
      confirmedBy: userId,
    },
  });
}
