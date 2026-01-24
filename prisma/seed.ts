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
  log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
});

async function main() {
  console.log("🌱 Seeding database...");

  // Create demo user
  const demoUser = await prisma.user.upsert({
    where: { email: "demo@sria.sk" },
    update: {},
    create: {
      email: "demo@sria.sk",
      name: "Demo Používateľ",
      role: "PREMIUM_INVESTOR",
    },
  });

  console.log("✅ Demo user created:", demoUser.email);
  console.log("\n📧 Demo prihlasovacie údaje:");
  console.log("   Email: demo@sria.sk");
  console.log("   Heslo: (akékoľvek - momentálne sa nekontroluje)");
  console.log("\n💡 Poznámka: Heslo sa momentálne nekontroluje v MVP verzii.");
}

main()
  .catch((e) => {
    console.error("❌ Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
