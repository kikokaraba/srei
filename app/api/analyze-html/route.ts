// Analyze HTML structure to find correct selectors
import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";

async function simpleFetch(url: string, timeoutMs: number = 10000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "sk-SK,sk;q=0.9",
      },
    });
    clearTimeout(timeout);
    if (!response.ok) return { success: false, error: `HTTP ${response.status}` };
    return { success: true, html: await response.text() };
  } catch (error) {
    clearTimeout(timeout);
    return { success: false, error: error instanceof Error ? error.message : "Failed" };
  }
}

export async function GET(request: NextRequest) {
  const source = request.nextUrl.searchParams.get("source") || "BAZOS";
  const urls: Record<string, string> = {
    BAZOS: "https://reality.bazos.sk/predam/byt/",
    REALITY: "https://www.reality.sk/byty/predaj/",
    TOPREALITY: "https://www.topreality.sk/vyhladavanie-nehnutelnosti.html?form%5Bcategory%5D%5B0%5D=1",
  };
  
  const url = urls[source];
  if (!url) {
    return NextResponse.json({ error: "Unknown source" }, { status: 400 });
  }
  
  const result = await simpleFetch(url);
  if (!result.success) {
    return NextResponse.json({ success: false, error: result.error });
  }
  
  const $ = cheerio.load(result.html!);
  
  // Find all unique class names
  const classCount: Record<string, number> = {};
  $("[class]").each((_, el) => {
    const classes = $(el).attr("class")?.split(/\s+/) || [];
    classes.forEach(cls => {
      if (cls && cls.length > 2) {
        classCount[cls] = (classCount[cls] || 0) + 1;
      }
    });
  });
  
  // Sort by frequency
  const topClasses = Object.entries(classCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 50)
    .map(([cls, count]) => ({ class: cls, count }));
  
  // Find elements that look like listings (repeated elements with links)
  const potentialListingSelectors: { selector: string; count: number; hasLinks: boolean; sample?: string }[] = [];
  
  // Common listing patterns
  const patterns = [
    "div[class*='card']", "div[class*='item']", "div[class*='listing']",
    "div[class*='property']", "div[class*='advert']", "div[class*='offer']",
    "div[class*='estate']", "div[class*='result']", "div[class*='inzer']",
    "article", "li[class]", "div[data-id]", "div[data-testid]",
    "a[class*='card']", "a[class*='item']", "a[class*='listing']",
  ];
  
  for (const pattern of patterns) {
    try {
      const elements = $(pattern);
      if (elements.length >= 5) {
        const hasLinks = elements.first().find("a").length > 0 || elements.first().is("a");
        const sample = elements.first().attr("class") || elements.first().prop("tagName");
        potentialListingSelectors.push({
          selector: pattern,
          count: elements.length,
          hasLinks,
          sample,
        });
      }
    } catch {}
  }
  
  // Find all links that look like property detail links
  const propertyLinkPatterns: { pattern: string; count: number; examples: string[] }[] = [];
  
  const linkPatterns = [
    { name: "detail", regex: /detail|inzerat|byt|dom|property/i },
    { name: "numeric-id", regex: /\/\d{5,}\// },
  ];
  
  for (const { name, regex } of linkPatterns) {
    const matchingLinks = $("a[href]").filter((_, el) => regex.test($(el).attr("href") || ""));
    if (matchingLinks.length > 0) {
      const examples = matchingLinks.slice(0, 3).map((_, el) => $(el).attr("href") || "").get();
      propertyLinkPatterns.push({ pattern: name, count: matchingLinks.length, examples });
    }
  }
  
  // Try to find the main container with listings
  const containerAnalysis: { selector: string; childCount: number; childClasses: string[] }[] = [];
  
  ["main", "section", "div[class*='list']", "div[class*='result']", "div[class*='content']", "ul[class]"].forEach(sel => {
    try {
      const container = $(sel).first();
      if (container.length) {
        const children = container.children();
        if (children.length >= 5) {
          const childClasses = children.slice(0, 3).map((_, el) => $(el).attr("class") || $(el).prop("tagName")).get();
          containerAnalysis.push({
            selector: sel,
            childCount: children.length,
            childClasses,
          });
        }
      }
    } catch {}
  });

  return NextResponse.json({
    success: true,
    source,
    url,
    htmlLength: result.html!.length,
    pageTitle: $("title").text().trim(),
    analysis: {
      topClasses: topClasses.slice(0, 30),
      potentialListingSelectors: potentialListingSelectors.sort((a, b) => b.count - a.count).slice(0, 15),
      propertyLinkPatterns,
      containerAnalysis,
    },
    recommendation: potentialListingSelectors.length > 0 
      ? `Skús selektor: ${potentialListingSelectors[0]?.selector}` 
      : "Potrebná manuálna analýza HTML",
  });
}

export const runtime = "nodejs";
export const maxDuration = 20;
