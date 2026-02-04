import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";
import { z } from "zod";

const schema = z.object({
  token: z.string().min(1, "Chýba token"),
  password: z.string().min(8, "Heslo musí mať aspoň 8 znakov"),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: parsed.error.issues[0]?.message ?? "Neplatné údaje",
        },
        { status: 400 }
      );
    }

    const { token, password } = parsed.data;

    const verification = await prisma.verificationToken.findUnique({
      where: { token },
    });

    if (!verification || verification.expires < new Date()) {
      return NextResponse.json(
        {
          success: false,
          error: "Odkaz na obnovenie hesla vypršal alebo je neplatný. Požiadajte o nový.",
        },
        { status: 400 }
      );
    }

    const userId = verification.identifier;

    const hashedPassword = await hash(password, 12);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { password: hashedPassword },
      }),
      prisma.verificationToken.delete({ where: { token } }),
    ]);

    return NextResponse.json({
      success: true,
      message: "Heslo bolo zmenené. Môžete sa prihlásiť.",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Nastala chyba pri zmene hesla. Skúste to znova neskôr.",
      },
      { status: 500 }
    );
  }
}
