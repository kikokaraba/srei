/**
 * AI Investment Advisor
 * Analyzes market and recommends best investment opportunities
 */

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface InvestmentCriteria {
  budget: number;
  investmentType: "RENTAL_YIELD" | "CAPITAL_GROWTH" | "FLIP" | "BALANCED";
  riskTolerance: "LOW" | "MEDIUM" | "HIGH";
  preferredCities?: string[];
  minYield?: number;
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const criteria: InvestmentCriteria = await request.json();

    // Get properties within budget
    const maxPrice = criteria.budget * 1.1; // 10% tolerance
    const minPrice = criteria.budget * 0.5; // Don't show too cheap

    const properties = await prisma.property.findMany({
      where: {
        price: { gte: minPrice, lte: maxPrice },
        listing_type: "PREDAJ",
        ...(criteria.preferredCities?.length ? { city: { in: criteria.preferredCities as string[] } } : {}),
      },
      include: {
        investmentMetrics: true,
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    // Calculate investment scores
    const scoredProperties = properties.map(p => {
      let score = 0;
      const factors: string[] = [];

      // Hot deal bonus
      if (p.is_distressed) {
        score += 25;
        factors.push("Pod trhovou cenou");
      }

      // Yield score (if rental investment)
      if (p.investmentMetrics) {
        const grossYield = p.investmentMetrics.gross_yield;
        if (grossYield >= 6) {
          score += 30;
          factors.push(`Vysoký výnos ${grossYield.toFixed(1)}%`);
        } else if (grossYield >= 4) {
          score += 15;
          factors.push(`Dobrý výnos ${grossYield.toFixed(1)}%`);
        }
      }

      // Condition score
      if (p.condition === "NOVOSTAVBA") {
        score += 10;
        factors.push("Novostavba - menej opráv");
      } else if (p.condition === "REKONSTRUKCIA") {
        score += 5;
        factors.push("Zrekonštruované");
      }

      // Price per m2 vs average
      if (p.price_per_m2 < 2500 && p.city === "BRATISLAVA") {
        score += 15;
        factors.push("Dobrá cena za m²");
      } else if (p.price_per_m2 < 1800 && p.city === "KOSICE") {
        score += 15;
        factors.push("Dobrá cena za m²");
      }

      // Time on market
      if (p.days_on_market < 7) {
        score += 10;
        factors.push("Nový inzerát");
      }

      return {
        ...p,
        investmentScore: score,
        investmentFactors: factors,
      };
    });

    // Sort by score
    const topProperties = scoredProperties
      .sort((a, b) => b.investmentScore - a.investmentScore)
      .slice(0, 10);

    // Get AI analysis
    const investmentTypeLabels = {
      RENTAL_YIELD: "prenájom a pasívny príjem",
      CAPITAL_GROWTH: "dlhodobý rast hodnoty",
      FLIP: "rýchla rekonštrukcia a predaj",
      BALANCED: "vyvážená stratégia",
    };

    const riskLabels = {
      LOW: "nízka (preferujem istotu)",
      MEDIUM: "stredná (akceptujem rozumné riziko)",
      HIGH: "vysoká (hľadám maximálny výnos)",
    };

    const prompt = `Analyzuj tieto investičné príležitosti pre klienta:

KRITÉRIÁ KLIENTA:
- Rozpočet: €${criteria.budget.toLocaleString()}
- Investičný cieľ: ${investmentTypeLabels[criteria.investmentType]}
- Tolerancia rizika: ${riskLabels[criteria.riskTolerance]}
${criteria.minYield ? `- Minimálny požadovaný výnos: ${criteria.minYield}%` : ""}
${criteria.preferredCities?.length ? `- Preferované mestá: ${criteria.preferredCities.join(", ")}` : ""}

TOP 5 NEHNUTEĽNOSTÍ (podľa skóre):
${topProperties.slice(0, 5).map((p, i) => `
${i + 1}. ${p.title}
   - Cena: €${p.price.toLocaleString()} (€${p.price_per_m2}/m²)
   - Lokalita: ${p.district}, ${p.city}
   - Plocha: ${p.area_m2}m², ${p.rooms || "?"} izby
   - Stav: ${p.condition}
   - Skóre: ${p.investmentScore}/100
   - Faktory: ${p.investmentFactors.join(", ") || "žiadne špeciálne"}
`).join("")}

Vytvor JSON odpoveď s odporúčaniami:
{
  "topPick": {
    "index": <číslo 1-5>,
    "reason": "<prečo je to najlepšia voľba pre klienta, 2-3 vety>"
  },
  "marketOverview": "<krátky prehľad trhu pre daný budget a lokality, 2 vety>",
  "investmentStrategy": "<odporúčaná stratégia pre klienta, 2-3 vety>",
  "risks": ["<riziko 1>", "<riziko 2>"],
  "opportunities": ["<príležitosť 1>", "<príležitosť 2>"]
}`;

    let aiAnalysis = null;
    try {
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
      });

      const responseText = response.content[0].type === "text" ? response.content[0].text : "";
      const jsonText = responseText.replace(/```json\n?|\n?```/g, "").trim();
      aiAnalysis = JSON.parse(jsonText);
    } catch (error) {
      console.error("AI analysis error:", error);
    }

    return NextResponse.json({
      success: true,
      data: {
        recommendations: topProperties.slice(0, 10).map(p => ({
          id: p.id,
          title: p.title,
          price: p.price,
          pricePerM2: p.price_per_m2,
          area: p.area_m2,
          rooms: p.rooms,
          city: p.city,
          district: p.district,
          condition: p.condition,
          sourceUrl: p.source_url,
          isDistressed: p.is_distressed,
          investmentScore: p.investmentScore,
          investmentFactors: p.investmentFactors,
          metrics: p.investmentMetrics,
        })),
        analysis: aiAnalysis,
        totalMatches: properties.length,
      },
    });
  } catch (error) {
    console.error("Investment advisor error:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}

export const runtime = "nodejs";
