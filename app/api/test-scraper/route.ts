// Debug endpoint pre testovanie scrapera
import { NextRequest, NextResponse } from "next/server";
import { fetchWithRetry } from "@/lib/scraper/stealth-engine";
import * as cheerio from "cheerio";

export async function GET(request: NextRequest) {
  const source = request.nextUrl.searchParams.get("source") || "BAZOS";
  
  try {
    let testUrl = "";
    let selectors: string[] = [];
    
    if (source === "BAZOS") {
      testUrl = "https://reality.bazos.sk/byty/";
      selectors = [
        ".inzeraty .inzerat",
        ".vypis .inzerat", 
        ".inzeratynadpis",
        ".inzeratyflex",
        "[class*='inzerat']",
        ".nadpis",
        "table.inzeraty tr",
      ];
    } else if (source === "NEHNUTELNOSTI") {
      testUrl = "https://www.nehnutelnosti.sk/byty/predaj/";
      selectors = [
        ".advertisement-item",
        ".property-list__item",
        "[data-testid='property-card']",
        ".listing-item",
        ".inzerat",
        "article.property",
      ];
    } else if (source === "REALITY") {
      testUrl = "https://www.reality.sk/byty/predaj/";
      selectors = [
        ".estate-card",
        ".property-card",
        ".listing-item",
        ".inzerat",
        "article.estate",
        "[data-id]",
      ];
    }
    
    console.log(`🔍 Testing ${source}: ${testUrl}`);
    
    // Fetch the page
    const result = await fetchWithRetry(testUrl, {
      config: { maxRetries: 2, minDelay: 500, maxDelay: 1000 }
    });
    
    if (!result.success) {
      return NextResponse.json({
        success: false,
        source,
        url: testUrl,
        error: result.error,
        statusCode: result.statusCode,
      });
    }
    
    // Parse HTML
    const $ = cheerio.load(result.html!);
    const htmlLength = result.html?.length || 0;
    
    // Test each selector
    const selectorResults: Record<string, number> = {};
    for (const selector of selectors) {
      selectorResults[selector] = $(selector).length;
    }
    
    // Get page title
    const pageTitle = $("title").text();
    
    // Get first 500 chars of body for debug
    const bodyPreview = $("body").text().substring(0, 500).replace(/\s+/g, " ");
    
    // Try to find any links with "inzerat" or "detail"
    const detailLinks = $("a[href*='inzerat'], a[href*='detail']").length;
    
    return NextResponse.json({
      success: true,
      source,
      url: testUrl,
      htmlLength,
      pageTitle,
      selectorResults,
      detailLinksFound: detailLinks,
      bodyPreview,
      fetchRetries: result.retryCount,
    });
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}

export const runtime = "nodejs";
export const maxDuration = 30;
