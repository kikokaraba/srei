import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma, SlovakCity, PropertyCondition, EnergyCertificate, ListingType } from "@/generated/prisma/client";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Načítaj query parametre
    const { searchParams } = new URL(request.url);
    const sortBy = searchParams.get("sortBy") || undefined;
    const sortOrder = searchParams.get("sortOrder") || "desc";
    const limit = parseInt(searchParams.get("limit") || "100", 10);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const skip = (page - 1) * limit;

    // Priame filtre z query parametrov
    const cityParam = searchParams.get("city");
    const listingTypeParam = searchParams.get("listingType"); // PREDAJ alebo PRENAJOM
    const minPrice = searchParams.get("minPrice");
    const maxPrice = searchParams.get("maxPrice");
    const minArea = searchParams.get("minArea");
    const maxArea = searchParams.get("maxArea");
    const minRooms = searchParams.get("minRooms");
    const maxRooms = searchParams.get("maxRooms");
    const conditionParam = searchParams.get("condition");
    const minYield = searchParams.get("minYield");
    const maxYield = searchParams.get("maxYield");
    const search = searchParams.get("search");
    const onlyDistressed = searchParams.get("onlyDistressed") === "true";
    const useUserPreferences = searchParams.get("usePreferences") === "true";

    // Načítaj preferencie používateľa len ak je to vyžiadané
    const preferences = useUserPreferences
      ? await prisma.userPreferences.findUnique({
          where: { userId: session.user.id },
        })
      : null;

    // Zostav filter - prioritne z query parametrov, potom z preferencií
    const where: Prisma.PropertyWhereInput = {};

    // Vyhľadávanie v názve a adrese
    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { address: { contains: search, mode: "insensitive" } },
        { district: { contains: search, mode: "insensitive" } },
      ];
    }

    // Typ inzerátu (predaj/prenájom)
    if (listingTypeParam) {
      const types = listingTypeParam.split(",").filter(Boolean) as ListingType[];
      if (types.length > 0) {
        where.listing_type = { in: types };
      }
    }

    // Mesto - prioritne z query, potom z preferencií
    if (cityParam) {
      // Podporuje viac miest oddelených čiarkou
      const cities = cityParam.split(",").filter(Boolean) as SlovakCity[];
      if (cities.length > 0) {
        where.city = { in: cities };
      }
    } else if (preferences?.trackedCities) {
      const cities = JSON.parse(preferences.trackedCities);
      if (cities.length > 0) {
        where.city = { in: cities };
      }
    }

    // Cena
    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price.gte = parseFloat(minPrice);
      if (maxPrice) where.price.lte = parseFloat(maxPrice);
    } else if (preferences?.minPrice || preferences?.maxPrice) {
      where.price = {};
      if (preferences.minPrice) where.price.gte = preferences.minPrice;
      if (preferences.maxPrice) where.price.lte = preferences.maxPrice;
    }

    // Plocha
    if (minArea || maxArea) {
      where.area_m2 = {};
      if (minArea) where.area_m2.gte = parseFloat(minArea);
      if (maxArea) where.area_m2.lte = parseFloat(maxArea);
    } else if (preferences?.minArea || preferences?.maxArea) {
      where.area_m2 = {};
      if (preferences.minArea) where.area_m2.gte = preferences.minArea;
      if (preferences.maxArea) where.area_m2.lte = preferences.maxArea;
    }

    // Izby
    if (minRooms || maxRooms) {
      where.rooms = {};
      if (minRooms) where.rooms.gte = parseInt(minRooms);
      if (maxRooms) where.rooms.lte = parseInt(maxRooms);
    } else if (preferences?.minRooms || preferences?.maxRooms) {
      where.rooms = {};
      if (preferences.minRooms) where.rooms.gte = preferences.minRooms;
      if (preferences.maxRooms) where.rooms.lte = preferences.maxRooms;
    }

    // Stav nehnuteľnosti
    if (conditionParam) {
      const conditions = conditionParam.split(",").filter(Boolean) as PropertyCondition[];
      if (conditions.length > 0) {
        where.condition = { in: conditions };
      }
    } else if (preferences?.condition) {
      const conditions = JSON.parse(preferences.condition);
      if (conditions.length > 0) {
        where.condition = { in: conditions };
      }
    }

    // Distressed
    if (onlyDistressed) {
      where.is_distressed = true;
    } else if (preferences?.onlyDistressed) {
      where.is_distressed = true;
    }

    // Urči radenie - preferuj query parametre, potom user preferences
    const actualSortBy = sortBy || preferences?.sortBy || "createdAt";
    const actualSortOrder = sortOrder || preferences?.sortOrder || "desc";

    // Zostav orderBy objekt
    let orderBy: Prisma.PropertyOrderByWithRelationInput = { createdAt: "desc" };
    if (actualSortBy === "price") {
      orderBy = { price: actualSortOrder === "desc" ? "desc" : "asc" };
    } else if (actualSortBy === "area") {
      orderBy = { area_m2: actualSortOrder === "desc" ? "desc" : "asc" };
    } else if (actualSortBy === "createdAt") {
      orderBy = { createdAt: actualSortOrder === "desc" ? "desc" : "asc" };
    } else if (actualSortBy === "price_per_m2") {
      orderBy = { price_per_m2: actualSortOrder === "desc" ? "desc" : "asc" };
    }

    // Získaj celkový počet
    const totalCount = await prisma.property.count({ where });

    // Načítaj nehnuteľnosti s filtrami a stránkovaním
    const properties = await prisma.property.findMany({
      where,
      include: {
        investmentMetrics: true,
        priceHistory: {
          orderBy: { recorded_at: "desc" },
          take: 1,
        },
      },
      skip,
      take: limit,
      orderBy,
    });

    // Filtruj podľa výnosu (ak je zadaný)
    let filteredProperties = properties;
    if (minYield || maxYield) {
      filteredProperties = filteredProperties.filter((p) => {
        const yieldValue = p.investmentMetrics?.gross_yield;
        if (!yieldValue) return !minYield; // Ak nie je yield, vráť len ak nie je minYield
        if (minYield && yieldValue < parseFloat(minYield)) return false;
        if (maxYield && yieldValue > parseFloat(maxYield)) return false;
        return true;
      });
    }

    return NextResponse.json({
      success: true,
      data: filteredProperties,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasMore: page * limit < totalCount,
      },
    });
  } catch (error) {
    console.error("Error fetching filtered properties:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
