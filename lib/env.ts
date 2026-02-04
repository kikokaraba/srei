import { z } from "zod";

/**
 * Zod schema pre validáciu environment variables
 * Vyhodí chybu pri štarte ak chýbajú required premenné
 */
const envSchema = z.object({
  // Database - Required
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  // NextAuth - Required
  NEXTAUTH_SECRET: z.string().min(1, "NEXTAUTH_SECRET is required"),
  NEXTAUTH_URL: z.string().url().optional(),

  // App URLs
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  RAILWAY_URL: z.string().url().optional(),

  // AI Services - Optional
  ANTHROPIC_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),

  // Telegram - Optional
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TELEGRAM_BOT_USERNAME: z.string().optional(),
  TELEGRAM_WEBHOOK_SECRET: z.string().optional(),

  // Scraping - Optional
  APIFY_API_KEY: z.string().optional(),
  BROWSER_WS_ENDPOINT: z.string().optional(),

  // Rate Limiting - Optional
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

  // Cron Security
  CRON_SECRET: z.string().optional(),

  // Mapbox
  NEXT_PUBLIC_MAPBOX_TOKEN: z.string().optional(),

  // Engine API
  ENGINE_API_KEY: z.string().optional(),

  // Node environment
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Validované environment variables
 * Použitie: import { env } from "@/lib/env";
 */
function validateEnv(): Env {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error("❌ Invalid environment variables:");
    console.error(parsed.error.flatten().fieldErrors);
    
    // V production zlyháme, v development len varujeme
    if (process.env.NODE_ENV === "production") {
      throw new Error("Invalid environment variables");
    }
    
    // V development vrátime čiastočne validované env
    return process.env as unknown as Env;
  }

  return parsed.data;
}

export const env = validateEnv();

/**
 * Helper pre kontrolu či je env var nastavený
 */
export function hasEnvVar(key: keyof Env): boolean {
  return !!env[key];
}

/**
 * Helper pre získanie required env var s lepšou chybovou hláškou
 */
export function requireEnvVar(key: keyof Env): string {
  const value = env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value as string;
}
