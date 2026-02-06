import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

// Pri remote DB (Railway atď.) a v dev: akceptovať self-signed TLS hneď pri štarte, pred prvým pripojením
const _dbUrl = process.env.DATABASE_URL ?? "";
if (
  _dbUrl &&
  !_dbUrl.includes("localhost") &&
  !_dbUrl.includes("127.0.0.1") &&
  process.env.NODE_ENV === "development" &&
  process.env.DATABASE_VERIFY_SSL !== "true"
) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pool: InstanceType<typeof Pool> | undefined;
};

/** Max connections v pooli – jeden singleton pool na proces; nízka hodnota kvôli limitu DB (Railway ~20) */
const POOL_MAX = Math.min(
  parseInt(process.env.DATABASE_POOL_MAX ?? "3", 10),
  10
);

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    const dummyKey = "__dummy_pool";
    const g = globalForPrisma as Record<string, InstanceType<typeof Pool> | undefined>;
    let dummyPool = g[dummyKey];
    if (!dummyPool) {
      dummyPool = new Pool({
        connectionString: "postgresql://user:password@localhost:5432/db?schema=public",
        max: 1,
      });
      g[dummyKey] = dummyPool;
    }
    return new PrismaClient({
      adapter: new PrismaPg(dummyPool),
      log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
    });
  }

  let pool = globalForPrisma.pool;
  if (!pool) {
    const isLocal =
      connectionString.includes("localhost") || connectionString.includes("127.0.0.1");
    const verifySSL = process.env.DATABASE_VERIFY_SSL === "true";
    const ssl: false | { rejectUnauthorized: boolean } =
      !isLocal ? { rejectUnauthorized: verifySSL } : false;
    const urlWithoutSslMode = connectionString
      .replace(/\?sslmode=[^&]+&?/, "?")
      .replace(/&sslmode=[^&]+/, "")
      .replace(/\?$/, "");
    pool = new Pool({
      connectionString: urlWithoutSslMode,
      ssl: ssl || undefined,
      max: POOL_MAX,
      idleTimeoutMillis: 10000,
    });
    globalForPrisma.pool = pool;
  }
  const adapter = new PrismaPg(pool);

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });
}

export const prisma: PrismaClient =
  globalForPrisma.prisma ?? createPrismaClient();

globalForPrisma.prisma = prisma;
