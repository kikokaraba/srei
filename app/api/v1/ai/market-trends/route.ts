/**
 * AI Market Trends Analysis
 * Analyzes market data and predicts price trends
 */

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getNBSContextForPrompt } from "@/lib/ai/nbs-context";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const city = (request.nextUrl.searchParams.get("city") || "BRATISLAVA") as string;

  try {
    // Get current market data
    const currentData = await prisma.property.groupBy({
      by: ["city"],
      where: {
        listing_type: "PREDAJ",
      },
      _avg: {
        price: true,
        price_per_m2: true,
        area_m2: true,
      },
      _count: true,
      _min: { price: true },
      _max: { price: true },
    });

    // Get data by condition
    const byCondition = await prisma.property.groupBy({
      by: ["condition"],
      where: {
        city,
        listing_type: "PREDAJ",
      },
      _avg: { price_per_m2: true },
      _count: true,
    });

    // Get hot deals ratio
    const totalInCity = await prisma.property.count({
      where: { city, listing_type: "PREDAJ" },
    });
    const hotDealsInCity = await prisma.property.count({
      where: { city, listing_type: "PREDAJ", is_distressed: true },
    });

    // Recent listings (last 7 days simulation - based on days_on_market)
    const recentListings = await prisma.property.count({
      where: {
        city,
        listing_type: "PREDAJ",
        days_on_market: { lte: 7 },
      },
    });

    // Calculate some trends (simulated based on available data)
    const cityData = currentData.find(c => c.city === city);
    
    // Build market analysis
    const marketContext = {
      city,
      totalListings: totalInCity,
      avgPrice: Math.round(cityData?._avg.price || 0),
      avgPricePerM2: Math.round(cityData?._avg.price_per_m2 || 0),
      minPrice: cityData?._min.price || 0,
      maxPrice: cityData?._max.price || 0,
      hotDealsRatio: totalInCity > 0 ? Math.round((hotDealsInCity / totalInCity) * 100) : 0,
      newListingsWeek: recentListings,
      byCondition: byCondition.map(c => ({
        condition: c.condition,
        count: c._count,
        avgPricePerM2: Math.round(c._avg.price_per_m2 || 0),
      })),
      allCities: currentData.map(c => ({
        city: c.city,
        count: c._count,
        avgPricePerM2: Math.round(c._avg.price_per_m2 || 0),
      })),
    };

    // NBS makro dáta
    const nbsContext = await getNBSContextForPrompt();

    // Get AI prediction
    const prompt = `Analyzuj slovenský realitný trh pre mesto ${city} a vytvor predikciu vývoja cien.

AKTUÁLNE DÁTA:
- Počet aktívnych inzerátov: ${marketContext.totalListings}
- Priemerná cena: €${marketContext.avgPrice.toLocaleString()}
- Priemerná cena za m²: €${marketContext.avgPricePerM2}/m²
- Cenové rozpätie: €${marketContext.minPrice.toLocaleString()} - €${marketContext.maxPrice.toLocaleString()}
- Hot deals (pod trhom): ${marketContext.hotDealsRatio}%
- Nové inzeráty (7 dní): ${marketContext.newListingsWeek}

PODĽA STAVU NEHNUTEĽNOSTI:
${marketContext.byCondition.map(c => `- ${c.condition}: ${c.count} inzerátov, €${c.avgPricePerM2}/m²`).join("\n")}

POROVNANIE MIEST:
${marketContext.allCities.map(c => `- ${c.city}: ${c.count} inzerátov, €${c.avgPricePerM2}/m²`).join("\n")}
${nbsContext ? `\n${nbsContext}\n` : ""}

Vytvor JSON odpoveď:
{
  "currentState": "<popis aktuálneho stavu trhu, 2 vety>",
  "shortTermTrend": {
    "direction": "<UP|DOWN|STABLE>",
    "percentage": <predpokladaná zmena v % za 3 mesiace>,
    "reasoning": "<prečo, 1 veta>"
  },
  "longTermTrend": {
    "direction": "<UP|DOWN|STABLE>",
    "percentage": <predpokladaná zmena v % za 12 mesiacov>,
    "reasoning": "<prečo, 1 veta>"
  },
  "bestTimeToAction": {
    "buy": "<teraz|počkať 3 mesiace|počkať 6+ mesiacov>",
    "sell": "<teraz|počkať 3 mesiace|počkať 6+ mesiacov>",
    "reasoning": "<prečo, 1 veta>"
  },
  "hotLocalities": ["<lokalita 1>", "<lokalita 2>", "<lokalita 3>"],
  "risks": ["<riziko 1>", "<riziko 2>"],
  "opportunities": ["<príležitosť 1>", "<príležitosť 2>"],
  "summary": "<celkové zhrnutie a odporúčanie, 2-3 vety>"
}`;

    let aiPrediction = null;
    try {
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
      });

      const responseText = response.content[0].type === "text" ? response.content[0].text : "";
      const jsonText = responseText.replace(/```json\n?|\n?```/g, "").trim();
      aiPrediction = JSON.parse(jsonText);
    } catch (error) {
      console.error("AI prediction error:", error);
    }

    return NextResponse.json({
      success: true,
      data: {
        market: marketContext,
        prediction: aiPrediction,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Market trends error:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}

export const runtime = "nodejs";
