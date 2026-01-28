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
}

const SYSTEM = `Si elitný realitný investor. Tvojou úlohou je vybrať z balastu v popise inzerátu iba fakty. Ignoruj marketingové reči o slnečných bytoch a duši. Odpovedaj výhradne v JSON formáte s týmito kľúčmi:
- constructionType: (Tehla / Panel / Skelet / Neuvedené)
- ownership: (Osobné / Družstevné / Štátne)
- technicalCondition: (Max 10 slov o stave: napr. "Pôvodný stav, nové okná, rozvody pôvodné")
- redFlags: (Varovania: exekúcia, ťarcha, podiel na pozemku, bez výťahu na vysokom poschodí, drahý správca. Ak nie sú, null)
- cleanAddress: (Mesto, Mestská časť, Ulica, Číslo domu - ak sú v texte. Žiadne "balkóny"!)
- investmentSummary: (Jedna veta: prečo je/nie je tento byt dobrý na investíciu)
Ak informácia v texte nie je, vráť null. Žiadny úvod ani markdown – iba platný JSON objekt.`;

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

    return {
      constructionType: str(parsed.constructionType),
      ownership: str(parsed.ownership),
      technicalCondition: str(parsed.technicalCondition),
      redFlags: str(parsed.redFlags),
      cleanAddress: str(parsed.cleanAddress),
      investmentSummary: str(parsed.investmentSummary),
    };
  } catch (e) {
    console.warn("[listing-analyst] AI error:", e);
    return null;
  }
}
