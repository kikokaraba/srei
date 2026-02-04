/**
 * AI-powered Property Valuation using Claude
 * 
 * Analyzuje podobné nehnuteľnosti v databáze a vytvára realistický odhad hodnoty
 */

import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";
import type { PropertyCondition } from "@/generated/prisma/client";
import { getNBSContextForPrompt } from "./nbs-context";

// Inicializácia Claude
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface PropertyInput {
  city: string;
  district?: string;
  area_m2: number;
  rooms?: number;
  floor?: number;
  condition: PropertyCondition;
  hasBalcony?: boolean;
  hasParking?: boolean;
  isNewBuilding?: boolean;
  additionalInfo?: string;
}

export interface ValuationResult {
  estimatedPrice: number;
  priceRange: {
    low: number;
    high: number;
  };
  pricePerM2: number;
  confidence: "low" | "medium" | "high";
  // Numerické confidence score (0-100)
  confidenceScore: number;
  confidenceFactors: {
    comparablesCount: { score: number; description: string }; // 0-30 bodov
    dataQuality: { score: number; description: string };       // 0-25 bodov
    locationMatch: { score: number; description: string };     // 0-25 bodov
    priceConsistency: { score: number; description: string };  // 0-20 bodov
  };
  comparables: {
    count: number;
    avgPrice: number;
    avgPricePerM2: number;
    priceRange: { min: number; max: number };
    // Nové metriky pre transparentnosť
    medianPrice: number;
    standardDeviation: number;
    coefficientOfVariation: number; // Ako veľmi sa líšia ceny (nižšie = spoľahlivejší odhad)
  };
  analysis: string;
  factors: {
    factor: string;
    impact: "positive" | "negative" | "neutral";
    description: string;
  }[];
  marketInsight: string;
  // Nové: varovanie ak je odhad nespoľahlivý
  warnings: string[];
}

/**
 * Nájde podobné nehnuteľnosti v databáze
 */
async function findComparableProperties(input: PropertyInput) {
  // Tolerancia pre plochu ±20%
  const areaMin = input.area_m2 * 0.8;
  const areaMax = input.area_m2 * 1.2;

  // Základný filter
  const where: Record<string, unknown> = {
    city: input.city,
    area_m2: { gte: areaMin, lte: areaMax },
    listing_type: "PREDAJ",
  };

  // Voliteľné filtre
  if (input.rooms) {
    where.rooms = { gte: input.rooms - 1, lte: input.rooms + 1 };
  }

  // Nájdi podobné nehnuteľnosti
  const comparables = await prisma.property.findMany({
    where,
    select: {
      id: true,
      title: true,
      price: true,
      area_m2: true,
      price_per_m2: true,
      rooms: true,
      floor: true,
      condition: true,
      district: true,
      days_on_market: true,
      is_distressed: true,
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return comparables;
}

/**
 * Vypočíta štandardnú odchýlku
 */
function calculateStdDev(values: number[], mean: number): number {
  if (values.length < 2) return 0;
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
  const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
  return Math.sqrt(avgSquaredDiff);
}

/**
 * Vypočíta štatistiky z porovnateľných nehnuteľností
 */
function calculateStats(comparables: { price: number; price_per_m2: number; area_m2: number; district?: string | null }[]) {
  if (comparables.length === 0) {
    return null;
  }

  const prices = comparables.map(c => c.price);
  const pricesPerM2 = comparables.map(c => c.price_per_m2);
  const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
  const avgPricePerM2 = pricesPerM2.reduce((a, b) => a + b, 0) / pricesPerM2.length;
  
  // Štandardná odchýlka a koeficient variácie
  const stdDev = calculateStdDev(prices, avgPrice);
  const coefficientOfVariation = avgPrice > 0 ? (stdDev / avgPrice) * 100 : 0;
  
  // Mediány
  const sortedPrices = [...prices].sort((a, b) => a - b);
  const sortedPricesPerM2 = [...pricesPerM2].sort((a, b) => a - b);
  const medianPrice = sortedPrices[Math.floor(sortedPrices.length / 2)];
  const medianPricePerM2 = sortedPricesPerM2[Math.floor(sortedPricesPerM2.length / 2)];

  return {
    count: comparables.length,
    avgPrice: Math.round(avgPrice),
    avgPricePerM2: Math.round(avgPricePerM2),
    medianPrice,
    medianPricePerM2,
    minPrice: Math.min(...prices),
    maxPrice: Math.max(...prices),
    minPricePerM2: Math.min(...pricesPerM2),
    maxPricePerM2: Math.max(...pricesPerM2),
    standardDeviation: Math.round(stdDev),
    coefficientOfVariation: Math.round(coefficientOfVariation * 10) / 10,
    // Pre location matching
    districts: [...new Set(comparables.map(c => c.district).filter(Boolean))],
  };
}

/**
 * Vypočíta confidence score (0-100) na základe kvality dát
 */
function calculateConfidenceScore(
  stats: ReturnType<typeof calculateStats>,
  input: PropertyInput
): {
  totalScore: number;
  level: "low" | "medium" | "high";
  factors: ValuationResult["confidenceFactors"];
  warnings: string[];
} {
  const warnings: string[] = [];
  
  if (!stats) {
    return {
      totalScore: 10,
      level: "low",
      factors: {
        comparablesCount: { score: 0, description: "Žiadne porovnateľné nehnuteľnosti" },
        dataQuality: { score: 5, description: "Nedostatok dát" },
        locationMatch: { score: 5, description: "Nemožno overiť lokalitu" },
        priceConsistency: { score: 0, description: "Nedostatok dát" },
      },
      warnings: ["Odhad je čisto teoretický - v databáze nie sú podobné nehnuteľnosti"],
    };
  }

  // 1. Počet comparables (0-30 bodov)
  let comparablesScore = 0;
  let comparablesDesc = "";
  if (stats.count >= 20) {
    comparablesScore = 30;
    comparablesDesc = `Výborné: ${stats.count} podobných nehnuteľností`;
  } else if (stats.count >= 10) {
    comparablesScore = 25;
    comparablesDesc = `Veľmi dobré: ${stats.count} podobných nehnuteľností`;
  } else if (stats.count >= 5) {
    comparablesScore = 18;
    comparablesDesc = `Dobré: ${stats.count} podobných nehnuteľností`;
  } else if (stats.count >= 3) {
    comparablesScore = 10;
    comparablesDesc = `Obmedzené: len ${stats.count} podobné nehnuteľnosti`;
    warnings.push("Málo porovnateľných nehnuteľností - odhad môže byť nepresný");
  } else {
    comparablesScore = 3;
    comparablesDesc = `Kriticky málo: len ${stats.count} nehnuteľnosť`;
    warnings.push("Veľmi málo dát - odhad je orientačný");
  }

  // 2. Kvalita dát - koeficient variácie (0-25 bodov)
  // Nízky CV = konzistentné ceny = spoľahlivejší odhad
  let dataQualityScore = 0;
  let dataQualityDesc = "";
  if (stats.coefficientOfVariation <= 10) {
    dataQualityScore = 25;
    dataQualityDesc = "Ceny sú veľmi konzistentné";
  } else if (stats.coefficientOfVariation <= 20) {
    dataQualityScore = 20;
    dataQualityDesc = "Ceny sú pomerne konzistentné";
  } else if (stats.coefficientOfVariation <= 35) {
    dataQualityScore = 12;
    dataQualityDesc = "Ceny sa líšia výrazne";
    warnings.push("Veľký rozptyl cien v danej lokalite");
  } else {
    dataQualityScore = 5;
    dataQualityDesc = "Extrémny rozptyl cien";
    warnings.push("Extrémne rozdielne ceny - trh je nepredvídateľný");
  }

  // 3. Location match (0-25 bodov)
  let locationScore = 0;
  let locationDesc = "";
  const sameDistrict = stats.districts?.includes(input.district || "");
  if (sameDistrict && stats.count >= 5) {
    locationScore = 25;
    locationDesc = `Presná zhoda okresu ${input.district}`;
  } else if (sameDistrict) {
    locationScore = 18;
    locationDesc = `Zhoda okresu, ale málo dát`;
  } else if (stats.count >= 10) {
    locationScore = 15;
    locationDesc = "Dáta z celého mesta";
  } else {
    locationScore = 8;
    locationDesc = "Obmedzená zhoda lokality";
  }

  // 4. Price consistency - rozdiel medzi priemerom a mediánom (0-20 bodov)
  let priceConsistencyScore = 0;
  let priceConsistencyDesc = "";
  const priceDiff = Math.abs(stats.avgPrice - stats.medianPrice) / stats.avgPrice * 100;
  if (priceDiff <= 5) {
    priceConsistencyScore = 20;
    priceConsistencyDesc = "Priemer a medián sú takmer zhodné";
  } else if (priceDiff <= 15) {
    priceConsistencyScore = 15;
    priceConsistencyDesc = "Mierne rozdiely v cenách";
  } else if (priceDiff <= 30) {
    priceConsistencyScore = 8;
    priceConsistencyDesc = "Výrazné rozdiely - možné outliers";
    warnings.push("Niektoré ceny sa výrazne líšia od priemeru");
  } else {
    priceConsistencyScore = 3;
    priceConsistencyDesc = "Extrémne outliers v dátach";
    warnings.push("Dáta obsahujú extrémne hodnoty");
  }

  const totalScore = comparablesScore + dataQualityScore + locationScore + priceConsistencyScore;
  const level = totalScore >= 70 ? "high" : totalScore >= 40 ? "medium" : "low";

  return {
    totalScore,
    level,
    factors: {
      comparablesCount: { score: comparablesScore, description: comparablesDesc },
      dataQuality: { score: dataQualityScore, description: dataQualityDesc },
      locationMatch: { score: locationScore, description: locationDesc },
      priceConsistency: { score: priceConsistencyScore, description: priceConsistencyDesc },
    },
    warnings,
  };
}

/**
 * Hlavná funkcia pre AI valuáciu
 */
export async function getAIValuation(input: PropertyInput): Promise<ValuationResult> {
  // 1. Nájdi podobné nehnuteľnosti
  const comparables = await findComparableProperties(input);
  const stats = calculateStats(comparables);
  
  // 2. Vypočítaj confidence score
  const confidence = calculateConfidenceScore(stats, input);

  // 2. Priprav kontext pre Claude
  const conditionLabels: Record<PropertyCondition, string> = {
    POVODNY: "pôvodný stav",
    REKONSTRUKCIA: "po rekonštrukcii",
    NOVOSTAVBA: "novostavba",
  };

  const cityLabels: Record<string, string> = {
    BRATISLAVA: "Bratislava",
    KOSICE: "Košice",
    PRESOV: "Prešov",
    ZILINA: "Žilina",
    BANSKA_BYSTRICA: "Banská Bystrica",
    TRNAVA: "Trnava",
    TRENCIN: "Trenčín",
    NITRA: "Nitra",
  };

  const propertyDescription = `
Nehnuteľnosť na ocenenie:
- Mesto: ${cityLabels[input.city] || input.city}
- Okres/Časť: ${input.district || "neuvedené"}
- Plocha: ${input.area_m2} m²
- Počet izieb: ${input.rooms || "neuvedené"}
- Poschodie: ${input.floor !== undefined ? input.floor : "neuvedené"}
- Stav: ${conditionLabels[input.condition]}
- Balkón/Terasa: ${input.hasBalcony ? "áno" : "nie/neuvedené"}
- Parkovanie: ${input.hasParking ? "áno" : "nie/neuvedené"}
- Novostavba: ${input.isNewBuilding ? "áno" : "nie"}
${input.additionalInfo ? `- Ďalšie info: ${input.additionalInfo}` : ""}
  `.trim();

  const comparablesDescription = stats ? `
Porovnateľné nehnuteľnosti v databáze (${stats.count} inzerátov):
- Priemerná cena: €${stats.avgPrice.toLocaleString()}
- Mediánová cena: €${stats.medianPrice.toLocaleString()}
- Cenový rozsah: €${stats.minPrice.toLocaleString()} - €${stats.maxPrice.toLocaleString()}
- Priemerná cena za m²: €${stats.avgPricePerM2.toLocaleString()}/m²
- Rozsah ceny za m²: €${stats.minPricePerM2.toLocaleString()} - €${stats.maxPricePerM2.toLocaleString()}/m²

Vzorka porovnateľných nehnuteľností:
${comparables.slice(0, 10).map(c => 
  `- ${c.title}: €${c.price.toLocaleString()} (${c.area_m2}m², €${c.price_per_m2}/m², ${conditionLabels[c.condition]}, ${c.district})`
).join("\n")}
  `.trim() : "Žiadne porovnateľné nehnuteľnosti v databáze.";

  // 3. NBS kontext (makro dáta)
  const nbsContext = await getNBSContextForPrompt();

  // 4. Zavolaj Claude pre analýzu
  const prompt = `Si expert na slovenský realitný trh. Na základe poskytnutých dát urč realistickú trhovú hodnotu nehnuteľnosti.

${propertyDescription}

${comparablesDescription}
${nbsContext ? `\n${nbsContext}\n` : ""}

Vytvor detailnú analýzu a odhad ceny. Odpovedz PRESNE v tomto JSON formáte (bez markdown, len čistý JSON):
{
  "estimatedPrice": <číslo - odhadovaná cena v EUR>,
  "priceLow": <číslo - dolná hranica odhadu>,
  "priceHigh": <číslo - horná hranica odhadu>,
  "confidence": "<low|medium|high>",
  "analysis": "<2-3 vety vysvetľujúce odhad>",
  "factors": [
    {"factor": "<názov faktora>", "impact": "<positive|negative|neutral>", "description": "<krátky popis>"}
  ],
  "marketInsight": "<1-2 vety o aktuálnom trhu v danej lokalite>"
}

Pravidlá:
1. Cena musí byť realistická pre slovenský trh v roku 2026
2. Zohľadni stav (novostavba je drahšia ako pôvodný stav)
3. Zohľadni lokalitu (Bratislava > Košice > menšie mestá)
4. Ak nie sú porovnateľné dáta, použi štandardné trhové ceny pre danú lokalitu
5. Confidence je "high" ak máš 10+ comparables, "medium" pre 3-9, "low" pre menej`;

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [
        { role: "user", content: prompt }
      ],
    });

    // Parsuj odpoveď
    const responseText = message.content[0].type === "text" ? message.content[0].text : "";
    
    // Odstráň prípadné markdown značky
    const jsonText = responseText.replace(/```json\n?|\n?```/g, "").trim();
    const aiResponse = JSON.parse(jsonText);

    // Zostav výsledok
    const pricePerM2 = Math.round(aiResponse.estimatedPrice / input.area_m2);

    return {
      estimatedPrice: aiResponse.estimatedPrice,
      priceRange: {
        low: aiResponse.priceLow,
        high: aiResponse.priceHigh,
      },
      pricePerM2,
      confidence: confidence.level, // Použijeme náš výpočet
      confidenceScore: confidence.totalScore,
      confidenceFactors: confidence.factors,
      comparables: stats ? {
        count: stats.count,
        avgPrice: stats.avgPrice,
        avgPricePerM2: stats.avgPricePerM2,
        priceRange: { min: stats.minPrice, max: stats.maxPrice },
        medianPrice: stats.medianPrice,
        standardDeviation: stats.standardDeviation,
        coefficientOfVariation: stats.coefficientOfVariation,
      } : {
        count: 0,
        avgPrice: 0,
        avgPricePerM2: 0,
        priceRange: { min: 0, max: 0 },
        medianPrice: 0,
        standardDeviation: 0,
        coefficientOfVariation: 0,
      },
      analysis: aiResponse.analysis,
      factors: aiResponse.factors || [],
      marketInsight: aiResponse.marketInsight,
      warnings: confidence.warnings,
    };
  } catch (error) {
    console.error("AI Valuation error:", error);
    
    // Fallback - jednoduchý výpočet bez AI
    if (stats) {
      const adjustedPrice = stats.avgPricePerM2 * input.area_m2;
      const conditionMultiplier = input.condition === "NOVOSTAVBA" ? 1.15 : input.condition === "REKONSTRUKCIA" ? 1.0 : 0.85;
      const estimatedPrice = Math.round(adjustedPrice * conditionMultiplier);

      return {
        estimatedPrice,
        priceRange: {
          low: Math.round(estimatedPrice * 0.9),
          high: Math.round(estimatedPrice * 1.1),
        },
        pricePerM2: Math.round(estimatedPrice / input.area_m2),
        confidence: confidence.level,
        confidenceScore: Math.max(confidence.totalScore - 15, 10), // Znížime za nedostupnosť AI
        confidenceFactors: confidence.factors,
        comparables: {
          count: stats.count,
          avgPrice: stats.avgPrice,
          avgPricePerM2: stats.avgPricePerM2,
          priceRange: { min: stats.minPrice, max: stats.maxPrice },
          medianPrice: stats.medianPrice,
          standardDeviation: stats.standardDeviation,
          coefficientOfVariation: stats.coefficientOfVariation,
        },
        analysis: `Odhad na základe ${stats.count} podobných nehnuteľností v ${cityLabels[input.city] || input.city}. Priemerná cena za m² je €${stats.avgPricePerM2}.`,
        factors: [
          { factor: "Stav", impact: input.condition === "NOVOSTAVBA" ? "positive" : input.condition === "POVODNY" ? "negative" : "neutral", description: conditionLabels[input.condition] },
        ],
        marketInsight: "Odhad vypočítaný algoritmicky (AI nedostupná).",
        warnings: [...confidence.warnings, "AI analýza nebola dostupná - použitý algoritmus"],
      };
    }

    throw new Error("Nedostatok dát pre odhad hodnoty");
  }
}
