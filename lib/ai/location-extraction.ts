/**
 * AI Location Extraction – extrakcia mesta/obce z celého textu inzerátu
 * Prečítava titulok, popis, adresu. Využíva PSČ (5 číslic) pri určení lokality.
 * Používa Anthropic Claude.
 */

import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface ExtractedLocation {
  city: string;
  district: string | null;
}

const SYSTEM = `Si expert na slovenské lokality. Z celého textu inzerátu vyber MESTO alebo OBEC (lokalitu) kde sa nehnuteľnosť nachádza.

Pravidlá:
- IBA Slovensko. Mesto/obec musí byť z textu alebo jednoznačne odvodiť.
- PSČ (poštové smerovacie číslo): slovenské PSČ má 5 číslic (XXX XX alebo XXXXX). Použi znalosť slovenských PSČ na určenie mesta – napr. 811 xx = Bratislava, 040 xx = Košice, 010 xx = Žilina, 080 xx = Prešov, 974 xx = Banská Bystrica, 949 xx = Nitra, 917 xx = Trnava, 911 xx = Trenčín, atď.
- Hľadaj explicitné zmienky: „Bratislava - Ružinov“, „obec Podhájska“, „mesto Levice“, „okres Pezinok“, „Košice – Staré Mesto“.
- District = mestská časť (Ružinov, Petržalka), okres (Pezinok, Senec) alebo obec ak je to dedina.
- Ak je v texte len „balkón“, „terasa“, „garáž“ a žiadna lokalita – vráť null.
- Nevymýšľaj. Ak si nejsi istý, vráť null.
- Odpoveď IBA platný JSON bez markdown:
  {"city":"Bratislava","district":"Ružinov"}
  alebo {"city":"Podhájska","district":null} pre obec
  alebo {"city":null,"district":null} ak lokalita nie je zistená.`;

const MAX_INPUT_CHARS = 2500;

/**
 * Extrahuje mesto/obec a okres z celého kontextu inzerátu.
 * Využíva PSČ, explicitné zmienky lokality a AI analýzu.
 * Vráti null ak AI nevie alebo text neobsahuje lokalitu.
 */
export async function extractLocationWithAI(context: {
  title: string;
  description?: string | null;
  address?: string | null;
  locationText?: string | null;
}): Promise<ExtractedLocation | null> {
  const parts: string[] = [];
  if (context.title?.trim()) parts.push(`Titulok: ${context.title.trim()}`);
  if (context.locationText?.trim()) parts.push(`Lokalita: ${context.locationText.trim()}`);
  if (context.address?.trim()) parts.push(`Adresa: ${context.address.trim()}`);
  if (context.description?.trim()) parts.push(`Popis: ${context.description.trim()}`);

  const fullText = parts.join("\n\n");
  if (!fullText.trim()) return null;
  if (!process.env.ANTHROPIC_API_KEY) return null;

  try {
    const truncated = fullText.trim().slice(0, MAX_INPUT_CHARS);

    const res = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 128,
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: `Text z inzerátu nehnuteľnosti:\n\n${truncated}`,
        },
      ],
    });

    const text = res.content[0].type === "text" ? res.content[0].text.trim() : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]) as {
      city?: string | null;
      district?: string | null;
    };

    if (!parsed.city || typeof parsed.city !== "string") return null;

    const city = String(parsed.city).trim();
    if (!city) return null;

    const district =
      parsed.district != null && String(parsed.district).trim()
        ? String(parsed.district).trim()
        : null;

    return { city, district };
  } catch (e) {
    console.warn("[location-extraction] AI error:", e);
    return null;
  }
}
