# Prisma 7 Migration - Output Path Changes

## Problém
Prisma 7 vyžaduje explicitný `output` path v `generator` bloku. Starý default path `node_modules/.prisma/client` už nie je podporovaný a môže spôsobovať chyby.

## Zmeny

### 1. Prisma Schema (`prisma/schema.prisma`)
```prisma
generator client {
  provider = "prisma-client"
  output   = "../generated/prisma"  // ✅ Nový output path
}
```

### 2. Aktualizované importy
Všetky importy z `@prisma/client` boli zmenené na `@/generated/prisma/client`:

- `lib/prisma.ts`
- `app/api/v1/market-gaps/route.ts`
- `app/api/v1/urban-development/route.ts`
- `app/api/v1/liquidity/route.ts`
- `lib/auth.ts`
- `types/next-auth.d.ts`

### 3. .gitignore
Pridaný `/generated` do `.gitignore` (generovaný kód sa necommitne).

## Postup po migrácii

### Lokálne
```bash
# 1. Vymazať starý Prisma Client
rm -rf node_modules/.prisma

# 2. Vymazať nový generated adresár (ak existuje)
rm -rf generated

# 3. Regenerovať Prisma Client
npx prisma generate

# 4. Overiť, že sa vytvoril nový adresár
ls -la generated/prisma/
```

### Na Vercel
Vercel automaticky spustí `prisma generate` cez `postinstall` script, takže by malo fungovať automaticky.

## Poznámky

- **@auth/prisma-adapter**: Môže vyžadovať aktualizáciu, ak používa `@prisma/client` interné. Skontrolujte, či funguje správne.
- **TypeScript**: Uistite sa, že TypeScript rozpoznáva nový import path (`@/generated/prisma/client`).
- **Build process**: `prisma generate` sa spúšťa automaticky cez `postinstall` script.

## Troubleshooting

### Chyba: "Cannot find module '@/generated/prisma/client'"
- Skontrolujte, či sa `generated/prisma/client` vytvoril po `prisma generate`
- Skontrolujte `tsconfig.json` paths mapping (`@/*`)

### Chyba: "@auth/prisma-adapter cannot find PrismaClient"
- Možno bude potrebné aktualizovať `@auth/prisma-adapter` na najnovšiu verziu
- Alebo vytvoriť alias v `tsconfig.json` alebo `next.config.ts`
