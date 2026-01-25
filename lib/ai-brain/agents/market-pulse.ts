/**
 * SRIA AI Brain - Market Pulse Agent
 * 
 * Analyzuje trh v reálnom čase a generuje insights:
 * - Cenové trendy
 * - Hot deals a príležitosti
 * - Trhový sentiment
 * - Predikcie
 */

import { prisma } from "@/lib/prisma";
import { aiBrain } from "../core";
import type { AIInsight, MarketPulseData, AgentType } from "../types";
// SlovakCity enum removed - now using string for city field

const AGENT_TYPE: AgentType = "market-pulse";

// ============================================
// MAIN ANALYSIS FUNCTION
// ============================================

export async function runMarketPulseAnalysis(): Promise<AIInsight[]> {
  console.log("[Market Pulse] Starting analysis...");
  const insights: AIInsight[] = [];

  try {
    // 1. Analyze price trends
    const priceTrends = await analyzePriceTrends();
    if (priceTrends) {
      insights.push(...priceTrends);
    }

    // 2. Find hot deals
    const hotDeals = await analyzeHotDeals();
    if (hotDeals) {
      insights.push(...hotDeals);
    }

    // 3. Analyze market sentiment
    const sentiment = await analyzeMarketSentiment();
    if (sentiment) {
      insights.push(sentiment);
    }

    // 4. Generate predictions
    const predictions = await generatePredictions();
    if (predictions) {
      insights.push(...predictions);
    }

    // 5. Create daily summary
    const summary = await createDailySummary();
    if (summary) {
      insights.push(summary);
    }

    // Update last run time
    aiBrain.setLastRunTime(AGENT_TYPE, new Date());

    console.log(`[Market Pulse] Generated ${insights.length} insights`);
    return insights;

  } catch (error) {
    console.error("[Market Pulse] Error:", error);
    
    // Create error insight
    const errorInsight = await aiBrain.createInsight({
      agentType: AGENT_TYPE,
      category: "market",
      priority: "high",
      status: "new",
      title: "Market Pulse Analysis Failed",
      description: `Error during market analysis: ${error instanceof Error ? error.message : "Unknown error"}`,
      confidence: 100,
      impact: 50,
    });

    return [errorInsight];
  }
}

// ============================================
// PRICE TRENDS ANALYSIS
// ============================================

async function analyzePriceTrends(): Promise<AIInsight[]> {
  const insights: AIInsight[] = [];

  // Get recent daily stats
  const recentStats = await prisma.dailyMarketStats.findMany({
    where: {
      date: {
        gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
      },
    },
    orderBy: { date: "desc" },
    take: 100,
  });

  if (recentStats.length === 0) {
    return insights;
  }

  // Group by city
  const cityStats = new Map<string, typeof recentStats>();
  for (const stat of recentStats) {
    const existing = cityStats.get(stat.city) || [];
    existing.push(stat);
    cityStats.set(stat.city, existing);
  }

  // Analyze each city
  for (const [city, stats] of cityStats) {
    if (stats.length < 2) continue;

    const latestPrice = stats[0].avgPricePerM2;
    const previousPrice = stats[stats.length - 1].avgPricePerM2;
    const priceChange = ((latestPrice - previousPrice) / previousPrice) * 100;

    // Significant price increase (>5%)
    if (priceChange > 5) {
      const insight = await aiBrain.createInsight({
        agentType: AGENT_TYPE,
        category: "market",
        priority: "high",
        status: "new",
        title: `🚀 ${city}: Výrazný rast cien +${priceChange.toFixed(1)}%`,
        description: `Ceny nehnuteľností v meste ${city} vzrástli o ${priceChange.toFixed(1)}% za posledných 30 dní. Aktuálna priemerná cena: €${latestPrice.toFixed(0)}/m².`,
        details: `Predchádzajúca cena: €${previousPrice.toFixed(0)}/m²\nAktuálna cena: €${latestPrice.toFixed(0)}/m²\nZmena: +${priceChange.toFixed(1)}%`,
        confidence: 90,
        impact: 80,
        context: {
          city,
          priceChange,
          latestPrice,
          previousPrice,
          period: "30 dní",
        },
        suggestedAction: "Zvážte investíciu pred ďalším rastom cien",
        actionUrl: `/dashboard/analytics?city=${city}`,
      });
      insights.push(insight);
    }

    // Significant price drop (>5%)
    if (priceChange < -5) {
      const insight = await aiBrain.createInsight({
        agentType: AGENT_TYPE,
        category: "market",
        priority: "high",
        status: "new",
        title: `📉 ${city}: Pokles cien ${priceChange.toFixed(1)}%`,
        description: `Ceny nehnuteľností v meste ${city} klesli o ${Math.abs(priceChange).toFixed(1)}% za posledných 30 dní. Potenciálna príležitosť na nákup!`,
        details: `Predchádzajúca cena: €${previousPrice.toFixed(0)}/m²\nAktuálna cena: €${latestPrice.toFixed(0)}/m²\nZmena: ${priceChange.toFixed(1)}%`,
        confidence: 90,
        impact: 85,
        context: {
          city,
          priceChange,
          latestPrice,
          previousPrice,
          period: "30 dní",
        },
        suggestedAction: "Analyzujte príčinu poklesu a zvážte nákup",
        actionUrl: `/dashboard/analytics?city=${city}`,
      });
      insights.push(insight);
    }
  }

  return insights;
}

// ============================================
// HOT DEALS ANALYSIS
// ============================================

async function analyzeHotDeals(): Promise<AIInsight[]> {
  const insights: AIInsight[] = [];

  // Find properties significantly below market average
  const properties = await prisma.property.findMany({
    where: {
      createdAt: {
        gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
      },
      is_distressed: false,
    },
    include: {
      investmentMetrics: true,
    },
    take: 500,
    orderBy: { price_per_m2: "asc" },
  });

  if (properties.length === 0) {
    return insights;
  }

  // Group by city and find deals
  const cityGroups = new Map<string, typeof properties>();
  for (const prop of properties) {
    const existing = cityGroups.get(prop.city) || [];
    existing.push(prop);
    cityGroups.set(prop.city, existing);
  }

  for (const [city, cityProps] of cityGroups) {
    if (cityProps.length < 5) continue;

    // Calculate city average
    const avgPrice = cityProps.reduce((sum, p) => sum + p.price_per_m2, 0) / cityProps.length;
    
    // Find properties 20%+ below average
    const hotDeals = cityProps.filter(p => p.price_per_m2 < avgPrice * 0.8);

    if (hotDeals.length > 3) {
      const insight = await aiBrain.createInsight({
        agentType: AGENT_TYPE,
        category: "market",
        priority: "high",
        status: "new",
        title: `🔥 ${city}: ${hotDeals.length} nových hot deals!`,
        description: `V meste ${city} sme našli ${hotDeals.length} nehnuteľností s cenou 20%+ pod priemerom. Priemerná cena v meste: €${avgPrice.toFixed(0)}/m².`,
        details: hotDeals.slice(0, 5).map(d => 
          `- ${d.title}: €${d.price_per_m2.toFixed(0)}/m² (${(((avgPrice - d.price_per_m2) / avgPrice) * 100).toFixed(0)}% pod priemerom)`
        ).join("\n"),
        confidence: 85,
        impact: 90,
        context: {
          city,
          hotDealsCount: hotDeals.length,
          avgPrice,
          deals: hotDeals.slice(0, 5).map(d => ({
            id: d.id,
            title: d.title,
            price: d.price_per_m2,
            discount: ((avgPrice - d.price_per_m2) / avgPrice) * 100,
          })),
        },
        suggestedAction: "Prezrite si tieto príležitosti",
        actionUrl: `/dashboard/properties?city=${city}&sort=price_asc`,
      });
      insights.push(insight);
    }
  }

  return insights;
}

// ============================================
// MARKET SENTIMENT ANALYSIS
// ============================================

async function analyzeMarketSentiment(): Promise<AIInsight | null> {
  // Get market metrics
  const recentStats = await prisma.dailyMarketStats.findMany({
    where: {
      date: {
        gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      },
    },
    orderBy: { date: "desc" },
    take: 50,
  });

  if (recentStats.length === 0) {
    return null;
  }

  // Calculate sentiment indicators
  const avgPriceChange = recentStats.reduce((sum, s) => sum + (s.priceChangePercent || 0), 0) / recentStats.length;
  const avgNewListings = recentStats.reduce((sum, s) => sum + s.newListings, 0) / recentStats.length;
  const avgRemovedListings = recentStats.reduce((sum, s) => sum + s.removedListings, 0) / recentStats.length;
  
  // Supply/demand ratio
  const supplyDemandRatio = avgNewListings / (avgRemovedListings || 1);
  
  // Determine sentiment
  let sentiment: "bullish" | "bearish" | "neutral" = "neutral";
  let sentimentScore = 0;

  if (avgPriceChange > 1 && supplyDemandRatio < 1.2) {
    sentiment = "bullish";
    sentimentScore = 50 + Math.min(avgPriceChange * 10, 50);
  } else if (avgPriceChange < -1 && supplyDemandRatio > 1.5) {
    sentiment = "bearish";
    sentimentScore = -50 - Math.min(Math.abs(avgPriceChange) * 10, 50);
  } else {
    sentiment = "neutral";
    sentimentScore = avgPriceChange * 10;
  }

  const sentimentEmoji = sentiment === "bullish" ? "📈" : sentiment === "bearish" ? "📉" : "➡️";
  const sentimentText = sentiment === "bullish" ? "Býčí trh" : sentiment === "bearish" ? "Medvedí trh" : "Stabilný trh";

  return aiBrain.createInsight({
    agentType: AGENT_TYPE,
    category: "market",
    priority: "medium",
    status: "new",
    title: `${sentimentEmoji} Trhový sentiment: ${sentimentText}`,
    description: `Aktuálny trhový sentiment je ${sentimentText.toLowerCase()}. Priemerná zmena cien: ${avgPriceChange > 0 ? "+" : ""}${avgPriceChange.toFixed(2)}%. Pomer nových/predaných: ${supplyDemandRatio.toFixed(2)}.`,
    details: `Sentiment skóre: ${sentimentScore.toFixed(0)}/100\nPriemerná zmena cien: ${avgPriceChange.toFixed(2)}%\nNové inzeráty/deň: ${avgNewListings.toFixed(0)}\nPredané/deň: ${avgRemovedListings.toFixed(0)}`,
    confidence: 75,
    impact: 60,
    context: {
      sentiment,
      sentimentScore,
      avgPriceChange,
      supplyDemandRatio,
    },
  });
}

// ============================================
// PREDICTIONS
// ============================================

async function generatePredictions(): Promise<AIInsight[]> {
  const insights: AIInsight[] = [];

  // Get historical data for trend analysis
  const monthlyStats = await prisma.monthlyMarketStats.findMany({
    where: {
      year: { gte: new Date().getFullYear() - 1 },
    },
    orderBy: [{ year: "desc" }, { month: "desc" }],
    take: 24,
  });

  if (monthlyStats.length < 3) {
    return insights;
  }

  // Group by city
  const cityTrends = new Map<string, typeof monthlyStats>();
  for (const stat of monthlyStats) {
    const existing = cityTrends.get(stat.city) || [];
    existing.push(stat);
    cityTrends.set(stat.city, existing);
  }

  for (const [city, trends] of cityTrends) {
    if (trends.length < 3) continue;

    // Simple linear regression for price prediction
    const prices = trends.map(t => t.avgPricePerM2).reverse();
    const avgGrowth = prices.length > 1 
      ? (prices[prices.length - 1] - prices[0]) / prices[0] / prices.length * 12 * 100 // Annualized
      : 0;

    // Predict next 6 months
    const currentPrice = prices[prices.length - 1];
    const predictedPrice = currentPrice * (1 + avgGrowth / 100 / 2);
    const predictedChange = ((predictedPrice - currentPrice) / currentPrice) * 100;

    if (Math.abs(predictedChange) > 3) {
      const direction = predictedChange > 0 ? "rast" : "pokles";
      const emoji = predictedChange > 0 ? "📈" : "📉";

      const insight = await aiBrain.createInsight({
        agentType: AGENT_TYPE,
        category: "market",
        priority: "medium",
        status: "new",
        title: `${emoji} Predikcia ${city}: ${direction} ${Math.abs(predictedChange).toFixed(1)}%`,
        description: `Na základe historických dát predpokladáme ${direction} cien v meste ${city} o ${Math.abs(predictedChange).toFixed(1)}% v nasledujúcich 6 mesiacoch.`,
        details: `Aktuálna cena: €${currentPrice.toFixed(0)}/m²\nPredikovaná cena: €${predictedPrice.toFixed(0)}/m²\nRočný trend: ${avgGrowth > 0 ? "+" : ""}${avgGrowth.toFixed(1)}%`,
        confidence: 65,
        impact: 70,
        context: {
          city,
          currentPrice,
          predictedPrice,
          predictedChange,
          avgGrowth,
          horizon: "6 mesiacov",
        },
      });
      insights.push(insight);
    }
  }

  return insights;
}

// ============================================
// DAILY SUMMARY
// ============================================

async function createDailySummary(): Promise<AIInsight | null> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Get today's stats
  const todayStats = await prisma.dailyMarketStats.findMany({
    where: {
      date: today,
    },
  });

  if (todayStats.length === 0) {
    return null;
  }

  const totalListings = todayStats.reduce((sum, s) => sum + s.totalListings, 0);
  const newListings = todayStats.reduce((sum, s) => sum + s.newListings, 0);
  const hotDeals = todayStats.reduce((sum, s) => sum + s.hotDealsCount, 0);
  const avgPriceChange = todayStats.reduce((sum, s) => sum + (s.priceChangePercent || 0), 0) / todayStats.length;

  const summary = `
📊 **Denný Market Pulse - ${today.toLocaleDateString("sk-SK")}**

• Celkový počet inzerátov: ${totalListings.toLocaleString()}
• Nové inzeráty: +${newListings}
• Hot deals: ${hotDeals} 🔥
• Zmena cien: ${avgPriceChange > 0 ? "+" : ""}${avgPriceChange.toFixed(2)}%

${avgPriceChange > 0 
  ? "Trh je v rastovom móde. Ceny pomaly stúpajú." 
  : avgPriceChange < 0 
    ? "Trh sa ochladzuje. Príležitosť na vyjednávanie." 
    : "Trh je stabilný. Ideálny čas na analýzu."}
  `.trim();

  return aiBrain.createInsight({
    agentType: AGENT_TYPE,
    category: "market",
    priority: "low",
    status: "new",
    title: `📊 Denný Market Pulse - ${today.toLocaleDateString("sk-SK")}`,
    description: `Zhrnutie trhu: ${totalListings.toLocaleString()} inzerátov, ${newListings} nových, ${hotDeals} hot deals.`,
    details: summary,
    confidence: 95,
    impact: 40,
    context: {
      date: today.toISOString(),
      totalListings,
      newListings,
      hotDeals,
      avgPriceChange,
    },
    actionUrl: "/dashboard",
  });
}

// ============================================
// EXPORT
// ============================================

export const marketPulseAgent = {
  type: AGENT_TYPE,
  name: "Market Pulse",
  description: "Analyzuje trh a generuje insights o cenových trendoch, hot deals a predikciách",
  run: runMarketPulseAnalysis,
} as const;
