import { z } from "zod";

// Property validation schemas
export const propertyFilterSchema = z.object({
  city: z.enum([
    "BRATISLAVA",
    "KOSICE",
    "PRESOV",
    "ZILINA",
    "BANSKA_BYSTRICA",
    "TRNAVA",
    "TRENCIN",
    "NITRA",
  ]).optional(),
  minYield: z.number().min(0).max(100).optional(),
  maxYield: z.number().min(0).max(100).optional(),
  minRooms: z.number().int().positive().optional(),
  maxRooms: z.number().int().positive().optional(),
  minPrice: z.number().positive().optional(),
  maxPrice: z.number().positive().optional(),
  isDistressed: z.boolean().optional(),
});

export const propertyCreateSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  city: z.enum([
    "BRATISLAVA",
    "KOSICE",
    "PRESOV",
    "ZILINA",
    "BANSKA_BYSTRICA",
    "TRNAVA",
    "TRENCIN",
    "NITRA",
  ]),
  district: z.string().min(1),
  address: z.string().min(1),
  price: z.number().positive(),
  area_m2: z.number().positive(),
  rooms: z.number().int().positive().optional(),
  floor: z.number().int().optional(),
  condition: z.enum(["POVODNY", "REKONSTRUKCIA", "NOVOSTAVBA"]),
  energy_certificate: z.enum(["A", "B", "C", "D", "E", "F", "G", "NONE"]),
  source_url: z.string().url().optional(),
  is_distressed: z.boolean().default(false),
});

export type PropertyFilterInput = z.infer<typeof propertyFilterSchema>;
export type PropertyCreateInput = z.infer<typeof propertyCreateSchema>;
