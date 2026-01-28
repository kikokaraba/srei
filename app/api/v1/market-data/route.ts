// API endpoint pre trhové dáta
// GET /api/v1/market-data

import { NextRequest, NextResponse } from "next/server";
import {
  getAggregatedMarketData,
  getMarketDataByCity,
  getMarketSummary,
  getPriceTrends,
  fetchEconomicIndicators,
  fetchDemographicData,
} from "@/lib/data-sources";
import { getMarketSummaryLive } from "@/lib/data-sources/realtime-stats";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const type = searchParams.get("type") || "summary";
  const city = searchParams.get("city");
  
  try {
    switch (type) {
      case "summary": {
        // Celkový súhrn trhu
        const summary = await getMarketSummary();
        return NextResponse.json({
          success: true,
          data: summary,
          source: "NBS, Štatistický úrad SR",
          updatedAt: new Date().toISOString(),
        });
      }

      case "economy-live": {
        // 100% živé dáta – len z DB (scrapované inzeráty + InvestmentMetrics)
        const live = await getMarketSummaryLive();
        return NextResponse.json({
          success: true,
          data: live,
          source: live.dataSource,
          updatedAt: live.generatedAt.toISOString(),
        });
      }
      
      case "cities": {
        // Dáta pre všetky mestá
        const marketData = await getAggregatedMarketData();
        return NextResponse.json({
          success: true,
          data: marketData,
          source: "NBS",
          updatedAt: new Date().toISOString(),
        });
      }
      
      case "city": {
        // Dáta pre konkrétne mesto
        if (!city) {
          return NextResponse.json(
            { success: false, error: "City parameter is required" },
            { status: 400 }
          );
        }
        
        const cityData = await getMarketDataByCity(city.toUpperCase());
        
        if (!cityData) {
          return NextResponse.json(
            { success: false, error: "City not found" },
            { status: 404 }
          );
        }
        
        // Pridaj demografické dáta
        const demographics = await fetchDemographicData(city.toUpperCase());
        
        return NextResponse.json({
          success: true,
          data: {
            market: cityData,
            demographics,
          },
          source: "NBS, Štatistický úrad SR",
          updatedAt: new Date().toISOString(),
        });
      }
      
      case "trends": {
        // Historické cenové trendy
        const trends = await getPriceTrends(city?.toUpperCase());
        return NextResponse.json({
          success: true,
          data: trends,
          source: "NBS",
          updatedAt: new Date().toISOString(),
        });
      }
      
      case "economic": {
        // Ekonomické ukazovatele
        const economic = await fetchEconomicIndicators();
        return NextResponse.json({
          success: true,
          data: economic.data?.[0] || null,
          source: "Štatistický úrad SR",
          updatedAt: new Date().toISOString(),
        });
      }
      
      default:
        return NextResponse.json(
          { success: false, error: "Invalid type parameter" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Market data API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
