import { PrismaClient } from "../generated/prisma/client";
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

  // Railway/Neon atď. používajú TLS so self-signed certom → "self-signed certificate in certificate chain".
  // 1) pg môže brať sslmode z URL a overovať cert – odstránime sslmode a predáme vlastnú SSL konfiguráciu.
  // 2) Záložne je NODE_TLS_REJECT_UNAUTHORIZED=0 nastavené hore pri načítaní modulu (dev + remote DB).
  const isLocal =
    connectionString.includes("localhost") || connectionString.includes("127.0.0.1");
  const verifySSL = process.env.DATABASE_VERIFY_SSL === "true";
  const ssl: false | { rejectUnauthorized: boolean } =
    !isLocal ? { rejectUnauthorized: verifySSL } : false;
  const urlWithoutSslMode = connectionString
    .replace(/\?sslmode=[^&]+&?/, "?")
    .replace(/&sslmode=[^&]+/, "")
    .replace(/\?$/, "");
  const pool = new Pool({
    connectionString: urlWithoutSslMode,
    ssl: ssl || undefined,
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
