/**
 * Admin API - Reset Properties
 * 
 * Vymaže všetky nehnuteľnosti z databázy
 * POZOR: Nebezpečná operácia!
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    // Overiť admin práva
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }
    
    // Skontroluj či je admin
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { role: true },
    });
    
    if (user?.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: "Admin access required" },
        { status: 403 }
      );
    }
    
    console.log("🗑️ Starting database cleanup...");
    
    // Vymaž v správnom poradí (kvôli foreign keys)
    const deletedPriceHistory = await prisma.priceHistory.deleteMany({});
    console.log(`   Deleted ${deletedPriceHistory.count} price history records`);
    
    const deletedSnapshots = await prisma.propertySnapshot.deleteMany({});
    console.log(`   Deleted ${deletedSnapshots.count} snapshots`);
    
    const deletedMatches = await prisma.propertyMatch.deleteMany({});
    console.log(`   Deleted ${deletedMatches.count} matches`);
    
    const deletedFingerprints = await prisma.propertyFingerprint.deleteMany({});
    console.log(`   Deleted ${deletedFingerprints.count} fingerprints`);
    
    const deletedSaved = await prisma.savedProperty.deleteMany({});
    console.log(`   Deleted ${deletedSaved.count} saved properties`);
    
    const deletedInvestmentMetrics = await prisma.investmentMetrics.deleteMany({});
    console.log(`   Deleted ${deletedInvestmentMetrics.count} investment metrics`);
    
    const deletedTaxInfo = await prisma.taxInfo.deleteMany({});
    console.log(`   Deleted ${deletedTaxInfo.count} tax info records`);
    
    const deletedMarketGaps = await prisma.marketGap.deleteMany({});
    console.log(`   Deleted ${deletedMarketGaps.count} market gaps`);
    
    const deletedPropertyImpacts = await prisma.propertyImpact.deleteMany({});
    console.log(`   Deleted ${deletedPropertyImpacts.count} property impacts`);
    
    const deletedProperties = await prisma.property.deleteMany({});
    console.log(`   Deleted ${deletedProperties.count} properties`);
    
    // Vymaž aj scraper runs a failed scrapes
    const deletedFailedScrapes = await prisma.failedScrape.deleteMany({});
    console.log(`   Deleted ${deletedFailedScrapes.count} failed scrapes`);
    
    const deletedScraperRuns = await prisma.scraperRun.deleteMany({});
    console.log(`   Deleted ${deletedScraperRuns.count} scraper runs`);
    
    console.log("✅ Database cleanup complete!");
    
    return NextResponse.json({
      success: true,
      deleted: {
        properties: deletedProperties.count,
        priceHistory: deletedPriceHistory.count,
        snapshots: deletedSnapshots.count,
        matches: deletedMatches.count,
        fingerprints: deletedFingerprints.count,
        savedProperties: deletedSaved.count,
        investmentMetrics: deletedInvestmentMetrics.count,
        taxInfo: deletedTaxInfo.count,
        marketGaps: deletedMarketGaps.count,
        propertyImpacts: deletedPropertyImpacts.count,
        failedScrapes: deletedFailedScrapes.count,
        scraperRuns: deletedScraperRuns.count,
      },
    });
    
  } catch (error) {
    console.error("Database cleanup error:", error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * GET - Info o endpoint
 */
export async function GET() {
  return NextResponse.json({
    warning: "This endpoint deletes all properties from the database!",
    method: "DELETE",
    requires: "Admin authentication",
  });
}
