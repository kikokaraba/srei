# Nastavenie Railway PostgreSQL Databázy

## Krok 1: Vytvorenie databázy na Railway

1. Choď na [Railway.app](https://railway.app) a prihlás sa
2. Vytvor nový projekt (New Project)
3. Pridaj PostgreSQL databázu:
   - Klikni na "New" → "Database" → "Add PostgreSQL"
4. Railway automaticky vytvorí databázu a poskytne `DATABASE_URL`

## Krok 2: Konfigurácia DATABASE_URL

Railway poskytuje `DATABASE_URL` v tvare:
```
postgresql://postgres:PASSWORD@HOST:PORT/railway?sslmode=require
```

Skopíruj tento connection string a vlož ho do `.env` súboru:
```env
DATABASE_URL="postgresql://postgres:PASSWORD@HOST:PORT/railway?sslmode=require"
```

## Krok 3: Povolenie PostGIS rozšírenia

Táto aplikácia používa PostGIS pre geografické údaje. Musíš ho povoliť v databáze:

### Možnosť A: Cez Railway Dashboard (SQL Editor)
1. V Railway dashboarde otvor tvoju PostgreSQL databázu
2. Klikni na "Query" alebo "SQL Editor"
3. Spusti tento príkaz:
```sql
CREATE EXTENSION IF NOT EXISTS postgis;
```

### Možnosť B: Cez psql (ak máš nainštalovaný PostgreSQL client)
```bash
psql $DATABASE_URL -c "CREATE EXTENSION IF NOT EXISTS postgis;"
```

### Možnosť C: Cez Prisma (po inštalácii závislostí)
```bash
npm install
npx prisma db execute --stdin < prisma/enable-postgis.sql
```

## Krok 4: Inštalácia závislostí

Uisti sa, že máš nainštalovaný Node.js (v18 alebo novší):
```bash
node --version
```

Ak nie je nainštalovaný, nainštaluj ho cez [nodejs.org](https://nodejs.org) alebo cez nvm:
```bash
# macOS (cez Homebrew)
brew install node

# alebo cez nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18
```

Potom nainštaluj závislosti projektu:
```bash
npm install
```

## Krok 5: Vytvorenie migrácií a schémy

Po inštalácii závislostí vytvor migrácie:
```bash
# Vygeneruj Prisma klienta
npm run db:generate

# Vytvor migrácie
npm run db:migrate

# Alebo ak chceš len pushnúť schému bez migrácií (pre development)
npm run db:push
```

## Krok 6: Overenie pripojenia

Testuj pripojenie k databáze:
```bash
# Otvor Prisma Studio (GUI pre databázu)
npm run db:studio
```

Alebo vytvor jednoduchý test script:
```bash
node -e "const { PrismaClient } = require('./generated/prisma/client'); const prisma = new PrismaClient(); prisma.\$connect().then(() => console.log('✅ Pripojenie úspešné!')).catch(e => console.error('❌ Chyba:', e)).finally(() => prisma.\$disconnect());"
```

## Krok 7: Seed databázy (voliteľné)

Ak máš seed súbor, môžeš naplniť databázu testovacími údajmi:
```bash
npm run db:seed
```

## Troubleshooting

### Chyba: "relation does not exist"
- Uisti sa, že si spustil migrácie: `npm run db:migrate`

### Chyba: "extension postgis does not exist"
- Povol PostGIS rozšírenie (Krok 3)

### Chyba: "connection refused" alebo "timeout"
- Skontroluj, či je `DATABASE_URL` správny
- Uisti sa, že Railway databáza beží
- Skontroluj, či máš správny SSL mode (`?sslmode=require`)

### Chyba: "password authentication failed"
- Skontroluj heslo v `DATABASE_URL`
- V Railway dashboarde môžeš resetnúť heslo

## Ďalšie kroky

Po úspešnom nastavení databázy:
1. ✅ Databáza je pripravená na použitie
2. ✅ Môžeš začať vývoj aplikácie
3. ✅ Prisma klient je vygenerovaný a pripravený

## Poznámky pre Production

- V production používaj environment variables z Railway
- Railway automaticky poskytuje `DATABASE_URL` ako environment variable
- Nezabudni nastaviť `NEXTAUTH_URL` na správnu production URL
- Nastav `NEXTAUTH_SECRET` na bezpečný náhodný string
