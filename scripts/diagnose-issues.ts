/**
 * Diagnóza problémov s dátami
 * 1. Prečo má jeden Property toľko rôznych cien v PriceHistory?
 * 2. Prečo chýbajú fotky?
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

async function diagnosePropertyWithManyPriceJumps() {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("1. DIAGNOSTIKA: Property s veľa skokmi ceny");
  console.log("═══════════════════════════════════════════════════════════════\n");

  // Nájdi property s najviac PriceHistory záznamami
  const topProperties = await prisma.$queryRaw<{ propertyId: string; count: bigint }[]>`
    SELECT "propertyId", COUNT(*) as count
    FROM "PriceHistory"
    GROUP BY "propertyId"
    ORDER BY count DESC
    LIMIT 5
  `;

  for (const row of topProperties) {
    console.log(`\n📊 Property ${row.propertyId} má ${row.count} záznamov v PriceHistory`);
    
    // Detaily property
    const prop = await prisma.property.findUnique({
      where: { id: row.propertyId },
      select: { 
        id: true, 
        external_id: true, 
        source_url: true, 
        title: true,
        price: true,
        area_m2: true,
        city: true,
        createdAt: true,
      }
    });
    
    if (prop) {
      console.log(`   Title: ${prop.title?.slice(0, 60)}...`);
      console.log(`   External ID: ${prop.external_id}`);
      console.log(`   Source URL: ${prop.source_url}`);
      console.log(`   Current price: €${prop.price?.toLocaleString()}`);
      console.log(`   Area: ${prop.area_m2} m²`);
      console.log(`   City: ${prop.city}`);
      console.log(`   Created: ${prop.createdAt}`);
    }

    // Prvých 20 PriceHistory záznamov
    const history = await prisma.priceHistory.findMany({
      where: { propertyId: row.propertyId },
      orderBy: { recorded_at: "asc" },
      take: 20,
    });
    
    console.log(`\n   Cenová história (prvých 20):`);
    let prevPrice: number | null = null;
    for (const h of history) {
      const jump = prevPrice !== null && prevPrice !== h.price 
        ? ` ← SKOK ${Math.round(Math.abs(h.price - prevPrice) / prevPrice * 100)}%` 
        : "";
      console.log(`     ${h.recorded_at.toISOString().slice(0, 19)} | €${h.price.toLocaleString().padStart(10)}${jump}`);
      prevPrice = h.price;
    }
  }
}

async function diagnoseMissingPhotos() {
  console.log("\n\n═══════════════════════════════════════════════════════════════");
  console.log("2. DIAGNOSTIKA: Chýbajúce fotky");
  console.log("═══════════════════════════════════════════════════════════════\n");

  // Zisti distribúciu podľa zdroja
  const bySource = await prisma.$queryRaw<{ source: string; total: bigint; no_photos: bigint }[]>`
    SELECT 
      source,
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE photos = '[]' OR photos = '' OR photo_count = 0) as no_photos
    FROM "Property"
    GROUP BY source
    ORDER BY total DESC
  `;

  console.log("Distribúcia podľa zdroja:");
  for (const row of bySource) {
    const pct = Number(row.total) > 0 ? Math.round(Number(row.no_photos) / Number(row.total) * 100) : 0;
    console.log(`  ${row.source}: ${row.no_photos}/${row.total} bez fotiek (${pct}%)`);
  }

  // Ukáž niekoľko príkladov bez fotiek
  const noPhotos = await prisma.property.findMany({
    where: {
      OR: [
        { photos: "[]" },
        { photos: "" },
        { photo_count: 0 },
      ],
    },
    select: {
      id: true,
      source: true,
      source_url: true,
      title: true,
      photos: true,
      photo_count: true,
      createdAt: true,
    },
    take: 5,
    orderBy: { createdAt: "desc" },
  });

  console.log("\nPríklady inzerátov bez fotiek:");
  for (const p of noPhotos) {
    console.log(`\n  ${p.id}`);
    console.log(`    Source: ${p.source}`);
    console.log(`    Title: ${p.title?.slice(0, 50)}...`);
    console.log(`    URL: ${p.source_url}`);
    console.log(`    photos field: "${p.photos}"`);
    console.log(`    photo_count: ${p.photo_count}`);
    console.log(`    Created: ${p.createdAt}`);
  }

  // Zisti, či máme nejaké properties s photos ako nie-JSON
  const weirdPhotos = await prisma.$queryRaw<{ id: string; photos: string }[]>`
    SELECT id, photos FROM "Property"
    WHERE photos IS NOT NULL 
      AND photos != '[]' 
      AND photos != ''
      AND photos NOT LIKE '[%'
    LIMIT 5
  `;

  if (weirdPhotos.length > 0) {
    console.log("\n⚠️  Properties s neštandardným photos formátom:");
    for (const w of weirdPhotos) {
      console.log(`  ${w.id}: "${w.photos.slice(0, 100)}..."`);
    }
  }
}

async function checkRecentWebhookData() {
  console.log("\n\n═══════════════════════════════════════════════════════════════");
  console.log("3. DIAGNOSTIKA: Posledné webhook dáta");
  console.log("═══════════════════════════════════════════════════════════════\n");

  const logs = await prisma.dataFetchLog.findMany({
    orderBy: { fetchedAt: "desc" },
    take: 10,
  });

  console.log("Posledných 10 DataFetchLog záznamov:");
  for (const log of logs) {
    console.log(`  ${log.fetchedAt.toISOString().slice(0, 19)} | ${log.source} | ${log.status} | ${log.recordsCount} records | ${log.duration_ms}ms`);
    if (log.error) console.log(`    Error: ${log.error.slice(0, 100)}...`);
  }
}

async function main() {
  try {
    await diagnosePropertyWithManyPriceJumps();
    await diagnoseMissingPhotos();
    await checkRecentWebhookData();
    
    console.log("\n\n✅ Diagnostika dokončená.");
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
