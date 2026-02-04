import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma, PropertyCondition, EnergyCertificate, ListingType, PropertySource } from "@/generated/prisma/client";
import { REGIONS, DISTRICTS } from "@/lib/constants/slovakia-locations";

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
    const limit = Math.min(500, Math.max(1, parseInt(searchParams.get("limit") || "12", 10) || 12));
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const skip = (page - 1) * limit;

    // Priame filtre z query parametrov
    const cityParam = searchParams.get("city");
    const citiesParam = searchParams.get("cities"); // Podpora pre viac miest
    const listingTypeParam = searchParams.get("listingType"); // PREDAJ alebo PRENAJOM
    const sourceParam = searchParams.get("source"); // BAZOS, NEHNUTELNOSTI, REALITY, TOPREALITY
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
    const propertyTypeParam = searchParams.get("propertyType")?.trim() ?? "";

    // Načítaj preferencie používateľa len ak je to vyžiadané
    const preferences = useUserPreferences
      ? await prisma.userPreferences.findUnique({
          where: { userId: session.user.id },
        })
      : null;

    // Zostav filter - prioritne z query parametrov, potom z preferencií
    const where: Prisma.PropertyWhereInput = { status: "ACTIVE" };

    // Vyhľadávanie v názve a adrese
    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { address: { contains: search, mode: "insensitive" } },
        { district: { contains: search, mode: "insensitive" } },
      ];
    }

    const VALID_LISTING: ListingType[] = ["PREDAJ", "PRENAJOM"];
    const VALID_SOURCES: PropertySource[] = ["BAZOS", "NEHNUTELNOSTI", "REALITY", "TOPREALITY", "MANUAL"];

    if (listingTypeParam) {
      const types = listingTypeParam.split(",").filter(Boolean).filter((t): t is ListingType => VALID_LISTING.includes(t as ListingType));
      if (types.length > 0) {
        where.listing_type = { in: types };
      }
    }

    if (sourceParam) {
      const sources = sourceParam.split(",").filter(Boolean).filter((s): s is PropertySource => VALID_SOURCES.includes(s as PropertySource));
      if (sources.length > 0) {
        where.source = { in: sources };
      }
    }

    // Kategória: zobrazujeme len keď je explicitne zvolený typ (momentálne len Byty); inak prázdny zoznam
    if (propertyTypeParam === "BYT") {
      where.property_type = "BYT";
    } else {
      if (!where.AND) where.AND = [];
      (where.AND as Prisma.PropertyWhereInput[]).push({ id: { in: [] } });
    }

    // Mesto - prioritne z query, potom z preferencií (regióny + okresy + mestá)
    // Case-insensitive matching - databáza má "Bratislava" ale frontend môže poslať "BRATISLAVA"
    const citiesInput = citiesParam || cityParam;
    if (citiesInput) {
      // Podporuje viac miest oddelených čiarkou
      const cities = citiesInput.split(",").filter(Boolean);
      if (cities.length > 0) {
        // Normalize city names for case-insensitive matching
        // Build AND condition for cities (if any city matches)
        const cityConditions = cities.map(city => ({
          city: { contains: city.toLowerCase(), mode: "insensitive" as const }
        }));
        
        // Combine with existing where using AND
        if (!where.AND) where.AND = [];
        (where.AND as Prisma.PropertyWhereInput[]).push({
          OR: cityConditions
        });
      }
    } else if (preferences) {
      // Rozšír regióny a okresy na mestá
      const allCities: string[] = [];
      
      // Pridaj mestá z regiónov
      if (preferences.trackedRegions) {
        try {
          const regionIds = JSON.parse(preferences.trackedRegions) as string[];
          for (const regionId of regionIds) {
            const region = REGIONS[regionId];
            if (region) {
              // Získaj všetky mestá v regióne cez okresy
              for (const districtId of region.districts) {
                const district = DISTRICTS[districtId];
                if (district?.cities) {
                  allCities.push(...district.cities);
                }
              }
            }
          }
        } catch { /* ignore parse errors */ }
      }
      
      // Pridaj mestá z okresov
      if (preferences.trackedDistricts) {
        try {
          const districtIds = JSON.parse(preferences.trackedDistricts) as string[];
          for (const districtId of districtIds) {
            const district = DISTRICTS[districtId];
            if (district?.cities) {
              allCities.push(...district.cities);
            }
          }
        } catch { /* ignore parse errors */ }
      }
      
      // Pridaj priamo sledované mestá
      if (preferences.trackedCities) {
        try {
          const cities = JSON.parse(preferences.trackedCities) as string[];
          allCities.push(...cities);
        } catch { /* ignore parse errors */ }
      }
      
      // Ak sú nejaké mestá, filtruj podľa nich (case-insensitive)
      if (allCities.length > 0) {
        // Odstráň duplicity
        const uniqueCities = [...new Set(allCities)];
        const cityConditions = uniqueCities.map(city => ({
          city: { contains: city.toLowerCase(), mode: "insensitive" as const }
        }));
        
        if (!where.AND) where.AND = [];
        (where.AND as Prisma.PropertyWhereInput[]).push({
          OR: cityConditions
        });
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

    const VALID_CONDITIONS: PropertyCondition[] = ["POVODNY", "REKONSTRUKCIA", "NOVOSTAVBA"];

    if (conditionParam) {
      const conditions = conditionParam.split(",").filter(Boolean).filter((c): c is PropertyCondition => VALID_CONDITIONS.includes(c as PropertyCondition));
      if (conditions.length > 0) {
        where.condition = { in: conditions };
      }
    } else if (preferences?.condition) {
      try {
        const raw = preferences.condition?.trim();
        if (raw) {
          const parsed = JSON.parse(raw);
          const conditions = Array.isArray(parsed) ? parsed.filter((c): c is PropertyCondition => VALID_CONDITIONS.includes(c as PropertyCondition)) : [];
          if (conditions.length > 0) {
            where.condition = { in: conditions };
          }
        }
      } catch {
        /* skip condition filter on invalid JSON */
      }
    }

    // Distressed
    if (onlyDistressed) {
      where.is_distressed = true;
    } else if (preferences?.onlyDistressed) {
      where.is_distressed = true;
    }

    // Výnos – query params majú prednosť, inak preferencie pri usePreferences
    const effectiveMinYield =
      minYield != null && minYield !== ""
        ? parseFloat(minYield)
        : useUserPreferences && preferences
          ? preferences.minYield ?? preferences.minGrossYield ?? null
          : null;
    const effectiveMaxYield =
      maxYield != null && maxYield !== ""
        ? parseFloat(maxYield)
        : useUserPreferences && preferences?.maxYield != null
          ? preferences.maxYield
          : null;
    const minY = effectiveMinYield != null && !Number.isNaN(effectiveMinYield) ? effectiveMinYield : null;
    const maxY = effectiveMaxYield != null && !Number.isNaN(effectiveMaxYield) ? effectiveMaxYield : null;
    if (minY != null || maxY != null) {
      const yieldRange: { gte?: number; lte?: number } = {};
      if (minY != null) yieldRange.gte = minY;
      if (maxY != null) yieldRange.lte = maxY;
      // Zobraz aj nehnuteľnosti bez vypočítaného výnosu (bez investmentMetrics), aby „Môj profil“ nevylúčil väčšinu ponúk
      if (!where.AND) where.AND = [];
      (where.AND as Prisma.PropertyWhereInput[]).push({
        OR: [
          { investmentMetrics: { is: null } },
          { investmentMetrics: { gross_yield: yieldRange } },
        ],
      });
    }

    // Urči radenie – query > user preferences > odvodené z typu investície (investmentTypes)
    let actualSortBy = sortBy || preferences?.sortBy || undefined;
    let actualSortOrder = sortOrder || preferences?.sortOrder || "desc";

    // Ak je radenie predvolené (createdAt alebo neposlané) a máme typ investície, predvolíme radenie podľa stratégie
    const isDefaultSort = !actualSortBy || actualSortBy === "createdAt";
    if (isDefaultSort && useUserPreferences && preferences?.investmentTypes) {
      let investmentTypes: string[] = [];
      try {
        const raw = preferences.investmentTypes;
        investmentTypes = typeof raw === "string" ? (JSON.parse(raw) as string[]) : Array.isArray(raw) ? raw : [];
      } catch {
        /* ignore */
      }
      if (investmentTypes.length > 0) {
        // high-yield / rental → najprv podľa výnosu (najvyšší hore)
        if (investmentTypes.some((t: string) => t === "high-yield" || t === "rental")) {
          actualSortBy = "yield";
          actualSortOrder = "desc";
        }
        // flip → čerstvé ponuky a tie s potenciálom na zmenu ceny (dni v ponuke)
        else if (investmentTypes.some((t: string) => t === "flip")) {
          actualSortBy = "days_on_market";
          actualSortOrder = "asc";
        }
        // stable-growth / future-potential → nové ponuky hore
        else if (investmentTypes.some((t: string) => t === "stable-growth" || t === "future-potential")) {
          actualSortBy = "createdAt";
          actualSortOrder = "desc";
        }
      }
    }
    if (!actualSortBy) actualSortBy = "createdAt";
    if (!actualSortOrder) actualSortOrder = "desc";

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
    } else if (actualSortBy === "yield") {
      orderBy = { investmentMetrics: { gross_yield: actualSortOrder === "desc" ? "desc" : "asc" } };
    } else if (actualSortBy === "days_on_market") {
      orderBy = { days_on_market: actualSortOrder === "desc" ? "desc" : "asc" };
    }

    // Získaj celkový počet
    const totalCount = await prisma.property.count({ where });

    // Pri „Môj profil“ vráť zhrnutie aplikovaných kritérií (pre empty state vo frontende)
    let appliedProfileCriteria: Record<string, unknown> | null = null;
    if (useUserPreferences && preferences) {
      appliedProfileCriteria = {};
      try {
        if (preferences.trackedRegions && JSON.parse(preferences.trackedRegions as string)?.length > 0) appliedProfileCriteria.regions = true;
        if (preferences.trackedDistricts && JSON.parse(preferences.trackedDistricts as string)?.length > 0) appliedProfileCriteria.districts = true;
        if (preferences.trackedCities && JSON.parse(preferences.trackedCities as string)?.length > 0) appliedProfileCriteria.cities = true;
      } catch { /* ignore */ }
      if (preferences.minPrice != null) appliedProfileCriteria.minPrice = preferences.minPrice;
      if (preferences.maxPrice != null) appliedProfileCriteria.maxPrice = preferences.maxPrice;
      if (preferences.minYield != null || preferences.minGrossYield != null) appliedProfileCriteria.minYield = preferences.minYield ?? preferences.minGrossYield;
      if (preferences.maxYield != null || preferences.maxGrossYield != null) appliedProfileCriteria.maxYield = preferences.maxYield ?? preferences.maxGrossYield;
      if (preferences.minArea != null) appliedProfileCriteria.minArea = preferences.minArea;
      if (preferences.maxArea != null) appliedProfileCriteria.maxArea = preferences.maxArea;
      if (preferences.minRooms != null) appliedProfileCriteria.minRooms = preferences.minRooms;
      if (preferences.maxRooms != null) appliedProfileCriteria.maxRooms = preferences.maxRooms;
      if (preferences.onlyDistressed) appliedProfileCriteria.onlyDistressed = true;
    }

    // Načítaj nehnuteľnosti s filtrami a stránkovaním (investmentMetrics pre výnos v UI a filter)
    const properties = await prisma.property.findMany({
      where,
      include: {
        investmentMetrics: true,
      },
      skip,
      take: limit,
      orderBy,
    });

    const json: { success: true; data: typeof properties; pagination: object; appliedProfileCriteria?: Record<string, unknown> } = {
      success: true,
      data: properties,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasMore: page * limit < totalCount,
      },
    };
    if (appliedProfileCriteria && Object.keys(appliedProfileCriteria).length > 0) {
      json.appliedProfileCriteria = appliedProfileCriteria;
    }

    return NextResponse.json(json, {
      headers: {
        'Cache-Control': 'private, s-maxage=60, stale-while-revalidate=120',
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    const code = typeof (error as { code?: string })?.code === "string" ? (error as { code: string }).code : undefined;
    console.error("Error fetching filtered properties:", msg, code ?? "", error);
    return NextResponse.json(
      { success: false, error: "Internal server error", code: code ?? undefined },
      { status: 500 }
    );
  }
}
