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

  // Railway (and similar) use TLS with certs that can trigger "self-signed certificate in certificate chain".
  // Only verify when explicitly requested via DATABASE_VERIFY_SSL=true; otherwise accept to avoid 500s.
  const useSSL =
    connectionString.includes("sslmode=require") ||
    connectionString.includes("proxy.rlwy.net") ||
    connectionString.includes(".railway.app");
  const verifySSL = process.env.DATABASE_VERIFY_SSL === "true";
  const pool = new Pool({
    connectionString,
    ...(useSSL && {
      ssl: {
        rejectUnauthorized: verifySSL,
      },
    }),
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
