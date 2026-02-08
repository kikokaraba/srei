// Find correct selectors by analyzing parent elements of detail links
import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";

async function simpleFetch(url: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "text/html",
      },
    });
    clearTimeout(timeout);
    return { success: true, html: await response.text() };
  } catch (error) {
    clearTimeout(timeout);
    return { success: false, error: String(error) };
  }
}

export async function GET(request: NextRequest) {
  const source = request.nextUrl.searchParams.get("source") || "BAZOS";
  const urls: Record<string, { url: string; detailPattern: RegExp }> = {
    BAZOS: { url: "https://reality.bazos.sk/predam/byt/", detailPattern: /\/inzerat\// },
    REALITY: { url: "https://www.reality.sk/byty/predaj/", detailPattern: /\/detail\// },
    TOPREALITY: { url: "https://www.topreality.sk/vyhladavanie.html?form[category][0]=1", detailPattern: /\/detail\// },
  };
  
  const config = urls[source];
  if (!config) return NextResponse.json({ error: "Unknown source" }, { status: 400 });
  
  const result = await simpleFetch(config.url);
  if (!result.success) return NextResponse.json({ success: false, error: result.error });
  
  const $ = cheerio.load(result.html!);
  
  // Find all links matching detail pattern
  const detailLinks = $(`a[href]`).filter((_, el) => config.detailPattern.test($(el).attr("href") || ""));
  
  // Analyze parent structure of detail links
  const parentAnalysis: { level: number; tag: string; classes: string; count: number }[] = [];
  const parentClassCount: Record<string, number> = {};
  
  detailLinks.each((_, link) => {
    // Go up to 5 levels to find listing container
    let current = $(link);
    for (let level = 1; level <= 5; level++) {
      const parent = current.parent();
      if (parent.length === 0) break;
      
      const tag = parent.prop("tagName")?.toLowerCase() || "";
      const classes = parent.attr("class") || "";
      const key = `${level}:${tag}.${classes.split(" ")[0] || "no-class"}`;
      parentClassCount[key] = (parentClassCount[key] || 0) + 1;
      
      current = parent;
    }
  });
  
  // Find most common parent patterns
  const commonParents = Object.entries(parentClassCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([key, count]) => {
      const [level, selector] = key.split(":");
      return { level: parseInt(level), selector, count };
    });
  
  // Get first detail link and show its HTML structure
  const firstLink = detailLinks.first();
  const sampleStructure: string[] = [];
  
  if (firstLink.length) {
    let el = firstLink;
    for (let i = 0; i < 5; i++) {
      const parent = el.parent();
      if (parent.length === 0) break;
      const tag = parent.prop("tagName")?.toLowerCase();
      const cls = parent.attr("class")?.split(" ").slice(0, 3).join(" ") || "";
      const dataAttrs = Object.keys(parent.attr() || {}).filter(k => k.startsWith("data-")).slice(0, 2);
      sampleStructure.push(`${i+1}: <${tag} class="${cls}"${dataAttrs.map(d => ` ${d}`).join("")}>`);
      el = parent;
    }
  }
  
  // Extract sample listing data from first few links
  const sampleListings = detailLinks.slice(0, 5).map((_, link) => {
    const $link = $(link);
    const href = $link.attr("href") || "";
    const text = $link.text().trim().substring(0, 100);
    
    // Try to find price nearby
    let price = "";
    const parent = $link.parent().parent().parent();
    const priceMatch = parent.text().match(/(\d[\d\s]*)\s*€/);
    if (priceMatch) price = priceMatch[1].replace(/\s/g, "");
    
    return { href, text: text || "(no text)", price };
  }).get();
  
  // Suggest best selector
  const bestSelector = commonParents.find(p => p.count >= detailLinks.length * 0.8 && p.level <= 3);
  
  return NextResponse.json({
    success: true,
    source,
    detailLinksFound: detailLinks.length,
    commonParents,
    sampleStructure,
    sampleListings,
    suggestedSelector: bestSelector 
      ? `Použi parent level ${bestSelector.level}: ${bestSelector.selector}` 
      : "Potrebná manuálna analýza",
    tip: "Hľadaj element na level 2-3 ktorý má count blízko k počtu linkov",
  });
}

export const runtime = "nodejs";
export const maxDuration = 20;
