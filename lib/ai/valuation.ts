/**
 * AI-powered Property Valuation using Claude
 * 
 * Analyzuje podobné nehnuteľnosti v databáze a vytvára realistický odhad hodnoty
 */

import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";
import type { PropertyCondition } from "@/generated/prisma/client";

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
  comparables: {
    count: number;
    avgPrice: number;
    avgPricePerM2: number;
    priceRange: { min: number; max: number };
  };
  analysis: string;
  factors: {
    factor: string;
    impact: "positive" | "negative" | "neutral";
    description: string;
  }[];
  marketInsight: string;
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
 * Vypočíta štatistiky z porovnateľných nehnuteľností
 */
function calculateStats(comparables: { price: number; price_per_m2: number; area_m2: number }[]) {
  if (comparables.length === 0) {
    return null;
  }

  const prices = comparables.map(c => c.price);
  const pricesPerM2 = comparables.map(c => c.price_per_m2);

  return {
    count: comparables.length,
    avgPrice: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length),
    avgPricePerM2: Math.round(pricesPerM2.reduce((a, b) => a + b, 0) / pricesPerM2.length),
    medianPrice: prices.sort((a, b) => a - b)[Math.floor(prices.length / 2)],
    medianPricePerM2: pricesPerM2.sort((a, b) => a - b)[Math.floor(pricesPerM2.length / 2)],
    minPrice: Math.min(...prices),
    maxPrice: Math.max(...prices),
    minPricePerM2: Math.min(...pricesPerM2),
    maxPricePerM2: Math.max(...pricesPerM2),
  };
}

/**
 * Hlavná funkcia pre AI valuáciu
 */
export async function getAIValuation(input: PropertyInput): Promise<ValuationResult> {
  // 1. Nájdi podobné nehnuteľnosti
  const comparables = await findComparableProperties(input);
  const stats = calculateStats(comparables);

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

  // 3. Zavolaj Claude pre analýzu
  const prompt = `Si expert na slovenský realitný trh. Na základe poskytnutých dát urč realistickú trhovú hodnotu nehnuteľnosti.

${propertyDescription}

${comparablesDescription}

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
      confidence: aiResponse.confidence,
      comparables: stats ? {
        count: stats.count,
        avgPrice: stats.avgPrice,
        avgPricePerM2: stats.avgPricePerM2,
        priceRange: { min: stats.minPrice, max: stats.maxPrice },
      } : {
        count: 0,
        avgPrice: 0,
        avgPricePerM2: 0,
        priceRange: { min: 0, max: 0 },
      },
      analysis: aiResponse.analysis,
      factors: aiResponse.factors || [],
      marketInsight: aiResponse.marketInsight,
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
        confidence: "low",
        comparables: {
          count: stats.count,
          avgPrice: stats.avgPrice,
          avgPricePerM2: stats.avgPricePerM2,
          priceRange: { min: stats.minPrice, max: stats.maxPrice },
        },
        analysis: `Odhad na základe ${stats.count} podobných nehnuteľností v ${cityLabels[input.city] || input.city}. Priemerná cena za m² je €${stats.avgPricePerM2}.`,
        factors: [
          { factor: "Stav", impact: input.condition === "NOVOSTAVBA" ? "positive" : input.condition === "POVODNY" ? "negative" : "neutral", description: conditionLabels[input.condition] },
        ],
        marketInsight: "Odhad vypočítaný algoritmicky (AI nedostupná).",
      };
    }

    throw new Error("Nedostatok dát pre odhad hodnoty");
  }
}
