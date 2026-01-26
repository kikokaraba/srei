/**
 * Test - pozri skutočný HTML z Nehnutelnosti.sk
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
    
    // Find property items patterns
    const patterns = [
      { name: "article.advertisement", count: (html.match(/article[^>]*advertisement/gi) || []).length },
      { name: "div.advertisement", count: (html.match(/div[^>]*advertisement/gi) || []).length },
      { name: "class=inzerat", count: (html.match(/class="[^"]*inzerat/gi) || []).length },
      { name: "class=property", count: (html.match(/class="[^"]*property/gi) || []).length },
      { name: "data-testid", count: (html.match(/data-testid/gi) || []).length },
      { name: "class=offer", count: (html.match(/class="[^"]*offer/gi) || []).length },
      { name: "class=listing", count: (html.match(/class="[^"]*listing/gi) || []).length },
      { name: "class=card", count: (html.match(/class="[^"]*card/gi) || []).length },
      { name: "class=item", count: (html.match(/class="[^"]*item/gi) || []).length },
    ];

    // Extract a sample of class names
    const classMatches = html.match(/class="[^"]{5,100}"/g) || [];
    const uniqueClasses = [...new Set(classMatches)].slice(0, 50);

    // Find price patterns
    const pricePatterns = html.match(/\d{2,3}\s?\d{3}\s?€|\d{5,7}\s?€/g) || [];

    // Sample of HTML around prices
    const priceContext = html.match(/.{0,200}\d{2,3}\s?\d{3}\s?€.{0,200}/g)?.slice(0, 3) || [];

    return NextResponse.json({
      success: true,
      url,
      htmlLength: html.length,
      patterns,
      sampleClasses: uniqueClasses.slice(0, 30),
      pricesFound: pricePatterns.length,
      priceExamples: pricePatterns.slice(0, 10),
      priceContext: priceContext.map(c => c.substring(0, 300)),
      // First 5000 chars of body
      htmlSample: html.substring(html.indexOf('<body'), html.indexOf('<body') + 8000),
    });

  } catch (error) {
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }, { status: 500 });
  }
}
