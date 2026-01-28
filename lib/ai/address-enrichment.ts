/**
 * AI Address Enrichment – extrakcia adresy z raw textu (lokalita, popis)
 * Používa Anthropic Claude. Dopĺňa geocoding (Nominatim) na overenie.
 */

import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface EnrichedAddress {
  city: string;
  district: string | null;
  street: string | null;
  streetNumber: string | null;
}

const SYSTEM = `Si expert na slovenské adresy. Z daného textu vyber IBA skutočnú adresu (mesto, mestská časť/okres, ulica, číslo).
Pravidlá:
- Iba Slovensko. Mesto, ulica a číslo musia byť z textu alebo jednoznačne vyplývať.
- Ak je v texte len „balkón“, „obývačka“, „garáž“, „terasa“, „pivnica“, „loggia“ a podobné – NIE JE to adresa. Vráť null.
- Nevymýšľaj. Ak si nejsi istý, vráť null.
- Odpoveď iba platný JSON bez markdown. Formát:
  {"city":"Bratislava","district":"Ružinov","street":"Ružinovská","streetNumber":"12"}
  alebo {"city":null,"district":null,"street":null,"streetNumber":null} ak adresa nie je zistená.`;

/**
 * Extrahuje mestom, štvrťou, ulicou a číslom z raw_address_context.
 * Vráti null, ak AI nevie alebo text neobsahuje reálnu adresu.
 */
export async function enrichAddressWithAI(
  rawAddressContext: string
): Promise<EnrichedAddress | null> {
  if (!rawAddressContext || !rawAddressContext.trim()) return null;
  if (!process.env.ANTHROPIC_API_KEY) return null;

  try {
    const res = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 256,
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: `Text z inzerátu:\n\n${rawAddressContext.trim().slice(0, 800)}`,
        },
      ],
    });

    const text =
      res.content[0].type === "text" ? res.content[0].text.trim() : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]) as {
      city?: string | null;
      district?: string | null;
      street?: string | null;
      streetNumber?: string | null;
    };

    if (!parsed.city || typeof parsed.city !== "string") return null;

    return {
      city: String(parsed.city).trim(),
      district:
        parsed.district != null && String(parsed.district).trim()
          ? String(parsed.district).trim()
          : null,
      street:
        parsed.street != null && String(parsed.street).trim()
          ? String(parsed.street).trim()
          : null,
      streetNumber:
        parsed.streetNumber != null && String(parsed.streetNumber).trim()
          ? String(parsed.streetNumber).trim()
          : null,
    };
  } catch (e) {
    console.warn("[address-enrichment] AI error:", e);
    return null;
  }
}

/**
 * Overí adresu cez Nominatim (Slovensko). Vráti true, ak existuje.
 */
export async function verifyAddressWithGeocoding(
  addr: EnrichedAddress
): Promise<boolean> {
  try {
    const parts: string[] = [];
    if (addr.streetNumber && addr.street) parts.push(`${addr.street} ${addr.streetNumber}`);
    else if (addr.street) parts.push(addr.street);
    if (addr.district) parts.push(addr.district);
    parts.push(addr.city);
    const q = parts.join(", ") + ", Slovensko";

    const url = `https://nominatim.openstreetmap.org/search?${new URLSearchParams({
      q: q,
      format: "json",
      limit: "1",
      countrycodes: "sk",
    })}`;

    const r = await fetch(url, {
      headers: {
        "User-Agent": "SRIA-RealEstateApp/1.0",
        Accept: "application/json",
      },
    });
    if (!r.ok) return false;
    const data = await r.json();
    return Array.isArray(data) && data.length > 0;
  } catch {
    return false;
  }
}
