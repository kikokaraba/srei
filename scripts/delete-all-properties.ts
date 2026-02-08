/**
 * Vymaže všetky nehnuteľnosti z databázy (a súvisiace záznamy cez CASCADE).
 * Použitie: CONFIRM_DELETE_ALL_PROPERTIES=1 pnpm exec tsx scripts/delete-all-properties.ts
 *
 * CASCADE zmaže: InvestmentMetrics, PriceHistory, MarketGap, PropertyImpact,
 * TaxInfo, SavedProperty, PropertySnapshot, PropertyFingerprint, PropertyMatch.
 * AIAlert (propertyId bez FK) – skript ich tiež zmaže, aby neostali neplatné referencie.
 */

import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import { prisma } from "@/lib/prisma";

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("❌ DATABASE_URL nie je nastavený. Nastav v .env alebo: DATABASE_URL='...' CONFIRM_DELETE_ALL_PROPERTIES=1 pnpm exec tsx scripts/delete-all-properties.ts");
    process.exit(1);
  }
  if (process.env.CONFIRM_DELETE_ALL_PROPERTIES !== "1") {
    console.error(
      "❌ Pre vymazanie všetkých nehnuteľností nastav: CONFIRM_DELETE_ALL_PROPERTIES=1"
    );
    console.error("   Príklad: CONFIRM_DELETE_ALL_PROPERTIES=1 pnpm exec tsx scripts/delete-all-properties.ts");
    process.exit(1);
  }

  const count = await prisma.property.count();
  console.log(`📋 Počet nehnuteľností pred vymazaním: ${count}`);

  if (count === 0) {
    console.log("✅ Žiadne nehnuteľnosti na vymazanie.");
    return;
  }

  console.log("🗑️  Mažem všetky nehnuteľnosti (CASCADE zmaže súvisiace tabuľky)...");

  const deleted = await prisma.property.deleteMany({});
  console.log(`✅ Vymazaných nehnuteľností: ${deleted.count}`);

  const aiAlertCount = await prisma.aIAlert.count();
  if (aiAlertCount > 0) {
    const deletedAlerts = await prisma.aIAlert.deleteMany({});
    console.log(`✅ Vymazaných AI alertov (neplatné propertyId): ${deletedAlerts.count}`);
  }

  const remaining = await prisma.property.count();
  console.log(`📋 Počet nehnuteľností po vymazaní: ${remaining}`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
