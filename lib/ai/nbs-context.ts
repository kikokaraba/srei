/**
 * NBS kontext pre AI prompty
 * Formátuje NBS dáta pre valuation, market-trends, chat
 */

import { fetchNBSPropertyPrices, getHistoricalPriceData } from "@/lib/data-sources/nbs";

export async function getNBSContextForPrompt(): Promise<string> {
  try {
    const result = await fetchNBSPropertyPrices();
    const data = result.success && result.data && result.data.length > 0
      ? result.data
      : getHistoricalPriceData();

    if (!data || data.length === 0) {
      return "";
    }

    const byRegion = new Map<string, { apartment?: number; house?: number; changeYoY?: number }>();
    for (const d of data) {
      const existing = byRegion.get(d.region) || {};
      if (d.propertyType === "APARTMENT") {
        existing.apartment = d.pricePerSqm;
        existing.changeYoY = d.changeYoY;
      } else if (d.propertyType === "HOUSE") {
        existing.house = d.pricePerSqm;
      }
      byRegion.set(d.region, existing);
    }

    const lines: string[] = ["\nNBS ÚDAJE (štvrťročné ceny nehnuteľností):"];
    for (const [region, v] of byRegion) {
      const apt = v.apartment != null ? `Byty €${v.apartment}/m²` : "";
      const house = v.house != null ? `Domy €${v.house}/m²` : "";
      const yoY = v.changeYoY != null ? ` (YoY ${v.changeYoY > 0 ? "+" : ""}${v.changeYoY}%)` : "";
      if (apt || house) {
        lines.push(`- ${region}: ${[apt, house].filter(Boolean).join(", ")}${yoY}`);
      }
    }

    return lines.join("\n");
  } catch {
    return "";
  }
}
