/**
 * AI Chat API - Real Estate Assistant
 * Answers questions about the Slovak real estate market
 */

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Get market context from database
async function getMarketContext() {
  try {
    // Get property counts by city
    const cityCounts = await prisma.property.groupBy({
      by: ["city"],
      _count: true,
      _avg: { price_per_m2: true, price: true },
    });

    // Get recent properties
    const recentProperties = await prisma.property.findMany({
      take: 20,
      orderBy: { createdAt: "desc" },
      select: {
        city: true,
        district: true,
        price: true,
        area_m2: true,
        price_per_m2: true,
        rooms: true,
        condition: true,
        listing_type: true,
      },
    });

    // Get hot deals
    const hotDeals = await prisma.property.count({
      where: { is_distressed: true },
    });

    const totalProperties = await prisma.property.count();

    return {
      totalProperties,
      hotDeals,
      cityCounts: cityCounts.map(c => ({
        city: c.city,
        count: c._count,
        avgPricePerM2: Math.round(c._avg.price_per_m2 || 0),
        avgPrice: Math.round(c._avg.price || 0),
      })),
      recentSample: recentProperties.slice(0, 5),
    };
  } catch (error) {
    console.error("Error getting market context:", error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  // Check auth
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { message, history = [] } = await request.json();

    if (!message || typeof message !== "string") {
      return NextResponse.json({ success: false, error: "Message is required" }, { status: 400 });
    }

    // Get market context
    const context = await getMarketContext();

    const systemPrompt = `Si SRIA - inteligentný asistent pre slovenský realitný trh. Pomáhaš užívateľom s otázkami o nehnuteľnostiach na Slovensku.

AKTUÁLNE DÁTA Z DATABÁZY:
${context ? `
- Celkový počet nehnuteľností: ${context.totalProperties}
- Hot deals (pod trhom): ${context.hotDeals}
- Štatistiky podľa miest:
${context.cityCounts.map(c => `  • ${c.city}: ${c.count} nehnuteľností, priem. €${c.avgPricePerM2}/m²`).join("\n")}
` : "Dáta momentálne nedostupné."}

PRAVIDLÁ:
1. Odpovedaj vždy po slovensky
2. Buď stručný a vecný (max 2-3 odseky)
3. Používaj reálne dáta z databázy keď sú relevantné
4. Pri cenách uvádzaj € a formátuj čísla s medzerami (napr. 150 000 €)
5. Ak si nie si istý, povedz to
6. Môžeš odporúčať kde na webe nájdu viac info (Nehnuteľnosti, Kalkulačky, Mapa)

OBLASTI EXPERTÍZY:
- Ceny nehnuteľností v slovenských mestách
- Porovnanie lokalít
- Investičné tipy
- Trendy na trhu
- Hypotéky a financovanie
- Právne aspekty kúpy/predaja`;

    // Build messages array with history
    const messages: { role: "user" | "assistant"; content: string }[] = [];
    
    for (const msg of history.slice(-10)) { // Keep last 10 messages for context
      messages.push({
        role: msg.role,
        content: msg.content,
      });
    }
    
    messages.push({ role: "user", content: message });

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: systemPrompt,
      messages,
    });

    const responseText = response.content[0].type === "text" ? response.content[0].text : "";

    return NextResponse.json({
      success: true,
      data: {
        message: responseText,
        context: {
          totalProperties: context?.totalProperties || 0,
          hotDeals: context?.hotDeals || 0,
        },
      },
    });
  } catch (error) {
    console.error("AI Chat error:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Nepodarilo sa spracovať otázku",
    }, { status: 500 });
  }
}

export const runtime = "nodejs";
