/**
 * All 79 Slovak districts (okresy) with coordinates
 * Used as fallback for villages not in main cities list
 */

export interface DistrictInfo {
  name: string;
  nameNormalized: string;
  region: string;
  lat: number;
  lng: number;
  mainCity: string; // The district center
}

export const SLOVAK_DISTRICTS: DistrictInfo[] = [
  // Bratislavský kraj
  { name: "Bratislava I", nameNormalized: "BRATISLAVA I", region: "Bratislavský", lat: 48.1486, lng: 17.1077, mainCity: "Bratislava" },
  { name: "Bratislava II", nameNormalized: "BRATISLAVA II", region: "Bratislavský", lat: 48.1550, lng: 17.1675, mainCity: "Bratislava" },
  { name: "Bratislava III", nameNormalized: "BRATISLAVA III", region: "Bratislavský", lat: 48.1750, lng: 17.0583, mainCity: "Bratislava" },
  { name: "Bratislava IV", nameNormalized: "BRATISLAVA IV", region: "Bratislavský", lat: 48.1947, lng: 17.0522, mainCity: "Bratislava" },
  { name: "Bratislava V", nameNormalized: "BRATISLAVA V", region: "Bratislavský", lat: 48.1089, lng: 17.1075, mainCity: "Bratislava" },
  { name: "Malacky", nameNormalized: "MALACKY", region: "Bratislavský", lat: 48.4361, lng: 17.0239, mainCity: "Malacky" },
  { name: "Pezinok", nameNormalized: "PEZINOK", region: "Bratislavský", lat: 48.2897, lng: 17.2667, mainCity: "Pezinok" },
  { name: "Senec", nameNormalized: "SENEC", region: "Bratislavský", lat: 48.2197, lng: 17.4000, mainCity: "Senec" },

  // Trnavský kraj
  { name: "Dunajská Streda", nameNormalized: "DUNAJSKA STREDA", region: "Trnavský", lat: 47.9936, lng: 17.6183, mainCity: "Dunajská Streda" },
  { name: "Galanta", nameNormalized: "GALANTA", region: "Trnavský", lat: 48.1903, lng: 17.7306, mainCity: "Galanta" },
  { name: "Hlohovec", nameNormalized: "HLOHOVEC", region: "Trnavský", lat: 48.4314, lng: 17.8028, mainCity: "Hlohovec" },
  { name: "Piešťany", nameNormalized: "PIESTANY", region: "Trnavský", lat: 48.7947, lng: 17.8382, mainCity: "Piešťany" },
  { name: "Senica", nameNormalized: "SENICA", region: "Trnavský", lat: 48.6786, lng: 17.3669, mainCity: "Senica" },
  { name: "Skalica", nameNormalized: "SKALICA", region: "Trnavský", lat: 48.8453, lng: 17.2269, mainCity: "Skalica" },
  { name: "Trnava", nameNormalized: "TRNAVA", region: "Trnavský", lat: 48.3774, lng: 17.5883, mainCity: "Trnava" },

  // Trenčiansky kraj
  { name: "Bánovce nad Bebravou", nameNormalized: "BANOVCE NAD BEBRAVOU", region: "Trenčiansky", lat: 48.7189, lng: 18.2583, mainCity: "Bánovce nad Bebravou" },
  { name: "Ilava", nameNormalized: "ILAVA", region: "Trenčiansky", lat: 48.9997, lng: 18.2331, mainCity: "Ilava" },
  { name: "Myjava", nameNormalized: "MYJAVA", region: "Trenčiansky", lat: 48.7553, lng: 17.5681, mainCity: "Myjava" },
  { name: "Nové Mesto nad Váhom", nameNormalized: "NOVE MESTO NAD VAHOM", region: "Trenčiansky", lat: 48.7572, lng: 17.8300, mainCity: "Nové Mesto nad Váhom" },
  { name: "Partizánske", nameNormalized: "PARTIZANSKE", region: "Trenčiansky", lat: 48.6278, lng: 18.3836, mainCity: "Partizánske" },
  { name: "Považská Bystrica", nameNormalized: "POVAZSKA BYSTRICA", region: "Trenčiansky", lat: 49.1214, lng: 18.4264, mainCity: "Považská Bystrica" },
  { name: "Prievidza", nameNormalized: "PRIEVIDZA", region: "Trenčiansky", lat: 48.7747, lng: 18.6244, mainCity: "Prievidza" },
  { name: "Púchov", nameNormalized: "PUCHOV", region: "Trenčiansky", lat: 49.1203, lng: 18.3269, mainCity: "Púchov" },
  { name: "Trenčín", nameNormalized: "TRENCIN", region: "Trenčiansky", lat: 48.8945, lng: 18.0444, mainCity: "Trenčín" },

  // Nitriansky kraj
  { name: "Komárno", nameNormalized: "KOMARNO", region: "Nitriansky", lat: 47.7631, lng: 18.1203, mainCity: "Komárno" },
  { name: "Levice", nameNormalized: "LEVICE", region: "Nitriansky", lat: 48.2164, lng: 18.6006, mainCity: "Levice" },
  { name: "Nitra", nameNormalized: "NITRA", region: "Nitriansky", lat: 48.3061, lng: 18.0833, mainCity: "Nitra" },
  { name: "Nové Zámky", nameNormalized: "NOVE ZAMKY", region: "Nitriansky", lat: 47.9858, lng: 18.1619, mainCity: "Nové Zámky" },
  { name: "Šaľa", nameNormalized: "SALA", region: "Nitriansky", lat: 48.1519, lng: 17.8758, mainCity: "Šaľa" },
  { name: "Topoľčany", nameNormalized: "TOPOLCANY", region: "Nitriansky", lat: 48.5558, lng: 18.1775, mainCity: "Topoľčany" },
  { name: "Zlaté Moravce", nameNormalized: "ZLATE MORAVCE", region: "Nitriansky", lat: 48.3847, lng: 18.3953, mainCity: "Zlaté Moravce" },

  // Žilinský kraj
  { name: "Bytča", nameNormalized: "BYTCA", region: "Žilinský", lat: 49.2236, lng: 18.5583, mainCity: "Bytča" },
  { name: "Čadca", nameNormalized: "CADCA", region: "Žilinský", lat: 49.4378, lng: 18.7878, mainCity: "Čadca" },
  { name: "Dolný Kubín", nameNormalized: "DOLNY KUBIN", region: "Žilinský", lat: 49.2094, lng: 19.2958, mainCity: "Dolný Kubín" },
  { name: "Kysucké Nové Mesto", nameNormalized: "KYSUCKE NOVE MESTO", region: "Žilinský", lat: 49.2997, lng: 18.7878, mainCity: "Kysucké Nové Mesto" },
  { name: "Liptovský Mikuláš", nameNormalized: "LIPTOVSKY MIKULAS", region: "Žilinský", lat: 49.0839, lng: 19.6121, mainCity: "Liptovský Mikuláš" },
  { name: "Martin", nameNormalized: "MARTIN", region: "Žilinský", lat: 49.0636, lng: 18.9214, mainCity: "Martin" },
  { name: "Námestovo", nameNormalized: "NAMESTOVO", region: "Žilinský", lat: 49.4072, lng: 19.4786, mainCity: "Námestovo" },
  { name: "Ružomberok", nameNormalized: "RUZOMBEROK", region: "Žilinský", lat: 49.0778, lng: 19.3069, mainCity: "Ružomberok" },
  { name: "Turčianske Teplice", nameNormalized: "TURCIANSKE TEPLICE", region: "Žilinský", lat: 48.8622, lng: 18.8611, mainCity: "Turčianske Teplice" },
  { name: "Tvrdošín", nameNormalized: "TVRDOSIN", region: "Žilinský", lat: 49.3356, lng: 19.5561, mainCity: "Tvrdošín" },
  { name: "Žilina", nameNormalized: "ZILINA", region: "Žilinský", lat: 49.2231, lng: 18.7394, mainCity: "Žilina" },

  // Banskobystrický kraj
  { name: "Banská Bystrica", nameNormalized: "BANSKA BYSTRICA", region: "Banskobystrický", lat: 48.7364, lng: 19.1458, mainCity: "Banská Bystrica" },
  { name: "Banská Štiavnica", nameNormalized: "BANSKA STIAVNICA", region: "Banskobystrický", lat: 48.4589, lng: 18.8953, mainCity: "Banská Štiavnica" },
  { name: "Brezno", nameNormalized: "BREZNO", region: "Banskobystrický", lat: 48.8064, lng: 19.6361, mainCity: "Brezno" },
  { name: "Detva", nameNormalized: "DETVA", region: "Banskobystrický", lat: 48.5578, lng: 19.4211, mainCity: "Detva" },
  { name: "Krupina", nameNormalized: "KRUPINA", region: "Banskobystrický", lat: 48.3511, lng: 19.0672, mainCity: "Krupina" },
  { name: "Lučenec", nameNormalized: "LUCENEC", region: "Banskobystrický", lat: 48.3314, lng: 19.6667, mainCity: "Lučenec" },
  { name: "Poltár", nameNormalized: "POLTAR", region: "Banskobystrický", lat: 48.4303, lng: 19.7911, mainCity: "Poltár" },
  { name: "Revúca", nameNormalized: "REVUCA", region: "Banskobystrický", lat: 48.6831, lng: 20.1167, mainCity: "Revúca" },
  { name: "Rimavská Sobota", nameNormalized: "RIMAVSKA SOBOTA", region: "Banskobystrický", lat: 48.3817, lng: 20.0214, mainCity: "Rimavská Sobota" },
  { name: "Veľký Krtíš", nameNormalized: "VELKY KRTIS", region: "Banskobystrický", lat: 48.2089, lng: 19.3386, mainCity: "Veľký Krtíš" },
  { name: "Zvolen", nameNormalized: "ZVOLEN", region: "Banskobystrický", lat: 48.5744, lng: 19.1236, mainCity: "Zvolen" },
  { name: "Žarnovica", nameNormalized: "ZARNOVICA", region: "Banskobystrický", lat: 48.4847, lng: 18.7178, mainCity: "Žarnovica" },
  { name: "Žiar nad Hronom", nameNormalized: "ZIAR NAD HRONOM", region: "Banskobystrický", lat: 48.5894, lng: 18.8539, mainCity: "Žiar nad Hronom" },

  // Prešovský kraj
  { name: "Bardejov", nameNormalized: "BARDEJOV", region: "Prešovský", lat: 49.2919, lng: 21.2769, mainCity: "Bardejov" },
  { name: "Humenné", nameNormalized: "HUMENNE", region: "Prešovský", lat: 48.9314, lng: 21.9064, mainCity: "Humenné" },
  { name: "Kežmarok", nameNormalized: "KEZMAROK", region: "Prešovský", lat: 49.1364, lng: 20.4306, mainCity: "Kežmarok" },
  { name: "Levoča", nameNormalized: "LEVOCA", region: "Prešovský", lat: 49.0258, lng: 20.5883, mainCity: "Levoča" },
  { name: "Medzilaborce", nameNormalized: "MEDZILABORCE", region: "Prešovský", lat: 49.2697, lng: 21.9047, mainCity: "Medzilaborce" },
  { name: "Poprad", nameNormalized: "POPRAD", region: "Prešovský", lat: 49.0512, lng: 20.2943, mainCity: "Poprad" },
  { name: "Prešov", nameNormalized: "PRESOV", region: "Prešovský", lat: 48.9986, lng: 21.2391, mainCity: "Prešov" },
  { name: "Sabinov", nameNormalized: "SABINOV", region: "Prešovský", lat: 49.1028, lng: 21.0953, mainCity: "Sabinov" },
  { name: "Snina", nameNormalized: "SNINA", region: "Prešovský", lat: 48.9878, lng: 22.1492, mainCity: "Snina" },
  { name: "Stará Ľubovňa", nameNormalized: "STARA LUBOVNA", region: "Prešovský", lat: 49.2986, lng: 20.6847, mainCity: "Stará Ľubovňa" },
  { name: "Stropkov", nameNormalized: "STROPKOV", region: "Prešovský", lat: 49.2019, lng: 21.6511, mainCity: "Stropkov" },
  { name: "Svidník", nameNormalized: "SVIDNIK", region: "Prešovský", lat: 49.3053, lng: 21.5694, mainCity: "Svidník" },
  { name: "Vranov nad Topľou", nameNormalized: "VRANOV NAD TOPLOU", region: "Prešovský", lat: 48.8842, lng: 21.6861, mainCity: "Vranov nad Topľou" },

  // Košický kraj
  { name: "Gelnica", nameNormalized: "GELNICA", region: "Košický", lat: 48.8536, lng: 20.9317, mainCity: "Gelnica" },
  { name: "Košice I", nameNormalized: "KOSICE I", region: "Košický", lat: 48.7164, lng: 21.2611, mainCity: "Košice" },
  { name: "Košice II", nameNormalized: "KOSICE II", region: "Košický", lat: 48.7300, lng: 21.2500, mainCity: "Košice" },
  { name: "Košice III", nameNormalized: "KOSICE III", region: "Košický", lat: 48.7050, lng: 21.2700, mainCity: "Košice" },
  { name: "Košice IV", nameNormalized: "KOSICE IV", region: "Košický", lat: 48.6900, lng: 21.2400, mainCity: "Košice" },
  { name: "Košice-okolie", nameNormalized: "KOSICE-OKOLIE", region: "Košický", lat: 48.7000, lng: 21.2000, mainCity: "Košice" },
  { name: "Michalovce", nameNormalized: "MICHALOVCE", region: "Košický", lat: 48.7547, lng: 21.9186, mainCity: "Michalovce" },
  { name: "Rožňava", nameNormalized: "ROZNAVA", region: "Košický", lat: 48.6600, lng: 20.5319, mainCity: "Rožňava" },
  { name: "Sobrance", nameNormalized: "SOBRANCE", region: "Košický", lat: 48.7461, lng: 22.1800, mainCity: "Sobrance" },
  { name: "Spišská Nová Ves", nameNormalized: "SPISSKA NOVA VES", region: "Košický", lat: 48.9464, lng: 20.5611, mainCity: "Spišská Nová Ves" },
  { name: "Trebišov", nameNormalized: "TREBISOV", region: "Košický", lat: 48.6289, lng: 21.7181, mainCity: "Trebišov" },
];

// Build lookup map
const DISTRICT_MAP: Record<string, DistrictInfo> = {};
for (const district of SLOVAK_DISTRICTS) {
  DISTRICT_MAP[district.nameNormalized] = district;
  // Also add without diacritics
  const withoutDiacritics = district.name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
  if (withoutDiacritics !== district.nameNormalized) {
    DISTRICT_MAP[withoutDiacritics] = district;
  }
}

/**
 * Get district info by name
 */
export function getDistrictInfo(name: string): DistrictInfo | null {
  const normalized = name
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
  return DISTRICT_MAP[normalized] || null;
}

/**
 * Get district coordinates
 */
export function getDistrictCoordinates(name: string): { lat: number; lng: number } | null {
  const district = getDistrictInfo(name);
  return district ? { lat: district.lat, lng: district.lng } : null;
}

export { DISTRICT_MAP };
