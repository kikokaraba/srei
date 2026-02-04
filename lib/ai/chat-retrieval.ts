/**
 * Chat RAG - Retrieval Augmented Generation
 * Extracts keywords from user message and fetches relevant properties
 */

import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";

const DISTRICTS = [
  "Petržalka", "Petrzalka",
  "Ružinov", "Ruzinov",
  "Staré Mesto", "Stare Mesto",
  "Nové Mesto", "Nove Mesto",
  "Karlova Ves", "Dúbravka", "Dubravka",
  "Vrakuňa", "Vrakuna",
  "Podunajské Biskupice", "Rača", "Raca",
  "Košice-mesto", "Košice I", "Košice II", "Košice III", "Košice IV",
];

export interface RetrievedProperty {
  id: string;
  title: string;
  city: string;
  district: string;
  price: number;
  price_per_m2: number;
  area_m2: number;
  rooms: number | null;
  condition: string;
}

export interface RetrievalParams {
  maxPrice?: number;
  minPrice?: number;
  city?: string;
  district?: string;
  rooms?: number;
}

/**
 * Extract retrieval params from natural language message
 */
export function extractRetrievalParams(message: string): RetrievalParams | null {
  const lower = message.toLowerCase();
  const params: RetrievalParams = {};

  // Price: "pod 150k", "do 200 000", "150k-200k", "nad 100k"
  const pricePatterns = [
    /(?:pod|do|max|maximálne)\s*(\d+)\s*k/gi,
    /(?:pod|do|max)\s*(\d[\d\s]*)\s*(?:eur|€)/gi,
    /(?:nad|od|min|minimálne)\s*(\d+)\s*k/gi,
    /(?:nad|od|min)\s*(\d[\d\s]*)\s*(?:eur|€)/gi,
    /(\d+)\s*k\s*(?:až|-|–)\s*(\d+)\s*k/gi,
    /(\d+)\s*000\s*(?:eur|€)/gi,
  ];

  for (const p of pricePatterns) {
    const m = message.match(p);
    if (m) {
      for (const match of m) {
        const num = parseInt(match.replace(/\D/g, ""), 10);
        if (match.toLowerCase().includes("k") && num < 10000) {
          const val = num * 1000;
          if (match.toLowerCase().includes("pod") || match.toLowerCase().includes("do") || match.toLowerCase().includes("max")) {
            params.maxPrice = Math.min(params.maxPrice ?? Infinity, val);
          } else if (match.toLowerCase().includes("nad") || match.toLowerCase().includes("od") || match.toLowerCase().includes("min")) {
            params.minPrice = Math.max(params.minPrice ?? 0, val);
          } else if (!params.maxPrice) {
            params.maxPrice = val;
          }
        } else if (num >= 10000) {
          if (match.toLowerCase().includes("pod") || match.toLowerCase().includes("do")) {
            params.maxPrice = Math.min(params.maxPrice ?? Infinity, num);
          } else if (match.toLowerCase().includes("nad") || match.toLowerCase().includes("od")) {
            params.minPrice = Math.max(params.minPrice ?? 0, num);
          }
        }
      }
    }
  }

  // Simple price match: "150k", "200 000"
  const simplePrice = message.match(/(\d+)\s*k(?!\w)/i);
  if (simplePrice && !params.maxPrice) {
    params.maxPrice = parseInt(simplePrice[1], 10) * 1000;
  }

  // City - map display names to DB format
  const cityMap: Record<string, string> = {
    bratislava: "BRATISLAVA", ba: "BRATISLAVA",
    kosice: "KOSICE", košice: "KOSICE", ke: "KOSICE",
    presov: "PRESOV", prešov: "PRESOV", po: "PRESOV",
    zilina: "ZILINA", žilina: "ZILINA", za: "ZILINA",
    banska_bystrica: "BANSKA_BYSTRICA", bb: "BANSKA_BYSTRICA",
    trnava: "TRNAVA", tt: "TRNAVA",
    trencin: "TRENCIN", trenčín: "TRENCIN", tn: "TRENCIN",
    nitra: "NITRA", nr: "NITRA",
  };
  for (const [key, dbCity] of Object.entries(cityMap)) {
    if (lower.includes(key)) {
      params.city = dbCity;
      break;
    }
  }

  // District (e.g. Petržalka, Ružinov)
  for (const d of DISTRICTS) {
    if (lower.includes(d.toLowerCase())) {
      params.district = d;
      break;
    }
  }

  // Rooms: "2+1", "3 izby", "4 izby"
  const roomsMatch = message.match(/(\d+)\s*[\+\-]?\s*1(?!\d)/i) || message.match(/(\d+)\s*izieb?/i);
  if (roomsMatch) {
    params.rooms = parseInt(roomsMatch[1], 10);
  }

  if (Object.keys(params).length === 0) return null;
  return params;
}

/**
 * Fetch relevant properties based on extracted params
 */
export async function getRelevantProperties(message: string, limit = 8): Promise<RetrievedProperty[]> {
  const params = extractRetrievalParams(message);
  if (!params) return [];

  const where: Prisma.PropertyWhereInput = {
    status: "ACTIVE",
    listing_type: "PREDAJ",
    property_type: "BYT",
  };

  if (params.maxPrice != null || params.minPrice != null) {
    where.price = {};
    if (params.maxPrice != null) (where.price as { lte?: number }).lte = params.maxPrice;
    if (params.minPrice != null) (where.price as { gte?: number }).gte = params.minPrice;
  }
  if (params.city) {
    where.city = { contains: params.city, mode: "insensitive" };
  }
  if (params.district) {
    where.district = { contains: params.district, mode: "insensitive" };
  }
  if (params.rooms != null) {
    where.rooms = { gte: params.rooms - 1, lte: params.rooms + 1 };
  }

  const properties = await prisma.property.findMany({
    where,
    select: {
      id: true,
      title: true,
      city: true,
      district: true,
      price: true,
      price_per_m2: true,
      area_m2: true,
      rooms: true,
      condition: true,
    },
    orderBy: [
      { is_distressed: "desc" },
      { createdAt: "desc" },
    ],
    take: limit,
  });

  return properties;
}

/**
 * Format retrieved properties for system prompt
 */
export function formatPropertiesForPrompt(properties: RetrievedProperty[]): string {
  if (properties.length === 0) return "";
  return properties.map(p => 
    `- ${p.title}: €${p.price.toLocaleString()} (${p.area_m2}m², €${p.price_per_m2}/m², ${p.rooms ?? "?"} izby, ${p.district}, ${p.city})`
  ).join("\n");
}
