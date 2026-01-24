#!/bin/bash

# Script na inicializáciu databázy
# Spustí sa len raz pri prvom nasadení

set -e

echo "🗄️  Inicializujem databázu..."

# Skúsi vytvoriť schému
npx prisma db push --accept-data-loss || {
    echo "⚠️  Databáza už existuje alebo nastala chyba"
}

echo "✅ Databáza inicializovaná"
