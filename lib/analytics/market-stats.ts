/**
 * Market Statistics Library
 * Handles automatic data collection, aggregation, and trend analysis
 */

import { prisma } from "@/lib/prisma";
import type { SlovakCity, ListingType, PropertySource, PropertyCondition } from "@/generated/prisma/client";

/**
 * Create daily market statistics for all cities
 */
export async function createDailyStats() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const cities: SlovakCity[] = [
    "BRATISLAVA", "KOSICE", "PRESOV", "ZILINA",
    "BANSKA_BYSTRICA", "TRNAVA", "TRENCIN", "NITRA"
  ];
  
  const listingTypes: ListingType[] = ["PREDAJ", "PRENAJOM"];
  
  const results = [];
  
  for (const city of cities) {
    for (const listingType of listingTypes) {
      try {
        // Get current properties
        const properties = await prisma.property.findMany({
          where: { city, listing_type: listingType },
          select: {
            price: true,
            price_per_m2: true,
            days_on_market: true,
            is_distressed: true,
            createdAt: true,
          },
        });
        
        if (properties.length === 0) continue;
        
        // Calculate stats
        const prices = properties.map(p => p.price).sort((a, b) => a - b);
        const pricesPerM2 = properties.map(p => p.price_per_m2).sort((a, b) => a - b);
        const daysOnMarket = properties.map(p => p.days_on_market);
        
        const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
        const medianPrice = prices[Math.floor(prices.length / 2)];
        const avgPricePerM2 = pricesPerM2.reduce((a, b) => a + b, 0) / pricesPerM2.length;
        const medianPricePerM2 = pricesPerM2[Math.floor(pricesPerM2.length / 2)];
        const avgDays = daysOnMarket.reduce((a, b) => a + b, 0) / daysOnMarket.length;
        
        // Count new listings (created today)
        const newListings = properties.filter(p => {
          const created = new Date(p.createdAt);
          return created >= today;
        }).length;
        
        // Count hot deals
        const hotDeals = properties.filter(p => p.is_distressed).length;
        
        // Get yesterday's stats for comparison
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        
        const yesterdayStats = await prisma.dailyMarketStats.findUnique({
          where: {
            date_city_listingType: {
              date: yesterday,
              city,
              listingType,
            },
          },
        });
        
        // Calculate changes
        let priceChangePercent = null;
        let listingsChangePercent = null;
        
        if (yesterdayStats) {
          priceChangePercent = ((avgPrice - yesterdayStats.avgPrice) / yesterdayStats.avgPrice) * 100;
          listingsChangePercent = ((properties.length - yesterdayStats.totalListings) / yesterdayStats.totalListings) * 100;
        }
        
        // Count removed listings (compare with yesterday)
        const removedListings = yesterdayStats 
          ? Math.max(0, yesterdayStats.totalListings - properties.length + newListings)
          : 0;
        
        // Upsert daily stats
        const stat = await prisma.dailyMarketStats.upsert({
          where: {
            date_city_listingType: {
              date: today,
              city,
              listingType,
            },
          },
          create: {
            date: today,
            city,
            listingType,
            totalListings: properties.length,
            newListings,
            removedListings,
            avgPrice,
            medianPrice,
            avgPricePerM2,
            medianPricePerM2,
            minPrice: prices[0],
            maxPrice: prices[prices.length - 1],
            priceChangePercent,
            listingsChangePercent,
            avgDaysOnMarket: avgDays,
            hotDealsCount: hotDeals,
            hotDealsPercent: (hotDeals / properties.length) * 100,
          },
          update: {
            totalListings: properties.length,
            newListings,
            removedListings,
            avgPrice,
            medianPrice,
            avgPricePerM2,
            medianPricePerM2,
            minPrice: prices[0],
            maxPrice: prices[prices.length - 1],
            priceChangePercent,
            listingsChangePercent,
            avgDaysOnMarket: avgDays,
            hotDealsCount: hotDeals,
            hotDealsPercent: (hotDeals / properties.length) * 100,
          },
        });
        
        results.push(stat);
      } catch (error) {
        console.error(`Error creating stats for ${city}/${listingType}:`, error);
      }
    }
  }
  
  return results;
}

/**
 * Track removed listings - detect properties that are no longer in scrape results
 */
export async function trackRemovedListings(
  source: PropertySource,
  currentExternalIds: string[]
) {
  // Find properties from this source that we haven't seen
  const existingProperties = await prisma.property.findMany({
    where: {
      source,
      external_id: { notIn: currentExternalIds },
      // Only check properties we've seen in last 30 days
      updatedAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    },
    select: {
      id: true,
      external_id: true,
      source: true,
      city: true,
      district: true,
      title: true,
      price: true,
      area_m2: true,
      rooms: true,
      condition: true,
      listing_type: true,
      first_listed_at: true,
      createdAt: true,
      updatedAt: true,
      priceHistory: {
        orderBy: { recorded_at: "asc" },
        take: 1,
        select: { price: true },
      },
    },
  });
  
  const removedCount = { total: 0, tracked: 0 };
  
  for (const prop of existingProperties) {
    removedCount.total++;
    
    const firstSeenAt = prop.first_listed_at || prop.createdAt;
    const lastSeenAt = prop.updatedAt;
    const daysOnMarket = Math.floor((lastSeenAt.getTime() - firstSeenAt.getTime()) / (1000 * 60 * 60 * 24));
    const initialPrice = prop.priceHistory[0]?.price || prop.price;
    const priceChange = prop.price - initialPrice;
    const priceChangePercent = initialPrice > 0 ? (priceChange / initialPrice) * 100 : 0;
    
    try {
      await prisma.propertyLifecycle.upsert({
        where: {
          source_externalId: {
            source: prop.source,
            externalId: prop.external_id,
          },
        },
        create: {
          externalId: prop.external_id,
          source: prop.source,
          city: prop.city,
          district: prop.district,
          title: prop.title,
          initialPrice,
          finalPrice: prop.price,
          priceChange,
          priceChangePercent,
          area_m2: prop.area_m2,
          rooms: prop.rooms,
          condition: prop.condition,
          listingType: prop.listing_type,
          firstSeenAt,
          lastSeenAt,
          daysOnMarket,
          status: "REMOVED",
          removalReason: daysOnMarket < 30 ? "sold" : "unknown",
        },
        update: {
          finalPrice: prop.price,
          priceChange,
          priceChangePercent,
          lastSeenAt,
          daysOnMarket,
          status: "REMOVED",
        },
      });
      removedCount.tracked++;
    } catch (error) {
      console.error(`Error tracking removed property ${prop.external_id}:`, error);
    }
  }
  
  return removedCount;
}

/**
 * Create property snapshots for tracking changes over time
 */
export async function createPropertySnapshots() {
  // Get all active properties
  const properties = await prisma.property.findMany({
    select: {
      id: true,
      title: true,
      description: true,
      price: true,
      price_per_m2: true,
      source_url: true,
      snapshots: {
        orderBy: { snapshotAt: "desc" },
        take: 1,
      },
    },
  });
  
  let created = 0;
  let skipped = 0;
  
  for (const prop of properties) {
    const lastSnapshot = prop.snapshots[0];
    
    // Check if anything changed
    const priceChanged = lastSnapshot ? prop.price !== lastSnapshot.price : true;
    const descChanged = lastSnapshot ? prop.description !== lastSnapshot.description : false;
    
    // Only create snapshot if something changed or no previous snapshot
    if (!lastSnapshot || priceChanged || descChanged) {
      const priceChange = lastSnapshot ? prop.price - lastSnapshot.price : null;
      const priceChangePercent = lastSnapshot && lastSnapshot.price > 0
        ? (priceChange! / lastSnapshot.price) * 100
        : null;
      
      await prisma.propertySnapshot.create({
        data: {
          propertyId: prop.id,
          title: prop.title,
          description: prop.description,
          price: prop.price,
          price_per_m2: prop.price_per_m2,
          photos: "[]", // Simplified - not tracking photos
          source_url: prop.source_url,
          priceChange,
          priceChangePercent,
          descriptionChanged: descChanged,
        },
      });
      created++;
    } else {
      skipped++;
    }
  }
  
  return { created, skipped, total: properties.length };
}

/**
 * Create monthly aggregated statistics
 */
export async function createMonthlyStats() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 1-indexed
  
  // Get all daily stats for this month
  const startOfMonth = new Date(year, month - 1, 1);
  const endOfMonth = new Date(year, month, 0);
  
  const cities: SlovakCity[] = [
    "BRATISLAVA", "KOSICE", "PRESOV", "ZILINA",
    "BANSKA_BYSTRICA", "TRNAVA", "TRENCIN", "NITRA"
  ];
  
  const listingTypes: ListingType[] = ["PREDAJ", "PRENAJOM"];
  const results = [];
  
  for (const city of cities) {
    for (const listingType of listingTypes) {
      const dailyStats = await prisma.dailyMarketStats.findMany({
        where: {
          city,
          listingType,
          date: { gte: startOfMonth, lte: endOfMonth },
        },
      });
      
      if (dailyStats.length === 0) continue;
      
      // Aggregate
      const avgPrice = dailyStats.reduce((a, b) => a + b.avgPrice, 0) / dailyStats.length;
      const medianPrice = dailyStats.reduce((a, b) => a + b.medianPrice, 0) / dailyStats.length;
      const avgPricePerM2 = dailyStats.reduce((a, b) => a + b.avgPricePerM2, 0) / dailyStats.length;
      const medianPricePerM2 = dailyStats.reduce((a, b) => a + b.medianPricePerM2, 0) / dailyStats.length;
      const avgListings = dailyStats.reduce((a, b) => a + b.totalListings, 0) / dailyStats.length;
      const totalNew = dailyStats.reduce((a, b) => a + b.newListings, 0);
      const totalRemoved = dailyStats.reduce((a, b) => a + b.removedListings, 0);
      const avgDays = dailyStats.reduce((a, b) => a + b.avgDaysOnMarket, 0) / dailyStats.length;
      
      // Get previous month for comparison
      const prevMonth = month === 1 ? 12 : month - 1;
      const prevYear = month === 1 ? year - 1 : year;
      
      const prevMonthStats = await prisma.monthlyMarketStats.findUnique({
        where: {
          year_month_city_listingType: {
            year: prevYear,
            month: prevMonth,
            city,
            listingType,
          },
        },
      });
      
      const priceChangePercent = prevMonthStats
        ? ((avgPrice - prevMonthStats.avgPrice) / prevMonthStats.avgPrice) * 100
        : null;
      
      const stat = await prisma.monthlyMarketStats.upsert({
        where: {
          year_month_city_listingType: {
            year,
            month,
            city,
            listingType,
          },
        },
        create: {
          year,
          month,
          city,
          listingType,
          avgPrice,
          medianPrice,
          avgPricePerM2,
          medianPricePerM2,
          totalListings: Math.round(avgListings),
          totalNew,
          totalRemoved,
          avgDaysOnMarket: avgDays,
          priceChangePercent,
        },
        update: {
          avgPrice,
          medianPrice,
          avgPricePerM2,
          medianPricePerM2,
          totalListings: Math.round(avgListings),
          totalNew,
          totalRemoved,
          avgDaysOnMarket: avgDays,
          priceChangePercent,
        },
      });
      
      results.push(stat);
    }
  }
  
  return results;
}

/**
 * Get market trends for a city
 */
export async function getMarketTrends(city: SlovakCity, listingType: ListingType = "PREDAJ") {
  // Get last 30 days of stats
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const dailyStats = await prisma.dailyMarketStats.findMany({
    where: {
      city,
      listingType,
      date: { gte: thirtyDaysAgo },
    },
    orderBy: { date: "asc" },
  });
  
  // Get last 12 months
  const monthlyStats = await prisma.monthlyMarketStats.findMany({
    where: {
      city,
      listingType,
    },
    orderBy: [{ year: "desc" }, { month: "desc" }],
    take: 12,
  });
  
  // Get lifecycle data for this city
  const lifecycleStats = await prisma.propertyLifecycle.groupBy({
    by: ["status"],
    where: { city, listingType },
    _count: true,
    _avg: { daysOnMarket: true, priceChangePercent: true },
  });
  
  return {
    daily: dailyStats,
    monthly: monthlyStats.reverse(),
    lifecycle: lifecycleStats,
  };
}

/**
 * Get removed listings statistics
 */
export async function getRemovedListingsStats(city?: SlovakCity) {
  const where = city ? { city } : {};
  
  // Average days on market by city
  const avgDaysByCity = await prisma.propertyLifecycle.groupBy({
    by: ["city"],
    where,
    _avg: { daysOnMarket: true, priceChangePercent: true },
    _count: true,
  });
  
  // Quick sales (under 14 days)
  const quickSales = await prisma.propertyLifecycle.count({
    where: { ...where, daysOnMarket: { lte: 14 } },
  });
  
  // Slow movers (over 90 days)
  const slowMovers = await prisma.propertyLifecycle.count({
    where: { ...where, daysOnMarket: { gte: 90 } },
  });
  
  // Price reductions
  const priceDrops = await prisma.propertyLifecycle.count({
    where: { ...where, priceChangePercent: { lt: 0 } },
  });
  
  const priceIncreases = await prisma.propertyLifecycle.count({
    where: { ...where, priceChangePercent: { gt: 0 } },
  });
  
  return {
    byCity: avgDaysByCity,
    quickSales,
    slowMovers,
    priceDrops,
    priceIncreases,
  };
}
