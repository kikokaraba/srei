# Quick Start - Railway Deployment

## Rýchle nastavenie (5 minút)

### 1. Railway Dashboard
1. Vytvor nový projekt na [railway.app](https://railway.app)
2. Pridaj **PostgreSQL** databázu
3. Pridaj **GitHub Repo** (alebo upload kód)

### 2. Povol PostGIS
V Railway → PostgreSQL → **SQL Editor**:
```sql
CREATE EXTENSION IF NOT EXISTS postgis;
```

### 3. Nastav Environment Variables
V Railway → Next.js service → **Variables**:
- `NEXTAUTH_SECRET` - vygeneruj: `openssl rand -base64 32`
- `NEXTAUTH_URL` - tvoja Railway URL (napr. `https://tvoj-projekt.railway.app`)

### 4. Deploy
Railway automaticky:
- ✅ Nastaví `DATABASE_URL`
- ✅ Spustí `npm install`
- ✅ Spustí `prisma generate` (cez postinstall)
- ✅ Spustí `npm run build`
- ✅ Spustí `npm start`

### 5. Spusti migrácie (ak sa nespustili automaticky)
```bash
railway run npm run db:migrate:deploy
```

**Hotovo! 🎉**

---

## Tvoja aktuálna DATABASE_URL

```
postgresql://postgres:pKJlIHLdgFlhYhPKLzwcWNJHdhGVQkki@postgres.railway.internal:5432/railway
```

Táto URL je správna pre Railway prostredie. Railway ju automaticky nastaví ako environment variable.

---

## Čo som pripravil

✅ `.env` - aktualizovaný pre Railway  
✅ `railway.json` - Railway konfigurácia  
✅ `scripts/init-railway-db.sh` - inicializačný skript  
✅ `scripts/setup-postgis.ts` - PostGIS setup  
✅ `package.json` - nové Railway scripts  
✅ `RAILWAY_DEPLOY.md` - detailný návod  

---

## Ďalšie kroky

1. Pushni kód na GitHub (ak ešte nie je)
2. V Railway vytvor projekt a pripoj GitHub repo
3. Pridaj PostgreSQL databázu
4. Povol PostGIS (SQL Editor)
5. Nastav environment variables
6. Deploy!

Viac detailov: pozri `RAILWAY_DEPLOY.md`
