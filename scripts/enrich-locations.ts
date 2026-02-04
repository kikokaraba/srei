/**
 * AI enrichment lokality pre inzeráty s neurčitou lokalitou
 * Spracuje: Slovensko, Neznáme, Unknown, prázdne.
 * Najprv skúsi PSČ (bez API), potom AI.
 * Použitie: npx tsx scripts/enrich-locations.ts [--dry-run] [--limit N] [--all]
 */

import { enrichLocations } from "@/lib/ai/enrich-locations";

function parseArgs(): { dryRun: boolean; limit: number; all: boolean } {
  const a = process.argv.slice(2);
  const dryRun = a.includes("--dry-run");
  const all = a.includes("--all");
  let limit = all ? 10_000 : 100;
  const i = a.indexOf("--limit");
  if (i >= 0 && a[i + 1]) limit = Math.max(1, parseInt(a[i + 1], 10) || 100);
  return { dryRun, limit, all };
}

async function main() {
  const { dryRun, limit } = parseArgs();

  console.log("📍 Enrichment lokality (Slovensko, Neznáme, Unknown, prázdne)");
  if (dryRun) console.log("   (dry-run – žiadne zmeny v DB)");
  console.log(`   Limit: ${limit} | AI: ${process.env.ANTHROPIC_API_KEY ? "áno" : "nie"}\n`);

  const result = await enrichLocations({ limit, dryRun });

  console.log(`\nSpracované: ${result.total}`);
  console.log(`  Obohatené: ${result.enriched} (PSČ: ${result.byPsc}, AI: ${result.byAi})`);
  console.log(`  Bez výsledku: ${result.failed}`);
  if (dryRun && result.enriched > 0) console.log("\nSpusti bez --dry-run pre zápis do DB.");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
