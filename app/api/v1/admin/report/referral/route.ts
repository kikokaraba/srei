/**
 * Vytvorenie referral kódu pre partnera. Admin-only.
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function slug(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-|-$/g, "")
    .toUpperCase()
    .slice(0, 24) || "PARTNER";
}

function randomAlphaNum(len: number): string {
  const a = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let r = "";
  for (let i = 0; i < len; i++) r += a[Math.floor(Math.random() * a.length)];
  return r;
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });
    if (user?.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const partnerName = typeof body.partnerName === "string" && body.partnerName.trim()
      ? body.partnerName.trim()
      : "Partner";
    const commissionPct = typeof body.commissionPct === "number"
      ? Math.max(0, Math.min(100, body.commissionPct))
      : 10;

    const base = slug(partnerName);
    let code = `SRIA-${base}-${randomAlphaNum(6)}`;
    let exists = await prisma.referralCode.findUnique({ where: { code } });
    let attempts = 0;
    while (exists && attempts < 5) {
      code = `SRIA-${base}-${randomAlphaNum(6)}`;
      exists = await prisma.referralCode.findUnique({ where: { code } });
      attempts++;
    }
    if (exists) {
      return NextResponse.json({ success: false, error: "Nepodarilo sa vygenerovať unikátny kód." }, { status: 409 });
    }

    await prisma.referralCode.create({
      data: { code, partnerName, commissionPct },
    });

    return NextResponse.json({
      success: true,
      data: { code, partnerName, commissionPct },
    });
  } catch (e) {
    console.error("[admin/referral]", e);
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}
