/**
 * AI Asistent na vyjednávanie
 * POST { propertyId, maxBudget? } -> suggested offer range, tips
 */

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getAIValuation } from "@/lib/ai/valuation";
import type { PropertyCondition } from "@/generated/prisma/client";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { propertyId, maxBudget } = body;

    if (!propertyId || typeof propertyId !== "string") {
      return NextResponse.json(
        { success: false, error: "propertyId is required" },
        { status: 400 }
      );
    }

    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      select: {
        id: true,
        title: true,
        city: true,
        district: true,
        price: true,
        area_m2: true,
        price_per_m2: true,
        condition: true,
        is_distressed: true,
        days_on_market: true,
      },
    });

    if (!property) {
      return NextResponse.json(
        { success: false, error: "Nehnuteľnosť neexistuje" },
        { status: 404 }
      );
    }

    const input = {
      city: property.city,
      district: property.district || undefined,
      area_m2: property.area_m2,
      condition: property.condition as PropertyCondition,
    };

    const valuation = await getAIValuation(input);

    const prompt = `Si expert na realitné vyjednávanie na Slovensku. Klient má záujem o nehnuteľnosť:

NEHNUTEĽNOSŤ:
- Názov: ${property.title}
- Lokalita: ${property.district}, ${property.city}
- Ponúkaná cena: €${property.price.toLocaleString()}
- Plocha: ${property.area_m2}m² (€${property.price_per_m2}/m²)
- Stav: ${property.condition}
- Dni v ponuke: ${property.days_on_market}
- Pod trhom: ${property.is_distressed ? "áno" : "nie"}

AI OCENENIE (na základe ${valuation.comparables.count} podobných):
- Odhadovaná hodnota: €${valuation.estimatedPrice.toLocaleString()}
- Rozsah: €${valuation.priceRange.low.toLocaleString()} - €${valuation.priceRange.high.toLocaleString()}

${maxBudget != null && maxBudget > 0 ? `- MAX ROZPOČET KLIENTA: €${Number(maxBudget).toLocaleString()}` : ""}

Vytvor JSON odpoveď:
{
  "suggestedOfferLow": <číslo - dolná hranica počiatočnej ponuky v EUR>,
  "suggestedOfferHigh": <číslo - horná hranica počiatočnej ponuky v EUR>,
  "initialOffer": <číslo - odporúčaná počiatočná ponuka v EUR>,
  "reasoning": "<2-3 vety prečo tieto sumy>",
  "tips": ["<tip 1 pre vyjednávanie>", "<tip 2>", "<tip 3>"]
}

Pravidlá:
1. Počiatočná ponuka by mala byť 5-15% pod ponúkanou cenou
2. Zohľadni AI odhad hodnoty - ak je ponuka nad odhadom, môžeš odporúčať nižšiu počiatočnú ponuku
3. Ak je maxBudget zadané a nižšie ako odhad, priraď sa k nemu
4. Tips majú byť praktické (napr. "Uveď že máš hotovosť", "Navrhni kratší termín prevodu")`;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 512,
      messages: [{ role: "user", content: prompt }],
    });

    const responseText = response.content[0].type === "text" ? response.content[0].text : "";
    const jsonText = responseText.replace(/```json\n?|\n?```/g, "").trim();
    const aiResponse = JSON.parse(jsonText);

    return NextResponse.json({
      success: true,
      data: {
        suggestedOfferLow: aiResponse.suggestedOfferLow,
        suggestedOfferHigh: aiResponse.suggestedOfferHigh,
        initialOffer: aiResponse.initialOffer,
        reasoning: aiResponse.reasoning,
        tips: Array.isArray(aiResponse.tips) ? aiResponse.tips : [],
      },
    });
  } catch (error) {
    console.error("AI Negotiation error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}

export const runtime = "nodejs";
export const maxDuration = 30;
