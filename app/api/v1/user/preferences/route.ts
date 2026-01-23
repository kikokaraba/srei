import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { SlovakCity } from "@/generated/prisma/client";

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
    // Convert primaryCity string to SlovakCity enum if provided
    const primaryCityEnum = primaryCity && Object.values(SlovakCity).includes(primaryCity as SlovakCity) 
      ? (primaryCity as SlovakCity) 
      : (primaryCity === null ? null : undefined);

    const updateData: Prisma.UserPreferencesUncheckedUpdateInput = {};
    
    if (primaryCity !== undefined) {
      updateData.primaryCity = primaryCityEnum;
    }
    if (trackedCities !== undefined) {
      updateData.trackedCities = trackedCities ? JSON.stringify(trackedCities) : JSON.stringify([]);
    }
    if (trackedDistricts !== undefined) {
      updateData.trackedDistricts = trackedDistricts ? JSON.stringify(trackedDistricts) : JSON.stringify([]);
    }
    if (trackedStreets !== undefined) {
      updateData.trackedStreets = trackedStreets ? JSON.stringify(trackedStreets) : JSON.stringify([]);
    }
    if (investmentType !== undefined) updateData.investmentType = investmentType || null;
    if (minYield !== undefined) updateData.minYield = minYield || null;
    if (maxYield !== undefined) updateData.maxYield = maxYield || null;
    if (minPrice !== undefined) updateData.minPrice = minPrice || null;
    if (maxPrice !== undefined) updateData.maxPrice = maxPrice || null;
    if (minPricePerM2 !== undefined) updateData.minPricePerM2 = minPricePerM2 || null;
    if (maxPricePerM2 !== undefined) updateData.maxPricePerM2 = maxPricePerM2 || null;
    if (minArea !== undefined) updateData.minArea = minArea || null;
    if (maxArea !== undefined) updateData.maxArea = maxArea || null;
    if (minRooms !== undefined) updateData.minRooms = minRooms || null;
    if (maxRooms !== undefined) updateData.maxRooms = maxRooms || null;
    if (condition !== undefined) {
      updateData.condition = condition ? (Array.isArray(condition) ? JSON.stringify(condition) : condition) : JSON.stringify([]);
    }
    if (energyCertificates !== undefined) {
      updateData.energyCertificates = energyCertificates ? (Array.isArray(energyCertificates) ? JSON.stringify(energyCertificates) : energyCertificates) : JSON.stringify([]);
    }
    if (minFloor !== undefined) updateData.minFloor = minFloor || null;
    if (maxFloor !== undefined) updateData.maxFloor = maxFloor || null;
    if (onlyDistressed !== undefined) updateData.onlyDistressed = onlyDistressed ?? false;
    if (minGrossYield !== undefined) updateData.minGrossYield = minGrossYield || null;
    if (maxGrossYield !== undefined) updateData.maxGrossYield = maxGrossYield || null;
    if (minNetYield !== undefined) updateData.minNetYield = minNetYield || null;
    if (maxNetYield !== undefined) updateData.maxNetYield = maxNetYield || null;
    if (minCashOnCash !== undefined) updateData.minCashOnCash = minCashOnCash || null;
    if (maxCashOnCash !== undefined) updateData.maxCashOnCash = maxCashOnCash || null;
    if (maxPriceToRentRatio !== undefined) updateData.maxPriceToRentRatio = maxPriceToRentRatio || null;
    if (maxDaysOnMarket !== undefined) updateData.maxDaysOnMarket = maxDaysOnMarket || null;
    if (minPriceDrop !== undefined) updateData.minPriceDrop = minPriceDrop || null;
    if (requirePriceHistory !== undefined) updateData.requirePriceHistory = requirePriceHistory ?? false;
    if (minUrbanImpact !== undefined) updateData.minUrbanImpact = minUrbanImpact || null;
    if (maxDistanceToInfra !== undefined) updateData.maxDistanceToInfra = maxDistanceToInfra || null;
    if (infrastructureTypes !== undefined) {
      updateData.infrastructureTypes = infrastructureTypes ? (Array.isArray(infrastructureTypes) ? JSON.stringify(infrastructureTypes) : infrastructureTypes) : JSON.stringify([]);
    }
    if (minGapPercentage !== undefined) updateData.minGapPercentage = minGapPercentage || null;
    if (minPotentialProfit !== undefined) updateData.minPotentialProfit = minPotentialProfit || null;
    if (ownershipTypes !== undefined) {
      updateData.ownershipTypes = ownershipTypes ? (Array.isArray(ownershipTypes) ? JSON.stringify(ownershipTypes) : ownershipTypes) : JSON.stringify([]);
    }
    if (requireTaxExemption !== undefined) updateData.requireTaxExemption = requireTaxExemption ?? false;
    if (notifyMarketGaps !== undefined) updateData.notifyMarketGaps = notifyMarketGaps ?? true;
    if (notifyPriceDrops !== undefined) updateData.notifyPriceDrops = notifyPriceDrops ?? true;
    if (notifyNewProperties !== undefined) updateData.notifyNewProperties = notifyNewProperties ?? true;
    if (notifyUrbanDevelopment !== undefined) updateData.notifyUrbanDevelopment = notifyUrbanDevelopment ?? true;
    if (notifyHighYield !== undefined) updateData.notifyHighYield = notifyHighYield ?? false;
    if (notifyDistressed !== undefined) updateData.notifyDistressed = notifyDistressed ?? false;
    if (notificationFrequency !== undefined) updateData.notificationFrequency = notificationFrequency || "daily";
    if (defaultView !== undefined) updateData.defaultView = defaultView || "dashboard";
    if (itemsPerPage !== undefined) updateData.itemsPerPage = itemsPerPage || 20;
    if (sortBy !== undefined) updateData.sortBy = sortBy || "price";
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder || "asc";
    if (savedFilters !== undefined) {
      updateData.savedFilters = savedFilters ? (Array.isArray(savedFilters) ? JSON.stringify(savedFilters) : savedFilters) : JSON.stringify([]);
    }
    if (onboardingCompleted !== undefined) updateData.onboardingCompleted = onboardingCompleted ?? false;

    // For create, we need to ensure all required fields are present with correct types
    const createData: Prisma.UserPreferencesUncheckedCreateInput = {
      userId: session.user.id,
      primaryCity: primaryCityEnum !== undefined ? primaryCityEnum : null,
      trackedCities: trackedCities !== undefined ? (trackedCities ? JSON.stringify(trackedCities) : JSON.stringify([])) : JSON.stringify([]),
      trackedDistricts: trackedDistricts !== undefined ? (trackedDistricts ? JSON.stringify(trackedDistricts) : JSON.stringify([])) : JSON.stringify([]),
      trackedStreets: trackedStreets !== undefined ? (trackedStreets ? JSON.stringify(trackedStreets) : JSON.stringify([])) : JSON.stringify([]),
      investmentType: investmentType !== undefined ? (investmentType || null) : null,
      minYield: minYield !== undefined ? (minYield || null) : null,
      maxYield: maxYield !== undefined ? (maxYield || null) : null,
      minPrice: minPrice !== undefined ? (minPrice || null) : null,
      maxPrice: maxPrice !== undefined ? (maxPrice || null) : null,
      minPricePerM2: minPricePerM2 !== undefined ? (minPricePerM2 || null) : null,
      maxPricePerM2: maxPricePerM2 !== undefined ? (maxPricePerM2 || null) : null,
      minArea: minArea !== undefined ? (minArea || null) : null,
      maxArea: maxArea !== undefined ? (maxArea || null) : null,
      minRooms: minRooms !== undefined ? (minRooms || null) : null,
      maxRooms: maxRooms !== undefined ? (maxRooms || null) : null,
      condition: condition !== undefined ? (condition ? (Array.isArray(condition) ? JSON.stringify(condition) : condition) : JSON.stringify([])) : JSON.stringify([]),
      energyCertificates: energyCertificates !== undefined ? (energyCertificates ? (Array.isArray(energyCertificates) ? JSON.stringify(energyCertificates) : energyCertificates) : JSON.stringify([])) : JSON.stringify([]),
      minFloor: minFloor !== undefined ? (minFloor || null) : null,
      maxFloor: maxFloor !== undefined ? (maxFloor || null) : null,
      onlyDistressed: onlyDistressed !== undefined ? (onlyDistressed ?? false) : false,
      minGrossYield: minGrossYield !== undefined ? (minGrossYield || null) : null,
      maxGrossYield: maxGrossYield !== undefined ? (maxGrossYield || null) : null,
      minNetYield: minNetYield !== undefined ? (minNetYield || null) : null,
      maxNetYield: maxNetYield !== undefined ? (maxNetYield || null) : null,
      minCashOnCash: minCashOnCash !== undefined ? (minCashOnCash || null) : null,
      maxCashOnCash: maxCashOnCash !== undefined ? (maxCashOnCash || null) : null,
      maxPriceToRentRatio: maxPriceToRentRatio !== undefined ? (maxPriceToRentRatio || null) : null,
      maxDaysOnMarket: maxDaysOnMarket !== undefined ? (maxDaysOnMarket || null) : null,
      minPriceDrop: minPriceDrop !== undefined ? (minPriceDrop || null) : null,
      requirePriceHistory: requirePriceHistory !== undefined ? (requirePriceHistory ?? false) : false,
      minUrbanImpact: minUrbanImpact !== undefined ? (minUrbanImpact || null) : null,
      maxDistanceToInfra: maxDistanceToInfra !== undefined ? (maxDistanceToInfra || null) : null,
      infrastructureTypes: infrastructureTypes !== undefined ? (infrastructureTypes ? (Array.isArray(infrastructureTypes) ? JSON.stringify(infrastructureTypes) : infrastructureTypes) : JSON.stringify([])) : JSON.stringify([]),
      minGapPercentage: minGapPercentage !== undefined ? (minGapPercentage || null) : null,
      minPotentialProfit: minPotentialProfit !== undefined ? (minPotentialProfit || null) : null,
      ownershipTypes: ownershipTypes !== undefined ? (ownershipTypes ? (Array.isArray(ownershipTypes) ? JSON.stringify(ownershipTypes) : ownershipTypes) : JSON.stringify([])) : JSON.stringify([]),
      requireTaxExemption: requireTaxExemption !== undefined ? (requireTaxExemption ?? false) : false,
      notifyMarketGaps: notifyMarketGaps !== undefined ? (notifyMarketGaps ?? true) : true,
      notifyPriceDrops: notifyPriceDrops !== undefined ? (notifyPriceDrops ?? true) : true,
      notifyNewProperties: notifyNewProperties !== undefined ? (notifyNewProperties ?? true) : true,
      notifyUrbanDevelopment: notifyUrbanDevelopment !== undefined ? (notifyUrbanDevelopment ?? true) : true,
      notifyHighYield: notifyHighYield !== undefined ? (notifyHighYield ?? false) : false,
      notifyDistressed: notifyDistressed !== undefined ? (notifyDistressed ?? false) : false,
      notificationFrequency: notificationFrequency !== undefined ? (notificationFrequency || "daily") : "daily",
      defaultView: defaultView !== undefined ? (defaultView || "dashboard") : "dashboard",
      itemsPerPage: itemsPerPage !== undefined ? (itemsPerPage || 20) : 20,
      sortBy: sortBy !== undefined ? (sortBy || "price") : "price",
      sortOrder: sortOrder !== undefined ? (sortOrder || "asc") : "asc",
      savedFilters: savedFilters !== undefined ? (savedFilters ? (Array.isArray(savedFilters) ? JSON.stringify(savedFilters) : savedFilters) : JSON.stringify([])) : JSON.stringify([]),
      onboardingCompleted: onboardingCompleted !== undefined ? (onboardingCompleted ?? false) : false,
    };

    const preferences = await prisma.userPreferences.upsert({
      where: { userId: session.user.id },
      update: updateData,
      create: createData,
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
