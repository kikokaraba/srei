import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Slovenské mestá pre extrakciu
const SLOVAK_CITIES = [
  "Bratislava", "Košice", "Prešov", "Žilina", "Nitra", "Banská Bystrica", 
  "Trnava", "Trenčín", "Martin", "Poprad", "Zvolen", "Považská Bystrica",
  "Michalovce", "Spišská Nová Ves", "Komárno", "Levice", "Humenné",
  "Bardejov", "Liptovský Mikuláš", "Ružomberok", "Piešťany", "Topoľčany",
  "Dubnica nad Váhom", "Čadca", "Dunajská Streda", "Skalica", "Pezinok",
  "Senec", "Malacky", "Galanta", "Šaľa", "Nové Zámky", "Partizánske",
  "Hlohovec", "Senica", "Myjava", "Nové Mesto nad Váhom", "Púchov",
  "Prievidza", "Handlová", "Žiar nad Hronom", "Brezno", "Lučenec",
  "Rimavská Sobota", "Veľký Krtíš", "Kežmarok", "Stará Ľubovňa",
  "Svidník", "Snina", "Vranov nad Topľou", "Trebišov", "Rožňava",
  "Sobrance", "Dolný Kubín", "Námestovo", "Tvrdošín"
];

function parseSlovakAddress(raw: string, sourceUrl?: string, title?: string): {
  city: string;
  district: string | null;
  street: string | null;
} {
  let city = "Slovensko";
  let district: string | null = null;
  let street: string | null = null;

  // 1. Parsuj z adresy
  if (raw) {
    const segments = raw.split(",").map(s => s.trim());
    
    // Hľadaj mesto v segmentoch
    for (const segment of segments) {
      for (const knownCity of SLOVAK_CITIES) {
        if (segment.toLowerCase().includes(knownCity.toLowerCase())) {
          city = knownCity;
          break;
        }
      }
      if (city !== "Slovensko") break;
    }
    
    // Prvá časť môže byť "Mesto - Štvrť"
    const cityPart = segments[0];
    const citySegments = cityPart.split(" - ").map(s => s.trim());
    
    if (citySegments.length > 1) {
      // Hľadaj mesto v prvej časti
      for (const knownCity of SLOVAK_CITIES) {
        if (citySegments[0].toLowerCase().includes(knownCity.toLowerCase())) {
          city = knownCity;
          district = citySegments[1];
          break;
        }
      }
    }
    
    // Ulica je zvyčajne posledná časť
    if (segments.length > 1) {
      street = segments[segments.length - 1];
    }
  }

  // 2. Fallback - extrahuj z URL
  if (city === "Slovensko" && sourceUrl) {
    const cityMap: Record<string, string> = {
      "bratislava": "Bratislava",
      "kosice": "Košice", 
      "zilina": "Žilina",
      "presov": "Prešov",
      "nitra": "Nitra",
      "trnava": "Trnava",
      "trencin": "Trenčín",
      "banska-bystrica": "Banská Bystrica",
      "martin": "Martin",
      "poprad": "Poprad"
    };
    
    const lower = sourceUrl.toLowerCase();
    for (const [key, value] of Object.entries(cityMap)) {
      if (lower.includes(`/${key}/`) || lower.includes(`/${key}-`)) {
        city = value;
        break;
      }
    }
  }

  // 3. Fallback - extrahuj z titulku
  if (city === "Slovensko" && title) {
    const lower = title.toLowerCase();
    for (const knownCity of SLOVAK_CITIES) {
      if (lower.includes(knownCity.toLowerCase())) {
        city = knownCity;
        break;
      }
    }
  }

  return { city, district, street };
}

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Nájdi VŠETKY záznamy a oprav ich
    const properties = await prisma.property.findMany({
      select: {
        id: true,
        address: true,
        source_url: true,
        title: true,
        city: true,
        district: true,
        street: true,
      }
    });

    console.log(`🔧 [FixLocations] Found ${properties.length} properties to fix`);

    let fixed = 0;
    let skipped = 0;

    for (const prop of properties) {
      const parsed = parseSlovakAddress(prop.address, prop.source_url || undefined, prop.title);
      
      // Aktualizuj ak sme našli mesto alebo ak aktuálne mesto je "Slovensko"/prázdne
      const needsFix = parsed.city !== "Slovensko" || 
                       prop.city === "Slovensko" || 
                       !prop.city || 
                       prop.city === "";
      
      if (parsed.city !== "Slovensko") {
        await prisma.property.update({
          where: { id: prop.id },
          data: {
            city: parsed.city,
            district: parsed.district || prop.district || "",
            street: parsed.street || prop.street,
          }
        });
        fixed++;
        console.log(`✅ Fixed: ${prop.title?.substring(0, 40)} → ${parsed.city}, ${parsed.district || ""}`);
      } else {
        skipped++;
      }
    }

    return NextResponse.json({
      success: true,
      total: properties.length,
      fixed,
      skipped,
      message: `Fixed ${fixed} of ${properties.length} properties`
    });

  } catch (error) {
    console.error("Fix locations error:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    usage: "POST /api/admin/fix-locations",
    description: "Opraví mesto/okres/ulica pre existujúce záznamy"
  });
}
