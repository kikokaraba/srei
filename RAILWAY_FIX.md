# Oprava Railway Output Directory Error

## Problém
```
Error: No Output Directory named "public" found after the Build completed.
```

Railway sa pokúša spustiť aplikáciu ako statický web, ale Next.js je server aplikácia.

## Riešenie

### Možnosť 1: V Railway Dashboard (najrýchlejšie)

1. Choď do Railway dashboardu → tvoj "srei" service
2. Klikni na **"Settings"**
3. V sekcii **"Deploy"**:
   - **Root Directory**: nechaj prázdne (alebo `/`)
   - **Build Command**: `npm run build`
   - **Start Command**: `npm start`
   - **Output Directory**: **ODSTRÁŇ** alebo nechaj prázdne (Next.js nepotrebuje output directory!)

4. Uisti sa, že **"Source Type"** je nastavené na **"Nixpacks"** alebo **"Dockerfile"**

5. Klikni **"Save"** a **"Redeploy"**

### Možnosť 2: Cez railway.json (už som to urobil)

Aktualizoval som `railway.json` - odstránil som explicitný `buildCommand`, aby Railway použil automatickú detekciu.

### Možnosť 3: Vytvoriť Dockerfile (ak nič iné nepomôže)

Ak problém pretrváva, vytvor `Dockerfile`:

```dockerfile
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000

CMD ["node", "server.js"]
```

A v `next.config.ts` pridaj:
```typescript
output: 'standalone',
```

## Čo som urobil

✅ Aktualizoval `railway.json` - zjednodušil konfiguráciu  
✅ Vytvoril `nixpacks.toml` - explicitná Nixpacks konfigurácia  

## Ďalšie kroky

1. V Railway dashboarde → Settings → Deploy
2. **Odstráň Output Directory** (alebo nechaj prázdne)
3. Uisti sa, že Start Command je: `npm start`
4. Klikni **"Redeploy"**

Hotovo! 🎉
