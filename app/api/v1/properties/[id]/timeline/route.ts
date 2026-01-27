/**
 * Property Timeline API
 * 
 * Vracia kompletnú históriu cien a udalostí pre nehnuteľnosť
 * Používa sa pre zobrazenie grafu a časovej osi na detaile nehnuteľnosti
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getPropertyTimeline } from "@/lib/matching/fingerprint";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const timeline = await getPropertyTimeline(id);

    if (timeline.priceHistory.length === 0) {
      return NextResponse.json({
        success: true,
        data: null,
        message: "No price history available",
      });
    }

    return NextResponse.json({
      success: true,
      data: timeline,
    });
  } catch (error) {
    console.error("Error fetching property timeline:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
