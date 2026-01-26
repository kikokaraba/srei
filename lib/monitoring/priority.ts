/**
 * Property Priority Scoring System
 * 
 * Determines how often a property should be checked based on various factors.
 * Higher score = more frequent checks
 * 
 * Scale: 0-100
 * - 80-100: Check 3x daily (hot properties)
 * - 50-79: Check 2x daily (active properties)
 * - 20-49: Check 1x daily (stable properties)
 * - 0-19: Check every 2-3 days (cold properties)
 */

import type { Property, ListingStatus } from "@/generated/prisma/client";

interface PriorityFactors {
  // Time-based
  daysOnMarket: number;
  daysSinceLastCheck: number;
  
  // Activity-based
  hasPriceChanges: boolean;
  priceChangeCount: number;
  recentPriceDropPercent: number;
  
  // User interest
  savedByUsersCount: number;
  
  // Quality signals
  hasPhotos: boolean;
  hasDescription: boolean;
  isDistressed: boolean;
  
  // Source reliability
  source: string;
}

export function calculatePriorityScore(factors: PriorityFactors): number {
  let score = 50; // Base score

  // =====================================
  // TIME-BASED FACTORS (±30 points)
  // =====================================
  
  // New listings (< 7 days) get priority boost
  if (factors.daysOnMarket < 3) {
    score += 25;
  } else if (factors.daysOnMarket < 7) {
    score += 15;
  } else if (factors.daysOnMarket < 14) {
    score += 10;
  } else if (factors.daysOnMarket < 30) {
    score += 5;
  } else if (factors.daysOnMarket > 90) {
    // Very old listings - lower priority
    score -= 15;
  } else if (factors.daysOnMarket > 60) {
    score -= 10;
  }

  // Haven't been checked recently - boost priority
  if (factors.daysSinceLastCheck > 2) {
    score += 20;
  } else if (factors.daysSinceLastCheck > 1) {
    score += 10;
  }

  // =====================================
  // ACTIVITY FACTORS (±25 points)
  // =====================================
  
  // Price changes indicate active listing
  if (factors.hasPriceChanges) {
    score += 10;
    
    // Multiple price changes = very active
    if (factors.priceChangeCount >= 3) {
      score += 10;
    } else if (factors.priceChangeCount >= 2) {
      score += 5;
    }
  }

  // Recent significant price drop - might sell soon
  if (factors.recentPriceDropPercent >= 10) {
    score += 15;
  } else if (factors.recentPriceDropPercent >= 5) {
    score += 10;
  } else if (factors.recentPriceDropPercent > 0) {
    score += 5;
  }

  // =====================================
  // USER INTEREST FACTORS (±15 points)
  // =====================================
  
  // Properties saved by users are more important
  if (factors.savedByUsersCount >= 5) {
    score += 15;
  } else if (factors.savedByUsersCount >= 3) {
    score += 10;
  } else if (factors.savedByUsersCount >= 1) {
    score += 5;
  }

  // =====================================
  // QUALITY SIGNALS (±10 points)
  // =====================================
  
  // Distressed properties are hot opportunities
  if (factors.isDistressed) {
    score += 10;
  }

  // Complete listings are more likely to be real
  if (factors.hasDescription) {
    score += 3;
  }
  if (factors.hasPhotos) {
    score += 2;
  }

  // =====================================
  // SOURCE FACTORS (±5 points)
  // =====================================
  
  // Some sources update more frequently
  if (factors.source === "NEHNUTELNOSTI") {
    score += 5; // Larger portal, more activity
  }

  // Clamp to 0-100 range
  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Determines how many times per day a property should be checked
 * based on its priority score
 */
export function getChecksPerDay(priorityScore: number): number {
  if (priorityScore >= 80) return 3;
  if (priorityScore >= 50) return 2;
  if (priorityScore >= 20) return 1;
  return 0; // Check every 2-3 days instead
}

/**
 * Determines if a property should be checked now based on
 * its priority score and how many times it's been checked today
 */
export function shouldCheckNow(
  priorityScore: number,
  checkCountToday: number,
  lastCheckedAt: Date | null
): boolean {
  const checksNeeded = getChecksPerDay(priorityScore);
  
  // Already checked enough times today
  if (checkCountToday >= checksNeeded) {
    return false;
  }

  // For low priority (< 20), check every 2-3 days
  if (priorityScore < 20 && lastCheckedAt) {
    const daysSinceCheck = (Date.now() - lastCheckedAt.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceCheck < 2) {
      return false;
    }
  }

  return true;
}

/**
 * Calculate priority factors from a property and related data
 */
export function extractPriorityFactors(
  property: Property & {
    priceHistory?: { price: number; recorded_at: Date }[];
    savedBy?: { id: string }[];
  },
  lastCheckedAt: Date | null
): PriorityFactors {
  const now = new Date();
  
  // Calculate days since last check
  const daysSinceLastCheck = lastCheckedAt
    ? (now.getTime() - lastCheckedAt.getTime()) / (1000 * 60 * 60 * 24)
    : 999; // Never checked = high priority

  // Calculate price change info
  const priceHistory = property.priceHistory || [];
  const hasPriceChanges = priceHistory.length > 1;
  const priceChangeCount = priceHistory.length - 1;
  
  // Calculate recent price drop
  let recentPriceDropPercent = 0;
  if (priceHistory.length >= 2) {
    const sortedHistory = [...priceHistory].sort(
      (a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime()
    );
    const current = sortedHistory[0].price;
    const previous = sortedHistory[1].price;
    if (previous > current) {
      recentPriceDropPercent = ((previous - current) / previous) * 100;
    }
  }

  return {
    daysOnMarket: property.days_on_market,
    daysSinceLastCheck,
    hasPriceChanges,
    priceChangeCount,
    recentPriceDropPercent,
    savedByUsersCount: property.savedBy?.length || 0,
    hasPhotos: true, // Assume true for now
    hasDescription: !!property.description && property.description.length > 50,
    isDistressed: property.is_distressed,
    source: property.source,
  };
}

/**
 * Batch update priority scores for properties
 */
export async function updatePriorityScores(
  prisma: any,
  propertyIds?: string[]
): Promise<{ updated: number }> {
  // Get properties with related data
  const whereClause = propertyIds 
    ? { id: { in: propertyIds } }
    : { status: "ACTIVE" as ListingStatus };

  const properties = await prisma.property.findMany({
    where: whereClause,
    include: {
      priceHistory: {
        orderBy: { recorded_at: "desc" },
        take: 5,
      },
      savedBy: {
        select: { id: true },
      },
    },
  });

  let updated = 0;
  
  for (const property of properties) {
    const factors = extractPriorityFactors(property, property.last_checked_at);
    const newScore = calculatePriorityScore(factors);
    
    // Only update if score changed significantly (±5)
    if (Math.abs(newScore - property.priority_score) >= 5) {
      await prisma.property.update({
        where: { id: property.id },
        data: { priority_score: newScore },
      });
      updated++;
    }
  }

  return { updated };
}
