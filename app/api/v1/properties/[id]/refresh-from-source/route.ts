/**
 * POST /api/v1/properties/[id]/refresh-from-source
 * Obnovenie dát z pôvodného portálu.
 *
 * Refresh je realizovaný cez batch-refresh cron (kontrola aktivity, ceny)
 * alebo cez ďalší beh Apify. Priame načítanie jedného inzerátu nie je k dispozícii.
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
      select: { id: true, source_url: true, title: true },
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

    return NextResponse.json({
      success: false,
      message:
        "Obnovenie z pôvodného inzerátu je nahradené Apify a batch-refresh. Nehnuteľnosť sa aktualizuje pri ďalšom behu Apify alebo batch-refresh.",
      code: "APIFY_ONLY",
    });
  } catch (error) {
    console.error("Refresh from source error:", error);
    return NextResponse.json(
      { error: "Chyba pri obnovení dát" },
      { status: 500 }
    );
  }
}
