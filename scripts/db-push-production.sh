#!/usr/bin/env bash
# Synchronizuje Prisma schému s production DB (rieši P2022 – stĺpec neexistuje).
# Pred spustením nastav DATABASE_URL na production (Vercel env vars).

set -e

if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL nie je nastavená."
  echo "   Vercel: Project → Settings → Environment Variables → DATABASE_URL → copy."
  echo "   Potom: DATABASE_URL='postgresql://...' ./scripts/db-push-production.sh"
  exit 1
fi

if echo "$DATABASE_URL" | grep -qE 'localhost|127\.0\.0\.1'; then
  echo "⚠️  DATABASE_URL vyzerá ako lokálna DB. Pre production použij URL z Vercelu."
  read -p "   Pokračovať aj tak? [y/N] " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[yY]$ ]]; then
    exit 1
  fi
fi

echo "▶ Running: npx prisma db push (schema → DB)"
npx prisma db push --schema=./prisma/schema.prisma
echo "✅ Hotovo. Redeploy na Verceli (git push) nie je potrebný – zmeny sú v DB."
echo "   Ak 500 pretrváva, skontroluj Logs a či Vercel používa tú istú DATABASE_URL."
