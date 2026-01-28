/**
 * Global Credit Blast – pridá kredity všetkým registrovaným používateľom.
 * Admin-only. Pre promo akcie.
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
    const credits = typeof body.credits === "number" ? Math.max(1, Math.min(100, Math.round(body.credits))) : 5;

    const r = await prisma.$executeRawUnsafe(
      `UPDATE "User" SET "aiCredits" = "aiCredits" + $1`,
      credits
    );

    const count = await prisma.user.count();

    return NextResponse.json({
      success: true,
      data: { added: credits, usersAffected: count, message: `Pridané ${credits} kreditov pre ${count} používateľov.` },
    });
  } catch (e) {
    console.error("[admin/credit-blast]", e);
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}
