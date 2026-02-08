/**
 * Slovakia-Wide Scraper
 *
 * Scrapuje celé Slovensko z Bazoš.sk (byty predaj + prenájom).
 * Pokrýva celé Slovensko + všetkých 8 krajov.
 */

// ============================================================================
// URL GENERÁTORY – LEN BYTY PREDAJ / PRENÁJOM
// ============================================================================

export interface ScrapingTarget {
  portal: "bazos";
  propertyType: "byty";
  transactionType: "predaj" | "prenajom";
  region?: string;
  url: string;
  priority: number;
}

const REGION_SLUGS_BAZOS: Record<string, string> = {
  BA: "bratislavsky",
  TT: "trnavsky",
  TN: "trenciansky",
  NR: "nitriansky",
  ZA: "zilinsky",
  BB: "banskobystricky",
  PO: "presovsky",
  KE: "kosicky",
};

/**
 * Bazoš.sk – len byty predaj a prenájom, celé Slovensko + kraje
 */
function generateBazosUrls(): ScrapingTarget[] {
  const urls: ScrapingTarget[] = [];
  const baseUrl = "https://reality.bazos.sk";

  const categories = [
    { path: "predam/byt", transactionType: "predaj" as const },
    { path: "prenajmu/byt", transactionType: "prenajom" as const },
  ];

  for (const cat of categories) {
    urls.push({
      portal: "bazos",
      propertyType: "byty",
      transactionType: cat.transactionType,
      url: `${baseUrl}/${cat.path}/`,
      priority: 8,
    });

    for (const [regionId, slug] of Object.entries(REGION_SLUGS_BAZOS)) {
      urls.push({
        portal: "bazos",
        propertyType: "byty",
        transactionType: cat.transactionType,
        region: regionId,
        url: `${baseUrl}/${cat.path}/${slug}/`,
        priority: regionId === "BA" ? 7 : 5,
      });
    }
  }

  return urls;
}

// ============================================================================
// HLAVNÝ EXPORT
// ============================================================================

/**
 * Všetky scraping targety – Bazoš, byty predaj/prenájom, celé Slovensko
 */
export function getAllScrapingTargets(): ScrapingTarget[] {
  const targets = generateBazosUrls();
  return targets.sort((a, b) => b.priority - a.priority);
}

export function getTargetsByPortal(portal: ScrapingTarget["portal"]): ScrapingTarget[] {
  return getAllScrapingTargets().filter((t) => t.portal === portal);
}

export function getTargetsByRegion(regionId: string): ScrapingTarget[] {
  return getAllScrapingTargets().filter((t) => t.region === regionId || !t.region);
}

export function getTargetsByPropertyType(
  type: ScrapingTarget["propertyType"]
): ScrapingTarget[] {
  return getAllScrapingTargets().filter((t) => t.propertyType === type);
}

export function batchTargets(
  targets: ScrapingTarget[],
  batchSize: number = 10
): ScrapingTarget[][] {
  const batches: ScrapingTarget[][] = [];
  for (let i = 0; i < targets.length; i += batchSize) {
    batches.push(targets.slice(i, i + batchSize));
  }
  return batches;
}

// ============================================================================
// ŠTATISTIKY
// ============================================================================

export function getScrapingStats(): {
  totalTargets: number;
  byPortal: Record<string, number>;
  byRegion: Record<string, number>;
  byPropertyType: Record<string, number>;
  byTransactionType: Record<string, number>;
} {
  const targets = getAllScrapingTargets();
  const byPortal: Record<string, number> = {};
  const byRegion: Record<string, number> = {};
  const byPropertyType: Record<string, number> = {};
  const byTransactionType: Record<string, number> = {};

  for (const t of targets) {
    byPortal[t.portal] = (byPortal[t.portal] || 0) + 1;
    byRegion[t.region || "all"] = (byRegion[t.region || "all"] || 0) + 1;
    byPropertyType[t.propertyType] = (byPropertyType[t.propertyType] || 0) + 1;
    byTransactionType[t.transactionType] =
      (byTransactionType[t.transactionType] || 0) + 1;
  }

  return {
    totalTargets: targets.length,
    byPortal,
    byRegion,
    byPropertyType,
    byTransactionType,
  };
}

// Scraping je realizovaný výhradne cez Apify (apify-service + webhook + process-apify).
