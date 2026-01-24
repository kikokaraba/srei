/**
 * Slovak cities data with investment metrics
 * Used across the application for consistent data
 */

export interface CityData {
  readonly name: string;
  readonly slug: string;
  readonly enumValue: string; // Pre Prisma enum (napr. "BRATISLAVA")
  readonly coordinates: {
    readonly x: number; // Percentage from left (0-100)
    readonly y: number; // Percentage from top (0-100)
  };
  readonly metrics: {
    readonly avgPrice: number;
    readonly yield: number;
    readonly properties: number;
  };
}

// Pre selecty a dropdowny (value/label format)
export interface CityOption {
  value: string;
  label: string;
}

/**
 * Konvertuje SLOVAK_CITIES na CityOption[] pre selecty
 * Používa enumValue ako value (pre Prisma kompatibilitu)
 */
export function getCityOptions(): CityOption[] {
  return SLOVAK_CITIES.map((city) => ({
    value: city.enumValue,
    label: city.name,
  }));
}

/**
 * Nájde mesto podľa enum hodnoty (napr. "BRATISLAVA")
 */
export function getCityByEnum(enumValue: string): CityData | undefined {
  return SLOVAK_CITIES.find((city) => city.enumValue === enumValue);
}

/**
 * Nájde mesto podľa slug (napr. "bratislava")
 */
export function getCityBySlug(slug: string): CityData | undefined {
  return SLOVAK_CITIES.find((city) => city.slug === slug);
}

/**
 * Získa názov mesta z enum hodnoty
 */
export function getCityName(enumValue: string): string {
  const city = getCityByEnum(enumValue);
  return city?.name || enumValue;
}

export const SLOVAK_CITIES: readonly CityData[] = [
  {
    name: "Bratislava",
    slug: "bratislava",
    enumValue: "BRATISLAVA",
    coordinates: { x: 12, y: 85 },
    metrics: {
      avgPrice: 3200,
      yield: 4.7,
      properties: 1247,
    },
  },
  {
    name: "Košice",
    slug: "kosice",
    enumValue: "KOSICE",
    coordinates: { x: 85, y: 60 },
    metrics: {
      avgPrice: 1850,
      yield: 5.3,
      properties: 892,
    },
  },
  {
    name: "Prešov",
    slug: "presov",
    enumValue: "PRESOV",
    coordinates: { x: 88, y: 20 },
    metrics: {
      avgPrice: 1650,
      yield: 5.5,
      properties: 456,
    },
  },
  {
    name: "Žilina",
    slug: "zilina",
    enumValue: "ZILINA",
    coordinates: { x: 42, y: 30 },
    metrics: {
      avgPrice: 1950,
      yield: 5.1,
      properties: 623,
    },
  },
  {
    name: "Banská Bystrica",
    slug: "banska-bystrica",
    enumValue: "BANSKA_BYSTRICA",
    coordinates: { x: 52, y: 58 },
    metrics: {
      avgPrice: 1750,
      yield: 5.4,
      properties: 389,
    },
  },
  {
    name: "Trnava",
    slug: "trnava",
    enumValue: "TRNAVA",
    coordinates: { x: 15, y: 75 },
    metrics: {
      avgPrice: 2100,
      yield: 4.9,
      properties: 512,
    },
  },
  {
    name: "Trenčín",
    slug: "trencin",
    enumValue: "TRENCIN",
    coordinates: { x: 28, y: 48 },
    metrics: {
      avgPrice: 1900,
      yield: 5.2,
      properties: 445,
    },
  },
  {
    name: "Nitra",
    slug: "nitra",
    enumValue: "NITRA",
    coordinates: { x: 18, y: 82 },
    metrics: {
      avgPrice: 1650,
      yield: 5.7,
      properties: 456,
    },
  },
] as const;
