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
        include: {
          priceHistory: {
            orderBy: { recorded_at: "desc" },
            take: 10, // Posledných 10 zmien
          },
        },
      });

      if (!property) {
        return NextResponse.json({ error: "Property not found" }, { status: 404 });
      }

      // Vypočítame dni v ponuke
      const firstListed = property.first_listed_at || property.createdAt;
      const daysOnMarket = Math.floor(
        (Date.now() - new Date(firstListed).getTime()) / (1000 * 60 * 60 * 24)
      );

      // Najnovšia zmena ceny
      const latestPriceChange = property.priceHistory[0];
      const previousPrice = property.priceHistory[1];
      
      let priceChangeInfo = null;
      if (latestPriceChange && previousPrice) {
        const priceDiff = latestPriceChange.price - previousPrice.price;
        const priceDiffPercent = ((priceDiff / previousPrice.price) * 100);
        const daysSinceChange = Math.floor(
          (Date.now() - new Date(latestPriceChange.recorded_at).getTime()) / (1000 * 60 * 60 * 24)
        );

        priceChangeInfo = {
          price_diff: priceDiff,
          price_diff_percent: priceDiffPercent,
          days_since_change: daysSinceChange,
          changed_at: latestPriceChange.recorded_at,
        };
      }

      return NextResponse.json({
        success: true,
        data: {
          propertyId: property.id,
          days_on_market: daysOnMarket,
          first_listed_at: firstListed,
          current_price: property.price,
          current_price_per_m2: property.price_per_m2,
          price_change: priceChangeInfo,
          price_history: property.priceHistory,
        },
      });
    }

    // Use specific city param OR filtered cities from regions/districts
    const citiesToFilter = city ? [city] : uniqueCities;
    
    if (citiesToFilter.length > 0) {
      // Získame všetky nehnuteľnosti v mestách s liquidity dátami
      const properties = await prisma.property.findMany({
        where: {
          status: "ACTIVE",
          city: { in: citiesToFilter },
        },
        include: {
          priceHistory: {
            orderBy: { recorded_at: "desc" },
            take: 1,
          },
        },
        orderBy: {
          days_on_market: "desc",
        },
        take: 50,
      });

      const liquidityData = properties.map((property) => {
        const firstListed = property.first_listed_at || property.createdAt;
        const daysOnMarket = Math.floor(
          (Date.now() - new Date(firstListed).getTime()) / (1000 * 60 * 60 * 24)
        );

        const latestPriceChange = property.priceHistory[0];
        let priceChangeInfo = null;

        if (latestPriceChange) {
          // Porovnáme s aktuálnou cenou
          const priceDiff = property.price - latestPriceChange.price;
          const priceDiffPercent = latestPriceChange.price > 0 
            ? ((priceDiff / latestPriceChange.price) * 100) 
            : 0;
          const daysSinceChange = Math.floor(
            (Date.now() - new Date(latestPriceChange.recorded_at).getTime()) / (1000 * 60 * 60 * 24)
          );

          priceChangeInfo = {
            price_diff: priceDiff,
            price_diff_percent: priceDiffPercent,
            days_since_change: daysSinceChange,
            changed_at: latestPriceChange.recorded_at,
          };
        }

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
    const whereClause: Prisma.PropertyWhereInput = { status: "ACTIVE" };
    if (uniqueCities.length > 0) {
      whereClause.city = { in: uniqueCities };
    }

    const allProperties = await prisma.property.findMany({
      where: whereClause,
      include: {
        priceHistory: {
          orderBy: { recorded_at: "desc" },
          take: 1,
        },
      },
      orderBy: {
        createdAt: "asc", // Oldest first
      },
      take: 500,
    });

    // Calculate days on market for each property and filter those 60+ days
    const liquidityData = allProperties
      .map((property) => {
        const firstListed = property.first_listed_at || property.createdAt;
        const daysOnMarket = property.days_on_market || Math.floor(
          (Date.now() - new Date(firstListed).getTime()) / (1000 * 60 * 60 * 24)
        );

        const latestPriceChange = property.priceHistory[0];
        let priceChangeInfo = null;

        if (latestPriceChange) {
          const priceDiff = property.price - latestPriceChange.price;
          const priceDiffPercent = latestPriceChange.price > 0 
            ? ((priceDiff / latestPriceChange.price) * 100) 
            : 0;
          const daysSinceChange = Math.floor(
            (Date.now() - new Date(latestPriceChange.recorded_at).getTime()) / (1000 * 60 * 60 * 24)
          );

          priceChangeInfo = {
            price_diff: priceDiff,
            price_diff_percent: priceDiffPercent,
            days_since_change: daysSinceChange,
            changed_at: latestPriceChange.recorded_at,
          };
        }

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
