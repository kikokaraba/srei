// Scraper Types - Typové definície pre realitný scraper

import type { PropertyCondition, EnergyCertificate } from "@/generated/prisma/client";

/**
 * Surové dáta z inzerátu pred spracovaním
 */
export interface RawListingData {
  externalId: string;
  sourceUrl: string;
  title: string;
  description: string;
  priceRaw: string;
  locationRaw: string;
  areaRaw: string;
  imageUrls: string[];
  postedAt?: string;
  sellerName?: string;
  sellerPhone?: string;
}

/**
 * Spracované dáta z inzerátu
 */
export interface ParsedListingData {
  externalId: string;
  sourceUrl: string;
  title: string;
  description: string;
  
  // Cena
  price: number;
  pricePerM2: number;
  
  // Lokácia
  city: string;      // Mesto/obec
  district: string;
  street?: string;
  address: string;
  
  // Nehnuteľnosť
  areaM2: number;
  rooms?: number;
  floor?: number;
  totalFloors?: number;
  
  // Extrahované z popisu
  condition: PropertyCondition;
  energyCertificate: EnergyCertificate;
  hasElevator: boolean;
  hasBalcony: boolean;
  hasParking: boolean;
  hasGarage: boolean;
  hasCellar: boolean;
  insulationType?: string;
  heatingType?: string;
  yearBuilt?: number;
  
  // Metadata
  imageUrls: string[];
  postedAt?: Date;
  sellerName?: string;
  sellerPhone?: string;
}

/**
 * Výsledok scrape operácie
 */
export interface ScrapeResult {
  success: boolean;
  source: string;
  totalFound: number;
  newListings: number;
  updatedListings: number;
  removedListings: number;
  marketGapsDetected: number;
  errors: ScrapeError[];
  duration: number;
  timestamp: Date;
}

/**
 * Chyba pri scrapovaní
 */
export interface ScrapeError {
  type: "PARSE_ERROR" | "NETWORK_ERROR" | "STRUCTURE_CHANGE" | "VALIDATION_ERROR";
  message: string;
  url?: string;
  field?: string;
  rawValue?: string;
}

/**
 * Konfigurácia scrapera
 */
export interface ScraperConfig {
  source: "BAZOS" | "REALITY";
  baseUrl: string;
  rateLimit: number; // requests per minute
  maxPages: number;
  retryAttempts: number;
  userAgent: string;
}

/**
 * Market Gap detekcia
 */
export interface MarketGapResult {
  propertyId: string;
  gapPercentage: number;
  streetAvgPrice: number;
  districtAvgPrice: number;
  potentialProfit: number;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  reasons: string[];
}

/**
 * Liquidity metriky
 */
export interface LiquidityMetrics {
  city: string;      // Mesto/obec
  district: string;
  avgDaysOnMarket: number;
  medianDaysOnMarket: number;
  soldLastMonth: number;
  activeListings: number;
  turnoverRate: number; // % sold per month
}

/**
 * Sync report
 */
export interface SyncReport {
  success: boolean;
  startedAt: Date;
  completedAt: Date;
  duration: number;
  sources: {
    source: string;
    result: ScrapeResult;
  }[];
  marketGaps: MarketGapResult[];
  liquidityUpdates: number;
  errors: ScrapeError[];
}
