/**
 * Duplicates / Master Record API
 * 
 * Zoskupenie duplicitných inzerátov
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  createMasterRecord,
  findAllDuplicateGroups,
  getDuplicateStats,
} from "@/lib/deduplication/master-record";
 from "@/generated/prisma/client";

/**
 * GET /api/v1/investor/duplicates
 * 
 * Query params:
 * - propertyId: string (pre master record jednej property)
 * - city: string (pre zoznam duplicít v meste)
 * - stats: boolean (pre štatistiky)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get("propertyId");
    const city = searchParams.get("city") as string | null;
    const showStats = searchParams.get("stats") === "true";

    // Štatistiky duplicít
    if (showStats) {
      const stats = await getDuplicateStats(city || undefined);
      
      return NextResponse.json({
        success: true,
        data: stats,
      });
    }

    // Master Record pre konkrétnu property
    if (propertyId) {
      const masterRecord = await createMasterRecord(propertyId);
      
      if (!masterRecord) {
        return NextResponse.json({
          success: true,
          data: null,
          message: "Žiadne duplicity nenájdené",
        });
      }

      return NextResponse.json({
        success: true,
        data: masterRecord,
      });
    }

    // Zoznam duplicitných skupín
    const groups = await findAllDuplicateGroups(city || undefined, 50);

    // Transformuj pre UI
    const duplicateGroups = groups.map(group => {
      const prices = group.properties.map(p => p.price);
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);
      const savings = maxPrice - minPrice;
      const savingsPercent = ((maxPrice - minPrice) / maxPrice) * 100;

      return {
        fingerprint: group.fingerprint,
        count: group.count,
        properties: group.properties.map(p => ({
          id: p.id,
          source: p.source,
          title: p.title,
          price: p.price,
          pricePerM2: p.price_per_m2,
          city: p.city,
          district: p.district,
          url: p.source_url,
          isBestPrice: p.price === minPrice,
        })),
        bestPrice: minPrice,
        worstPrice: maxPrice,
        potentialSavings: savings,
        savingsPercent: Math.round(savingsPercent * 10) / 10,
        sources: [...new Set(group.properties.map(p => p.source))],
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        groups: duplicateGroups,
        totalGroups: duplicateGroups.length,
        totalSavings: duplicateGroups.reduce((sum, g) => sum + g.potentialSavings, 0),
      },
    });

  } catch (error) {
    console.error("Duplicates API error:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Internal error",
    }, { status: 500 });
  }
}
