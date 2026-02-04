#!/usr/bin/env bash
# Na Verceli (VERCEL=1) spustí prisma db push proti production DB.
# Pri chybe build nepádne – logujeme a pokračujeme (žiadna lokálna DB).

set -e

if [ -n "$VERCEL" ]; then
  echo "▶ Vercel build: prisma db push (sync schema → production DB)..."
  if npx prisma db push --schema=./prisma/schema.prisma; then
    echo "✅ db push done."
  else
    echo "⚠️ db push failed (non-fatal); continuing build. Fix DB/schema and redeploy if needed."
  fi
else
  echo "▶ Skipping db push (not on Vercel)."
fi
