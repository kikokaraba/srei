/**
 * Oprava historických dát
 * 
 * 1. Opraví zlé external_id (napr. "neh-developersky-projekt" → správne ID z URL)
 * 2. Vyčistí duplicitné PriceHistory záznamy (ponechá len zmeny ceny)
 * 3. Doplní thumbnaily pre properties bez fotiek
 * 
 * Použitie:
 *   NODE_TLS_REJECT_UNAUTHORIZED=0 npx tsx scripts/fix-historical-data.ts
 *   DRY_RUN=1 NODE_TLS_REJECT_UNAUTHORIZED=0 npx tsx scripts/fix-historical-data.ts
 */

import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("❌ DATABASE_URL nie je nastavený.");
  process.exit(1);
}
const pool = new Pool({ 
  connectionString,
  ssl: { rejectUnauthorized: false }
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter, log: ["error"] });

const DRY_RUN = process.env.DRY_RUN === "1" || process.env.DRY_RUN === "true";

/**
 * Extrahuje správne external ID z URL
 */
function extractCorrectExternalId(url: string): string | null {
  // Hľadaj ID vo formáte Ju* (unikátne ID nehnutelnosti.sk)
  const nehnutIdMatch = url.match(/\/(Ju[A-Za-z0-9_-]{8,12})\/?/);
  if (nehnutIdMatch) return `nh-${nehnutIdMatch[1]}`;
  
  // Fallback: skús prvý nie-generický segment po /detail/
  const pathAfterDetail = url.match(/\/detail\/([^?]+)/);
  if (pathAfterDetail) {
    const segments = pathAfterDetail[1].split("/").filter(Boolean);
    const genericPatterns = /^(developersky-projekt|predaj|prenajom|byty|domy|pozemky|reality|novostavby)$/i;
    for (const seg of segments) {
      if (!genericPatterns.test(seg) && seg.length >= 8) {
        return `nh-${seg}`;
      }
    }
  }
  
  return null;
}

async function fixBadExternalIds() {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("1. OPRAVA: Zlé external_id");
  console.log("═══════════════════════════════════════════════════════════════\n");

  // Nájdi properties s generickým external_id
  const badProperties = await prisma.property.findMany({
    where: {
      OR: [
        { external_id: "neh-developersky-projekt" },
        { external_id: { startsWith: "uk-" } },
      ],
    },
    select: { id: true, external_id: true, source_url: true },
  });

  console.log(`Nájdených ${badProperties.length} properties so zlým external_id`);

  let fixed = 0;
  for (const prop of badProperties) {
    if (!prop.source_url) continue;
    
    const correctId = extractCorrectExternalId(prop.source_url);
    if (!correctId || correctId === prop.external_id) continue;

    console.log(`  ${prop.id}: ${prop.external_id} → ${correctId}`);
    
    if (!DRY_RUN) {
      try {
        // Použijeme raw SQL aby sme obišli prípadné Prisma problémy
        await prisma.$executeRaw`
          UPDATE "Property" 
          SET external_id = ${correctId} 
          WHERE id = ${prop.id}
        `;
        fixed++;
      } catch (e) {
        console.warn(`    ❌ Chyba: ${e instanceof Error ? e.message : e}`);
      }
    } else {
      fixed++;
    }
  }

  console.log(`\n  Opravených: ${fixed}${DRY_RUN ? " (dry run)" : ""}\n`);
  return fixed;
}

async function cleanDuplicatePriceHistory() {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("2. ČISTENIE: Duplicitné PriceHistory záznamy");
  console.log("═══════════════════════════════════════════════════════════════\n");

  // Nájdi properties s veľa PriceHistory záznamami
  const propertiesWithManyHistory = await prisma.$queryRaw<{ propertyId: string; count: bigint }[]>`
    SELECT "propertyId", COUNT(*) as count
    FROM "PriceHistory"
    GROUP BY "propertyId"
    HAVING COUNT(*) > 5
    ORDER BY count DESC
  `;

  console.log(`Nájdených ${propertiesWithManyHistory.length} properties s >5 PriceHistory záznamami`);

  let totalDeleted = 0;
  
  for (const row of propertiesWithManyHistory) {
    // Načítaj všetky záznamy pre túto property
    const history = await prisma.priceHistory.findMany({
      where: { propertyId: row.propertyId },
      orderBy: { recorded_at: "asc" },
    });

    // Identifikuj duplicity (rovnaká cena za sebou)
    const toDelete: string[] = [];
    let prevPrice: number | null = null;
    
    for (const h of history) {
      if (prevPrice !== null && h.price === prevPrice) {
        // Duplicitný záznam - cena sa nezmenila
        toDelete.push(h.id);
      }
      prevPrice = h.price;
    }

    if (toDelete.length > 0) {
      console.log(`  ${row.propertyId}: ${toDelete.length}/${history.length} duplicitných`);
      
      if (!DRY_RUN) {
        await prisma.priceHistory.deleteMany({
          where: { id: { in: toDelete } },
        });
      }
      totalDeleted += toDelete.length;
    }
  }

  console.log(`\n  Zmazaných: ${totalDeleted}${DRY_RUN ? " (dry run)" : ""}\n`);
  return totalDeleted;
}

async function generateThumbnailUrl(sourceUrl: string): Promise<string | null> {
  // Extrahuj ID z URL a vytvor predpokladanú thumbnail URL
  const idMatch = sourceUrl.match(/\/(Ju[A-Za-z0-9_-]{8,12})\/?/);
  if (!idMatch) return null;
  
  // Nehnutelnosti.sk používa cloudflare imagedelivery
  // Formát: https://imagedelivery.net/xxx/nehnutelnosti-sk/{ID}/gallery
  // Toto je len odhad - skutočná URL môže byť iná
  return null; // Nemáme spoľahlivý spôsob ako vygenerovať thumbnail bez scrapingu detailu
}

async function reportMissingPhotos() {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("3. REPORT: Properties bez fotiek");
  console.log("═══════════════════════════════════════════════════════════════\n");

  const count = await prisma.property.count({
    where: {
      OR: [
        { photos: "[]" },
        { photos: "" },
        { photo_count: 0 },
      ],
    },
  });

  console.log(`Počet properties bez fotiek: ${count}`);
  console.log("\nTieto sa doplnia automaticky pri ďalšom Apify webhook alebo manuálnom re-scrape.\n");
  
  return count;
}

async function main() {
  console.log("🔧 Fix Historical Data\n");
  if (DRY_RUN) console.log("⚠️  DRY_RUN=1 – žiadne zmeny v DB.\n");

  try {
    const fixedIds = await fixBadExternalIds();
    const deletedHistory = await cleanDuplicatePriceHistory();
    const missingPhotos = await reportMissingPhotos();

    console.log("═══════════════════════════════════════════════════════════════");
    console.log("SÚHRN");
    console.log("═══════════════════════════════════════════════════════════════");
    console.log(`  Opravené external_id: ${fixedIds}`);
    console.log(`  Zmazané duplicitné PriceHistory: ${deletedHistory}`);
    console.log(`  Properties bez fotiek: ${missingPhotos} (vyriešia sa pri ďalšom scrape)`);
    
    if (DRY_RUN) {
      console.log("\n💡 Spusti bez DRY_RUN=1 pre aplikovanie zmien.");
    }
    
    console.log("\n✅ Hotovo.");
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
