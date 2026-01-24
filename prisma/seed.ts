import { PrismaClient } from "../generated/prisma/client";

const prisma = new PrismaClient();

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
