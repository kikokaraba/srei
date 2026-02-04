import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  // Pre Prisma 7: Musíme použiť adapter alebo accelerateUrl
  // Používame adapter pre priame pripojenie k PostgreSQL
  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    // Fallback pre development alebo build time - použijeme dummy adapter
    // Toto by sa nemalo stať v production, ale zabezpečí, že build prejde
    const dummyPool = new Pool({ 
      connectionString: "postgresql://user:password@localhost:5432/db?schema=public" 
    });
    const dummyAdapter = new PrismaPg(dummyPool);
    
    return new PrismaClient({
      adapter: dummyAdapter,
      log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
    });
  }

  // Remote DBs (Railway, Neon, etc.) often use TLS with self-signed certs → "self-signed certificate in certificate chain".
  // Use SSL and accept cert unless DATABASE_VERIFY_SSL=true. Skip SSL only for localhost.
  let ssl: { rejectUnauthorized: boolean } | undefined;
  try {
    const url = new URL(connectionString.replace(/^postgres(ql)?:\/\//, "https://"));
    const host = (url.hostname || "").toLowerCase();
    const isLocal =
      host === "localhost" || host === "127.0.0.1" || host === "::1" || host === "";
    if (!isLocal) {
      ssl = { rejectUnauthorized: process.env.DATABASE_VERIFY_SSL === "true" };
    }
  } catch {
    // Fallback: enable SSL for known remote patterns
    if (
      connectionString.includes("sslmode=require") ||
      connectionString.includes("rlwy.net") ||
      connectionString.includes("railway") ||
      connectionString.includes("neon.tech") ||
      connectionString.includes("supabase.co")
    ) {
      ssl = { rejectUnauthorized: process.env.DATABASE_VERIFY_SSL === "true" };
    }
  }
  const pool = new Pool({
    connectionString,
    ...(ssl !== undefined && { ssl }),
  });
  const adapter = new PrismaPg(pool);

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });
}

export const prisma: PrismaClient =
  globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
