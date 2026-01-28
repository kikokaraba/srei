#!/usr/bin/env bash
# Na Verceli (VERCEL=1) spustí prisma db push proti production DB.
# Lokálne build preskočí – nepoužíva sa localhost.

set -e

if [ -n "$VERCEL" ]; then
  echo "▶ Vercel build: prisma db push (sync schema → production DB)..."
  npx prisma db push --schema=./prisma/schema.prisma --skip-generate
  echo "✅ db push done."
else
  echo "▶ Skipping db push (not on Vercel)."
fi
