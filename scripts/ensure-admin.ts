import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { hash } from "bcryptjs";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("❌ DATABASE_URL nie je nastavený");
  process.exit(1);
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
  adapter,
  log: ["error"],
});

async function ensureAdmin() {
  try {
    const adminEmail = "admin@sria.sk";
    const adminPassword = "Admin123!";
    const hashedPassword = await hash(adminPassword, 10);

    const adminUser = await prisma.user.upsert({
      where: { email: adminEmail },
      update: {
        // Aktualizuj heslo len ak používateľ nemá heslo
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

    console.log("✅ Admin používateľ pripravený:", adminUser.email);
  } catch (error) {
    console.error("⚠️  Chyba pri vytváraní admin používateľa:", error);
    // Neukonči proces - aplikácia môže bežať aj bez admin používateľa
  } finally {
    await prisma.$disconnect();
  }
}

ensureAdmin();
