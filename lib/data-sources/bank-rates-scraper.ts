/**
 * Bank Interest Rates Scraper
 * Sťahuje aktuálne úrokové sadzby hypoték z webov slovenských bánk.
 * Používa cheerio na parsovanie HTML.
 */

import * as cheerio from "cheerio";
import { prisma } from "@/lib/prisma";

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 SRIA/1.0";

export interface ScrapedBankRate {
  productType: string;
  ratePercent: number;
}

export interface BankRateScraperConfig {
  bankName: string;
  bankSlug: string;
  url: string;
  /** Parser vráti pole sadzieb z načítaného HTML */
  parse: ($: cheerio.CheerioAPI, html: string) => ScrapedBankRate[];
}

/** Normalizuje typ produktu na jednotný formát */
export const PRODUCT_TYPES = [
  "MORTGAGE_1Y",
  "MORTGAGE_3Y",
  "MORTGAGE_4Y",
  "MORTGAGE_5Y",
  "MORTGAGE_10Y",
] as const;

function parseRateText(text: string): number | null {
  const normalized = text.replace(/,/g, ".").replace(/\s/g, "");
  const match = normalized.match(/(\d+[.,]?\d*)\s*%?/);
  if (!match) return null;
  const value = parseFloat(match[1].replace(",", "."));
  return Number.isFinite(value) && value > 0 && value < 30 ? value : null;
}

/** VÚB – úrokové sadzby pre hypotekárne a spotrebné financovanie */
function parseVUB($: cheerio.CheerioAPI): ScrapedBankRate[] {
  const result: ScrapedBankRate[] = [];
  const mapping: { pattern: RegExp; product: (typeof PRODUCT_TYPES)[number] }[] = [
    { pattern: /1\s*rok|1\s*ročn|1\s*Y|1Y/i, product: "MORTGAGE_1Y" },
    { pattern: /3\s*roky|3\s*ročn|3\s*Y|3Y/i, product: "MORTGAGE_3Y" },
    { pattern: /4\s*roky|4\s*ročn|4\s*Y|4Y/i, product: "MORTGAGE_4Y" },
    { pattern: /5\s*rokov|5\s*ročn|5\s*Y|5Y/i, product: "MORTGAGE_5Y" },
    { pattern: /10\s*rokov|10\s*ročn|10\s*Y|10Y/i, product: "MORTGAGE_10Y" },
  ];

  $("table tbody tr, .table tr, [class*='rate']").each((_, row) => {
    const cells = $(row).find("td, th");
    const rowText = $(row).text();
    for (const { pattern, product } of mapping) {
      if (!pattern.test(rowText)) continue;
      for (let i = 0; i < cells.length; i++) {
        const rate = parseRateText($(cells[i]).text());
        if (rate != null) {
          result.push({ productType: product, ratePercent: rate });
          break;
        }
      }
    }
  });

  // Fallback: hľadaj ľubovoľné percentá v blízkosti slov "hypotek" / "fixácia"
  if (result.length === 0) {
    $("p, li, td, div").each((_, el) => {
      const text = $(el).text();
      if (!/hypotek|fixác|úrok/i.test(text)) return;
      mapping.forEach(({ pattern, product }) => {
        if (!pattern.test(text)) return;
        const rate = parseRateText(text);
        if (rate != null && !result.some((r) => r.productType === product))
          result.push({ productType: product, ratePercent: rate });
      });
    });
  }
  return result;
}

/** Slovenská sporiteľňa – hypotekárne úvery */
function parseSLSP($: cheerio.CheerioAPI): ScrapedBankRate[] {
  const result: ScrapedBankRate[] = [];
  const mapping: { pattern: RegExp; product: (typeof PRODUCT_TYPES)[number] }[] = [
    { pattern: /1\s*rok|1\s*ročn|1\s*Y/i, product: "MORTGAGE_1Y" },
    { pattern: /3\s*roky|3\s*ročn|3\s*Y/i, product: "MORTGAGE_3Y" },
    { pattern: /5\s*rokov|5\s*ročn|5\s*Y/i, product: "MORTGAGE_5Y" },
    { pattern: /10\s*rokov|10\s*ročn|10\s*Y/i, product: "MORTGAGE_10Y" },
  ];
  $("table tr, .interest-rate, [data-product]").each((_, row) => {
    const text = $(row).text();
    mapping.forEach(({ pattern, product }) => {
      if (!pattern.test(text)) return;
      const rate = parseRateText(text);
      if (rate != null && !result.some((r) => r.productType === product))
        result.push({ productType: product, ratePercent: rate });
    });
  });
  return result;
}

/** Tatra banka – hypotéky */
function parseTatra($: cheerio.CheerioAPI): ScrapedBankRate[] {
  const result: ScrapedBankRate[] = [];
  const mapping: { pattern: RegExp; product: (typeof PRODUCT_TYPES)[number] }[] = [
    { pattern: /1\s*rok|1\s*ročn|1\s*Y/i, product: "MORTGAGE_1Y" },
    { pattern: /3\s*roky|3\s*ročn|3\s*Y/i, product: "MORTGAGE_3Y" },
    { pattern: /5\s*rokov|5\s*ročn|5\s*Y/i, product: "MORTGAGE_5Y" },
    { pattern: /10\s*rokov|10\s*ročn|10\s*Y/i, product: "MORTGAGE_10Y" },
  ];
  $("table tr, .rate, [class*='mortgage']").each((_, row) => {
    const text = $(row).text();
    mapping.forEach(({ pattern, product }) => {
      if (!pattern.test(text)) return;
      const rate = parseRateText(text);
      if (rate != null && !result.some((r) => r.productType === product))
        result.push({ productType: product, ratePercent: rate });
    });
  });
  return result;
}

/** ČSOB – hypotéky (generický parser) */
function parseCSOB($: cheerio.CheerioAPI): ScrapedBankRate[] {
  return parseGenericMortgageTable($);
}

/** Prima banka, mBank, 365 – spoločný generický parser */
function parseGenericMortgageTable($: cheerio.CheerioAPI): ScrapedBankRate[] {
  const result: ScrapedBankRate[] = [];
  const mapping: { pattern: RegExp; product: (typeof PRODUCT_TYPES)[number] }[] = [
    { pattern: /1\s*rok|1\s*ročn|1\s*Y/i, product: "MORTGAGE_1Y" },
    { pattern: /3\s*roky|3\s*ročn|3\s*Y/i, product: "MORTGAGE_3Y" },
    { pattern: /4\s*roky|4\s*ročn|4\s*Y/i, product: "MORTGAGE_4Y" },
    { pattern: /5\s*rokov|5\s*ročn|5\s*Y/i, product: "MORTGAGE_5Y" },
    { pattern: /10\s*rokov|10\s*ročn|10\s*Y/i, product: "MORTGAGE_10Y" },
  ];
  $("table tbody tr, table tr").each((_, row) => {
    const cells = $(row).find("td");
    const fullText = $(row).text();
    mapping.forEach(({ pattern, product }) => {
      if (!pattern.test(fullText)) return;
      for (let i = 0; i < cells.length; i++) {
        const rate = parseRateText($(cells[i]).text());
        if (rate != null) {
          if (!result.some((r) => r.productType === product))
            result.push({ productType: product, ratePercent: rate });
          break;
        }
      }
    });
  });
  return result;
}

const BANK_CONFIGS: BankRateScraperConfig[] = [
  {
    bankName: "VÚB banka",
    bankSlug: "vub",
    url: "https://www.vub.sk/sk/ludia/informacny-servis/urokove-sadzby/urokove-sadzby-pre-hypotekarne-a-spotrebne-financovanie.html",
    parse: ($) => parseVUB($),
  },
  {
    bankName: "Slovenská sporiteľňa",
    bankSlug: "slsp",
    url: "https://www.slsp.sk/sk/urokove-sadzby",
    parse: ($) => parseSLSP($),
  },
  {
    bankName: "Tatra banka",
    bankSlug: "tatra",
    url: "https://www.tatrabanka.sk/sk/hypoteky/urokove-sadzby.html",
    parse: ($) => parseTatra($),
  },
  {
    bankName: "ČSOB",
    bankSlug: "csob",
    url: "https://www.csob.sk/sk/ludia/hypoteky/urokove-sadzby",
    parse: ($) => parseCSOB($),
  },
  {
    bankName: "Prima banka",
    bankSlug: "prima",
    url: "https://www.primabanka.sk/sk/hypoteky/urokove-sadzby",
    parse: ($) => parseGenericMortgageTable($),
  },
  {
    bankName: "mBank",
    bankSlug: "mbank",
    url: "https://www.mbank.sk/sk/individualne/hypoteky/",
    parse: ($) => parseGenericMortgageTable($),
  },
  {
    bankName: "UniCredit Bank",
    bankSlug: "unicredit",
    url: "https://www.unicreditbank.sk/sk/individuální-zákazníci/hypoteky/urokove-sadzby.html",
    parse: ($) => parseGenericMortgageTable($),
  },
];

async function fetchHtml(url: string): Promise<string | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "sk-SK,sk;q=0.9,en;q=0.8",
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    return await res.text();
  } catch {
    clearTimeout(timeout);
    return null;
  }
}

export interface ScrapeBankRatesResult {
  success: boolean;
  banksScraped: number;
  banksFailed: string[];
  totalRates: number;
  errors: string[];
  durationMs: number;
}

/**
 * Scrapuje úrokové sadzby zo všetkých nakonfigurovaných bánk a uloží ich do DB.
 * Pre každú banku zachová len najnovší beh (staršie záznamy môžu ostať pre históriu).
 */
export async function scrapeAllBankRates(): Promise<ScrapeBankRatesResult> {
  const start = Date.now();
  const errors: string[] = [];
  const banksFailed: string[] = [];
  let totalRates = 0;

  for (const config of BANK_CONFIGS) {
    try {
      const html = await fetchHtml(config.url);
      if (!html) {
        errors.push(`${config.bankName}: Nepodarilo sa stiahnuť stránku`);
        banksFailed.push(config.bankSlug);
        continue;
      }
      const $ = cheerio.load(html);
      const rates = config.parse($, html);

      if (rates.length === 0) {
        errors.push(`${config.bankName}: Parser nenašiel žiadne sadzby (možná zmena HTML)`);
        banksFailed.push(config.bankSlug);
        continue;
      }

      for (const r of rates) {
        if (!PRODUCT_TYPES.includes(r.productType as (typeof PRODUCT_TYPES)[number])) continue;
        await prisma.bankInterestRate.upsert({
          where: {
            bankSlug_productType: {
              bankSlug: config.bankSlug,
              productType: r.productType,
            },
          },
          create: {
            bankName: config.bankName,
            bankSlug: config.bankSlug,
            productType: r.productType,
            ratePercent: r.ratePercent,
            sourceUrl: config.url,
          },
          update: {
            bankName: config.bankName,
            ratePercent: r.ratePercent,
            sourceUrl: config.url,
            scrapedAt: new Date(),
          },
        });
        totalRates++;
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`${config.bankName}: ${msg}`);
      banksFailed.push(config.bankSlug);
    }
  }

  await prisma.dataFetchLog.create({
    data: {
      source: "bank-rates-scraper",
      status: banksFailed.length === 0 ? "success" : banksFailed.length < BANK_CONFIGS.length ? "partial" : "error",
      recordsCount: totalRates,
      error: errors.length > 0 ? errors.join("; ") : null,
      duration_ms: Date.now() - start,
    },
  });

  return {
    success: banksFailed.length < BANK_CONFIGS.length,
    banksScraped: BANK_CONFIGS.length - banksFailed.length,
    banksFailed,
    totalRates,
    errors,
    durationMs: Date.now() - start,
  };
}

/**
 * Vráti aktuálne úrokové sadzby z DB (naposledy scrapované).
 * Zoskupené po bankách, s priemerom pre 5Y fixáciu.
 */
export async function getLatestBankRates(): Promise<{
  byBank: { bankName: string; bankSlug: string; rates: { productType: string; ratePercent: number }[] }[];
  avg5Y: number | null;
  scrapedAt: Date | null;
}> {
  const rows = await prisma.bankInterestRate.findMany({
    orderBy: { scrapedAt: "desc" },
  });

  const bySlug = new Map<
    string,
    { bankName: string; bankSlug: string; rates: { productType: string; ratePercent: number }[] }
  >();
  let latestScrapedAt: Date | null = null;
  const rates5Y: number[] = [];

  for (const r of rows) {
    if (!latestScrapedAt || r.scrapedAt > latestScrapedAt) latestScrapedAt = r.scrapedAt;
    if (r.productType === "MORTGAGE_5Y") rates5Y.push(r.ratePercent);
    let entry = bySlug.get(r.bankSlug);
    if (!entry) {
      entry = { bankName: r.bankName, bankSlug: r.bankSlug, rates: [] };
      bySlug.set(r.bankSlug, entry);
    }
    entry.rates.push({ productType: r.productType, ratePercent: r.ratePercent });
  }

  const byBank = Array.from(bySlug.values());
  const avg5Y = rates5Y.length > 0 ? rates5Y.reduce((a, b) => a + b, 0) / rates5Y.length : null;

  return { byBank, avg5Y, scrapedAt: latestScrapedAt };
}
