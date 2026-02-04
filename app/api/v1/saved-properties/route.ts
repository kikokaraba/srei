import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getLimit } from "@/lib/access-control";
import { UserRole } from "@/generated/prisma/client";

// GET - Získanie uložených nehnuteľností používateľa
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const savedProperties = await prisma.savedProperty.findMany({
      where: { userId: session.user.id },
      include: {
        property: true, // Simplified - investmentMetrics and priceHistory may not exist
      },
      orderBy: { savedAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      data: savedProperties,
      count: savedProperties.length,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    const code = typeof (error as { code?: string })?.code === "string" ? (error as { code: string }).code : undefined;
    console.error("Error fetching saved properties:", msg, code ?? "", error);
    return NextResponse.json(
      { success: false, error: "Internal server error", code: code ?? undefined },
      { status: 500 }
    );
  }
}

// POST - Uloženie nehnuteľnosti
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { propertyId, notes, isFavorite, alertOnChange } = body;

    if (!propertyId) {
      return NextResponse.json(
        { success: false, error: "Property ID is required" },
        { status: 400 }
      );
    }

    // Kontrola limitu pre FREE používateľov
    const userRole = session.user.role as UserRole;
    const maxSaved = getLimit(userRole, "maxSavedProperties");
    
    // Spočítaj aktuálny počet uložených
    const currentCount = await prisma.savedProperty.count({
      where: { userId: session.user.id },
    });
    
    // Skontroluj či už existuje (update vs create)
    const existingSaved = await prisma.savedProperty.findUnique({
      where: {
        userId_propertyId: {
          userId: session.user.id,
          propertyId,
        },
      },
    });
    
    // Ak vytvára novú a je na limite
    if (!existingSaved && currentCount >= maxSaved) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Dosiahli ste limit uložených nehnuteľností",
          limitReached: true,
          currentCount,
          maxAllowed: maxSaved,
          upgradeRequired: userRole === "FREE_USER",
        },
        { status: 403 }
      );
    }

    // Skontroluj, či nehnuteľnosť existuje
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
    });

    if (!property) {
      return NextResponse.json(
        { success: false, error: "Property not found" },
        { status: 404 }
      );
    }

    // Upsert - vytvor alebo aktualizuj
    const savedProperty = await prisma.savedProperty.upsert({
      where: {
        userId_propertyId: {
          userId: session.user.id,
          propertyId,
        },
      },
      update: {
        notes: notes ?? undefined,
        isFavorite: isFavorite ?? undefined,
        alertOnChange: alertOnChange ?? undefined,
      },
      create: {
        userId: session.user.id,
        propertyId,
        notes: notes || null,
        isFavorite: isFavorite || false,
        alertOnChange: alertOnChange !== false,
      },
      include: {
        property: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: savedProperty,
    });
  } catch (error) {
    console.error("Error saving property:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE - Odstránenie uloženej nehnuteľnosti
export async function DELETE(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get("propertyId");

    if (!propertyId) {
      return NextResponse.json(
        { success: false, error: "Property ID is required" },
        { status: 400 }
      );
    }

    await prisma.savedProperty.delete({
      where: {
        userId_propertyId: {
          userId: session.user.id,
          propertyId,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Property removed from saved list",
    });
  } catch (error) {
    console.error("Error removing saved property:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
