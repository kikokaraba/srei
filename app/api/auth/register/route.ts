import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";
import { z } from "zod";

const registerSchema = z.object({
  name: z.string().min(2, "Meno musí mať aspoň 2 znaky"),
  email: z.string().email("Neplatný email"),
  password: z.string().min(8, "Heslo musí mať aspoň 8 znakov"),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validácia
    const validated = registerSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: validated.error.issues[0]?.message || "Neplatné údaje" 
        },
        { status: 400 }
      );
    }

    const { name, email, password } = validated.data;

    // Skontroluj či email už existuje
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: "Účet s týmto emailom už existuje" },
        { status: 400 }
      );
    }

    // Hashuj heslo
    const hashedPassword = await hash(password, 12);

    // Vytvor používateľa s rolou FREE_USER
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: "FREE_USER",
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    // Vytvor základné preferencie pre nového používateľa
    await prisma.userPreferences.create({
      data: {
        userId: user.id,
        onboardingCompleted: false,
        trackedRegions: JSON.stringify([]),
        trackedCities: JSON.stringify([]),
        trackedDistricts: JSON.stringify([]),
        trackedStreets: JSON.stringify([]),
        propertyTypes: JSON.stringify(["apartment"]),
        condition: JSON.stringify([]),
        energyCertificates: JSON.stringify([]),
        infrastructureTypes: JSON.stringify([]),
        ownershipTypes: JSON.stringify(["individual"]),
        savedFilters: JSON.stringify([]),
      },
    });

    console.log("New user registered:", user.email, user.id);

    return NextResponse.json({
      success: true,
      message: "Účet bol úspešne vytvorený",
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { success: false, error: "Nastala chyba pri registrácii" },
      { status: 500 }
    );
  }
}
