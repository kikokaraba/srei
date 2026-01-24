// Property Matching Algorithm
// Rozpoznáva rovnaké/podobné nehnuteľnosti na základe adresy, plochy a iných atribútov

import { createHash } from "crypto";

// Normalizácia textu - odstráni diakritiku, lowercase
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Odstráni diakritiku
    .replace(/[^\w\s]/g, "") // Odstráni špeciálne znaky
    .replace(/\s+/g, " ") // Zjednotí medzery
    .trim();
}

// Normalizácia adresy
export function normalizeAddress(address: string): string {
  let normalized = normalizeText(address);
  
  // Odstráni bežné slová
  const removeWords = ["ulica", "ul", "namestie", "nam", "trieda", "tr"];
  removeWords.forEach((word) => {
    normalized = normalized.replace(new RegExp(`\\b${word}\\b`, "g"), "");
  });
  
  return normalized.replace(/\s+/g, " ").trim();
}

// Vytvorí range pre plochu (zaokrúhlené na desiatky)
export function getAreaRange(area: number): string {
  const lower = Math.floor(area / 10) * 10;
  const upper = lower + 10;
  return `${lower}-${upper}`;
}

// Vytvorí fingerprint hash
export function createFingerprintHash(
  addressNormalized: string,
  cityDistrict: string,
  areaRange: string,
  rooms: number | null
): string {
  const data = `${addressNormalized}|${cityDistrict}|${areaRange}|${rooms || "any"}`;
  return createHash("md5").update(data).digest("hex");
}

// Vypočíta skóre zhody medzi dvoma nehnuteľnosťami
export function calculateMatchScore(
  property1: {
    address: string;
    city: string;
    district: string;
    area_m2: number;
    rooms: number | null;
    price: number;
  },
  property2: {
    address: string;
    city: string;
    district: string;
    area_m2: number;
    rooms: number | null;
    price: number;
  }
): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];
  
  // Mesto a okres (povinné)
  if (property1.city !== property2.city) {
    return { score: 0, reasons: ["Rôzne mestá"] };
  }
  score += 20;
  reasons.push("Rovnaké mesto");
  
  if (property1.district === property2.district) {
    score += 15;
    reasons.push("Rovnaký okres");
  }
  
  // Adresa (fuzzy match)
  const addr1 = normalizeAddress(property1.address);
  const addr2 = normalizeAddress(property2.address);
  
  if (addr1 === addr2) {
    score += 40;
    reasons.push("Rovnaká adresa");
  } else if (addr1.includes(addr2) || addr2.includes(addr1)) {
    score += 25;
    reasons.push("Podobná adresa");
  } else {
    // Levenshtein distance by bolo lepšie, ale pre jednoduchosť použijeme overlap
    const words1 = addr1.split(" ");
    const words2 = addr2.split(" ");
    const overlap = words1.filter((w) => words2.includes(w)).length;
    const maxWords = Math.max(words1.length, words2.length);
    if (overlap / maxWords > 0.5) {
      score += 15;
      reasons.push("Čiastočne podobná adresa");
    }
  }
  
  // Plocha (±10%)
  const areaDiff = Math.abs(property1.area_m2 - property2.area_m2) / property1.area_m2;
  if (areaDiff < 0.05) {
    score += 15;
    reasons.push("Rovnaká plocha (±5%)");
  } else if (areaDiff < 0.1) {
    score += 10;
    reasons.push("Podobná plocha (±10%)");
  }
  
  // Izby
  if (property1.rooms !== null && property2.rooms !== null) {
    if (property1.rooms === property2.rooms) {
      score += 10;
      reasons.push("Rovnaký počet izieb");
    }
  }
  
  return { score, reasons };
}

// Detekuje zmeny medzi dvoma snímkami
export function detectChanges(
  oldSnapshot: {
    price: number;
    description: string | null;
    photos: string[];
  },
  newData: {
    price: number;
    description: string | null;
    photos: string[];
  }
): {
  priceChange: number | null;
  priceChangePercent: number | null;
  photosChanged: boolean;
  descriptionChanged: boolean;
} {
  // Zmena ceny
  const priceChange = newData.price - oldSnapshot.price;
  const priceChangePercent = oldSnapshot.price > 0 
    ? (priceChange / oldSnapshot.price) * 100 
    : null;
  
  // Zmena fotiek (porovnanie URL)
  const oldPhotos = new Set(oldSnapshot.photos);
  const newPhotos = new Set(newData.photos);
  const photosChanged = 
    oldPhotos.size !== newPhotos.size ||
    [...oldPhotos].some((p) => !newPhotos.has(p));
  
  // Zmena popisu
  const descriptionChanged = 
    normalizeText(oldSnapshot.description || "") !== 
    normalizeText(newData.description || "");
  
  return {
    priceChange: priceChange !== 0 ? priceChange : null,
    priceChangePercent: priceChange !== 0 ? priceChangePercent : null,
    photosChanged,
    descriptionChanged,
  };
}
