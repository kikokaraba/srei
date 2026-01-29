-- Pridá chýbajúce stĺpce do "Property" na Railway.
-- Spusti jedným z:
--   A) Railway → tvoj projekt → PostgreSQL → Query → vlož tento súbor → Run
--   B) Lokálne (v .env musí byť DATABASE_URL na Railway): npm run db:railway-fix
-- Prisma očakáva tieto stĺpce; bez nich INSERT/UPDATE padajú (property_type, status, …).

ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "property_type" TEXT;
ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "street" TEXT;
ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "first_listed_at" TIMESTAMPTZ;
ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "thumbnail_url" TEXT;
ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "photo_count" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "seller_name" TEXT;
ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "seller_phone" TEXT;
ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "seller_type" TEXT;
ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "last_seen_at" TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "last_checked_at" TIMESTAMPTZ;
ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "priority_score" INTEGER NOT NULL DEFAULT 50;
ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "check_count_today" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "consecutive_failures" INTEGER NOT NULL DEFAULT 0;

-- ListingStatus enum + status (ak chýbajú)
DO $$ BEGIN
  CREATE TYPE "ListingStatus" AS ENUM ('ACTIVE', 'REMOVED', 'SOLD', 'WITHDRAWN', 'EXPIRED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "status" "ListingStatus" DEFAULT 'ACTIVE';

-- AI / analytik stĺpce
ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "constructionType" TEXT;
ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "ownership" TEXT;
ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "technicalCondition" TEXT;
ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "redFlags" TEXT;
ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "aiAddress" TEXT;
ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "investmentSummary" TEXT;
ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "top3_facts" TEXT;

-- DataFetchLog: chýbajúci stĺpec (Prisma očakáva hunterAlertsSent)
ALTER TABLE "DataFetchLog" ADD COLUMN IF NOT EXISTS "hunterAlertsSent" INTEGER;
