// Debug endpoint pre testovanie scrapera - zjednodušená verzia
import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";

// Simple fetch with timeout
async function simpleFetch(url: string, timeoutMs: number = 8000): Promise<{ success: boolean; html?: string; error?: string; statusCode?: number }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "sk-SK,sk;q=0.9,en;q=0.8",
      },
    });
    
    clearTimeout(timeout);
    
    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}`, statusCode: response.status };
    }
    
    const html = await response.text();
    return { success: true, html, statusCode: response.status };
    
  } catch (error) {
    clearTimeout(timeout);
    if (error instanceof Error && error.name === "AbortError") {
      return { success: false, error: "Timeout after 8s" };
    }
    return { success: false, error: error instanceof Error ? error.message : "Fetch failed" };
  }
}

export async function GET(request: NextRequest) {
  const source = request.nextUrl.searchParams.get("source") || "BAZOS";
  const startTime = Date.now();
  
  try {
    // Define test URLs and selectors for each source
    const sources: Record<string, { url: string; selectors: string[] }> = {
      BAZOS: {
        url: "https://reality.bazos.sk/byty/",
        selectors: [".inzeraty .inzerat", ".inzeratynadpis", "[class*='inzerat']", ".nadpis"],
      },
      NEHNUTELNOSTI: {
        url: "https://www.nehnutelnosti.sk/byty/predaj/",
        selectors: [".advertisement-item", ".property-list__item", ".listing-item", "article"],
      },
      REALITY: {
        url: "https://www.reality.sk/byty/predaj/",
        selectors: [".estate-card", ".property-card", ".listing-item", "article"],
      },
    };
    
    const config = sources[source];
    if (!config) {
      return NextResponse.json({ success: false, error: `Unknown source: ${source}` }, { status: 400 });
    }
    
    // Fetch the page
    const result = await simpleFetch(config.url);
    const fetchTime = Date.now() - startTime;
    
    if (!result.success) {
      return NextResponse.json({
        success: false,
        source,
        url: config.url,
        error: result.error,
        statusCode: result.statusCode,
        fetchTimeMs: fetchTime,
      });
    }
    
    // Parse HTML
    const $ = cheerio.load(result.html!);
    
    // Test each selector
    const selectorResults: Record<string, number> = {};
    for (const selector of config.selectors) {
      try {
        selectorResults[selector] = $(selector).length;
      } catch {
        selectorResults[selector] = -1;
      }
    }
    
    // Additional checks
    const pageTitle = $("title").text().trim();
    const allLinks = $("a[href]").length;
    const propertyLinks = $("a[href*='/detail'], a[href*='/inzerat'], a[href*='/byt'], a[href*='/dom']").length;
    
    // Check if we're blocked
    const isBlocked = result.html!.includes("captcha") || 
                      result.html!.includes("blocked") || 
                      result.html!.includes("Prístup zamietnutý") ||
                      result.html!.length < 5000;
    
    return NextResponse.json({
      success: true,
      source,
      url: config.url,
      fetchTimeMs: fetchTime,
      htmlLength: result.html!.length,
      pageTitle,
      selectorResults,
      allLinks,
      propertyLinks,
      isBlocked,
      recommendation: Object.values(selectorResults).some(v => v > 0) 
        ? "✅ Selektory fungujú" 
        : "❌ Žiadne selektory nenašli elementy - treba aktualizovať",
    });
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      source,
      error: error instanceof Error ? error.message : "Unknown error",
      fetchTimeMs: Date.now() - startTime,
    }, { status: 500 });
  }
}

export const runtime = "nodejs";
export const maxDuration = 15; // Kratší timeout
