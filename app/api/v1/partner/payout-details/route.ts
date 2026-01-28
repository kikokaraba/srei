/**
 * Výplatné údaje (IBAN) pre partnera. Len PARTNER.
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const u = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, iban: true },
    });
    if (!u || u.role !== "PARTNER") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ success: true, data: { iban: u.iban ?? null } });
  } catch (e) {
    console.error("[partner/payout-details GET]", e);
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const u = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, role: true },
    });
    if (!u || u.role !== "PARTNER") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const update: { iban?: string | null; partnerRef?: string | null } = {};

    if ("iban" in body) {
      const v = typeof body.iban === "string" ? body.iban.trim().replace(/\s/g, "") : "";
      update.iban = v || null;
    }
    if ("partnerRef" in body) {
      const v = typeof body.partnerRef === "string" ? body.partnerRef.trim() : "";
      if (!v) {
        update.partnerRef = null;
      } else {
        const raw = v.replace(/[^a-zA-Z0-9-_]/g, "");
        if (raw.length >= 2 && raw.length <= 32) {
          const existing = await prisma.user.findFirst({
            where: { partnerRef: raw, id: { not: u.id } },
            select: { id: true },
          });
          if (existing) {
            return NextResponse.json(
              { success: false, error: "Tento ref kód už používa niekto iný." },
              { status: 400 }
            );
          }
          update.partnerRef = raw;
        }
      }
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ success: true, data: {} });
    }

    const updated = await prisma.user.update({
      where: { id: u.id },
      data: update,
      select: { iban: true, partnerRef: true },
    });

    return NextResponse.json({
      success: true,
      data: { iban: updated.iban ?? null, partnerRef: updated.partnerRef ?? null },
    });
  } catch (e) {
    console.error("[partner/payout-details PATCH]", e);
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}
