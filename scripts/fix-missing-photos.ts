/**
 * Fix Missing Photos – zoznam inzerátov bez fotiek a tip na opravu
 *
 * Prejde všetky Property s prázdnym photos (alebo photo_count === 0).
 * Vypíše source_url pre opätovný scraping alebo manuálnu kontrolu.
 * Niektoré portály majú predvídateľnú thumbnail URL z detail URL – skúsi ich odvodiť (len info).
 *
 * Použitie: npx tsx scripts/fix-missing-photos.ts
 */

// Načítaj .env súbor (Next.js štýl)
import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

// Vytvor Prisma klienta priamo
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("❌ DATABASE_URL nie je nastavený. Skontroluj .env súbor.");
  process.exit(1);
}
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter, log: ["error"] });

function isEmptyPhotos(photos: string | null, photoCount: number): boolean {
  if (photoCount > 0) return false;
  if (!photos || photos.trim() === "") return true;
  try {
    const arr = JSON.parse(photos);
    return !Array.isArray(arr) || arr.length === 0;
  } catch {
    return true;
  }
}

async function main() {
  console.log("📸 Fix Missing Photos – inzeráty bez fotiek\n");

  const withoutPhotos = await prisma.property.findMany({
    where: {
      OR: [
        { photos: "[]" },
        { photos: "" },
        { photo_count: 0 },
      ],
    },
    select: {
      id: true,
      title: true,
      source_url: true,
      source: true,
      photo_count: true,
      photos: true,
    },
    orderBy: { updatedAt: "desc" },
  });

  const filtered = withoutPhotos.filter((p) => isEmptyPhotos(p.photos, p.photo_count));

  console.log(`── Nájdených ${filtered.length} inzerátov bez fotiek ──\n`);

  if (filtered.length === 0) {
    console.log("Žiadne. Všetky záznamy majú aspoň jednu fotku alebo photo_count > 0.\n");
    await prisma.$disconnect();
    await pool.end();
    return;
  }

  console.log("Prvých 50 (source_url pre re-scrape alebo kontrolu):\n");
  for (const p of filtered.slice(0, 50)) {
    console.log(`  ${p.source || "?"} | ${p.id}`);
    console.log(`    ${p.title?.slice(0, 60) ?? ""}…`);
    console.log(`    ${p.source_url ?? "(žiadna URL)"}`);
  }

  if (filtered.length > 50) {
    console.log(`\n  ... a ďalších ${filtered.length - 50}\n`);
  }

  console.log("── Tip ──");
  console.log("Fotky sa doplnia pri ďalšom scrapingu (Apify webhook) alebo manuálnom re-scrape.");
  console.log("Skontroluj v Apify Dataset, či pole 'images' / 'photos' nie je prázdne – ak áno, uprav Page Function (nehnutelnosti-config.ts alebo iný portál).\n");

  await prisma.$disconnect();
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
