# ✅ Setup Dokončený!

Vytvoril som `.env` súbor s vašou Railway databázou. Teraz dokončite nasledujúce kroky:

## ✅ Čo je už hotové:

1. ✅ `.env` súbor vytvorený s Railway `DATABASE_URL`
2. ✅ `NEXTAUTH_SECRET` vygenerovaný
3. ✅ SQL skript pre PostGIS vytvorený (`setup-postgis.sql`)

## 🔧 Ďalšie kroky:

### 1. Pridajte PostGIS Extension

**Možnosť A: Railway Dashboard (najjednoduchšie)**
1. Prejdite na https://railway.app
2. Kliknite na vašu PostgreSQL databázu
3. Kliknite na "Query" tab
4. Vložte a spustite:
```sql
CREATE EXTENSION IF NOT EXISTS postgis;
```

**Možnosť B: Cez psql**
```bash
psql "postgresql://postgres:pKJlIHLdgFlhYhPKLzwcWNJHdhGVQkki@centerbeam.proxy.rlwy.net:29957/railway" -c "CREATE EXTENSION IF NOT EXISTS postgis;"
```

### 2. Inštalujte závislosti a vygenerujte Prisma Client

```bash
npm install
npx prisma generate
```

### 3. Push Schema do Databázy

```bash
npx prisma db push
```

Alebo vytvorte migráciu:
```bash
npx prisma migrate dev --name init
```

### 4. Spustite aplikáciu

```bash
npm run dev
```

Aplikácia by sa mala spustiť na http://localhost:3000

## 🔒 Bezpečnostné poznámky:

- ✅ `.env` súbor je už v `.gitignore` - necommitne sa
- ⚠️ **NIKDY necommitnite `.env` súbor do git repozitára**
- ⚠️ Railway `DATABASE_URL` obsahuje heslo - chráňte ju

## 🐛 Ak sa vyskytnú problémy:

### Chyba: "Extension postgis does not exist"
- Uistite sa, že ste spustili `CREATE EXTENSION IF NOT EXISTS postgis;` v Railway

### Chyba: "Connection refused"
- Skontrolujte, či je Railway databáza aktívna
- Overte `DATABASE_URL` v `.env` súbore

### Chyba: "Prisma Client not generated"
- Spustite `npx prisma generate`

---

**Všetko je pripravené!** Po dokončení krokov 1-4 by aplikácia mala fungovať. 🚀
