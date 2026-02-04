import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** Mestá/hodnoty, ktoré nepovažujeme za konkrétne mesto – neporovnávame podľa nich. */
const GENERIC_CITY_VALUES = new Set([
  "",
  "unknown",
  "neznáme",
  "slovensko",
  "sr",
  "okres",
  "iné",
]);

function isValidConcreteCity(city: string): boolean {
  const normalized = city.trim().toLowerCase();
  if (normalized.length < 2) return false;
  if (GENERIC_CITY_VALUES.has(normalized)) return false;
  return true;
}

/**
 * Duplicity = tá istá nehnuteľnosť na viacerých portáloch.
 * 1) Ak má nehnuteľnosť fingerprint: vráť len záznamy s rovnakým fingerprintHash (skutočná tá istá nehnuteľnosť).
 * 2) Ak nemá fingerprint: vráť len pri prísnej zhode mesto + okres (ak sú) + plocha ±10 % + cena ±15 % + izby.
 *    Ak mesto nie je konkrétne (prázdne, Unknown, Slovensko…), nič nevráť – aby sa nezobrazovali „partneri“ z rôznych miest.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const property = await prisma.property.findUnique({
      where: { id },
      include: {
        fingerprint: true,
      },
    });

    if (!property) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    type DuplicateRow = { id: string; source: string; price: number; title: string; source_url: string | null; city: string; district: string };
    let similarProperties: DuplicateRow[] = [];

    // 1) Prefer fingerprint: len skutočné duplicity (rovnaká nehnuteľnosť, iný portál)
    if (property.fingerprint?.fingerprintHash) {
      const sameFingerprint = await prisma.propertyFingerprint.findMany({
        where: {
          fingerprintHash: property.fingerprint.fingerprintHash,
          propertyId: { not: property.id },
        },
        select: {
          property: {
            select: {
              id: true,
              source: true,
              price: true,
              title: true,
              source_url: true,
              city: true,
              district: true,
            },
          },
        },
      });
      similarProperties = sameFingerprint.map((fp) => fp.property);
    } else {
      // 2) Bez fingerprintu: prísna podobnosť – len to isté mesto (a okres ak je), inak žiadne „partneri“
      if (!isValidConcreteCity(property.city)) {
        return NextResponse.json({
          success: true,
          data: null,
        });
      }

      const areaMin = property.area_m2 * 0.9;
      const areaMax = property.area_m2 * 1.1;
      const priceMin = property.price * 0.85;
      const priceMax = property.price * 1.15;

      const districtTrimmed = property.district?.trim();
      const candidates = await prisma.property.findMany({
        where: {
          id: { not: property.id },
          city: { equals: property.city, mode: "insensitive" },
          area_m2: { gte: areaMin, lte: areaMax },
          price: { gte: priceMin, lte: priceMax },
          ...(property.rooms != null ? { rooms: property.rooms } : {}),
          ...(districtTrimmed ? { district: { equals: property.district, mode: "insensitive" as const } } : {}),
        },
        select: {
          id: true,
          source: true,
          price: true,
          title: true,
          source_url: true,
          city: true,
          district: true,
        },
      });

      // Vyfiltruj kandidátov, ktorí majú tiež platné konkrétne mesto (nie generické) a rovnaké mesto
      const cityNorm = property.city.trim().toLowerCase();
      similarProperties = candidates
        .filter((p) => {
          if (!isValidConcreteCity(p.city)) return false;
          if (p.city.trim().toLowerCase() !== cityNorm) return false;
          return true;
        })
        .map(({ id: pid, source, price, title, source_url, city, district }) => ({
          id: pid,
          source,
          price,
          title,
          source_url,
          city,
          district,
        }));
    }

    if (similarProperties.length === 0) {
      return NextResponse.json({
        success: true,
        data: null,
      });
    }

    const allPrices = [property.price, ...similarProperties.map((p) => p.price)];
    const minPrice = Math.min(...allPrices);
    const maxPrice = Math.max(...allPrices);
    const sources = [...new Set([property.source, ...similarProperties.map((p) => p.source)])];

    const data = {
      count: similarProperties.length + 1,
      sources,
      priceRange: {
        min: minPrice,
        max: maxPrice,
      },
      savings: property.price > minPrice ? property.price - minPrice : null,
      duplicates: similarProperties,
    };

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Error fetching duplicates:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
