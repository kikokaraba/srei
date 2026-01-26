/**
 * Test endpoint - skúsi nascrapovať a uložiť 1 nehnuteľnosť z Nehnutelnosti.sk
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { scrapeNehnutelnosti } from "@/lib/scraper/simple-scraper";

export async function GET() {
  const results: string[] = [];
  
  try {
    results.push("🚀 Starting test scrape...");
    
    // Scrape len 1 stránku
    const scrapeResult = await scrapeNehnutelnosti({ maxPages: 1 });
    
    results.push(`✅ Scraped ${scrapeResult.properties.length} properties`);
    
    if (scrapeResult.properties.length === 0) {
      return NextResponse.json({
        success: false,
        message: "No properties found during scrape",
        results,
        scrapeErrors: scrapeResult.errors,
      });
    }
    
    // Skús uložiť prvú nehnuteľnosť
    const prop = scrapeResult.properties[0];
    
    results.push(`📋 Trying to save: ${prop.title.substring(0, 50)}...`);
    results.push(`   external_id: ${prop.externalId}`);
    results.push(`   source: ${prop.source}`);
    results.push(`   city: ${prop.city}`);
    results.push(`   district: ${prop.district}`);
    results.push(`   price: ${prop.price}`);
    results.push(`   area_m2: ${prop.areaM2}`);
    results.push(`   sourceUrl: ${prop.sourceUrl?.substring(0, 80)}`);
    
    // Skontroluj či už existuje
    const existing = await prisma.property.findFirst({
      where: {
        OR: [
          { external_id: prop.externalId },
          { source_url: prop.sourceUrl },
        ],
      },
    });
    
    if (existing) {
      results.push(`⚠️ Property already exists with ID: ${existing.id}`);
      return NextResponse.json({
        success: true,
        message: "Property already exists",
        existingProperty: existing,
        results,
      });
    }
    
    results.push("💾 Creating new property...");
    
    // Skús vytvoriť
    const baseSlug = prop.title
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .substring(0, 80);
    
    const uniqueSlug = `${baseSlug}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    
    const propertyData = {
      external_id: prop.externalId,
      source: prop.source,
      title: prop.title,
      slug: uniqueSlug,
      description: prop.description || "",
      price: prop.price,
      price_per_m2: prop.pricePerM2,
      area_m2: prop.areaM2,
      city: prop.city,
      district: prop.district || prop.city || "Neznáme",
      address: `${prop.city}${prop.district ? `, ${prop.district}` : ""}`,
      rooms: prop.rooms,
      listing_type: prop.listingType,
      condition: "POVODNY" as const,
      energy_certificate: "NONE" as const,
      source_url: prop.sourceUrl,
      is_distressed: false,
    };
    
    results.push(`📝 Property data: ${JSON.stringify(propertyData, null, 2)}`);
    
    const created = await prisma.property.create({
      data: propertyData,
    });
    
    results.push(`✅ SUCCESS! Created property with ID: ${created.id}`);
    
    return NextResponse.json({
      success: true,
      message: "Property saved successfully!",
      property: created,
      results,
    });
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    results.push(`❌ ERROR: ${errorMessage}`);
    
    return NextResponse.json({
      success: false,
      error: errorMessage,
      stack: errorStack,
      results,
    }, { status: 500 });
  }
}

export const maxDuration = 60;
