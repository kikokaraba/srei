/**
 * Audit Shady Prices – nájde inzeráty s „cena dohodou“ uloženou ako konkrétna suma
 *
 * Pošle description do Claude: „Je v tomto texte cena kúpna 'cena dohodou' / 'v RK'?“.
 * Ak AI potvrdí dohodou, ale v DB máme sumu > 0, nastavíme price=0, is_negotiable=true, price_per_m2=0.
 *
 * Použitie:
 *   npx tsx scripts/audit-shady-prices.ts
 *   DRY_RUN=1 npx tsx scripts/audit-shady-prices.ts   # len report, žiadne zápisy
 *   LIMIT=50 npx tsx scripts/audit-shady-prices.ts    # max 50 kontrolovaných
 */

import { prisma } from "@/lib/prisma";
import Anthropic from "@anthropic-ai/sdk";

const DRY_RUN = process.env.DRY_RUN === "1" || process.env.DRY_RUN === "true";
const LIMIT = Math.min(500, Math.max(1, parseInt(process.env.LIMIT || "100", 10) || 100));

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function aiSaysDohodou(description: string | null): Promise<boolean> {
  if (!description || description.length < 20) return false;
  if (!process.env.ANTHROPIC_API_KEY) return false;

  const text = description.slice(0, 4000);
  try {
    const res = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 64,
      system: "Odpovedaj výhradne TRUE alebo FALSE. Nič iné.",
      messages: [
        {
          role: "user",
          content: `Je v tomto inzeráte cena kúpna nehnuteľnosti uvedená ako "cena dohodou", "cena v RK", "na vyžiadanie" alebo ekvivalent (t.j. nie je tam konkrétna suma v €)? Odpovedz len TRUE alebo FALSE.\n\n---\n${text}`,
        },
      ],
    });
    const raw = (res.content[0].type === "text" ? res.content[0].text : "").trim().toUpperCase();
    return raw.includes("TRUE");
  } catch {
    return false;
  }
}

async function main() {
  console.log("🔍 Audit Shady Prices – dohodou vs. uložená suma\n");
  if (DRY_RUN) console.log("⚠️  DRY_RUN=1 – žiadne zmeny v DB.\n");

  const candidates = await prisma.property.findMany({
    where: { price: { gt: 0 } },
    select: { id: true, title: true, price: true, price_per_m2: true, description: true, source_url: true },
    orderBy: { updatedAt: "desc" },
    take: LIMIT,
  });

  console.log(`Kontrolujem ${candidates.length} inzerátov s price > 0 (limit ${LIMIT}).\n`);

  const toFix: { id: string; title: string; price: number; url: string | null }[] = [];
  let checked = 0;

  for (const p of candidates) {
    const dohodou = await aiSaysDohodou(p.description ?? null);
    checked++;
    if (dohodou) {
      toFix.push({
        id: p.id,
        title: p.title ?? "",
        price: p.price,
        url: p.source_url,
      });
    }
    if (checked % 10 === 0) process.stdout.write(`  Skontrolovaných ${checked}…\r`);
    await new Promise((r) => setTimeout(r, 400));
  }

  console.log(`\n── Nájdených ${toFix.length} inzerátov s „dohodou“ ale uloženou cenou ──\n`);

  for (const f of toFix.slice(0, 30)) {
    console.log(`  ${f.id} | €${f.price.toLocaleString()} | ${f.title.slice(0, 50)}…`);
    if (f.url) console.log(`    ${f.url}`);
  }
  if (toFix.length > 30) console.log(`  ... a ďalších ${toFix.length - 30}\n`);

  if (!DRY_RUN && toFix.length > 0) {
    console.log("── Úpravy v DB ──");
    let updated = 0;
    for (const f of toFix) {
      try {
        await prisma.property.update({
          where: { id: f.id },
          data: { price: 0, price_per_m2: 0, is_negotiable: true },
        });
        updated++;
      } catch (e) {
        console.warn(`  Chyba ${f.id}:`, e);
      }
    }
    console.log(`  Opravených: ${updated}.\n`);
  }

  console.log("✅ Hotovo.");
  if (toFix.length > 0 && DRY_RUN) console.log("\nSpusti bez DRY_RUN=1 pre aplikovanie zmien.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
