# Railway Database Setup - SRIA Projekt

## 🚂 Railway PostgreSQL Konfigurácia

Railway poskytuje PostgreSQL databázy s automatickým nastavením `DATABASE_URL` environment variable.

## Krok 1: Vytvorenie databázy na Railway

1. **Prihláste sa na Railway**: https://railway.app
2. **Vytvorte nový projekt** alebo použite existujúci
3. **Pridajte PostgreSQL databázu**:
   - Kliknite na "New" → "Database" → "PostgreSQL"
   - Railway automaticky vytvorí databázu a nastaví `DATABASE_URL`

## Krok 2: Konfigurácia Environment Variables

### Na Railway Dashboard:

1. Prejdite do vášho projektu
2. Kliknite na PostgreSQL databázu
3. V sekcii "Variables" nájdete `DATABASE_URL`
4. Skopírujte `DATABASE_URL` hodnotu

### Pre lokálny vývoj:

Vytvorte `.env` súbor v root adresári projektu:

```env
# Railway PostgreSQL Database
DATABASE_URL="postgresql://postgres:PASSWORD@HOST:PORT/railway?sslmode=require"

# NextAuth
NEXTAUTH_SECRET="your-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"

# Upstash Redis (pre rate limiting)
UPSTASH_REDIS_REST_URL="https://your-redis-instance.upstash.io"
UPSTASH_REDIS_REST_TOKEN="your-redis-token-here"
```

## Krok 3: PostGIS Extension

Railway PostgreSQL podporuje PostGIS extension. Po vytvorení databázy:

1. **Prejdite do Railway PostgreSQL databázy**
2. **Kliknite na "Query" tab**
3. **Spustite tento SQL príkaz**:

```sql
CREATE EXTENSION IF NOT EXISTS postgis;
```

Alebo použite Railway CLI:

```bash
railway run psql -c "CREATE EXTENSION IF NOT EXISTS postgis;"
```

## Krok 4: Prisma Migrácie

Po nastavení `DATABASE_URL`:

```bash
# Vygenerovať Prisma Client
npx prisma generate

# Spustiť migrácie
npx prisma migrate dev

# Alebo push schema (pre development)
npx prisma db push
```

## Krok 5: Vercel Deployment

### Nastavenie Environment Variables na Vercel:

1. Prejdite do Vercel projektu
2. Settings → Environment Variables
3. Pridajte tieto premenné:

```
DATABASE_URL=postgresql://postgres:PASSWORD@HOST:PORT/railway?sslmode=require
NEXTAUTH_SECRET=your-secret-key-here
NEXTAUTH_URL=https://your-domain.vercel.app
UPSTASH_REDIS_REST_URL=https://your-redis-instance.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-redis-token-here
```

### Railway Private Networking (voliteľné):

Ak chcete použiť Railway Private Networking s Vercel:

1. V Railway projekte: Settings → Networking
2. Pridajte Vercel IP ranges alebo použite Railway Private Networking
3. Aktualizujte `DATABASE_URL` s private network URL

## Krok 6: Overenie pripojenia

```bash
# Test pripojenia
npx prisma db pull

# Alebo otvorte Prisma Studio
npx prisma studio
```

## 🔒 Bezpečnostné poznámky

1. **Nikdy necommitnite `.env` súbor** - je už v `.gitignore`
2. **Použite silné heslá** pre `NEXTAUTH_SECRET`
3. **Railway automaticky šifruje pripojenia** (SSL)
4. **Obmedzte prístup** k databáze cez Railway networking settings

## 📊 Railway Dashboard

V Railway dashboard môžete:
- Sledovať využitie databázy
- Zobraziť query logs
- Spravovať backups
- Nastaviť scaling

## 🆘 Troubleshooting

### Chyba: "Connection refused"
- Skontrolujte, či je `DATABASE_URL` správne nastavená
- Overte, či Railway databáza beží
- Skontrolujte firewall settings

### Chyba: "Extension postgis does not exist"
- Spustite `CREATE EXTENSION IF NOT EXISTS postgis;` v Railway Query tab

### Chyba: "SSL connection required"
- Uistite sa, že `DATABASE_URL` obsahuje `?sslmode=require`

## 📚 Užitočné odkazy

- [Railway Documentation](https://docs.railway.app)
- [Railway PostgreSQL Guide](https://docs.railway.app/databases/postgresql)
- [Prisma Railway Guide](https://www.prisma.io/docs/guides/deployment/deployment-guides/deploying-to-railway)

---

**Poznámka:** Railway poskytuje automatické backups a monitoring. Pre production odporúčam nastaviť pravidelné backups v Railway settings.
