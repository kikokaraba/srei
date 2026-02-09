/**
 * Apify Webhook Endpoint
 * 
 * Tento endpoint:
 * 1. Prijíma notifikácie od Apify keď scraping skončí
 * 2. Sťahuje dáta z datasetu
 * 3. Čistí a normalizuje dáta
 * 4. Generuje fingerprint pre deduplikáciu
 * 5. Ukladá do databázy cez Prisma
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getApifyDatasetItems,
  getApifyDatasetItemsRaw,
  type ApifyScrapedItem,
  type TopRealityDatasetItem,
} from "@/lib/scraper/apify-service";
import { normalizeImages } from "@/lib/scraper/normalize-images";
import {
  parseArea as parseAreaFromText,
  parseRooms as parseRoomsFromText,
  parseFloor as parseFloorFromText,
  parseCondition as parseConditionFromText,
} from "@/lib/scraper/parser";
import {
  enrichAddressWithAI,
  verifyAddressWithGeocoding,
  type EnrichedAddress,
} from "@/lib/ai/address-enrichment";
import { analyzeListing } from "@/lib/ai/listing-analyst";
import { runHunterAlertsForProperty } from "@/lib/telegram/hunter";

// ============================================================================
// HELPER FUNKCIE PRE ČISTENIE DÁT
// ============================================================================

const NEGOTIABLE_MARKERS = [
  "dohodou", "dohoda", "info v rk", "na vyžiadanie", "vyžiadanie",
  "v rk", "v r.k.", "cena v rk", "cena v r.k.",
];

function isPriceNegotiable(priceRaw: string | undefined): boolean {
  if (!priceRaw || typeof priceRaw !== "string") return false;
  const lower = priceRaw.toLowerCase().trim();
  return NEGOTIABLE_MARKERS.some((m) => lower.includes(m));
}

/**
 * Parsuje cenu z raw stringu. Prísna validácia – nikdy nehádať.
 * Príklady: "150 000 €", "150000", "Cena dohodou"
 */
function parsePrice(priceRaw: string | undefined): number {
  if (!priceRaw) return 0;
  const lower = priceRaw.toLowerCase().trim();

  // Cena dohodou / v RK – NIKDY nepoužívať číslo z textu (ani z meta/odhadu)
  if (isPriceNegotiable(priceRaw)) return 0;

  const cleaned = priceRaw.replace(/[^0-9]/g, "");
  const price = parseInt(cleaned, 10);
  if (Number.isNaN(price)) return 0;
  if (price < 1000 || price > 50000000) return 0;
  return price;
}

/**
 * Parsuje plochu z raw stringu
 * Príklady: "85 m²", "85m2", "85"
 */
function parseArea(areaRaw: string | undefined): number {
  if (!areaRaw) return 0;
  
  const match = areaRaw.match(/(\d+(?:[.,]\d+)?)/);
  if (!match) return 0;
  
  const area = parseFloat(match[1].replace(",", "."));
  
  // Validácia: 10–500 m² (nad 500 = podozrivé, napr. domy; pod 10 = chyba)
  if (area < 10 || area > 500) {
    return 0;
  }
  
  return area;
}

/**
 * Parsuje počet izieb
 */
function parseRooms(roomsRaw: string | undefined): number | null {
  if (!roomsRaw) return null;
  
  const match = roomsRaw.match(/(\d+)/);
  if (!match) return null;
  
  const rooms = parseInt(match[1], 10);
  return rooms > 0 && rooms < 20 ? rooms : null;
}

/**
 * Parsuje poschodie
 */
function parseFloor(floorRaw: string | undefined): number | null {
  if (!floorRaw) return null;
  
  const lower = floorRaw.toLowerCase();
  
  // Prízemie
  if (lower.includes("prízemie") || lower.includes("prízem")) {
    return 0;
  }
  
  // Suterén
  if (lower.includes("suterén") || lower.includes("pivot")) {
    return -1;
  }
  
  const match = floorRaw.match(/(\d+)/);
  if (!match) return null;
  
  return parseInt(match[1], 10);
}

/**
 * Normalizuje stav nehnuteľnosti (raw)
 */
function parseCondition(conditionRaw: string | undefined): string | null {
  if (!conditionRaw) return null;
  const lower = conditionRaw.toLowerCase();
  if (lower.includes("novostavba") || lower.includes("nová")) return "NOVOSTAVBA";
  if (lower.includes("komplet") && lower.includes("rekon")) return "KOMPLETNA_REKONSTRUKCIA";
  if (lower.includes("čiastoč") && lower.includes("rekon")) return "CIASTOCNA_REKONSTRUKCIA";
  if (lower.includes("pôvodný") || lower.includes("povodny")) return "POVODNY_STAV";
  if (lower.includes("dobrý") || lower.includes("dobry")) return "DOBRY_STAV";
  if (lower.includes("veľmi dobrý")) return "VELMI_DOBRY_STAV";
  return "NEZISTENY";
}

/** Mapuje na PropertyCondition enum (POVODNY | REKONSTRUKCIA | NOVOSTAVBA) */
function mapConditionToSchema(raw: string | null): "POVODNY" | "REKONSTRUKCIA" | "NOVOSTAVBA" {
  if (!raw) return "POVODNY";
  if (raw === "NOVOSTAVBA") return "NOVOSTAVBA";
  if (raw.includes("REKONSTRUKCIA") || raw.includes("REKON")) return "REKONSTRUKCIA";
  return "POVODNY";
}

/**
 * Určí typ nehnuteľnosti z URL alebo titulku
 */
function detectPropertyType(url: string, title: string): string {
  const combined = (url + " " + title).toLowerCase();
  
  if (combined.includes("/byty/") || combined.includes("byt") || combined.includes("garsónka")) {
    return "BYT";
  }
  if (combined.includes("/domy/") || combined.includes("dom") || combined.includes("rodinný")) {
    return "DOM";
  }
  if (combined.includes("/pozemky/") || combined.includes("pozemok") || combined.includes("stavebný")) {
    return "POZEMOK";
  }
  if (combined.includes("/komercne/") || combined.includes("komerčn") || combined.includes("kancelár")) {
    return "KOMERCNE";
  }
  
  return "BYT"; // Default
}

/**
 * Určí typ transakcie z URL
 */
/** Bazos používa v ceste „prenajmu“ (reality.bazos.sk/prenajmu/byt/), nie „prenajom“. */
function detectTransactionType(url: string): string {
  const lower = url.toLowerCase();
  if (lower.includes("/prenajmu/") || lower.includes("prenájmu") || lower.includes("/prenajom/") || lower.includes("prenájom")) return "PRENAJOM";
  return "PREDAJ";
}

/**
 * Generuje slug z titulku
 */
function generateSlug(title: string, externalId: string): string {
  const base = title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .substring(0, 80);
  
  return `${base}-${externalId.slice(-8)}`;
}

/**
 * Extrahuje externalId z URL
 * 
 * Nehnutelnosti.sk má rôzne URL formáty:
 * - /detail/JuNCe35i6FJ/slug → ID je JuNCe35i6FJ
 * - /detail/developersky-projekt/JuNCe35i6FJ/slug → ID je JuNCe35i6FJ (nie "developersky-projekt"!)
 * 
 * ID formát: začína "Ju" + 9 alfanumerických znakov (case-sensitive)
 */
function extractExternalId(url: string): string {
  // Bazos - jednoduchý formát
  const bazosMatch = url.match(/\/inzerat\/(\d+)/);
  if (bazosMatch) return `bz-${bazosMatch[1]}`;
  
  // Nehnutelnosti - hľadaj ID vo formáte Ju* (11 znakov, začína Ju)
  // Tento pattern matchuje unikátne ID, nie generické segmenty ako "developersky-projekt"
  const nehnutIdMatch = url.match(/\/(Ju[A-Za-z0-9_-]{8,12})\/?/);
  if (nehnutIdMatch) return `nh-${nehnutIdMatch[1]}`;
  
  // Fallback: ak nenájdeme Ju*, skús prvý segment po /detail/ ktorý nie je generický
  const pathAfterDetail = url.match(/\/detail\/([^?]+)/);
  if (pathAfterDetail) {
    const segments = pathAfterDetail[1].split("/").filter(Boolean);
    // Preskočí generické segmenty (malé písmená s pomlčkami) a vezme prvý unikátny
    const genericPatterns = /^(developersky-projekt|predaj|prenajom|byty|domy|pozemky|reality|novostavby)$/i;
    for (const seg of segments) {
      if (!genericPatterns.test(seg) && seg.length >= 8) {
        return `nh-${seg}`;
      }
    }
    // Ak nič nenájdeme, použi posledný segment
    if (segments.length > 0) {
      return `nh-${segments[segments.length - 1]}`;
    }
  }
  
  // TopReality.sk – detail/id alebo query id
  const topRealityMatch = url.match(/\/detail\/(\d+)/) || url.match(/[?&]id=(\d+)/);
  if (topRealityMatch) return `tr-${topRealityMatch[1]}`;

  return `uk-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ============================================================================
// AI ADDRESS ENRICHMENT
// ============================================================================

const BAD_ADDRESS = /balkón|obývačka|garáž|pivnica|terasa|pivot|loggia|záhrad|garden|kompletný|čiastočn/i;

function addressLooksBad(full: string | undefined): boolean {
  if (!full || full.length < 10) return true;
  return BAD_ADDRESS.test(full);
}

function buildFullAddress(a: EnrichedAddress): string {
  const parts: string[] = [];
  if (a.streetNumber && a.street) parts.push(`${a.street} ${a.streetNumber}`);
  else if (a.street) parts.push(a.street);
  if (a.district) parts.push(a.district);
  parts.push(a.city);
  return parts.join(", ");
}

/** Parsuje cleanAddress "Mesto, Mestská časť, Ulica, Číslo" z AI. */
function parseCleanAddress(
  cleanAddress: string
): { city: string; district: string; street: string | null; address: string } {
  const parts = cleanAddress.split(",").map((s) => s.trim()).filter(Boolean);
  return {
    city: parts[0] || "",
    district: parts[1] || "",
    street: parts[2] || null,
    address: cleanAddress,
  };
}

// ============================================================================
// BATCH: PRÍPRAVA A NORMALIZÁCIA (bez DB)
// ============================================================================

interface PreparedItem {
  externalId: string;
  sourceUrl: string;
  price: number;
  pricePerM2: number;
  data: {
    title: string;
    slug: string;
    description: string;
    price: number;
    price_per_m2: number;
    area_m2: number;
    rooms: number | null;
    floor: number | null;
    condition: "POVODNY" | "REKONSTRUKCIA" | "NOVOSTAVBA";
    energy_certificate: "NONE";
    city: string;
    district: string;
    street: string | null;
    address: string;
    photos: string;
    thumbnail_url: string | null;
    photo_count: number;
    source: "BAZOS" | "REALITY" | "NEHNUTELNOSTI" | "TOPREALITY";
    source_url: string;
    external_id: string;
    listing_type: "PREDAJ" | "PRENAJOM";
    property_type: string;
    priority_score: number;
    status: "ACTIVE";
    last_seen_at: Date;
    constructionType?: string | null;
    ownership?: string | null;
    technicalCondition?: string | null;
    redFlags?: string | null;
    aiAddress?: string | null;
    investmentSummary?: string | null;
    seller_name?: string | null;
    seller_phone?: string | null;
    top3_facts?: string | null;
    is_negotiable: boolean;
  };
  addPriceHistory: boolean;
}

function prepareItem(item: ApifyScrapedItem): { prepared: PreparedItem; rawAddressContext: string | null } | null {
  const negotiable = isPriceNegotiable(item.price_raw);
  const price = parsePrice(item.price_raw);
  let area = parseArea(item.area_m2);
  let city = item.location && typeof item.location === "object" ? item.location.city : undefined;
  if (!city && typeof item.location === "string") city = item.location.split(/[,|]/)[0]?.trim();
  city = city || "Slovensko";
  const hasPrice = price > 0 || negotiable;
  let hasArea = area > 0;
  const hasTitle = !!item.title;
  if (!hasTitle || (!hasPrice && !hasArea)) return null;

  // Bazoš: fallback – plocha/izby/poschodie/stav z titulku a popisu
  let rooms = parseRooms(item.rooms);
  let floor: number | null = parseFloor(item.floor);
  let conditionRaw: string | null = parseCondition(item.condition);
  if (item.portal === "bazos" && (item.title || item.description)) {
    const fullText = [item.title, item.description].filter(Boolean).join(" ");
    if (area === 0) {
      const fromText = parseAreaFromText(fullText);
      if (fromText != null && fromText >= 10 && fromText <= 500) {
        area = fromText;
        hasArea = true;
      }
    }
    if (rooms == null) {
      const fromText = parseRoomsFromText(fullText);
      if (fromText != null) rooms = fromText;
    }
    if (floor == null && !item.floor) {
      const fp = parseFloorFromText(fullText);
      floor = fp.floor != null ? fp.floor : null;
    }
    if (!conditionRaw) conditionRaw = parseConditionFromText(fullText) as string;
  }

  const externalId = extractExternalId(item.url);
  const listingType = detectTransactionType(item.url);
  const propertyType = detectPropertyType(item.url, item.title || "");
  if (propertyType !== "BYT") return null;

  const pricePerM2 = area > 0 && price > 0 ? Math.round(price / area) : 0;
  const slug = generateSlug(item.title || "nehnutelnost", externalId);
  const { urls: imageUrls, thumbnailUrl } = normalizeImages(item);
  const source: "BAZOS" | "REALITY" | "NEHNUTELNOSTI" | "TOPREALITY" =
    item.portal === "bazos" ? "BAZOS" : item.portal === "nehnutelnosti" ? "NEHNUTELNOSTI" : "REALITY";
  const priority_score = rooms != null ? 50 : 30;

  const rawAddressContext = (item.raw_address_context ?? "").trim() || null;
  return {
    prepared: {
      externalId,
      sourceUrl: item.url,
      price,
      pricePerM2,
      addPriceHistory: price > 0,
      data: {
        title: item.title || "Bez názvu",
        slug,
        description: item.description || "",
        price,
        price_per_m2: pricePerM2,
        area_m2: area,
        rooms,
        floor,
        condition: mapConditionToSchema(conditionRaw),
        energy_certificate: "NONE",
        city,
        district: item.location?.district || "",
        street: item.location?.street || null,
        address: item.location?.full || city,
        photos: JSON.stringify(imageUrls),
        thumbnail_url: thumbnailUrl,
        photo_count: imageUrls.length,
        source,
        source_url: item.url,
        external_id: externalId,
        listing_type: listingType === "PRENAJOM" ? "PRENAJOM" : "PREDAJ",
        property_type: "BYT",
        priority_score,
        status: "ACTIVE",
        last_seen_at: new Date(),
        is_negotiable: negotiable || price === 0,
      },
    },
    rawAddressContext,
  };
}

/**
 * Mapuje položku z Top Reality Actora na PreparedItem.
 * Berieme len byty (flats), platná cena alebo plocha, titulok a URL.
 */
function prepareTopRealityItem(
  item: TopRealityDatasetItem
): { prepared: PreparedItem; rawAddressContext: string | null } | null {
  const url = typeof item.url === "string" ? item.url : "";
  if (!url || !url.includes("topreality")) return null;

  const title = typeof item.title === "string" ? item.title : "";
  if (!title) return null;

  const priceRaw = item.price != null ? String(item.price) : "";
  const price = parsePrice(priceRaw);
  const areaRaw = item.area != null ? String(item.area) : "";
  const area = parseArea(areaRaw);
  const hasPrice = price > 0 || isPriceNegotiable(priceRaw);
  const hasArea = area > 0;
  if (!hasPrice && !hasArea) return null;

  const externalId = extractExternalId(url);
  const listingType = (item as { type?: string }).type === "rent" ? "PRENAJOM" : "PREDAJ";
  const propertyType = "BYT";
  const pricePerM2 = area > 0 && price > 0 ? Math.round(price / area) : 0;
  const slug = generateSlug(title, externalId);

  let imageUrls: string[] = [];
  if (Array.isArray(item.images)) {
    imageUrls = item.images.map((img) =>
      typeof img === "string" ? img : (img as { url?: string }).url ?? ""
    ).filter(Boolean);
  }
  const { thumbnailUrl } = normalizeImages({ images: imageUrls } as ApifyScrapedItem);

  const city = typeof item.city === "string" ? item.city : (typeof item.location === "string" ? item.location : "Slovensko");
  const rawAddressContext = [city, item.region, item.location].filter(Boolean).join(", ") || null;

  return {
    prepared: {
      externalId,
      sourceUrl: url,
      price,
      pricePerM2,
      addPriceHistory: price > 0,
      data: {
        title,
        slug,
        description: typeof item.description === "string" ? item.description : "",
        price,
        price_per_m2: pricePerM2,
        area_m2: area,
        rooms: null,
        floor: null,
        condition: "POVODNY",
        energy_certificate: "NONE",
        city: city || "Slovensko",
        district: "",
        street: null,
        address: city || "Slovensko",
        photos: JSON.stringify(imageUrls),
        thumbnail_url: thumbnailUrl,
        photo_count: imageUrls.length,
        source: "TOPREALITY",
        source_url: url,
        external_id: externalId,
        listing_type: listingType as "PREDAJ" | "PRENAJOM",
        property_type: propertyType,
        priority_score: 40,
        status: "ACTIVE",
        last_seen_at: new Date(),
        is_negotiable: price === 0 || isPriceNegotiable(priceRaw),
      },
    },
    rawAddressContext,
  };
}

// ============================================================================
// WEBHOOK HANDLER – BATCH UPSERT
// ============================================================================

const BATCH_CHUNK_SIZE = 40;
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    console.log("📥 [Webhook] Received Apify notification:", {
      resourceId: payload.resourceId,
      datasetId: payload.datasetId,
      portal: payload.portal,
      status: payload.status,
    });

    if (!payload.datasetId) {
      return NextResponse.json({ success: false, error: "Missing datasetId" }, { status: 400 });
    }

    const runStart = Date.now();
    const isTopReality = payload.portal === "topreality";

    const results: { prepared: PreparedItem; rawAddressContext: string | null }[] = [];
    const skippedReasons: string[] = [];
    const itemErrors: { url?: string; reason: string }[] = [];
    let totalItems = 0;

    if (isTopReality) {
      const rawItems = await getApifyDatasetItemsRaw(payload.datasetId) as TopRealityDatasetItem[];
      totalItems = rawItems.length;
      console.log(`📦 [Webhook] Fetched ${totalItems} Top Reality items`);
      for (const item of rawItems) {
        try {
          const r = prepareTopRealityItem(item);
          if (r) results.push(r);
          else skippedReasons.push("Missing title or price+area or not byt");
        } catch (e) {
          const err = e instanceof Error ? e.message : String(e);
          itemErrors.push({ url: item?.url, reason: err });
          skippedReasons.push(`Prepare failed: ${err}`);
        }
      }
    } else {
      const items = await getApifyDatasetItems(payload.datasetId);
      totalItems = items.length;
      console.log(`📦 [Webhook] Fetched ${totalItems} items`);
      for (const item of items) {
        try {
          const r = prepareItem(item);
          if (r) results.push(r);
          else skippedReasons.push("Missing title or price+area or invalid area (10–500 m²)");
        } catch (e) {
          const err = e instanceof Error ? e.message : String(e);
          itemErrors.push({ url: item?.url, reason: err });
          skippedReasons.push(`Prepare failed: ${err}`);
        }
      }
    }

    const MAX_ENRICH = 30;
    const ENRICH_CONCURRENCY = 5;
    const toEnrich = results.filter((r) => {
      if (!r.rawAddressContext) return false;
      const noStreet = !r.prepared.data.street;
      const bad = addressLooksBad(r.prepared.data.address);
      return noStreet || bad;
    }).slice(0, MAX_ENRICH);

    for (let i = 0; i < toEnrich.length; i += ENRICH_CONCURRENCY) {
      const chunk = toEnrich.slice(i, i + ENRICH_CONCURRENCY);
      const enrichedList = await Promise.all(
        chunk.map(async (r) => {
          try {
            const enriched = await enrichAddressWithAI(r.rawAddressContext!);
            return { r, enriched } as const;
          } catch (e) {
            itemErrors.push({ url: r.prepared.sourceUrl, reason: `Enrich: ${e instanceof Error ? e.message : String(e)}` });
            return { r, enriched: null } as const;
          }
        })
      );
      for (const { r, enriched } of enrichedList) {
        if (!enriched) continue;
        try {
          const verified = await verifyAddressWithGeocoding(enriched);
          if (!verified) console.warn("[Webhook] Lokalita neoverená:", enriched.city, enriched.street);
          r.prepared.data.city = enriched.city;
          r.prepared.data.district = enriched.district ?? "";
          r.prepared.data.street = enriched.street;
          r.prepared.data.address = buildFullAddress(enriched);
        } catch (e) {
          itemErrors.push({ url: r.prepared.sourceUrl, reason: `Verify: ${e instanceof Error ? e.message : String(e)}` });
        }
        await new Promise((by) => setTimeout(by, 1100));
      }
    }

    const ANALYST_CONCURRENCY = 5;
    for (let i = 0; i < results.length; i += ANALYST_CONCURRENCY) {
      const chunk = results.slice(i, i + ANALYST_CONCURRENCY);
      await Promise.all(
        chunk.map(async (r) => {
          try {
            const rawLoc = r.rawAddressContext ?? [r.prepared.data.city, r.prepared.data.district, r.prepared.data.address].filter(Boolean).join(", ");
            const analysis = await analyzeListing(r.prepared.data.description || "", rawLoc);
            if (!analysis) return;
            r.prepared.data.constructionType = analysis.constructionType;
            r.prepared.data.ownership = analysis.ownership;
            r.prepared.data.technicalCondition = analysis.technicalCondition;
            r.prepared.data.redFlags = analysis.redFlags;
            r.prepared.data.investmentSummary = analysis.investmentSummary;
            r.prepared.data.aiAddress = analysis.cleanAddress;
            r.prepared.data.seller_phone = analysis.phone;
            r.prepared.data.seller_name = analysis.contactName;
            r.prepared.data.top3_facts = analysis.top3Facts ? JSON.stringify(analysis.top3Facts) : null;
            if (analysis.cleanAddress) {
              const parsed = parseCleanAddress(analysis.cleanAddress);
              if (parsed.city) r.prepared.data.city = parsed.city;
              if (parsed.district) r.prepared.data.district = parsed.district;
              r.prepared.data.street = parsed.street ?? r.prepared.data.street;
              r.prepared.data.address = parsed.address;
            }
          } catch (e) {
            itemErrors.push({ url: r.prepared.sourceUrl, reason: `Analyst: ${e instanceof Error ? e.message : String(e)}` });
          }
        })
      );
    }

    const seenIds = new Set<string>();
    const seenUrls = new Set<string>();
    const deduped: PreparedItem[] = [];
    for (const r of results) {
      const p = r.prepared;
      if (seenIds.has(p.externalId) || seenUrls.has(p.sourceUrl)) continue;
      seenIds.add(p.externalId);
      seenUrls.add(p.sourceUrl);
      deduped.push(p);
    }

    if (deduped.length === 0) {
      const duration_ms = Date.now() - runStart;
      try {
        await prisma.dataFetchLog.create({
          data: {
            source: "apify-webhook",
            status: "success",
            recordsCount: 0,
            error: skippedReasons.length ? skippedReasons.slice(0, 10).join("; ") : null,
            duration_ms,
          },
        });
      } catch {
        /* ignore */
      }
      return NextResponse.json({
        success: true,
        portal: payload.portal,
        stats: { total: totalItems, created: 0, updated: 0, skipped: totalItems, errors: skippedReasons.slice(0, 20) },
      });
    }

    // Strict matching: duplikát = IBA zhoda source_url alebo external_id. Žiadne spájanie podľa mesta/plochy/ceny.
    const externalIds = [...new Set(deduped.map((p) => p.externalId).filter((id) => !id.startsWith("uk-")))];
    const sourceUrls = [...new Set(deduped.map((p) => p.sourceUrl))];
    const orParts: { external_id?: string; source_url?: string }[] = [];
    for (const id of externalIds) orParts.push({ external_id: id });
    for (const u of sourceUrls) orParts.push({ source_url: u });
    const existing =
      orParts.length > 0
        ? await prisma.property.findMany({
            where: { OR: orParts },
            select: { id: true, external_id: true, source_url: true, price: true },
          })
        : [];

    const byExt = new Map<string, { id: string; price: number }>();
    const byUrl = new Map<string, { id: string; price: number }>();
    for (const e of existing) {
      if (e.external_id) byExt.set(e.external_id, { id: e.id, price: e.price });
      if (e.source_url) byUrl.set(e.source_url, { id: e.id, price: e.price });
    }

    const toCreate: PreparedItem[] = [];
    const toUpdate: { prepared: PreparedItem; existingId: string; existingPrice: number }[] = [];
    for (const p of deduped) {
      // Prefer source_url (kanonická URL), potom external_id. Nikdy nespájať podľa parametrov.
      const ex = byUrl.get(p.sourceUrl) ?? byExt.get(p.externalId);
      if (ex) toUpdate.push({ prepared: p, existingId: ex.id, existingPrice: ex.price });
      else toCreate.push(p);
    }

    let created = 0;
    let updated = 0;
    const errors: string[] = [];
    const createdIds: string[] = [];
    const updatedIds: string[] = [];

    for (const p of toCreate) {
      try {
        const prop = await prisma.property.create({ data: p.data as never });
        created++;
        createdIds.push(prop.id);
        if (p.addPriceHistory) {
          await prisma.priceHistory.create({
            data: { propertyId: prop.id, price: p.price, price_per_m2: p.pricePerM2 },
          });
        }
      } catch (e) {
        const err = e instanceof Error ? e.message : String(e);
        errors.push(`Create ${p.externalId}: ${err}`);
        itemErrors.push({ url: p.sourceUrl, reason: `DB create: ${err}` });
      }
    }

    for (const { prepared: p, existingId, existingPrice } of toUpdate) {
      try {
        const updateData: Record<string, unknown> = {
          price: p.data.price,
          price_per_m2: p.data.price_per_m2,
          is_negotiable: p.data.is_negotiable,
          photos: p.data.photos,
          thumbnail_url: p.data.thumbnail_url,
          photo_count: p.data.photo_count,
          last_seen_at: p.data.last_seen_at,
          status: "ACTIVE",
        };
        if (p.data.constructionType != null) updateData.constructionType = p.data.constructionType;
        if (p.data.ownership != null) updateData.ownership = p.data.ownership;
        if (p.data.technicalCondition != null) updateData.technicalCondition = p.data.technicalCondition;
        if (p.data.redFlags != null) updateData.redFlags = p.data.redFlags;
        if (p.data.aiAddress != null) updateData.aiAddress = p.data.aiAddress;
        if (p.data.investmentSummary != null) updateData.investmentSummary = p.data.investmentSummary;
        if (p.data.top3_facts != null) updateData.top3_facts = p.data.top3_facts;
        if (p.data.seller_phone != null) updateData.seller_phone = p.data.seller_phone;
        if (p.data.seller_name != null) updateData.seller_name = p.data.seller_name;
        if (p.data.aiAddress) {
          const parsed = parseCleanAddress(p.data.aiAddress);
          if (parsed.city) updateData.city = parsed.city;
          if (parsed.district) updateData.district = parsed.district;
          if (parsed.street != null) updateData.street = parsed.street;
          updateData.address = parsed.address;
        }
        await prisma.property.update({
          where: { id: existingId },
          data: updateData as never,
        });
        updated++;
        updatedIds.push(existingId);
        // Pri zhode podľa URL vždy aktualizujeme cenu a pridáme záznam do PriceHistory (audit + staleness).
        if (p.addPriceHistory) {
          await prisma.priceHistory.create({
            data: { propertyId: existingId, price: p.price, price_per_m2: p.pricePerM2 },
          });
        }
      } catch (e) {
        const err = e instanceof Error ? e.message : String(e);
        errors.push(`Update ${existingId}: ${err}`);
        itemErrors.push({ url: p.sourceUrl, reason: `DB update: ${err}` });
      }
    }

    let hunterAlertsSent = 0;
    const hunterIds = [...createdIds, ...updatedIds];
    for (const id of hunterIds) {
      try {
        hunterAlertsSent += await runHunterAlertsForProperty(id);
      } catch (e) {
        console.warn("[Webhook] Hunter alerts failed for property", id, e);
      }
    }

    const duration_ms = Date.now() - runStart;
    const logStatus = errors.length > 0 ? (created + updated > 0 ? "partial" : "error") : "success";
    const allErrors = [...errors, ...itemErrors.map((e) => `${e.url ?? "?"}: ${e.reason}`)];

    try {
      await prisma.dataFetchLog.create({
        data: {
          source: "apify-webhook",
          status: logStatus,
          recordsCount: created + updated,
          hunterAlertsSent: hunterAlertsSent > 0 ? hunterAlertsSent : null,
          error: allErrors.length > 0 ? allErrors.slice(0, 30).join("; ") : null,
          duration_ms,
        },
      });
    } catch (logErr) {
      console.warn("[Webhook] DataFetchLog create failed:", logErr);
    }

    const stats = {
      total: totalItems,
      created,
      updated,
      skipped: Math.max(0, totalItems - created - updated),
      hunterAlertsSent,
      errors: allErrors.slice(0, 50),
      duration_ms,
    };
    console.log("✅ [Webhook] Batch complete:", stats);
    if (createdIds.length > 0) console.log("[Webhook] Created IDs:", createdIds);
    if (updatedIds.length > 0) console.log("[Webhook] Updated by URL/external_id:", updatedIds);

    return NextResponse.json({ success: true, portal: payload.portal, stats });
  } catch (error) {
    console.error("❌ [Webhook] Error:", error);
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    try {
      await prisma.dataFetchLog.create({
        data: {
          source: "apify-webhook",
          status: "error",
          recordsCount: 0,
          error: errMsg,
          duration_ms: 0,
        },
      });
    } catch {
      /* ignore */
    }
    return NextResponse.json(
      { success: false, error: errMsg },
      { status: 500 }
    );
  }
}

/**
 * GET - Health check
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    message: "Apify webhook endpoint is ready",
    timestamp: new Date().toISOString(),
  });
}
