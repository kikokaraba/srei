import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Načítaj preferencie používateľa
    const preferences = await prisma.userPreferences.findUnique({
      where: { userId: session.user.id },
    });

    if (!preferences) {
      return NextResponse.json({
        success: true,
        data: [],
        count: 0,
      });
    }

    // Zostav filter na základe preferencií
    const where: Prisma.PropertyWhereInput = {};

    // Lokalita
    if (preferences.trackedCities) {
      const cities = JSON.parse(preferences.trackedCities);
      if (cities.length > 0) {
        where.city = { in: cities };
      }
    }

    // Cena
    if (preferences.minPrice || preferences.maxPrice) {
      where.price = {};
      if (preferences.minPrice) {
        where.price.gte = preferences.minPrice;
      }
      if (preferences.maxPrice) {
        where.price.lte = preferences.maxPrice;
      }
    }

    // Cena za m²
    if (preferences.minPricePerM2 || preferences.maxPricePerM2) {
      where.price_per_m2 = {};
      if (preferences.minPricePerM2) {
        where.price_per_m2.gte = preferences.minPricePerM2;
      }
      if (preferences.maxPricePerM2) {
        where.price_per_m2.lte = preferences.maxPricePerM2;
      }
    }

    // Plocha
    if (preferences.minArea || preferences.maxArea) {
      where.area_m2 = {};
      if (preferences.minArea) {
        where.area_m2.gte = preferences.minArea;
      }
      if (preferences.maxArea) {
        where.area_m2.lte = preferences.maxArea;
      }
    }

    // Izby
    if (preferences.minRooms || preferences.maxRooms) {
      where.rooms = {};
      if (preferences.minRooms) {
        where.rooms.gte = preferences.minRooms;
      }
      if (preferences.maxRooms) {
        where.rooms.lte = preferences.maxRooms;
      }
    }

    // Stav
    if (preferences.condition) {
      const conditions = JSON.parse(preferences.condition);
      if (conditions.length > 0) {
        where.condition = { in: conditions };
      }
    }

    // Energetický certifikát
    if (preferences.energyCertificates) {
      const certs = JSON.parse(preferences.energyCertificates);
      if (certs.length > 0) {
        where.energy_certificate = { in: certs };
      }
    }

    // Poschodie
    if (preferences.minFloor || preferences.maxFloor) {
      where.floor = {};
      if (preferences.minFloor) {
        where.floor.gte = preferences.minFloor;
      }
      if (preferences.maxFloor) {
        where.floor.lte = preferences.maxFloor;
      }
    }

    // Len nehnuteľnosti v núdzi
    if (preferences.onlyDistressed) {
      where.is_distressed = true;
    }

    // Dni v ponuke
    if (preferences.maxDaysOnMarket) {
      where.days_on_market = { lte: preferences.maxDaysOnMarket };
    }

    // Načítaj nehnuteľnosti s filtrami
    const properties = await prisma.property.findMany({
      where,
      include: {
        investmentMetrics: true,
        marketGaps: true,
        propertyImpacts: {
          include: {
            urbanDevelopment: true,
          },
        },
      },
      take: 100, // Limit pre performance
      orderBy: preferences.sortBy === "price" 
        ? { price: preferences.sortOrder === "desc" ? "desc" : "asc" }
        : preferences.sortBy === "yield" && { investmentMetrics: { gross_yield: preferences.sortOrder === "desc" ? "desc" : "asc" } }
        || { createdAt: "desc" },
    });

    // Filtruj podľa investičných metrík (ak sú)
    let filteredProperties = properties;

    if (preferences.minYield || preferences.maxYield) {
      filteredProperties = filteredProperties.filter((p) => {
        const yield = p.investmentMetrics?.gross_yield;
        if (!yield) return false;
        if (preferences.minYield && yield < preferences.minYield) return false;
        if (preferences.maxYield && yield > preferences.maxYield) return false;
        return true;
      });
    }

    if (preferences.minGrossYield || preferences.maxGrossYield) {
      filteredProperties = filteredProperties.filter((p) => {
        const yield = p.investmentMetrics?.gross_yield;
        if (!yield) return false;
        if (preferences.minGrossYield && yield < preferences.minGrossYield) return false;
        if (preferences.maxGrossYield && yield > preferences.maxGrossYield) return false;
        return true;
      });
    }

    if (preferences.minCashOnCash) {
      filteredProperties = filteredProperties.filter((p) => {
        const coc = p.investmentMetrics?.cash_on_cash;
        return coc && coc >= preferences.minCashOnCash!;
      });
    }

    // Market Gaps filter
    if (preferences.minGapPercentage) {
      filteredProperties = filteredProperties.filter((p) => {
        const gap = p.marketGaps[0];
        return gap && gap.gap_percentage >= preferences.minGapPercentage!;
      });
    }

    // Urban Development filter
    if (preferences.minUrbanImpact) {
      filteredProperties = filteredProperties.filter((p) => {
        const impact = p.propertyImpacts[0]?.estimated_appreciation;
        return impact && impact >= preferences.minUrbanImpact!;
      });
    }

    return NextResponse.json({
      success: true,
      data: filteredProperties,
      count: filteredProperties.length,
    });
  } catch (error) {
    console.error("Error fetching filtered properties:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
