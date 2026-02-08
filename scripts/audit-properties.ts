/**
 * Data Consistency Audit – Property table
 * Skontroluje property_type, lat/lng, status a súvisiace filtre.
 * Použitie: npx tsx scripts/audit-properties.ts
 */

import { prisma } from "@/lib/prisma";

async function main() {
  console.log("📋 Data Consistency Check – Property\n");

  const [
    total,
    byType,
    byListingType,
    rentalDashboardCount,
    nullType,
    nullLat,
    nullLng,
    nullEither,
    active,
    withCoords,
    activeWithCoords,
    activeNullType,
    activeNullCoords,
  ] = await Promise.all([
    prisma.property.count(),
    prisma.property.groupBy({ by: ["property_type"], _count: true }),
    prisma.property.groupBy({ by: ["listing_type"], _count: true }),
    prisma.property.count({
      where: { status: "ACTIVE", listing_type: "PRENAJOM", property_type: "BYT" },
    }),
    prisma.property.count({ where: { property_type: null } }),
    prisma.property.count({ where: { latitude: null } }),
    prisma.property.count({ where: { longitude: null } }),
    prisma.property.count({
      where: { OR: [{ latitude: null }, { longitude: null }] },
    }),
    prisma.property.count({ where: { status: "ACTIVE" } }),
    prisma.property.count({
      where: {
        latitude: { not: null },
        longitude: { not: null },
      },
    }),
    prisma.property.count({
      where: {
        status: "ACTIVE",
        latitude: { not: null },
        longitude: { not: null },
      },
    }),
    prisma.property.count({
      where: { status: "ACTIVE", property_type: null },
    }),
    prisma.property.count({
      where: {
        status: "ACTIVE",
        OR: [{ latitude: null }, { longitude: null }],
      },
    }),
  ]);

  console.log("── Počty ──");
  console.log(`Celkom Property: ${total}`);
  console.log(`ACTIVE: ${active}`);
  console.log(`S súradnicami (lat & lng): ${withCoords}`);
  console.log(`ACTIVE + súradnice: ${activeWithCoords}`);
  console.log("");

  console.log("── listing_type (predaj / prenájom) ──");
  for (const r of byListingType) {
    const v = r.listing_type;
    console.log(`  ${v}: ${r._count}`);
  }
  console.log(
    `  → Nájomný dashboard zobrazuje len: ACTIVE + PRENAJOM + BYT = ${rentalDashboardCount}`
  );
  if (rentalDashboardCount === 0) {
    console.log(
      "  ⚠️  Nájomný dashboard bude prázdny, kým nebudú v DB aktívne byty na prenájom (PRENAJOM). Spustite Apify scraping: /api/cron/scrape-slovakia alebo Admin → Data."
    );
  }
  console.log("");

  console.log("── property_type ──");
  for (const r of byType) {
    const v = r.property_type ?? "(null)";
    console.log(`  ${v}: ${r._count}`);
  }
  console.log(`\n⚠️  property_type = null: ${nullType}`);
  if (nullType > 0) {
    console.log(
      "   → Dashboard default filter je BYT. Tieto záznamy sa pri filtrovaní 'Byty' NEZOBRAZIA."
    );
  }
  console.log("");

  console.log("── Súradnice ──");
  console.log(`  latitude = null: ${nullLat}`);
  console.log(`  longitude = null: ${nullLng}`);
  console.log(`  lat alebo lng = null: ${nullEither}`);
  if (nullEither > 0) {
    console.log(
      "   → Map API vracia len záznamy s lat & lng. Tieto sa na mape NEZOBRAZIA."
    );
  }
  console.log("");

  console.log("── Filter / mapa ──");
  console.log(`  ACTIVE + property_type = null: ${activeNullType}`);
  console.log(`  ACTIVE + chýbajúce súradnice: ${activeNullCoords}`);
  console.log("");

  console.log("── Odporúčanie ──");
  if (nullType > 0) {
    console.log(
      `  1. Spustiť migráciu: npx tsx scripts/migrate-fix-old-properties.ts [--dry-run]`
    );
  }
  if (activeNullCoords > 0) {
    console.log(
      `  2. Geocoding pre záznamy bez súradníc: npx tsx scripts/geocode-old-properties.ts [--dry-run] [--limit N]`
    );
  }
  if (nullType === 0 && activeNullCoords === 0) {
    console.log("  Žiadne zistené problémy v property_type alebo súradniciach.");
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
