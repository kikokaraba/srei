/**
 * Geocoding pre staré inzeráty bez súradníc.
 * 1) Zostaví raw kontext z address/city/district/description.
 * 2) Zavolá enrichAddressWithAI (ak je ANTHROPIC_API_KEY).
 * 3) Geocoduje cez Nominatim (city, district, street) a uloží lat/lng.
 * Použitie: npx tsx scripts/geocode-old-properties.ts [--dry-run] [--limit N]
 */

import { prisma } from "@/lib/prisma";
import { enrichAddressWithAI } from "@/lib/ai/address-enrichment";
import { extractLocationWithAI } from "@/lib/ai/location-extraction";
import { geocodeAddressToCoords } from "@/lib/monitoring/geocoding";

const NOMINATIM_DELAY_MS = 1100;

function parseArgs(): { dryRun: boolean; limit: number } {
  const a = process.argv.slice(2);
  const dryRun = a.includes("--dry-run");
  let limit = 50;
  const i = a.indexOf("--limit");
  if (i >= 0 && a[i + 1]) limit = Math.max(1, parseInt(a[i + 1], 10) || 50);
  return { dryRun, limit };
}

function buildRawContext(p: {
  address?: string | null;
  city?: string | null;
  district?: string | null;
  description?: string | null;
  title?: string | null;
}): string {
  const parts: string[] = [];
  if (p.title) parts.push(String(p.title).trim());
  if (p.address) parts.push(String(p.address).trim());
  if (p.city) parts.push(String(p.city).trim());
  if (p.district) parts.push(String(p.district).trim());
  if (p.description)
    parts.push(String(p.description).trim().slice(0, 500));
  return parts.filter(Boolean).join("\n\n");
}

async function main() {
  const { dryRun, limit } = parseArgs();
  const useAi = !!process.env.ANTHROPIC_API_KEY;

  console.log("📍 Geocoding starých inzerátov (bez súradníc)");
  if (dryRun) console.log("   (dry-run – žiadne zmeny v DB)");
  console.log(`   Limit: ${limit} | AI enrich: ${useAi ? "áno" : "nie"}\n`);

  const rows = await prisma.property.findMany({
    where: {
      status: "ACTIVE",
      OR: [{ latitude: null }, { longitude: null }],
    },
    select: {
      id: true,
      address: true,
      city: true,
      district: true,
      street: true,
      description: true,
      title: true,
    },
    take: limit,
  });

  console.log(`Nájdených bez súradníc: ${rows.length}`);

  let geocoded = 0;
  let failed = 0;

  for (const p of rows) {
    try {
      let city = p.city?.trim() || "";
      let district = p.district?.trim() || undefined;
      let street: string | undefined = p.street?.trim() || undefined;

      if (useAi) {
        const raw = buildRawContext({ ...p, title: p.title });
        if (raw) {
          const enriched = await enrichAddressWithAI(raw);
          if (enriched?.city) {
            city = enriched.city;
            district = enriched.district ?? undefined;
            const s = [enriched.street, enriched.streetNumber]
              .filter(Boolean)
              .join(" ");
            if (s) street = s;
          }
        }
        if ((!city || city === "Slovensko") && (p.title || p.description)) {
          const loc = await extractLocationWithAI({
            title: p.title ?? "",
            description: p.description ?? undefined,
            address: p.address ?? undefined,
            locationText: p.district ?? undefined,
          });
          if (loc?.city) {
            city = loc.city;
            district = loc.district ?? undefined;
          }
        }
      }

      if (!city) {
        failed++;
        continue;
      }

      if (!street && p.address) {
        const parts = p.address.split(",").map((s) => s.trim());
        if (parts.length > 2) street = parts[parts.length - 1];
      }

      const coords = await geocodeAddressToCoords(city, district, street);

      if (coords) {
        if (!dryRun) {
          const updateData: {
            latitude: number;
            longitude: number;
            city?: string;
            district?: string;
          } = {
            latitude: coords.latitude,
            longitude: coords.longitude,
          };
          if (city && (p.city === "Slovensko" || !p.city?.trim())) {
            updateData.city = city;
            if (district) updateData.district = district;
          }
          await prisma.property.update({
            where: { id: p.id },
            data: updateData,
          });
        }
        geocoded++;
        const locInfo = city !== (p.city ?? "") ? ` (city: ${p.city ?? "?"} → ${city})` : "";
        console.log(`  ✅ ${city} → ${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}${locInfo}`);
      } else {
        failed++;
      }

      await new Promise((r) => setTimeout(r, NOMINATIM_DELAY_MS));
    } catch (e) {
      failed++;
      console.warn(`  ❌ ${p.id}:`, e);
    }
  }

  console.log(`\nSpracované: ${rows.length} | Geocoded: ${geocoded} | Failed: ${failed}`);
  if (dryRun && geocoded > 0) console.log("Spusti bez --dry-run pre zápis do DB.");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
