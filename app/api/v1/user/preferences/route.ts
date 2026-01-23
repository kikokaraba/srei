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

    const preferences = await prisma.userPreferences.findUnique({
      where: { userId: session.user.id },
    });

    return NextResponse.json({
      success: true,
      data: preferences,
    });
  } catch (error) {
    console.error("Error fetching user preferences:", error);
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
    const {
      primaryCity,
      trackedCities,
      trackedDistricts,
      trackedStreets,
      investmentType,
      minYield,
      maxYield,
      minPrice,
      maxPrice,
      minPricePerM2,
      maxPricePerM2,
      minArea,
      maxArea,
      minRooms,
      maxRooms,
      condition,
      energyCertificates,
      minFloor,
      maxFloor,
      onlyDistressed,
      minGrossYield,
      maxGrossYield,
      minNetYield,
      maxNetYield,
      minCashOnCash,
      maxCashOnCash,
      maxPriceToRentRatio,
      maxDaysOnMarket,
      minPriceDrop,
      requirePriceHistory,
      minUrbanImpact,
      maxDistanceToInfra,
      infrastructureTypes,
      minGapPercentage,
      minPotentialProfit,
      ownershipTypes,
      requireTaxExemption,
      notifyMarketGaps,
      notifyPriceDrops,
      notifyNewProperties,
      notifyUrbanDevelopment,
      notifyHighYield,
      notifyDistressed,
      notificationFrequency,
      defaultView,
      itemsPerPage,
      sortBy,
      sortOrder,
      savedFilters,
      onboardingCompleted,
    } = body;

    const updateData: any = {
      primaryCity: primaryCity || null,
      trackedCities: trackedCities ? JSON.stringify(trackedCities) : JSON.stringify([]),
      trackedDistricts: trackedDistricts ? JSON.stringify(trackedDistricts) : JSON.stringify([]),
      trackedStreets: trackedStreets ? JSON.stringify(trackedStreets) : JSON.stringify([]),
      investmentType: investmentType || null,
      minYield: minYield || null,
      maxYield: maxYield || null,
      minPrice: minPrice || null,
      maxPrice: maxPrice || null,
      minPricePerM2: minPricePerM2 || null,
      maxPricePerM2: maxPricePerM2 || null,
      minArea: minArea || null,
      maxArea: maxArea || null,
      minRooms: minRooms || null,
      maxRooms: maxRooms || null,
      condition: condition ? (Array.isArray(condition) ? JSON.stringify(condition) : condition) : JSON.stringify([]),
      energyCertificates: energyCertificates ? (Array.isArray(energyCertificates) ? JSON.stringify(energyCertificates) : energyCertificates) : JSON.stringify([]),
      minFloor: minFloor || null,
      maxFloor: maxFloor || null,
      onlyDistressed: onlyDistressed ?? false,
      minGrossYield: minGrossYield || null,
      maxGrossYield: maxGrossYield || null,
      minNetYield: minNetYield || null,
      maxNetYield: maxNetYield || null,
      minCashOnCash: minCashOnCash || null,
      maxCashOnCash: maxCashOnCash || null,
      maxPriceToRentRatio: maxPriceToRentRatio || null,
      maxDaysOnMarket: maxDaysOnMarket || null,
      minPriceDrop: minPriceDrop || null,
      requirePriceHistory: requirePriceHistory ?? false,
      minUrbanImpact: minUrbanImpact || null,
      maxDistanceToInfra: maxDistanceToInfra || null,
      infrastructureTypes: infrastructureTypes ? (Array.isArray(infrastructureTypes) ? JSON.stringify(infrastructureTypes) : infrastructureTypes) : JSON.stringify([]),
      minGapPercentage: minGapPercentage || null,
      minPotentialProfit: minPotentialProfit || null,
      ownershipTypes: ownershipTypes ? (Array.isArray(ownershipTypes) ? JSON.stringify(ownershipTypes) : ownershipTypes) : JSON.stringify([]),
      requireTaxExemption: requireTaxExemption ?? false,
      notifyMarketGaps: notifyMarketGaps ?? true,
      notifyPriceDrops: notifyPriceDrops ?? true,
      notifyNewProperties: notifyNewProperties ?? true,
      notifyUrbanDevelopment: notifyUrbanDevelopment ?? true,
      notifyHighYield: notifyHighYield ?? false,
      notifyDistressed: notifyDistressed ?? false,
      notificationFrequency: notificationFrequency || "daily",
      defaultView: defaultView || "dashboard",
      itemsPerPage: itemsPerPage || 20,
      sortBy: sortBy || "price",
      sortOrder: sortOrder || "asc",
      savedFilters: savedFilters ? (Array.isArray(savedFilters) ? JSON.stringify(savedFilters) : savedFilters) : JSON.stringify([]),
      onboardingCompleted: onboardingCompleted ?? false,
    };

    const preferences = await prisma.userPreferences.upsert({
      where: { userId: session.user.id },
      update: updateData,
      create: {
        userId: session.user.id,
        ...updateData,
      },
    });

    return NextResponse.json({
      success: true,
      data: preferences,
    });
  } catch (error) {
    console.error("Error saving user preferences:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
