/**
 * Slovak regions (kraje) data
 * Used for displaying regions on the map
 */

export interface RegionData {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly labelPosition: {
    readonly x: number; // Percentage from left (0-100)
    readonly y: number; // Percentage from top (0-100)
  };
}

export const SLOVAK_REGIONS: readonly RegionData[] = [
  {
    id: "SKBL",
    name: "Bratislavský",
    slug: "bratislavsky",
    labelPosition: { x: 9.87, y: 68.6 },
  },
  {
    id: "SKTA",
    name: "Trnavský",
    slug: "trnavsky",
    labelPosition: { x: 17.63, y: 62.7 },
  },
  {
    id: "SKNI",
    name: "Nitriansky",
    slug: "nitriansky",
    labelPosition: { x: 26.9, y: 77.4 },
  },
  {
    id: "SKTC",
    name: "Trenčiansky",
    slug: "trenciansky",
    labelPosition: { x: 26.7, y: 39.9 },
  },
  {
    id: "SKZI",
    name: "Žilinský",
    slug: "zilinsky",
    labelPosition: { x: 41.54, y: 27.5 },
  },
  {
    id: "SKBC",
    name: "Banskobystrický",
    slug: "banskobystricky",
    labelPosition: { x: 47.34, y: 55.5 },
  },
  {
    id: "SKPV",
    name: "Prešovský",
    slug: "presovsky",
    labelPosition: { x: 74.29, y: 27.3 },
  },
  {
    id: "SKKI",
    name: "Košický",
    slug: "kosicky",
    labelPosition: { x: 71.77, y: 48.9 },
  },
] as const;
