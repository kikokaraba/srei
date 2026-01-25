/**
 * Test Browserless API connection
 * Quick test to verify the API token and connection work
 */

import { NextResponse } from "next/server";

export async function GET() {
  const endpoint = process.env.BROWSER_WS_ENDPOINT || "";
  
  // Extract token from WebSocket endpoint
  const tokenMatch = endpoint.match(/token=([^&]+)/);
  const token = tokenMatch?.[1] || "";
  
  // Extract base URL
  const urlMatch = endpoint.match(/wss?:\/\/([^/?]+)/);
  const baseUrl = urlMatch ? `https://${urlMatch[1]}` : "";

  if (!token || !baseUrl) {
    return NextResponse.json({
      success: false,
      error: "BROWSER_WS_ENDPOINT not configured",
      hint: "Set BROWSER_WS_ENDPOINT=wss://production-sfo.browserless.io?token=YOUR_TOKEN",
      endpoint: endpoint ? "Set but invalid format" : "Not set",
    });
  }

  console.log("Testing Browserless connection...");
  console.log("Base URL:", baseUrl);
  console.log("Token:", token.substring(0, 8) + "...");

  try {
    // Quick test - scrape example.com
    const response = await fetch(`${baseUrl}/scrape?token=${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: "https://example.com",
        elements: [{ selector: "h1" }],
        gotoOptions: { timeout: 10000 },
      }),
    });

    const status = response.status;
    const responseText = await response.text();
    
    console.log("Response status:", status);
    console.log("Response:", responseText.substring(0, 500));

    if (response.ok) {
      const data = JSON.parse(responseText);
      return NextResponse.json({
        success: true,
        message: "Browserless API works!",
        baseUrl,
        tokenPrefix: token.substring(0, 8) + "...",
        testResult: data,
      });
    } else {
      return NextResponse.json({
        success: false,
        error: `API returned ${status}`,
        response: responseText.substring(0, 500),
        baseUrl,
        tokenPrefix: token.substring(0, 8) + "...",
      });
    }
  } catch (error) {
    console.error("Browserless test error:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      baseUrl,
      tokenPrefix: token.substring(0, 8) + "...",
    });
  }
}
