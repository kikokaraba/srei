/**
 * Track by URL – Pridanie nehnuteľnosti na sledovanie podľa linku
 * POST /api/v1/track-by-url
 * Body: { url: string }
 *
 * Dáta sa načítavajú výhradne cez Apify. Pre manuálne pridanie inzerátu
 * spustite Apify scraping v Admin → Data alebo cron /api/cron/scrape-slovakia.
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";

const requestSchema = z.object({
  url: z.string().url("Neplatná URL").max(500),
});

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Pre sledovanie musíte byť prihlásený" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const parseResult = requestSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: parseResult.error.issues.map((i) => i.message).join(", "),
        },
        { status: 400 }
      );
    }

    // Scraping je výhradne cez Apify – priame pridanie podľa URL nie je k dispozícii.
    return NextResponse.json(
      {
        success: false,
        error:
          "Pridávanie inzerátov podľa URL je dočasne nedostupné. Dáta sa načítavajú cez Apify. Spustite scraping v Admin → Data alebo počkajte na pravidelné načítanie.",
        code: "APIFY_ONLY",
      },
      { status: 503 }
    );
  } catch (error) {
    console.error("Track by URL error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Interná chyba servera",
      },
      { status: 500 }
    );
  }
}
