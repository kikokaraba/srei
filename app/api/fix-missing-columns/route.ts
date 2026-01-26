/**
 * Fix missing columns in database
 * Adds columns that exist in Prisma schema but not in database
 */

import { NextResponse } from "next/server";
import { Pool } from "pg";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const secret = url.searchParams.get("secret");
  
  if (secret !== "fix-now" && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Add ?secret=fix-now" }, { status: 401 });
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    return NextResponse.json({ error: "No DATABASE_URL" }, { status: 500 });
  }

  const pool = new Pool({ connectionString });
  const results: string[] = [];

  try {
    // Check if primaryCity column exists in UserPreferences
    const primaryCityCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'UserPreferences' AND column_name = 'primaryCity';
    `);

    if (primaryCityCheck.rows.length === 0) {
      results.push("⚠️ UserPreferences.primaryCity column missing - adding...");
      
      await pool.query(`
        ALTER TABLE "UserPreferences" 
        ADD COLUMN IF NOT EXISTS "primaryCity" VARCHAR(255) NULL;
      `);
      
      results.push("✅ primaryCity column added");
    } else {
      results.push("✓ primaryCity column already exists");
    }

    // Verify
    const verifyCheck = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'UserPreferences' AND column_name = 'primaryCity';
    `);
    
    results.push(`Verification: ${JSON.stringify(verifyCheck.rows)}`);

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
