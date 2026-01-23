# 🚀 Quick Start - Railway Database Setup

## Krok 1: Nastavenie .env súboru

Vytvorte `.env` súbor v root adresári projektu (vedľa `package.json`):

```bash
# V termináli:
touch .env
```

Potom otvorte `.env` a pridajte:

```env
# Railway PostgreSQL Database
DATABASE_URL="postgresql://postgres:pKJlIHLdgFlhYhPKLzwcWNJHdhGVQkki@centerbeam.proxy.rlwy.net:29957/railway"

# NextAuth
NEXTAUTH_SECRET="your-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"

# Upstash Redis (pre rate limiting) - voliteľné pre začiatok
UPSTASH_REDIS_REST_URL="https://your-redis-instance.upstash.io"
UPSTASH_REDIS_REST_TOKEN="your-redis-token-here"
```

**⚠️ DÔLEŽITÉ:** `.env` súbor je už v `.gitignore`, takže sa necommitne do git repozitára.

## Krok 2: PostGIS Extension

Railway PostgreSQL potrebuje PostGIS extension pre geospatial queries. Spustite tento SQL príkaz:

### Možnosť A: Railway Dashboard

1. Prejdite na Railway dashboard: https://railway.app
2. Kliknite na vašu PostgreSQL databázu
3. Kliknite na "Query" tab
4. Vložte a spustite:

```sql
CREATE EXTENSION IF NOT EXISTS postgis;
```

### Možnosť B: Railway CLI

```bash
# Nainštalujte Railway CLI (ak ešte nemáte)
npm i -g @railway/cli

# Prihláste sa
railway login

# Spustite SQL príkaz
railway run psql -c "CREATE EXTENSION IF NOT EXISTS postgis;"
```

### Možnosť C: Priame pripojenie cez psql

```bash
psql "postgresql://postgres:pKJlIHLdgFlhYhPKLzwcWNJHdhGVQkki@centerbeam.proxy.rlwy.net:29957/railway" -c "CREATE EXTENSION IF NOT EXISTS postgis;"
```

## Krok 3: Generovanie Prisma Client

```bash
npm install
npx prisma generate
```

## Krok 4: Push Schema do Databázy

```bash
# Pre development - push schema bez migrácií
npx prisma db push

# Alebo vytvorte migráciu (odporúčané pre production)
npx prisma migrate dev --name init
```

## Krok 5: Overenie pripojenia

```bash
# Otvorte Prisma Studio (GUI pre databázu)
npx prisma studio
```

Alebo test query:

```bash
npx prisma db pull
```

## Krok 6: Spustenie aplikácie

```bash
npm run dev
```

Aplikácia by sa mala spustiť na http://localhost:3000

## 🔒 Bezpečnostné poznámky

1. **NIKDY necommitnite `.env` súbor** - je už v `.gitignore`
2. **NEXTAUTH_SECRET**: Vygenerujte silný secret:
   ```bash
   openssl rand -base64 32
   ```
3. **Railway URL obsahuje heslo** - chráňte ju ako heslo
4. **Pre production**: Použite Railway environment variables namiesto `.env` súboru

## 🐛 Troubleshooting

### Chyba: "Extension postgis does not exist"
- Uistite sa, že ste spustili `CREATE EXTENSION IF NOT EXISTS postgis;`
- Skontrolujte, či Railway PostgreSQL podporuje PostGIS (mal by)

### Chyba: "Connection refused"
- Skontrolujte, či je `DATABASE_URL` správne v `.env`
- Overte, či Railway databáza beží
- Skontrolujte firewall settings

### Chyba: "SSL connection required"
- Railway automaticky používa SSL, takže by to nemalo byť problém
- Ak áno, pridajte `?sslmode=require` na koniec `DATABASE_URL`

## 📊 Ďalšie kroky

Po úspešnom pripojení môžete:

1. **Vytvoriť prvého používateľa** cez aplikáciu
2. **Pridať testovacie dáta** cez Prisma Studio
3. **Nastaviť Vercel deployment** s Railway `DATABASE_URL` v environment variables

---

**Poznámka:** Railway poskytuje automatické backups. Pre production odporúčam nastaviť pravidelné backups v Railway settings.
