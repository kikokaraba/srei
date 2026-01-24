/**
 * SRIA AI Brain - Data Quality Monitor Agent
 * 
 * Monitoruje kvalitu dát a identifikuje problémy:
 * - Chýbajúce údaje
 * - Duplicity
 * - Nekonzistentné dáta
 * - Zastaralé záznamy
 * - Anomálie
 */

import { prisma } from "@/lib/prisma";
import { aiBrain } from "../core";
import type { AIInsight, DataQualityReport, AgentType } from "../types";

const AGENT_TYPE: AgentType = "data-quality";

// ============================================
// MAIN ANALYSIS FUNCTION
// ============================================

export async function runDataQualityAnalysis(): Promise<AIInsight[]> {
  console.log("[Data Quality] Starting analysis...");
  const insights: AIInsight[] = [];

  try {
    // 1. Check for missing data
    const missingData = await checkMissingData();
    if (missingData) {
      insights.push(...missingData);
    }

    // 2. Check for duplicates
    const duplicates = await checkDuplicates();
    if (duplicates) {
      insights.push(...duplicates);
    }

    // 3. Check for stale data
    const staleData = await checkStaleData();
    if (staleData) {
      insights.push(...staleData);
    }

    // 4. Check for anomalies
    const anomalies = await checkAnomalies();
    if (anomalies) {
      insights.push(...anomalies);
    }

    // 5. Generate overall report
    const report = await generateQualityReport();
    if (report) {
      insights.push(report);
    }

    // Update last run time
    aiBrain.setLastRunTime(AGENT_TYPE, new Date());

    console.log(`[Data Quality] Generated ${insights.length} insights`);
    return insights;

  } catch (error) {
    console.error("[Data Quality] Error:", error);
    
    const errorInsight = await aiBrain.createInsight({
      agentType: AGENT_TYPE,
      category: "data",
      priority: "high",
      status: "new",
      title: "Data Quality Analysis Failed",
      description: `Error during data quality check: ${error instanceof Error ? error.message : "Unknown error"}`,
      confidence: 100,
      impact: 60,
    });

    return [errorInsight];
  }
}

// ============================================
// MISSING DATA CHECK
// ============================================

async function checkMissingData(): Promise<AIInsight[]> {
  const insights: AIInsight[] = [];

  // Check properties with missing critical fields
  const propertiesWithMissingData = await prisma.property.count({
    where: {
      OR: [
        { latitude: null },
        { longitude: null },
        { description: null },
        { street: null },
        { rooms: null },
      ],
    },
  });

  const totalProperties = await prisma.property.count();
  const missingPercentage = totalProperties > 0 ? (propertiesWithMissingData / totalProperties) * 100 : 0;

  if (missingPercentage > 10) {
    const insight = await aiBrain.createInsight({
      agentType: AGENT_TYPE,
      category: "data",
      priority: missingPercentage > 30 ? "critical" : "high",
      status: "new",
      title: `⚠️ ${missingPercentage.toFixed(1)}% nehnuteľností má nekompletné dáta`,
      description: `${propertiesWithMissingData.toLocaleString()} z ${totalProperties.toLocaleString()} nehnuteľností má chýbajúce kritické údaje (súradnice, popis, ulica, počet izieb).`,
      details: `Chýbajúce údaje môžu ovplyvniť:\n- Zobrazenie na mape\n- Presnosť vyhľadávania\n- Kvalitu analýz\n\nOdporúčame spustiť re-scraping alebo dátovú enrichment pipeline.`,
      confidence: 95,
      impact: 70,
      context: {
        totalProperties,
        propertiesWithMissingData,
        missingPercentage,
      },
      suggestedAction: "Spustite data enrichment proces",
      actionUrl: "/admin/data",
    });
    insights.push(insight);
  }

  // Check specific fields
  const missingCoordinates = await prisma.property.count({
    where: { latitude: null, longitude: null },
  });

  if (missingCoordinates > 100) {
    const insight = await aiBrain.createInsight({
      agentType: AGENT_TYPE,
      category: "data",
      priority: "medium",
      status: "new",
      title: `📍 ${missingCoordinates} nehnuteľností bez súradníc`,
      description: `Tieto nehnuteľnosti sa nezobrazujú na mape. Odporúčame geocoding.`,
      confidence: 95,
      impact: 50,
      context: { missingCoordinates },
      suggestedAction: "Spustite geocoding proces",
    });
    insights.push(insight);
  }

  return insights;
}

// ============================================
// DUPLICATES CHECK
// ============================================

async function checkDuplicates(): Promise<AIInsight[]> {
  const insights: AIInsight[] = [];

  // Check for duplicate properties (same external_id and source)
  const duplicateGroups = await prisma.$queryRaw<Array<{ source: string; external_id: string; count: bigint }>>`
    SELECT source, external_id, COUNT(*) as count
    FROM "Property"
    WHERE external_id IS NOT NULL
    GROUP BY source, external_id
    HAVING COUNT(*) > 1
    LIMIT 100
  `;

  const duplicateCount = duplicateGroups.reduce((sum, g) => sum + Number(g.count) - 1, 0);

  if (duplicateCount > 10) {
    const insight = await aiBrain.createInsight({
      agentType: AGENT_TYPE,
      category: "data",
      priority: duplicateCount > 100 ? "high" : "medium",
      status: "new",
      title: `🔄 Nájdených ${duplicateCount} duplicitných záznamov`,
      description: `V databáze sa nachádza ${duplicateCount} duplicitných nehnuteľností. Tieto by mali byť zlúčené alebo odstránené.`,
      details: `Top duplicitné skupiny:\n${duplicateGroups.slice(0, 5).map(g => 
        `- ${g.source}: ${g.external_id} (${g.count}x)`
      ).join("\n")}`,
      confidence: 90,
      impact: 40,
      context: {
        duplicateCount,
        groups: duplicateGroups.slice(0, 10),
      },
      suggestedAction: "Spustite deduplikačný proces",
      actionUrl: "/admin/data",
    });
    insights.push(insight);
  }

  // Check PropertyMatch table for unconfirmed matches
  const unconfirmedMatches = await prisma.propertyMatch.count({
    where: { isConfirmed: false },
  });

  if (unconfirmedMatches > 50) {
    const insight = await aiBrain.createInsight({
      agentType: AGENT_TYPE,
      category: "data",
      priority: "low",
      status: "new",
      title: `🔗 ${unconfirmedMatches} nepotvrdených duplicít čaká na review`,
      description: `AI našla ${unconfirmedMatches} potenciálnych duplicít, ktoré čakajú na manuálne potvrdenie.`,
      confidence: 80,
      impact: 30,
      context: { unconfirmedMatches },
      suggestedAction: "Prejdite si nepotvrdené duplicity",
      actionUrl: "/admin/data?tab=duplicates",
    });
    insights.push(insight);
  }

  return insights;
}

// ============================================
// STALE DATA CHECK
// ============================================

async function checkStaleData(): Promise<AIInsight[]> {
  const insights: AIInsight[] = [];

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  // Properties not updated in 30 days
  const staleProperties = await prisma.property.count({
    where: {
      updatedAt: { lt: thirtyDaysAgo },
    },
  });

  const totalProperties = await prisma.property.count();
  const stalePercentage = totalProperties > 0 ? (staleProperties / totalProperties) * 100 : 0;

  if (stalePercentage > 20) {
    const insight = await aiBrain.createInsight({
      agentType: AGENT_TYPE,
      category: "data",
      priority: stalePercentage > 50 ? "high" : "medium",
      status: "new",
      title: `⏰ ${stalePercentage.toFixed(1)}% nehnuteľností je zastaralých`,
      description: `${staleProperties.toLocaleString()} nehnuteľností nebolo aktualizovaných viac ako 30 dní. Tieto môžu byť už predané alebo stiahnuté.`,
      details: `Zastaralé dáta môžu:\n- Skresľovať trhové štatistiky\n- Frustrovať používateľov\n- Znižovať dôveryhodnosť platformy`,
      confidence: 90,
      impact: 60,
      context: {
        staleProperties,
        stalePercentage,
        threshold: "30 dní",
      },
      suggestedAction: "Spustite re-scraping zastaralých záznamov",
      actionUrl: "/admin/data?tab=stale",
    });
    insights.push(insight);
  }

  // Check daily stats freshness
  const latestStats = await prisma.dailyMarketStats.findFirst({
    orderBy: { date: "desc" },
  });

  if (!latestStats || latestStats.date < sevenDaysAgo) {
    const insight = await aiBrain.createInsight({
      agentType: AGENT_TYPE,
      category: "data",
      priority: "critical",
      status: "new",
      title: `🚨 Denné štatistiky nie sú aktualizované`,
      description: `Posledná aktualizácia denných štatistík: ${latestStats ? latestStats.date.toLocaleDateString("sk-SK") : "nikdy"}. Štatistiky by mali byť aktualizované denne.`,
      confidence: 100,
      impact: 80,
      context: {
        lastUpdate: latestStats?.date,
      },
      suggestedAction: "Skontrolujte a spustite stats aggregation job",
    });
    insights.push(insight);
  }

  return insights;
}

// ============================================
// ANOMALY DETECTION
// ============================================

async function checkAnomalies(): Promise<AIInsight[]> {
  const insights: AIInsight[] = [];

  // Check for unrealistic prices
  const unrealisticPrices = await prisma.property.count({
    where: {
      OR: [
        { price_per_m2: { lt: 100 } },   // Less than €100/m²
        { price_per_m2: { gt: 20000 } }, // More than €20,000/m²
        { price: { lt: 1000 } },          // Less than €1,000
        { price: { gt: 10000000 } },      // More than €10M
      ],
    },
  });

  if (unrealisticPrices > 5) {
    const insight = await aiBrain.createInsight({
      agentType: AGENT_TYPE,
      category: "data",
      priority: "medium",
      status: "new",
      title: `🎯 ${unrealisticPrices} nehnuteľností s nerealistickými cenami`,
      description: `Boli nájdené nehnuteľnosti s podozrivými cenami (príliš nízke alebo vysoké). Tieto môžu byť chyby pri scrapovaní.`,
      confidence: 85,
      impact: 40,
      context: { unrealisticPrices },
      suggestedAction: "Manuálne skontrolujte tieto záznamy",
    });
    insights.push(insight);
  }

  // Check for unrealistic areas
  const unrealisticAreas = await prisma.property.count({
    where: {
      OR: [
        { area_m2: { lt: 5 } },    // Less than 5m²
        { area_m2: { gt: 5000 } }, // More than 5000m²
      ],
    },
  });

  if (unrealisticAreas > 5) {
    const insight = await aiBrain.createInsight({
      agentType: AGENT_TYPE,
      category: "data",
      priority: "low",
      status: "new",
      title: `📐 ${unrealisticAreas} nehnuteľností s nerealistickou plochou`,
      description: `Boli nájdené nehnuteľnosti s podozrivou plochou (<5m² alebo >5000m²).`,
      confidence: 85,
      impact: 30,
      context: { unrealisticAreas },
      suggestedAction: "Manuálne skontrolujte tieto záznamy",
    });
    insights.push(insight);
  }

  return insights;
}

// ============================================
// QUALITY REPORT
// ============================================

async function generateQualityReport(): Promise<AIInsight | null> {
  const totalProperties = await prisma.property.count();
  
  if (totalProperties === 0) {
    return null;
  }

  // Calculate completeness scores
  const withCoordinates = await prisma.property.count({
    where: { latitude: { not: null }, longitude: { not: null } },
  });
  const withDescription = await prisma.property.count({
    where: { description: { not: null } },
  });
  const withStreet = await prisma.property.count({
    where: { street: { not: null } },
  });
  const withRooms = await prisma.property.count({
    where: { rooms: { not: null } },
  });

  const completenessScore = (
    (withCoordinates / totalProperties) * 25 +
    (withDescription / totalProperties) * 25 +
    (withStreet / totalProperties) * 25 +
    (withRooms / totalProperties) * 25
  );

  const scoreEmoji = completenessScore >= 90 ? "🟢" : completenessScore >= 70 ? "🟡" : "🔴";
  const scoreLabel = completenessScore >= 90 ? "Výborná" : completenessScore >= 70 ? "Dobrá" : "Potrebuje zlepšenie";

  return aiBrain.createInsight({
    agentType: AGENT_TYPE,
    category: "data",
    priority: completenessScore < 70 ? "high" : "low",
    status: "new",
    title: `${scoreEmoji} Kvalita dát: ${completenessScore.toFixed(0)}% - ${scoreLabel}`,
    description: `Celková kvalita dát v databáze je ${completenessScore.toFixed(0)}%. ${totalProperties.toLocaleString()} nehnuteľností v systéme.`,
    details: `Kompletnosť jednotlivých polí:\n• Súradnice: ${((withCoordinates / totalProperties) * 100).toFixed(0)}%\n• Popis: ${((withDescription / totalProperties) * 100).toFixed(0)}%\n• Ulica: ${((withStreet / totalProperties) * 100).toFixed(0)}%\n• Počet izieb: ${((withRooms / totalProperties) * 100).toFixed(0)}%`,
    confidence: 95,
    impact: 50,
    context: {
      totalProperties,
      completenessScore,
      scores: {
        coordinates: (withCoordinates / totalProperties) * 100,
        description: (withDescription / totalProperties) * 100,
        street: (withStreet / totalProperties) * 100,
        rooms: (withRooms / totalProperties) * 100,
      },
    },
    actionUrl: "/admin/data",
  });
}

// ============================================
// EXPORT
// ============================================

export const dataQualityAgent = {
  type: AGENT_TYPE,
  name: "Data Quality Monitor",
  description: "Monitoruje kvalitu dát a identifikuje problémy",
  run: runDataQualityAnalysis,
} as const;
