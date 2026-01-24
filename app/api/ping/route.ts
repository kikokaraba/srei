// Simple ping endpoint - no database
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ 
    ok: true, 
    time: new Date().toISOString(),
    env: {
      hasDbUrl: !!process.env.DATABASE_URL,
      dbUrlPrefix: process.env.DATABASE_URL?.substring(0, 30) + "...",
    }
  });
}

export const runtime = "nodejs";
