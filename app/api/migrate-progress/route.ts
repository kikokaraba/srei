/**
 * Migration - Add ScrapeProgress table
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const results: string[] = [];

  try {
    // Check if table exists
    const tableCheck = await prisma.$queryRaw<{ exists: boolean }[]>`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'ScrapeProgress'
      ) as exists
    `;

    if (tableCheck[0]?.exists) {
      results.push("✓ ScrapeProgress table already exists");
      
      // Get current progress
      const progress = await prisma.$queryRaw<any[]>`
        SELECT * FROM "ScrapeProgress" LIMIT 1
      `;
      
      if (progress.length > 0) {
        results.push(`📊 Current progress: ${JSON.stringify(progress[0])}`);
      }
    } else {
      // Create table
      await prisma.$executeRaw`
        CREATE TABLE "ScrapeProgress" (
          "id" TEXT NOT NULL,
          "source" TEXT NOT NULL,
          "currentPage" INTEGER NOT NULL DEFAULT 1,
          "totalPages" INTEGER NOT NULL DEFAULT 775,
          "category" TEXT NOT NULL DEFAULT 'byty-predaj',
          "totalScraped" INTEGER NOT NULL DEFAULT 0,
          "totalNew" INTEGER NOT NULL DEFAULT 0,
          "totalUpdated" INTEGER NOT NULL DEFAULT 0,
          "totalErrors" INTEGER NOT NULL DEFAULT 0,
          "isComplete" BOOLEAN NOT NULL DEFAULT false,
          "lastRunAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "completedAt" TIMESTAMP(3),
          "cycleCount" INTEGER NOT NULL DEFAULT 0,
          
          CONSTRAINT "ScrapeProgress_pkey" PRIMARY KEY ("id")
        )
      `;
      results.push("✅ Created ScrapeProgress table");

      // Create unique index
      await prisma.$executeRaw`
        CREATE UNIQUE INDEX "ScrapeProgress_source_key" ON "ScrapeProgress"("source")
      `;
      results.push("✅ Created unique index on source");

      // Create index
      await prisma.$executeRaw`
        CREATE INDEX "ScrapeProgress_source_isComplete_idx" ON "ScrapeProgress"("source", "isComplete")
      `;
      results.push("✅ Created source_isComplete index");
    }

    // Show property count
    const propertyCount = await prisma.property.count();
    results.push(`📋 Properties in database: ${propertyCount}`);

    return NextResponse.json({
      success: true,
      results,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    results.push(`❌ Error: ${errorMessage}`);
    
    return NextResponse.json({
      success: false,
      results,
      error: errorMessage,
    }, { status: 500 });
  }
}
