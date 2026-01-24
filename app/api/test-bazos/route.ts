/**
 * Test endpoint pre Bazoš scraping
 * Testuje novú štruktúru HTML a parsovanie
 */

import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";

// Timeout pre fetch
async function simpleFetch(url: string, timeout = 10000): Promise<{ html: string; status: number }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "sk,cs;q=0.9,en;q=0.8",
      },
    });
    clearTimeout(timeoutId);
    return { html: await response.text(), status: response.status };
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "predaj";
  const limit = parseInt(searchParams.get("limit") || "5");

  // URL podľa typu
  const url = type === "prenajom" 
    ? "https://reality.bazos.sk/prenajmu/byt/"
    : "https://reality.bazos.sk/predam/byt/";

  try {
    const start = Date.now();
    const { html, status } = await simpleFetch(url);
    const fetchTime = Date.now() - start;

    const $ = cheerio.load(html);

    // Extrahuj title stránky
    const pageTitle = $("title").text().trim();

    // Nájdi všetky h2 s linkami na inzeráty
    const h2Links = $("h2:has(a[href*='/inzerat/'])");
    
    // Parsuj inzeráty
    const listings: Array<{
      externalId: string;
      title: string;
      price: string | null;
      priceValue: number;
      location: string | null;
      area: number | null;
      type: string;
      url: string;
    }> = [];

    h2Links.slice(0, limit).each((_, el) => {
      const $h2 = $(el);
      const $link = $h2.find("a[href*='/inzerat/']").first();
      const href = $link.attr("href") || "";
      const title = $link.text().trim();
      
      // Extrahuj ID
      const idMatch = href.match(/inzerat\/(\d+)/);
      const externalId = idMatch?.[1] || "";

      // Hľadaj cenu a lokáciu v okolí
      let priceText: string | null = null;
      let locationText: string | null = null;
      let $current = $h2.next();
      let count = 0;

      while ($current.length && count < 10) {
        const text = $current.text().trim();
        
        // Cena
        if (!priceText && (text.includes("€") || /^\d{2,3}[\s\u00a0]?\d{3}/.test(text))) {
          if ($current.is("b, strong") || text.match(/\d+[\s\u00a0]?\d*\s*€/)) {
            priceText = text;
          }
        }
        
        // PSČ pattern
        if (!locationText && /\d{3}\s?\d{2}/.test(text)) {
          const match = text.match(/^([A-Za-záéíóúýčďľňřšťž\s-]+)/);
          if (match) {
            locationText = match[1].trim();
          }
        }

        $current = $current.next();
        count++;
      }

      // Extrahuj cenu ako číslo
      let priceValue = 0;
      if (priceText) {
        const priceMatch = priceText.match(/(\d{1,3}[\s\u00a0]?\d{3}(?:[\s\u00a0]?\d{3})?)/);
        if (priceMatch) {
          priceValue = parseInt(priceMatch[1].replace(/[\s\u00a0]/g, ""), 10);
        }
      }

      // Extrahuj plochu z title
      let area: number | null = null;
      const areaMatch = title.match(/(\d{2,4})\s*m[²2]/i);
      if (areaMatch) {
        area = parseInt(areaMatch[1], 10);
      }

      // Urč typ (predaj/prenájom) z ceny
      let listingType = type === "prenajom" ? "PRENÁJOM" : "PREDAJ";
      if (priceValue > 0 && priceValue < 3000) {
        listingType = "PRENÁJOM";
      }

      listings.push({
        externalId,
        title,
        price: priceText,
        priceValue,
        location: locationText,
        area,
        type: listingType,
        url: href.startsWith("http") ? href : `https://reality.bazos.sk${href}`,
      });
    });

    return NextResponse.json({
      success: true,
      url,
      fetchTimeMs: fetchTime,
      httpStatus: status,
      htmlLength: html.length,
      pageTitle,
      h2LinksFound: h2Links.length,
      parsedListings: listings.length,
      listings,
      analysis: {
        withPrice: listings.filter(l => l.priceValue > 0).length,
        withLocation: listings.filter(l => l.location).length,
        withArea: listings.filter(l => l.area).length,
        priceRange: listings.length > 0 ? {
          min: Math.min(...listings.filter(l => l.priceValue > 0).map(l => l.priceValue)),
          max: Math.max(...listings.filter(l => l.priceValue > 0).map(l => l.priceValue)),
        } : null,
      },
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      url,
    }, { status: 500 });
  }
}

export const runtime = "nodejs";
export const maxDuration = 15;
