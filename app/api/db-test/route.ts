/**
 * Database connection test
 * 
 * ADMIN ONLY - requires admin authentication
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

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
