import { NextResponse } from "next/server";
import { getLatestBankRates } from "@/lib/data-sources/bank-rates-scraper";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

/** Verejné API – aktuálne úrokové sadzby hypoték z bánk (naposledy scrapované). */
export async function GET() {
  try {
    const data = await getLatestBankRates();
    return NextResponse.json({
      success: true,
      byBank: data.byBank,
      avg5Y: data.avg5Y,
      scrapedAt: data.scrapedAt?.toISOString() ?? null,
    });
  } catch (error) {
    console.error("Bank rates API error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
