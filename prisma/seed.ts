import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { hash } from "bcryptjs";

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

  // Admin credentials
  const adminEmail = "admin@sria.sk";
  const adminPassword = "Admin123!";
  const hashedPassword = await hash(adminPassword, 10);

  // Create admin user
  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      password: hashedPassword,
      role: "ADMIN",
    },
    create: {
      email: adminEmail,
      password: hashedPassword,
      name: "Administrátor",
      role: "ADMIN",
    },
  });

  console.log("✅ Admin user created:", adminUser.email);
  console.log("\n🔐 Admin prihlasovacie údaje:");
  console.log("   Email: admin@sria.sk");
  console.log("   Heslo: Admin123!");
  console.log("\n⚠️  DÔLEŽITÉ: Zmeň heslo po prvom prihlásení!");

  // Create demo user (without password for backward compatibility)
  const demoUser = await prisma.user.upsert({
    where: { email: "demo@sria.sk" },
    update: {},
    create: {
      email: "demo@sria.sk",
      name: "Demo Používateľ",
      role: "PREMIUM_INVESTOR",
    },
  });

  console.log("\n✅ Demo user created:", demoUser.email);
  console.log("   Email: demo@sria.sk");
  console.log("   Heslo: (akékoľvek - pre demo účely)");
}

main()
  .catch((e) => {
    console.error("❌ Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
