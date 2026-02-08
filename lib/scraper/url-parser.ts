/**
 * URL Parser - Detekcia zdroja a extrakcia ID z linku inzerátu
 * Podporované portály: Bazoš, Reality.sk
 */

import type { PropertySource } from "@/generated/prisma/client";

export interface ParsedListingUrl {
  source: PropertySource;
  externalId: string;
  sourceUrl: string;
  isValid: boolean;
  error?: string;
}

// Podporované domény a patterny
const URL_PATTERNS: Array<{
  source: PropertySource;
  domains: string[];
  idRegex: RegExp;
  normalizer?: (url: string) => string;
}> = [
  {
    source: "BAZOS",
    domains: ["reality.bazos.sk", "www.reality.bazos.sk", "bazos.sk"],
    idRegex: /\/inzerat\/(\d+)(?:\/|\.|$)/i,
    normalizer: (url) => {
      // Bazoš môže mať rôzne formáty URL
      const u = new URL(url);
      if (!u.hostname.includes("bazos")) return url;
      if (!u.pathname.includes("/inzerat/")) return url;
      const idMatch = u.pathname.match(/\/inzerat\/(\d+)/);
      if (idMatch) {
        return `https://reality.bazos.sk/inzerat/${idMatch[1]}/`;
      }
      return url;
    },
  },
  {
    source: "REALITY",
    domains: ["reality.sk", "www.reality.sk"],
    idRegex: /\/inzerat\/(\d+)|id=(\d+)/i,
    normalizer: (url) => url,
  },
  {
    source: "TOPREALITY",
    domains: ["topreality.sk", "www.topreality.sk"],
    idRegex: /\/detail\/(\d+)|id=(\d+)/i,
    normalizer: (url) => url,
  },
];

/**
 * Parsuje URL inzerátu a vráti zdroj + external ID
 */
export function parseListingUrl(rawUrl: string): ParsedListingUrl {
  try {
    let urlStr = rawUrl.trim();
    
    // Pridaj https ak chýba
    if (!urlStr.startsWith("http")) {
      urlStr = `https://${urlStr}`;
    }
    
    const url = new URL(urlStr);
    const hostname = url.hostname.replace(/^www\./, "");
    
    for (const pattern of URL_PATTERNS) {
      const domainMatch = pattern.domains.some(
        (d) => d.replace(/^www\./, "") === hostname
      );
      
      if (!domainMatch) continue;
      
      // Extrahuj ID
      const fullPath = url.pathname + url.search;
      const idMatch = fullPath.match(pattern.idRegex);
      
      if (!idMatch) {
        return {
          source: pattern.source,
          externalId: "",
          sourceUrl: urlStr,
          isValid: false,
          error: "Nepodarilo sa extrahovať ID inzerátu z URL",
        };
      }
      
      const externalId = idMatch[1] || idMatch[2] || "";
      if (!externalId) {
        return {
          source: pattern.source,
          externalId: "",
          sourceUrl: urlStr,
          isValid: false,
          error: "Neplatné ID inzerátu",
        };
      }
      
      const normalizedUrl = pattern.normalizer
        ? pattern.normalizer(urlStr)
        : urlStr;
      
      // Prefix pre external_id ak potrebný (Bazoš má číselné ID)
      const prefixedId = pattern.source === "BAZOS" ? `bazos_${externalId}` : externalId;
      
      return {
        source: pattern.source,
        externalId: prefixedId,
        sourceUrl: normalizedUrl,
        isValid: true,
      };
    }
    
    return {
      source: "BAZOS", // fallback type
      externalId: "",
      sourceUrl: urlStr,
      isValid: false,
      error: "Nepodporovaný portál. Podporujeme: reality.bazos.sk, reality.sk",
    };
  } catch {
    return {
      source: "BAZOS",
      externalId: "",
      sourceUrl: rawUrl,
      isValid: false,
      error: "Neplatná URL",
    };
  }
}

/**
 * Zoznam podporovaných portálov pre UI
 */
export const SUPPORTED_PORTALS = [
  { name: "Bazoš Reality", domain: "reality.bazos.sk", example: "https://reality.bazos.sk/inzerat/123456/" },
  { name: "Reality.sk", domain: "reality.sk", example: "https://www.reality.sk/..." },
] as const;
