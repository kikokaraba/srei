-- PostGIS Extension Setup for Railway PostgreSQL
-- Spustite tento príkaz v Railway Query tab alebo cez psql

CREATE EXTENSION IF NOT EXISTS postgis;

-- Overenie, že PostGIS funguje
SELECT PostGIS_version();
