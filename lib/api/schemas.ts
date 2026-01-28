/**
 * Zod schémy pre API validáciu
 */

import { z } from "zod";

// ==========================================
// COMMON SCHEMAS
// ==========================================

export const paginationSchema = z.object({
  page: z.string().optional().transform((v) => parseInt(v || "1", 10)),
  limit: z.string().optional().transform((v) => parseInt(v || "20", 10)),
});

export const searchSchema = z.object({
  search: z.string().optional(),
});

// ==========================================
// USER SCHEMAS
// ==========================================

export const userRoleSchema = z.enum(["ADMIN", "PREMIUM_INVESTOR", "FREE_USER", "PARTNER"]);

export const updateUserSchema = z.object({
  userId: z.string().min(1, "User ID je povinné"),
  role: userRoleSchema.optional(),
  name: z.string().optional(),
});

// ==========================================
// PROPERTY SCHEMAS
// ==========================================

export const slovakCitySchema = z.enum([
  "BRATISLAVA",
  "KOSICE",
  "PRESOV",
  "ZILINA",
  "BANSKA_BYSTRICA",
  "TRNAVA",
  "TRENCIN",
  "NITRA",
]);

export const propertyConditionSchema = z.enum([
  "POVODNY",
  "REKONSTRUKCIA",
  "NOVOSTAVBA",
]);

export const propertyFilterSchema = z.object({
  city: slovakCitySchema.optional(),
  minPrice: z.string().optional().transform((v) => v ? parseFloat(v) : undefined),
  maxPrice: z.string().optional().transform((v) => v ? parseFloat(v) : undefined),
  minArea: z.string().optional().transform((v) => v ? parseFloat(v) : undefined),
  maxArea: z.string().optional().transform((v) => v ? parseFloat(v) : undefined),
  minRooms: z.string().optional().transform((v) => v ? parseInt(v, 10) : undefined),
  maxRooms: z.string().optional().transform((v) => v ? parseInt(v, 10) : undefined),
  condition: propertyConditionSchema.optional(),
  minYield: z.string().optional().transform((v) => v ? parseFloat(v) : undefined),
  search: z.string().optional(),
  onlyDistressed: z.string().optional().transform((v) => v === "true"),
  page: z.string().optional().transform((v) => parseInt(v || "1", 10)),
  limit: z.string().optional().transform((v) => parseInt(v || "20", 10)),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
});

// ==========================================
// PORTFOLIO SCHEMAS
// ==========================================

export const portfolioPropertyStatusSchema = z.enum([
  "OWNED",
  "SOLD",
  "RENTED",
  "VACANT",
  "RENOVATING",
]);

export const createPortfolioPropertySchema = z.object({
  name: z.string().min(1, "Názov je povinný"),
  address: z.string().min(1, "Adresa je povinná"),
  city: slovakCitySchema,
  district: z.string().optional(),
  propertyType: z.enum(["apartment", "house", "studio", "commercial", "land"]),
  area_m2: z.number().positive("Plocha musí byť kladné číslo"),
  rooms: z.number().int().optional(),
  floor: z.number().int().optional(),
  purchaseDate: z.string().min(1, "Dátum kúpy je povinný"),
  purchasePrice: z.number().positive("Kúpna cena musí byť kladné číslo"),
  purchaseCosts: z.number().nonnegative().optional().default(0),
  currentValue: z.number().positive().optional(),
  hasMortgage: z.boolean().optional().default(false),
  mortgageAmount: z.number().positive().optional(),
  mortgageRate: z.number().positive().optional(),
  mortgagePayment: z.number().positive().optional(),
  mortgageStart: z.string().optional(),
  mortgageEnd: z.string().optional(),
  isRented: z.boolean().optional().default(false),
  monthlyRent: z.number().positive().optional(),
  tenantName: z.string().optional(),
  leaseStart: z.string().optional(),
  leaseEnd: z.string().optional(),
  depositAmount: z.number().nonnegative().optional(),
  monthlyExpenses: z.number().nonnegative().optional().default(0),
  annualTax: z.number().nonnegative().optional(),
  annualInsurance: z.number().nonnegative().optional(),
  status: portfolioPropertyStatusSchema.optional().default("OWNED"),
  notes: z.string().optional(),
  photos: z.array(z.string()).optional().default([]),
});

export const updatePortfolioPropertySchema = createPortfolioPropertySchema.partial();

// ==========================================
// TRANSACTION SCHEMAS
// ==========================================

export const transactionTypeSchema = z.enum([
  "PURCHASE",
  "SALE",
  "RENT_INCOME",
  "MAINTENANCE",
  "RENOVATION",
  "TAX",
  "INSURANCE",
  "MORTGAGE_PAYMENT",
  "UTILITIES",
  "MANAGEMENT_FEE",
  "OTHER_INCOME",
  "OTHER_EXPENSE",
]);

export const createTransactionSchema = z.object({
  type: transactionTypeSchema,
  amount: z.number().positive("Suma musí byť kladné číslo"),
  date: z.string().min(1, "Dátum je povinný"),
  description: z.string().optional(),
  category: z.string().optional(),
  isRecurring: z.boolean().optional().default(false),
  recurringFrequency: z.enum(["monthly", "quarterly", "yearly"]).optional(),
});

// ==========================================
// SAVED PROPERTY SCHEMAS
// ==========================================

export const savePropertySchema = z.object({
  propertyId: z.string().min(1, "Property ID je povinné"),
  notes: z.string().optional(),
  isFavorite: z.boolean().optional().default(false),
  alertOnChange: z.boolean().optional().default(true),
});

// ==========================================
// PREFERENCES SCHEMAS
// ==========================================

export const updatePreferencesSchema = z.object({
  primaryCity: slovakCitySchema.optional(),
  trackedCities: z.array(slovakCitySchema).optional(),
  investmentType: z.string().optional(),
  minPrice: z.number().nonnegative().optional(),
  maxPrice: z.number().positive().optional(),
  minArea: z.number().nonnegative().optional(),
  maxArea: z.number().positive().optional(),
  minRooms: z.number().int().nonnegative().optional(),
  maxRooms: z.number().int().positive().optional(),
  minYield: z.number().nonnegative().optional(),
  onlyDistressed: z.boolean().optional(),
  notifyMarketGaps: z.boolean().optional(),
  notifyPriceDrops: z.boolean().optional(),
  notifyNewProperties: z.boolean().optional(),
  notifyUrbanDevelopment: z.boolean().optional(),
}).partial();

// Type exports
export type CreatePortfolioProperty = z.infer<typeof createPortfolioPropertySchema>;
export type UpdatePortfolioProperty = z.infer<typeof updatePortfolioPropertySchema>;
export type CreateTransaction = z.infer<typeof createTransactionSchema>;
export type SaveProperty = z.infer<typeof savePropertySchema>;
export type PropertyFilter = z.infer<typeof propertyFilterSchema>;
export type UpdatePreferences = z.infer<typeof updatePreferencesSchema>;
