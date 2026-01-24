# Railway Setup - Krok po Kroku

## Krok 1: Vytvorenie projektu na Railway

1. Choď na [railway.app](https://railway.app)
2. Klikni na **"New Project"**
3. Vyber **"Empty Project"** (alebo "Deploy from GitHub repo" ak máš kód na GitHub)

## Krok 2: Pridanie PostgreSQL databázy

1. V Railway projekte klikni na **"New"** (alebo **"+"**)
2. Vyber **"Database"** → **"Add PostgreSQL"**
3. Railway automaticky vytvorí databázu
4. Počkaj, kým sa databáza vytvorí (zobrazí sa "Online")

## Krok 3: Získanie DATABASE_URL

1. Klikni na **Postgres** service (v sidebar alebo v zozname services)
2. Klikni na záložku **"Variables"** (alebo **"Connect"**)
3. Nájdi **`DATABASE_URL`** - skopíruj ho
4. Mal by vyzerať takto:
   ```
   postgresql://postgres:PASSWORD@postgres.railway.internal:5432/railway
   ```

## Krok 4: Povolenie PostGIS rozšírenia

1. V Railway → **Postgres** service
2. Klikni na **"Query"** alebo **"SQL Editor"**
3. Vlož tento príkaz:
   ```sql
   CREATE EXTENSION IF NOT EXISTS postgis;
   ```
4. Klikni **"Run"** alebo **"Execute"**
5. Mala by sa zobraziť správa o úspechu

## Krok 5: Pridanie Next.js aplikácie

### Možnosť A: Z GitHub repozitára
1. V Railway projekte klikni **"New"** → **"GitHub Repo"**
2. Vyber svoj repozitár
3. Railway automaticky detekuje Next.js

### Možnosť B: Z lokálneho kódu (Railway CLI)
```bash
# Nainštaluj Railway CLI
npm i -g @railway/cli

# Prihlás sa
railway login

# Inicializuj projekt
railway init

# Pridaj databázu
railway add

# Deploy
railway up
```

## Krok 6: Nastavenie Environment Variables

V Railway → tvoj **Next.js service** (napr. "srei") → **"Variables"**:

1. **DATABASE_URL**
   - Railway ho automaticky nastaví, ak máš PostgreSQL v tom istom projekte
   - Skontroluj, či je tam (mal by byť s `postgres.railway.internal`)
   - Ak nie je, pridaj ho manuálne (skopírovaný z Krok 3)

2. **NEXTAUTH_SECRET**
   - Klikni **"Add Variable"**
   - Name: `NEXTAUTH_SECRET`
   - Value: vygeneruj náhodný string:
     ```bash
     openssl rand -base64 32
     ```
   - Alebo použij: `J3H+rWgMYSqkWPe7tYAFgvUPdRyMPQoc4PEKE7EQrnw=`

3. **NEXTAUTH_URL**
   - Klikni **"Add Variable"**
   - Name: `NEXTAUTH_URL`
   - Value: tvoja Railway URL (napr. `https://srei-production.up.railway.app`)
   - Túto URL nájdeš v Railway → tvoj service → **"Settings"** → **"Domains"**
   - Alebo po deploymente v **"Deployments"** → URL

## Krok 7: Deploy aplikácie

1. Railway automaticky spustí build po pushnutí kódu
2. Alebo klikni na **"Deploy"** v Railway dashboarde
3. Počkaj, kým sa build dokončí

## Krok 8: Spustenie migrácií

Po úspešnom deploymente:

**Možnosť A: Cez Railway Dashboard**
1. V Railway → tvoj service → **"Deployments"**
2. Klikni na najnovší deployment
3. Skontroluj logy - migrácie sa môžu spustiť automaticky

**Možnosť B: Cez Railway CLI**
```bash
railway run npm run db:migrate:deploy
```

**Možnosť C: Manuálne v Railway**
1. V Railway → tvoj service → **"Settings"** → **"Deploy"**
2. V **"Run Command"** zadaj: `npm run db:migrate:deploy`
3. Klikni **"Redeploy"**

## Krok 9: Overenie

1. Otvor tvoju Railway URL
2. Aplikácia by mala fungovať
3. Skontroluj logy pre chyby

## Troubleshooting

### DATABASE_URL nie je nastavený
- Uisti sa, že PostgreSQL je v tom istom Railway projekte
- Railway automaticky nastaví `DATABASE_URL`, ak sú services v tom istom projekte
- Ak nie, pridaj ho manuálne z Postgres service → Variables

### Chyba: "extension postgis does not exist"
- Spusti `CREATE EXTENSION IF NOT EXISTS postgis;` v Railway SQL Editor

### Chyba: "relation does not exist"
- Spusti migrácie: `railway run npm run db:migrate:deploy`

### Build zlyhá
- Skontroluj logy v Railway → Deployments
- Uisti sa, že všetky environment variables sú nastavené
