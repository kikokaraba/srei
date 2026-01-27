import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { geocodeProperties } from "@/lib/monitoring/geocoding";

/**
 * Geocode properties that don't have coordinates
 * POST /api/v1/admin/geocode?limit=50
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "20");

    console.log(`📍 [Geocode] Starting geocoding for ${limit} properties...`);
    
    const result = await geocodeProperties(limit);

    return NextResponse.json({
      success: true,
      ...result,
      message: `Geocoded ${result.geocoded} of ${result.processed} properties`,
    });

  } catch (error) {
    console.error("Geocoding error:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    usage: "POST /api/v1/admin/geocode?limit=50",
    description: "Geocode properties without coordinates using OpenStreetMap",
  });
}
