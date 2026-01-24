/**
 * Browserless Scraper API
 * 
 * Test connection and trigger scraping via Browserless.io
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { 
  testBrowserlessConnection, 
  scrapePortal,
  type ScrapedProperty 
} from "@/lib/scraper/browserless-scraper";
import type { SlovakCity, ListingType } from "@/generated/prisma/client";

/**
 * GET - Test Browserless connection
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (user?.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Admin access required" }, { status: 403 });
    }

    // Check if BROWSER_WS_ENDPOINT is configured
    const hasEndpoint = !!process.env.BROWSER_WS_ENDPOINT;
    
    if (!hasEndpoint) {
      return NextResponse.json({
        success: false,
        configured: false,
        message: "BROWSER_WS_ENDPOINT not configured. Add your Browserless token to environment variables.",
        instructions: [
          "1. Go to browserless.io and get your API token",
          "2. Add to Vercel: BROWSER_WS_ENDPOINT=wss://production-sfo.browserless.io?token=YOUR_TOKEN",
          "3. Redeploy the application",
        ],
      });
    }

    // Test connection
    const result = await testBrowserlessConnection();
    
    return NextResponse.json({
      success: result.success,
      configured: true,
      message: result.message,
      browserVersion: result.browserVersion,
    });

  } catch (error) {
    console.error("Browserless test error:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}

/**
 * POST - Run Browserless scraping
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (user?.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Admin access required" }, { status: 403 });
    }

    const body = await request.json();
    const { 
      portal = "NEHNUTELNOSTI",
      city,
      listingType,
      maxPages = 2,
      saveToDb = true,
    } = body as {
      portal?: "NEHNUTELNOSTI" | "REALITY";
      city?: SlovakCity;
      listingType?: ListingType;
      maxPages?: number;
      saveToDb?: boolean;
    };

    console.log(`\n🚀 Starting Browserless scrape: ${portal}`);
    console.log(`   City: ${city || "all"}, Type: ${listingType || "all"}, Pages: ${maxPages}`);

    // Run scraping
    const result = await scrapePortal(portal, {
      city,
      listingType,
      maxPages,
    });

    // Save to database if requested
    let savedCount = 0;
    let updatedCount = 0;

    if (saveToDb && result.properties.length > 0) {
      console.log(`\n💾 Saving ${result.properties.length} properties to database...`);
      
      for (const prop of result.properties) {
        try {
          const existingProperty = await prisma.property.findFirst({
            where: {
              source: prop.source,
              external_id: prop.externalId,
            },
          });

          if (existingProperty) {
            // Update if price changed
            if (existingProperty.price !== prop.price) {
              await prisma.property.update({
                where: { id: existingProperty.id },
                data: {
                  price: prop.price,
                  price_per_m2: prop.pricePerM2,
                  updatedAt: new Date(),
                },
              });
              
              // Log price history
              await prisma.priceHistory.create({
                data: {
                  propertyId: existingProperty.id,
                  price: prop.price,
                  price_per_m2: prop.pricePerM2,
                },
              });
              
              updatedCount++;
            }
          } else {
            // Create new property - generate slug from title
            const slug = prop.title
              .toLowerCase()
              .normalize("NFD")
              .replace(/[\u0300-\u036f]/g, "")
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/^-|-$/g, "")
              .substring(0, 100) + "-" + prop.externalId.slice(-8);
            
            await prisma.property.create({
              data: {
                external_id: prop.externalId,
                source: prop.source,
                title: prop.title,
                slug: slug,
                description: prop.description,
                price: prop.price,
                price_per_m2: prop.pricePerM2,
                area_m2: prop.areaM2,
                city: prop.city,
                district: prop.district,
                address: `${prop.city}${prop.district ? `, ${prop.district}` : ""}`,
                rooms: prop.rooms,
                listing_type: prop.listingType,
                condition: "POVODNY",
                energy_certificate: "NONE",
                source_url: prop.sourceUrl,
              },
            });
            savedCount++;
          }
        } catch (error) {
          console.warn(`Failed to save property ${prop.externalId}:`, error);
        }
      }
      
      console.log(`✅ Saved: ${savedCount} new, ${updatedCount} updated`);
    }

    // Log the scrape
    await prisma.dataFetchLog.create({
      data: {
        source: `${portal}_BROWSERLESS`,
        status: result.errors.length === 0 ? "success" : "partial",
        recordsCount: result.properties.length,
        duration_ms: result.duration,
        error: result.errors.length > 0 
          ? JSON.stringify({
              pagesScraped: result.pagesScraped,
              savedCount,
              updatedCount,
              errors: result.errors.slice(0, 5),
            })
          : null,
      },
    });

    return NextResponse.json({
      success: true,
      portal,
      properties: result.properties.length,
      pagesScraped: result.pagesScraped,
      savedToDb: savedCount,
      updatedInDb: updatedCount,
      duration: result.duration,
      errors: result.errors,
    });

  } catch (error) {
    console.error("Browserless scrape error:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}
