/**
 * Odstráni všetky záznamy so zdrojom NEHNUTELNOSTI z databázy.
 * Spusti pred prvým deployom po odstránení zdroja nehnutelnosti.sk:
 *
 *   pnpm exec tsx scripts/remove-nehnutelnosti-data.ts
 *
 * Vyžaduje DATABASE_URL.
 */

import { PrismaClient } from "@/generated/prisma";

const prisma = new PrismaClient();

async function main() {
  console.log("Odstraňujem dáta so zdrojom NEHNUTELNOSTI...");

  // Property – najprv vymažeme závislé tabuľky (ak nemajú CASCADE), potom Property
  // V Prisma schéme majú väčšinou onDelete: Cascade, takže stačí vymazať Property
  const deletedProperties = await prisma.$executeRawUnsafe(
    'DELETE FROM "Property" WHERE source = $1',
    "NEHNUTELNOSTI"
  );
  console.log(`  Property: ${deletedProperties} vymazaných`);

  const deletedProgress = await prisma.$executeRawUnsafe(
    'DELETE FROM "ScrapeProgress" WHERE source = $1',
    "NEHNUTELNOSTI"
  );
  console.log(`  ScrapeProgress: ${deletedProgress} vymazaných`);

  const deletedFailed = await prisma.$executeRawUnsafe(
    'DELETE FROM "FailedScrape" WHERE source = $1',
    "NEHNUTELNOSTI"
  );
  console.log(`  FailedScrape: ${deletedFailed} vymazaných`);

  const deletedLifecycle = await prisma.$executeRawUnsafe(
    'DELETE FROM "PropertyLifecycle" WHERE source = $1',
    "NEHNUTELNOSTI"
  );
  console.log(`  PropertyLifecycle: ${deletedLifecycle} vymazaných`);

  const deletedRuns = await prisma.$executeRawUnsafe(
    'DELETE FROM "ScraperRun" WHERE source = $1',
    "NEHNUTELNOSTI"
  );
  console.log(`  ScraperRun: ${deletedRuns} vymazaných`);

  console.log("Hotovo. Teraz môžeš spustiť prisma db push alebo prisma migrate deploy.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
