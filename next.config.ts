import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output pre Railway/Docker deployment
  output: 'standalone',
  // Note: PPR (Partial Prerendering) is available only in Next.js canary
  // Remove comment below when upgrading to canary if needed
  // experimental: {
  //   ppr: true,
  // },
  images: {
    // Property images from various real estate portals
    remotePatterns: [
      { protocol: "https", hostname: "**.bazos.sk" },
      { protocol: "https", hostname: "**.nehnutelnosti.sk" },
      { protocol: "https", hostname: "**.reality.sk" },
      { protocol: "https", hostname: "**.topreality.sk" },
      { protocol: "https", hostname: "img.nehnutelnosti.sk" },
      { protocol: "https", hostname: "d18-a.sdn.cz" }, // nehnutelnosti CDN
      { protocol: "https", hostname: "d18-b.sdn.cz" },
      { protocol: "https", hostname: "**.sdn.cz" },
      { protocol: "https", hostname: "mapbox.com" },
      { protocol: "https", hostname: "**.mapbox.com" },
      { protocol: "https", hostname: "api.mapbox.com" },
      { protocol: "https", hostname: "tile.openstreetmap.org" },
      { protocol: "https", hostname: "**.openstreetmap.org" },
      // Fallback for other real estate portals
      { protocol: "https", hostname: "**" },
    ],
  },
  // Security headers
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              // Script: unsafe-inline needed for Next.js, unsafe-eval for some maps
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              // Styles: unsafe-inline needed for styled-jsx and Tailwind
              "style-src 'self' 'unsafe-inline'",
              // Images: Real estate portals, maps, and data URIs
              "img-src 'self' data: blob: https://*.bazos.sk https://*.nehnutelnosti.sk https://*.reality.sk https://*.sdn.cz https://*.mapbox.com https://*.openstreetmap.org https://tile.openstreetmap.org https://api.mapbox.com https:",
              // Fonts: Self-hosted via next/font
              "font-src 'self' data:",
              // Connect: APIs and services
              "connect-src 'self' https://api.upstash.io https://raw.githubusercontent.com https://*.githubusercontent.com https://api.mapbox.com https://*.mapbox.com https://nominatim.openstreetmap.org https://api.telegram.org https://api.anthropic.com",
              // Workers: For map tiles
              "worker-src 'self' blob:",
              // Frame ancestors
              "frame-ancestors 'self'",
              // Base URI
              "base-uri 'self'",
              // Form action
              "form-action 'self'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
