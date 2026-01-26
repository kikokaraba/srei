import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const city = searchParams.get("city");
    const area = parseFloat(searchParams.get("area") || "0");
    const price = parseFloat(searchParams.get("price") || "0");

    if (!city) {
      return NextResponse.json({ error: "City is required" }, { status: 400 });
    }

    // Get all properties in the same city
    const properties = await prisma.property.findMany({
      where: {
        city: { contains: city, mode: "insensitive" },
        listing_type: "PREDAJ",
      },
      select: {
        price_per_m2: true,
        price: true,
        area_m2: true,
      },
    });

    if (properties.length === 0) {
      return NextResponse.json({
        success: true,
        data: null,
      });
    }

    // Calculate statistics
    const pricesPerM2 = properties.map(p => p.price_per_m2).sort((a, b) => a - b);
    const sum = pricesPerM2.reduce((acc, val) => acc + val, 0);
    const avgPricePerM2 = sum / pricesPerM2.length;
    const medianPricePerM2 = pricesPerM2[Math.floor(pricesPerM2.length / 2)];

    // If we have a specific property's price, compare it
    let propertyVsAvg = 0;
    let position = "average";

    if (price && area) {
      const propertyPricePerM2 = price / area;
      propertyVsAvg = ((propertyPricePerM2 - avgPricePerM2) / avgPricePerM2) * 100;

      if (propertyVsAvg < -10) {
        position = "cheap";
      } else if (propertyVsAvg > 10) {
        position = "expensive";
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        avgPricePerM2: Math.round(avgPricePerM2),
        medianPricePerM2: Math.round(medianPricePerM2),
        propertyCount: properties.length,
        propertyVsAvg,
        position,
      },
    });
  } catch (error) {
    console.error("Error fetching market comparison:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
