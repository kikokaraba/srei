/**
 * API endpoint pre získanie duplicít nehnuteľnosti
 */

import { NextRequest, NextResponse } from "next/server";
import { getUnifiedPropertyView } from "@/lib/deduplication/fingerprint";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const unified = await getUnifiedPropertyView(id);

    if (!unified) {
      return NextResponse.json({
        success: false,
        error: "Property not found",
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        sources: unified.sources,
        priceComparison: unified.priceComparison,
        totalSources: unified.sources.length,
      },
    });
  } catch (error) {
    console.error("Error fetching duplicates:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}

export const runtime = "nodejs";
