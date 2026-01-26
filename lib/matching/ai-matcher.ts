/**
 * AI-Powered Property Matching
 * Používa LLM pre inteligentné porovnanie nehnuteľností
 */

import type { Property } from "@/generated/prisma";
import { normalizeAddress, normalizeTitle, removeDiacritics } from "./fingerprint";

// ============================================================================
// TYPY
// ============================================================================

export interface AIMatchResult {
  isMatch: boolean;
  confidence: number; // 0-100
  reasons: string[];
  details: {
    addressSimilarity: number;
    titleSimilarity: number;
    descriptionSimilarity: number;
    priceSimilarity: number;
    areaSimilarity: number;
  };
}

export interface PropertyComparisonInput {
  property1: {
    title: string;
    description: string | null;
    address: string;
    price: number;
    areaM2: number;
    rooms: number | null;
    city: string;
    district: string;
  };
  property2: {
    title: string;
    description: string | null;
    address: string;
    price: number;
    areaM2: number;
    rooms: number | null;
    city: string;
    district: string;
  };
}

// ============================================================================
// SIMILARITY FUNKCIE
// ============================================================================

/**
 * Jaccard similarity pre množiny slov
 */
function jaccardSimilarity(set1: Set<string>, set2: Set<string>): number {
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  
  if (union.size === 0) return 0;
  return intersection.size / union.size;
}

/**
 * Tokenizuje text na slová
 */
function tokenize(text: string): Set<string> {
  const normalized = removeDiacritics(text).toLowerCase();
  const words = normalized.match(/\b\w{3,}\b/g) || [];
  return new Set(words);
}

/**
 * Cosine similarity pre dva vektory slov
 */
function textSimilarity(text1: string, text2: string): number {
  if (!text1 || !text2) return 0;
  
  const tokens1 = tokenize(text1);
  const tokens2 = tokenize(text2);
  
  return Math.round(jaccardSimilarity(tokens1, tokens2) * 100);
}

/**
 * Porovná dve čísla s toleranciou
 */
function numberSimilarity(num1: number, num2: number, tolerance: number = 0.1): number {
  if (num1 === num2) return 100;
  if (num1 === 0 || num2 === 0) return 0;
  
  const diff = Math.abs(num1 - num2);
  const avg = (num1 + num2) / 2;
  const percentDiff = diff / avg;
  
  if (percentDiff <= tolerance) {
    return Math.round((1 - percentDiff / tolerance) * 100);
  }
  
  return Math.max(0, Math.round((1 - percentDiff) * 100));
}

// ============================================================================
// AI MATCHING (bez externého API)
// ============================================================================

/**
 * Lokálny AI matcher - používa heuristiky bez externého API
 * Môže byť neskôr rozšírený o skutočné AI API
 */
export function analyzeMatch(input: PropertyComparisonInput): AIMatchResult {
  const { property1, property2 } = input;
  
  // 1. Porovnaj adresy
  const addr1 = normalizeAddress(property1.address);
  const addr2 = normalizeAddress(property2.address);
  const addressSimilarity = textSimilarity(addr1, addr2);
  
  // 2. Porovnaj názvy
  const title1 = normalizeTitle(property1.title);
  const title2 = normalizeTitle(property2.title);
  const titleSimilarity = textSimilarity(title1, title2);
  
  // 3. Porovnaj popisy
  const descriptionSimilarity = textSimilarity(
    property1.description || "",
    property2.description || ""
  );
  
  // 4. Porovnaj ceny (tolerancia 15%)
  const priceSimilarity = numberSimilarity(property1.price, property2.price, 0.15);
  
  // 5. Porovnaj plochu (tolerancia 5%)
  const areaSimilarity = numberSimilarity(property1.areaM2, property2.areaM2, 0.05);
  
  // Vypočítaj váhované skóre
  const weights = {
    address: 0.25,
    title: 0.15,
    description: 0.10,
    price: 0.20,
    area: 0.30,
  };
  
  const weightedScore = 
    addressSimilarity * weights.address +
    titleSimilarity * weights.title +
    descriptionSimilarity * weights.description +
    priceSimilarity * weights.price +
    areaSimilarity * weights.area;
  
  // Bonusy
  let bonusScore = 0;
  const reasons: string[] = [];
  
  // Bonus za rovnaké mesto a okres
  if (property1.city === property2.city) {
    bonusScore += 10;
    reasons.push("Rovnaké mesto");
    
    if (property1.district.toLowerCase() === property2.district.toLowerCase()) {
      bonusScore += 10;
      reasons.push("Rovnaký okres");
    }
  }
  
  // Bonus za rovnaký počet izieb
  if (property1.rooms && property2.rooms && property1.rooms === property2.rooms) {
    bonusScore += 10;
    reasons.push("Rovnaký počet izieb");
  }
  
  // Penalizácie
  let penaltyScore = 0;
  
  // Penalizácia za veľmi rozdielnu cenu (>30%)
  if (priceSimilarity < 50) {
    penaltyScore += 15;
    reasons.push("Výrazne rozdielna cena");
  }
  
  // Penalizácia za veľmi rozdielnu plochu (>15%)
  if (areaSimilarity < 70) {
    penaltyScore += 20;
    reasons.push("Výrazne rozdielna plocha");
  }
  
  // Finálne skóre
  const confidence = Math.min(100, Math.max(0, Math.round(weightedScore + bonusScore - penaltyScore)));
  
  // Určenie či ide o match
  const isMatch = confidence >= 70;
  
  // Pridaj pozitívne dôvody
  if (addressSimilarity > 60) reasons.push(`Podobná adresa (${addressSimilarity}%)`);
  if (areaSimilarity > 90) reasons.push(`Zhodná plocha (${areaSimilarity}%)`);
  if (priceSimilarity > 80) reasons.push(`Podobná cena (${priceSimilarity}%)`);
  if (titleSimilarity > 50) reasons.push(`Podobný názov (${titleSimilarity}%)`);
  
  return {
    isMatch,
    confidence,
    reasons,
    details: {
      addressSimilarity,
      titleSimilarity,
      descriptionSimilarity,
      priceSimilarity,
      areaSimilarity,
    },
  };
}

/**
 * Porovná dve nehnuteľnosti pomocou AI
 */
export async function comparePropertiesWithAI(
  property1: Property,
  property2: Property
): Promise<AIMatchResult> {
  const input: PropertyComparisonInput = {
    property1: {
      title: property1.title,
      description: property1.description,
      address: property1.address,
      price: property1.price,
      areaM2: property1.area_m2,
      rooms: property1.rooms,
      city: property1.city,
      district: property1.district,
    },
    property2: {
      title: property2.title,
      description: property2.description,
      address: property2.address,
      price: property2.price,
      areaM2: property2.area_m2,
      rooms: property2.rooms,
      city: property2.city,
      district: property2.district,
    },
  };
  
  return analyzeMatch(input);
}

/**
 * Batch analýza - porovná nehnuteľnosť s viacerými kandidátmi
 */
export async function batchCompare(
  sourceProperty: Property,
  candidates: Property[]
): Promise<Array<{ property: Property; result: AIMatchResult }>> {
  const results: Array<{ property: Property; result: AIMatchResult }> = [];
  
  for (const candidate of candidates) {
    const result = await comparePropertiesWithAI(sourceProperty, candidate);
    results.push({ property: candidate, result });
  }
  
  // Zoraď podľa confidence
  results.sort((a, b) => b.result.confidence - a.result.confidence);
  
  return results;
}

// ============================================================================
// OPENAI INTEGRATION (voliteľné)
// ============================================================================

/**
 * Porovnanie pomocou OpenAI API
 * Vyžaduje OPENAI_API_KEY v .env
 */
export async function compareWithOpenAI(
  property1: Property,
  property2: Property
): Promise<AIMatchResult | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    console.warn("OpenAI API key not configured, using local matching");
    return null;
  }
  
  try {
    const prompt = `
Porovnaj tieto dve nehnuteľnosti a urči, či ide o rovnakú nehnuteľnosť inzerovanú na rôznych portáloch.

Nehnuteľnosť 1:
- Názov: ${property1.title}
- Adresa: ${property1.address}, ${property1.district}, ${property1.city}
- Cena: ${property1.price} €
- Plocha: ${property1.area_m2} m²
- Izby: ${property1.rooms || "neuvedené"}
- Popis: ${property1.description?.substring(0, 300) || "neuvedené"}

Nehnuteľnosť 2:
- Názov: ${property2.title}
- Adresa: ${property2.address}, ${property2.district}, ${property2.city}
- Cena: ${property2.price} €
- Plocha: ${property2.area_m2} m²
- Izby: ${property2.rooms || "neuvedené"}
- Popis: ${property2.description?.substring(0, 300) || "neuvedené"}

Odpovedz v JSON formáte:
{
  "isMatch": true/false,
  "confidence": 0-100,
  "reasons": ["dôvod 1", "dôvod 2", ...]
}
`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: "Si expert na slovenský realitný trh. Analyzuješ nehnuteľnosti a určuješ, či ide o duplicitné inzeráty." },
          { role: "user", content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;
    
    if (!content) {
      throw new Error("Empty response from OpenAI");
    }

    // Parse JSON z odpovede
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Could not parse JSON from OpenAI response");
    }

    const result = JSON.parse(jsonMatch[0]);
    
    return {
      isMatch: result.isMatch,
      confidence: result.confidence,
      reasons: result.reasons || [],
      details: {
        addressSimilarity: 0,
        titleSimilarity: 0,
        descriptionSimilarity: 0,
        priceSimilarity: 0,
        areaSimilarity: 0,
      },
    };
  } catch (error) {
    console.error("OpenAI matching error:", error);
    return null;
  }
}

/**
 * Hybridný matching - skúsi OpenAI, fallback na lokálny
 */
export async function hybridMatch(
  property1: Property,
  property2: Property
): Promise<AIMatchResult> {
  // Skús OpenAI ak je dostupný
  const openAIResult = await compareWithOpenAI(property1, property2);
  
  if (openAIResult) {
    return openAIResult;
  }
  
  // Fallback na lokálny matching
  return comparePropertiesWithAI(property1, property2);
}
