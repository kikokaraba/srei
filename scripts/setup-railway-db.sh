#!/bin/bash

# Railway Database Setup Script
# Tento skript pomôže nastaviť Railway PostgreSQL databázu

set -e

echo "🚂 Railway Database Setup"
echo "========================="
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ Chyba: DATABASE_URL nie je nastavený"
    echo ""
    echo "Prosím nastav DATABASE_URL v .env súbore alebo ako environment variable:"
    echo "  export DATABASE_URL='postgresql://postgres:PASSWORD@HOST:PORT/railway?sslmode=require'"
    exit 1
fi

echo "✅ DATABASE_URL je nastavený"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Chyba: Node.js nie je nainštalovaný"
    echo ""
    echo "Prosím nainštaluj Node.js:"
    echo "  macOS: brew install node"
    echo "  alebo: https://nodejs.org"
    exit 1
fi

echo "✅ Node.js je nainštalovaný: $(node --version)"
echo ""

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ Chyba: npm nie je nainštalovaný"
    exit 1
fi

echo "✅ npm je nainštalovaný: $(npm --version)"
echo ""

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Inštalujem závislosti..."
    npm install
    echo "✅ Závislosti nainštalované"
    echo ""
else
    echo "✅ Závislosti už sú nainštalované"
    echo ""
fi

# Enable PostGIS extension
echo "🗺️  Povoľujem PostGIS rozšírenie..."
if command -v psql &> /dev/null; then
    psql "$DATABASE_URL" -c "CREATE EXTENSION IF NOT EXISTS postgis;" 2>/dev/null || {
        echo "⚠️  Nepodarilo sa spustiť psql. Prosím povoľ PostGIS manuálne:"
        echo "   V Railway dashboarde → SQL Editor → spusti:"
        echo "   CREATE EXTENSION IF NOT EXISTS postgis;"
    }
else
    echo "⚠️  psql nie je nainštalovaný. Prosím povoľ PostGIS manuálne:"
    echo "   V Railway dashboarde → SQL Editor → spusti:"
    echo "   CREATE EXTENSION IF NOT EXISTS postgis;"
fi
echo ""

# Generate Prisma client
echo "🔧 Generujem Prisma klienta..."
npm run db:generate
echo "✅ Prisma klient vygenerovaný"
echo ""

# Run migrations
echo "📊 Spúšťam migrácie..."
npm run db:migrate || {
    echo "⚠️  Migrácie zlyhali. Skúsim db:push..."
    npm run db:push
}
echo "✅ Migrácie dokončené"
echo ""

echo "🎉 Nastavenie databázy dokončené!"
echo ""
echo "Ďalšie kroky:"
echo "  • Test pripojenia: npm run db:studio"
echo "  • Seed databázy: npm run db:seed"
echo ""
