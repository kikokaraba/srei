/**
 * Fix city column - convert from enum to varchar
 * Run this ONCE to fix the SlovakCity enum issue
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
    // Check current column type
    const columnCheck = await pool.query(`
      SELECT column_name, data_type, udt_name 
      FROM information_schema.columns 
      WHERE table_name = 'Property' AND column_name = 'city';
    `);
    
    results.push(`Current city column: ${JSON.stringify(columnCheck.rows)}`);

    // Check if SlovakCity enum exists
    const enumCheck = await pool.query(`
      SELECT typname FROM pg_type WHERE typname = 'SlovakCity';
    `);
    
    results.push(`SlovakCity enum exists: ${enumCheck.rows.length > 0}`);

    if (columnCheck.rows.length > 0 && columnCheck.rows[0].udt_name === 'SlovakCity') {
      results.push("⚠️ City column is using SlovakCity enum - fixing...");
      
      // Convert the column from enum to varchar
      await pool.query(`
        ALTER TABLE "Property" 
        ALTER COLUMN "city" TYPE VARCHAR(255) 
        USING "city"::text;
      `);
      
      results.push("✅ City column converted to VARCHAR(255)");

      // Drop the enum type (optional)
      try {
        await pool.query(`DROP TYPE IF EXISTS "SlovakCity" CASCADE;`);
        results.push("✅ SlovakCity enum type dropped");
      } catch (e) {
        results.push(`⚠️ Could not drop enum: ${e instanceof Error ? e.message : "unknown"}`);
      }
    } else {
      results.push("City column is already VARCHAR or TEXT - no fix needed");
    }

    // Verify the fix
    const verifyCheck = await pool.query(`
      SELECT column_name, data_type, udt_name 
      FROM information_schema.columns 
      WHERE table_name = 'Property' AND column_name = 'city';
    `);
    
    results.push(`After fix - city column: ${JSON.stringify(verifyCheck.rows)}`);

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
