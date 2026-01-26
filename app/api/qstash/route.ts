/**
 * QStash Webhook Receiver
 * 
 * Receives scheduled jobs from Upstash QStash and executes them.
 * This allows Railway-hosted API to receive cron triggers.
 * 
 * Setup:
 * 1. Go to https://console.upstash.com/qstash
 * 2. Create schedules pointing to YOUR_RAILWAY_URL/api/qstash?job=scrape-paginated
 * 3. Add QSTASH_CURRENT_SIGNING_KEY and QSTASH_NEXT_SIGNING_KEY to Railway env
 */

import { NextRequest, NextResponse } from "next/server";

// Simple signature verification (production should use @upstash/qstash)
function verifySignature(request: NextRequest): boolean {
  const signature = request.headers.get("upstash-signature");
  const qstashKey = process.env.QSTASH_CURRENT_SIGNING_KEY;
  
  // If no key configured, allow requests (for testing)
  if (!qstashKey) {
    console.warn("⚠️ QSTASH_CURRENT_SIGNING_KEY not set - accepting all requests");
    return true;
  }
  
  // In production, verify signature properly
  // For now, just check if signature exists
  return !!signature;
}

export async function POST(request: NextRequest) {
  const job = request.nextUrl.searchParams.get("job");
  
  console.log(`📬 QStash received job: ${job}`);
  
  // Verify request is from QStash
  if (!verifySignature(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  const baseUrl = process.env.RAILWAY_URL || process.env.NEXTAUTH_URL || "";
  
  try {
    let result;
    
    switch (job) {
      case "scrape-paginated":
        // Call the paginated scraper
        const scrapeRes = await fetch(`${baseUrl}/api/cron/scrape-paginated`, {
          method: "POST",
        });
        result = await scrapeRes.json();
        break;
        
      case "batch-refresh":
        // Call the batch refresh
        const refreshRes = await fetch(`${baseUrl}/api/cron/batch-refresh`, {
          method: "POST",
        });
        result = await refreshRes.json();
        break;
        
      case "deduplicate":
        // Call deduplication
        const dedupeRes = await fetch(`${baseUrl}/api/cron/deduplicate`, {
          method: "POST",
        });
        result = await dedupeRes.json();
        break;
        
      case "daily-stats":
        const statsRes = await fetch(`${baseUrl}/api/cron/daily-stats`, {
          method: "POST",
        });
        result = await statsRes.json();
        break;
        
      default:
        return NextResponse.json(
          { error: `Unknown job: ${job}` },
          { status: 400 }
        );
    }
    
    console.log(`✅ Job ${job} completed:`, result);
    
    return NextResponse.json({
      success: true,
      job,
      result,
    });
    
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`❌ Job ${job} failed:`, message);
    
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

// Also support GET for simple testing
export async function GET(request: NextRequest) {
  return POST(request);
}
