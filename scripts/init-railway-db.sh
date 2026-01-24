#!/bin/bash

# Railway Database Initialization Script
# Tento skript sa spustí na Railway po prvom nasadení

set -e

echo "🚂 Railway Database Initialization"
echo "===================================="
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ Chyba: DATABASE_URL nie je nastavený"
    exit 1
fi

echo "✅ DATABASE_URL je nastavený"
echo ""

# Enable PostGIS extension
echo "🗺️  Povoľujem PostGIS rozšírenie..."
npx prisma db execute --file prisma/enable-postgis.sql --schema prisma/schema.prisma || {
    echo "⚠️  Nepodarilo sa povoliť PostGIS cez Prisma. Skúsim cez psql..."
    if command -v psql &> /dev/null; then
        psql "$DATABASE_URL" -c "CREATE EXTENSION IF NOT EXISTS postgis;" || {
            echo "⚠️  Nepodarilo sa povoliť PostGIS. Prosím povoľ manuálne v Railway SQL Editor:"
            echo "   CREATE EXTENSION IF NOT EXISTS postgis;"
        }
    else
        echo "⚠️  psql nie je dostupný. Prosím povoľ PostGIS manuálne v Railway SQL Editor:"
        echo "   CREATE EXTENSION IF NOT EXISTS postgis;"
    fi
}
echo ""

# Generate Prisma client
echo "🔧 Generujem Prisma klienta..."
npx prisma generate --schema prisma/schema.prisma
echo "✅ Prisma klient vygenerovaný"
echo ""

# Run migrations
echo "📊 Spúšťam migrácie..."
npx prisma migrate deploy --schema prisma/schema.prisma || {
    echo "⚠️  Migrácie zlyhali. Skúsim db push..."
    npx prisma db push --schema prisma/schema.prisma --accept-data-loss
}
echo "✅ Migrácie dokončené"
echo ""

echo "🎉 Databáza inicializovaná!"
echo ""
