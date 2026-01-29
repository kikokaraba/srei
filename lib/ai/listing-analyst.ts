/**
 * AI Realitný Analytik – brutálna extrakcia faktov z popisu inzerátu
 * Claude 3.5 Sonnet. Ignoruje marketing, vracia len fakty v JSON.
 */

import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface ListingAnalysis {
  constructionType: string | null;
  ownership: string | null;
  technicalCondition: string | null;
  redFlags: string | null;
  cleanAddress: string | null;
  investmentSummary: string | null;
  phone: string | null;
  contactName: string | null;
  top3Facts: string[] | null;
}

const SYSTEM = `Si elitný realitný investor. Vyber z popisu inzerátu iba fakty. Ignoruj marketing. Odpovedaj výhradne v JSON s týmito kľúčmi:
- constructionType: (Tehla / Panel / Skelet / Neuvedené)
- ownership: (Osobné / Družstevné / Štátne)
- technicalCondition: (Max 10 slov o stave)
- redFlags: (exekúcia, ťarcha, podiel, bez výťahu, drahý správca; ak nie, null)
- cleanAddress: (Mesto, Mestská časť, Ulica, Číslo – LEN ak sú v texte. ZÁKAZ HALUCINÁCIÍ: ak si nevieš ulicu/číslo, vráť null; nikdy "balkón", "terasa" alebo podobné.)
- investmentSummary: (Jedna veta: prečo je/nie je dobrý na investíciu)
- phone: (telefónne číslo ak je v popise, inak null)
- contactName: (meno makléra/majiteľa ak je v texte, inak null)
- top3Facts: (pole max 3 reťazcov, napr. ["Tehla", "Osobné vlastníctvo", "Parkovanie v cene"])

PRAVIDLÁ: Ak niečo v texte nie je, vráť null. NIKDY si nevymýšľaj cenu. Nepoužívaj ceny z hypoték, odhadov ani príkladov. V investmentSummary neuvádzaj konkrétne sumy v €, pokiaľ nie sú v popise explicitne ako kúpna cena. Iba platný JSON, žiadny markdown.`;

/**
 * Analyzuje popis a surovú lokalitu, vracia extrahované fakty.
 * Pri zlyhaní AI vráti null – volajúci uloží inzerát v základnom formáte.
 */
export async function analyzeListing(
  description: string,
  rawLocation: string
): Promise<ListingAnalysis | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;

  const text = [rawLocation.trim(), description.trim()].filter(Boolean).join("\n\n");
  if (!text) return null;

  try {
    const res = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 512,
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: `Popis a lokalita inzerátu:\n\n${text.slice(0, 6000)}`,
        },
      ],
    });

    const raw =
      res.content[0].type === "text" ? res.content[0].text.trim() : "";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
    const str = (v: unknown) =>
      v != null && typeof v === "string" && v.trim() ? v.trim() : null;
    const arr = (v: unknown): string[] | null => {
      if (!Array.isArray(v)) return null;
      const out = v.filter((x): x is string => typeof x === "string" && !!x.trim()).map((x) => x.trim());
      return out.length ? out.slice(0, 3) : null;
    };

    return {
      constructionType: str(parsed.constructionType),
      ownership: str(parsed.ownership),
      technicalCondition: str(parsed.technicalCondition),
      redFlags: str(parsed.redFlags),
      cleanAddress: str(parsed.cleanAddress),
      investmentSummary: str(parsed.investmentSummary),
      phone: str(parsed.phone),
      contactName: str(parsed.contactName),
      top3Facts: arr(parsed.top3Facts),
    };
  } catch (e) {
    console.warn("[listing-analyst] AI error:", e);
    return null;
  }
}
