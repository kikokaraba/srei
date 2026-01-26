import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getLimit } from "@/lib/access-control";
import { UserRole } from "@/generated/prisma";

// GET - Načítať portfólio používateľa
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const properties = await prisma.portfolioProperty.findMany({
      where: { userId: session.user.id },
      include: {
        transactions: {
          orderBy: { date: "desc" },
          take: 10,
        },
        valuations: {
          orderBy: { valuationDate: "desc" },
          take: 5,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Calculate portfolio metrics
    const activeProperties = properties.filter((p) => p.status !== "SOLD");
    const soldProperties = properties.filter((p) => p.status === "SOLD");

    // Total portfolio value
    const totalValue = activeProperties.reduce((sum, p) => sum + p.currentValue, 0);
    const totalInvested = activeProperties.reduce((sum, p) => sum + p.purchasePrice + p.purchaseCosts, 0);
    const totalEquity = activeProperties.reduce((sum, p) => {
      const mortgageRemaining = p.hasMortgage && p.mortgageAmount ? p.mortgageAmount : 0;
      return sum + (p.currentValue - mortgageRemaining);
    }, 0);

    // Monthly income/expenses
    const monthlyRentIncome = activeProperties
      .filter((p) => p.isRented && p.monthlyRent)
      .reduce((sum, p) => sum + (p.monthlyRent || 0), 0);

    const monthlyMortgagePayments = activeProperties
      .filter((p) => p.hasMortgage && p.mortgagePayment)
      .reduce((sum, p) => sum + (p.mortgagePayment || 0), 0);

    const monthlyExpenses = activeProperties.reduce((sum, p) => sum + p.monthlyExpenses, 0);

    const monthlyCashFlow = monthlyRentIncome - monthlyMortgagePayments - monthlyExpenses;

    // Yields
    const grossYield = totalInvested > 0 ? ((monthlyRentIncome * 12) / totalInvested) * 100 : 0;
    const netYield = totalInvested > 0 
      ? (((monthlyRentIncome - monthlyExpenses) * 12) / totalInvested) * 100 
      : 0;

    // Appreciation
    const totalAppreciation = totalValue - totalInvested;
    const appreciationPercent = totalInvested > 0 ? (totalAppreciation / totalInvested) * 100 : 0;

    // Realized gains from sold properties
    const realizedGains = soldProperties.reduce((sum, p) => {
      if (p.salePrice) {
        const profit = p.salePrice - p.purchasePrice - p.purchaseCosts - (p.saleCosts || 0);
        return sum + profit;
      }
      return sum;
    }, 0);

    return NextResponse.json({
      success: true,
      data: {
        properties,
        metrics: {
          totalProperties: activeProperties.length,
          soldProperties: soldProperties.length,
          totalValue,
          totalInvested,
          totalEquity,
          totalAppreciation,
          appreciationPercent,
          monthlyRentIncome,
          monthlyMortgagePayments,
          monthlyExpenses,
          monthlyCashFlow,
          annualCashFlow: monthlyCashFlow * 12,
          grossYield,
          netYield,
          realizedGains,
          rentedProperties: activeProperties.filter((p) => p.isRented).length,
          vacantProperties: activeProperties.filter((p) => p.status === "VACANT").length,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching portfolio:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

// POST - Pridať nehnuteľnosť do portfólia
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    // Kontrola limitu pre FREE používateľov
    const userRole = session.user.role as UserRole;
    const maxPortfolio = getLimit(userRole, "maxPortfolioItems");
    
    // Spočítaj aktuálny počet položiek v portfóliu
    const currentCount = await prisma.portfolioProperty.count({
      where: { 
        userId: session.user.id,
        status: { not: "SOLD" }, // Len aktívne
      },
    });
    
    if (currentCount >= maxPortfolio) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Dosiahli ste limit položiek v portfóliu",
          limitReached: true,
          currentCount,
          maxAllowed: maxPortfolio,
          upgradeRequired: userRole === "FREE_USER",
        },
        { status: 403 }
      );
    }

    const body = await request.json();

    const property = await prisma.portfolioProperty.create({
      data: {
        userId: session.user.id,
        name: body.name,
        address: body.address,
        city: body.city,
        district: body.district,
        propertyType: body.propertyType,
        area_m2: body.area_m2,
        rooms: body.rooms,
        floor: body.floor,
        purchaseDate: new Date(body.purchaseDate),
        purchasePrice: body.purchasePrice,
        purchaseCosts: body.purchaseCosts || 0,
        currentValue: body.currentValue || body.purchasePrice,
        hasMortgage: body.hasMortgage || false,
        mortgageAmount: body.mortgageAmount,
        mortgageRate: body.mortgageRate,
        mortgagePayment: body.mortgagePayment,
        mortgageStart: body.mortgageStart ? new Date(body.mortgageStart) : null,
        mortgageEnd: body.mortgageEnd ? new Date(body.mortgageEnd) : null,
        isRented: body.isRented || false,
        monthlyRent: body.monthlyRent,
        tenantName: body.tenantName,
        leaseStart: body.leaseStart ? new Date(body.leaseStart) : null,
        leaseEnd: body.leaseEnd ? new Date(body.leaseEnd) : null,
        depositAmount: body.depositAmount,
        monthlyExpenses: body.monthlyExpenses || 0,
        annualTax: body.annualTax,
        annualInsurance: body.annualInsurance,
        status: body.status || "OWNED",
        notes: body.notes,
        photos: JSON.stringify(body.photos || []),
      },
    });

    // Create initial purchase transaction
    await prisma.portfolioTransaction.create({
      data: {
        portfolioPropertyId: property.id,
        type: "PURCHASE",
        amount: -(body.purchasePrice + (body.purchaseCosts || 0)),
        date: new Date(body.purchaseDate),
        description: "Kúpa nehnuteľnosti",
      },
    });

    // Create initial valuation
    await prisma.propertyValuation.create({
      data: {
        portfolioPropertyId: property.id,
        value: body.purchasePrice,
        source: "manual",
        notes: "Kúpna cena",
        valuationDate: new Date(body.purchaseDate),
      },
    });

    return NextResponse.json({ success: true, data: property });
  } catch (error) {
    console.error("Error creating portfolio property:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
