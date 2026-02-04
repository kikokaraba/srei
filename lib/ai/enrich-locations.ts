/**
 * Enrichment lokality – priradenie mesta/obce inzerátom s neurčitou lokalitou
 * Najprv PSČ (bez API), potom AI.
 */

import { prisma } from "@/lib/prisma";
import { extractLocationWithAI } from "@/lib/ai/location-extraction";
import { getCityFromPsc } from "@/lib/scraper/psc-map";

export interface EnrichLocationsResult {
  total: number;
  enriched: number;
  byPsc: number;
  byAi: number;
  failed: number;
}

export async function enrichLocations(options: {
  limit?: number;
  dryRun?: boolean;
} = {}): Promise<EnrichLocationsResult> {
  const limit = options.limit ?? 500;
  const dryRun = options.dryRun ?? false;
  const useAi = !!process.env.ANTHROPIC_API_KEY;

  const rows = await prisma.property.findMany({
    where: {
      status: "ACTIVE",
      OR: [
        { city: { equals: "Slovensko", mode: "insensitive" } },
        { city: { equals: "Neznáme", mode: "insensitive" } },
        { city: { equals: "Unknown", mode: "insensitive" } },
        { city: "" },
      ],
    },
    select: {
      id: true,
      title: true,
      description: true,
      address: true,
      district: true,
    },
    take: limit,
  });

  let enriched = 0;
  let byPsc = 0;
  let byAi = 0;
  let failed = 0;

  for (const p of rows) {
    try {
      const fullText = [p.title, p.description, p.address, p.district]
        .filter(Boolean)
        .join(" ");

      let city: string | null = null;
      let district: string | null = null;

      const pscCity = getCityFromPsc(fullText);
      if (pscCity) {
        city = pscCity;
        district = pscCity;
        byPsc++;
      }

      if (!city && useAi) {
        const loc = await extractLocationWithAI({
          title: p.title ?? "",
          description: p.description ?? undefined,
          address: p.address ?? undefined,
          locationText: p.district ?? undefined,
        });
        if (loc?.city) {
          city = loc.city;
          district = loc.district ?? loc.city;
          byAi++;
        }
        await new Promise((r) => setTimeout(r, 300));
      }

      if (city) {
        if (!dryRun) {
          await prisma.property.update({
            where: { id: p.id },
            data: {
              city,
              district: district ?? city,
            },
          });
        }
        enriched++;
      } else {
        failed++;
      }
    } catch {
      failed++;
    }
  }

  return {
    total: rows.length,
    enriched,
    byPsc,
    byAi,
    failed,
  };
}
