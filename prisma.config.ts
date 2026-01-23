import { defineConfig } from "prisma/config";

// Pre Prisma 7: DATABASE_URL môže byť nedostupná počas buildu na Vercel
// Prisma generate nepotrebuje skutočnú connection string - len schema
// Používame process.env priamo s fallback, aby sme sa vyhli chybe počas buildu
const databaseUrl = process.env.DATABASE_URL || "postgresql://user:password@localhost:5432/db?schema=public";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Používame process.env priamo namiesto env() aby sme sa vyhli chybe počas buildu
    // Prisma generate nepotrebuje skutočnú connection string
    url: databaseUrl,
  },
});
