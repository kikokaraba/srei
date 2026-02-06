/**
 * POST /api/v1/properties/[id]/refresh-from-source
 * Znovu načíta dáta z pôvodného inzerátu (detail stránka) a aktualizuje Property.
 * Použitie: oprava zle prečítaných údajov zo listingu (cena, m², titulok).
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { scrapeSingleListing } from "@/lib/scraper/single-listing-scraper";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const property = await prisma.property.findUnique({
      where: { id },
      select: { id: true, source_url: true, price: true, title: true },
    });

    if (!property) {
      return NextResponse.json({ error: "Nehnuteľnosť neexistuje" }, { status: 404 });
    }

    if (!property.source_url?.trim()) {
      return NextResponse.json(
        { error: "Nehnuteľnosť nemá odkaz na pôvodný inzerát" },
        { status: 400 }
      );
    }

    const { property: scraped, error: scrapeError } = await scrapeSingleListing(
      property.source_url
    );

    if (!scraped) {
      return NextResponse.json(
        { error: scrapeError ?? "Nepodarilo sa načítať pôvodný inzerát" },
        { status: 400 }
      );
    }

    const priceChanged = property.price !== scraped.price;

    await prisma.$transaction([
      prisma.property.update({
        where: { id: property.id },
        data: {
          title: scraped.title?.substring(0, 200) ?? undefined,
          price: scraped.price,
          price_per_m2: scraped.pricePerM2,
          area_m2: scraped.areaM2,
          rooms: scraped.rooms ?? undefined,
          district: scraped.district || undefined,
          address: scraped.district
            ? `${scraped.city}, ${scraped.district}`
            : scraped.city,
          description: scraped.description?.substring(0, 5000) || undefined,
          updatedAt: new Date(),
        },
      }),
      ...(priceChanged
        ? [
            prisma.priceHistory.create({
              data: {
                propertyId: property.id,
                price: scraped.price,
                price_per_m2: scraped.pricePerM2,
              },
            }),
          ]
        : []),
    ]);

    return NextResponse.json({
      success: true,
      message: "Dáta boli obnovené z pôvodného inzerátu",
      data: {
        price: scraped.price,
        area_m2: scraped.areaM2,
        price_per_m2: scraped.pricePerM2,
        title: scraped.title?.substring(0, 80),
      },
    });
  } catch (error) {
    console.error("Refresh from source error:", error);
    return NextResponse.json(
      { error: "Chyba pri obnovení dát" },
      { status: 500 }
    );
  }
}
