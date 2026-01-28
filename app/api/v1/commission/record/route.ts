/**
 * Manuálne záznam provízie (admin).
 * Pri Stripe invoice.paid volať recordCommission(userId, amountEur).
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordCommission } from "@/lib/commission/engine";

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
    const userId = typeof body.userId === "string" ? body.userId.trim() : null;
    const amountEur = typeof body.amountEur === "number" ? body.amountEur : null;

    if (!userId || amountEur == null || amountEur <= 0) {
      return NextResponse.json(
        { success: false, error: "userId (string) and amountEur (positive number) required" },
        { status: 400 }
      );
    }

    await recordCommission(userId, amountEur);

    return NextResponse.json({ success: true, message: "Commission recorded" });
  } catch (e) {
    console.error("[commission/record]", e);
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}
