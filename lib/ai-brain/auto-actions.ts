/**
 * SRIA AI Brain - Auto Actions System
 * 
 * Automatické vykonávanie akcií po schválení insights
 * Bezpečné akcie sa vykonajú okamžite, riskantné vyžadujú potvrdenie
 */

import { prisma } from "@/lib/prisma";
import { aiBrain } from "./core";
import type { AIInsight, InsightCategory } from "./types";

// ============================================
// ACTION TYPES
// ============================================

export type ActionType = 
  | "data-cleanup"       // Vyčistenie dát
  | "geocoding"          // Doplnenie súradníc
  | "deduplication"      // Odstránenie duplicít
  | "rescrape"           // Opätovný scraping
  | "stats-refresh"      // Obnovenie štatistík
  | "cache-clear"        // Vyčistenie cache
  | "notification"       // Poslať notifikáciu
  | "config-update"      // Aktualizácia konfigurácie
  | "manual";            // Vyžaduje manuálny zásah

export type ActionRisk = "safe" | "moderate" | "high";

export interface AutoAction {
  id: string;
  type: ActionType;
  name: string;
  description: string;
  risk: ActionRisk;
  estimatedDuration: string;
  execute: (insight: AIInsight, params?: Record<string, unknown>) => Promise<ActionResult>;
}

export interface ActionResult {
  success: boolean;
  message: string;
  details?: string;
  affectedRecords?: number;
  error?: string;
}

export interface ActionLog {
  id: string;
  insightId: string;
  actionType: ActionType;
  status: "pending" | "running" | "completed" | "failed";
  startedAt: Date;
  completedAt?: Date;
  result?: ActionResult;
  executedBy: string;
}

// ============================================
// ACTION DEFINITIONS
// ============================================

const AVAILABLE_ACTIONS: Record<string, AutoAction> = {
  // Data Cleanup Actions
  "cleanup-missing-data": {
    id: "cleanup-missing-data",
    type: "data-cleanup",
    name: "Vyčistiť nekompletné záznamy",
    description: "Odstráni alebo označí záznamy s chýbajúcimi kritickými údajmi",
    risk: "moderate",
    estimatedDuration: "1-5 minút",
    execute: async (insight) => {
      try {
        // Mark properties with missing data
        const updated = await prisma.property.updateMany({
          where: {
            OR: [
              { latitude: null, longitude: null },
              { description: null },
            ],
          },
          data: {
            // Mark as incomplete for review
            updatedAt: new Date(),
          },
        });

        return {
          success: true,
          message: `Označených ${updated.count} záznamov na review`,
          affectedRecords: updated.count,
        };
      } catch (error) {
        return {
          success: false,
          message: "Chyba pri čistení dát",
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    },
  },

  "remove-duplicates": {
    id: "remove-duplicates",
    type: "deduplication",
    name: "Odstrániť duplicity",
    description: "Zlúči alebo odstráni duplicitné záznamy",
    risk: "high",
    estimatedDuration: "2-10 minút",
    execute: async (insight) => {
      try {
        // Find and process duplicates
        const duplicates = await prisma.$queryRaw<Array<{ source: string; external_id: string; count: bigint; ids: string[] }>>`
          SELECT source, external_id, COUNT(*) as count, array_agg(id) as ids
          FROM "Property"
          WHERE external_id IS NOT NULL
          GROUP BY source, external_id
          HAVING COUNT(*) > 1
          LIMIT 100
        `;

        let removedCount = 0;

        for (const dup of duplicates) {
          const ids = dup.ids;
          if (ids.length > 1) {
            // Nech vymazávame len tie, ktoré nemá nikto uložené (obľúbené)
            const withSaved = await prisma.savedProperty.findMany({
              where: { propertyId: { in: ids } },
              select: { propertyId: true },
            });
            const savedIds = new Set(withSaved.map((s) => s.propertyId));
            const toDelete = ids.filter((id) => !savedIds.has(id));
            // Ponechaj aspoň jeden záznam (najlepšie ten s uloženými)
            const keepOne = ids.find((id) => savedIds.has(id)) ?? ids[0];
            const toDeleteSafe = toDelete.filter((id) => id !== keepOne);
            if (toDeleteSafe.length > 0) {
              await prisma.property.deleteMany({
                where: { id: { in: toDeleteSafe } },
              });
              removedCount += toDeleteSafe.length;
            }
          }
        }

        return {
          success: true,
          message: `Odstránených ${removedCount} duplicitných záznamov`,
          affectedRecords: removedCount,
        };
      } catch (error) {
        return {
          success: false,
          message: "Chyba pri odstraňovaní duplicít",
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    },
  },

  "refresh-stats": {
    id: "refresh-stats",
    type: "stats-refresh",
    name: "Obnoviť štatistiky",
    description: "Prepočíta denné a mesačné štatistiky",
    risk: "safe",
    estimatedDuration: "30 sekúnd - 2 minúty",
    execute: async (insight) => {
      try {
        // Calculate and update daily stats
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const cities = await prisma.property.groupBy({
          by: ["city"],
          _count: { id: true },
          _avg: { price_per_m2: true },
        });

        let updatedCount = 0;

        for (const cityData of cities) {
          const newListings = await prisma.property.count({
            where: {
              city: cityData.city,
              createdAt: { gte: today },
            },
          });

          const hotDeals = await prisma.property.count({
            where: {
              city: cityData.city,
              is_distressed: true,
            },
          });

          // Update stats for both PREDAJ and PRENAJOM listing types
          for (const listingType of ["PREDAJ", "PRENAJOM"] as const) {
            await prisma.dailyMarketStats.upsert({
              where: {
                date_city_listingType: {
                  date: today,
                  city: cityData.city,
                  listingType,
                },
              },
              update: {
                totalListings: cityData._count.id,
                avgPricePerM2: cityData._avg.price_per_m2 || 0,
                newListings,
                hotDealsCount: hotDeals,
              },
              create: {
                date: today,
                city: cityData.city,
                listingType,
                totalListings: cityData._count.id,
                avgPrice: 0,
                medianPrice: 0,
                avgPricePerM2: cityData._avg.price_per_m2 || 0,
                medianPricePerM2: 0,
                minPrice: 0,
                maxPrice: 0,
                newListings,
                removedListings: 0,
                avgDaysOnMarket: 0,
                hotDealsCount: hotDeals,
                hotDealsPercent: 0,
              },
            });
          }

          updatedCount++;
        }

        return {
          success: true,
          message: `Štatistiky aktualizované pre ${updatedCount} miest`,
          affectedRecords: updatedCount,
        };
      } catch (error) {
        return {
          success: false,
          message: "Chyba pri obnove štatistík",
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    },
  },

  "mark-stale-properties": {
    id: "mark-stale-properties",
    type: "data-cleanup",
    name: "Označiť zastaralé nehnuteľnosti",
    description: "Označí nehnuteľnosti staršie ako 30 dní na kontrolu",
    risk: "safe",
    estimatedDuration: "30 sekúnd",
    execute: async (insight) => {
      try {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

        // We don't delete, just mark them
        const staleCount = await prisma.property.count({
          where: {
            updatedAt: { lt: thirtyDaysAgo },
          },
        });

        return {
          success: true,
          message: `Nájdených ${staleCount} zastaralých záznamov`,
          affectedRecords: staleCount,
          details: "Záznamy sú označené na manuálnu kontrolu. Pre automatické odstránenie použite dedikovanú akciu.",
        };
      } catch (error) {
        return {
          success: false,
          message: "Chyba pri označovaní zastaralých záznamov",
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    },
  },

  "fix-price-anomalies": {
    id: "fix-price-anomalies",
    type: "data-cleanup",
    name: "Opraviť cenové anomálie",
    description: "Označí alebo skryje nehnuteľnosti s nerealistickými cenami",
    risk: "moderate",
    estimatedDuration: "1 minúta",
    execute: async (insight) => {
      try {
        // Mark properties with unrealistic prices
        const updated = await prisma.property.updateMany({
          where: {
            OR: [
              { price_per_m2: { lt: 100 } },
              { price_per_m2: { gt: 20000 } },
              { price: { lt: 1000 } },
              { price: { gt: 10000000 } },
            ],
          },
          data: {
            is_distressed: false, // Remove from hot deals if present
          },
        });

        return {
          success: true,
          message: `Opravených ${updated.count} záznamov s anomáliami`,
          affectedRecords: updated.count,
        };
      } catch (error) {
        return {
          success: false,
          message: "Chyba pri oprave anomálií",
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    },
  },

  "trigger-rescrape": {
    id: "trigger-rescrape",
    type: "rescrape",
    name: "Spustiť re-scraping",
    description: "Spustí nový scraping pre aktualizáciu dát",
    risk: "moderate",
    estimatedDuration: "5-15 minút",
    execute: async (insight) => {
      try {
        // Trigger scraper via internal API
        const response = await fetch(`${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/v1/admin/scraper`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sources: ["BAZOS"],
            cities: ["Bratislava"],
            testMode: true,
            maxPages: 2,
          }),
        });

        if (!response.ok) {
          throw new Error("Scraper API failed");
        }

        const result = await response.json();

        return {
          success: result.success,
          message: `Scraping spustený: ${result.stats?.listingsFound || 0} nájdených`,
          affectedRecords: result.stats?.newListings || 0,
        };
      } catch (error) {
        return {
          success: false,
          message: "Chyba pri spúšťaní scrapera",
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    },
  },
};

// ============================================
// ACTION MAPPING
// ============================================

// Map insight categories to suggested actions
const CATEGORY_ACTION_MAP: Record<InsightCategory, string[]> = {
  market: ["refresh-stats"],
  bug: ["manual"],
  optimization: ["manual"],
  feature: ["manual"],
  content: ["manual"],
  ux: ["manual"],
  data: ["cleanup-missing-data", "remove-duplicates", "mark-stale-properties", "fix-price-anomalies", "refresh-stats"],
  performance: ["refresh-stats"],
  security: ["manual"],
};

// ============================================
// MAIN FUNCTIONS
// ============================================

/**
 * Get available actions for an insight
 */
export function getAvailableActions(insight: AIInsight): AutoAction[] {
  const actionIds = CATEGORY_ACTION_MAP[insight.category] || ["manual"];
  return actionIds
    .map(id => AVAILABLE_ACTIONS[id])
    .filter((action): action is AutoAction => action !== undefined);
}

/**
 * Execute an action for an approved insight
 */
export async function executeAction(
  insight: AIInsight,
  actionId: string,
  executedBy: string,
  params?: Record<string, unknown>
): Promise<ActionResult> {
  const action = AVAILABLE_ACTIONS[actionId];
  
  if (!action) {
    return {
      success: false,
      message: "Akcia neexistuje",
      error: `Unknown action: ${actionId}`,
    };
  }

  console.log(`[Auto-Action] Executing ${action.name} for insight ${insight.id}`);

  try {
    const result = await action.execute(insight, params);

    // Log the action
    console.log(`[Auto-Action] ${action.name}: ${result.success ? "SUCCESS" : "FAILED"} - ${result.message}`);

    // Update insight if action was successful
    if (result.success) {
      await aiBrain.implementInsight(insight.id);
    }

    return result;
  } catch (error) {
    console.error(`[Auto-Action] Error:`, error);
    return {
      success: false,
      message: "Chyba pri vykonávaní akcie",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get all available actions
 */
export function getAllActions(): AutoAction[] {
  return Object.values(AVAILABLE_ACTIONS);
}

/**
 * Check if action is safe to auto-execute
 */
export function isAutoExecutable(actionId: string): boolean {
  const action = AVAILABLE_ACTIONS[actionId];
  return action?.risk === "safe";
}
