/**
 * Ingestion Pipeline - Robustné ukladanie scrapovaných dát
 * 
 * Riešené problémy:
 * 1. Detailné logovanie chýb - presne vidíš prečo sa neuložilo
 * 2. Validácia pred uložením - neplatné záznamy sa nezapisujú
 * 3. Batch processing - rýchlejšie a spoľahlivejšie
 * 4. Sledovanie duplicít - rozlíšenie medzi "už existuje" a "nový"
 * 5. ScraperRun log - vidíš históriu všetkých behov
 */

import { prisma } from "@/lib/prisma";
import type { PropertySource, ListingType } from "@/generated/prisma/client";
import { 
  findBestMatch, 
  createFingerprint, 
  saveFingerprint,
  recordReListing,
} from "@/lib/matching/fingerprint";

// ==========================================
// TYPY
// ==========================================

export interface ScrapedProperty {
  externalId: string;
  source: PropertySource;
  title: string;
  description: string;
  price: number;
  pricePerM2: number;
  areaM2: number;
  city: string;
  district: string;
  rooms?: number;
  listingType: ListingType;
  sourceUrl: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  skipReason?: SkipReason;
}

export type SkipReason = 
  | "DUPLICATE"
  | "INVALID_PRICE"
  | "INVALID_AREA"
  | "MISSING_CITY"
  | "MISSING_TITLE"
  | "BLOCKED_CONTENT"
  | "VALIDATION_ERROR"
  | "DATABASE_ERROR"
  | "SLUG_CONFLICT";

export interface IngestionStats {
  found: number;
  savedNew: number;
  savedUpdated: number;
  savedRelisted: number; // Re-listingy (vrátené po INACTIVE)
  skippedDuplicate: number;
  skippedInvalidPrice: number;
  skippedInvalidArea: number;
  skippedMissingCity: number;
  skippedBlocked: number;
  skippedValidation: number;
  skippedDbError: number;
  errors: IngestionError[];
}

export interface IngestionError {
  externalId: string;
  sourceUrl: string;
  reason: SkipReason;
  message: string;
}

// ==========================================
// VALIDÁCIA
// ==========================================

/**
 * Validuje jeden scrapovaný záznam pred uložením
 */
export function validateProperty(prop: ScrapedProperty): ValidationResult {
  const errors: string[] = [];
  let skipReason: SkipReason | undefined;

  // Kontrola titulku
  if (!prop.title || prop.title.trim().length < 3) {
    errors.push(`Chýba alebo príliš krátky názov: "${prop.title}"`);
    skipReason = "MISSING_TITLE";
  }

  // Kontrola ceny
  const minPrice = prop.listingType === "PRENAJOM" ? 50 : 5000;
  const maxPrice = prop.listingType === "PRENAJOM" ? 50000 : 50000000;
  
  if (!prop.price || prop.price < minPrice) {
    errors.push(`Neplatná cena: ${prop.price}€ (min: ${minPrice}€)`);
    skipReason = skipReason || "INVALID_PRICE";
  }
  
  if (prop.price > maxPrice) {
    errors.push(`Podozrivá cena: ${prop.price}€ (max: ${maxPrice}€)`);
    skipReason = skipReason || "INVALID_PRICE";
  }

  // Kontrola plochy
  if (!prop.areaM2 || prop.areaM2 < 5) {
    errors.push(`Neplatná plocha: ${prop.areaM2}m² (min: 5m²)`);
    skipReason = skipReason || "INVALID_AREA";
  }
  
  if (prop.areaM2 > 10000) {
    errors.push(`Podozrivá plocha: ${prop.areaM2}m² (max: 10000m²)`);
    skipReason = skipReason || "INVALID_AREA";
  }

  // Kontrola mesta
  if (!prop.city || prop.city.trim().length < 2) {
    errors.push(`Chýba mesto: "${prop.city}"`);
    skipReason = skipReason || "MISSING_CITY";
  }

  // Kontrola externalId
  if (!prop.externalId || prop.externalId.trim().length < 1) {
    errors.push(`Chýba externalId`);
    skipReason = skipReason || "VALIDATION_ERROR";
  }

  // Kontrola sourceUrl
  if (!prop.sourceUrl || !prop.sourceUrl.startsWith("http")) {
    errors.push(`Neplatná URL: "${prop.sourceUrl}"`);
    skipReason = skipReason || "VALIDATION_ERROR";
  }

  // Kontrola price_per_m2 konzistencie
  if (prop.areaM2 > 0 && prop.price > 0) {
    const calculatedPricePerM2 = Math.round(prop.price / prop.areaM2);
    if (Math.abs(calculatedPricePerM2 - prop.pricePerM2) > 100) {
      // Opravi nesprávnu hodnotu
      prop.pricePerM2 = calculatedPricePerM2;
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    skipReason,
  };
}

/**
 * Validuje HTML či neobsahuje captcha alebo blokovanie
 */
export function validateHtml(html: string, source: string): { isValid: boolean; reason?: string } {
  const lowerHtml = html.toLowerCase();
  
  // Známe patterny blokovania
  const blockPatterns = [
    { pattern: /captcha/i, reason: "Detekovaná CAPTCHA" },
    { pattern: /ste robot/i, reason: "Detekované 'Ste robot'" },
    { pattern: /are you a robot/i, reason: "Detekované 'Are you a robot'" },
    { pattern: /access denied/i, reason: "Access Denied" },
    { pattern: /rate limit/i, reason: "Rate limit exceeded" },
    { pattern: /too many requests/i, reason: "Too many requests" },
    { pattern: /blocked/i, reason: "Request blocked" },
    { pattern: /cloudflare/i, reason: "Cloudflare protection" },
    { pattern: /bot detection/i, reason: "Bot detection" },
  ];
  
  for (const { pattern, reason } of blockPatterns) {
    if (pattern.test(html)) {
      // Dodatočná kontrola - "cloudflare" môže byť len v skriptoch
      if (pattern.source === "cloudflare") {
        // Ak je len v script tagu, môže byť OK
        if (!lowerHtml.includes("checking your browser") && 
            !lowerHtml.includes("please wait")) {
          continue;
        }
      }
      return { isValid: false, reason };
    }
  }
  
  // Kontrola či HTML obsahuje očakávané elementy
  const hasListings = html.includes("inzerat") || 
                      html.includes("property") || 
                      html.includes("advertisement") ||
                      html.includes("listing");
  
  if (html.length < 5000 && !hasListings) {
    return { isValid: false, reason: "HTML príliš krátke alebo prázdne" };
  }
  
  return { isValid: true };
}

// ==========================================
// INGESTION PIPELINE
// ==========================================

/**
 * Generuje unikátny slug pre nehnuteľnosť
 */
function generateSlug(prop: ScrapedProperty): string {
  const titleSlug = prop.title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .substring(0, 80);
  
  return `${titleSlug}-${prop.externalId.slice(-8)}`;
}

/**
 * Uloží jednu nehnuteľnosť do databázy
 * Vracia: "new" | "updated" | "duplicate" | "relisted" | SkipReason
 * 
 * VYLEPŠENÁ LOGIKA s fingerprinting:
 * 1. Validácia dát
 * 2. Presná zhoda (source + external_id)
 * 3. Fingerprint matching (rovnaká nehnuteľnosť, iné ID)
 * 4. Fuzzy matching (podobná nehnuteľnosť)
 * 5. Nová nehnuteľnosť
 */
async function saveProperty(
  prop: ScrapedProperty,
  stats: IngestionStats
): Promise<"new" | "updated" | "duplicate" | "relisted" | SkipReason> {
  try {
    // 1. Validácia
    const validation = validateProperty(prop);
    if (!validation.isValid) {
      const reason = validation.skipReason || "VALIDATION_ERROR";
      stats.errors.push({
        externalId: prop.externalId,
        sourceUrl: prop.sourceUrl,
        reason,
        message: validation.errors.join("; "),
      });
      return reason;
    }

    // 2. Použij fingerprinting pre inteligentné matching
    const matchResult = await findBestMatch({
      source: prop.source,
      external_id: prop.externalId,
      city: prop.city,
      district: prop.district,
      area_m2: prop.areaM2,
      rooms: prop.rooms,
      address: `${prop.city}${prop.district ? `, ${prop.district}` : ""}`,
      title: prop.title,
      description: prop.description,
      price: prop.price,
    });

    if (matchResult.isMatch && matchResult.matchedPropertyId) {
      // Nájdená existujúca nehnuteľnosť
      const existingProperty = await prisma.property.findUnique({
        where: { id: matchResult.matchedPropertyId },
        select: {
          id: true,
          price: true,
          status: true,
          external_id: true,
        },
      });

      if (!existingProperty) {
        // Nemalo by nastať, ale pre istotu
        return await createNewProperty(prop, stats);
      }

      // Ak sa jedná o re-listing (vrátil sa po INACTIVE/REMOVED)
      if (matchResult.isReListing) {
        console.log(`  🔄 Re-listing detected: ${prop.title.substring(0, 50)}...`);
        console.log(`     Match score: ${matchResult.similarityScore}%`);
        console.log(`     Reasons: ${matchResult.matchReasons.join(", ")}`);
        
        // Zaznamenaj re-listing
        await recordReListing(existingProperty.id, prop.price, existingProperty.status);
        
        // Aktualizuj nehnuteľnosť
        await prisma.$transaction([
          prisma.property.update({
            where: { id: existingProperty.id },
            data: {
              status: "ACTIVE",
              price: prop.price,
              price_per_m2: prop.pricePerM2,
              last_seen_at: new Date(),
              external_id: prop.externalId, // Aktualizuj na nové ID
              source_url: prop.sourceUrl,
              updatedAt: new Date(),
            },
          }),
          // Zaznamenaj novú cenu
          prisma.priceHistory.create({
            data: {
              propertyId: existingProperty.id,
              price: prop.price,
              price_per_m2: prop.pricePerM2,
            },
          }),
        ]);
        
        return "relisted";
      }

      // Štandardný update alebo duplicate
      if (existingProperty.price !== prop.price) {
        // Cena sa zmenila - aktualizuj a zaznamenaj históriu
        await prisma.$transaction([
          prisma.property.update({
            where: { id: existingProperty.id },
            data: {
              price: prop.price,
              price_per_m2: prop.pricePerM2,
              last_seen_at: new Date(),
              status: "ACTIVE",
              updatedAt: new Date(),
            },
          }),
          prisma.priceHistory.create({
            data: {
              propertyId: existingProperty.id,
              price: prop.price,
              price_per_m2: prop.pricePerM2,
            },
          }),
        ]);
        return "updated";
      } else {
        // Cena sa nezmenila - len aktualizuj last_seen_at a status
        await prisma.property.update({
          where: { id: existingProperty.id },
          data: { 
            last_seen_at: new Date(),
            status: "ACTIVE",
          },
        });
        return "duplicate";
      }
    }

    // 3. Nová nehnuteľnosť
    return await createNewProperty(prop, stats);

  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown database error";
    
    let reason: SkipReason = "DATABASE_ERROR";
    if (message.includes("Unique constraint") && message.includes("slug")) {
      reason = "SLUG_CONFLICT";
    }
    
    stats.errors.push({
      externalId: prop.externalId,
      sourceUrl: prop.sourceUrl,
      reason,
      message,
    });
    
    return reason;
  }
}

/**
 * Vytvorí novú nehnuteľnosť s fingerprintom
 */
async function createNewProperty(
  prop: ScrapedProperty,
  stats: IngestionStats
): Promise<"new" | SkipReason> {
  try {
    const slug = generateSlug(prop);
    const address = `${prop.city}${prop.district ? `, ${prop.district}` : ""}`;
    
    // Skontroluj či slug neexistuje
    const slugExists = await prisma.property.findUnique({
      where: { slug },
      select: { id: true },
    });
    
    const finalSlug = slugExists ? `${slug}-${Date.now().toString(36)}` : slug;
    
    // Vytvor nehnuteľnosť
    const newProperty = await prisma.property.create({
      data: {
        external_id: prop.externalId,
        source: prop.source,
        title: prop.title.substring(0, 200),
        slug: finalSlug,
        description: prop.description?.substring(0, 5000) || "",
        price: prop.price,
        price_per_m2: prop.pricePerM2,
        area_m2: prop.areaM2,
        city: prop.city,
        district: prop.district || "",
        address,
        rooms: prop.rooms,
        listing_type: prop.listingType,
        condition: "POVODNY",
        energy_certificate: "NONE",
        source_url: prop.sourceUrl,
        last_seen_at: new Date(),
        first_listed_at: new Date(),
        status: "ACTIVE",
      },
    });
    
    // Vytvor fingerprint
    const fingerprint = createFingerprint({
      address,
      city: prop.city,
      district: prop.district,
      area_m2: prop.areaM2,
      rooms: prop.rooms,
      price: prop.price,
      title: prop.title,
      description: prop.description,
    });
    
    await saveFingerprint(newProperty.id, fingerprint);
    
    // Zaznamenaj prvú cenu do histórie
    await prisma.priceHistory.create({
      data: {
        propertyId: newProperty.id,
        price: prop.price,
        price_per_m2: prop.pricePerM2,
      },
    });
    
    return "new";
    
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown database error";
    
    let reason: SkipReason = "DATABASE_ERROR";
    if (message.includes("Unique constraint") && message.includes("slug")) {
      reason = "SLUG_CONFLICT";
    }
    
    stats.errors.push({
      externalId: prop.externalId,
      sourceUrl: prop.sourceUrl,
      reason,
      message,
    });
    
    return reason;
  }
}

/**
 * Hlavná funkcia pre ukladanie scrapovaných nehnuteľností
 * 
 * @param properties - Pole scrapovaných nehnuteľností
 * @param source - Názov zdroja (BAZOS, NEHNUTELNOSTI, ALL)
 * @param batchSize - Veľkosť dávky (default 50)
 * @param delayBetweenBatches - Pauza medzi dávkami v ms (default 100)
 */
export async function ingestProperties(
  properties: ScrapedProperty[],
  source: string,
  options: {
    batchSize?: number;
    delayBetweenBatches?: number;
    pagesScraped?: number;
  } = {}
): Promise<{ runId: string; stats: IngestionStats }> {
  const { 
    batchSize = 50, 
    delayBetweenBatches = 100,
    pagesScraped = 0,
  } = options;

  const startTime = Date.now();
  
  // Inicializuj štatistiky
  const stats: IngestionStats = {
    found: properties.length,
    savedNew: 0,
    savedUpdated: 0,
    savedRelisted: 0,
    skippedDuplicate: 0,
    skippedInvalidPrice: 0,
    skippedInvalidArea: 0,
    skippedMissingCity: 0,
    skippedBlocked: 0,
    skippedValidation: 0,
    skippedDbError: 0,
    errors: [],
  };

  // Vytvor ScraperRun záznam
  const run = await prisma.scraperRun.create({
    data: {
      source,
      foundCount: properties.length,
      pagesScraped,
      status: "running",
    },
  });

  console.log(`\n📊 Ingestion Pipeline Started`);
  console.log(`   Run ID: ${run.id}`);
  console.log(`   Source: ${source}`);
  console.log(`   Properties to process: ${properties.length}`);
  console.log(`   Batch size: ${batchSize}`);

  // Deduplikuj vstupné dáta (rovnaký externalId v rámci jedného scrapu)
  const uniqueProperties = new Map<string, ScrapedProperty>();
  for (const prop of properties) {
    const key = `${prop.source}-${prop.externalId}`;
    if (!uniqueProperties.has(key)) {
      uniqueProperties.set(key, prop);
    }
  }
  
  const deduplicatedCount = properties.length - uniqueProperties.size;
  if (deduplicatedCount > 0) {
    console.log(`   ⚠️ Deduplicated ${deduplicatedCount} duplicates within scrape`);
  }

  const propsToProcess = Array.from(uniqueProperties.values());

  // Spracuj v dávkach
  const batches = Math.ceil(propsToProcess.length / batchSize);
  
  for (let i = 0; i < batches; i++) {
    const start = i * batchSize;
    const end = Math.min(start + batchSize, propsToProcess.length);
    const batch = propsToProcess.slice(start, end);
    
    console.log(`   Processing batch ${i + 1}/${batches} (${batch.length} items)...`);
    
    // Spracuj dávku sekvenčne (pre stabilitu)
    for (const prop of batch) {
      const result = await saveProperty(prop, stats);
      
      switch (result) {
        case "new":
          stats.savedNew++;
          break;
        case "updated":
          stats.savedUpdated++;
          break;
        case "relisted":
          stats.savedRelisted++;
          break;
        case "duplicate":
          stats.skippedDuplicate++;
          break;
        case "INVALID_PRICE":
          stats.skippedInvalidPrice++;
          break;
        case "INVALID_AREA":
          stats.skippedInvalidArea++;
          break;
        case "MISSING_CITY":
          stats.skippedMissingCity++;
          break;
        case "MISSING_TITLE":
        case "VALIDATION_ERROR":
          stats.skippedValidation++;
          break;
        case "BLOCKED_CONTENT":
          stats.skippedBlocked++;
          break;
        case "DATABASE_ERROR":
        case "SLUG_CONFLICT":
          stats.skippedDbError++;
          break;
      }
    }
    
    // Pauza medzi dávkami
    if (i < batches - 1 && delayBetweenBatches > 0) {
      await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
    }
  }

  const duration = Date.now() - startTime;

  // Aktualizuj ScraperRun
  const status = stats.savedNew > 0 || stats.savedUpdated > 0 
    ? (stats.errors.length > 0 ? "partial" : "success")
    : (stats.errors.length > 0 ? "failed" : "success");

  await prisma.scraperRun.update({
    where: { id: run.id },
    data: {
      finishedAt: new Date(),
      durationMs: duration,
      savedNew: stats.savedNew,
      savedUpdated: stats.savedUpdated,
      savedRelisted: stats.savedRelisted,
      skippedDuplicate: stats.skippedDuplicate,
      skippedInvalidPrice: stats.skippedInvalidPrice,
      skippedInvalidArea: stats.skippedInvalidArea,
      skippedMissingCity: stats.skippedMissingCity,
      skippedBlocked: stats.skippedBlocked,
      skippedValidation: stats.skippedValidation,
      skippedDbError: stats.skippedDbError,
      errors: stats.errors.length > 0 
        ? JSON.stringify(stats.errors.slice(0, 50)) // Max 50 chýb
        : null,
      status,
    },
  });

  // Log výsledky
  console.log(`\n✅ Ingestion Complete`);
  console.log(`   Duration: ${Math.round(duration / 1000)}s`);
  console.log(`   ────────────────────────────`);
  console.log(`   📥 Found:           ${stats.found}`);
  console.log(`   ✨ New:             ${stats.savedNew}`);
  console.log(`   🔄 Updated:         ${stats.savedUpdated}`);
  console.log(`   🔙 Re-listed:       ${stats.savedRelisted}`);
  console.log(`   ────────────────────────────`);
  console.log(`   ⏭️  Duplicate:       ${stats.skippedDuplicate}`);
  console.log(`   💰 Invalid Price:   ${stats.skippedInvalidPrice}`);
  console.log(`   📐 Invalid Area:    ${stats.skippedInvalidArea}`);
  console.log(`   🏙️  Missing City:    ${stats.skippedMissingCity}`);
  console.log(`   ⚠️  Validation:      ${stats.skippedValidation}`);
  console.log(`   🛑 DB Error:        ${stats.skippedDbError}`);
  console.log(`   ────────────────────────────`);
  console.log(`   Status: ${status.toUpperCase()}`);

  // Log prvých 5 chýb pre debugging
  if (stats.errors.length > 0) {
    console.log(`\n   ❌ Sample errors (${Math.min(5, stats.errors.length)} of ${stats.errors.length}):`);
    for (const error of stats.errors.slice(0, 5)) {
      console.log(`      - [${error.reason}] ${error.externalId}: ${error.message.substring(0, 80)}`);
    }
  }

  return { runId: run.id, stats };
}

/**
 * Získa posledné behy scrapera pre admin panel
 */
export async function getRecentScraperRuns(limit = 20) {
  return prisma.scraperRun.findMany({
    orderBy: { startedAt: "desc" },
    take: limit,
  });
}

/**
 * Získa štatistiky ingestion za posledných N dní
 */
export async function getIngestionStats(days = 7) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const runs = await prisma.scraperRun.findMany({
    where: { startedAt: { gte: since } },
    orderBy: { startedAt: "desc" },
  });

  const totals = runs.reduce((acc, run) => ({
    found: acc.found + run.foundCount,
    savedNew: acc.savedNew + run.savedNew,
    savedUpdated: acc.savedUpdated + run.savedUpdated,
    skippedDuplicate: acc.skippedDuplicate + run.skippedDuplicate,
    skippedInvalidPrice: acc.skippedInvalidPrice + run.skippedInvalidPrice,
    skippedInvalidArea: acc.skippedInvalidArea + run.skippedInvalidArea,
    skippedMissingCity: acc.skippedMissingCity + run.skippedMissingCity,
    skippedValidation: acc.skippedValidation + run.skippedValidation,
    skippedDbError: acc.skippedDbError + run.skippedDbError,
  }), {
    found: 0,
    savedNew: 0,
    savedUpdated: 0,
    skippedDuplicate: 0,
    skippedInvalidPrice: 0,
    skippedInvalidArea: 0,
    skippedMissingCity: 0,
    skippedValidation: 0,
    skippedDbError: 0,
  });

  return {
    runs: runs.length,
    days,
    totals,
    successRate: totals.found > 0 
      ? Math.round((totals.savedNew + totals.savedUpdated) / totals.found * 100)
      : 0,
  };
}
