import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

/** Coerce to number or null; preserves 0. */
function toFloat(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Coerce to integer or null; preserves 0. */
function toInt(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.floor(n) : null;
}

/** Coerce to boolean; only true/false from input are accepted, otherwise default. */
function toBool(v: unknown, def: boolean): boolean {
  return v === true || v === false ? v : def;
}

export async function GET() {
  let session;
  try {
    session = await auth();
  } catch (authError) {
    console.error("GET /api/v1/user/preferences: auth() failed", authError);
    const msg = authError instanceof Error ? authError.message : "Auth failed";
    return NextResponse.json(
      {
        success: false,
        error: "Authentication error",
        details: process.env.NODE_ENV === "development" ? msg : undefined,
      },
      { status: 500 }
    );
  }

  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const preferences = await prisma.userPreferences.findUnique({
      where: { userId: session.user.id },
    });

    return NextResponse.json({
      success: true,
      data: preferences ?? null,
    });
  } catch (error) {
    console.error("Error fetching user preferences:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        details: process.env.NODE_ENV === "development" ? errorMessage : undefined,
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  let session;
  try {
    session = await auth();
  } catch (authError) {
    console.error("POST /api/v1/user/preferences: auth() failed", authError);
    const msg = authError instanceof Error ? authError.message : "Auth failed";
    return NextResponse.json(
      {
        success: false,
        error: "Authentication error",
        details: process.env.NODE_ENV === "development" ? msg : undefined,
      },
      { status: 500 }
    );
  }

  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch (error) {
      console.error("Error parsing request body:", error);
      return NextResponse.json(
        { success: false, error: "Invalid request body" },
        { status: 400 }
      );
    }
    if (body == null || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json(
        { success: false, error: "Invalid request body" },
        { status: 400 }
      );
    }

    const {
      primaryCity,
      trackedRegions,
      trackedCities,
      trackedDistricts,
      trackedStreets,
      investmentType,
      investmentTypes,
      minYield,
      maxYield,
      minPrice,
      maxPrice,
      minPricePerM2,
      maxPricePerM2,
      minArea,
      maxArea,
      propertyTypes,
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
    } = body as Record<string, unknown>;

    // Skip onboarding only: minimal upsert to avoid missing/undefined fields on create
    const onlyOnboarding =
      onboardingCompleted === true &&
      primaryCity === undefined &&
      trackedRegions === undefined &&
      trackedCities === undefined &&
      trackedDistricts === undefined &&
      trackedStreets === undefined;

    if (onlyOnboarding) {
      const minimalCreate: Prisma.UserPreferencesUncheckedCreateInput = {
        userId: session.user.id,
        onboardingCompleted: true,
        trackedRegions: "[]",
        trackedCities: "[]",
        trackedDistricts: "[]",
        trackedStreets: "[]",
        investmentTypes: "[]",
        propertyTypes: "[]",
        condition: "[]",
        energyCertificates: "[]",
        infrastructureTypes: "[]",
        ownershipTypes: "[]",
        savedFilters: "[]",
      };
      const preferences = await prisma.userPreferences.upsert({
        where: { userId: session.user.id },
        update: { onboardingCompleted: true },
        create: minimalCreate,
      });
      return NextResponse.json({ success: true, data: preferences });
    }

    // Build update data object with proper types
    // primaryCity is now a string field - no enum validation needed
    const updateData: Prisma.UserPreferencesUncheckedUpdateInput = {};
    
    if (primaryCity !== undefined) {
      updateData.primaryCity = primaryCity || null;
    }
    if (trackedRegions !== undefined) {
      updateData.trackedRegions = trackedRegions ? JSON.stringify(trackedRegions) : JSON.stringify([]);
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
    if (investmentType !== undefined) updateData.investmentType = (investmentType as string) || null;
    if (investmentTypes !== undefined) {
      updateData.investmentTypes = investmentTypes ? (Array.isArray(investmentTypes) ? JSON.stringify(investmentTypes) : investmentTypes) : JSON.stringify([]);
    }
    if (minYield !== undefined) updateData.minYield = toFloat(minYield);
    if (maxYield !== undefined) updateData.maxYield = toFloat(maxYield);
    if (minPrice !== undefined) updateData.minPrice = toFloat(minPrice);
    if (maxPrice !== undefined) updateData.maxPrice = toFloat(maxPrice);
    if (minPricePerM2 !== undefined) updateData.minPricePerM2 = toFloat(minPricePerM2);
    if (maxPricePerM2 !== undefined) updateData.maxPricePerM2 = toFloat(maxPricePerM2);
    if (minArea !== undefined) updateData.minArea = toFloat(minArea);
    if (maxArea !== undefined) updateData.maxArea = toFloat(maxArea);
    if (propertyTypes !== undefined) {
      updateData.propertyTypes = propertyTypes ? (Array.isArray(propertyTypes) ? JSON.stringify(propertyTypes) : typeof propertyTypes === "string" ? propertyTypes : JSON.stringify([])) : JSON.stringify([]);
    }
    if (minRooms !== undefined) updateData.minRooms = toInt(minRooms);
    if (maxRooms !== undefined) updateData.maxRooms = toInt(maxRooms);
    if (condition !== undefined) {
      updateData.condition = condition ? (Array.isArray(condition) ? JSON.stringify(condition) : typeof condition === "string" ? condition : JSON.stringify([])) : JSON.stringify([]);
    }
    if (energyCertificates !== undefined) {
      updateData.energyCertificates = energyCertificates ? (Array.isArray(energyCertificates) ? JSON.stringify(energyCertificates) : typeof energyCertificates === "string" ? energyCertificates : JSON.stringify([])) : JSON.stringify([]);
    }
    if (minFloor !== undefined) updateData.minFloor = toInt(minFloor);
    if (maxFloor !== undefined) updateData.maxFloor = toInt(maxFloor);
    if (onlyDistressed !== undefined) updateData.onlyDistressed = toBool(onlyDistressed, false);
    if (minGrossYield !== undefined) updateData.minGrossYield = toFloat(minGrossYield);
    if (maxGrossYield !== undefined) updateData.maxGrossYield = toFloat(maxGrossYield);
    if (minNetYield !== undefined) updateData.minNetYield = toFloat(minNetYield);
    if (maxNetYield !== undefined) updateData.maxNetYield = toFloat(maxNetYield);
    if (minCashOnCash !== undefined) updateData.minCashOnCash = toFloat(minCashOnCash);
    if (maxCashOnCash !== undefined) updateData.maxCashOnCash = toFloat(maxCashOnCash);
    if (maxPriceToRentRatio !== undefined) updateData.maxPriceToRentRatio = toFloat(maxPriceToRentRatio);
    if (maxDaysOnMarket !== undefined) updateData.maxDaysOnMarket = toInt(maxDaysOnMarket);
    if (minPriceDrop !== undefined) updateData.minPriceDrop = toFloat(minPriceDrop);
    if (requirePriceHistory !== undefined) updateData.requirePriceHistory = toBool(requirePriceHistory, false);
    if (minUrbanImpact !== undefined) updateData.minUrbanImpact = toFloat(minUrbanImpact);
    if (maxDistanceToInfra !== undefined) updateData.maxDistanceToInfra = toFloat(maxDistanceToInfra);
    if (infrastructureTypes !== undefined) {
      updateData.infrastructureTypes = infrastructureTypes ? (Array.isArray(infrastructureTypes) ? JSON.stringify(infrastructureTypes) : typeof infrastructureTypes === "string" ? infrastructureTypes : JSON.stringify([])) : JSON.stringify([]);
    }
    if (minGapPercentage !== undefined) updateData.minGapPercentage = toFloat(minGapPercentage);
    if (minPotentialProfit !== undefined) updateData.minPotentialProfit = toFloat(minPotentialProfit);
    if (ownershipTypes !== undefined) {
      updateData.ownershipTypes = ownershipTypes ? (Array.isArray(ownershipTypes) ? JSON.stringify(ownershipTypes) : typeof ownershipTypes === "string" ? ownershipTypes : JSON.stringify([])) : JSON.stringify([]);
    }
    if (requireTaxExemption !== undefined) updateData.requireTaxExemption = toBool(requireTaxExemption, false);
    if (notifyMarketGaps !== undefined) updateData.notifyMarketGaps = toBool(notifyMarketGaps, true);
    if (notifyPriceDrops !== undefined) updateData.notifyPriceDrops = toBool(notifyPriceDrops, true);
    if (notifyNewProperties !== undefined) updateData.notifyNewProperties = toBool(notifyNewProperties, true);
    if (notifyUrbanDevelopment !== undefined) updateData.notifyUrbanDevelopment = toBool(notifyUrbanDevelopment, true);
    if (notifyHighYield !== undefined) updateData.notifyHighYield = toBool(notifyHighYield, false);
    if (notifyDistressed !== undefined) updateData.notifyDistressed = toBool(notifyDistressed, false);
    if (notificationFrequency !== undefined) updateData.notificationFrequency = notificationFrequency || "daily";
    if (defaultView !== undefined) updateData.defaultView = defaultView || "dashboard";
    if (itemsPerPage !== undefined) updateData.itemsPerPage = toInt(itemsPerPage) ?? 20;
    if (sortBy !== undefined) updateData.sortBy = sortBy || "price";
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder || "asc";
    if (savedFilters !== undefined) {
      updateData.savedFilters = savedFilters ? (Array.isArray(savedFilters) ? JSON.stringify(savedFilters) : typeof savedFilters === "string" ? savedFilters : JSON.stringify([])) : JSON.stringify([]);
    }
    if (onboardingCompleted !== undefined) updateData.onboardingCompleted = toBool(onboardingCompleted, false);

    // For create, we need to ensure all required fields are present with correct types
    const createData: Prisma.UserPreferencesUncheckedCreateInput = {
      userId: session.user.id,
      primaryCity: primaryCity !== undefined ? ((primaryCity as string) || null) : null,
      trackedRegions: trackedRegions !== undefined ? (trackedRegions ? JSON.stringify(trackedRegions) : JSON.stringify([])) : JSON.stringify([]),
      trackedCities: trackedCities !== undefined ? (trackedCities ? JSON.stringify(trackedCities) : JSON.stringify([])) : JSON.stringify([]),
      trackedDistricts: trackedDistricts !== undefined ? (trackedDistricts ? JSON.stringify(trackedDistricts) : JSON.stringify([])) : JSON.stringify([]),
      trackedStreets: trackedStreets !== undefined ? (trackedStreets ? JSON.stringify(trackedStreets) : JSON.stringify([])) : JSON.stringify([]),
      investmentType: investmentType !== undefined ? ((investmentType as string) || null) : null,
      investmentTypes: investmentTypes !== undefined ? (investmentTypes ? (Array.isArray(investmentTypes) ? JSON.stringify(investmentTypes) : typeof investmentTypes === "string" ? investmentTypes : JSON.stringify([])) : JSON.stringify([])) : JSON.stringify([]),
      minYield: toFloat(minYield),
      maxYield: toFloat(maxYield),
      minPrice: toFloat(minPrice),
      maxPrice: toFloat(maxPrice),
      minPricePerM2: toFloat(minPricePerM2),
      maxPricePerM2: toFloat(maxPricePerM2),
      minArea: toFloat(minArea),
      maxArea: toFloat(maxArea),
      propertyTypes: propertyTypes !== undefined ? (propertyTypes ? (Array.isArray(propertyTypes) ? JSON.stringify(propertyTypes) : typeof propertyTypes === "string" ? propertyTypes : JSON.stringify([])) : JSON.stringify([])) : JSON.stringify([]),
      minRooms: toInt(minRooms),
      maxRooms: toInt(maxRooms),
      condition: condition !== undefined ? (condition ? (Array.isArray(condition) ? JSON.stringify(condition) : typeof condition === "string" ? condition : JSON.stringify([])) : JSON.stringify([])) : JSON.stringify([]),
      energyCertificates: energyCertificates !== undefined ? (energyCertificates ? (Array.isArray(energyCertificates) ? JSON.stringify(energyCertificates) : typeof energyCertificates === "string" ? energyCertificates : JSON.stringify([])) : JSON.stringify([])) : JSON.stringify([]),
      minFloor: toInt(minFloor),
      maxFloor: toInt(maxFloor),
      onlyDistressed: onlyDistressed !== undefined ? toBool(onlyDistressed, false) : false,
      minGrossYield: toFloat(minGrossYield),
      maxGrossYield: toFloat(maxGrossYield),
      minNetYield: toFloat(minNetYield),
      maxNetYield: toFloat(maxNetYield),
      minCashOnCash: toFloat(minCashOnCash),
      maxCashOnCash: toFloat(maxCashOnCash),
      maxPriceToRentRatio: toFloat(maxPriceToRentRatio),
      maxDaysOnMarket: toInt(maxDaysOnMarket),
      minPriceDrop: toFloat(minPriceDrop),
      requirePriceHistory: requirePriceHistory !== undefined ? toBool(requirePriceHistory, false) : false,
      minUrbanImpact: toFloat(minUrbanImpact),
      maxDistanceToInfra: toFloat(maxDistanceToInfra),
      infrastructureTypes: infrastructureTypes !== undefined ? (infrastructureTypes ? (Array.isArray(infrastructureTypes) ? JSON.stringify(infrastructureTypes) : typeof infrastructureTypes === "string" ? infrastructureTypes : JSON.stringify([])) : JSON.stringify([])) : JSON.stringify([]),
      minGapPercentage: toFloat(minGapPercentage),
      minPotentialProfit: toFloat(minPotentialProfit),
      ownershipTypes: ownershipTypes !== undefined ? (ownershipTypes ? (Array.isArray(ownershipTypes) ? JSON.stringify(ownershipTypes) : typeof ownershipTypes === "string" ? ownershipTypes : JSON.stringify([])) : JSON.stringify([])) : JSON.stringify([]),
      requireTaxExemption: requireTaxExemption !== undefined ? toBool(requireTaxExemption, false) : false,
      notifyMarketGaps: notifyMarketGaps !== undefined ? toBool(notifyMarketGaps, true) : true,
      notifyPriceDrops: notifyPriceDrops !== undefined ? toBool(notifyPriceDrops, true) : true,
      notifyNewProperties: notifyNewProperties !== undefined ? toBool(notifyNewProperties, true) : true,
      notifyUrbanDevelopment: notifyUrbanDevelopment !== undefined ? toBool(notifyUrbanDevelopment, true) : true,
      notifyHighYield: notifyHighYield !== undefined ? toBool(notifyHighYield, false) : false,
      notifyDistressed: notifyDistressed !== undefined ? toBool(notifyDistressed, false) : false,
      notificationFrequency: notificationFrequency !== undefined ? (String(notificationFrequency) || "daily") : "daily",
      defaultView: defaultView !== undefined ? (String(defaultView) || "dashboard") : "dashboard",
      itemsPerPage: toInt(itemsPerPage) ?? 20,
      sortBy: sortBy !== undefined ? (String(sortBy) || "price") : "price",
      sortOrder: sortOrder !== undefined ? (String(sortOrder) || "asc") : "asc",
      savedFilters: savedFilters !== undefined ? (savedFilters ? (Array.isArray(savedFilters) ? JSON.stringify(savedFilters) : typeof savedFilters === "string" ? savedFilters : JSON.stringify([])) : JSON.stringify([])) : JSON.stringify([]),
      onboardingCompleted: onboardingCompleted !== undefined ? toBool(onboardingCompleted, false) : false,
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
