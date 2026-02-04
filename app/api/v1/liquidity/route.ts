import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { REGIONS, DISTRICTS } from "@/lib/constants/slovakia-locations";

export async function GET(request: Request) {
  try {
    // Auth check removed - public endpoint for dashboard widgets
    // Return data for all users (can be filtered by user preferences later)
    // const session = await auth();
    // if (!session) {
    //   return NextResponse.json({
    //     success: true,
    //     data: [],
    //   });
    // }

    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get("propertyId");
    const city = searchParams.get("city");
    const regionsParam = searchParams.get("regions");
    const districtsParam = searchParams.get("districts");
    const citiesParam = searchParams.get("cities");
    
    // Build city filter from regions, districts, and cities
    const allCities: string[] = [];
    
    if (regionsParam) {
      const regionIds = regionsParam.split(",").filter(Boolean);
      for (const regionId of regionIds) {
        const region = REGIONS[regionId];
        if (region) {
          for (const districtId of region.districts) {
            const district = DISTRICTS[districtId];
            if (district?.cities) {
              allCities.push(...district.cities);
            }
          }
        }
      }
    }
    
    if (districtsParam) {
      const districtIds = districtsParam.split(",").filter(Boolean);
      for (const districtId of districtIds) {
        const district = DISTRICTS[districtId];
        if (district?.cities) {
          allCities.push(...district.cities);
        }
      }
    }
    
    if (citiesParam) {
      allCities.push(...citiesParam.split(",").filter(Boolean));
    }
    
    // Remove duplicates
    const uniqueCities = [...new Set(allCities)];

    if (propertyId) {
      // Získame liquidity dáta pre konkrétnu nehnuteľnosť
      const property = await prisma.property.findUnique({
        where: { id: propertyId },
        select: {
          id: true,
          title: true,
          address: true,
          price: true,
          price_per_m2: true,
          createdAt: true,
          days_on_market: true,
        },
      });

      if (!property) {
        return NextResponse.json({ error: "Property not found" }, { status: 404 });
      }

      // Vypočítame dni v ponuke (first_listed_at may not exist)
      const firstListed = property.createdAt;
      const daysOnMarket = Math.floor(
        (Date.now() - new Date(firstListed).getTime()) / (1000 * 60 * 60 * 24)
      );

      // Price history not available in database yet
      const priceChangeInfo = null;

      return NextResponse.json({
        success: true,
        data: {
          propertyId: property.id,
          days_on_market: daysOnMarket,
          first_listed_at: firstListed,
          current_price: property.price,
          current_price_per_m2: property.price_per_m2,
          price_change: priceChangeInfo,
          price_history: [], // priceHistory not available yet
        },
      });
    }

    // Use specific city param OR filtered cities from regions/districts
    const citiesToFilter = city ? [city] : uniqueCities;
    
    if (citiesToFilter.length > 0) {
      // Získame všetky nehnuteľnosti v mestách s liquidity dátami
      const properties = await prisma.property.findMany({
        where: {
          city: { in: citiesToFilter },
        },
        select: {
          id: true,
          title: true,
          address: true,
          city: true,
          price: true,
          createdAt: true,
          days_on_market: true,
        },
        orderBy: {
          days_on_market: "desc",
        },
        take: 50,
      });

      const liquidityData = properties.map((property) => {
        // first_listed_at may not exist
        const firstListed = property.createdAt;
        const daysOnMarket = Math.floor(
          (Date.now() - new Date(firstListed).getTime()) / (1000 * 60 * 60 * 24)
        );

        // Price change info not available until PriceHistory table is populated
        const priceChangeInfo = null;

        return {
          propertyId: property.id,
          title: property.title,
          address: property.address,
          days_on_market: daysOnMarket,
          current_price: property.price,
          price_change: priceChangeInfo,
        };
      });

      return NextResponse.json({
        success: true,
        data: liquidityData,
        count: liquidityData.length,
      });
    }

    // Ak nie je zadaný propertyId ani city, vrátime nehnuteľnosti s dlhým časom na trhu
    const whereClause: Prisma.PropertyWhereInput = {};
    if (uniqueCities.length > 0) {
      whereClause.city = { in: uniqueCities };
    }

    const allProperties = await prisma.property.findMany({
      where: whereClause,
      select: {
        id: true,
        title: true,
        address: true,
        city: true,
        price: true,
        createdAt: true,
        first_listed_at: true,
        days_on_market: true,
      },
      orderBy: {
        createdAt: "asc", // Oldest first
      },
      take: 500,
    });

    // Calculate days on market for each property and filter those 60+ days
    const liquidityData = allProperties
      .map((property) => {
        // first_listed_at may not exist
        const firstListed = property.createdAt;
        const daysOnMarket = property.days_on_market || Math.floor(
          (Date.now() - new Date(firstListed).getTime()) / (1000 * 60 * 60 * 24)
        );

        // Price change info not available until PriceHistory table is populated
        const priceChangeInfo = null;

        return {
          propertyId: property.id,
          title: property.title,
          address: property.address,
          city: property.city,
          days_on_market: daysOnMarket,
          current_price: property.price,
          price_change: priceChangeInfo,
        };
      })
      .filter(p => p.days_on_market >= 60)
      .sort((a, b) => b.days_on_market - a.days_on_market)
      .slice(0, 100);

    return NextResponse.json({
      success: true,
      data: liquidityData,
      count: liquidityData.length,
    });
  } catch (error) {
    console.error("Liquidity tracker error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
