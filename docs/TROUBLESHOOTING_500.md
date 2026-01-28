# Záchranný plán: 500 na `/properties/filtered` a `/saved-properties`

Keď frontend posiela správne požiadavky (mestá, filtre) ale API vracia **500**, väčšinou jde o **databázu** alebo **schému**.

---

## P2022: „The column (not available) does not exist in the current database“

**Príčina:** Prisma očakáva stĺpce podľa schémy, ale production DB ich nemá (schéma vs. DB nezhoda).

**Riešenie:** Synchronizovať schému s production DB – `npx prisma db push` proti **production** `DATABASE_URL`.

**Automaticky:** Pri každom Vercel deployi sa spustí `prisma db push` počas buildu (`scripts/vercel-db-push.sh`). Stačí push do `main` a nechať prebehnúť deploy – schéma sa zosynchronizuje s production DB.

### Kroky (Vercel + production Postgres)

1. **Získaj production `DATABASE_URL`:**
   - Vercel Dashboard → tvoj projekt (**sria-two**) → **Settings** → **Environment Variables**
   - Nájdi `DATABASE_URL` (Production) → **Value** → skopíruj (celý reťazec, vrátane hesla).

2. **Spusti db push lokálne s touto URL:**

   ```bash
   DATABASE_URL="postgresql://user:pass@host:5432/db?sslmode=require" npm run db:push
   ```

   Alebo si ju nastav do `.env.production.local` (nepridávaj do gitu) a potom:

   ```bash
   npm run db:push
   ```

   Prípadne použij helper skript (kontroluje, či nie si na localhost):

   ```bash
   DATABASE_URL="postgresql://..." npm run db:push:prod
   ```

3. **Po úspešnom `db push`:**  
   Vercel už používa tú istú DB – zmeny sú v databáze. **Redeploy (git push) nie je potrebný** na opravu P2022. Ak 500 pretrváva, over v Logs, že Vercel naozaj používa tú istú `DATABASE_URL`.

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
