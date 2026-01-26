/**
 * Batch Refresh Worker
 * 
 * Runs every 10 minutes to check a batch of properties.
 * Prioritizes properties based on priority_score.
 * 
 * Goals:
 * - Check ~50 properties per run
 * - Prioritize high-priority properties (new, price changes, user-saved)
 * - Detect sold/removed listings
 * - Update prices if changed
 * - Reset daily counters at midnight
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { batchHealthCheck } from "@/lib/monitoring/health-check";
import { 
  shouldCheckNow, 
  extractPriorityFactors, 
  calculatePriorityScore 
} from "@/lib/monitoring/priority";

// Config
const BATCH_SIZE = 50; // Properties per run
const DELAY_BETWEEN_CHECKS_MS = 1500; // Rate limiting
const MAX_CONSECUTIVE_FAILURES = 5; // Before marking as potentially removed

export const maxDuration = 300; // 5 minutes

export async function GET(request: Request) {
  const startTime = Date.now();
  
  // Verify cron secret (optional but recommended)
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    // Allow without auth for now, but log warning
    console.warn("⚠️ Batch refresh called without valid CRON_SECRET");
  }

  console.log("🔄 Starting batch refresh worker...");

  try {
    // Reset daily counters if it's a new day
    await resetDailyCountersIfNeeded();

    // Get properties that need checking
    const propertiesToCheck = await prisma.property.findMany({
      where: {
        status: "ACTIVE",
        source_url: { not: null },
      },
      orderBy: [
        { priority_score: "desc" }, // High priority first
        { last_checked_at: "asc" }, // Then oldest checks
      ],
      select: {
        id: true,
        source_url: true,
        source: true,
        price: true,
        priority_score: true,
        check_count_today: true,
        last_checked_at: true,
        days_on_market: true,
        is_distressed: true,
        description: true,
        external_id: true,
        title: true,
        city: true,
        area_m2: true,
        rooms: true,
        listing_type: true,
        consecutive_failures: true,
        priceHistory: {
          orderBy: { recorded_at: "desc" },
          take: 3,
        },
        savedBy: {
          select: { id: true },
        },
      },
      take: BATCH_SIZE * 2, // Get more, then filter
    });

    // Filter to properties that actually need checking now
    const needsCheck = propertiesToCheck.filter(p => 
      shouldCheckNow(p.priority_score, p.check_count_today, p.last_checked_at)
    ).slice(0, BATCH_SIZE);

    if (needsCheck.length === 0) {
      console.log("✅ No properties need checking right now");
      return NextResponse.json({
        success: true,
        message: "No properties need checking",
        stats: { checked: 0, updated: 0, removed: 0, errors: 0 },
      });
    }

    console.log(`📋 Checking ${needsCheck.length} properties...`);

    // Perform health checks
    const healthResults = await batchHealthCheck(
      needsCheck.map(p => ({
        id: p.id,
        source_url: p.source_url,
        source: p.source,
        price: p.price,
      })),
      DELAY_BETWEEN_CHECKS_MS
    );

    // Process results
    const stats = {
      checked: 0,
      updated: 0,
      priceChanges: 0,
      removed: 0,
      errors: 0,
    };

    for (const property of needsCheck) {
      const result = healthResults.get(property.id);
      if (!result) continue;
      
      stats.checked++;

      try {
        if (!result.isActive) {
          // Property was removed/sold
          await handleRemovedProperty(property, result.removalReason);
          stats.removed++;
        } else if (result.priceChanged && result.newPrice) {
          // Price changed
          await handlePriceChange(property, result.newPrice);
          stats.priceChanges++;
          stats.updated++;
        } else if (result.error) {
          // Error occurred
          await handleCheckError(property);
          stats.errors++;
        } else {
          // Property is active, no changes
          await markAsChecked(property);
          stats.updated++;
        }

        // Update priority score
        const factors = extractPriorityFactors(
          { ...property, priceHistory: property.priceHistory } as any,
          new Date()
        );
        const newScore = calculatePriorityScore(factors);
        
        if (Math.abs(newScore - property.priority_score) >= 5) {
          await prisma.property.update({
            where: { id: property.id },
            data: { priority_score: newScore },
          });
        }

      } catch (error) {
        console.error(`❌ Error processing ${property.id}:`, error);
        stats.errors++;
      }
    }

    const duration = Date.now() - startTime;
    
    console.log(`\n📊 Batch Refresh Complete:`);
    console.log(`  - Checked: ${stats.checked}`);
    console.log(`  - Updated: ${stats.updated}`);
    console.log(`  - Price changes: ${stats.priceChanges}`);
    console.log(`  - Removed/Sold: ${stats.removed}`);
    console.log(`  - Errors: ${stats.errors}`);
    console.log(`  - Duration: ${duration}ms`);

    // Log to database
    await prisma.dataFetchLog.create({
      data: {
        source: "batch-refresh",
        status: stats.errors > stats.checked / 2 ? "partial" : "success",
        recordsCount: stats.checked,
        duration_ms: duration,
      },
    });

    return NextResponse.json({
      success: true,
      stats,
      duration_ms: duration,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("❌ Batch refresh failed:", errorMessage);

    await prisma.dataFetchLog.create({
      data: {
        source: "batch-refresh",
        status: "error",
        error: errorMessage,
        duration_ms: Date.now() - startTime,
      },
    });

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * Reset daily check counters at midnight
 */
async function resetDailyCountersIfNeeded() {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  // Check if we've already reset today
  const lastReset = await prisma.dataFetchLog.findFirst({
    where: {
      source: "daily-counter-reset",
      fetchedAt: { gte: today },
    },
  });

  if (!lastReset) {
    console.log("🔄 Resetting daily check counters...");
    
    await prisma.property.updateMany({
      where: { check_count_today: { gt: 0 } },
      data: { check_count_today: 0 },
    });

    await prisma.dataFetchLog.create({
      data: {
        source: "daily-counter-reset",
        status: "success",
      },
    });
  }
}

/**
 * Handle a property that was removed/sold
 */
async function handleRemovedProperty(
  property: any,
  removalReason: string | null
) {
  console.log(`📤 Property removed: ${property.id} (${removalReason || "unknown"})`);

  // Update property status
  await prisma.property.update({
    where: { id: property.id },
    data: {
      status: removalReason === "sold" ? "SOLD" : "REMOVED",
      last_seen_at: new Date(),
      last_checked_at: new Date(),
      check_count_today: { increment: 1 },
    },
  });

  // Create lifecycle record
  await prisma.propertyLifecycle.upsert({
    where: {
      source_externalId: {
        source: property.source,
        externalId: property.external_id || property.id,
      },
    },
    create: {
      externalId: property.external_id || property.id,
      source: property.source,
      city: property.city,
      title: property.title,
      initialPrice: property.price,
      finalPrice: property.price,
      priceChange: 0,
      priceChangePercent: 0,
      area_m2: property.area_m2,
      rooms: property.rooms,
      listingType: property.listing_type,
      firstSeenAt: property.first_listed_at || property.createdAt,
      lastSeenAt: new Date(),
      daysOnMarket: property.days_on_market,
      status: removalReason === "sold" ? "SOLD" : "REMOVED",
      removalReason: removalReason || "unknown",
    },
    update: {
      lastSeenAt: new Date(),
      finalPrice: property.price,
      daysOnMarket: property.days_on_market,
      status: removalReason === "sold" ? "SOLD" : "REMOVED",
      removalReason: removalReason || "unknown",
    },
  });
}

/**
 * Handle a price change
 */
async function handlePriceChange(property: any, newPrice: number) {
  console.log(`💰 Price change: ${property.id} - €${property.price} → €${newPrice}`);

  // Update property
  await prisma.property.update({
    where: { id: property.id },
    data: {
      price: newPrice,
      price_per_m2: property.area_m2 > 0 ? newPrice / property.area_m2 : newPrice,
      last_seen_at: new Date(),
      last_checked_at: new Date(),
      check_count_today: { increment: 1 },
      consecutive_failures: 0,
    },
  });

  // Add to price history
  await prisma.priceHistory.create({
    data: {
      propertyId: property.id,
      price: newPrice,
      price_per_m2: property.area_m2 > 0 ? newPrice / property.area_m2 : newPrice,
    },
  });

  // TODO: Send notifications to users who saved this property
}

/**
 * Handle a check error (network issue, etc.)
 */
async function handleCheckError(property: any) {
  const newFailureCount = property.consecutive_failures + 1;
  
  await prisma.property.update({
    where: { id: property.id },
    data: {
      last_checked_at: new Date(),
      check_count_today: { increment: 1 },
      consecutive_failures: newFailureCount,
      // If too many failures, lower priority
      priority_score: newFailureCount >= MAX_CONSECUTIVE_FAILURES 
        ? Math.max(0, property.priority_score - 20)
        : property.priority_score,
    },
  });

  if (newFailureCount >= MAX_CONSECUTIVE_FAILURES) {
    console.warn(`⚠️ Property ${property.id} has ${newFailureCount} consecutive failures`);
  }
}

/**
 * Mark property as checked (no changes)
 */
async function markAsChecked(property: any) {
  await prisma.property.update({
    where: { id: property.id },
    data: {
      last_seen_at: new Date(),
      last_checked_at: new Date(),
      check_count_today: { increment: 1 },
      consecutive_failures: 0,
      // Increment days on market
      days_on_market: { increment: 0 }, // Will be handled separately
    },
  });
}

// Also support POST for manual triggers
export async function POST(request: Request) {
  return GET(request);
}
