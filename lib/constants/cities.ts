/**
 * Slovak cities data with investment metrics
 * Used across the application for consistent data
 */

export interface CityData {
  readonly name: string;
  readonly slug: string;
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

export const SLOVAK_CITIES: readonly CityData[] = [
  {
    name: "Bratislava",
    slug: "bratislava",
    // Southwest - bottom-left area (48.15°N, 17.11°E)
    // Based on actual map coordinates: ~91px x, ~448px y in 1000x492 viewBox
    coordinates: { x: 9, y: 91 },
    metrics: {
      avgPrice: 3200,
      yield: 4.7,
      properties: 1247,
    },
  },
  {
    name: "Košice",
    slug: "kosice",
    // Far East - right side (48.72°N, 21.26°E)
    coordinates: { x: 91, y: 55 },
    metrics: {
      avgPrice: 1850,
      yield: 5.3,
      properties: 892,
    },
  },
  {
    name: "Prešov",
    slug: "presov",
    // Northeast - top-right (49.00°N, 21.24°E)
    coordinates: { x: 91, y: 9 },
    metrics: {
      avgPrice: 1650,
      yield: 5.5,
      properties: 456,
    },
  },
  {
    name: "Žilina",
    slug: "zilina",
    // North - top-center (49.22°N, 18.74°E)
    coordinates: { x: 45, y: 25 },
    metrics: {
      avgPrice: 1950,
      yield: 5.1,
      properties: 623,
    },
  },
  {
    name: "Banská Bystrica",
    slug: "banska-bystrica",
    // Center (48.74°N, 19.15°E)
    coordinates: { x: 55, y: 55 },
    metrics: {
      avgPrice: 1750,
      yield: 5.4,
      properties: 389,
    },
  },
  {
    name: "Trnava",
    slug: "trnava",
    // West - left-center (48.38°N, 17.59°E)
    coordinates: { x: 12, y: 80 },
    metrics: {
      avgPrice: 2100,
      yield: 4.9,
      properties: 512,
    },
  },
  {
    name: "Trenčín",
    slug: "trencin",
    // Northwest - top-left (48.89°N, 18.04°E)
    coordinates: { x: 30, y: 45 },
    metrics: {
      avgPrice: 1900,
      yield: 5.2,
      properties: 445,
    },
  },
  {
    name: "Nitra",
    slug: "nitra",
    // Southwest - left-center, below Trnava (48.31°N, 18.09°E)
    coordinates: { x: 15, y: 85 },
    metrics: {
      avgPrice: 1650,
      yield: 5.7,
      properties: 456,
    },
  },
] as const;
