import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { randomBytes } from "crypto";
import { sendPasswordResetEmail } from "@/lib/email";

const schema = z.object({
  email: z.string().email("Neplatný email"),
});

const RESET_EXPIRY_MS = 60 * 60 * 1000; // 1 hodina

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message ?? "Neplatné údaje" },
        { status: 400 }
      );
    }

    const { email } = parsed.data;

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      select: { id: true, email: true, password: true },
    });

    // Vždy vráť rovnakú odpoveď (bez úniku informácie, či email existuje)
    const genericMessage =
      "Ak existuje účet s týmto emailom, poslali sme naň odkaz na obnovenie hesla.";

    if (!user) {
      return NextResponse.json({ success: true, message: genericMessage });
    }

    if (!user.password) {
      return NextResponse.json({ success: true, message: genericMessage });
    }

    const token = randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + RESET_EXPIRY_MS);

    await prisma.verificationToken.deleteMany({
      where: { identifier: user.id },
    });
    await prisma.verificationToken.create({
      data: { identifier: user.id, token, expires },
    });

    const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const resetUrl = `${baseUrl.replace(/\/$/, "")}/auth/reset-password?token=${token}`;

    const sent = await sendPasswordResetEmail(user.email, resetUrl);

    if (!sent && process.env.NODE_ENV === "development") {
      console.log("[Forgot password] SMTP not configured. Reset link:", resetUrl);
    }

    return NextResponse.json({ success: true, message: genericMessage });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { success: false, error: "Nastala chyba. Skúste to znova neskôr." },
      { status: 500 }
    );
  }
}
