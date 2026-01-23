import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      console.error("GET /api/v1/user/preferences: Unauthorized - No session or user ID");
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const preferences = await prisma.userPreferences.findUnique({
      where: { userId: session.user.id },
    });

    // Return null if preferences don't exist yet (not an error)
    return NextResponse.json({
      success: true,
      data: preferences || null,
    });
  } catch (error) {
    console.error("Error fetching user preferences:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { 
        success: false, 
        error: "Internal server error",
        details: process.env.NODE_ENV === "development" ? errorMessage : undefined
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      console.error("Unauthorized: No session or user ID");
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    let body;
    try {
      body = await request.json();
    } catch (error) {
      console.error("Error parsing request body:", error);
      return NextResponse.json(
        { success: false, error: "Invalid request body" },
        { status: 400 }
      );
    }
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

    // Build update data object with proper types
    const updateData: {
      primaryCity?: string | null;
      trackedCities?: string;
      trackedDistricts?: string;
      trackedStreets?: string;
      investmentType?: string | null;
      minYield?: number | null;
      maxYield?: number | null;
      minPrice?: number | null;
      maxPrice?: number | null;
      minPricePerM2?: number | null;
      maxPricePerM2?: number | null;
      minArea?: number | null;
      maxArea?: number | null;
      minRooms?: number | null;
      maxRooms?: number | null;
      condition?: string;
      energyCertificates?: string;
      minFloor?: number | null;
      maxFloor?: number | null;
      onlyDistressed?: boolean;
      minGrossYield?: number | null;
      maxGrossYield?: number | null;
      minNetYield?: number | null;
      maxNetYield?: number | null;
      minCashOnCash?: number | null;
      maxCashOnCash?: number | null;
      maxPriceToRentRatio?: number | null;
      maxDaysOnMarket?: number | null;
      minPriceDrop?: number | null;
      requirePriceHistory?: boolean;
      minUrbanImpact?: number | null;
      maxDistanceToInfra?: number | null;
      infrastructureTypes?: string;
      minGapPercentage?: number | null;
      minPotentialProfit?: number | null;
      ownershipTypes?: string;
      requireTaxExemption?: boolean;
      notifyMarketGaps?: boolean;
      notifyPriceDrops?: boolean;
      notifyNewProperties?: boolean;
      notifyUrbanDevelopment?: boolean;
      notifyHighYield?: boolean;
      notifyDistressed?: boolean;
      notificationFrequency?: string;
      defaultView?: string;
      itemsPerPage?: number;
      sortBy?: string;
      sortOrder?: string;
      savedFilters?: string;
      onboardingCompleted?: boolean;
    } = {
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
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { 
        success: false, 
        error: "Internal server error",
        details: process.env.NODE_ENV === "development" ? errorMessage : undefined
      },
      { status: 500 }
    );
  }
}
