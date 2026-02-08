/**
 * Vymaže duplicitné/chybné dáta kde všetky majú rovnakú cenu
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // Nájdi ceny, ktoré sa opakujú viac ako 5x
    const duplicatePrices = await prisma.property.groupBy({
      by: ["price"],
      _count: true,
      having: {
        price: {
          _count: {
            gt: 5,
          },
        },
      },
    });

    let totalDeleted = 0;
    const deletedByPrice: { price: number; count: number }[] = [];

    for (const group of duplicatePrices) {
      // Ak má viac ako 10 nehnuteľností s rovnakou cenou, pravdepodobne sú to chybné dáta
      if (group._count > 10) {
        const deleted = await prisma.property.deleteMany({
          where: {
            price: group.price,
            street: null,
            // Nevymazávaj nehnuteľnosti uložené v portfóliách používateľov (obľúbené)
            savedBy: { none: {} },
          },
        });
        totalDeleted += deleted.count;
        deletedByPrice.push({ price: group.price, count: deleted.count });
      }
    }

    // Štatistiky po vymazaní
    const remaining = await prisma.property.count();
    const uniquePrices = await prisma.property.groupBy({
      by: ["price"],
      _count: true,
    });

    return NextResponse.json({
      success: true,
      action: "cleanup",
      duplicatePricesFound: duplicatePrices.length,
      deleted: deletedByPrice,
      totalDeleted,
      remainingProperties: remaining,
      uniquePricesNow: uniquePrices.length,
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown",
    }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    // Vymaž scraped properties, ale NIKDY tie ktoré má niekto uložené (obľúbené)
    const deleted = await prisma.property.deleteMany({
      where: {
        OR: [{ street: null }, { street: "" }],
        savedBy: { none: {} },
      },
    });

    return NextResponse.json({
      success: true,
      action: "delete_all_scraped",
      deletedCount: deleted.count,
      remainingProperties: await prisma.property.count(),
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown",
    }, { status: 500 });
  }
}

export const runtime = "nodejs";
