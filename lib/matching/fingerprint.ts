/**
 * Property Fingerprint Generator
 * Generuje unikátny fingerprint pre každú nehnuteľnosť pre matching duplicít
 */

import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import type { Property, PropertyFingerprint, SlovakCity } from "@/generated/prisma/client";

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
export function getCityDistrict(city: SlovakCity, district: string): string {
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
  city: SlovakCity;
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
