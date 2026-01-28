# Záchranný plán: 500 na `/properties/filtered` a `/saved-properties`

**Pozn.:** Projekt beží na Verceli, bez lokálnej databázy. Build a DB sync sa dejú pri deployi.

Keď frontend posiela správne požiadavky (mestá, filtre) ale API vracia **500**, väčšinou jde o **databázu** alebo **schému**.

---

## P2022: „The column (not available) does not exist in the current database“

**Príčina:** Prisma očakáva stĺpce podľa schémy, ale production DB ich nemá (schéma vs. DB nezhoda).

**Riešenie:** Synchronizovať schému s production DB – `npx prisma db push` proti **production** `DATABASE_URL`.

**Automaticky:** Pri každom Vercel deployi sa spustí `prisma db push` počas buildu (`scripts/vercel-db-push.sh`). Stačí push do `main` a nechať prebehnúť deploy – schéma sa zosynchronizuje s production DB.

### Cursor + Railway (žiadna lokálna DB)

Cursor spúšťa príkazy na tvojom PC. Aby `prisma db push` išiel na **Railway** (nie na localhost), musí mať Prisma `DATABASE_URL` z **`.env`**.

1. **Skontroluj `.env`:**
   - V koreni projektu musí byť súbor **`.env`** (nie len `.env.example`).
   - Ak chýba: `cp .env.example .env` a doplň premenné.

2. **Nastav `DATABASE_URL` na Railway:**
   - Railway Dashboard → tvoja PostgreSQL DB → **Connect** → **Public Network**
   - Skopíruj connection string (napr. `postgresql://postgres:PASSWORD@HOST.proxy.rlwy.net:PORT/railway`).
   - Pridaj `?sslmode=require` na koniec.
   - Do `.env` vlož riadok:
     ```
     DATABASE_URL="postgresql://postgres:PASSWORD@HOST.proxy.rlwy.net:PORT/railway?sslmode=require"
     ```
   - Ulož súbor (`.env` je v `.gitignore`, do gitu nechodí).

3. **Spusti db push (Cursor / terminál):**
   ```bash
   npx prisma db push
   ```
   Prisma načíta `DATABASE_URL` z `.env` a pushne schému na Railway. Nepoužíva sa žiadna lokálna Postgres.

4. **Ak vidíš `localhost:5432` alebo „Can't reach database server“:**  
   Znamená to, že `DATABASE_URL` sa nenačítava (chýba `.env` alebo v ňom nie je `DATABASE_URL`). Over krok 1–2.

   **Ak je `DATABASE_URL` nastavená ale stále „Connection refused“:** Railway môže blokovať prístup z tvojej IP. Skontroluj, či používaš **Public Network** connection string a či nemáš zmenené heslo.

### Railway: „column Property.property_type does not exist“

Ak v Railway Postgres logoch vidíš túto chybu (alebo ďalšie chýbajúce stĺpce), schéma nebola zosynchronizovaná.

**Rýchla oprava – spusti SQL v Railway:**

1. Otvor **Railway** → tvoj projekt → **PostgreSQL** → **Data** alebo **Query**.
2. Skopíruj obsah `prisma/railway-fix-property-columns.sql` a spusti ho ako dotaz.
3. Skript pridá `property_type`, `status`, AI stĺpce atď. (`ADD COLUMN IF NOT EXISTS`).

**Alternatíva:** V koreni projektu máš `.env` s Railway `DATABASE_URL`. Spusti `npm run db:railway-fix` – ten použije ten istý skript cez Prisma.

5. **Po úspešnom pushi:**  
   Správa typu „Database schema is now in sync“. Vercel (cez Railway DB) potom prestane hádzať P2022 / 500.

### Kroky (Vercel + production Postgres)

1. **Získaj production `DATABASE_URL`:**
   - Vercel Dashboard → tvoj projekt (**sria-two**) → **Settings** → **Environment Variables**, alebo  
   - **Railway** → PostgreSQL → Connect → Public Network.  
   Skopíruj celý reťazec (včetne hesla).

2. **Spusti db push s touto URL:**

   ```bash
   DATABASE_URL="postgresql://user:pass@host:port/db?sslmode=require" npx prisma db push
   ```

   Alebo nastav `DATABASE_URL` do **`.env`** v koreni projektu a potom:

   ```bash
   npx prisma db push
   ```

   Prípadne `npm run db:push:prod` (skript kontroluje, či nie si na localhost).

3. **Po úspešnom `db push`:**  
   Vercel používa tú istú DB – zmeny sú v databáze. **Redeploy nie je potrebný** na opravu P2022. Ak 500 pretrváva, over v Logs, že Vercel naozaj používa tú istú `DATABASE_URL`.

---

## 1. Synchronizuj databázu (všeobecne)

Po zmene Prisma schémy alebo novom scrapingu (nové polia, tabuľky) musí byť DB v súlade so schémou:

```bash
npx prisma db push
```

- **Lokálne:** Spusti proti `DATABASE_URL` z `.env`.
- **Production (Vercel):** Použi production `DATABASE_URL` ako vyššie a spusti `db push` lokálne.

## 2. Vyčisti cache a reštartuj (lokálny dev)

```bash
rm -rf .next
npm run dev
```

## 3. Čo sme upravili v kóde

- **`/api/v1/properties/filtered`:** Validácia enumov (`ListingType`, `PropertySource`, `PropertyCondition`), ošetrenie `limit`/`page`, bezpečný parse `preferences.condition`, filter `status: ACTIVE`, lepšie logovanie (vrátený `code` pri chybe).
- **`/api/v1/saved-properties`:** Odstránený `snapshots` z `include` (menší záber, menej miesta na zlyhanie), vylepšené logovanie + `code` v 500 odpovedi.
- **Admin report grafy:** Render len keď sú dáta (`data &&`), rodičovský kontajner s fixnou výškou v px (`h-[256px]` atď.), placeholder „Žiadne dáta“ namiesto prázdneho Recharts.

## 4. Vercel logy – kde hľadať pravdu

1. **Vercel Dashboard** → tvoj projekt → **Logs**.
2. **Functions** / **Runtime Logs**: tu uvidíš `console.error` z API (filtered, saved-properties). Hľadaj riadok s chybou a Prisma `code` (ak sme ho do odpovede pridali).

Presný stack trace ti povie, ktorý model, pole alebo migrácia spôsobuje pád.

## 5. Ak 500 pretrváva

- Over, že `db push` bežal **proti production** DB (ta istá `DATABASE_URL` ako na Verceli).
- Over `DATABASE_URL` (prefix `postgresql://`, prístup z Vercelu cez pooler ak používaš).
- Pre P2022 **netreba** redeploy – zmeny sú v DB. Ak stále 500, over v Logs, že Vercel používa tú istú DB.
- Skontroluj, či nový scraping neposiela dáta, ktoré porušujú NOT NULL / enum (napr. `condition`, `listing_type`). V tom prípade uprav webhook / validáciu pred zápisom do DB.
