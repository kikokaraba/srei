import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is not set");
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
  adapter,
  log: ["query", "error", "warn"],
});

async function enablePostGIS() {
  console.log("🗺️  Povoľujem PostGIS rozšírenie...");
  
  try {
    // Použijeme raw query cez Prisma
    await prisma.$executeRawUnsafe("CREATE EXTENSION IF NOT EXISTS postgis;");
    console.log("✅ PostGIS rozšírenie povolené");
  } catch (error) {
    console.error("❌ Chyba pri povolovaní PostGIS:", error);
    throw error;
  }
}

async function main() {
  try {
    await enablePostGIS();
  } catch (error) {
    console.error("❌ Chyba:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
