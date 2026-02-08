/**
 * Apify Service - Profesionálny scraping s rezidenčnými proxy
 * 
 * Tento modul:
 * 1. Odosiela scraping úlohy do Apify
 * 2. Používa slovenské rezidenčné proxy
 * 3. Nastavuje webhooky pre automatické spracovanie výsledkov
 */

import { BAZOS_PAGE_FUNCTION } from "./nehnutelnosti-config";
import type { ScrapingTarget } from "./slovakia-scraper";

const APIFY_API_KEY = process.env.APIFY_API_KEY;
const APIFY_BASE_URL = "https://api.apify.com/v2";

// Webhook URL pre spracovanie výsledkov
const getWebhookUrl = () => {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "https://sria-two.vercel.app";
  return `${baseUrl}/api/webhooks/apify`;
};

/**
 * Typ pre Apify Run response
 */
interface ApifyRunResponse {
  data: {
    id: string;
    status: string;
    defaultDatasetId: string;
    startedAt: string;
  };
}

/**
 * Typ pre Apify Dataset item
 */
export interface ApifyScrapedItem {
  title?: string;
  price_raw?: string;
  area_m2?: string;
  rooms?: string;
  floor?: string;
  total_floors?: string;
  building_material?: string;
  condition?: string;
  elevator?: string;
  balcony?: boolean;
  parking?: string;
  heating?: string;
  year_built?: string;
  energy_certificate?: string;
  description?: string;
  images?: string[];
  location?: {
    full?: string;
    city?: string;
    district?: string;
    street?: string;
  };
  raw_address_context?: string | null;
  seller?: {
    name?: string;
    phone?: string;
    agency?: string;
  };
  url: string;
  portal: string;
  scraped_at: string;
}

/**
 * Získa Page Function podľa portálu
 */
function getPageFunction(portal: string): string {
  return portal === "bazos" ? BAZOS_PAGE_FUNCTION : BAZOS_PAGE_FUNCTION;
}

/**
 * Spustí Apify Playwright Scraper pre dané URL
 */
export async function runApifyScraper(
  urls: string[],
  portal: string,
  options: {
    useWebhook?: boolean;
    maxConcurrency?: number;
    maxRequestsPerCrawl?: number;
  } = {}
): Promise<ApifyRunResponse> {
  if (!APIFY_API_KEY) {
    throw new Error("APIFY_API_KEY is not configured");
  }

  const {
    useWebhook = true,
    maxConcurrency = 5,
    maxRequestsPerCrawl = 100,
  } = options;

  const actorId = "apify~playwright-scraper";
  const pageFunction = getPageFunction(portal);

  const input: Record<string, unknown> = {
    startUrls: urls.map(url => ({ url })),
    pageFunction,
    maxConcurrency,
    maxRequestsPerCrawl,
    proxyConfiguration: {
      useApifyProxy: true,
      apifyProxyGroups: ["RESIDENTIAL"],
      apifyProxyCountry: "SK", // Slovenské IP adresy
    },
    // Pre-navigation hooks pre stealth
    preNavigationHooks: `[
      async ({ page }) => {
        // Nastav slovenské locale
        await page.setExtraHTTPHeaders({
          'Accept-Language': 'sk-SK,sk;q=0.9,en;q=0.8'
        });
      }
    ]`,
    // Nastavenia browsera
    launchContext: {
      launchOptions: {
        args: [
          "--disable-blink-features=AutomationControlled",
          "--disable-dev-shm-usage",
        ],
      },
    },
  };

  // Pridaj webhook ak je povolený
  if (useWebhook) {
    input.webhooks = [
      {
        eventTypes: ["ACTOR.RUN.SUCCEEDED"],
        requestUrl: getWebhookUrl(),
        payloadTemplate: `{
          "resourceId": {{resource.id}},
          "datasetId": "{{resource.defaultDatasetId}}",
          "portal": "${portal}",
          "status": "{{resource.status}}"
        }`,
      },
    ];
  }

  console.log(`🚀 [Apify] Starting ${portal} scraper for ${urls.length} URLs`);
  console.log(`   Webhook: ${useWebhook ? getWebhookUrl() : "disabled"}`);

  const response = await fetch(
    `${APIFY_BASE_URL}/acts/${actorId}/runs?token=${APIFY_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Apify API error: ${response.status} - ${error}`);
  }

  const result = await response.json() as ApifyRunResponse;
  console.log(`✅ [Apify] Run started: ${result.data.id}`);

  return result;
}

/**
 * Spustí scraping pre celé Slovensko
 */
export async function triggerSlovakiaScraping(
  targets: ScrapingTarget[],
  options: {
    useWebhook?: boolean;
    portals?: string[];
  } = {}
): Promise<{
  runs: Array<{ portal: string; runId: string; urlCount: number }>;
  errors: string[];
}> {
  const { useWebhook = true, portals = ["bazos"] } = options;
  const runs: Array<{ portal: string; runId: string; urlCount: number }> = [];
  const errors: string[] = [];

  for (const portal of portals) {
    const portalTargets = targets.filter(t => t.portal === portal);
    const urls = portalTargets.map(t => t.url);

    if (urls.length === 0) {
      console.log(`⏭️ [Apify] No URLs for ${portal}, skipping`);
      continue;
    }

    try {
      const result = await runApifyScraper(urls, portal, { useWebhook });
      runs.push({
        portal,
        runId: result.data.id,
        urlCount: urls.length,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      errors.push(`${portal}: ${message}`);
      console.error(`❌ [Apify] Failed to start ${portal} scraper:`, message);
    }
  }

  return { runs, errors };
}

/**
 * Získa výsledky z Apify datasetu
 */
export async function getApifyDatasetItems(
  datasetId: string
): Promise<ApifyScrapedItem[]> {
  if (!APIFY_API_KEY) {
    throw new Error("APIFY_API_KEY is not configured");
  }

  const response = await fetch(
    `${APIFY_BASE_URL}/datasets/${datasetId}/items?token=${APIFY_API_KEY}`
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch dataset: ${response.status}`);
  }

  return response.json();
}

/**
 * Skontroluje stav Apify run
 */
export async function getApifyRunStatus(
  runId: string
): Promise<{ status: string; datasetId: string }> {
  if (!APIFY_API_KEY) {
    throw new Error("APIFY_API_KEY is not configured");
  }

  const response = await fetch(
    `${APIFY_BASE_URL}/actor-runs/${runId}?token=${APIFY_API_KEY}`
  );

  if (!response.ok) {
    throw new Error(`Failed to get run status: ${response.status}`);
  }

  const data = await response.json();
  return {
    status: data.data.status,
    datasetId: data.data.defaultDatasetId,
  };
}

/**
 * Čaká na dokončenie Apify run
 */
export async function waitForApifyRun(
  runId: string,
  options: {
    timeout?: number;
    pollInterval?: number;
  } = {}
): Promise<ApifyScrapedItem[]> {
  const { timeout = 600000, pollInterval = 10000 } = options; // 10 min timeout, 10s poll
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const { status, datasetId } = await getApifyRunStatus(runId);

    if (status === "SUCCEEDED") {
      return getApifyDatasetItems(datasetId);
    }

    if (status === "FAILED" || status === "ABORTED") {
      throw new Error(`Apify run ${runId} ${status}`);
    }

    console.log(`⏳ [Apify] Run ${runId} status: ${status}`);
    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }

  throw new Error(`Apify run ${runId} timeout after ${timeout}ms`);
}

// ============================================================================
// TOP REALITY ACTOR (appealing_jingle/top-reality-scraper)
// ============================================================================

/** Vstup pre Top Reality Scraper Actor podľa input schema */
export interface TopRealityInput {
  maxRequestsPerCrawl?: number;
  language?: "sk" | "cz" | "en" | "pl" | "hu";
  onlyPrivateListings?: boolean;
  type?: "all" | "sell" | "buy" | "rent" | "looking-for-rent" | "exchange" | "auction";
  kind?: {
    flats?: string[];
    houses?: string[];
    premises?: string[];
    objects?: string[];
    plots?: string[];
  };
  text?: string;
  priceFrom?: number;
  priceTo?: number;
  pricePerArea?: boolean;
  areaFrom?: number;
  areaTo?: number;
  newBuildings?: boolean;
  sort?: "price_asc" | "price_desc" | "price_m2_asc" | "price_m2_desc" | "date_desc" | "date_asc" | "id_desc" | "id_asc";
  village?: string[];
}

/** Položka z datasetu Top Reality Actora (flexibilná – Actor môže vracať ďalšie polia) */
export interface TopRealityDatasetItem {
  url?: string;
  title?: string;
  price?: number | string;
  area?: number | string;
  location?: string;
  city?: string;
  region?: string;
  description?: string;
  images?: string[] | { url?: string }[];
  [key: string]: unknown;
}

const TOP_REALITY_ACTOR_ID = "appealing_jingle~top-reality-scraper";

/**
 * Spustí Top Reality Scraper Actor a pripojí webhook na náš endpoint.
 * Výsledky prídu cez POST /api/webhooks/apify s portal: "topreality".
 */
export async function runTopRealityScraper(
  input: TopRealityInput,
  options: { useWebhook?: boolean } = {}
): Promise<ApifyRunResponse> {
  if (!APIFY_API_KEY) {
    throw new Error("APIFY_API_KEY is not configured");
  }

  const useWebhook = options.useWebhook !== false;

  const body: Record<string, unknown> = {
    maxRequestsPerCrawl: input.maxRequestsPerCrawl ?? 100,
    language: input.language ?? "sk",
    onlyPrivateListings: input.onlyPrivateListings ?? false,
    type: input.type ?? "sell",
    kind: input.kind ?? {
      flats: ["2 room flat", "3 room flat"],
      houses: [],
      premises: [],
      objects: [],
      plots: [],
    },
    text: input.text ?? "",
    priceFrom: input.priceFrom ?? 0,
    priceTo: input.priceTo ?? 0,
    pricePerArea: input.pricePerArea ?? false,
    areaFrom: input.areaFrom ?? 0,
    areaTo: input.areaTo ?? 0,
    newBuildings: input.newBuildings ?? false,
    sort: input.sort ?? "date_desc",
    village: input.village ?? ["Bratislava"],
  };

  if (useWebhook) {
    (body as Record<string, unknown>).webhooks = [
      {
        eventTypes: ["ACTOR.RUN.SUCCEEDED"],
        requestUrl: getWebhookUrl(),
        payloadTemplate: `{
          "resourceId": {{resource.id}},
          "datasetId": "{{resource.defaultDatasetId}}",
          "portal": "topreality",
          "status": "{{resource.status}}"
        }`,
      },
    ];
  }

  console.log(`🚀 [Apify] Starting Top Reality scraper (${TOP_REALITY_ACTOR_ID})`);
  console.log(`   Webhook: ${useWebhook ? getWebhookUrl() : "disabled"}`);

  const response = await fetch(
    `${APIFY_BASE_URL}/acts/${TOP_REALITY_ACTOR_ID}/runs?token=${APIFY_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Apify API error: ${response.status} - ${error}`);
  }

  const result = (await response.json()) as ApifyRunResponse;
  console.log(`✅ [Apify] Top Reality run started: ${result.data.id}`);
  return result;
}

/**
 * Získa položky z Apify datasetu ako surový pole (pre Top Reality alebo iné Actory s iným výstupom).
 */
export async function getApifyDatasetItemsRaw(datasetId: string): Promise<unknown[]> {
  if (!APIFY_API_KEY) {
    throw new Error("APIFY_API_KEY is not configured");
  }
  const response = await fetch(
    `${APIFY_BASE_URL}/datasets/${datasetId}/items?token=${APIFY_API_KEY}`
  );
  if (!response.ok) {
    throw new Error(`Failed to fetch dataset: ${response.status}`);
  }
  return response.json();
}
