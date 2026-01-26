/**
 * Public API - Properties
 * 
 * Verejné API pre Pro/Enterprise zákazníkov
 * Autentifikácia cez API kľúč v headeri: X-API-Key
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { ListingType, PropertySource } from "@/generated/prisma";

// Rate limiting - jednoduchá implementácia
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(apiKey: string, limit: number = 100): boolean {
  const now = Date.now();
  const windowMs = 60 * 60 * 1000; // 1 hodina
  
  const current = rateLimitMap.get(apiKey);
  
  if (!current || now > current.resetTime) {
    rateLimitMap.set(apiKey, { count: 1, resetTime: now + windowMs });
    return true;
  }
  
  if (current.count >= limit) {
    return false;
  }
  
  current.count++;
  return true;
}

async function validateApiKey(apiKey: string): Promise<{ valid: boolean; userId?: string; tier?: string }> {
  if (!apiKey) {
    return { valid: false };
  }
  
  // Hash the provided key for comparison
  const crypto = await import("crypto");
  const keyHash = crypto.createHash("sha256").update(apiKey).digest("hex");
  
  // Nájdi API kľúč v databáze
  const keyRecord = await prisma.apiKey.findUnique({
    where: { key: keyHash },
    include: { user: true },
  });
  
  if (!keyRecord || !keyRecord.isActive) {
    return { valid: false };
  }
  
  // Skontroluj expiráciu
  if (keyRecord.expiresAt && new Date() > keyRecord.expiresAt) {
    return { valid: false };
  }
  
  // Skontroluj či používateľ má Pro/Enterprise
  const subscription = await prisma.subscription.findFirst({
    where: { 
      userId: keyRecord.userId,
      status: "ACTIVE",
      plan: { in: ["PREMIUM", "ENTERPRISE"] },
    },
  });
  
  if (!subscription) {
    return { valid: false };
  }
  
  // Aktualizuj lastUsed
  await prisma.apiKey.update({
    where: { id: keyRecord.id },
    data: { lastUsedAt: new Date() },
  });
  
  return { 
    valid: true, 
    userId: keyRecord.userId,
    tier: subscription.plan,
  };
}

/**
 * GET /api/v1/public/properties
 * 
 * Query parametre:
 * - city: string (BRATISLAVA, KOSICE, ...)
 * - listingType: PREDAJ | PRENAJOM
 * - source: NEHNUTELNOSTI | REALITY | BAZOS
 * - minPrice: number
 * - maxPrice: number
 * - minArea: number
 * - maxArea: number
 * - rooms: number
 * - limit: number (max 100)
 * - offset: number
 * - updatedSince: ISO date string
 */
export async function GET(request: NextRequest) {
  try {
    // Získaj API kľúč
    const apiKey = request.headers.get("X-API-Key") || request.headers.get("x-api-key");
    
    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: "Missing API key",
        message: "Provide your API key in the X-API-Key header",
        docs: "https://sria.sk/docs/api",
      }, { status: 401 });
    }
    
    // Validuj API kľúč
    const validation = await validateApiKey(apiKey);
    
    if (!validation.valid) {
      return NextResponse.json({
        success: false,
        error: "Invalid or expired API key",
        message: "Your API key is invalid or your subscription has expired",
      }, { status: 401 });
    }
    
    // Rate limiting
    const rateLimit = validation.tier === "ENTERPRISE" ? 1000 : 100;
    if (!checkRateLimit(apiKey, rateLimit)) {
      return NextResponse.json({
        success: false,
        error: "Rate limit exceeded",
        message: `You have exceeded ${rateLimit} requests per hour`,
        retryAfter: 3600,
      }, { status: 429 });
    }
    
    // Parse query parametre
    const { searchParams } = new URL(request.url);
    
    const city = searchParams.get("city") as string | null;
    const listingType = searchParams.get("listingType") as ListingType | null;
    const source = searchParams.get("source") as PropertySource | null;
    const minPrice = searchParams.get("minPrice") ? parseFloat(searchParams.get("minPrice")!) : undefined;
    const maxPrice = searchParams.get("maxPrice") ? parseFloat(searchParams.get("maxPrice")!) : undefined;
    const minArea = searchParams.get("minArea") ? parseFloat(searchParams.get("minArea")!) : undefined;
    const maxArea = searchParams.get("maxArea") ? parseFloat(searchParams.get("maxArea")!) : undefined;
    const rooms = searchParams.get("rooms") ? parseInt(searchParams.get("rooms")!) : undefined;
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);
    const offset = parseInt(searchParams.get("offset") || "0");
    const updatedSince = searchParams.get("updatedSince");
    
    // Build query
    const where: Record<string, unknown> = {};
    
    if (city) where.city = city;
    if (listingType) where.listing_type = listingType;
    if (source) where.source = source;
    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) (where.price as Record<string, number>).gte = minPrice;
      if (maxPrice) (where.price as Record<string, number>).lte = maxPrice;
    }
    if (minArea || maxArea) {
      where.area_m2 = {};
      if (minArea) (where.area_m2 as Record<string, number>).gte = minArea;
      if (maxArea) (where.area_m2 as Record<string, number>).lte = maxArea;
    }
    if (rooms) where.rooms = rooms;
    if (updatedSince) {
      where.updatedAt = { gte: new Date(updatedSince) };
    }
    
    // Fetch properties
    const [properties, total] = await Promise.all([
      prisma.property.findMany({
        where,
        select: {
          id: true,
          external_id: true,
          source: true,
          title: true,
          price: true,
          price_per_m2: true,
          area_m2: true,
          city: true,
          district: true,
          address: true,
          rooms: true,
          floor: true,
          condition: true,
          energy_certificate: true,
          listing_type: true,
          source_url: true,
          is_distressed: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { updatedAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.property.count({ where }),
    ]);
    
    return NextResponse.json({
      success: true,
      data: {
        properties,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + properties.length < total,
        },
      },
      meta: {
        requestId: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
      },
    });
    
  } catch (error) {
    console.error("Public API error:", error);
    return NextResponse.json({
      success: false,
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}
