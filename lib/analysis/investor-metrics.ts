/**
 * Investor Metrics
 * 
 * Pokročilé metriky pre profesionálnych investorov
 * - Price Momentum (trend cien v lokalite)
 * - Trust Score (dôveryhodnosť inzerátu)
 * - Negotiation Power (priestor na vyjednávanie)
 * - Red Flags (varovania)
 */

import { prisma } from "@/lib/prisma";
import type { SlovakCity, Property } from "@/generated/prisma/client";

// ============================================
// PRICE MOMENTUM
// Trend cien v mikro-lokalite za posledných 30/60/90 dní
// ============================================

export interface PriceMomentum {
  city: SlovakCity;
  district?: string;
  trend: "rising" | "stable" | "falling";
  changePercent7d: number;  // Zmena za 7 dní
  changePercent30d: number; // Zmena za 30 dní
  changePercent90d: number; // Zmena za 90 dní
  avgPricePerM2: number;
  signal: "buy" | "hold" | "negotiate"; // Investorský signál
  confidence: number; // 0-100
}

export async function calculatePriceMomentum(
  city: SlovakCity,
  district?: string
): Promise<PriceMomentum> {
  const now = new Date();
  const day7Ago = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const day30Ago = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const day90Ago = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  const where: Record<string, unknown> = { city };
  if (district) where.district = district;

  // Získaj priemerné ceny za rôzne obdobia
  const [current, week, month, quarter] = await Promise.all([
    prisma.property.aggregate({
      where: { ...where, createdAt: { gte: day7Ago } },
      _avg: { price_per_m2: true },
      _count: { id: true },
    }),
    prisma.property.aggregate({
      where: { ...where, createdAt: { gte: day7Ago, lt: now } },
      _avg: { price_per_m2: true },
    }),
    prisma.property.aggregate({
      where: { ...where, createdAt: { gte: day30Ago, lt: day7Ago } },
      _avg: { price_per_m2: true },
    }),
    prisma.property.aggregate({
      where: { ...where, createdAt: { gte: day90Ago, lt: day30Ago } },
      _avg: { price_per_m2: true },
    }),
  ]);

  const avgNow = current._avg.price_per_m2 || 0;
  const avgWeek = week._avg.price_per_m2 || avgNow;
  const avgMonth = month._avg.price_per_m2 || avgNow;
  const avgQuarter = quarter._avg.price_per_m2 || avgNow;

  const change7d = avgMonth > 0 ? ((avgNow - avgMonth) / avgMonth) * 100 : 0;
  const change30d = avgMonth > 0 ? ((avgNow - avgMonth) / avgMonth) * 100 : 0;
  const change90d = avgQuarter > 0 ? ((avgNow - avgQuarter) / avgQuarter) * 100 : 0;

  // Určenie trendu
  let trend: "rising" | "stable" | "falling";
  if (change30d > 2) trend = "rising";
  else if (change30d < -2) trend = "falling";
  else trend = "stable";

  // Investorský signál
  let signal: "buy" | "hold" | "negotiate";
  if (trend === "falling" && change30d < -5) {
    signal = "negotiate"; // Ceny padajú - vyjednávaj agresívne
  } else if (trend === "rising" && change30d > 5) {
    signal = "buy"; // Ceny rastú - kúp teraz alebo nikdy
  } else {
    signal = "hold"; // Stabilné - môžeš čakať
  }

  // Confidence based on sample size
  const sampleSize = current._count.id;
  const confidence = Math.min(100, Math.round((sampleSize / 50) * 100));

  return {
    city,
    district,
    trend,
    changePercent7d: Math.round(change7d * 10) / 10,
    changePercent30d: Math.round(change30d * 10) / 10,
    changePercent90d: Math.round(change90d * 10) / 10,
    avgPricePerM2: Math.round(avgNow),
    signal,
    confidence,
  };
}

// ============================================
// TRUST SCORE
// Dôveryhodnosť inzerátu (0-100)
// ============================================

export interface TrustScore {
  score: number; // 0-100
  level: "high" | "medium" | "low" | "suspicious";
  redFlags: RedFlag[];
  greenFlags: string[];
}

export interface RedFlag {
  type: string;
  severity: "warning" | "critical";
  message: string;
}

export async function calculateTrustScore(property: Property): Promise<TrustScore> {
  const redFlags: RedFlag[] = [];
  const greenFlags: string[] = [];
  let score = 100;

  // 1. Kontrola duplicít (rovnaká nehnuteľnosť na viacerých portáloch)
  const duplicates = await prisma.property.count({
    where: {
      city: property.city,
      area_m2: { gte: property.area_m2 - 5, lte: property.area_m2 + 5 },
      price: { gte: property.price * 0.9, lte: property.price * 1.1 },
      id: { not: property.id },
    },
  });

  if (duplicates >= 5) {
    redFlags.push({
      type: "multi-listing",
      severity: "warning",
      message: `Inzerovaný ${duplicates + 1}x rôznymi realitkami`,
    });
    score -= 15;
  } else if (duplicates >= 2) {
    redFlags.push({
      type: "duplicate",
      severity: "warning",
      message: `Nájdené ${duplicates} podobné inzeráty`,
    });
    score -= 5;
  }

  // 2. Kontrola ceny voči priemeru ulice/lokality
  const avgInArea = await prisma.property.aggregate({
    where: {
      city: property.city,
      district: property.district,
      listing_type: property.listing_type,
    },
    _avg: { price_per_m2: true },
  });

  const avgPriceM2 = avgInArea._avg.price_per_m2 || 0;
  const propertyPriceM2 = property.price_per_m2 || 0;

  if (avgPriceM2 > 0) {
    const priceDiff = ((propertyPriceM2 - avgPriceM2) / avgPriceM2) * 100;

    if (priceDiff < -30) {
      redFlags.push({
        type: "suspicious-price",
        severity: "critical",
        message: `Cena ${Math.abs(Math.round(priceDiff))}% pod priemerom lokality - možná vábnička`,
      });
      score -= 30;
    } else if (priceDiff < -15) {
      greenFlags.push(`${Math.abs(Math.round(priceDiff))}% pod priemerom - potenciálna príležitosť`);
    } else if (priceDiff > 20) {
      redFlags.push({
        type: "overpriced",
        severity: "warning",
        message: `Cena ${Math.round(priceDiff)}% nad priemerom lokality`,
      });
      score -= 10;
    }
  }

  // 3. Kontrola histórie cien (častý pokles = stres predajcu)
  const priceHistory = await prisma.priceHistory.findMany({
    where: { propertyId: property.id },
    orderBy: { recordedAt: "desc" },
    take: 10,
  });

  if (priceHistory.length >= 3) {
    const priceDrops = priceHistory.filter((h, i) => 
      i < priceHistory.length - 1 && h.price < priceHistory[i + 1].price
    ).length;

    if (priceDrops >= 3) {
      greenFlags.push(`${priceDrops}x zníženie ceny - silná vyjednávacia pozícia`);
    } else if (priceDrops >= 2) {
      greenFlags.push("Cena bola znížená - priestor na vyjednávanie");
    }
  }

  // 4. Doba na trhu
  const daysOnMarket = Math.floor(
    (Date.now() - property.createdAt.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysOnMarket > 180) {
    redFlags.push({
      type: "stale-listing",
      severity: "warning",
      message: `Na trhu ${daysOnMarket} dní - možné skryté problémy`,
    });
    score -= 10;
  } else if (daysOnMarket > 90) {
    greenFlags.push(`${daysOnMarket} dní na trhu - predajca môže byť flexibilný`);
  } else if (daysOnMarket < 7) {
    greenFlags.push("Čerstvý inzerát - konaj rýchlo");
  }

  // 5. Kontrola popisu (červené vlajky v texte)
  const description = (property.description || "").toLowerCase();
  
  const suspiciousWords = [
    { word: "exkluzívne", penalty: 5 },
    { word: "investičná príležitosť", penalty: 3 },
    { word: "pod cenu", penalty: 5 },
    { word: "rýchly predaj", penalty: 3 },
    { word: "nutný predaj", penalty: -5 }, // Naopak - dobrá príležitosť
  ];

  for (const { word, penalty } of suspiciousWords) {
    if (description.includes(word)) {
      if (penalty > 0) {
        score -= penalty;
      } else {
        greenFlags.push(`"${word}" - možná urgencia predajcu`);
      }
    }
  }

  // Určenie úrovne
  let level: "high" | "medium" | "low" | "suspicious";
  if (score >= 80) level = "high";
  else if (score >= 60) level = "medium";
  else if (score >= 40) level = "low";
  else level = "suspicious";

  return {
    score: Math.max(0, Math.min(100, score)),
    level,
    redFlags,
    greenFlags,
  };
}

// ============================================
// NEGOTIATION POWER
// Sila vyjednávacej pozície (0-100)
// ============================================

export interface NegotiationPower {
  score: number; // 0-100
  suggestedDiscount: number; // Navrhovaná zľava v %
  reasons: string[];
  strategy: string;
}

export async function calculateNegotiationPower(
  property: Property
): Promise<NegotiationPower> {
  const reasons: string[] = [];
  let score = 50; // Štart na neutrálnej pozícii
  let suggestedDiscount = 0;

  // 1. História cien
  const priceHistory = await prisma.priceHistory.findMany({
    where: { propertyId: property.id },
    orderBy: { recordedAt: "asc" },
  });

  if (priceHistory.length >= 2) {
    const firstPrice = priceHistory[0].price;
    const currentPrice = property.price;
    const totalDrop = ((firstPrice - currentPrice) / firstPrice) * 100;

    if (totalDrop > 10) {
      score += 20;
      suggestedDiscount += 5;
      reasons.push(`Cena klesla o ${Math.round(totalDrop)}% - predajca je pod tlakom`);
    }
  }

  // 2. Doba na trhu
  const daysOnMarket = Math.floor(
    (Date.now() - property.createdAt.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysOnMarket > 120) {
    score += 25;
    suggestedDiscount += 8;
    reasons.push(`${daysOnMarket} dní na trhu - vysoká pravdepodobnosť flexibility`);
  } else if (daysOnMarket > 60) {
    score += 15;
    suggestedDiscount += 5;
    reasons.push(`${daysOnMarket} dní na trhu - stredná flexibilita`);
  } else if (daysOnMarket < 14) {
    score -= 15;
    reasons.push("Čerstvý inzerát - predajca nemá dôvod zľavovať");
  }

  // 3. Konkurencia v lokalite
  const competitors = await prisma.property.count({
    where: {
      city: property.city,
      district: property.district,
      listing_type: property.listing_type,
      rooms: property.rooms,
      createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    },
  });

  if (competitors > 20) {
    score += 15;
    suggestedDiscount += 3;
    reasons.push(`${competitors} podobných nehnuteľností v lokalite - vysoká konkurencia`);
  }

  // 4. Market momentum
  const momentum = await calculatePriceMomentum(property.city, property.district || undefined);
  
  if (momentum.trend === "falling") {
    score += 15;
    suggestedDiscount += 5;
    reasons.push(`Ceny v lokalite klesajú (${momentum.changePercent30d}%) - využi trend`);
  } else if (momentum.trend === "rising") {
    score -= 20;
    suggestedDiscount -= 3;
    reasons.push(`Ceny v lokalite rastú - slabšia vyjednávacia pozícia`);
  }

  // Stratégia
  let strategy: string;
  if (score >= 70) {
    strategy = "Agresívne vyjednávaj. Navrhni cenu o 10-15% nižšiu a pomaly ustupuj.";
  } else if (score >= 50) {
    strategy = "Štandardné vyjednávanie. Začni o 5-8% nižšie.";
  } else {
    strategy = "Obmedzte vyjednávanie. Trh je v prospech predajcu.";
  }

  return {
    score: Math.max(0, Math.min(100, score)),
    suggestedDiscount: Math.max(0, Math.round(suggestedDiscount)),
    reasons,
    strategy,
  };
}

// ============================================
// PRICE STORY
// Príbeh ceny - ako sa menila v čase
// ============================================

export interface PriceStoryPoint {
  date: string;
  price: number;
  change: number; // % zmena oproti predchádzajúcej
  event: string;
}

export interface PriceStory {
  propertyId: string;
  originalPrice: number;
  currentPrice: number;
  totalChange: number; // %
  totalChangeAbs: number; // €
  daysOnMarket: number;
  priceDrops: number;
  story: PriceStoryPoint[];
  summary: string;
}

export async function getPriceStory(propertyId: string): Promise<PriceStory | null> {
  const property = await prisma.property.findUnique({
    where: { id: propertyId },
  });

  if (!property) return null;

  const history = await prisma.priceHistory.findMany({
    where: { propertyId },
    orderBy: { recordedAt: "asc" },
  });

  if (history.length === 0) {
    return {
      propertyId,
      originalPrice: property.price,
      currentPrice: property.price,
      totalChange: 0,
      totalChangeAbs: 0,
      daysOnMarket: Math.floor((Date.now() - property.createdAt.getTime()) / (1000 * 60 * 60 * 24)),
      priceDrops: 0,
      story: [{
        date: property.createdAt.toISOString().split("T")[0],
        price: property.price,
        change: 0,
        event: "Prvý inzerát",
      }],
      summary: "Cena sa nezmenila od zverejnenia.",
    };
  }

  const story: PriceStoryPoint[] = [];
  let priceDrops = 0;
  let previousPrice = history[0].price;

  for (let i = 0; i < history.length; i++) {
    const h = history[i];
    const change = previousPrice > 0 ? ((h.price - previousPrice) / previousPrice) * 100 : 0;
    
    let event: string;
    if (i === 0) {
      event = "Prvý inzerát";
    } else if (change < -5) {
      event = "Výrazné zníženie";
      priceDrops++;
    } else if (change < 0) {
      event = "Zníženie ceny";
      priceDrops++;
    } else if (change > 5) {
      event = "Výrazné zvýšenie";
    } else if (change > 0) {
      event = "Zvýšenie ceny";
    } else {
      event = "Bez zmeny";
    }

    story.push({
      date: h.recordedAt.toISOString().split("T")[0],
      price: h.price,
      change: Math.round(change * 10) / 10,
      event,
    });

    previousPrice = h.price;
  }

  const originalPrice = history[0].price;
  const currentPrice = property.price;
  const totalChange = ((currentPrice - originalPrice) / originalPrice) * 100;

  let summary: string;
  if (priceDrops >= 3) {
    summary = `Predajca je pod tlakom. Cena klesla ${priceDrops}x, celkovo o ${Math.abs(Math.round(totalChange))}%. Silná vyjednávacia pozícia.`;
  } else if (priceDrops >= 1) {
    summary = `Cena bola znížená ${priceDrops}x. Predajca ukazuje flexibilitu.`;
  } else if (totalChange > 0) {
    summary = `Cena bola zvýšená o ${Math.round(totalChange)}%. Predajca je sebavedomý.`;
  } else {
    summary = `Cena je stabilná. Predajca zatiaľ neukázal flexibilitu.`;
  }

  return {
    propertyId,
    originalPrice,
    currentPrice,
    totalChange: Math.round(totalChange * 10) / 10,
    totalChangeAbs: currentPrice - originalPrice,
    daysOnMarket: Math.floor((Date.now() - property.createdAt.getTime()) / (1000 * 60 * 60 * 24)),
    priceDrops,
    story,
    summary,
  };
}
