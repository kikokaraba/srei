/**
 * Fix Schema - Add missing city columns with default values
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const results: string[] = [];

  try {
    // Add city column to CityDemographics if missing
    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "CityDemographics" 
        ADD COLUMN IF NOT EXISTS "city" VARCHAR(255) NOT NULL DEFAULT 'Bratislava'
      `);
      results.push("✓ CityDemographics.city added");
    } catch (e) {
      results.push(`CityDemographics: ${e instanceof Error ? e.message : 'error'}`);
    }

    // Add city column to CityMarketData if missing
    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "CityMarketData" 
        ADD COLUMN IF NOT EXISTS "city" VARCHAR(255) NOT NULL DEFAULT 'Bratislava'
      `);
      results.push("✓ CityMarketData.city added");
    } catch (e) {
      results.push(`CityMarketData: ${e instanceof Error ? e.message : 'error'}`);
    }

    // Add city column to DailyMarketStats if missing
    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "DailyMarketStats" 
        ADD COLUMN IF NOT EXISTS "city" VARCHAR(255) NOT NULL DEFAULT 'Bratislava'
      `);
      results.push("✓ DailyMarketStats.city added");
    } catch (e) {
      results.push(`DailyMarketStats: ${e instanceof Error ? e.message : 'error'}`);
    }

    // Now remove defaults so future inserts require city
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE "CityDemographics" ALTER COLUMN "city" DROP DEFAULT`);
      await prisma.$executeRawUnsafe(`ALTER TABLE "CityMarketData" ALTER COLUMN "city" DROP DEFAULT`);
      await prisma.$executeRawUnsafe(`ALTER TABLE "DailyMarketStats" ALTER COLUMN "city" DROP DEFAULT`);
      results.push("✓ Defaults removed");
    } catch (e) {
      results.push(`Drop defaults: ${e instanceof Error ? e.message : 'error'}`);
    }

    return NextResponse.json({ 
      success: true, 
      results,
      message: "Schema fixed! Now redeploy to apply Prisma schema."
    });

  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error",
      results 
    }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
