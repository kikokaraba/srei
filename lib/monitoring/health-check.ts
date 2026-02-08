/**
 * Property Health Check System
 * 
 * Verifies if property listings are still active on source portals.
 * Detects sold, removed, or expired listings.
 */

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15",
];

interface HealthCheckResult {
  isActive: boolean;
  currentPrice: number | null;
  priceChanged: boolean;
  newPrice: number | null;
  error: string | null;
  responseCode: number | null;
  removalReason: "sold" | "withdrawn" | "expired" | "unknown" | null;
}

/**
 * Check if a property listing is still active
 */
export async function checkPropertyHealth(
  sourceUrl: string,
  source: string,
  expectedPrice: number
): Promise<HealthCheckResult> {
  const userAgent = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];

  try {
    const response = await fetch(sourceUrl, {
      method: "GET",
      headers: {
        "User-Agent": userAgent,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "sk,cs;q=0.9,en;q=0.8",
      },
      redirect: "follow",
    });

    // 404 = listing removed
    if (response.status === 404) {
      return {
        isActive: false,
        currentPrice: null,
        priceChanged: false,
        newPrice: null,
        error: null,
        responseCode: 404,
        removalReason: "unknown", // Could be sold or withdrawn
      };
    }

    // Other error codes
    if (!response.ok) {
      return {
        isActive: true, // Assume still active, might be temporary error
        currentPrice: expectedPrice,
        priceChanged: false,
        newPrice: null,
        error: `HTTP ${response.status}`,
        responseCode: response.status,
        removalReason: null,
      };
    }

    const html = await response.text();
    
    // Check for "sold" or "removed" indicators
    const lowerHtml = html.toLowerCase();
    
    // Common patterns for sold/removed listings
    const soldPatterns = [
      "predané", "predany", "sold", "uzavreté", "uzavrete",
      "nehnuteľnosť bola predaná", "inzerát bol vymazaný",
      "inzerát neexistuje", "inzerát už nie je aktívny"
    ];
    
    const isSold = soldPatterns.some(pattern => lowerHtml.includes(pattern));
    
    if (isSold) {
      return {
        isActive: false,
        currentPrice: null,
        priceChanged: false,
        newPrice: null,
        error: null,
        responseCode: 200,
        removalReason: "sold",
      };
    }

    // Try to extract current price
    const currentPrice = extractPriceFromHtml(html, source);
    const priceChanged = currentPrice !== null && currentPrice !== expectedPrice;

    return {
      isActive: true,
      currentPrice: currentPrice || expectedPrice,
      priceChanged,
      newPrice: priceChanged ? currentPrice : null,
      error: null,
      responseCode: 200,
      removalReason: null,
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    // Network errors might be temporary
    return {
      isActive: true, // Don't mark as inactive on network errors
      currentPrice: expectedPrice,
      priceChanged: false,
      newPrice: null,
      error: errorMessage,
      responseCode: null,
      removalReason: null,
    };
  }
}

/**
 * Extract price from HTML based on source
 */
function extractPriceFromHtml(html: string, source: string): number | null {
  try {
    let priceMatch: RegExpMatchArray | null = null;
    
    switch (source) {
      case "BAZOS":
        // bazos.sk price patterns
        priceMatch = html.match(/class="inzeratycena"[^>]*>[\s\S]*?([\d\s]+)[\s€]/i);
        if (!priceMatch) {
          priceMatch = html.match(/Cena:[\s\S]*?([\d\s]+)[\s]?€/i);
        }
        break;
        
      default:
        // Generic price extraction
        priceMatch = html.match(/([\d\s]{4,})[\s]?€/);
    }
    
    if (priceMatch && priceMatch[1]) {
      const priceStr = priceMatch[1].replace(/\s/g, "");
      const price = parseInt(priceStr, 10);
      
      // Sanity check - price should be reasonable
      if (price >= 1000 && price <= 50000000) {
        return price;
      }
    }
    
    return null;
  } catch {
    return null;
  }
}

/**
 * Batch check multiple properties
 */
export async function batchHealthCheck(
  properties: Array<{
    id: string;
    source_url: string | null;
    source: string;
    price: number;
  }>,
  delayMs: number = 1500
): Promise<Map<string, HealthCheckResult>> {
  const results = new Map<string, HealthCheckResult>();
  
  for (const property of properties) {
    if (!property.source_url) {
      results.set(property.id, {
        isActive: true,
        currentPrice: property.price,
        priceChanged: false,
        newPrice: null,
        error: "No source URL",
        responseCode: null,
        removalReason: null,
      });
      continue;
    }
    
    const result = await checkPropertyHealth(
      property.source_url,
      property.source,
      property.price
    );
    
    results.set(property.id, result);
    
    // Rate limiting delay
    if (delayMs > 0) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  
  return results;
}
