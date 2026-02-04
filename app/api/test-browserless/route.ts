/**
 * Test Browserless BaaS connection
 * Uses Playwright connectOverCDP with stealth mode
 * Docs: https://docs.browserless.io/baas/quick-start
 * 
 * ADMIN ONLY - requires admin authentication
 */

import { NextResponse } from "next/server";
import { testBrowserlessConnection } from "@/lib/scraper/browserless-scraper";
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
  const endpoint = process.env.BROWSER_WS_ENDPOINT || "";
  
  // Extract token
  const tokenMatch = endpoint.match(/token=([^&]+)/);
  const token = tokenMatch?.[1] || "";

  if (!token) {
    return NextResponse.json({
      success: false,
      error: "BROWSER_WS_ENDPOINT not configured",
      hint: "Set BROWSER_WS_ENDPOINT=wss://production-sfo.browserless.io?token=YOUR_TOKEN",
      endpoint: endpoint ? "Set but missing token" : "Not set",
      docs: "https://docs.browserless.io/baas/quick-start",
    });
  }

  console.log("Testing Browserless BaaS connection...");
  console.log("Token prefix:", token.substring(0, 8) + "...");

  try {
    const result = await testBrowserlessConnection();
    
    return NextResponse.json({
      ...result,
      tokenPrefix: token.substring(0, 8) + "...",
      mode: "BaaS with Playwright + Stealth",
      docs: "https://docs.browserless.io/baas/bot-detection/stealth",
    });
  } catch (error) {
    console.error("Browserless test error:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      tokenPrefix: token.substring(0, 8) + "...",
    });
  }
}

export const runtime = "nodejs";
export const maxDuration = 30;
