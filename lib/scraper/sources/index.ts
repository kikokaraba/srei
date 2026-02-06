/**
 * Scraper implementácie – len Bazoš a Nehnutelnosti.sk (byty predaj + prenájom)
 */

export { BazosScraper, bazosScraper } from "./bazos";
export { NehnutelnostiScraper, nehnutelnostiScraper } from "./nehnutelnosti";

import { bazosScraper } from "./bazos";
import { nehnutelnostiScraper } from "./nehnutelnosti";
import type { BaseScraper } from "../base-scraper";
import type { PropertySource } from "@/generated/prisma/client";

/**
 * Mapa scraperov – aktívne len BAZOS a NEHNUTELNOSTI
 */
export const SCRAPERS: Record<PropertySource, BaseScraper | null> = {
  BAZOS: bazosScraper,
  NEHNUTELNOSTI: nehnutelnostiScraper,
  REALITY: null,
  TOPREALITY: null,
  MANUAL: null,
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
