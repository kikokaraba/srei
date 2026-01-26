/**
 * Fix city columns - convert from enum to varchar
 * Fixes both Property.city and UserPreferences.primaryCity
 */

import { NextResponse } from "next/server";
import { Pool } from "pg";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const secret = url.searchParams.get("secret");
  
  // Security check
  if (secret !== "fix-enum-now" && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Add ?secret=fix-enum-now" }, { status: 401 });
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    return NextResponse.json({ error: "No DATABASE_URL" }, { status: 500 });
  }

  const pool = new Pool({ connectionString });
  const results: string[] = [];

  try {
    // ========== FIX Property.city ==========
    const propertyCityCheck = await pool.query(`
      SELECT column_name, data_type, udt_name 
      FROM information_schema.columns 
      WHERE table_name = 'Property' AND column_name = 'city';
    `);
    
    results.push(`Property.city: ${JSON.stringify(propertyCityCheck.rows)}`);

    if (propertyCityCheck.rows.length > 0 && propertyCityCheck.rows[0].udt_name === 'SlovakCity') {
      await pool.query(`
        ALTER TABLE "Property" 
        ALTER COLUMN "city" TYPE VARCHAR(255) 
        USING "city"::text;
      `);
      results.push("✅ Property.city converted to VARCHAR");
    } else {
      results.push("✓ Property.city already OK");
    }

    // ========== FIX UserPreferences.primaryCity ==========
    const prefCityCheck = await pool.query(`
      SELECT column_name, data_type, udt_name 
      FROM information_schema.columns 
      WHERE table_name = 'UserPreferences' AND column_name = 'primaryCity';
    `);
    
    results.push(`UserPreferences.primaryCity: ${JSON.stringify(prefCityCheck.rows)}`);

    if (prefCityCheck.rows.length > 0 && prefCityCheck.rows[0].udt_name === 'SlovakCity') {
      await pool.query(`
        ALTER TABLE "UserPreferences" 
        ALTER COLUMN "primaryCity" TYPE VARCHAR(255) 
        USING "primaryCity"::text;
      `);
      results.push("✅ UserPreferences.primaryCity converted to VARCHAR");
    } else {
      results.push("✓ UserPreferences.primaryCity already OK");
    }

    // ========== CHECK OTHER TABLES ==========
    const allSlovakCityColumns = await pool.query(`
      SELECT table_name, column_name, udt_name
      FROM information_schema.columns 
      WHERE udt_name = 'SlovakCity';
    `);
    
    results.push(`Other SlovakCity columns: ${JSON.stringify(allSlovakCityColumns.rows)}`);

    // Fix any remaining columns
    for (const row of allSlovakCityColumns.rows) {
      try {
        await pool.query(`
          ALTER TABLE "${row.table_name}" 
          ALTER COLUMN "${row.column_name}" TYPE VARCHAR(255) 
          USING "${row.column_name}"::text;
        `);
        results.push(`✅ Fixed ${row.table_name}.${row.column_name}`);
      } catch (e) {
        results.push(`⚠️ Could not fix ${row.table_name}.${row.column_name}: ${e instanceof Error ? e.message : "unknown"}`);
      }
    }

    // ========== DROP ENUM TYPE ==========
    try {
      await pool.query(`DROP TYPE IF EXISTS "SlovakCity" CASCADE;`);
      results.push("✅ SlovakCity enum type dropped");
    } catch (e) {
      results.push(`⚠️ Could not drop enum: ${e instanceof Error ? e.message : "unknown"}`);
    }

    // ========== VERIFY ==========
    const finalCheck = await pool.query(`
      SELECT typname FROM pg_type WHERE typname = 'SlovakCity';
    `);
    results.push(`SlovakCity enum still exists: ${finalCheck.rows.length > 0}`);

    await pool.end();

    return NextResponse.json({
      success: true,
      results,
    });

  } catch (error) {
    await pool.end();
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      results,
    }, { status: 500 });
  }
}

export const maxDuration = 30;
