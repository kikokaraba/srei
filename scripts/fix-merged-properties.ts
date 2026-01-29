/**
 * Fix Merged Properties – rozlepenie zle spárovaných inzerátov
 *
 * 1. Detekcia: Property s podozrivým skokom ceny v PriceHistory (>30% v jeden deň)
 * 2. Analýza PropertyMatch: páry s veľkým rozdielom plochy alebo ceny = pravdepodobne false positive
 * 3. Cleanup: vymazanie nesprávnych PropertyMatch (nespájať rôzne byty)
 *
 * Použitie: npx tsx scripts/fix-merged-properties.ts
 * Dry-run (len report): DRY_RUN=1 npx tsx scripts/fix-merged-properties.ts
 */

import { prisma } from "@/lib/prisma";

const PRICE_JUMP_PCT = 30;
const SAME_DAY_MS = 24 * 60 * 60 * 1000;
const MATCH_AREA_DIFF_PCT = 15;
const MATCH_PRICE_DIFF_PCT = 30;
const DRY_RUN = process.env.DRY_RUN === "1" || process.env.DRY_RUN === "true";

async function findSuspiciousPriceJumps(): Promise<
  Array<{ propertyId: string; prevPrice: number; nextPrice: number; pctDiff: number; prevAt: Date; nextAt: Date }>
> {
  const history = await prisma.priceHistory.findMany({
    orderBy: [{ propertyId: "asc" }, { recorded_at: "asc" }],
    select: { propertyId: true, price: true, recorded_at: true },
  });

  const byProperty = new Map<string, { price: number; recorded_at: Date }[]>();
  for (const row of history) {
    const list = byProperty.get(row.propertyId) ?? [];
    list.push({ price: row.price, recorded_at: row.recorded_at });
    byProperty.set(row.propertyId, list);
  }

  const suspicious: Array<{
    propertyId: string;
    prevPrice: number;
    nextPrice: number;
    pctDiff: number;
    prevAt: Date;
    nextAt: Date;
  }> = [];

  for (const [propertyId, list] of byProperty) {
    for (let i = 1; i < list.length; i++) {
      const prev = list[i - 1];
      const next = list[i];
      const timeDiff = next.recorded_at.getTime() - prev.recorded_at.getTime();
      if (timeDiff > SAME_DAY_MS) continue;
      if (prev.price <= 0) continue;
      const pctDiff = Math.abs((next.price - prev.price) / prev.price) * 100;
      if (pctDiff >= PRICE_JUMP_PCT) {
        suspicious.push({
          propertyId,
          prevPrice: prev.price,
          nextPrice: next.price,
          pctDiff: Math.round(pctDiff * 10) / 10,
          prevAt: prev.recorded_at,
          nextAt: next.recorded_at,
        });
      }
    }
  }

  return suspicious;
}

async function findFalsePositiveMatches(): Promise<
  Array<{ matchId: string; primaryId: string; matchedId: string; reason: string }>
> {
  const matches = await prisma.propertyMatch.findMany({
    include: {
      primaryProperty: { select: { id: true, area_m2: true, price: true, source_url: true, title: true } },
      matchedProperty: { select: { id: true, area_m2: true, price: true, source_url: true, title: true } },
    },
  });

  const falsePositives: Array<{ matchId: string; primaryId: string; matchedId: string; reason: string }> = [];

  for (const m of matches) {
    const a = m.primaryProperty;
    const b = m.matchedProperty;
    const areaDiffPct =
      Math.max(a.area_m2, b.area_m2) > 0
        ? (Math.abs(a.area_m2 - b.area_m2) / Math.max(a.area_m2, b.area_m2)) * 100
        : 0;
    const priceDiffPct =
      Math.max(a.price, b.price) > 0
        ? (Math.abs(a.price - b.price) / Math.max(a.price, b.price)) * 100
        : 0;

    if (areaDiffPct >= MATCH_AREA_DIFF_PCT) {
      falsePositives.push({
        matchId: m.id,
        primaryId: a.id,
        matchedId: b.id,
        reason: `Plocha sa líši o ${Math.round(areaDiffPct)}% (${a.area_m2} vs ${b.area_m2} m²)`,
      });
    } else if (priceDiffPct >= MATCH_PRICE_DIFF_PCT && Math.min(a.price, b.price) > 0) {
      falsePositives.push({
        matchId: m.id,
        primaryId: a.id,
        matchedId: b.id,
        reason: `Cena sa líši o ${Math.round(priceDiffPct)}% (${a.price} vs ${b.price} €)`,
      });
    }
  }

  return falsePositives;
}

async function main() {
  console.log("🔧 Fix Merged Properties – detekcia a cleanup\n");
  if (DRY_RUN) console.log("⚠️  DRY_RUN=1 – žiadne zmeny v DB, len report.\n");

  const [suspiciousJumps, falsePositiveMatches] = await Promise.all([
    findSuspiciousPriceJumps(),
    findFalsePositiveMatches(),
  ]);

  console.log("── 1. Podozrivé skoky ceny v PriceHistory (>30% v jeden deň) ──");
  if (suspiciousJumps.length === 0) {
    console.log("   Žiadne.\n");
  } else {
    for (const s of suspiciousJumps.slice(0, 20)) {
      console.log(
        `   ${s.propertyId}: ${s.prevPrice} → ${s.nextPrice} € (${s.pctDiff}%) ${s.prevAt.toISOString().slice(0, 10)}`
      );
    }
    if (suspiciousJumps.length > 20) console.log(`   ... a ďalších ${suspiciousJumps.length - 20}`);
    console.log(`   Celkom: ${suspiciousJumps.length} záznamov.\n`);
  }

  console.log("── 2. False positive PropertyMatch (odstránime prepojenia) ──");
  if (falsePositiveMatches.length === 0) {
    console.log("   Žiadne.\n");
  } else {
    for (const fp of falsePositiveMatches.slice(0, 30)) {
      console.log(`   Match ${fp.matchId}: ${fp.primaryId} ↔ ${fp.matchedId} – ${fp.reason}`);
    }
    if (falsePositiveMatches.length > 30) console.log(`   ... a ďalších ${falsePositiveMatches.length - 30}`);
    console.log(`   Celkom: ${falsePositiveMatches.length} prepojení na vymazanie.\n`);
  }

  if (!DRY_RUN && falsePositiveMatches.length > 0) {
    console.log("── Mažem nesprávne PropertyMatch ──");
    let deleted = 0;
    for (const fp of falsePositiveMatches) {
      try {
        await prisma.propertyMatch.delete({ where: { id: fp.matchId } });
        deleted++;
      } catch (e) {
        console.warn("   Chyba pri mazaní", fp.matchId, e);
      }
    }
    console.log(`   Zmazaných: ${deleted}.\n`);
  }

  console.log("✅ Hotovo.");
  if (suspiciousJumps.length > 0) {
    console.log(
      "\nTip: Záznamy s podozrivým skokom ceny skontroluj v DB (mohli byť zle zlúčení v minulosti). PriceHistory nemá source_url, takže automatické rozdelenie jedného Property na dve nie je v tomto skripte."
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
