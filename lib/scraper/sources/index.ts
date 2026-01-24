/**
 * Export všetkých scraper implementácií
 */

export { BazosScraper, bazosScraper } from "./bazos";
export { NehnutelnostiScraper, nehnutelnostiScraper } from "./nehnutelnosti";
export { RealityScraper, realityScraper } from "./reality";
// export { ToprealityScraper, toprealityScraper } from "./topreality";

import { bazosScraper } from "./bazos";
import { nehnutelnostiScraper } from "./nehnutelnosti";
import { realityScraper } from "./reality";
import type { BaseScraper } from "../base-scraper";
import type { PropertySource } from "@/generated/prisma/client";

/**
 * Mapa všetkých dostupných scraperov
 */
export const SCRAPERS: Record<PropertySource, BaseScraper | null> = {
  BAZOS: bazosScraper,
  NEHNUTELNOSTI: nehnutelnostiScraper,
  REALITY: realityScraper,
  TOPREALITY: null, // TODO: implementovať
  MANUAL: null, // Nie je scraper
};

/**
 * Vráti scraper pre daný zdroj
 */
export function getScraper(source: PropertySource): BaseScraper | null {
  return SCRAPERS[source] || null;
}

/**
 * Vráti všetky aktívne scrapery
 */
export function getActiveScrapers(): BaseScraper[] {
  return Object.values(SCRAPERS).filter((s): s is BaseScraper => s !== null);
}
