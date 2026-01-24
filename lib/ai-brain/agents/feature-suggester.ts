/**
 * SRIA AI Brain - Feature Suggester Agent
 * 
 * Analyzuje správanie používateľov a navrhuje nové funkcie:
 * - Analýza používania funkcií
 * - Detekcia chýbajúcich funkcií
 * - Porovnanie s konkurenciou
 * - Prioritizácia návrhov
 */

import { prisma } from "@/lib/prisma";
import { aiBrain } from "../core";
import type { AIInsight, FeatureSuggestion, AgentType } from "../types";

const AGENT_TYPE: AgentType = "feature-suggester";

// ============================================
// FEATURE ANALYSIS DATA
// ============================================

// Definícia existujúcich funkcií a ich metrík
const FEATURES = {
  dashboard: {
    name: "Dashboard",
    description: "Hlavný prehľad",
    category: "core",
  },
  propertySearch: {
    name: "Vyhľadávanie nehnuteľností",
    description: "Filtrovanie a hľadanie",
    category: "core",
  },
  map: {
    name: "Interaktívna mapa",
    description: "Mapa s nehnuteľnosťami",
    category: "visualization",
  },
  analytics: {
    name: "Analytika",
    description: "Grafy a štatistiky",
    category: "analytics",
  },
  predictions: {
    name: "AI Predikcie",
    description: "Predikcie cien",
    category: "ai",
  },
  hotDeals: {
    name: "Hot Deals",
    description: "Podhodnotené nehnuteľnosti",
    category: "ai",
  },
  portfolio: {
    name: "Portfólio",
    description: "Správa vlastných nehnuteľností",
    category: "portfolio",
  },
  comparison: {
    name: "Porovnanie",
    description: "Porovnanie nehnuteľností",
    category: "tools",
  },
  calculator: {
    name: "Kalkulačky",
    description: "Investičné kalkulačky",
    category: "tools",
  },
  valuation: {
    name: "Ohodnotenie",
    description: "AI ohodnotenie nehnuteľnosti",
    category: "ai",
  },
};

// Potenciálne nové funkcie na základe trhových trendov
const POTENTIAL_FEATURES: FeatureSuggestion[] = [
  {
    id: "mortgage-integration",
    title: "Integrácia s hypotekárnymi kalkulačkami bánk",
    description: "Prepojenie s reálnymi hypotekárnymi ponukami slovenských bánk pre okamžitý výpočet splátok.",
    source: "market-gap",
    demandScore: 85,
    feasibilityScore: 60,
    impactScore: 80,
    overallScore: 75,
    competitorHas: false,
    estimatedEffort: "large",
    technicalNotes: "Potrebná integrácia s API bánk alebo scraping ich kalkulačiek.",
  },
  {
    id: "ar-view",
    title: "AR prehliadka nehnuteľností",
    description: "Rozšírená realita pre virtuálnu prehliadku nehnuteľností priamo z telefónu.",
    source: "ai-analysis",
    demandScore: 70,
    feasibilityScore: 40,
    impactScore: 90,
    overallScore: 67,
    competitorHas: false,
    estimatedEffort: "large",
    technicalNotes: "WebXR API, potrebné 3D modely alebo fotogrametria.",
  },
  {
    id: "neighborhood-insights",
    title: "Analýza okolia nehnuteľnosti",
    description: "Automatická analýza okolia: školy, obchody, MHD, kriminalita, hluk, kvalita ovzdušia.",
    source: "user-feedback",
    demandScore: 90,
    feasibilityScore: 75,
    impactScore: 85,
    overallScore: 83,
    competitorHas: true,
    estimatedEffort: "medium",
    technicalNotes: "Integrácia s OpenStreetMap, Slovak government APIs.",
  },
  {
    id: "rent-estimation",
    title: "Automatický odhad nájomného",
    description: "AI predikcia optimálneho nájomného na základe lokality, veľkosti a vybavenia.",
    source: "ai-analysis",
    demandScore: 88,
    feasibilityScore: 80,
    impactScore: 85,
    overallScore: 84,
    competitorHas: false,
    estimatedEffort: "medium",
    technicalNotes: "ML model trénovaný na dátach z prenájmov.",
  },
  {
    id: "legal-check",
    title: "Právna kontrola nehnuteľnosti",
    description: "Automatická kontrola vlastníctva, tiarch, exekúcií a iných právnych problémov.",
    source: "user-feedback",
    demandScore: 95,
    feasibilityScore: 50,
    impactScore: 95,
    overallScore: 80,
    competitorHas: false,
    estimatedEffort: "large",
    technicalNotes: "Integrácia s Kataster portálom, ORSR.",
  },
  {
    id: "investment-community",
    title: "Investorská komunita",
    description: "Fórum a chat pre investorov, zdieľanie skúseností, spoločné investície.",
    source: "user-feedback",
    demandScore: 75,
    feasibilityScore: 85,
    impactScore: 70,
    overallScore: 77,
    competitorHas: false,
    estimatedEffort: "medium",
    technicalNotes: "Real-time chat, moderation, reputation system.",
  },
  {
    id: "renovation-estimator",
    title: "Kalkulátor nákladov na rekonštrukciu",
    description: "Odhad nákladov na rekonštrukciu na základe stavu a typu nehnuteľnosti.",
    source: "market-gap",
    demandScore: 82,
    feasibilityScore: 70,
    impactScore: 75,
    overallScore: 76,
    competitorHas: false,
    estimatedEffort: "medium",
    technicalNotes: "Database slovenských cien prác a materiálov.",
  },
  {
    id: "alert-automation",
    title: "Pokročilé automatizované alerty",
    description: "Komplexné pravidlá pre notifikácie: kombinácia filtrrov, časové okná, eskalácia.",
    source: "behavior-analysis",
    demandScore: 78,
    feasibilityScore: 90,
    impactScore: 70,
    overallScore: 79,
    competitorHas: true,
    estimatedEffort: "small",
    technicalNotes: "Rozšírenie existujúceho notifikačného systému.",
  },
  {
    id: "energy-efficiency",
    title: "Analýza energetickej efektívnosti",
    description: "Predikcia nákladov na energie a odporúčania na úspory na základe certifikátu.",
    source: "ai-analysis",
    demandScore: 72,
    feasibilityScore: 85,
    impactScore: 65,
    overallScore: 74,
    competitorHas: false,
    estimatedEffort: "small",
    technicalNotes: "Kalkulácia na základe energetických tried.",
  },
  {
    id: "document-storage",
    title: "Úložisko dokumentov",
    description: "Bezpečné úložisko pre zmluvy, faktúry a dokumenty k nehnuteľnostiam.",
    source: "user-feedback",
    demandScore: 65,
    feasibilityScore: 95,
    impactScore: 55,
    overallScore: 72,
    competitorHas: true,
    estimatedEffort: "small",
    technicalNotes: "S3 storage, encryption, document preview.",
  },
];

// ============================================
// MAIN ANALYSIS FUNCTION
// ============================================

export async function runFeatureSuggesterAnalysis(): Promise<AIInsight[]> {
  console.log("[Feature Suggester] Starting analysis...");
  const insights: AIInsight[] = [];

  try {
    // 1. Analyze feature usage patterns
    const usageInsights = await analyzeFeatureUsage();
    if (usageInsights) {
      insights.push(...usageInsights);
    }

    // 2. Suggest new features based on gaps
    const suggestions = await suggestNewFeatures();
    if (suggestions) {
      insights.push(...suggestions);
    }

    // 3. Identify underutilized features
    const underutilized = await identifyUnderutilizedFeatures();
    if (underutilized) {
      insights.push(...underutilized);
    }

    // Update last run time
    aiBrain.setLastRunTime(AGENT_TYPE, new Date());

    console.log(`[Feature Suggester] Generated ${insights.length} insights`);
    return insights;

  } catch (error) {
    console.error("[Feature Suggester] Error:", error);
    
    const errorInsight = await aiBrain.createInsight({
      agentType: AGENT_TYPE,
      category: "feature",
      priority: "medium",
      status: "new",
      title: "Feature Analysis Failed",
      description: `Error during feature analysis: ${error instanceof Error ? error.message : "Unknown error"}`,
      confidence: 100,
      impact: 30,
    });

    return [errorInsight];
  }
}

// ============================================
// FEATURE USAGE ANALYSIS
// ============================================

async function analyzeFeatureUsage(): Promise<AIInsight[]> {
  const insights: AIInsight[] = [];

  // Analyze user preferences to understand demand
  const preferencesCount = await prisma.userPreferences.count();
  const onboardedUsers = await prisma.userPreferences.count({
    where: { onboardingCompleted: true },
  });

  const onboardingRate = preferencesCount > 0 ? (onboardedUsers / preferencesCount) * 100 : 0;

  if (onboardingRate < 50 && preferencesCount > 10) {
    const insight = await aiBrain.createInsight({
      agentType: AGENT_TYPE,
      category: "ux",
      priority: "high",
      status: "new",
      title: `⚠️ Nízka miera dokončenia onboardingu: ${onboardingRate.toFixed(0)}%`,
      description: `Len ${onboardingRate.toFixed(0)}% používateľov dokončilo onboarding. Odporúčame zjednodušiť alebo skrátiť proces.`,
      details: `Celkový počet používateľov: ${preferencesCount}\nDokončilo onboarding: ${onboardedUsers}\n\nMožné príčiny:\n- Príliš dlhý proces\n- Nejasné kroky\n- Technické problémy`,
      confidence: 90,
      impact: 75,
      context: {
        preferencesCount,
        onboardedUsers,
        onboardingRate,
      },
      suggestedAction: "Zjednodušte onboarding na 3 kroky max",
    });
    insights.push(insight);
  }

  // Check portfolio usage
  const portfolioUsers = await prisma.portfolioProperty.groupBy({
    by: ["userId"],
    _count: true,
  });

  const usersWithPortfolio = portfolioUsers.length;
  const totalUsers = await prisma.user.count();
  const portfolioAdoption = totalUsers > 0 ? (usersWithPortfolio / totalUsers) * 100 : 0;

  if (portfolioAdoption < 10 && totalUsers > 20) {
    const insight = await aiBrain.createInsight({
      agentType: AGENT_TYPE,
      category: "feature",
      priority: "medium",
      status: "new",
      title: `📊 Nízka adopcia portfólia: ${portfolioAdoption.toFixed(0)}%`,
      description: `Len ${portfolioAdoption.toFixed(0)}% používateľov využíva funkciu portfólia. Zvážte lepšiu propagáciu alebo zjednodušenie.`,
      confidence: 85,
      impact: 50,
      context: {
        usersWithPortfolio,
        totalUsers,
        portfolioAdoption,
      },
      suggestedAction: "Pridajte onboarding tooltip pre portfólio",
    });
    insights.push(insight);
  }

  return insights;
}

// ============================================
// NEW FEATURE SUGGESTIONS
// ============================================

async function suggestNewFeatures(): Promise<AIInsight[]> {
  const insights: AIInsight[] = [];

  // Sort features by overall score
  const sortedFeatures = [...POTENTIAL_FEATURES].sort((a, b) => b.overallScore - a.overallScore);

  // Take top 3 suggestions
  for (const feature of sortedFeatures.slice(0, 3)) {
    const priorityEmoji = feature.overallScore >= 80 ? "🔥" : feature.overallScore >= 70 ? "⭐" : "💡";
    
    const insight = await aiBrain.createInsight({
      agentType: AGENT_TYPE,
      category: "feature",
      priority: feature.overallScore >= 80 ? "high" : "medium",
      status: "new",
      title: `${priorityEmoji} Návrh: ${feature.title}`,
      description: feature.description,
      details: `**Skóre:** ${feature.overallScore}/100\n\n**Detaily:**\n- Dopyt: ${feature.demandScore}/100\n- Realizovateľnosť: ${feature.feasibilityScore}/100\n- Impact: ${feature.impactScore}/100\n\n**Effort:** ${feature.estimatedEffort}\n**Konkurencia má:** ${feature.competitorHas ? "Áno" : "Nie"}\n\n**Technické poznámky:**\n${feature.technicalNotes}`,
      confidence: 75,
      impact: feature.impactScore,
      effort: feature.feasibilityScore,
      context: {
        featureId: feature.id,
        scores: {
          demand: feature.demandScore,
          feasibility: feature.feasibilityScore,
          impact: feature.impactScore,
          overall: feature.overallScore,
        },
        effort: feature.estimatedEffort,
        competitorHas: feature.competitorHas,
      },
      suggestedAction: `Pridať ${feature.title} do roadmapy`,
    });
    insights.push(insight);
  }

  return insights;
}

// ============================================
// UNDERUTILIZED FEATURES
// ============================================

async function identifyUnderutilizedFeatures(): Promise<AIInsight[]> {
  const insights: AIInsight[] = [];

  // Check saved properties usage
  const savedPropertiesCount = await prisma.savedProperty.count();
  const activeUsers = await prisma.user.count({
    where: {
      updatedAt: {
        gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      },
    },
  });

  const savesPerUser = activeUsers > 0 ? savedPropertiesCount / activeUsers : 0;

  if (savesPerUser < 2 && activeUsers > 10) {
    const insight = await aiBrain.createInsight({
      agentType: AGENT_TYPE,
      category: "ux",
      priority: "medium",
      status: "new",
      title: `📌 Nízke využitie "Uložených nehnuteľností"`,
      description: `Používatelia v priemere ukladajú len ${savesPerUser.toFixed(1)} nehnuteľností. Funkcia ukladania môže byť ťažko objaviteľná.`,
      details: `Odporúčania:\n- Výraznejšie tlačidlo "Uložiť"\n- Tooltip vysvetľujúci výhody\n- Onboarding krok pre ukladanie`,
      confidence: 80,
      impact: 40,
      context: {
        savedPropertiesCount,
        activeUsers,
        savesPerUser,
      },
      suggestedAction: "Vylepšite UX pre ukladanie nehnuteľností",
    });
    insights.push(insight);
  }

  return insights;
}

// ============================================
// EXPORT
// ============================================

export const featureSuggesterAgent = {
  type: AGENT_TYPE,
  name: "Feature Suggester",
  description: "Analyzuje správanie a navrhuje nové funkcie",
  run: runFeatureSuggesterAnalysis,
} as const;
