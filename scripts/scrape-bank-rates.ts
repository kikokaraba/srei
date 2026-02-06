#!/usr/bin/env tsx
/**
 * CLI: Scrapovanie úrokových sadzieb bánk (hypotéky).
 * Použitie: pnpm run scrape:bank-rates
 * Test bez DB: DRY_RUN=1 pnpm run scrape:bank-rates
 */

import { scrapeAllBankRates } from "@/lib/data-sources/bank-rates-scraper";

const dryRun = process.env.DRY_RUN === "1" || process.env.DRY_RUN === "true";

async function main() {
  console.log("🏦 Scrapovanie úrokových sadzieb bánk..." + (dryRun ? " (dry-run, bez DB)\n" : "\n"));
  const result = await scrapeAllBankRates({ dryRun });
  console.log(`   Banky: ${result.banksScraped}/${result.banksScraped + result.banksFailed.length}`);
  console.log(`   Sadzieb uložených: ${result.totalRates}`);
  console.log(`   Čas: ${result.durationMs} ms`);
  if (result.banksFailed.length) {
    console.log(`   Zlyhané: ${result.banksFailed.join(", ")}`);
  }
  if (result.errors.length) {
    console.log("\n   Chyby:");
    result.errors.forEach((e) => console.log(`   - ${e}`));
  }
  console.log("\n✅ Hotovo.");
  process.exit(result.success ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
