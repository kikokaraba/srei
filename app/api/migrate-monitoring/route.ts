/**
 * Migration endpoint to add monitoring fields to Property table
 * 
 * Run once to add new columns for the monitoring system
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const results: string[] = [];

  try {
    // Check if columns already exist
    const columnCheck = await prisma.$queryRaw<{ column_name: string }[]>`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'Property' 
      AND column_name IN ('last_seen_at', 'status', 'priority_score', 'check_count_today', 'last_checked_at', 'consecutive_failures')
    `;

    const existingColumns = new Set(columnCheck.map(c => c.column_name));
    results.push(`Existing columns: ${Array.from(existingColumns).join(", ") || "none"}`);

    // Add last_seen_at
    if (!existingColumns.has("last_seen_at")) {
      await prisma.$executeRaw`
        ALTER TABLE "Property" 
        ADD COLUMN "last_seen_at" TIMESTAMP(3) DEFAULT NOW()
      `;
      results.push("✅ Added last_seen_at column");
    } else {
      results.push("✓ last_seen_at already exists");
    }

    // Add status (using the ListingStatus enum)
    if (!existingColumns.has("status")) {
      // First ensure enum exists
      try {
        await prisma.$executeRaw`
          DO $$ BEGIN
            CREATE TYPE "ListingStatus" AS ENUM ('ACTIVE', 'REMOVED', 'SOLD', 'WITHDRAWN', 'EXPIRED');
          EXCEPTION
            WHEN duplicate_object THEN null;
          END $$;
        `;
      } catch {
        // Enum might already exist
      }
      
      await prisma.$executeRaw`
        ALTER TABLE "Property" 
        ADD COLUMN "status" "ListingStatus" DEFAULT 'ACTIVE'
      `;
      results.push("✅ Added status column");
    } else {
      results.push("✓ status already exists");
    }

    // Add priority_score
    if (!existingColumns.has("priority_score")) {
      await prisma.$executeRaw`
        ALTER TABLE "Property" 
        ADD COLUMN "priority_score" INTEGER DEFAULT 50
      `;
      results.push("✅ Added priority_score column");
    } else {
      results.push("✓ priority_score already exists");
    }

    // Add check_count_today
    if (!existingColumns.has("check_count_today")) {
      await prisma.$executeRaw`
        ALTER TABLE "Property" 
        ADD COLUMN "check_count_today" INTEGER DEFAULT 0
      `;
      results.push("✅ Added check_count_today column");
    } else {
      results.push("✓ check_count_today already exists");
    }

    // Add last_checked_at
    if (!existingColumns.has("last_checked_at")) {
      await prisma.$executeRaw`
        ALTER TABLE "Property" 
        ADD COLUMN "last_checked_at" TIMESTAMP(3)
      `;
      results.push("✅ Added last_checked_at column");
    } else {
      results.push("✓ last_checked_at already exists");
    }

    // Add consecutive_failures
    if (!existingColumns.has("consecutive_failures")) {
      await prisma.$executeRaw`
        ALTER TABLE "Property" 
        ADD COLUMN "consecutive_failures" INTEGER DEFAULT 0
      `;
      results.push("✅ Added consecutive_failures column");
    } else {
      results.push("✓ consecutive_failures already exists");
    }

    // Create indexes for efficient querying
    try {
      await prisma.$executeRaw`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS "Property_status_priority_score_idx" 
        ON "Property" ("status", "priority_score" DESC)
      `;
      results.push("✅ Created status_priority_score index");
    } catch (e) {
      results.push("⚠️ Index creation skipped (might already exist)");
    }

    try {
      await prisma.$executeRaw`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS "Property_status_last_checked_at_idx" 
        ON "Property" ("status", "last_checked_at")
      `;
      results.push("✅ Created status_last_checked_at index");
    } catch (e) {
      results.push("⚠️ Index creation skipped (might already exist)");
    }

    try {
      await prisma.$executeRaw`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS "Property_last_seen_at_idx" 
        ON "Property" ("last_seen_at")
      `;
      results.push("✅ Created last_seen_at index");
    } catch (e) {
      results.push("⚠️ Index creation skipped (might already exist)");
    }

    // Verify columns exist now
    const verifyCheck = await prisma.$queryRaw<{ column_name: string }[]>`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'Property' 
      AND column_name IN ('last_seen_at', 'status', 'priority_score', 'check_count_today', 'last_checked_at', 'consecutive_failures')
    `;

    results.push(`\n📊 Final verification: ${verifyCheck.length} monitoring columns present`);

    // Count properties
    const propertyCount = await prisma.property.count();
    results.push(`📋 Total properties in database: ${propertyCount}`);

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
