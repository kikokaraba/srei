/**
 * AI Alerts - Proaktívne notifikácie (Price Drop, Better Match)
 * Vytvára AIAlert záznamy a odosiela Telegram notifikácie
 */

import { prisma } from "@/lib/prisma";
import { sendMessage } from "@/lib/telegram/bot";
import { REGIONS, DISTRICTS } from "@/lib/constants/slovakia-locations";

const SITE_URL = process.env.NEXTAUTH_URL || "https://sria.sk";

function safeParseArray(v: string | null | undefined): string[] {
  if (!v) return [];
  try {
    const p = JSON.parse(v);
    return Array.isArray(p) ? p : [];
  } catch {
    return [];
  }
}

function formatPrice(n: number): string {
  return new Intl.NumberFormat("sk-SK", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n);
}

export interface PriceDropInfo {
  propertyId: string;
  oldPrice: number;
  newPrice: number;
  percentChange: number;
}

/**
 * Vytvor Price Drop alerty pre danú nehnuteľnosť (volá sa z batch-refresh pri zmene ceny)
 */
export async function createPriceDropAlertsForProperty(
  propertyId: string,
  oldPrice: number,
  newPrice: number
): Promise<number> {
  if (newPrice >= oldPrice) return 0;
  const percentChange = ((oldPrice - newPrice) / oldPrice) * 100;
  const drop: PriceDropInfo = { propertyId, oldPrice, newPrice, percentChange };
  const saved = await prisma.savedProperty.findMany({
    where: {
      propertyId: drop.propertyId,
      alertOnChange: true,
    },
    include: {
      user: { include: { preferences: true } },
      property: true,
    },
  });

  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  let created = 0;

  for (const s of saved) {
    const existing = await prisma.aIAlert.findFirst({
      where: {
        userId: s.userId,
        propertyId: drop.propertyId,
        type: "PRICE_DROP",
        createdAt: { gte: since24h },
      },
    });
    if (existing) continue;

    const metadata = JSON.stringify({
      oldPrice: drop.oldPrice,
      newPrice: drop.newPrice,
      percentChange: drop.percentChange,
    });

    await prisma.aIAlert.create({
      data: {
        userId: s.userId,
        type: "PRICE_DROP",
        propertyId: drop.propertyId,
        metadata,
      },
    });
    created++;

    if (s.user.preferences?.telegramEnabled && s.user.preferences?.telegramChatId) {
      const text = `📉 <b>Price Drop!</b> ${s.property.title}\n\n` +
        `💰 <b>Pôvodne:</b> ${formatPrice(drop.oldPrice)}\n` +
        `✅ <b>Teraz:</b> ${formatPrice(drop.newPrice)} (-${drop.percentChange.toFixed(1)}%)\n\n` +
        `<a href="${SITE_URL}/dashboard/property/${drop.propertyId}">Zobraziť v SRIA</a>`;
      await sendMessage(s.user.preferences.telegramChatId, text, { parse_mode: "HTML" });
    }
  }

  return created;
}

/**
 * Better Match: pre používateľov s onboardingCompleted nájdi nové nehnuteľnosti lepšie ako uložené
 */
async function expandTrackedCities(prefs: {
  trackedRegions: string | null;
  trackedDistricts: string | null;
  trackedCities: string | null;
}): Promise<string[]> {
  const cities = new Set<string>();
  const regions = safeParseArray(prefs.trackedRegions);
  const districts = safeParseArray(prefs.trackedDistricts);
  const trackedCities = safeParseArray(prefs.trackedCities);

  for (const rid of regions) {
    const r = REGIONS[rid as keyof typeof REGIONS];
    if (!r) continue;
    for (const did of r.districts) {
      const d = DISTRICTS[did as keyof typeof DISTRICTS];
      if (d?.cities) d.cities.forEach((c: string) => cities.add(c));
    }
  }
  for (const did of districts) {
    const d = DISTRICTS[did as keyof typeof DISTRICTS];
    if (d?.cities) d.cities.forEach((c: string) => cities.add(c));
  }
  trackedCities.forEach((c: string) => cities.add(c));
  return Array.from(cities);
}

function calculateInvestmentScore(p: {
  is_distressed: boolean;
  investmentMetrics: { gross_yield: number } | null;
  condition: string;
  price_per_m2: number;
  city: string;
  days_on_market: number;
}): number {
  let score = 0;
  if (p.is_distressed) score += 25;
  if (p.investmentMetrics) {
    const y = p.investmentMetrics.gross_yield;
    if (y >= 6) score += 30;
    else if (y >= 4) score += 15;
  }
  if (p.condition === "NOVOSTAVBA") score += 10;
  else if (p.condition === "REKONSTRUKCIA") score += 5;
  if (p.price_per_m2 < 2500 && p.city === "BRATISLAVA") score += 15;
  else if (p.price_per_m2 < 1800 && p.city === "KOSICE") score += 15;
  if (p.days_on_market < 7) score += 10;
  return score;
}

/**
 * Pre každého usera s preferenciami: ak existuje nová nehnuteľnosť s vyšším skóre ako najlepšia uložená, vytvor BETTER_MATCH alert
 */
export async function createBetterMatchAlerts(): Promise<number> {
  const users = await prisma.user.findMany({
    where: { preferences: { onboardingCompleted: true } },
    include: {
      preferences: true,
      savedProperties: {
        where: { alertOnChange: true },
        include: {
          property: {
            include: { investmentMetrics: true },
          },
        },
      },
    },
  });

  let created = 0;

  for (const user of users) {
    const prefs = user.preferences;
    if (!prefs) continue;

    const savedIds = new Set(user.savedProperties.map((s) => s.propertyId));

    const savedWithScore = user.savedProperties.map((s) => ({
      id: s.propertyId,
      score: calculateInvestmentScore(s.property),
    }));
    const bestSavedScore = savedWithScore.length > 0
      ? Math.max(...savedWithScore.map((x) => x.score))
      : 0;

    const cities = await expandTrackedCities(prefs);
    const minPrice = prefs.minPrice ?? (prefs.budget ? prefs.budget * 0.5 : 50000);
    const maxPrice = prefs.maxPrice ?? prefs.budget ?? 500000;

    const where: Record<string, unknown> = {
      status: "ACTIVE",
      listing_type: "PREDAJ",
      property_type: "BYT",
      price: { gte: minPrice, lte: maxPrice },
      id: { notIn: Array.from(savedIds) },
    };

    if (cities.length > 0) {
      where.city = { in: cities };
    }

    const topNew = await prisma.property.findMany({
      where,
      include: { investmentMetrics: true },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    const scored = topNew.map((p) => ({
      ...p,
      score: calculateInvestmentScore(p),
    }));
    const bestNew = scored.find((p) => p.score > bestSavedScore);
    if (!bestNew) continue;

    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const existing = await prisma.aIAlert.findFirst({
      where: {
        userId: user.id,
        propertyId: bestNew.id,
        type: "BETTER_MATCH",
        createdAt: { gte: since24h },
      },
    });
    if (existing) continue;

    const metadata = JSON.stringify({
      investmentScore: bestNew.score,
      bestSavedScore,
      price: bestNew.price,
      city: bestNew.city,
      district: bestNew.district,
    });

    await prisma.aIAlert.create({
      data: {
        userId: user.id,
        type: "BETTER_MATCH",
        propertyId: bestNew.id,
        metadata,
      },
    });
    created++;

    if (prefs.telegramEnabled && prefs.telegramChatId) {
      const text = `⭐ <b>Lepší match!</b> ${bestNew.title}\n\n` +
        `💰 <b>Cena:</b> ${formatPrice(bestNew.price)} (€${bestNew.price_per_m2}/m²)\n` +
        `📍 ${bestNew.district}, ${bestNew.city}\n` +
        `📊 <b>AI Skóre:</b> ${bestNew.score}/100 (lepšie ako tvoje uložené)\n\n` +
        `<a href="${SITE_URL}/dashboard/property/${bestNew.id}">Zobraziť v SRIA</a>`;
      await sendMessage(prefs.telegramChatId, text, { parse_mode: "HTML" });
    }
  }

  return created;
}

export async function runAIAlerts(): Promise<{ betterMatch: number }> {
  const betterMatch = await createBetterMatchAlerts();
  return { betterMatch };
}
