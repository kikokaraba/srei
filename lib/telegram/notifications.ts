// Telegram Notification Service
// Handles sending notifications to users based on their preferences

import { prisma } from "@/lib/prisma";
import {
  sendPropertyNotification,
  sendDailySummary,
} from "./bot";
import {
  PropertyNotification,
  DailySummaryNotification,
  NotificationType,
} from "./types";

const SITE_URL = process.env.NEXTAUTH_URL || "https://sria.sk";

// ============================================
// Get Users to Notify
// ============================================

interface TelegramUser {
  id: string;
  telegramChatId: string | null;
  telegramEnabled: boolean;
  notifyMarketGaps: boolean;
  notifyPriceDrops: boolean;
  notifyNewProperties: boolean;
  notifyHighYield: boolean;
  notifyDistressed: boolean;
  notifyUrbanDevelopment: boolean;
  notificationFrequency: string | null;
  trackedRegions: string;
  trackedCities: string;
  trackedDistricts: string;
  user: {
    role: string;
  };
}

async function getTelegramUsers(
  notificationType: NotificationType,
  city?: string
): Promise<TelegramUser[]> {
  // Map notification type to preference field
  const preferenceField = {
    market_gap: "notifyMarketGaps",
    price_drop: "notifyPriceDrops",
    new_property: "notifyNewProperties",
    hot_deal: "notifyMarketGaps", // Hot deals use market gaps preference
    high_yield: "notifyHighYield",
    distressed: "notifyDistressed",
    urban_development: "notifyUrbanDevelopment",
    daily_summary: "notifyMarketGaps", // Daily summary always sent
  }[notificationType];

  const users = await prisma.userPreferences.findMany({
    where: {
      telegramEnabled: true,
      telegramChatId: { not: null },
      [preferenceField]: true,
      user: {
        // Only Pro users (ADMIN or PREMIUM_INVESTOR) get Telegram notifications
        role: { in: ["ADMIN", "PREMIUM_INVESTOR"] },
      },
    },
    select: {
      id: true,
      telegramChatId: true,
      telegramEnabled: true,
      notifyMarketGaps: true,
      notifyPriceDrops: true,
      notifyNewProperties: true,
      notifyHighYield: true,
      notifyDistressed: true,
      notifyUrbanDevelopment: true,
      notificationFrequency: true,
      trackedRegions: true,
      trackedCities: true,
      trackedDistricts: true,
      user: {
        select: { role: true },
      },
    },
  });

  // Filter by city/region if specified
  if (city) {
    return users.filter((user) => {
      if (!user.telegramChatId) return false;
      
      const trackedCities = safeParseArray(user.trackedCities);
      const trackedRegions = safeParseArray(user.trackedRegions);
      
      // If user tracks specific cities, check if this city is in the list
      if (trackedCities.length > 0) {
        if (trackedCities.includes(city)) return true;
      }
      
      // If user tracks regions, check if city is in tracked region
      // For now, simplified - just return true if they track anything
      if (trackedRegions.length > 0) {
        // Would need city-to-region mapping
        return true;
      }
      
      // If no specific tracking, send to all
      return trackedCities.length === 0 && trackedRegions.length === 0;
    });
  }

  return users;
}

function safeParseArray(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// ============================================
// Notification Functions
// ============================================

export async function notifyMarketGap(
  propertyId: string,
  gapPercent: number,
  fairValue: number
): Promise<number> {
  const property = await prisma.property.findUnique({
    where: { id: propertyId },
  });

  if (!property) return 0;

  const users = await getTelegramUsers("market_gap", property.city);
  let sentCount = 0;

  const notification: PropertyNotification = {
    type: "market_gap",
    propertyId: property.id,
    title: property.title,
    city: property.city,
    district: property.district || undefined,
    price: property.price,
    pricePerM2: property.price_per_m2 || undefined,
    area: property.area_m2 || undefined,
    rooms: property.rooms || undefined,
    gapPercent,
    fairValue,
    sourceUrl: property.source_url || undefined,
    siteUrl: `${SITE_URL}/dashboard/properties/${property.id}`,
  };

  for (const user of users) {
    if (user.telegramChatId) {
      const success = await sendPropertyNotification(
        user.telegramChatId,
        notification
      );
      if (success) sentCount++;
    }
  }

  // Mark as notified in database
  await prisma.marketGap.updateMany({
    where: { propertyId },
    data: {
      notified: true,
      notified_at: new Date(),
    },
  });

  return sentCount;
}

export async function notifyPriceDrop(
  propertyId: string,
  oldPrice: number,
  newPrice: number
): Promise<number> {
  const property = await prisma.property.findUnique({
    where: { id: propertyId },
  });

  if (!property) return 0;

  const priceDropPercent = ((oldPrice - newPrice) / oldPrice) * 100;
  
  // Only notify for significant drops (> 5%)
  if (priceDropPercent < 5) return 0;

  const users = await getTelegramUsers("price_drop", property.city);
  let sentCount = 0;

  const notification: PropertyNotification = {
    type: "price_drop",
    propertyId: property.id,
    title: property.title,
    city: property.city,
    district: property.district || undefined,
    price: newPrice,
    pricePerM2: property.price_per_m2 || undefined,
    area: property.area_m2 || undefined,
    rooms: property.rooms || undefined,
    oldPrice,
    priceDropPercent,
    sourceUrl: property.source_url || undefined,
    siteUrl: `${SITE_URL}/dashboard/properties/${property.id}`,
  };

  for (const user of users) {
    if (user.telegramChatId) {
      const success = await sendPropertyNotification(
        user.telegramChatId,
        notification
      );
      if (success) sentCount++;
    }
  }

  return sentCount;
}

export async function notifyHotDeal(
  propertyId: string,
  yield_?: number
): Promise<number> {
  const property = await prisma.property.findUnique({
    where: { id: propertyId },
  });

  if (!property) return 0;

  const users = await getTelegramUsers("hot_deal", property.city);
  let sentCount = 0;

  const notification: PropertyNotification = {
    type: "hot_deal",
    propertyId: property.id,
    title: property.title,
    city: property.city,
    district: property.district || undefined,
    price: property.price,
    pricePerM2: property.price_per_m2 || undefined,
    area: property.area_m2 || undefined,
    rooms: property.rooms || undefined,
    yield: yield_,
    sourceUrl: property.source_url || undefined,
    siteUrl: `${SITE_URL}/dashboard/properties/${property.id}`,
  };

  for (const user of users) {
    if (user.telegramChatId) {
      const success = await sendPropertyNotification(
        user.telegramChatId,
        notification
      );
      if (success) sentCount++;
    }
  }

  return sentCount;
}

export async function notifyHighYield(
  propertyId: string,
  yieldPercent: number
): Promise<number> {
  const property = await prisma.property.findUnique({
    where: { id: propertyId },
  });

  if (!property) return 0;

  // Only notify for yields above 8%
  if (yieldPercent < 8) return 0;

  const users = await getTelegramUsers("high_yield", property.city);
  let sentCount = 0;

  const notification: PropertyNotification = {
    type: "high_yield",
    propertyId: property.id,
    title: property.title,
    city: property.city,
    district: property.district || undefined,
    price: property.price,
    pricePerM2: property.price_per_m2 || undefined,
    area: property.area_m2 || undefined,
    rooms: property.rooms || undefined,
    yield: yieldPercent,
    sourceUrl: property.source_url || undefined,
    siteUrl: `${SITE_URL}/dashboard/properties/${property.id}`,
  };

  for (const user of users) {
    if (user.telegramChatId) {
      const success = await sendPropertyNotification(
        user.telegramChatId,
        notification
      );
      if (success) sentCount++;
    }
  }

  return sentCount;
}

export async function sendDailySummaryToAll(): Promise<number> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Get today's stats
  const [newProperties, marketGaps, priceDrops, hotDeals] = await Promise.all([
    prisma.property.count({
      where: { createdAt: { gte: today } },
    }),
    prisma.marketGap.count({
      where: { detected_at: { gte: today } },
    }),
    prisma.priceHistory.count({
      where: {
        recorded_at: { gte: today },
        // Price drop = negative change
      },
    }),
    prisma.property.count({
      where: {
        createdAt: { gte: today },
        is_distressed: true,
      },
    }),
  ]);

  // Get top deals
  const topGaps = await prisma.marketGap.findMany({
    where: { detected_at: { gte: today } },
    orderBy: { gap_percentage: "desc" },
    take: 3,
    include: { property: true },
  });

  const topDeals: PropertyNotification[] = topGaps.map((gap) => ({
    type: "market_gap" as const,
    propertyId: gap.propertyId,
    title: gap.property.title,
    city: gap.property.city,
    district: gap.property.district || undefined,
    price: gap.property.price,
    gapPercent: gap.gap_percentage,
    siteUrl: `${SITE_URL}/dashboard/properties/${gap.propertyId}`,
  }));

  const summary: DailySummaryNotification = {
    type: "daily_summary",
    date: today,
    newProperties,
    marketGaps,
    priceDrops,
    hotDeals,
    topDeals,
  };

  // Get users who want daily summaries
  const users = await prisma.userPreferences.findMany({
    where: {
      telegramEnabled: true,
      telegramChatId: { not: null },
      notificationFrequency: "daily",
      user: {
        role: { in: ["ADMIN", "PREMIUM_INVESTOR"] },
      },
    },
    select: {
      telegramChatId: true,
    },
  });

  let sentCount = 0;

  for (const user of users) {
    if (user.telegramChatId) {
      const success = await sendDailySummary(user.telegramChatId, summary);
      if (success) sentCount++;
    }
  }

  return sentCount;
}

// ============================================
// Batch Notification for Unnotified Gaps
// ============================================

export async function notifyUnnotifiedMarketGaps(): Promise<{
  processed: number;
  notified: number;
}> {
  // Get unnotified market gaps from last 24h with significant discount
  const gaps = await prisma.marketGap.findMany({
    where: {
      notified: false,
      gap_percentage: { gte: 10 }, // Only notify for 10%+ gaps
      detected_at: {
        gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
      },
    },
    include: { property: true },
    take: 50, // Limit to prevent spam
  });

  let notifiedCount = 0;

  for (const gap of gaps) {
    // Calculate fair value from street average and property area
    const fairValue = gap.street_avg_price * (gap.property.area_m2 || 1);
    const count = await notifyMarketGap(
      gap.propertyId,
      gap.gap_percentage,
      fairValue
    );
    if (count > 0) notifiedCount++;
  }

  return {
    processed: gaps.length,
    notified: notifiedCount,
  };
}
