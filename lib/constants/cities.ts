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
    coordinates: { x: 15, y: 75 },
    metrics: {
      avgPrice: 3200,
      yield: 4.7,
      properties: 1247,
    },
  },
  {
    name: "Košice",
    slug: "kosice",
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
    coordinates: { x: 80, y: 45 },
    metrics: {
      avgPrice: 1650,
      yield: 5.5,
      properties: 456,
    },
  },
  {
    name: "Žilina",
    slug: "zilina",
    coordinates: { x: 35, y: 35 },
    metrics: {
      avgPrice: 1950,
      yield: 5.1,
      properties: 623,
    },
  },
  {
    name: "Banská Bystrica",
    slug: "banska-bystrica",
    coordinates: { x: 50, y: 50 },
    metrics: {
      avgPrice: 1750,
      yield: 5.4,
      properties: 389,
    },
  },
  {
    name: "Trnava",
    slug: "trnava",
    coordinates: { x: 25, y: 70 },
    metrics: {
      avgPrice: 2100,
      yield: 4.9,
      properties: 512,
    },
  },
  {
    name: "Trenčín",
    slug: "trencin",
    coordinates: { x: 30, y: 55 },
    metrics: {
      avgPrice: 1900,
      yield: 5.2,
      properties: 445,
    },
  },
  {
    name: "Nitra",
    slug: "nitra",
    coordinates: { x: 30, y: 80 },
    metrics: {
      avgPrice: 1650,
      yield: 5.7,
      properties: 456,
    },
  },
] as const;
