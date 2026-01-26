/**
 * Test - pozri skutočný HTML z Nehnutelnosti.sk a testuj regex
 */

import { NextResponse } from "next/server";

export async function GET() {
  try {
    const url = "https://www.nehnutelnosti.sk/byty/predaj/";
    
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "sk,cs;q=0.9,en;q=0.8",
      },
    });

    if (!response.ok) {
      return NextResponse.json({ error: `HTTP ${response.status}` }, { status: 500 });
    }

    const html = await response.text();
    
    // Test the exact regex patterns from paginated scraper
    const detailLinkPattern = /href="(\/detail\/([^\/]+)\/([^"]+))"/g;
    const pricePattern = /MuiTypography-h5[^>]*>([^<]*\d[\d\s]*€)/g;
    const areaPattern = /(\d+)\s*m²/g;

    // Extract detail links
    const detailLinks: string[] = [];
    let linkMatch;
    while ((linkMatch = detailLinkPattern.exec(html)) !== null) {
      detailLinks.push(linkMatch[1]);
    }

    // Extract prices
    const prices: string[] = [];
    let priceMatch;
    while ((priceMatch = pricePattern.exec(html)) !== null) {
      prices.push(priceMatch[1]);
    }

    // Extract areas
    const areas: string[] = [];
    let areaMatch;
    while ((areaMatch = areaPattern.exec(html)) !== null) {
      areas.push(areaMatch[1] + " m²");
    }

    // Alternative price patterns to test
    const altPricePattern1 = html.match(/>\s*(\d[\d\s]*)\s*€\s*</g) || [];
    const altPricePattern2 = html.match(/data-test-id="text">([^<]*€)/g) || [];

    return NextResponse.json({
      success: true,
      url,
      htmlLength: html.length,
      extraction: {
        detailLinksFound: detailLinks.length,
        detailLinksExamples: detailLinks.slice(0, 5),
        pricesFound: prices.length,
        pricesExamples: prices.slice(0, 10),
        areasFound: areas.length,
        areasExamples: areas.slice(0, 10),
      },
      alternativePatterns: {
        altPrice1Count: altPricePattern1.length,
        altPrice1Examples: altPricePattern1.slice(0, 5),
        altPrice2Count: altPricePattern2.length,
        altPrice2Examples: altPricePattern2.slice(0, 5),
      },
    });

  } catch (error) {
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }, { status: 500 });
  }
}
