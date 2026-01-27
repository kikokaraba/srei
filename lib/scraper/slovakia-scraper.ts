/**
 * Slovakia-Wide Scraper
 * 
 * Scrapuje celé Slovensko zo všetkých hlavných realitných portálov:
 * - Nehnutelnosti.sk
 * - Reality.sk
 * - Bazoš.sk
 * - TopReality.sk
 * 
 * Pokrýva všetkých 8 krajov, 79 okresov
 */

import { REGIONS, DISTRICTS } from "@/lib/constants/slovakia-locations";

// ============================================================================
// URL GENERÁTORY PRE JEDNOTLIVÉ PORTÁLY
// ============================================================================

export interface ScrapingTarget {
  portal: "nehnutelnosti" | "reality" | "bazos" | "topreality";
  propertyType: "byty" | "domy" | "pozemky" | "komercne";
  transactionType: "predaj" | "prenajom";
  region?: string;
  district?: string;
  city?: string;
  url: string;
  priority: number; // 1-10, vyššie = dôležitejšie
}

/**
 * Nehnutelnosti.sk URL generátor
 * Formát: https://www.nehnutelnosti.sk/{typ}/{transakcia}/{lokacia}/
 */
function generateNehnutelnostiUrls(): ScrapingTarget[] {
  const urls: ScrapingTarget[] = [];
  const baseUrl = "https://www.nehnutelnosti.sk";
  
  const propertyTypes = ["byty", "domy", "pozemky", "komercne-nehnutelnosti"] as const;
  const transactions = ["predaj", "prenajom"] as const;
  
  // Mapovanie na URL slugy
  const regionSlugs: Record<string, string> = {
    BA: "bratislavsky-kraj",
    TT: "trnavsky-kraj",
    TN: "trenciansky-kraj",
    NR: "nitriansky-kraj",
    ZA: "zilinsky-kraj",
    BB: "banskobystricky-kraj",
    PO: "presovsky-kraj",
    KE: "kosicky-kraj",
  };
  
  for (const propType of propertyTypes) {
    for (const trans of transactions) {
      // Celé Slovensko
      urls.push({
        portal: "nehnutelnosti",
        propertyType: propType === "komercne-nehnutelnosti" ? "komercne" : propType as any,
        transactionType: trans,
        url: `${baseUrl}/${propType}/${trans}/`,
        priority: 10,
      });
      
      // Po krajoch
      for (const [regionId, slug] of Object.entries(regionSlugs)) {
        urls.push({
          portal: "nehnutelnosti",
          propertyType: propType === "komercne-nehnutelnosti" ? "komercne" : propType as any,
          transactionType: trans,
          region: regionId,
          url: `${baseUrl}/${propType}/${trans}/${slug}/`,
          priority: regionId === "BA" ? 9 : 7, // Bratislava vyššia priorita
        });
      }
    }
  }
  
  return urls;
}

/**
 * Reality.sk URL generátor
 * Formát: https://www.reality.sk/{typ}-{transakcia}/{lokacia}/
 */
function generateRealityUrls(): ScrapingTarget[] {
  const urls: ScrapingTarget[] = [];
  const baseUrl = "https://www.reality.sk";
  
  const typeMap = {
    byty: "byty",
    domy: "domy-a-vily",
    pozemky: "pozemky",
    komercne: "komercne-objekty",
  };
  
  const transMap = {
    predaj: "predaj",
    prenajom: "prenajom",
  };
  
  const regionSlugs: Record<string, string> = {
    BA: "bratislavsky-kraj",
    TT: "trnavsky-kraj",
    TN: "trenciansky-kraj",
    NR: "nitriansky-kraj",
    ZA: "zilinsky-kraj",
    BB: "banskobystricky-kraj",
    PO: "presovsky-kraj",
    KE: "kosicky-kraj",
  };
  
  for (const [propKey, propSlug] of Object.entries(typeMap)) {
    for (const [transKey, transSlug] of Object.entries(transMap)) {
      // Celé Slovensko
      urls.push({
        portal: "reality",
        propertyType: propKey as any,
        transactionType: transKey as any,
        url: `${baseUrl}/${propSlug}-${transSlug}/`,
        priority: 9,
      });
      
      // Po krajoch
      for (const [regionId, slug] of Object.entries(regionSlugs)) {
        urls.push({
          portal: "reality",
          propertyType: propKey as any,
          transactionType: transKey as any,
          region: regionId,
          url: `${baseUrl}/${propSlug}-${transSlug}/${slug}/`,
          priority: regionId === "BA" ? 8 : 6,
        });
      }
    }
  }
  
  return urls;
}

/**
 * Bazoš.sk URL generátor
 * Formát: https://reality.bazos.sk/{kategoria}/?hleession={strana}
 */
function generateBazosUrls(): ScrapingTarget[] {
  const urls: ScrapingTarget[] = [];
  const baseUrl = "https://reality.bazos.sk";
  
  // Bazoš kategórie
  const categories = [
    { slug: "byty", type: "byty" as const },
    { slug: "domy", type: "domy" as const },
    { slug: "pozemky", type: "pozemky" as const },
    { slug: "ostatne", type: "komercne" as const },
  ];
  
  // Bazoš kraje
  const regionSlugs: Record<string, string> = {
    BA: "bratislavsky",
    TT: "trnavsky",
    TN: "trenciansky",
    NR: "nitriansky",
    ZA: "zilinsky",
    BB: "banskobystricky",
    PO: "presovsky",
    KE: "kosicky",
  };
  
  for (const cat of categories) {
    // Celé Slovensko
    urls.push({
      portal: "bazos",
      propertyType: cat.type,
      transactionType: "predaj", // Bazoš nemá rozlíšenie
      url: `${baseUrl}/${cat.slug}/`,
      priority: 8, // Bazoš má najlepšie hot deals
    });
    
    // Po krajoch
    for (const [regionId, slug] of Object.entries(regionSlugs)) {
      urls.push({
        portal: "bazos",
        propertyType: cat.type,
        transactionType: "predaj",
        region: regionId,
        url: `${baseUrl}/${cat.slug}/${slug}/`,
        priority: regionId === "BA" ? 7 : 5,
      });
    }
  }
  
  return urls;
}

/**
 * TopReality.sk URL generátor
 * Formát: https://www.topreality.sk/vyhladavanie/{typ}-{transakcia}.html
 */
function generateTopRealityUrls(): ScrapingTarget[] {
  const urls: ScrapingTarget[] = [];
  const baseUrl = "https://www.topreality.sk";
  
  const typeMap = {
    byty: "byty",
    domy: "rodinne-domy",
    pozemky: "pozemky",
    komercne: "komercne-priestory",
  };
  
  const transMap = {
    predaj: "predaj",
    prenajom: "prenajom",
  };
  
  for (const [propKey, propSlug] of Object.entries(typeMap)) {
    for (const [transKey, transSlug] of Object.entries(transMap)) {
      urls.push({
        portal: "topreality",
        propertyType: propKey as any,
        transactionType: transKey as any,
        url: `${baseUrl}/vyhladavanie/${propSlug}-${transSlug}.html`,
        priority: 6,
      });
    }
  }
  
  return urls;
}

// ============================================================================
// HLAVNÝ EXPORT
// ============================================================================

/**
 * Získa všetky scraping targets zoradené podľa priority
 */
export function getAllScrapingTargets(): ScrapingTarget[] {
  const targets = [
    ...generateNehnutelnostiUrls(),
    ...generateRealityUrls(),
    ...generateBazosUrls(),
    ...generateTopRealityUrls(),
  ];
  
  // Zoraď podľa priority (najvyššia prvá)
  return targets.sort((a, b) => b.priority - a.priority);
}

/**
 * Získa targets pre konkrétny portál
 */
export function getTargetsByPortal(portal: ScrapingTarget["portal"]): ScrapingTarget[] {
  return getAllScrapingTargets().filter(t => t.portal === portal);
}

/**
 * Získa targets pre konkrétny región
 */
export function getTargetsByRegion(regionId: string): ScrapingTarget[] {
  return getAllScrapingTargets().filter(t => t.region === regionId || !t.region);
}

/**
 * Získa targets pre konkrétny typ nehnuteľnosti
 */
export function getTargetsByPropertyType(type: ScrapingTarget["propertyType"]): ScrapingTarget[] {
  return getAllScrapingTargets().filter(t => t.propertyType === type);
}

/**
 * Rozdelí targets na batche pre postupné spracovanie
 * @param batchSize Počet URL v jednom batchi
 */
export function batchTargets(targets: ScrapingTarget[], batchSize: number = 10): ScrapingTarget[][] {
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
    byTransactionType[t.transactionType] = (byTransactionType[t.transactionType] || 0) + 1;
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
// SCRAPING ORCHESTRÁTOR
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

/**
 * Trieda pre orchestráciu scrapingu celého Slovenska
 */
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
  
  /**
   * Spustí scraping pre zadané targets
   */
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
      onProgress 
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
    
    console.log(`🇸🇰 Starting Slovakia-wide scrape: ${targets.length} targets`);
    
    for (const target of targets) {
      if (!this.isRunning) break;
      
      this.progress.currentTarget = target;
      onProgress?.(this.progress);
      
      const startTime = Date.now();
      
      try {
        console.log(`📥 Scraping: ${target.portal} - ${target.propertyType} - ${target.region || "ALL"}`);
        
        const result = await scraperFn(target);
        
        this.results.push({
          target,
          ...result,
          duration: Date.now() - startTime,
        });
        
        this.progress.completed++;
        console.log(`✅ Found ${result.listingsFound} listings (${result.newListings} new)`);
        
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
        
        console.error(`❌ Failed: ${target.url} - ${errorMsg}`);
      }
      
      // Delay medzi requestmi
      if (this.isRunning && targets.indexOf(target) < targets.length - 1) {
        await new Promise(resolve => setTimeout(resolve, delayBetweenRequests));
      }
      
      // Update ETA
      const avgDuration = this.results.reduce((sum, r) => sum + r.duration, 0) / this.results.length;
      const remaining = targets.length - this.progress.completed - this.progress.failed;
      this.progress.estimatedCompletion = new Date(
        Date.now() + remaining * (avgDuration + delayBetweenRequests)
      );
      
      onProgress?.(this.progress);
    }
    
    this.isRunning = false;
    this.progress.currentTarget = undefined;
    
    // Summary
    const totalNew = this.results.reduce((sum, r) => sum + r.newListings, 0);
    const totalUpdated = this.results.reduce((sum, r) => sum + r.updatedListings, 0);
    const totalFound = this.results.reduce((sum, r) => sum + r.listingsFound, 0);
    
    console.log(`\n🇸🇰 Slovakia scrape completed:`);
    console.log(`   Total: ${totalFound} listings found`);
    console.log(`   New: ${totalNew} | Updated: ${totalUpdated}`);
    console.log(`   Failed: ${this.progress.failed}/${targets.length}`);
    
    return this.results;
  }
  
  stop(): void {
    this.isRunning = false;
    console.log("⏹️ Scraping stopped");
  }
}

// Singleton instance
export const slovakiaScraper = new SlovakiaScraper();
