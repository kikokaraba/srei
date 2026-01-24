/**
 * AI Property Valuation API
 * 
 * POST /api/v1/ai/valuation
 * 
 * Prijíma parametre nehnuteľnosti a vracia AI-generovaný odhad hodnoty
 * na základe podobných nehnuteľností v databáze.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAIValuation, type PropertyInput } from "@/lib/ai/valuation";
import type { SlovakCity, PropertyCondition } from "@/generated/prisma/client";

// Validácia vstupu
function validateInput(body: unknown): PropertyInput | { error: string } {
  if (!body || typeof body !== "object") {
    return { error: "Neplatný vstup" };
  }

  const data = body as Record<string, unknown>;

  // Povinné polia
  if (!data.city || typeof data.city !== "string") {
    return { error: "Chýba mesto (city)" };
  }

  if (!data.area_m2 || typeof data.area_m2 !== "number" || data.area_m2 <= 0) {
    return { error: "Neplatná plocha (area_m2)" };
  }

  if (!data.condition || typeof data.condition !== "string") {
    return { error: "Chýba stav (condition)" };
  }

  // Validácia enums
  const validCities = ["BRATISLAVA", "KOSICE", "PRESOV", "ZILINA", "BANSKA_BYSTRICA", "TRNAVA", "TRENCIN", "NITRA"];
  if (!validCities.includes(data.city)) {
    return { error: `Neplatné mesto. Povolené: ${validCities.join(", ")}` };
  }

  const validConditions = ["POVODNY", "REKONSTRUKCIA", "NOVOSTAVBA"];
  if (!validConditions.includes(data.condition)) {
    return { error: `Neplatný stav. Povolené: ${validConditions.join(", ")}` };
  }

  return {
    city: data.city as SlovakCity,
    district: typeof data.district === "string" ? data.district : undefined,
    area_m2: data.area_m2,
    rooms: typeof data.rooms === "number" ? data.rooms : undefined,
    floor: typeof data.floor === "number" ? data.floor : undefined,
    condition: data.condition as PropertyCondition,
    hasBalcony: typeof data.hasBalcony === "boolean" ? data.hasBalcony : undefined,
    hasParking: typeof data.hasParking === "boolean" ? data.hasParking : undefined,
    isNewBuilding: typeof data.isNewBuilding === "boolean" ? data.isNewBuilding : undefined,
    additionalInfo: typeof data.additionalInfo === "string" ? data.additionalInfo : undefined,
  };
}

export async function POST(request: NextRequest) {
  try {
    // Autentifikácia
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Parsuj body
    const body = await request.json();
    
    // Validácia
    const input = validateInput(body);
    if ("error" in input) {
      return NextResponse.json(
        { success: false, error: input.error },
        { status: 400 }
      );
    }

    // Získaj AI valuáciu
    const valuation = await getAIValuation(input);

    return NextResponse.json({
      success: true,
      data: {
        input: {
          city: input.city,
          district: input.district,
          area_m2: input.area_m2,
          rooms: input.rooms,
          condition: input.condition,
        },
        valuation,
      },
    });
  } catch (error) {
    console.error("AI Valuation API error:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Internal server error" 
      },
      { status: 500 }
    );
  }
}

export const runtime = "nodejs";
export const maxDuration = 30;
