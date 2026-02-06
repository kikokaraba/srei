/**
 * Slovakia-Wide Scraper
 *
 * Scrapuje celé Slovensko len z:
 * - Nehnutelnosti.sk (byty predaj + prenájom)
 * - Bazoš.sk (byty predaj + prenájom)
 *
 * Pokrýva celé Slovensko + všetkých 8 krajov.
 */

// ============================================================================
// URL GENERÁTORY – LEN BYTY PREDAJ / PRENÁJOM
// ============================================================================

export interface ScrapingTarget {
  portal: "nehnutelnosti" | "bazos";
  propertyType: "byty";
  transactionType: "predaj" | "prenajom";
  region?: string;
  url: string;
  priority: number;
}

const REGION_SLUGS_NEH: Record<string, string> = {
  BA: "bratislavsky-kraj",
  TT: "trnavsky-kraj",
  TN: "trenciansky-kraj",
  NR: "nitriansky-kraj",
  ZA: "zilinsky-kraj",
  BB: "banskobystricky-kraj",
  PO: "presovsky-kraj",
  KE: "kosicky-kraj",
};

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
 * Nehnutelnosti.sk – len byty predaj a prenájom, celé Slovensko + kraje
 */
function generateNehnutelnostiUrls(): ScrapingTarget[] {
  const urls: ScrapingTarget[] = [];
  const baseUrl = "https://www.nehnutelnosti.sk";

  const transactions: Array<"predaj" | "prenajom"> = ["predaj", "prenajom"];

  for (const trans of transactions) {
    // Celé Slovensko
    urls.push({
      portal: "nehnutelnosti",
      propertyType: "byty",
      transactionType: trans,
      url: `${baseUrl}/byty/${trans}/`,
      priority: 10,
    });

    for (const [regionId, slug] of Object.entries(REGION_SLUGS_NEH)) {
      urls.push({
        portal: "nehnutelnosti",
        propertyType: "byty",
        transactionType: trans,
        region: regionId,
        url: `${baseUrl}/byty/${trans}/${slug}/`,
        priority: regionId === "BA" ? 9 : 7,
      });
    }
  }

  return urls;
}

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
 * Všetky scraping targety – len Nehnutelnosti + Bazoš, byty predaj/prenájom, celé Slovensko
 */
export function getAllScrapingTargets(): ScrapingTarget[] {
  const targets = [...generateNehnutelnostiUrls(), ...generateBazosUrls()];
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

// ============================================================================
// ORCHESTRÁTOR
// ============================================================================

export interface ScrapingProgress {
  totalTargets: number;
  completed: number;
  failed: number;
  currentTarget?: ScrapingTarget;
  errors: Array<{ target: ScrapingTarget; error: string }>;
  startedAt: Date;
  estimatedCompletion?: Date;
}

export interface ScrapingResult {
  target: ScrapingTarget;
  listingsFound: number;
  newListings: number;
  updatedListings: number;
  errors: string[];
  duration: number;
}

export class SlovakiaScraper {
  private progress: ScrapingProgress;
  private results: ScrapingResult[] = [];
  private isRunning = false;

  constructor() {
    this.progress = {
      totalTargets: 0,
      completed: 0,
      failed: 0,
      errors: [],
      startedAt: new Date(),
    };
  }

  getProgress(): ScrapingProgress {
    return { ...this.progress };
  }

  getResults(): ScrapingResult[] {
    return [...this.results];
  }

  isActive(): boolean {
    return this.isRunning;
  }

  async run(
    targets: ScrapingTarget[],
    scraperFn: (target: ScrapingTarget) => Promise<{
      listingsFound: number;
      newListings: number;
      updatedListings: number;
      errors: string[];
    }>,
    options: {
      delayBetweenRequests?: number;
      maxConcurrent?: number;
      onProgress?: (progress: ScrapingProgress) => void;
    } = {}
  ): Promise<ScrapingResult[]> {
    const {
      delayBetweenRequests = 3000,
      maxConcurrent = 1,
      onProgress,
    } = options;

    this.isRunning = true;
    this.progress = {
      totalTargets: targets.length,
      completed: 0,
      failed: 0,
      errors: [],
      startedAt: new Date(),
    };
    this.results = [];

    console.log(`🇸🇰 Starting Slovakia scrape: ${targets.length} targets (byty predaj + prenájom)`);

    for (const target of targets) {
      if (!this.isRunning) break;

      this.progress.currentTarget = target;
      onProgress?.(this.progress);

      const startTime = Date.now();

      try {
        console.log(
          `📥 ${target.portal} - byty ${target.transactionType} ${target.region || "celé SK"}`
        );

        const result = await scraperFn(target);
        this.results.push({
          target,
          ...result,
          duration: Date.now() - startTime,
        });
        this.progress.completed++;
        console.log(
          `✅ Found ${result.listingsFound} (${result.newListings} new)`
        );
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Unknown error";
        this.progress.failed++;
        this.progress.errors.push({ target, error: errorMsg });
        this.results.push({
          target,
          listingsFound: 0,
          newListings: 0,
          updatedListings: 0,
          errors: [errorMsg],
          duration: Date.now() - startTime,
        });
        console.error(`❌ ${target.url}: ${errorMsg}`);
      }

      if (
        this.isRunning &&
        targets.indexOf(target) < targets.length - 1
      ) {
        await new Promise((r) =>
          setTimeout(r, delayBetweenRequests)
        );
      }

      const avgDuration =
        this.results.reduce((s, r) => s + r.duration, 0) / this.results.length;
      const remaining =
        targets.length - this.progress.completed - this.progress.failed;
      this.progress.estimatedCompletion = new Date(
        Date.now() + remaining * (avgDuration + delayBetweenRequests)
      );
      onProgress?.(this.progress);
    }

    this.isRunning = false;
    this.progress.currentTarget = undefined;

    const totalNew = this.results.reduce((s, r) => s + r.newListings, 0);
    const totalUpdated = this.results.reduce(
      (s, r) => s + r.updatedListings,
      0
    );
    const totalFound = this.results.reduce(
      (s, r) => s + r.listingsFound,
      0
    );
    console.log(`\n🇸🇰 Done: ${totalFound} found, ${totalNew} new, ${totalUpdated} updated, ${this.progress.failed} failed`);

    return this.results;
  }

  stop(): void {
    this.isRunning = false;
  }
}

export const slovakiaScraper = new SlovakiaScraper();
