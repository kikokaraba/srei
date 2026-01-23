import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SlovakCity } from "@/generated/prisma/client";

export async function GET(request: Request) {
  try {
    // Skontrolujeme session - ak nie je, vrátime prázdne dáta namiesto 401
    const session = await auth();
    if (!session) {
      // V production vracame prázdne dáta namiesto 401, aby frontend nemal chyby
      return NextResponse.json({
        success: true,
        data: [],
      });
    }

    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get("propertyId");
    const city = searchParams.get("city");

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

    if (city) {
      // Získame všetky nehnuteľnosti v meste s liquidity dátami
      const properties = await prisma.property.findMany({
        where: {
          city: city as SlovakCity,
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

    // Ak nie je zadaný propertyId ani city, vrátime všetky nehnuteľnosti s vysokým days_on_market
    const longListedProperties = await prisma.property.findMany({
      where: {
        days_on_market: {
          gte: 60, // Viac ako 60 dní v ponuke
        },
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
      take: 100,
    });

    const liquidityData = longListedProperties.map((property) => {
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
    });

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
