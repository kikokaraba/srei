#!/bin/bash

# Script na inicializáciu databázy
# Spustí sa len raz pri prvom nasadení

set -e

echo "🗄️  Inicializujem databázu..."

# Skúsi vytvoriť schému
pnpm exec prisma db push --accept-data-loss || {
    echo "⚠️  Databáza už existuje alebo nastala chyba"
}

echo "✅ Databáza inicializovaná"

# Spusti seed (vytvorí admin používateľa)
echo "🌱 Spúšťam seed..."
pnpm run db:seed || {
    echo "⚠️  Seed zlyhal alebo už bol spustený"
}

echo "✅ Seed dokončený"
