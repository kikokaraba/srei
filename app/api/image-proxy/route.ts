/**
 * Image proxy – obchádza blokovanie hotlinkov (nehnutelnosti, bazos, reality…).
 * Povolené hostname: slovenské reality portály.
 */

import { NextRequest, NextResponse } from "next/server";

const ALLOWED_HOSTNAMES = [
  "nehnutelnosti.sk",
  "www.nehnutelnosti.sk",
  "img.nehnutelnosti.sk",
  "cdn.nehnutelnosti.sk",
  "bazos.sk",
  "www.bazos.sk",
  "reality.bazos.sk",
  "img.bazos.sk",
  "reality.sk",
  "www.reality.sk",
  "topreality.sk",
  "www.topreality.sk",
  "ireality.sk",
  "www.ireality.sk",
  "realityref.sk",
  "images.unsplash.com",
];

function isAllowedUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    if (u.protocol !== "http:" && u.protocol !== "https:") return false;
    const host = u.hostname.toLowerCase();
    return ALLOWED_HOSTNAMES.some((h) => host === h || host.endsWith("." + h));
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "Missing url" }, { status: 400 });
  }

  const decoded = decodeURIComponent(url);
  if (!isAllowedUrl(decoded)) {
    return NextResponse.json({ error: "URL not allowed" }, { status: 403 });
  }

  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 10_000);
    const res = await fetch(decoded, {
      headers: {
        Accept: "image/*",
        "User-Agent": "Mozilla/5.0 (compatible; SreiImageProxy/1.0)",
      },
      referrerPolicy: "no-referrer",
      signal: controller.signal,
      next: { revalidate: 86400 },
    });
    clearTimeout(t);

    if (!res.ok) {
      return new NextResponse(null, { status: res.status });
    }

    const contentType = res.headers.get("Content-Type") || "image/jpeg";
    if (!contentType.startsWith("image/")) {
      return NextResponse.json({ error: "Not an image" }, { status: 400 });
    }

    const body = await res.arrayBuffer();
    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800",
      },
    });
  } catch (e) {
    console.warn("[image-proxy] fetch failed:", decoded, e);
    return new NextResponse(null, { status: 502 });
  }
}
