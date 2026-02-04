/**
 * Track by URL - Pridanie nehnuteľnosti na sledovanie podľa linku inzerátu
 * POST /api/v1/track-by-url
 * Body: { url: string }
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getLimit } from "@/lib/access-control";
import type { UserRole } from "@/generated/prisma/client";
import { scrapeSingleListing } from "@/lib/scraper/single-listing-scraper";
import { ingestProperties } from "@/lib/scraper/ingestion-pipeline";
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

    const { url } = parseResult.data;

    // Kontrola limitu uložených
    const userRole = (session.user.role ?? "FREE_USER") as UserRole;
    const maxSaved = getLimit(userRole, "maxSavedProperties");
    const currentCount = await prisma.savedProperty.count({
      where: { userId: session.user.id },
    });
    if (currentCount >= maxSaved) {
      return NextResponse.json(
        {
          success: false,
          error: "Dosiahli ste limit sledovaných nehnuteľností",
          limitReached: true,
          currentCount,
          maxAllowed: maxSaved,
        },
        { status: 403 }
      );
    }

    // 1. Scrape inzerát
    const { property: scrapedProp, error: scrapeError } =
      await scrapeSingleListing(url);

    if (!scrapedProp) {
      return NextResponse.json(
        {
          success: false,
          error: scrapeError ?? "Nepodarilo sa načítať inzerát",
        },
        { status: 400 }
      );
    }

    // 2. Ingest do databázy (vytvor/aktualizuj Property)
    const { stats } = await ingestProperties([scrapedProp], "TRACK_BY_URL", {
      batchSize: 1,
    });

    const savedCount = stats.savedNew + stats.savedUpdated + stats.savedRelisted;
    const hasProperty = savedCount > 0 || stats.skippedDuplicate > 0;
    if (!hasProperty && stats.errors.length > 0) {
      const firstError = stats.errors[0];
      return NextResponse.json(
        {
          success: false,
          error:
            firstError?.message ??
            "Inzerát sa nepodarilo spracovať (validácia alebo duplicita)",
        },
        { status: 400 }
      );
    }

    // 3. Nájdi Property (podľa source_url alebo external_id)
    const property = await prisma.property.findFirst({
      where: {
        OR: [
          { source_url: scrapedProp.sourceUrl },
          {
            external_id: scrapedProp.externalId,
            source: scrapedProp.source,
          },
        ],
      },
      include: {
        priceHistory: { orderBy: { recorded_at: "desc" }, take: 5 },
      },
    });

    if (!property) {
      return NextResponse.json(
        { success: false, error: "Nehnuteľnosť sa nenašla po uložení" },
        { status: 500 }
      );
    }

    // 4. Pridaj do SavedProperty (trackovanie)
    const existingSaved = await prisma.savedProperty.findUnique({
      where: {
        userId_propertyId: {
          userId: session.user.id,
          propertyId: property.id,
        },
      },
    });

    if (!existingSaved) {
      await prisma.savedProperty.create({
        data: {
          userId: session.user.id,
          propertyId: property.id,
          alertOnChange: true,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        property: {
          id: property.id,
          slug: property.slug,
          title: property.title,
          price: property.price,
          area_m2: property.area_m2,
          city: property.city,
          district: property.district,
          source_url: property.source_url,
          source: property.source,
        },
        message: existingSaved
          ? "Nehnuteľnosť už sledujete"
          : "Nehnuteľnosť bola pridaná na sledovanie",
      },
    });
  } catch (error) {
    console.error("Track by URL error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Interná chyba servera",
      },
      { status: 500 }
    );
  }
}
