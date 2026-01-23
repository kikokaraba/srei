import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const GAP_THRESHOLD = 15; // 15% pod priemerom = podhodnotená

export async function GET() {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Najprv aktualizujeme StreetAnalytics pre všetky ulice
    await updateStreetAnalytics();

    // Nájdeme všetky nehnuteľnosti, ktoré ešte nemajú MarketGap záznam
    const properties = await prisma.property.findMany({
      where: {
        street: { not: null },
        marketGaps: { none: {} }, // Ešte nemá detekovaný gap
      },
      include: {
        investmentMetrics: true,
      },
    });

    const detectedGaps = [];

    for (const property of properties) {
      if (!property.street) continue;

      // Nájdeme StreetAnalytics pre túto ulicu
      const streetAnalytics = await prisma.streetAnalytics.findUnique({
        where: {
          city_district_street: {
            city: property.city,
            district: property.district,
            street: property.street,
          },
        },
      });

      if (!streetAnalytics || streetAnalytics.property_count < 3) {
        // Potrebujeme aspoň 3 nehnuteľnosti pre spoľahlivú analýzu
        continue;
      }

      // Vypočítame gap percentage
      const avgPricePerM2 = streetAnalytics.avg_price_m2;
      const propertyPricePerM2 = property.price_per_m2;
      const gapPercentage = ((avgPricePerM2 - propertyPricePerM2) / avgPricePerM2) * 100;

      // Ak je gap väčší ako threshold, vytvoríme MarketGap záznam
      if (gapPercentage >= GAP_THRESHOLD) {
        // Odhadovaný potenciálny zisk pri flipe (konzervatívny odhad 80% z gapu)
        const potentialProfit = (gapPercentage / 100) * property.price * 0.8;

        const marketGap = await prisma.marketGap.create({
          data: {
            propertyId: property.id,
            gap_percentage: gapPercentage,
            potential_profit: potentialProfit,
            street_avg_price: avgPricePerM2,
          },
        });

        detectedGaps.push({
          ...marketGap,
          property: {
            id: property.id,
            title: property.title,
            address: property.address,
            price: property.price,
            price_per_m2: property.price_per_m2,
            area_m2: property.area_m2,
            rooms: property.rooms,
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: detectedGaps,
      count: detectedGaps.length,
    });
  } catch (error) {
    console.error("Market gaps error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Pomocná funkcia na aktualizáciu StreetAnalytics
async function updateStreetAnalytics() {
  const streets = await prisma.property.groupBy({
    by: ["city", "district", "street"],
    where: {
      street: { not: null },
    },
    _avg: {
      price_per_m2: true,
    },
    _count: {
      id: true,
    },
  });

  for (const street of streets) {
    if (!street.street || street._count.id < 3) continue;

    // Vypočítame median (pre presnejšiu analýzu)
    const properties = await prisma.property.findMany({
      where: {
        city: street.city,
        district: street.district,
        street: street.street,
      },
      select: {
        price_per_m2: true,
      },
      orderBy: {
        price_per_m2: "asc",
      },
    });

    const medianIndex = Math.floor(properties.length / 2);
    const medianPrice = properties[medianIndex]?.price_per_m2 || street._avg.price_per_m2 || 0;

    await prisma.streetAnalytics.upsert({
      where: {
        city_district_street: {
          city: street.city,
          district: street.district,
          street: street.street,
        },
      },
      update: {
        avg_price_m2: street._avg.price_per_m2 || 0,
        median_price_m2: medianPrice,
        property_count: street._count.id,
        last_updated: new Date(),
      },
      create: {
        city: street.city,
        district: street.district,
        street: street.street,
        avg_price_m2: street._avg.price_per_m2 || 0,
        median_price_m2: medianPrice,
        property_count: street._count.id,
      },
    });
  }
}
