# Nasadenie na Railway

Tento projekt je pripravený na nasadenie na Railway. Všetko beží online, žiadny lokálny vývoj.

## Krok 1: Vytvorenie projektu na Railway

1. Choď na [railway.app](https://railway.app) a prihlás sa
2. Klikni na **"New Project"**
3. Vyber **"Deploy from GitHub repo"** (ak máš repo na GitHub) alebo **"Empty Project"**

## Krok 2: Pridanie PostgreSQL databázy

1. V Railway projekte klikni na **"New"** → **"Database"** → **"Add PostgreSQL"**
2. Railway automaticky vytvorí databázu
3. Railway automaticky nastaví `DATABASE_URL` environment variable

## Krok 3: Pridanie Next.js aplikácie

### Možnosť A: Z GitHub repozitára
1. V Railway projekte klikni na **"New"** → **"GitHub Repo"**
2. Vyber svoj repozitár
3. Railway automaticky detekuje Next.js a nastaví build

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

## Krok 4: Nastavenie Environment Variables

V Railway dashboarde → tvoj Next.js service → **"Variables"**:

1. **DATABASE_URL** - Railway ho automaticky nastaví, ak máš PostgreSQL v tom istom projekte
2. **NEXTAUTH_SECRET** - Vygeneruj náhodný string:
   ```bash
   openssl rand -base64 32
   ```
3. **NEXTAUTH_URL** - Nastav na tvoju Railway URL (napr. `https://tvoj-projekt.railway.app`)

## Krok 5: Povolenie PostGIS rozšírenia

Po vytvorení databázy:

1. V Railway dashboarde → PostgreSQL databáza
2. Klikni na **"Query"** alebo **"SQL Editor"**
3. Spusti tento príkaz:
   ```sql
   CREATE EXTENSION IF NOT EXISTS postgis;
   ```

## Krok 6: Spustenie migrácií

Po nasadení aplikácie, migrácie sa môžu spustiť automaticky cez `postinstall` script.

Alebo manuálne cez Railway:

1. V Railway dashboarde → tvoj Next.js service
2. Klikni na **"Deployments"** → **"View Logs"**
3. Skontroluj, či sa migrácie spustili

Ak nie, spusti migrácie manuálne:

**Možnosť A: Cez Railway CLI**
```bash
railway run npm run db:migrate:deploy
```

**Možnosť B: Cez Railway Dashboard**
1. V Railway dashboarde → tvoj Next.js service
2. Klikni na **"Settings"** → **"Deploy"**
3. V **"Run Command"** zadaj: `npm run db:setup`
4. Klikni na **"Redeploy"**

## Krok 7: Seed databázy (voliteľné)

Ak chceš naplniť databázu testovacími údajmi:

```bash
railway run npm run db:seed
```

## Overenie

Po nasadení:

1. Otvor tvoju Railway URL (napr. `https://tvoj-projekt.railway.app`)
2. Aplikácia by mala fungovať
3. Skontroluj logy v Railway dashboarde pre chyby

## Troubleshooting

### Chyba: "extension postgis does not exist"
- Uisti sa, že si spustil `CREATE EXTENSION IF NOT EXISTS postgis;` v Railway SQL Editor

### Chyba: "relation does not exist"
- Spusti migrácie: `railway run npm run db:migrate:deploy`

### Chyba: "DATABASE_URL is not set"
- Skontroluj, či máš PostgreSQL databázu v tom istom Railway projekte
- Railway automaticky nastaví `DATABASE_URL`, ak sú v tom istom projekte

### Chyba pri buildu
- Skontroluj logy v Railway dashboarde
- Uisti sa, že všetky environment variables sú nastavené
- Skontroluj, či `postinstall` script beží správne

## Poznámky

- Railway automaticky poskytuje `DATABASE_URL` s internou URL (`postgres.railway.internal`)
- Táto URL funguje len v Railway prostredí (čo je presne to, čo chceme)
- Všetky migrácie sa spustia automaticky cez `postinstall` script
- PostGIS musí byť povolený manuálne cez SQL Editor (prvýkrát)

## Ďalšie kroky

Po úspešnom nasadení:
1. ✅ Aplikácia beží na Railway
2. ✅ Databáza je pripravená
3. ✅ Môžeš začať používať aplikáciu
