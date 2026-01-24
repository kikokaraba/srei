# Railway DATABASE_URL - Interná vs Externá URL

## Dôležité rozlíšenie

Railway poskytuje **dve rôzne URL** pre PostgreSQL databázu:

### 1. Interná URL (pre Railway services)
```
postgresql://postgres:PASSWORD@postgres.railway.internal:5432/railway
```

**Kde sa používa:**
- ✅ V Railway prostredí (production, staging)
- ✅ Keď Railway automaticky nastaví `DATABASE_URL` environment variable
- ✅ Pre komunikáciu medzi Railway services

**Kde NEFUNGUJE:**
- ❌ Z tvojho lokálneho počítača
- ❌ Z iných cloudových služieb
- ❌ Z tvojho development prostredia

### 2. Externá URL (pre lokálny vývoj)
```
postgresql://postgres:PASSWORD@HOST.proxy.rlwy.net:PORT/railway?sslmode=require
```
alebo
```
postgresql://postgres:PASSWORD@HOST.railway.app:PORT/railway?sslmode=require
```

**Kde sa používa:**
- ✅ Z tvojho lokálneho počítača
- ✅ Pre lokálny development
- ✅ Pre Prisma migrácie z tvojho počítača
- ✅ Pre Prisma Studio z tvojho počítača

## Ako získať externú URL

1. **Otvor Railway Dashboard**
   - Choď na [railway.app](https://railway.app)
   - Vyber svoj projekt

2. **Otvor PostgreSQL databázu**
   - Klikni na PostgreSQL service

3. **Získaj externú URL**
   - Klikni na záložku **"Connect"** alebo **"Variables"**
   - Nájdi **"Public Network"** alebo **"Public URL"**
   - Skopíruj connection string

4. **Pridaj SSL parameter**
   - Pridaj na koniec: `?sslmode=require`
   - Príklad: `postgresql://postgres:PASSWORD@HOST.proxy.rlwy.net:PORT/railway?sslmode=require`

## Aktuálna konfigurácia

Tvoja aktuálna URL v `.env`:
```
postgresql://postgres:pKJlIHLdgFlhYhPKLzwcWNJHdhGVQkki@postgres.railway.internal:5432/railway
```

**Táto URL funguje LEN v Railway prostredí!**

Pre lokálny vývoj potrebuješ:
1. Získať externú URL z Railway dashboardu
2. Nahradiť `postgres.railway.internal:5432` externou URL
3. Pridať `?sslmode=require` na koniec

## Riešenie pre lokálny vývoj

### Možnosť 1: Použi externú URL v `.env`
```env
# Pre lokálny vývoj - použij externú URL
DATABASE_URL="postgresql://postgres:pKJlIHLdgFlhYhPKLzwcWNJHdhGVQkki@HOST.proxy.rlwy.net:PORT/railway?sslmode=require"
```

### Možnosť 2: Použi `.env.local` pre lokálny vývoj
Vytvor `.env.local` (tento súbor je v `.gitignore`):
```env
# .env.local - len pre lokálny vývoj
DATABASE_URL="postgresql://postgres:PASSWORD@HOST.proxy.rlwy.net:PORT/railway?sslmode=require"
```

A v `.env` nechaj internú URL pre Railway:
```env
# .env - pre Railway production
DATABASE_URL="postgresql://postgres:PASSWORD@postgres.railway.internal:5432/railway"
```

## Test pripojenia

Po nastavení externej URL otestuj pripojenie:

```bash
# Test cez psql (ak máš nainštalovaný PostgreSQL client)
psql $DATABASE_URL -c "SELECT version();"

# Alebo cez Prisma
npm run db:studio
```

## Bezpečnosť

⚠️ **Dôležité:**
- Externá URL je verejne prístupná (ak je Public Network zapnuté)
- Uisti sa, že máš silné heslo
- V production Railway automaticky používa internú URL (bezpečnejšie)
- Pre lokálny vývoj môžeš použiť `.env.local` (nie je v gite)

## Ďalšie kroky

1. ✅ Získaj externú URL z Railway dashboardu
2. ✅ Aktualizuj `.env` alebo vytvor `.env.local`
3. ✅ Pridaj `?sslmode=require` na koniec URL
4. ✅ Otestuj pripojenie: `npm run db:studio`
5. ✅ Povol PostGIS: `CREATE EXTENSION IF NOT EXISTS postgis;`
6. ✅ Spusti migrácie: `npm run db:migrate`
