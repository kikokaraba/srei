/**
 * Property Fingerprint Generator
 * Generuje unikátny fingerprint pre každú nehnuteľnosť pre matching duplicít
 * 
 * VYLEPŠENIA v2:
 * - Fuzzy matching pre detekciu podobných nehnuteľností
 * - Tolerance pre drobnú zmenu plochy (±2m²)
 * - Detekcia re-listingov (rovnaká nehnuteľnosť, nové ID)
 * - Similarity score pre ranking zhôd
 */

import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import type { Property, PropertyFingerprint } from "@/generated/prisma/client";

// ============================================================================
// TYPY
// ============================================================================

export interface MatchCandidate {
  propertyId: string;
  fingerprintHash: string;
  similarityScore: number; // 0-100
  matchReasons: string[];
}

export interface MatchResult {
  isMatch: boolean;
  matchedPropertyId: string | null;
  similarityScore: number;
  matchReasons: string[];
  isReListing: boolean; // Či sa vrátil po INACTIVE
}

// ============================================================================
// NORMALIZAČNÉ FUNKCIE
// ============================================================================

/**
 * Odstráni diakritiku z textu
 */
export function removeDiacritics(text: string): string {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/**
 * Normalizuje adresu pre porovnanie
 * - Lowercase
 * - Bez diakritiky
 * - Odstráni čísla domov, PSČ
 * - Normalizuje medzery
 */
export function normalizeAddress(address: string): string {
  let normalized = removeDiacritics(address).toLowerCase();
  
  // Odstráň PSČ (5 číslic)
  normalized = normalized.replace(/\d{3}\s?\d{2}/g, "");
  
  // Odstráň čísla domov (napr. "15", "15/A", "15A")
  normalized = normalized.replace(/\d+[\/]?[a-z]?/gi, "");
  
  // Normalizuj medzery
  normalized = normalized.replace(/\s+/g, " ").trim();
  
  // Odstráň bežné slová
  const stopWords = ["ulica", "ul", "nam", "namestie", "cesta", "trieda", "ulice"];
  for (const word of stopWords) {
    normalized = normalized.replace(new RegExp(`\\b${word}\\b`, "gi"), "");
  }
  
  return normalized.replace(/\s+/g, " ").trim();
}

/**
 * Normalizuje názov inzerátu
 */
export function normalizeTitle(title: string): string {
  let normalized = removeDiacritics(title).toLowerCase();
  
  // Odstráň čísla (plocha, cena, izby)
  normalized = normalized.replace(/\d+/g, "");
  
  // Odstráň bežné slová
  const stopWords = ["predaj", "prenajom", "byt", "dom", "izba", "izbovy", "m2", "euro", "eur"];
  for (const word of stopWords) {
    normalized = normalized.replace(new RegExp(`\\b${word}\\b`, "gi"), "");
  }
  
  return normalized.replace(/\s+/g, " ").trim();
}

/**
 * Zaokrúhli plochu na rozsah (50-60, 60-70, atď.)
 */
export function getAreaRange(areaM2: number): string {
  const lower = Math.floor(areaM2 / 10) * 10;
  const upper = lower + 10;
  return `${lower}-${upper}`;
}

/**
 * Zaokrúhli cenu na rozsah
 */
export function getPriceRange(price: number): string {
  if (price < 100000) {
    const lower = Math.floor(price / 10000) * 10000;
    return `${lower}-${lower + 10000}`;
  } else if (price < 500000) {
    const lower = Math.floor(price / 25000) * 25000;
    return `${lower}-${lower + 25000}`;
  } else {
    const lower = Math.floor(price / 50000) * 50000;
    return `${lower}-${lower + 50000}`;
  }
}

/**
 * Zaokrúhli poschodie na rozsah
 */
export function getFloorRange(floor: number | null | undefined): string {
  if (floor === null || floor === undefined) return "unknown";
  if (floor <= 0) return "ground";
  if (floor <= 3) return "1-3";
  if (floor <= 6) return "4-6";
  return "7+";
}

/**
 * Vytvorí hash z popisu (prvých 500 znakov)
 */
export function getDescriptionHash(description: string | null | undefined): string {
  if (!description) return "";
  
  const normalized = removeDiacritics(description)
    .toLowerCase()
    .replace(/\s+/g, " ")
    .substring(0, 500)
    .trim();
  
  return createHash("md5").update(normalized).digest("hex").substring(0, 16);
}

/**
 * Vytvorí city-district kombináciu
 */
export function getCityDistrict(city: string, district: string): string {
  const normalizedDistrict = removeDiacritics(district).toLowerCase().replace(/\s+/g, "-");
  return `${city}-${normalizedDistrict}`;
}

// ============================================================================
// FINGERPRINT GENERÁTOR
// ============================================================================

export interface FingerprintData {
  addressNormalized: string;
  cityDistrict: string;
  areaRange: string;
  roomsRange: string | null;
  priceRange: string | null;
  floorRange: string | null;
  titleNormalized: string | null;
  descriptionHash: string | null;
  fingerprintHash: string;
}

/**
 * Vytvorí fingerprint pre nehnuteľnosť
 */
export function createFingerprint(property: {
  address: string;
  city: string;
  district: string;
  area_m2: number;
  rooms?: number | null;
  price: number;
  floor?: number | null;
  title: string;
  description?: string | null;
}): FingerprintData {
  const addressNormalized = normalizeAddress(property.address);
  const cityDistrict = getCityDistrict(property.city, property.district);
  const areaRange = getAreaRange(property.area_m2);
  const roomsRange = property.rooms ? property.rooms.toString() : null;
  const priceRange = getPriceRange(property.price);
  const floorRange = getFloorRange(property.floor);
  const titleNormalized = normalizeTitle(property.title);
  const descriptionHash = getDescriptionHash(property.description);
  
  // Vytvor hash z kľúčových hodnôt
  const hashInput = [
    cityDistrict,
    areaRange,
    roomsRange || "",
    addressNormalized.substring(0, 50),
  ].join("|");
  
  const fingerprintHash = createHash("md5").update(hashInput).digest("hex");
  
  return {
    addressNormalized,
    cityDistrict,
    areaRange,
    roomsRange,
    priceRange,
    floorRange,
    titleNormalized,
    descriptionHash,
    fingerprintHash,
  };
}

/**
 * Uloží fingerprint do databázy
 */
export async function saveFingerprint(
  propertyId: string,
  fingerprint: FingerprintData
): Promise<PropertyFingerprint> {
  return prisma.propertyFingerprint.upsert({
    where: { propertyId },
    update: {
      ...fingerprint,
      updatedAt: new Date(),
    },
    create: {
      propertyId,
      ...fingerprint,
    },
  });
}

/**
 * Vytvorí a uloží fingerprint pre nehnuteľnosť
 */
export async function generateAndSaveFingerprint(
  property: Property
): Promise<PropertyFingerprint> {
  const fingerprint = createFingerprint(property);
  return saveFingerprint(property.id, fingerprint);
}

/**
 * Generuje fingerprints pre všetky nehnuteľnosti bez fingerprint
 */
export async function generateMissingFingerprints(): Promise<number> {
  const propertiesWithoutFingerprint = await prisma.property.findMany({
    where: {
      fingerprint: null,
    },
    take: 100, // Batch po 100
  });

  let count = 0;
  for (const property of propertiesWithoutFingerprint) {
    await generateAndSaveFingerprint(property);
    count++;
  }

  return count;
}

// ============================================================================
// FUZZY MATCHING - Detekcia rovnakej nehnuteľnosti aj s miernymi zmenami
// ============================================================================

/**
 * Vypočíta Levenshtein distance medzi dvoma reťazcami
 * Používa sa pre fuzzy matching adries a názvov
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[b.length][a.length];
}

/**
 * Vypočíta similarity score (0-100) medzi dvoma reťazcami
 */
function stringSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 100;
  
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 100;
  
  const distance = levenshteinDistance(a, b);
  return Math.round((1 - distance / maxLen) * 100);
}

/**
 * Kontroluje či sú dve plochy podobné (tolerance ±2m² alebo ±3%)
 */
function isAreaSimilar(area1: number, area2: number): boolean {
  const diff = Math.abs(area1 - area2);
  const percentDiff = (diff / Math.max(area1, area2)) * 100;
  
  // Tolerance: ±2m² alebo ±3%
  return diff <= 2 || percentDiff <= 3;
}

/**
 * Generuje "core fingerprint" - najstabilnejšie hodnoty pre matching
 * Používa sa pre rýchle vyhľadávanie kandidátov
 */
export function generateCoreFingerprint(data: {
  city: string;
  district: string;
  area_m2: number;
  rooms?: number | null;
}): string {
  const city = removeDiacritics(data.city).toLowerCase().trim();
  const district = removeDiacritics(data.district || "").toLowerCase().trim();
  
  // Zaokrúhli plochu na 5m² (napr. 62.4 -> 60)
  const areaRounded = Math.round(data.area_m2 / 5) * 5;
  
  const rooms = data.rooms || "X";
  
  return `${city}|${district}|${areaRounded}|${rooms}`;
}

/**
 * Hľadá potenciálne zhody pre novú nehnuteľnosť
 * Vracia kandidátov zoradených podľa similarity score
 */
export async function findMatchCandidates(
  newProperty: {
    city: string;
    district: string;
    area_m2: number;
    rooms?: number | null;
    floor?: number | null;
    address: string;
    title: string;
    source: string;
    external_id?: string;
  },
  options: {
    minSimilarity?: number; // Minimálne skóre (default 70)
    maxCandidates?: number; // Max počet kandidátov (default 10)
    excludePropertyId?: string; // Vylúčiť konkrétne ID
  } = {}
): Promise<MatchCandidate[]> {
  const { minSimilarity = 70, maxCandidates = 10, excludePropertyId } = options;
  
  // 1. Hľadaj kandidátov podľa základných kritérií
  const candidates = await prisma.property.findMany({
    where: {
      city: { equals: newProperty.city, mode: "insensitive" },
      // Rozšírený rozsah plochy pre fuzzy match
      area_m2: {
        gte: newProperty.area_m2 - 5,
        lte: newProperty.area_m2 + 5,
      },
      // Rovnaký počet izieb (ak je známy)
      ...(newProperty.rooms ? { rooms: newProperty.rooms } : {}),
      // Vylúč rovnakú nehnuteľnosť
      ...(excludePropertyId ? { id: { not: excludePropertyId } } : {}),
    },
    include: {
      fingerprint: true,
    },
    take: 50, // Prefiltruj na 50 kandidátov
  });
  
  if (candidates.length === 0) {
    return [];
  }
  
  // 2. Vypočítaj similarity score pre každého kandidáta
  const scoredCandidates: MatchCandidate[] = [];
  
  for (const candidate of candidates) {
    let score = 0;
    const reasons: string[] = [];
    
    // Mesto (10 bodov)
    if (removeDiacritics(candidate.city).toLowerCase() === removeDiacritics(newProperty.city).toLowerCase()) {
      score += 10;
      reasons.push("Rovnaké mesto");
    }
    
    // Okres/Mestská časť (15 bodov)
    const districtSim = stringSimilarity(
      removeDiacritics(candidate.district).toLowerCase(),
      removeDiacritics(newProperty.district).toLowerCase()
    );
    if (districtSim >= 80) {
      score += 15;
      reasons.push(`Podobný okres (${districtSim}%)`);
    } else if (districtSim >= 50) {
      score += 8;
      reasons.push(`Čiastočne podobný okres (${districtSim}%)`);
    }
    
    // Plocha (25 bodov) - veľmi dôležité
    if (isAreaSimilar(candidate.area_m2, newProperty.area_m2)) {
      score += 25;
      reasons.push(`Podobná plocha (${candidate.area_m2}m² vs ${newProperty.area_m2}m²)`);
    } else {
      const areaDiff = Math.abs(candidate.area_m2 - newProperty.area_m2);
      if (areaDiff <= 5) {
        score += 15;
        reasons.push(`Blízka plocha (±${areaDiff.toFixed(1)}m²)`);
      }
    }
    
    // Izby (20 bodov)
    if (candidate.rooms && newProperty.rooms) {
      if (candidate.rooms === newProperty.rooms) {
        score += 20;
        reasons.push("Rovnaký počet izieb");
      }
    } else {
      score += 5; // Bonus ak nie je známe
    }
    
    // Poschodie (10 bodov)
    if (candidate.floor && newProperty.floor) {
      if (candidate.floor === newProperty.floor) {
        score += 10;
        reasons.push("Rovnaké poschodie");
      } else if (Math.abs(candidate.floor - newProperty.floor) === 1) {
        score += 5;
        reasons.push("Susedné poschodie");
      }
    }
    
    // Adresa (20 bodov) - fuzzy match
    const addressSim = stringSimilarity(
      normalizeAddress(candidate.address),
      normalizeAddress(newProperty.address)
    );
    if (addressSim >= 80) {
      score += 20;
      reasons.push(`Podobná adresa (${addressSim}%)`);
    } else if (addressSim >= 50) {
      score += 10;
      reasons.push(`Čiastočne podobná adresa (${addressSim}%)`);
    }
    
    // Normalizuj skóre na 0-100
    const normalizedScore = Math.min(100, score);
    
    if (normalizedScore >= minSimilarity) {
      scoredCandidates.push({
        propertyId: candidate.id,
        fingerprintHash: candidate.fingerprint?.fingerprintHash || "",
        similarityScore: normalizedScore,
        matchReasons: reasons,
      });
    }
  }
  
  // 3. Zoraď podľa skóre a vráť top N
  return scoredCandidates
    .sort((a, b) => b.similarityScore - a.similarityScore)
    .slice(0, maxCandidates);
}

/**
 * Hlavná funkcia pre matching - nájde najlepšiu zhodu alebo vytvorí novú
 * 
 * LOGIKA:
 * 1. Hľadaj existujúcu nehnuteľnosť podľa source + external_id (presná zhoda)
 * 2. Ak nenájdeš, hľadaj podľa fingerprint hash (rýchle)
 * 3. Ak nenájdeš, použi fuzzy matching (pomalšie ale presnejšie)
 * 4. Ak nájdeš zhodu s vysokým skóre (>85), označ ako re-listing
 */
export async function findBestMatch(
  newProperty: {
    source: string;
    external_id: string;
    city: string;
    district: string;
    area_m2: number;
    rooms?: number | null;
    floor?: number | null;
    address: string;
    title: string;
    description?: string | null;
    price: number;
  }
): Promise<MatchResult> {
  // 1. Presná zhoda podľa source + external_id
  const exactMatch = await prisma.property.findFirst({
    where: {
      source: newProperty.source as "BAZOS" | "NEHNUTELNOSTI" | "REALITY" | "TOPREALITY" | "MANUAL",
      external_id: newProperty.external_id,
    },
    select: { id: true, status: true, last_seen_at: true },
  });
  
  if (exactMatch) {
    const wasInactive = exactMatch.status === "REMOVED" || exactMatch.status === "INACTIVE" || exactMatch.status === "EXPIRED";
    const daysSinceLastSeen = exactMatch.last_seen_at 
      ? Math.floor((Date.now() - exactMatch.last_seen_at.getTime()) / (1000 * 60 * 60 * 24))
      : 0;
    
    return {
      isMatch: true,
      matchedPropertyId: exactMatch.id,
      similarityScore: 100,
      matchReasons: ["Presná zhoda (source + external_id)"],
      isReListing: wasInactive && daysSinceLastSeen > 7,
    };
  }
  
  // 2. Fingerprint hash match
  const fingerprint = createFingerprint({
    address: newProperty.address,
    city: newProperty.city,
    district: newProperty.district,
    area_m2: newProperty.area_m2,
    rooms: newProperty.rooms,
    price: newProperty.price,
    floor: newProperty.floor,
    title: newProperty.title,
    description: newProperty.description,
  });
  
  const fingerprintMatch = await prisma.propertyFingerprint.findFirst({
    where: {
      fingerprintHash: fingerprint.fingerprintHash,
    },
    include: {
      property: {
        select: { id: true, status: true, last_seen_at: true },
      },
    },
  });
  
  if (fingerprintMatch) {
    const wasInactive = fingerprintMatch.property.status === "REMOVED" || 
                        fingerprintMatch.property.status === "EXPIRED";
    const daysSinceLastSeen = fingerprintMatch.property.last_seen_at 
      ? Math.floor((Date.now() - fingerprintMatch.property.last_seen_at.getTime()) / (1000 * 60 * 60 * 24))
      : 0;
    
    return {
      isMatch: true,
      matchedPropertyId: fingerprintMatch.property.id,
      similarityScore: 95,
      matchReasons: ["Fingerprint hash match"],
      isReListing: wasInactive && daysSinceLastSeen > 7,
    };
  }
  
  // 3. Fuzzy matching
  const candidates = await findMatchCandidates(newProperty, {
    minSimilarity: 85, // Vysoká hranica pre automatické matching
  });
  
  if (candidates.length > 0) {
    const bestCandidate = candidates[0];
    
    // Získaj info o property
    const candidateProperty = await prisma.property.findUnique({
      where: { id: bestCandidate.propertyId },
      select: { status: true, last_seen_at: true },
    });
    
    const wasInactive = candidateProperty?.status === "REMOVED" || 
                        candidateProperty?.status === "EXPIRED";
    const daysSinceLastSeen = candidateProperty?.last_seen_at 
      ? Math.floor((Date.now() - candidateProperty.last_seen_at.getTime()) / (1000 * 60 * 60 * 24))
      : 0;
    
    return {
      isMatch: true,
      matchedPropertyId: bestCandidate.propertyId,
      similarityScore: bestCandidate.similarityScore,
      matchReasons: bestCandidate.matchReasons,
      isReListing: wasInactive && daysSinceLastSeen > 7,
    };
  }
  
  // 4. Žiadna zhoda - nová nehnuteľnosť
  return {
    isMatch: false,
    matchedPropertyId: null,
    similarityScore: 0,
    matchReasons: [],
    isReListing: false,
  };
}

/**
 * Zaznamenáva re-listing event do PropertyLifecycle
 */
export async function recordReListing(
  propertyId: string,
  newPrice: number,
  previousStatus: string
): Promise<void> {
  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    select: {
      external_id: true,
      source: true,
      city: true,
      district: true,
      title: true,
      price: true,
      area_m2: true,
      rooms: true,
      condition: true,
      listing_type: true,
      first_listed_at: true,
      last_seen_at: true,
    },
  });
  
  if (!property) return;
  
  const daysOffMarket = property.last_seen_at
    ? Math.floor((Date.now() - property.last_seen_at.getTime()) / (1000 * 60 * 60 * 24))
    : 0;
  
  console.log(`🔄 Re-listing detected: ${property.title}`);
  console.log(`   Previous status: ${previousStatus}`);
  console.log(`   Days off market: ${daysOffMarket}`);
  console.log(`   Price change: €${property.price} → €${newPrice}`);
  
  // Tu by sa dal pridať záznam do PropertyLifecycle alebo inej tabuľky
  // Pre teraz len logujeme
}

/**
 * Získa kompletný životný cyklus nehnuteľnosti pre zobrazenie v UI
 */
export async function getPropertyTimeline(propertyId: string): Promise<{
  priceHistory: { price: number; date: Date; changePercent: number | null }[];
  events: { type: string; date: Date; description: string }[];
  summary: {
    totalPriceChange: number;
    totalPriceChangePercent: number;
    daysOnMarket: number;
    priceDrops: number;
    reListings: number;
  };
}> {
  // Získaj price history
  const priceHistory = await prisma.priceHistory.findMany({
    where: { propertyId },
    orderBy: { recorded_at: "asc" },
  });
  
  // Získaj property info
  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    select: {
      price: true,
      first_listed_at: true,
      createdAt: true,
      status: true,
    },
  });
  
  if (!property) {
    return {
      priceHistory: [],
      events: [],
      summary: {
        totalPriceChange: 0,
        totalPriceChangePercent: 0,
        daysOnMarket: 0,
        priceDrops: 0,
        reListings: 0,
      },
    };
  }
  
  // Spracuj price history
  const formattedHistory = priceHistory.map((ph, index) => {
    const prevPrice = index > 0 ? priceHistory[index - 1].price : null;
    const changePercent = prevPrice 
      ? Math.round((ph.price - prevPrice) / prevPrice * 100 * 10) / 10
      : null;
    
    return {
      price: ph.price,
      date: ph.recorded_at,
      changePercent,
    };
  });
  
  // Vytvor eventy
  const events: { type: string; date: Date; description: string }[] = [];
  
  // Prvý listing
  const firstDate = property.first_listed_at || property.createdAt;
  const firstPrice = priceHistory.length > 0 ? priceHistory[0].price : property.price;
  events.push({
    type: "LISTED",
    date: firstDate,
    description: `Pridané za €${firstPrice.toLocaleString()}`,
  });
  
  // Zmeny cien
  for (let i = 1; i < priceHistory.length; i++) {
    const prev = priceHistory[i - 1];
    const curr = priceHistory[i];
    const diff = curr.price - prev.price;
    const diffPercent = Math.round(diff / prev.price * 100 * 10) / 10;
    
    events.push({
      type: diff < 0 ? "PRICE_DROP" : "PRICE_INCREASE",
      date: curr.recorded_at,
      description: diff < 0
        ? `Zľava ${Math.abs(diffPercent)}% (€${Math.abs(diff).toLocaleString()})`
        : `Navýšenie ${diffPercent}% (€${diff.toLocaleString()})`,
    });
  }
  
  // Štatistiky
  const originalPrice = priceHistory.length > 0 ? priceHistory[0].price : property.price;
  const currentPrice = property.price;
  const totalChange = currentPrice - originalPrice;
  const totalChangePercent = Math.round(totalChange / originalPrice * 100 * 10) / 10;
  const daysOnMarket = Math.floor((Date.now() - firstDate.getTime()) / (1000 * 60 * 60 * 24));
  const priceDrops = priceHistory.filter((ph, i) => i > 0 && ph.price < priceHistory[i - 1].price).length;
  
  return {
    priceHistory: formattedHistory,
    events,
    summary: {
      totalPriceChange: totalChange,
      totalPriceChangePercent: totalChangePercent,
      daysOnMarket,
      priceDrops,
      reListings: 0, // TODO: spočítať z lifecycle
    },
  };
}
