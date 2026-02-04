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
    console.log("🔍 Kontrolujem admin používateľa...");
    
    const adminEmail = "admin@sria.sk";
    const adminPassword = "Admin123!";
    const hashedPassword = await hash(adminPassword, 10);

    // Skús najprv nájsť existujúceho používateľa
    const existingUser = await prisma.user.findUnique({
      where: { email: adminEmail },
    });

    let adminUser;
    if (existingUser) {
      // Vždy nastav heslo a rolu ADMIN (umožní reset hesla / obnovu admin prístupu)
      adminUser = await prisma.user.update({
        where: { email: adminEmail },
        data: {
          password: hashedPassword,
          role: "ADMIN",
        },
      });
      console.log("✅ Admin používateľ aktualizovaný:", adminUser.email);
    } else {
      // Vytvor nového admin používateľa
      adminUser = await prisma.user.create({
        data: {
          email: adminEmail,
          password: hashedPassword,
          name: "Administrátor",
          role: "ADMIN",
        },
      });
      console.log("✅ Admin používateľ vytvorený:", adminUser.email);
    }

    console.log("🔐 Prihlasovacie údaje:");
    console.log("   Email: admin@sria.sk");
    console.log("   Heslo: Admin123!");
  } catch (error) {
    console.error("❌ Chyba pri vytváraní admin používateľa:", error);
    // Neukonči proces - aplikácia môže bežať aj bez admin používateľa
  } finally {
    await prisma.$disconnect();
  }
}

ensureAdmin();
