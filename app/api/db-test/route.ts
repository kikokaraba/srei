// Database connection test
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const start = Date.now();
  
  try {
    // Simple query with timeout
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    
    return NextResponse.json({ 
      ok: true, 
      db: "connected",
      query: result,
      duration: Date.now() - start + "ms",
    });
  } catch (error) {
    return NextResponse.json({ 
      ok: false, 
      db: "error",
      error: error instanceof Error ? error.message : "Unknown",
      duration: Date.now() - start + "ms",
    }, { status: 500 });
  }
}

export const runtime = "nodejs";
export const maxDuration = 10;
