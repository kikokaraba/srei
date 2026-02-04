/**
 * AI Property Report - PDF export
 * POST { propertyId } -> PDF
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAIValuation } from "@/lib/ai/valuation";
import { generatePropertyReportPDF } from "@/lib/ai/pdf-report";
import type { PropertyCondition } from "@/generated/prisma/client";

const CONDITION_LABELS: Record<string, string> = {
  POVODNY: "pôvodný stav",
  REKONSTRUKCIA: "po rekonštrukcii",
  NOVOSTAVBA: "novostavba",
};

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { propertyId } = body;

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
        address: true,
        price: true,
        area_m2: true,
        price_per_m2: true,
        rooms: true,
        floor: true,
        condition: true,
        source: true,
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
      rooms: property.rooms ?? undefined,
      floor: property.floor ?? undefined,
      condition: property.condition as PropertyCondition,
    };

    const valuation = await getAIValuation(input);

    const pdfBytes = generatePropertyReportPDF(
      {
        id: property.id,
        title: property.title,
        city: property.city,
        district: property.district,
        address: property.address,
        price: property.price,
        area_m2: property.area_m2,
        price_per_m2: property.price_per_m2,
        rooms: property.rooms,
        floor: property.floor,
        condition: CONDITION_LABELS[property.condition] || property.condition,
        source: property.source,
      },
      valuation
    );

    const filename = `sria-report-${property.id.slice(0, 8)}.pdf`;

    const pdfBody = Buffer.from(pdfBytes);
    return new NextResponse(pdfBody, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(pdfBody.length),
      },
    });
  } catch (error) {
    console.error("AI Property Report error:", error);
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
export const maxDuration = 60;
