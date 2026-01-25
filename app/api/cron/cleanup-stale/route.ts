/**
 * Cron Job - Cleanup neaktívnych inzerátov
 * 
 * Označí inzeráty ako EXPIRED ak neboli videné 7+ dní
 * Presunie do PropertyLifecycle pre historické dáta
 * 
 * Odporúčaný cron: denne o 4:00
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Koľko dní bez aktualizácie = neaktívny
const STALE_DAYS = 7;

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  console.log("\n" + "=".repeat(60));
  console.log("🧹 CLEANUP - Označenie neaktívnych inzerátov");
  console.log("=".repeat(60) + "\n");

  try {
    const staleDate = new Date();
    staleDate.setDate(staleDate.getDate() - STALE_DAYS);
    
    // Nájdi inzeráty ktoré neboli videné viac ako STALE_DAYS dní
    const staleProperties = await prisma.property.findMany({
      where: {
        status: "ACTIVE",
        last_seen_at: {
          lt: staleDate,
        },
      },
      select: {
        id: true,
        external_id: true,
        source: true,
        title: true,
        city: true,
        district: true,
        price: true,
        area_m2: true,
        rooms: true,
        condition: true,
        listing_type: true,
        createdAt: true,
        last_seen_at: true,
      },
    });
    
    console.log(`📋 Nájdených ${staleProperties.length} neaktívnych inzerátov`);
    
    let expiredCount = 0;
    let archivedCount = 0;
    
    for (const prop of staleProperties) {
      try {
        // Označ ako EXPIRED
        await prisma.property.update({
          where: { id: prop.id },
          data: { status: "EXPIRED" },
        });
        expiredCount++;
        
        // Vytvor záznam v PropertyLifecycle pre históriu
        if (prop.external_id) {
          const daysOnMarket = Math.floor(
            (prop.last_seen_at.getTime() - prop.createdAt.getTime()) / (1000 * 60 * 60 * 24)
          );
          
          // Skontroluj či už existuje
          const existingLifecycle = await prisma.propertyLifecycle.findFirst({
            where: {
              externalId: prop.external_id,
              source: prop.source,
            },
          });
          
          if (!existingLifecycle) {
            await prisma.propertyLifecycle.create({
              data: {
                externalId: prop.external_id,
                source: prop.source,
                city: prop.city,
                district: prop.district,
                title: prop.title,
                initialPrice: prop.price,
                finalPrice: prop.price,
                priceChange: 0,
                priceChangePercent: 0,
                area_m2: prop.area_m2,
                rooms: prop.rooms,
                condition: prop.condition,
                listingType: prop.listing_type,
                firstSeenAt: prop.createdAt,
                lastSeenAt: prop.last_seen_at,
                daysOnMarket,
                status: "EXPIRED",
                removalReason: "not_seen_" + STALE_DAYS + "_days",
              },
            });
            archivedCount++;
          }
        }
      } catch (error) {
        console.warn(`Failed to expire property ${prop.id}:`, error);
      }
    }
    
    const duration = Date.now() - startTime;
    
    console.log("\n" + "=".repeat(60));
    console.log("📊 CLEANUP COMPLETE");
    console.log("=".repeat(60));
    console.log(`  Expired: ${expiredCount}`);
    console.log(`  Archived: ${archivedCount}`);
    console.log(`  Duration: ${Math.round(duration / 1000)}s`);
    console.log("=".repeat(60) + "\n");
    
    // Log do databázy
    await prisma.dataFetchLog.create({
      data: {
        source: "CRON_CLEANUP",
        status: "success",
        recordsCount: expiredCount,
        duration_ms: duration,
      },
    });
    
    return NextResponse.json({
      success: true,
      summary: {
        staleFound: staleProperties.length,
        expired: expiredCount,
        archived: archivedCount,
        duration: `${Math.round(duration / 1000)}s`,
      },
    });
    
  } catch (error) {
    console.error("Cleanup error:", error);
    
    await prisma.dataFetchLog.create({
      data: {
        source: "CRON_CLEANUP",
        status: "error",
        recordsCount: 0,
        error: error instanceof Error ? error.message : "Unknown error",
      },
    });
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}

export const runtime = "nodejs";
export const maxDuration = 60;
