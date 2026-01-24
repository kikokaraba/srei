import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const layout = await prisma.dashboardLayout.findUnique({
      where: { userId: session.user.id },
    });

    // Všetky dostupné widgety
    const allWidgets = [
      "economic-indicators",
      "analytics-cards",
      "market-overview",
      "market-gaps",
      "liquidity-tracker",
      "scenario-simulator",
      "urban-development",
      "tax-assistant",
      "recent-properties",
    ];

    // Default layout pre nových používateľov
    const defaultWidgets = [
      "economic-indicators",
      "analytics-cards",
      "market-overview",
      "market-gaps",
      "liquidity-tracker",
      "scenario-simulator",
    ];

    let currentWidgets = defaultWidgets;
    let currentHidden: string[] = [];

    if (layout?.widgets) {
      currentWidgets = JSON.parse(layout.widgets);
      currentHidden = layout.hiddenWidgets ? JSON.parse(layout.hiddenWidgets) : [];
      
      // Pridaj nové widgety, ktoré ešte nie sú v layoute (ani zobrazené, ani skryté)
      const newWidgets = allWidgets.filter(
        w => !currentWidgets.includes(w) && !currentHidden.includes(w)
      );
      
      // Pridaj nové widgety na začiatok
      if (newWidgets.length > 0) {
        currentWidgets = [...newWidgets, ...currentWidgets];
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        widgets: currentWidgets,
        hiddenWidgets: currentHidden,
      },
    });
  } catch (error) {
    console.error("Error fetching dashboard layout:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

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
    const { widgets, hiddenWidgets } = body;

    if (!Array.isArray(widgets)) {
      return NextResponse.json(
        { success: false, error: "Invalid widgets array" },
        { status: 400 }
      );
    }

    const layout = await prisma.dashboardLayout.upsert({
      where: { userId: session.user.id },
      update: {
        widgets: JSON.stringify(widgets),
        hiddenWidgets: JSON.stringify(hiddenWidgets || []),
      },
      create: {
        userId: session.user.id,
        widgets: JSON.stringify(widgets),
        hiddenWidgets: JSON.stringify(hiddenWidgets || []),
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        widgets: JSON.parse(layout.widgets),
        hiddenWidgets: JSON.parse(layout.hiddenWidgets),
      },
    });
  } catch (error) {
    console.error("Error saving dashboard layout:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
