import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST - Pridať transakciu
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    // Verify ownership
    const property = await prisma.portfolioProperty.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!property) {
      return NextResponse.json({ success: false, error: "Property not found" }, { status: 404 });
    }

    // Determine if amount should be positive or negative
    const incomeTypes = ["RENT_INCOME", "SALE", "OTHER_INCOME"];
    const isIncome = incomeTypes.includes(body.type);
    const amount = isIncome ? Math.abs(body.amount) : -Math.abs(body.amount);

    const transaction = await prisma.portfolioTransaction.create({
      data: {
        portfolioPropertyId: id,
        type: body.type,
        amount,
        date: new Date(body.date),
        description: body.description,
        category: body.category,
        isRecurring: body.isRecurring || false,
        recurringFrequency: body.recurringFrequency,
      },
    });

    return NextResponse.json({ success: true, data: transaction });
  } catch (error) {
    console.error("Error creating transaction:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

// DELETE - Vymazať transakciu
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const transactionId = searchParams.get("transactionId");

    if (!transactionId) {
      return NextResponse.json({ success: false, error: "Transaction ID required" }, { status: 400 });
    }

    // Verify ownership
    const property = await prisma.portfolioProperty.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!property) {
      return NextResponse.json({ success: false, error: "Property not found" }, { status: 404 });
    }

    await prisma.portfolioTransaction.delete({
      where: { id: transactionId },
    });

    return NextResponse.json({ success: true, message: "Transaction deleted" });
  } catch (error) {
    console.error("Error deleting transaction:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
