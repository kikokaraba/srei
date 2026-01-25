/**
 * API Key Management
 * 
 * Endpoint pre správu API kľúčov (Pro/Enterprise)
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

// Generuje bezpečný API kľúč
function generateApiKey(): { key: string; hash: string; prefix: string } {
  const rawKey = crypto.randomBytes(32).toString("hex");
  const prefix = `sria_${rawKey.substring(0, 8)}`;
  const fullKey = `${prefix}_${rawKey.substring(8)}`;
  const hash = crypto.createHash("sha256").update(fullKey).digest("hex");
  
  return { key: fullKey, hash, prefix };
}

/**
 * GET - Zoznam API kľúčov používateľa
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    
    // Skontroluj či má Pro/Enterprise
    const subscription = await prisma.subscription.findUnique({
      where: { userId: session.user.id },
    });
    
    if (!subscription || !["PREMIUM", "ENTERPRISE"].includes(subscription.plan)) {
      return NextResponse.json({
        success: false,
        error: "API access requires Premium or Enterprise subscription",
        upgradeUrl: "/dashboard/settings#upgrade",
      }, { status: 403 });
    }
    
    const apiKeys = await prisma.apiKey.findMany({
      where: { userId: session.user.id },
      select: {
        id: true,
        name: true,
        prefix: true,
        isActive: true,
        lastUsedAt: true,
        expiresAt: true,
        permissions: true,
        rateLimit: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
    
    return NextResponse.json({
      success: true,
      data: {
        keys: apiKeys,
        limits: {
          maxKeys: subscription.plan === "ENTERPRISE" ? 10 : 3,
          currentCount: apiKeys.length,
        },
      },
    });
    
  } catch (error) {
    console.error("API keys error:", error);
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}

/**
 * POST - Vytvoriť nový API kľúč
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    
    const subscription = await prisma.subscription.findUnique({
      where: { userId: session.user.id },
    });
    
    if (!subscription || !["PREMIUM", "ENTERPRISE"].includes(subscription.plan)) {
      return NextResponse.json({
        success: false,
        error: "API access requires Premium or Enterprise subscription",
      }, { status: 403 });
    }
    
    // Skontroluj limit kľúčov
    const existingCount = await prisma.apiKey.count({
      where: { userId: session.user.id },
    });
    
    const maxKeys = subscription.plan === "ENTERPRISE" ? 10 : 3;
    if (existingCount >= maxKeys) {
      return NextResponse.json({
        success: false,
        error: `Maximum ${maxKeys} API keys allowed for your plan`,
      }, { status: 400 });
    }
    
    const body = await request.json();
    const { name = "Default", expiresInDays } = body;
    
    const { key, hash, prefix } = generateApiKey();
    
    const expiresAt = expiresInDays 
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
      : null;
    
    await prisma.apiKey.create({
      data: {
        userId: session.user.id,
        name,
        key: hash, // Ukladáme hash, nie samotný kľúč
        prefix,
        expiresAt,
        rateLimit: subscription.plan === "ENTERPRISE" ? 1000 : 100,
      },
    });
    
    // Vrátime kľúč len pri vytvorení - potom sa už nedá získať
    return NextResponse.json({
      success: true,
      data: {
        key, // Zobrazí sa len teraz!
        prefix,
        name,
        expiresAt,
        message: "Save this key now! It won't be shown again.",
      },
    });
    
  } catch (error) {
    console.error("Create API key error:", error);
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}

/**
 * DELETE - Zmazať API kľúč
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const keyId = searchParams.get("id");
    
    if (!keyId) {
      return NextResponse.json({ success: false, error: "Key ID required" }, { status: 400 });
    }
    
    // Skontroluj či kľúč patrí používateľovi
    const apiKey = await prisma.apiKey.findFirst({
      where: { id: keyId, userId: session.user.id },
    });
    
    if (!apiKey) {
      return NextResponse.json({ success: false, error: "Key not found" }, { status: 404 });
    }
    
    await prisma.apiKey.delete({ where: { id: keyId } });
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error("Delete API key error:", error);
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}
