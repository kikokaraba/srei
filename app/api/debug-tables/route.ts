/**
 * Debug endpoint - check database tables and columns
 * 
 * ADMIN ONLY - requires admin authentication
 */

import { NextResponse } from "next/server";
import { Pool } from "pg";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  // Admin auth check
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden - Admin only" }, { status: 403 });
  }
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    return NextResponse.json({ error: "No DATABASE_URL" }, { status: 500 });
  }

  const pool = new Pool({ connectionString });

  try {
    // List all tables
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);

    // Check for any SlovakCity related columns
    const slovakCityColumns = await pool.query(`
      SELECT table_name, column_name, data_type, udt_name
      FROM information_schema.columns 
      WHERE table_schema = 'public'
      AND (udt_name LIKE '%Slovak%' OR udt_name LIKE '%City%' OR column_name LIKE '%city%' OR column_name LIKE '%City%')
      ORDER BY table_name, column_name;
    `);

    // Check all enum types
    const enumTypes = await pool.query(`
      SELECT typname, typtype
      FROM pg_type 
      WHERE typtype = 'e';
    `);

    // Check UserPreferences table structure
    const userPrefsColumns = await pool.query(`
      SELECT column_name, data_type, udt_name, is_nullable
      FROM information_schema.columns 
      WHERE table_name ILIKE '%preference%'
      ORDER BY table_name, ordinal_position;
    `);

    await pool.end();

    return NextResponse.json({
      tables: tables.rows.map(r => r.table_name),
      cityRelatedColumns: slovakCityColumns.rows,
      enumTypes: enumTypes.rows,
      userPreferencesColumns: userPrefsColumns.rows,
    });

  } catch (error) {
    await pool.end();
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}
