/**
 * Yield API - Výpočet výnosnosti nehnuteľností
 * 
 * GET /api/v1/yield?propertyId=xxx - Yield pre konkrétnu nehnuteľnosť
 * GET /api/v1/yield?city=xxx&price=xxx - Yield pre lokalitu a cenu
 * GET /api/v1/yield/stats?city=xxx - Štatistiky výnosnosti
 */

import { NextRequest, NextResponse } from "next/server";
import {
  calculatePropertyYield,
  calculateYieldForLocation,
  compareToMarket,
  getYieldStats,
} from "@/lib/analysis/yield-engine";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const propertyId = searchParams.get("propertyId");
    const city = searchParams.get("city");
    const price = searchParams.get("price");
    const district = searchParams.get("district");
    const rooms = searchParams.get("rooms");
    const area = searchParams.get("area");
    const stats = searchParams.get("stats");

    // Štatistiky pre dashboard
    if (stats === "true") {
      const yieldStats = await getYieldStats(city || undefined);
      return NextResponse.json({
        success: true,
        data: yieldStats,
      });
    }

    // Yield pre konkrétnu nehnuteľnosť
    if (propertyId) {
      const yieldData = await calculatePropertyYield(propertyId);
      
      if (!yieldData) {
        return NextResponse.json(
          { success: false, error: "Yield calculation not available for this property" },
          { status: 404 }
        );
      }

      const comparison = await compareToMarket(yieldData.grossYield, city || "Bratislava", district || undefined);

      return NextResponse.json({
        success: true,
        data: {
          yield: yieldData,
          comparison,
        },
      });
    }

    // Yield pre lokalitu a cenu
    if (city && price) {
      const priceNum = parseInt(price, 10);
      if (isNaN(priceNum) || priceNum <= 0) {
        return NextResponse.json(
          { success: false, error: "Invalid price" },
          { status: 400 }
        );
      }

      const yieldData = await calculateYieldForLocation(
        priceNum,
        city,
        district || undefined,
        rooms ? parseInt(rooms, 10) : undefined,
        area ? parseFloat(area) : undefined
      );

      if (!yieldData) {
        return NextResponse.json(
          { success: false, error: "No rental data available for this location" },
          { status: 404 }
        );
      }

      const comparison = await compareToMarket(yieldData.grossYield, city, district || undefined);

      return NextResponse.json({
        success: true,
        data: {
          yield: yieldData,
          comparison,
          input: {
            city,
            district,
            price: priceNum,
            rooms: rooms ? parseInt(rooms, 10) : null,
            area: area ? parseFloat(area) : null,
          },
        },
      });
    }

    return NextResponse.json(
      { success: false, error: "Missing required parameters (propertyId or city+price)" },
      { status: 400 }
    );

  } catch (error) {
    console.error("[Yield API] Error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
