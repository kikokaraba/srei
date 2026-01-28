/**
 * Telegram Hunter Alerts
 *
 * Okamžité notifikácie pri zverejnení / aktualizácii inzerátu, ktorý spĺňa
 * Hunter preferencie používateľa (mesto, minYield, minPriceDrop, minGapPercentage, onlyDistressed).
 *
 * PRO používatelia dostávajú alerty okamžite. FREE používatelia ich budú dostávať
 * so 60-minútovým oneskorením (implementácia v batch cron – neskôr).
 */

import { prisma } from "@/lib/prisma";
import { sendMessage } from "./bot";
import { REGIONS, DISTRICTS } from "@/lib/constants/slovakia-locations";
import type { TelegramInlineKeyboard } from "./types";

const SITE_URL = process.env.NEXTAUTH_URL || "https://sria.sk";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface HunterAlertPayload {
  propertyId: string;
  title: string;
  city: string;
  district: string | null;
  rooms: number | null;
  price: number;
  pricePerM2: number;
  yieldPercent: number | null;
  gapPercent: number | null;
  priceDropPercent: number | null;
  oldPrice: number | null;
  investmentSummary: string | null;
  sellerPhone: string | null;
  sourceUrl: string | null;
}

interface HunterUserPrefs {
  userId: string;
  telegramChatId: string;
  trackedRegions: string[];
  trackedDistricts: string[];
  trackedCities: string[];
  minYield: number | null;
  minGrossYield: number | null;
  minPriceDrop: number | null;
  minGapPercentage: number | null;
  onlyDistressed: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function safeParseArray(v: string | null | undefined): string[] {
  if (!v) return [];
  try {
    const p = JSON.parse(v);
    return Array.isArray(p) ? p : [];
  } catch {
    return [];
  }
}

function expandTrackedCities(prefs: HunterUserPrefs): Set<string> {
  const cities = new Set<string>();
  for (const rid of prefs.trackedRegions) {
    const r = REGIONS[rid];
    if (!r) continue;
    for (const did of r.districts) {
      const d = DISTRICTS[did];
      if (d?.cities) d.cities.forEach((c) => cities.add(c));
    }
  }
  for (const did of prefs.trackedDistricts) {
    const d = DISTRICTS[did];
    if (d?.cities) d.cities.forEach((c) => cities.add(c));
  }
  prefs.trackedCities.forEach((c) => cities.add(c));
  return cities;
}

function cityMatches(propertyCity: string, prefs: HunterUserPrefs): boolean {
  const tracked = expandTrackedCities(prefs);
  if (tracked.size === 0) return true;
  const normalized = propertyCity.trim();
  return tracked.has(normalized) || Array.from(tracked).some((c) => c.includes(normalized) || normalized.includes(c));
}

function matchesHunterFilter(
  payload: HunterAlertPayload,
  prefs: HunterUserPrefs,
  isDistressed: boolean
): boolean {
  if (!cityMatches(payload.city, prefs)) return false;
  if (prefs.onlyDistressed && !isDistressed) return false;

  const minY = prefs.minYield ?? prefs.minGrossYield;
  if (minY != null && minY > 0) {
    const y = payload.yieldPercent;
    if (y == null || y < minY) return false;
  }

  if (prefs.minPriceDrop != null && prefs.minPriceDrop > 0) {
    const drop = payload.priceDropPercent;
    if (drop == null || drop < prefs.minPriceDrop) return false;
  }

  if (prefs.minGapPercentage != null && prefs.minGapPercentage > 0) {
    const gap = payload.gapPercent;
    if (gap == null || gap < prefs.minGapPercentage) return false;
  }

  return true;
}

// ---------------------------------------------------------------------------
// Message formatting & send
// ---------------------------------------------------------------------------

function formatPrice(n: number): string {
  return new Intl.NumberFormat("sk-SK", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
}

export function buildHunterAlertMessage(
  p: HunterAlertPayload
): { text: string; reply_markup: { inline_keyboard: TelegramInlineKeyboard[][] } } {
  const rooms = p.rooms != null ? `${p.rooms} izieb` : "—";
  let text = `🚨 <b>HUNTER ALERT!</b> ${p.city} – ${rooms}\n\n`;
  text += `💰 <b>Cena:</b> ${formatPrice(p.price)} (${formatPrice(p.pricePerM2)}/m²)\n`;
  text += `📈 <b>Výnos:</b> ${p.yieldPercent != null ? `${p.yieldPercent.toFixed(1)}%` : "—"} | <b>Podhodnotenie:</b> ${p.gapPercent != null ? `${p.gapPercent.toFixed(1)}%` : "—"}\n`;
  if (p.priceDropPercent != null && p.oldPrice != null) {
    text += `📉 <b>Zľava:</b> ${p.priceDropPercent.toFixed(1)}% (pôvodne ${formatPrice(p.oldPrice)})\n`;
  }
  if (p.investmentSummary) {
    text += `\n🤖 <b>AI Verdikt:</b> ${p.investmentSummary}\n`;
  }
  if (p.sellerPhone) {
    const tel = p.sellerPhone.replace(/\s/g, "");
    const display = tel.startsWith("+") ? tel : `+421 ${tel.replace(/^0/, "")}`;
    text += `\n📞 <b>Volať majiteľa:</b> <code>${display}</code>\n`;
  }

  const row: TelegramInlineKeyboard[] = [];
  if (p.sourceUrl) {
    row.push({ text: "🌐 Otvoriť inzerát", url: p.sourceUrl });
  }
  const siteUrl = `${SITE_URL}/dashboard/property/${p.propertyId}`;
  row.push({ text: "📱 SRIA", url: siteUrl });

  return {
    text,
    reply_markup: { inline_keyboard: row.length > 0 ? [row] : [] },
  };
}

export async function sendHunterAlert(chatId: string, payload: HunterAlertPayload): Promise<boolean> {
  if (!process.env.TELEGRAM_BOT_TOKEN) return false;
  const { text, reply_markup } = buildHunterAlertMessage(payload);
  return sendMessage(chatId, text, {
    parse_mode: "HTML",
    reply_markup: reply_markup.inline_keyboard.length > 0 ? reply_markup : undefined,
  });
}

// ---------------------------------------------------------------------------
// Fetch users & run alerts
// ---------------------------------------------------------------------------

async function getHunterUsers(): Promise<{ chatId: string; prefs: HunterUserPrefs }[]> {
  const rows = await prisma.userPreferences.findMany({
    where: {
      telegramEnabled: true,
      telegramChatId: { not: null },
    },
    select: {
      userId: true,
      telegramChatId: true,
      trackedRegions: true,
      trackedDistricts: true,
      trackedCities: true,
      minYield: true,
      minGrossYield: true,
      minPriceDrop: true,
      minGapPercentage: true,
      onlyDistressed: true,
    },
  });

  const out: { chatId: string; prefs: HunterUserPrefs }[] = [];
  for (const r of rows) {
    if (!r.telegramChatId) continue;
    out.push({
      chatId: r.telegramChatId,
      prefs: {
        userId: r.userId,
        telegramChatId: r.telegramChatId,
        trackedRegions: safeParseArray(r.trackedRegions),
        trackedDistricts: safeParseArray(r.trackedDistricts),
        trackedCities: safeParseArray(r.trackedCities),
        minYield: r.minYield,
        minGrossYield: r.minGrossYield,
        minPriceDrop: r.minPriceDrop,
        minGapPercentage: r.minGapPercentage,
        onlyDistressed: r.onlyDistressed ?? false,
      },
    });
  }
  return out;
}

async function fetchPayload(propertyId: string): Promise<{
  payload: HunterAlertPayload;
  isDistressed: boolean;
} | null> {
  const prop = await prisma.property.findUnique({
    where: { id: propertyId },
    include: {
      investmentMetrics: true,
      marketGaps: { orderBy: { detected_at: "desc" }, take: 1 },
      priceHistory: { orderBy: { recorded_at: "desc" }, take: 2 },
    },
  });
  if (!prop) return null;

  const yieldVal = prop.investmentMetrics?.gross_yield ?? null;
  const gap = prop.marketGaps[0]?.gap_percentage ?? null;
  let priceDrop: number | null = null;
  let oldPrice: number | null = null;
  const ph = prop.priceHistory;
  if (ph.length >= 2 && ph[0].price > 0) {
    const prev = ph[1];
    const curr = ph[0];
    if (prev.price > curr.price) {
      priceDrop = ((prev.price - curr.price) / prev.price) * 100;
      oldPrice = prev.price;
    }
  }

  const payload: HunterAlertPayload = {
    propertyId: prop.id,
    title: prop.title,
    city: prop.city,
    district: prop.district || null,
    rooms: prop.rooms,
    price: prop.price,
    pricePerM2: prop.price_per_m2,
    yieldPercent: yieldVal,
    gapPercent: gap,
    priceDropPercent: priceDrop,
    oldPrice,
    investmentSummary: prop.investmentSummary,
    sellerPhone: prop.seller_phone,
    sourceUrl: prop.source_url,
  };

  return { payload, isDistressed: prop.is_distressed };
}

/**
 * Pre danú nehnuteľnosť odošle Hunter alerty všetkým používateľom, ktorých
 * preferencie zhodu. Chyba pri odoslaní jednému nepreruší spracovanie ostatných.
 */
export async function runHunterAlertsForProperty(propertyId: string): Promise<number> {
  const data = await fetchPayload(propertyId);
  if (!data) return 0;

  const users = await getHunterUsers();
  if (users.length === 0) return 0;

  let sent = 0;
  for (const { chatId, prefs } of users) {
    if (!matchesHunterFilter(data.payload, prefs, data.isDistressed)) continue;
    try {
      const ok = await sendHunterAlert(chatId, data.payload);
      if (ok) sent++;
    } catch (e) {
      console.warn("[Hunter] sendHunterAlert failed for chatId:", chatId, e);
    }
  }
  return sent;
}
