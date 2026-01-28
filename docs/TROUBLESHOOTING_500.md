# Záchranný plán: 500 na `/properties/filtered` a `/saved-properties`

Keď frontend posiela správne požiadavky (mestá, filtre) ale API vracia **500**, väčšinou jde o **databázu** alebo **schému**.

## 1. Synchronizuj databázu (najčastejšia príčina)

Po zmene Prisma schémy alebo novom scrapingu (nové polia, tabuľky) musí byť DB v súlade so schémou:

```bash
npx prisma db push
```

- **Lokálne:** Spusti proti tvojej `DATABASE_URL` z `.env`.
- **Vercel:** `DATABASE_URL` v Project → Settings → Environment Variables musí smerovať na production DB. Potom spusti `npx prisma db push` **lokálne** s touto URL (napr. cez `.env.production` alebo jednorázovo `DATABASE_URL="..." npx prisma db push`).

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

- Over `DATABASE_URL` (prefix `postgresql://`, prístup z Vercelu cez pooler ak používaš).
- Over, že si po `prisma db push` **redeployol** (push do Git → Vercel znova nasadí).
- Skontroluj, či nový scraping neposiela dáta, ktoré porušujú NOT NULL / enum (napr. `condition`, `listing_type`). V tom prípade uprav webhook / validáciu pred zápisom do DB.
