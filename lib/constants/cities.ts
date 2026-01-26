/**
 * Centralized city utilities for Slovak real estate
 * All city-related logic should use these constants and functions
 */

// All tracked Slovak cities with their coordinates
export interface CityInfo {
  name: string;
  nameNormalized: string; // Uppercase without diacritics
  lat: number;
  lng: number;
  region: string;
  population?: number;
}

export const SLOVAK_CITIES: CityInfo[] = [
  // Major cities
  { name: "Bratislava", nameNormalized: "BRATISLAVA", lat: 48.1486, lng: 17.1077, region: "Bratislavský", population: 440000 },
  { name: "Košice", nameNormalized: "KOSICE", lat: 48.7164, lng: 21.2611, region: "Košický", population: 240000 },
  { name: "Prešov", nameNormalized: "PRESOV", lat: 48.9986, lng: 21.2391, region: "Prešovský", population: 90000 },
  { name: "Žilina", nameNormalized: "ZILINA", lat: 49.2231, lng: 18.7394, region: "Žilinský", population: 85000 },
  { name: "Banská Bystrica", nameNormalized: "BANSKA BYSTRICA", lat: 48.7364, lng: 19.1458, region: "Banskobystrický", population: 78000 },
  { name: "Nitra", nameNormalized: "NITRA", lat: 48.3061, lng: 18.0833, region: "Nitriansky", population: 77000 },
  { name: "Trnava", nameNormalized: "TRNAVA", lat: 48.3774, lng: 17.5883, region: "Trnavský", population: 65000 },
  { name: "Trenčín", nameNormalized: "TRENCIN", lat: 48.8945, lng: 18.0444, region: "Trenčiansky", population: 55000 },
  { name: "Martin", nameNormalized: "MARTIN", lat: 49.0636, lng: 18.9214, region: "Žilinský", population: 55000 },
  { name: "Poprad", nameNormalized: "POPRAD", lat: 49.0512, lng: 20.2943, region: "Prešovský", population: 52000 },
  
  // Medium cities
  { name: "Prievidza", nameNormalized: "PRIEVIDZA", lat: 48.7747, lng: 18.6244, region: "Trenčiansky", population: 46000 },
  { name: "Zvolen", nameNormalized: "ZVOLEN", lat: 48.5744, lng: 19.1236, region: "Banskobystrický", population: 43000 },
  { name: "Považská Bystrica", nameNormalized: "POVAZSKA BYSTRICA", lat: 49.1214, lng: 18.4264, region: "Trenčiansky", population: 40000 },
  { name: "Michalovce", nameNormalized: "MICHALOVCE", lat: 48.7547, lng: 21.9186, region: "Košický", population: 40000 },
  { name: "Komárno", nameNormalized: "KOMARNO", lat: 47.7631, lng: 18.1203, region: "Nitriansky", population: 35000 },
  { name: "Levice", nameNormalized: "LEVICE", lat: 48.2164, lng: 18.6006, region: "Nitriansky", population: 35000 },
  { name: "Spišská Nová Ves", nameNormalized: "SPISSKA NOVA VES", lat: 48.9464, lng: 20.5611, region: "Košický", population: 35000 },
  { name: "Humenné", nameNormalized: "HUMENNE", lat: 48.9314, lng: 21.9064, region: "Prešovský", population: 34000 },
  { name: "Piešťany", nameNormalized: "PIESTANY", lat: 48.7947, lng: 17.8382, region: "Trnavský", population: 29000 },
  { name: "Lučenec", nameNormalized: "LUCENEC", lat: 48.3314, lng: 19.6667, region: "Banskobystrický", population: 28000 },
  
  // Smaller cities and towns (important for real estate)
  { name: "Senec", nameNormalized: "SENEC", lat: 48.2197, lng: 17.4000, region: "Bratislavský", population: 20000 },
  { name: "Pezinok", nameNormalized: "PEZINOK", lat: 48.2897, lng: 17.2667, region: "Bratislavský", population: 23000 },
  { name: "Malacky", nameNormalized: "MALACKY", lat: 48.4361, lng: 17.0239, region: "Bratislavský", population: 18000 },
  { name: "Dunajská Streda", nameNormalized: "DUNAJSKA STREDA", lat: 47.9936, lng: 17.6183, region: "Trnavský", population: 23000 },
  { name: "Galanta", nameNormalized: "GALANTA", lat: 48.1903, lng: 17.7306, region: "Trnavský", population: 16000 },
  { name: "Šaľa", nameNormalized: "SALA", lat: 48.1519, lng: 17.8758, region: "Nitriansky", population: 23000 },
  { name: "Liptovský Mikuláš", nameNormalized: "LIPTOVSKY MIKULAS", lat: 49.0839, lng: 19.6121, region: "Žilinský", population: 32000 },
  { name: "Ružomberok", nameNormalized: "RUZOMBEROK", lat: 49.0778, lng: 19.3069, region: "Žilinský", population: 28000 },
  { name: "Dolný Kubín", nameNormalized: "DOLNY KUBIN", lat: 49.2094, lng: 19.2958, region: "Žilinský", population: 20000 },
  { name: "Čadca", nameNormalized: "CADCA", lat: 49.4378, lng: 18.7878, region: "Žilinský", population: 25000 },
  { name: "Brezno", nameNormalized: "BREZNO", lat: 48.8064, lng: 19.6361, region: "Banskobystrický", population: 22000 },
  { name: "Rimavská Sobota", nameNormalized: "RIMAVSKA SOBOTA", lat: 48.3817, lng: 20.0214, region: "Banskobystrický", population: 24000 },
  { name: "Bardejov", nameNormalized: "BARDEJOV", lat: 49.2919, lng: 21.2769, region: "Prešovský", population: 33000 },
  { name: "Vranov nad Topľou", nameNormalized: "VRANOV NAD TOPLOU", lat: 48.8842, lng: 21.6861, region: "Prešovský", population: 23000 },
  { name: "Trebišov", nameNormalized: "TREBISOV", lat: 48.6289, lng: 21.7181, region: "Košický", population: 24000 },
  { name: "Rožňava", nameNormalized: "ROZNAVA", lat: 48.6600, lng: 20.5319, region: "Košický", population: 19000 },
  { name: "Snina", nameNormalized: "SNINA", lat: 48.9878, lng: 22.1492, region: "Prešovský", population: 21000 },
  { name: "Bytča", nameNormalized: "BYTCA", lat: 49.2236, lng: 18.5583, region: "Žilinský", population: 11000 },
  { name: "Sereď", nameNormalized: "SERED", lat: 48.2847, lng: 17.7328, region: "Trnavský", population: 16000 },
  { name: "Detva", nameNormalized: "DETVA", lat: 48.5578, lng: 19.4211, region: "Banskobystrický", population: 14000 },
  { name: "Kráľovičove Kračany", nameNormalized: "KRALOVICOVE KRACANY", lat: 47.9936, lng: 17.5500, region: "Trnavský", population: 1500 },
  { name: "Senica", nameNormalized: "SENICA", lat: 48.6786, lng: 17.3669, region: "Trnavský", population: 20000 },
  { name: "Skalica", nameNormalized: "SKALICA", lat: 48.8453, lng: 17.2269, region: "Trnavský", population: 15000 },
  { name: "Hlohovec", nameNormalized: "HLOHOVEC", lat: 48.4314, lng: 17.8028, region: "Trnavský", population: 22000 },
  { name: "Nové Zámky", nameNormalized: "NOVE ZAMKY", lat: 47.9858, lng: 18.1619, region: "Nitriansky", population: 40000 },
  { name: "Topoľčany", nameNormalized: "TOPOLCANY", lat: 48.5558, lng: 18.1775, region: "Nitriansky", population: 26000 },
  { name: "Partizánske", nameNormalized: "PARTIZANSKE", lat: 48.6278, lng: 18.3836, region: "Trenčiansky", population: 24000 },
  { name: "Dubnica nad Váhom", nameNormalized: "DUBNICA NAD VAHOM", lat: 48.9628, lng: 18.1753, region: "Trenčiansky", population: 25000 },
  { name: "Púchov", nameNormalized: "PUCHOV", lat: 49.1203, lng: 18.3269, region: "Trenčiansky", population: 18000 },
  { name: "Handlová", nameNormalized: "HANDLOVA", lat: 48.7289, lng: 18.7611, region: "Trenčiansky", population: 17000 },
  { name: "Žiar nad Hronom", nameNormalized: "ZIAR NAD HRONOM", lat: 48.5894, lng: 18.8539, region: "Banskobystrický", population: 19000 },
  { name: "Banská Štiavnica", nameNormalized: "BANSKA STIAVNICA", lat: 48.4589, lng: 18.8953, region: "Banskobystrický", population: 10000 },
  { name: "Kežmarok", nameNormalized: "KEZMAROK", lat: 49.1364, lng: 20.4306, region: "Prešovský", population: 17000 },
  { name: "Stará Ľubovňa", nameNormalized: "STARA LUBOVNA", lat: 49.2986, lng: 20.6847, region: "Prešovský", population: 16000 },
  { name: "Svidník", nameNormalized: "SVIDNIK", lat: 49.3053, lng: 21.5694, region: "Prešovský", population: 12000 },
  { name: "Medzilaborce", nameNormalized: "MEDZILABORCE", lat: 49.2697, lng: 21.9047, region: "Prešovský", population: 6000 },
  { name: "Sobrance", nameNormalized: "SOBRANCE", lat: 48.7461, lng: 22.1800, region: "Košický", population: 6000 },
  { name: "Gelnica", nameNormalized: "GELNICA", lat: 48.8536, lng: 20.9317, region: "Košický", population: 6000 },
  { name: "Moldava nad Bodvou", nameNormalized: "MOLDAVA NAD BODVOU", lat: 48.6106, lng: 20.9989, region: "Košický", population: 11000 },
  
  // Bratislava suburbs (important for real estate)
  { name: "Stupava", nameNormalized: "STUPAVA", lat: 48.2756, lng: 17.0317, region: "Bratislavský", population: 12000 },
  { name: "Svätý Jur", nameNormalized: "SVATY JUR", lat: 48.2525, lng: 17.2158, region: "Bratislavský", population: 6000 },
  { name: "Modra", nameNormalized: "MODRA", lat: 48.3350, lng: 17.3111, region: "Bratislavský", population: 9000 },
  { name: "Bernolákovo", nameNormalized: "BERNOLAKOVO", lat: 48.1986, lng: 17.3003, region: "Bratislavský", population: 8000 },
  { name: "Ivanka pri Dunaji", nameNormalized: "IVANKA PRI DUNAJI", lat: 48.1853, lng: 17.2572, region: "Bratislavský", population: 6000 },
  { name: "Most pri Bratislave", nameNormalized: "MOST PRI BRATISLAVE", lat: 48.1022, lng: 17.2850, region: "Bratislavský", population: 5000 },
  { name: "Chorvátsky Grob", nameNormalized: "CHORVATSKY GROB", lat: 48.2175, lng: 17.3056, region: "Bratislavský", population: 7000 },
  { name: "Miloslavov", nameNormalized: "MILOSLAVOV", lat: 48.0903, lng: 17.2997, region: "Bratislavský", population: 4000 },
  { name: "Rovinka", nameNormalized: "ROVINKA", lat: 48.0903, lng: 17.2258, region: "Bratislavský", population: 4000 },
  { name: "Dunajská Lužná", nameNormalized: "DUNAJSKA LUZNA", lat: 48.0756, lng: 17.2528, region: "Bratislavský", population: 6000 },
  { name: "Šamorín", nameNormalized: "SAMORIN", lat: 48.0292, lng: 17.3089, region: "Trnavský", population: 13000 },
  { name: "Tomášov", nameNormalized: "TOMASOV", lat: 48.1422, lng: 17.3325, region: "Bratislavský", population: 3000 },
];

// Map of normalized names -> proper city names
const CITY_NAME_MAP: Record<string, string> = {};
const CITY_COORDS_MAP: Record<string, { lat: number; lng: number }> = {};

// Build lookup maps
for (const city of SLOVAK_CITIES) {
  CITY_NAME_MAP[city.nameNormalized] = city.name;
  CITY_COORDS_MAP[city.name] = { lat: city.lat, lng: city.lng };
}

// Common variations and aliases
const CITY_ALIASES: Record<string, string> = {
  // Uppercase variations
  "BA": "Bratislava",
  "KE": "Košice",
  "PO": "Prešov",
  "ZA": "Žilina",
  "BB": "Banská Bystrica",
  "NR": "Nitra",
  "TT": "Trnava",
  "TN": "Trenčín",
  
  // Common misspellings and variations
  "BRATISLAVA I": "Bratislava",
  "BRATISLAVA II": "Bratislava",
  "BRATISLAVA III": "Bratislava",
  "BRATISLAVA IV": "Bratislava",
  "BRATISLAVA V": "Bratislava",
  "BRATISLAVA - STARE MESTO": "Bratislava",
  "BRATISLAVA - RUZINOV": "Bratislava",
  "BRATISLAVA - PETRZALKA": "Bratislava",
  "BRATISLAVA - NOVE MESTO": "Bratislava",
  "BRATISLAVA - DUBRAVKA": "Bratislava",
  "BRATISLAVA - KARLOVA VES": "Bratislava",
  "BRATISLAVA - DEVINSKA NOVA VES": "Bratislava",
  "BRATISLAVA - LAMAC": "Bratislava",
  "BRATISLAVA - VRAKUNA": "Bratislava",
  "BRATISLAVA - PODUNAJSKE BISKUPICE": "Bratislava",
  "BRATISLAVA - RACA": "Bratislava",
  "BRATISLAVA - VAJNORY": "Bratislava",
  "BRATISLAVA - DEVIN": "Bratislava",
  "BRATISLAVA - ZAHORSKA BYSTRICA": "Bratislava",
  "BRATISLAVA - CUNOVO": "Bratislava",
  "BRATISLAVA - RUSOVCE": "Bratislava",
  "BRATISLAVA - JAROVCE": "Bratislava",
  
  "KOSICE I": "Košice",
  "KOSICE II": "Košice",
  "KOSICE III": "Košice",
  "KOSICE IV": "Košice",
  "KOSICE - STARE MESTO": "Košice",
  "KOSICE - JUH": "Košice",
  "KOSICE - SEVER": "Košice",
  "KOSICE - ZAPAD": "Košice",
  "KOSICE - SACA": "Košice",
  "KOSICE - SIDLISKO TAHANOVCE": "Košice",
  
  // Without diacritics variations
  "BANSKA BYSTRICA": "Banská Bystrica",
  "TRENCIN": "Trenčín",
  "ZILINA": "Žilina",
  "KOSICE": "Košice",
  "PRESOV": "Prešov",
  "PIESTANY": "Piešťany",
  "DUNAJSKA STREDA": "Dunajská Streda",
  "LIPTOVSKY MIKULAS": "Liptovský Mikuláš",
  "RUZOMBEROK": "Ružomberok",
  "DOLNY KUBIN": "Dolný Kubín",
  "CADCA": "Čadca",
  "LUCENEC": "Lučenec",
  "RIMAVSKA SOBOTA": "Rimavská Sobota",
  "SPISSKA NOVA VES": "Spišská Nová Ves",
  "NOVE ZAMKY": "Nové Zámky",
  "TOPOLCANY": "Topoľčany",
  "POVAZSKA BYSTRICA": "Považská Bystrica",
  "DUBNICA NAD VAHOM": "Dubnica nad Váhom",
  "PUCHOV": "Púchov",
  "HANDLOVA": "Handlová",
  "ZIAR NAD HRONOM": "Žiar nad Hronom",
  "BANSKA STIAVNICA": "Banská Štiavnica",
  "KEZMAROK": "Kežmarok",
  "STARA LUBOVNA": "Stará Ľubovňa",
  "SVIDNIK": "Svidník",
  "HUMENNE": "Humenné",
  "VRANOV NAD TOPLOU": "Vranov nad Topľou",
  "TREBISOV": "Trebišov",
  "ROZNAVA": "Rožňava",
  "PARTIZANSKE": "Partizánske",
  "PRIEVIDZA": "Prievidza",
  "KOMARNO": "Komárno",
  "SALA": "Šaľa",
  "GALANTA": "Galanta",
  "HLOHOVEC": "Hlohovec",
  "SENICA": "Senica",
  "SKALICA": "Skalica",
  "MEDZILABORCE": "Medzilaborce",
  "SOBRANCE": "Sobrance",
  "GELNICA": "Gelnica",
  "MOLDAVA NAD BODVOU": "Moldava nad Bodvou",
  "STUPAVA": "Stupava",
  "SVATY JUR": "Svätý Jur",
  "MODRA": "Modra",
  "BERNOLAKOVO": "Bernolákovo",
  "IVANKA PRI DUNAJI": "Ivanka pri Dunaji",
  "MOST PRI BRATISLAVE": "Most pri Bratislave",
  "CHORVATSKY GROB": "Chorvátsky Grob",
  "MILOSLAVOV": "Miloslavov",
  "ROVINKA": "Rovinka",
  "DUNAJSKA LUZNA": "Dunajská Lužná",
  "SAMORIN": "Šamorín",
  "TOMASOV": "Tomášov",
  "SNINA": "Snina",
  "MICHALOVCE": "Michalovce",
  "BARDEJOV": "Bardejov",
  "LEVICE": "Levice",
  "ZVOLEN": "Zvolen",
  "BREZNO": "Brezno",
  "BYTCA": "Bytča",
  "SERED": "Sereď",
  "DETVA": "Detva",
  "KRALOVICOVE KRACANY": "Kráľovičove Kračany",
  
  // Garbage/invalid values - map to empty (will be ignored)
  "SLOVENSKO": "",
  "PREMIUM": "",
  "NOVA": "",
  "3": "",
  "3": "",
  "": "",
};

/**
 * Normalize a city name to its standard form
 * @param city - Raw city name from any source
 * @returns Normalized city name with proper diacritics, or empty string if invalid
 */
export function normalizeCityName(city: string | null | undefined): string {
  if (!city || typeof city !== "string") return "";
  
  // Clean and uppercase
  const cleaned = city
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove diacritics
    .replace(/[^A-Z0-9\s\-]/g, "") // Remove special chars except spaces and hyphens
    .replace(/\s+/g, " ") // Normalize spaces
    .trim();
  
  if (!cleaned) return "";
  
  // Check aliases first (handles district names, abbreviations, garbage)
  if (CITY_ALIASES[cleaned] !== undefined) {
    return CITY_ALIASES[cleaned];
  }
  
  // Check if it's a known normalized name
  if (CITY_NAME_MAP[cleaned]) {
    return CITY_NAME_MAP[cleaned];
  }
  
  // Try partial matching for district names like "Bratislava - Ružinov"
  for (const [alias, normalized] of Object.entries(CITY_ALIASES)) {
    if (cleaned.includes(alias) || alias.includes(cleaned)) {
      return normalized;
    }
  }
  
  // Try to find in SLOVAK_CITIES by partial match
  for (const cityInfo of SLOVAK_CITIES) {
    if (cleaned === cityInfo.nameNormalized) {
      return cityInfo.name;
    }
  }
  
  // If nothing matches, return the original (capitalized properly)
  // This allows new cities to be tracked even if not in our list
  const words = city.trim().split(/\s+/);
  return words
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

/**
 * Get coordinates for a city
 * @param city - City name (will be normalized)
 * @returns Coordinates or null if not found
 */
export function getCityCoordinates(city: string): { lat: number; lng: number } | null {
  const normalized = normalizeCityName(city);
  if (!normalized) return null;
  
  const coords = CITY_COORDS_MAP[normalized];
  if (coords) return coords;
  
  // Fallback: try to find similar city
  for (const cityInfo of SLOVAK_CITIES) {
    if (cityInfo.name.toLowerCase().includes(normalized.toLowerCase()) ||
        normalized.toLowerCase().includes(cityInfo.name.toLowerCase())) {
      return { lat: cityInfo.lat, lng: cityInfo.lng };
    }
  }
  
  return null;
}

/**
 * Get city info including region and population
 */
export function getCityInfo(city: string): CityInfo | null {
  const normalized = normalizeCityName(city);
  if (!normalized) return null;
  
  return SLOVAK_CITIES.find(c => c.name === normalized) || null;
}

/**
 * Get all major cities (population > 30000)
 */
export function getMajorCities(): CityInfo[] {
  return SLOVAK_CITIES.filter(c => (c.population || 0) >= 30000);
}

/**
 * Get all cities for a region
 */
export function getCitiesByRegion(region: string): CityInfo[] {
  return SLOVAK_CITIES.filter(c => c.region === region);
}

/**
 * Check if a city name is valid (in our database)
 */
export function isValidCity(city: string): boolean {
  const normalized = normalizeCityName(city);
  return normalized !== "" && SLOVAK_CITIES.some(c => c.name === normalized);
}

/**
 * Get the closest major city to given coordinates
 */
export function getClosestCity(lat: number, lng: number): CityInfo | null {
  let closest: CityInfo | null = null;
  let minDistance = Infinity;
  
  for (const city of SLOVAK_CITIES) {
    const distance = Math.sqrt(
      Math.pow(lat - city.lat, 2) + Math.pow(lng - city.lng, 2)
    );
    if (distance < minDistance) {
      minDistance = distance;
      closest = city;
    }
  }
  
  return closest;
}

// Export the cities array for map display
export const TRACKED_CITIES = SLOVAK_CITIES.filter(c => (c.population || 0) >= 10000);

// Export city name map for quick lookups
export { CITY_NAME_MAP, CITY_COORDS_MAP, CITY_ALIASES };
