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

  // Seed sample properties
  console.log("\n📦 Creating sample properties...");

  const sampleProperties = [
    {
      slug: "2-izbovy-byt-stare-mesto-ba",
      title: "2-izbový byt v Starom Meste",
      description: "Krásny svetlý byt v centre Bratislavy, po kompletnej rekonštrukcii. Vhodný na bývanie aj investíciu.",
      city: "BRATISLAVA" as const,
      district: "Staré Mesto",
      street: "Obchodná",
      address: "Obchodná 15, Bratislava",
      price: 189000,
      area_m2: 58,
      price_per_m2: 3259,
      rooms: 2,
      floor: 3,
      condition: "REKONSTRUKCIA" as const,
      energy_certificate: "B" as const,
      days_on_market: 14,
    },
    {
      slug: "3-izbovy-byt-petrzalka",
      title: "3-izbový byt s balkónom",
      description: "Priestranný 3-izbový byt v Petržalke s veľkým balkónom a výhľadom na Dunaj.",
      city: "BRATISLAVA" as const,
      district: "Petržalka",
      street: "Budatínska",
      address: "Budatínska 42, Bratislava",
      price: 165000,
      area_m2: 72,
      price_per_m2: 2292,
      rooms: 3,
      floor: 8,
      condition: "POVODNY" as const,
      energy_certificate: "C" as const,
      days_on_market: 45,
      is_distressed: true,
    },
    {
      slug: "1-izbovy-byt-kosice-centrum",
      title: "1-izbové štúdio v centre Košíc",
      description: "Kompaktné štúdio ideálne na prenájom. Blízko Hlavnej ulice a MHD.",
      city: "KOSICE" as const,
      district: "Košice I",
      street: "Hlavná",
      address: "Hlavná 88, Košice",
      price: 72000,
      area_m2: 32,
      price_per_m2: 2250,
      rooms: 1,
      floor: 2,
      condition: "REKONSTRUKCIA" as const,
      energy_certificate: "C" as const,
      days_on_market: 7,
    },
    {
      slug: "4-izbovy-byt-zilina",
      title: "4-izbový rodinný byt",
      description: "Veľký rodinný byt v Žiline, vhodný pre rodinu s deťmi. Tichá lokalita.",
      city: "ZILINA" as const,
      district: "Hliny",
      street: "Hlinská",
      address: "Hlinská 23, Žilina",
      price: 145000,
      area_m2: 95,
      price_per_m2: 1526,
      rooms: 4,
      floor: 1,
      condition: "POVODNY" as const,
      energy_certificate: "D" as const,
      days_on_market: 30,
    },
    {
      slug: "novostavba-trnava",
      title: "Novostavba 2+kk Trnava",
      description: "Moderný byt v novostavbe s parkovacím miestom a pivnicou.",
      city: "TRNAVA" as const,
      district: "Trnava - Západ",
      street: "Veterná",
      address: "Veterná 5, Trnava",
      price: 135000,
      area_m2: 52,
      price_per_m2: 2596,
      rooms: 2,
      floor: 4,
      condition: "NOVOSTAVBA" as const,
      energy_certificate: "A" as const,
      days_on_market: 3,
    },
    {
      slug: "3-izbovy-nitra-centrum",
      title: "3-izbový byt pri Nitrianskom hrade",
      description: "Historický byt v centre Nitry s výhľadom na hrad. Vysoké stropy, pôvodné parkety.",
      city: "NITRA" as const,
      district: "Nitra",
      street: "Hradná",
      address: "Hradná 12, Nitra",
      price: 125000,
      area_m2: 78,
      price_per_m2: 1603,
      rooms: 3,
      floor: 2,
      condition: "POVODNY" as const,
      energy_certificate: "E" as const,
      days_on_market: 60,
      is_distressed: true,
    },
    {
      slug: "2-izbovy-presov",
      title: "2-izbový byt Prešov - Sídlisko III",
      description: "Útulný byt po čiastočnej rekonštrukcii. Nová kuchyňa a kúpeľňa.",
      city: "PRESOV" as const,
      district: "Sídlisko III",
      street: "Prostějovská",
      address: "Prostějovská 15, Prešov",
      price: 89000,
      area_m2: 54,
      price_per_m2: 1648,
      rooms: 2,
      floor: 5,
      condition: "REKONSTRUKCIA" as const,
      energy_certificate: "C" as const,
      days_on_market: 21,
    },
    {
      slug: "1-izbovy-banska-bystrica",
      title: "Garsónka v Banskej Bystrici",
      description: "Malá garsónka vhodná pre jednotlivca alebo študenta. Blízko centra.",
      city: "BANSKA_BYSTRICA" as const,
      district: "Banská Bystrica",
      street: "Námestie SNP",
      address: "Námestie SNP 20, Banská Bystrica",
      price: 65000,
      area_m2: 28,
      price_per_m2: 2321,
      rooms: 1,
      floor: 3,
      condition: "POVODNY" as const,
      energy_certificate: "D" as const,
      days_on_market: 12,
    },
    {
      slug: "3-izbovy-trencin",
      title: "3-izbový byt Trenčín - JUH",
      description: "Priestranný byt s loggiou v obľúbenej lokalite. Výborná občianska vybavenosť.",
      city: "TRENCIN" as const,
      district: "JUH",
      street: "Legionárska",
      address: "Legionárska 33, Trenčín",
      price: 115000,
      area_m2: 68,
      price_per_m2: 1691,
      rooms: 3,
      floor: 4,
      condition: "REKONSTRUKCIA" as const,
      energy_certificate: "B" as const,
      days_on_market: 8,
    },
    {
      slug: "novostavba-bratislava-ruzinov",
      title: "Luxusný 3-izbový byt Ružinov",
      description: "Moderná novostavba s terasou a 2 parkovacími miestami. Smart home systém.",
      city: "BRATISLAVA" as const,
      district: "Ružinov",
      street: "Bajkalská",
      address: "Bajkalská 100, Bratislava",
      price: 295000,
      area_m2: 85,
      price_per_m2: 3471,
      rooms: 3,
      floor: 6,
      condition: "NOVOSTAVBA" as const,
      energy_certificate: "A" as const,
      days_on_market: 5,
    },
  ];

  for (const property of sampleProperties) {
    const created = await prisma.property.upsert({
      where: { slug: property.slug },
      update: property,
      create: {
        ...property,
        first_listed_at: new Date(Date.now() - property.days_on_market * 24 * 60 * 60 * 1000),
      },
    });

    // Create investment metrics for each property
    const monthlyRent = property.price * 0.004 + Math.random() * 100; // ~0.4% monthly rent
    const annualRent = monthlyRent * 12;
    const expenses = annualRent * 0.25; // 25% expenses

    await prisma.investmentMetrics.upsert({
      where: { propertyId: created.id },
      update: {
        gross_yield: (annualRent / property.price) * 100,
        net_yield: ((annualRent - expenses) / property.price) * 100,
        cash_on_cash: ((annualRent - expenses) / (property.price * 0.3)) * 100, // 30% down payment
        price_to_rent_ratio: property.price / annualRent,
      },
      create: {
        propertyId: created.id,
        gross_yield: (annualRent / property.price) * 100,
        net_yield: ((annualRent - expenses) / property.price) * 100,
        cash_on_cash: ((annualRent - expenses) / (property.price * 0.3)) * 100,
        price_to_rent_ratio: property.price / annualRent,
      },
    });
  }

  console.log(`✅ Created ${sampleProperties.length} sample properties with investment metrics`);
  console.log("\n🎉 Seeding completed!");
}

main()
  .catch((e) => {
    console.error("❌ Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
