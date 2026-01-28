/**
 * Migrácia – nastav property_type = 'BYT' pre záznamy s property_type = null.
 * Staré inzeráty tak prejdú dashboard filtrom „Byty“ (default).
 * Použitie: npx tsx scripts/migrate-fix-old-properties.ts [--dry-run]
 */

import { prisma } from "@/lib/prisma";

const dryRun = process.argv.includes("--dry-run");

async function main() {
  console.log("🔄 Migrácia: property_type = 'BYT' kde null");
  if (dryRun) console.log("   (dry-run – žiadne zmeny v DB)\n");

  const toUpdate = await prisma.property.findMany({
    where: { property_type: null },
    select: { id: true, title: true, city: true },
  });

  console.log(`Nájdených záznamov s property_type = null: ${toUpdate.length}`);

  if (toUpdate.length === 0) {
    console.log("Nič na aktualizáciu.");
    return;
  }

  if (dryRun) {
    console.log("\nUkážka (max 5):");
    toUpdate.slice(0, 5).forEach((p, i) => {
      console.log(`  ${i + 1}. ${p.city} – ${p.title?.slice(0, 50)}...`);
    });
    console.log("\nSkontroluj a spusti bez --dry-run.");
    return;
  }

  const result = await prisma.property.updateMany({
    where: { property_type: null },
    data: { property_type: "BYT" },
  });

  console.log(`\n✅ Aktualizovaných: ${result.count}`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
