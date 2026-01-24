import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET - Detail nehnuteľnosti v portfóliu
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const property = await prisma.portfolioProperty.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
      include: {
        transactions: {
          orderBy: { date: "desc" },
        },
        valuations: {
          orderBy: { valuationDate: "desc" },
        },
      },
    });

    if (!property) {
      return NextResponse.json({ success: false, error: "Property not found" }, { status: 404 });
    }

    // Calculate property-specific metrics
    const totalIncome = property.transactions
      .filter((t) => t.amount > 0)
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpenses = property.transactions
      .filter((t) => t.amount < 0 && t.type !== "PURCHASE")
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const netCashFlow = totalIncome - totalExpenses;

    const appreciation = property.currentValue - property.purchasePrice;
    const appreciationPercent = (appreciation / property.purchasePrice) * 100;

    const totalReturn = appreciation + netCashFlow;
    const totalReturnPercent = ((totalReturn) / (property.purchasePrice + property.purchaseCosts)) * 100;

    // Calculate holding period
    const purchaseDate = new Date(property.purchaseDate);
    const today = property.saleDate ? new Date(property.saleDate) : new Date();
    const holdingDays = Math.floor((today.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24));
    const holdingYears = holdingDays / 365;

    // Annualized return
    const annualizedReturn = holdingYears > 0 ? totalReturnPercent / holdingYears : 0;

    // Cash-on-cash return
    const annualCashFlow = property.isRented && property.monthlyRent
      ? (property.monthlyRent - property.monthlyExpenses - (property.mortgagePayment || 0)) * 12
      : 0;
    const cashOnCash = property.purchasePrice > 0
      ? (annualCashFlow / (property.purchasePrice + property.purchaseCosts)) * 100
      : 0;

    // Equity
    const mortgageRemaining = property.hasMortgage && property.mortgageAmount ? property.mortgageAmount : 0;
    const equity = property.currentValue - mortgageRemaining;

    // Monthly breakdown by type
    const transactionsByType = property.transactions.reduce((acc, t) => {
      if (!acc[t.type]) {
        acc[t.type] = { count: 0, total: 0 };
      }
      acc[t.type].count++;
      acc[t.type].total += t.amount;
      return acc;
    }, {} as Record<string, { count: number; total: number }>);

    return NextResponse.json({
      success: true,
      data: {
        property,
        metrics: {
          totalIncome,
          totalExpenses,
          netCashFlow,
          appreciation,
          appreciationPercent,
          totalReturn,
          totalReturnPercent,
          annualizedReturn,
          cashOnCash,
          equity,
          holdingDays,
          holdingYears,
          transactionsByType,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching portfolio property:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

// PATCH - Aktualizovať nehnuteľnosť
export async function PATCH(
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
    const existing = await prisma.portfolioProperty.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: "Property not found" }, { status: 404 });
    }

    const updateData: any = {};

    // Basic info
    if (body.name !== undefined) updateData.name = body.name;
    if (body.address !== undefined) updateData.address = body.address;
    if (body.city !== undefined) updateData.city = body.city;
    if (body.district !== undefined) updateData.district = body.district;
    if (body.propertyType !== undefined) updateData.propertyType = body.propertyType;
    if (body.area_m2 !== undefined) updateData.area_m2 = body.area_m2;
    if (body.rooms !== undefined) updateData.rooms = body.rooms;
    if (body.floor !== undefined) updateData.floor = body.floor;

    // Current value
    if (body.currentValue !== undefined) {
      updateData.currentValue = body.currentValue;
      updateData.lastValuationDate = new Date();

      // Create valuation record
      await prisma.propertyValuation.create({
        data: {
          portfolioPropertyId: id,
          value: body.currentValue,
          source: "manual",
          valuationDate: new Date(),
        },
      });
    }

    // Mortgage
    if (body.hasMortgage !== undefined) updateData.hasMortgage = body.hasMortgage;
    if (body.mortgageAmount !== undefined) updateData.mortgageAmount = body.mortgageAmount;
    if (body.mortgageRate !== undefined) updateData.mortgageRate = body.mortgageRate;
    if (body.mortgagePayment !== undefined) updateData.mortgagePayment = body.mortgagePayment;
    if (body.mortgageStart !== undefined) updateData.mortgageStart = body.mortgageStart ? new Date(body.mortgageStart) : null;
    if (body.mortgageEnd !== undefined) updateData.mortgageEnd = body.mortgageEnd ? new Date(body.mortgageEnd) : null;

    // Rental
    if (body.isRented !== undefined) updateData.isRented = body.isRented;
    if (body.monthlyRent !== undefined) updateData.monthlyRent = body.monthlyRent;
    if (body.tenantName !== undefined) updateData.tenantName = body.tenantName;
    if (body.leaseStart !== undefined) updateData.leaseStart = body.leaseStart ? new Date(body.leaseStart) : null;
    if (body.leaseEnd !== undefined) updateData.leaseEnd = body.leaseEnd ? new Date(body.leaseEnd) : null;
    if (body.depositAmount !== undefined) updateData.depositAmount = body.depositAmount;

    // Expenses
    if (body.monthlyExpenses !== undefined) updateData.monthlyExpenses = body.monthlyExpenses;
    if (body.annualTax !== undefined) updateData.annualTax = body.annualTax;
    if (body.annualInsurance !== undefined) updateData.annualInsurance = body.annualInsurance;

    // Status
    if (body.status !== undefined) updateData.status = body.status;
    if (body.notes !== undefined) updateData.notes = body.notes;

    // Sale
    if (body.saleDate !== undefined) {
      updateData.saleDate = body.saleDate ? new Date(body.saleDate) : null;
      updateData.salePrice = body.salePrice;
      updateData.saleCosts = body.saleCosts;
      updateData.status = "SOLD";

      // Create sale transaction
      if (body.salePrice) {
        await prisma.portfolioTransaction.create({
          data: {
            portfolioPropertyId: id,
            type: "SALE",
            amount: body.salePrice - (body.saleCosts || 0),
            date: new Date(body.saleDate),
            description: "Predaj nehnuteľnosti",
          },
        });
      }
    }

    const property = await prisma.portfolioProperty.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ success: true, data: property });
  } catch (error) {
    console.error("Error updating portfolio property:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

// DELETE - Vymazať nehnuteľnosť
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

    // Verify ownership
    const existing = await prisma.portfolioProperty.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: "Property not found" }, { status: 404 });
    }

    await prisma.portfolioProperty.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "Property deleted" });
  } catch (error) {
    console.error("Error deleting portfolio property:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
