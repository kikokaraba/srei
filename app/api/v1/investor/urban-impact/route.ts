/**
 * Urban Impact Prediction API
 * 
 * Predikcia vplyvu infraštruktúry na ceny
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getUrbanImpactPrediction,
  getUrbanImpactOverview,
} from "@/lib/predictions/urban-impact";
 from "@/generated/prisma/client";

/**
 * GET /api/v1/investor/urban-impact
 * 
 * Query params:
 * - city: string (pre prediction konkrétneho mesta)
 * - district: string
 * - overview: boolean (pre prehľad všetkých miest)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const city = searchParams.get("city") as string | null;
    const district = searchParams.get("district");
    const showOverview = searchParams.get("overview") === "true";

    // Prehľad všetkých miest
    if (showOverview) {
      const overview = await getUrbanImpactOverview();
      
      return NextResponse.json({
        success: true,
        data: {
          hotspots: overview.hotspots,
          upcomingProjects: overview.upcomingProjects.map(p => ({
            id: p.id,
            name: p.name,
            type: p.type,
            city: p.city,
            district: p.district,
            status: p.status,
            completionDate: p.completionDate?.toISOString(),
            estimatedImpact: p.estimatedImpact,
            description: p.description,
          })),
          summary: {
            totalProjects: overview.upcomingProjects.length,
            strongBuyLocations: overview.hotspots.filter(h => h.signal === "strong_buy").length,
            topOpportunity: overview.hotspots[0] || null,
          },
        },
      });
    }

    // Prediction pre konkrétne mesto
    if (!city) {
      return NextResponse.json({
        success: false,
        error: "City parameter required",
      }, { status: 400 });
    }

    const prediction = await getUrbanImpactPrediction(city, district || undefined);

    return NextResponse.json({
      success: true,
      data: {
        ...prediction,
        projects: prediction.projects.map(p => ({
          ...p,
          project: {
            id: p.project.id,
            name: p.project.name,
            type: p.project.type,
            status: p.project.status,
            completionDate: p.project.completionDate?.toISOString(),
            description: p.project.description,
          },
        })),
        // Investorský súhrn
        investorBrief: {
          signal: prediction.investorSignal,
          expectedGrowth: `+${prediction.totalImpact}%`,
          timeframe: prediction.timeframe,
          confidence: prediction.confidence,
          action: prediction.investorSignal === "strong_buy" 
            ? "🚀 Nakupuj pred verejnosťou!"
            : prediction.investorSignal === "buy"
            ? "✅ Dobrá príležitosť"
            : prediction.investorSignal === "hold"
            ? "⏳ Sleduj vývoj"
            : "⚠️ Žiadny špeciálny potenciál",
        },
      },
    });

  } catch (error) {
    console.error("Urban impact API error:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Internal error",
    }, { status: 500 });
  }
}
