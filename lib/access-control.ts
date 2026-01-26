/**
 * Role-Based Access Control
 * 
 * Definuje limity a prístup k funkciám podľa role používateľa.
 * FREE_USER má všetko ale s obmedzeniami.
 * PREMIUM_INVESTOR a ADMIN majú neobmedzený prístup.
 */

import { UserRole } from "@/generated/prisma/client";

// Typy pre feature flags
export type FeatureKey = 
  | "aiPredictions"
  | "aiMatching"
  | "exportData"
  | "scenarioSimulator"
  | "advancedTax"
  | "realtimeDeals"
  | "urbanDevelopment"
  | "portfolioManagement"
  | "priceAlerts"
  | "unlimitedComparisons";

// Typy pre limity
export type LimitKey =
  | "maxSavedProperties"
  | "maxPortfolioItems"
  | "maxDailyComparisons"
  | "hotDealsDelayHours"
  | "maxFiltersPresets";

// Definícia limitov pre každú rolu
interface RoleLimits {
  // Numerické limity
  maxSavedProperties: number;
  maxPortfolioItems: number;
  maxDailyComparisons: number;
  hotDealsDelayHours: number;
  maxFiltersPresets: number;
  
  // Feature flags (boolean)
  aiPredictions: boolean;
  aiMatching: boolean;
  exportData: boolean;
  scenarioSimulator: boolean;
  advancedTax: boolean;
  realtimeDeals: boolean;
  urbanDevelopment: boolean;
  portfolioManagement: boolean;
  priceAlerts: boolean;
  unlimitedComparisons: boolean;
}

// Limity pre každú rolu
export const ROLE_LIMITS: Record<UserRole, RoleLimits> = {
  FREE_USER: {
    // Limity
    maxSavedProperties: 10,
    maxPortfolioItems: 3,
    maxDailyComparisons: 5,
    hotDealsDelayHours: 24,
    maxFiltersPresets: 2,
    
    // Features - zamknuté
    aiPredictions: false,
    aiMatching: false,
    exportData: false,
    scenarioSimulator: false,
    advancedTax: false,
    realtimeDeals: false,
    urbanDevelopment: false,
    portfolioManagement: false,
    priceAlerts: false,
    unlimitedComparisons: false,
  },
  
  PREMIUM_INVESTOR: {
    // Limity - neobmedzené
    maxSavedProperties: Infinity,
    maxPortfolioItems: Infinity,
    maxDailyComparisons: Infinity,
    hotDealsDelayHours: 0,
    maxFiltersPresets: Infinity,
    
    // Features - všetko odomknuté
    aiPredictions: true,
    aiMatching: true,
    exportData: true,
    scenarioSimulator: true,
    advancedTax: true,
    realtimeDeals: true,
    urbanDevelopment: true,
    portfolioManagement: true,
    priceAlerts: true,
    unlimitedComparisons: true,
  },
  
  ADMIN: {
    // Admin má všetko ako Premium
    maxSavedProperties: Infinity,
    maxPortfolioItems: Infinity,
    maxDailyComparisons: Infinity,
    hotDealsDelayHours: 0,
    maxFiltersPresets: Infinity,
    
    aiPredictions: true,
    aiMatching: true,
    exportData: true,
    scenarioSimulator: true,
    advancedTax: true,
    realtimeDeals: true,
    urbanDevelopment: true,
    portfolioManagement: true,
    priceAlerts: true,
    unlimitedComparisons: true,
  },
};

/**
 * Skontroluje či používateľ má prístup k danej funkcii
 */
export function canAccess(role: UserRole | undefined | null, feature: FeatureKey): boolean {
  if (!role) return false;
  return ROLE_LIMITS[role]?.[feature] ?? false;
}

/**
 * Získa limit pre danú rolu
 */
export function getLimit(role: UserRole | undefined | null, limit: LimitKey): number {
  if (!role) return 0;
  return ROLE_LIMITS[role]?.[limit] ?? 0;
}

/**
 * Skontroluje či používateľ je Premium alebo Admin
 */
export function isPremium(role: UserRole | undefined | null): boolean {
  return role === "PREMIUM_INVESTOR" || role === "ADMIN";
}

/**
 * Skontroluje či používateľ je Admin
 */
export function isAdmin(role: UserRole | undefined | null): boolean {
  return role === "ADMIN";
}

/**
 * Získa popis funkcie pre UI
 */
export const FEATURE_DESCRIPTIONS: Record<FeatureKey, { name: string; description: string }> = {
  aiPredictions: {
    name: "AI Predikcie",
    description: "Predikcie cien nehnuteľností pomocou AI modelov",
  },
  aiMatching: {
    name: "AI Matching",
    description: "Automatické porovnávanie nehnuteľností naprieč portálmi",
  },
  exportData: {
    name: "Export dát",
    description: "Export nehnuteľností a analýz do CSV/PDF",
  },
  scenarioSimulator: {
    name: "Scenáriový simulátor",
    description: "What-if analýza investičných scenárov",
  },
  advancedTax: {
    name: "Pokročilý daňový asistent",
    description: "Detailné daňové kalkulácie a optimalizácie",
  },
  realtimeDeals: {
    name: "Real-time Hot Deals",
    description: "Okamžitý prístup k podhodnoteným nehnuteľnostiam",
  },
  urbanDevelopment: {
    name: "Urbanistický rozvoj",
    description: "Sledovanie plánovanej infraštruktúry a jej vplyvu",
  },
  portfolioManagement: {
    name: "Správa portfólia",
    description: "Neobmedzené sledovanie vašich investícií",
  },
  priceAlerts: {
    name: "Cenové upozornenia",
    description: "Real-time notifikácie o zmenách cien",
  },
  unlimitedComparisons: {
    name: "Neobmedzené porovnania",
    description: "Porovnávajte neobmedzený počet nehnuteľností",
  },
};

/**
 * Získa zoznam premium funkcií pre upgrade modal
 */
export function getPremiumFeatures(): Array<{ key: FeatureKey; name: string; description: string }> {
  return Object.entries(FEATURE_DESCRIPTIONS).map(([key, value]) => ({
    key: key as FeatureKey,
    ...value,
  }));
}

/**
 * Formátuje limit pre zobrazenie
 */
export function formatLimit(limit: number): string {
  if (limit === Infinity) return "Neobmedzene";
  return limit.toString();
}
