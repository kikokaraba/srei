/**
 * Výpočet investičného skóre nehnuteľnosti
 * Kombinuje viacero faktorov do jedného skóre 0-100
 */

import type { InvestmentScore, RiskAssessment, Risk } from "./types";

interface PropertyData {
  price: number;
  pricePerM2: number;
  grossYield?: number;
  netYield?: number;
  daysOnMarket?: number;
  condition: string;
  city: string;
  district?: string;
  isDistressed?: boolean;
  hasUpgradePotential?: boolean;
}

interface MarketData {
  avgPricePerM2: number;
  avgYield: number;
  avgDaysOnMarket: number;
}

/**
 * Vypočíta investičné skóre nehnuteľnosti
 */
export function calculateInvestmentScore(
  property: PropertyData,
  marketData: MarketData
): InvestmentScore {
  // Location score (based on city and district)
  const locationScore = calculateLocationScore(property.city, property.district);

  // Price score (how good is the price compared to market)
  const priceScore = calculatePriceScore(
    property.pricePerM2,
    marketData.avgPricePerM2
  );

  // Yield score
  const yieldScore = calculateYieldScore(
    property.grossYield || 0,
    property.netYield || 0,
    marketData.avgYield
  );

  // Growth potential score
  const growthScore = calculateGrowthScore(
    property.city,
    property.condition,
    property.hasUpgradePotential || false
  );

  // Risk score (inverse - lower risk = higher score)
  const riskResult = assessRisk(property, marketData);
  const riskScore = 100 - riskResult.riskScore;

  // Liquidity score (how quickly can it sell)
  const liquidityScore = calculateLiquidityScore(
    property.daysOnMarket || 0,
    marketData.avgDaysOnMarket,
    property.city
  );

  // Overall score (weighted average)
  const weights = {
    location: 0.20,
    price: 0.25,
    yield: 0.20,
    growth: 0.15,
    risk: 0.10,
    liquidity: 0.10,
  };

  const overall =
    locationScore * weights.location +
    priceScore * weights.price +
    yieldScore * weights.yield +
    growthScore * weights.growth +
    riskScore * weights.risk +
    liquidityScore * weights.liquidity;

  // Determine recommendation
  let recommendation: InvestmentScore["recommendation"];
  if (overall >= 80) recommendation = "strong_buy";
  else if (overall >= 65) recommendation = "buy";
  else if (overall >= 45) recommendation = "hold";
  else if (overall >= 30) recommendation = "sell";
  else recommendation = "strong_sell";

  // Generate reasoning
  const reasoning = generateReasoning({
    locationScore,
    priceScore,
    yieldScore,
    growthScore,
    riskScore,
    liquidityScore,
  });

  return {
    overall: Math.round(overall),
    categories: {
      location: Math.round(locationScore),
      price: Math.round(priceScore),
      yield: Math.round(yieldScore),
      growth: Math.round(growthScore),
      risk: Math.round(riskScore),
      liquidity: Math.round(liquidityScore),
    },
    recommendation,
    reasoning,
  };
}

function calculateLocationScore(city: string, district?: string): number {
  // Base scores for cities
  const cityScores: Record<string, number> = {
    BRATISLAVA: 90,
    KOSICE: 75,
    ZILINA: 70,
    PRESOV: 65,
    BANSKA_BYSTRICA: 65,
    TRNAVA: 70,
    TRENCIN: 65,
    NITRA: 65,
  };

  let score = cityScores[city] || 50;

  // Premium districts in Bratislava
  if (city === "BRATISLAVA" && district) {
    const premiumDistricts = ["Staré Mesto", "Ružinov", "Petržalka"];
    if (premiumDistricts.some((d) => district.includes(d))) {
      score += 5;
    }
  }

  return Math.min(100, score);
}

function calculatePriceScore(pricePerM2: number, marketAvg: number): number {
  const deviation = ((pricePerM2 - marketAvg) / marketAvg) * 100;

  // Lower price = higher score
  if (deviation <= -20) return 95;
  if (deviation <= -10) return 85;
  if (deviation <= 0) return 75;
  if (deviation <= 10) return 60;
  if (deviation <= 20) return 45;
  return 30;
}

function calculateYieldScore(
  grossYield: number,
  netYield: number,
  marketAvg: number
): number {
  const yield_ = netYield > 0 ? netYield : grossYield;
  
  if (yield_ <= 0) return 30;
  
  // Higher yield = higher score
  if (yield_ >= 8) return 95;
  if (yield_ >= 6) return 85;
  if (yield_ >= 5) return 75;
  if (yield_ >= 4) return 60;
  if (yield_ >= 3) return 45;
  return 35;
}

function calculateGrowthScore(
  city: string,
  condition: string,
  hasUpgradePotential: boolean
): number {
  let score = 50;

  // Growth cities
  const growthCities = ["BRATISLAVA", "KOSICE", "ZILINA"];
  if (growthCities.includes(city)) score += 15;

  // Condition bonus
  if (condition === "POVODNY" && hasUpgradePotential) score += 20;
  if (condition === "NOVOSTAVBA") score += 10;

  return Math.min(100, score);
}

function calculateLiquidityScore(
  daysOnMarket: number,
  avgDaysOnMarket: number,
  city: string
): number {
  // Major cities are more liquid
  const liquidCities = ["BRATISLAVA", "KOSICE"];
  const cityBonus = liquidCities.includes(city) ? 15 : 0;

  // Lower days on market = better liquidity
  if (daysOnMarket <= 14) return Math.min(100, 95 + cityBonus);
  if (daysOnMarket <= 30) return Math.min(100, 85 + cityBonus);
  if (daysOnMarket <= 60) return Math.min(100, 70 + cityBonus);
  if (daysOnMarket <= 90) return Math.min(100, 55 + cityBonus);
  return Math.min(100, 40 + cityBonus);
}

/**
 * Hodnotenie rizík nehnuteľnosti
 */
export function assessRisk(
  property: PropertyData,
  marketData: MarketData
): RiskAssessment {
  const risks: Risk[] = [];

  // Market risk
  const priceDeviation = ((property.pricePerM2 - marketData.avgPricePerM2) / marketData.avgPricePerM2) * 100;
  if (priceDeviation > 30) {
    risks.push({
      type: "market",
      name: "Nadhodnotená cena",
      severity: "high",
      probability: 70,
      impact: 60,
      description: `Cena je ${priceDeviation.toFixed(0)}% nad trhovým priemerom`,
    });
  }

  // Yield risk
  if ((property.grossYield || 0) < 3) {
    risks.push({
      type: "financial",
      name: "Nízky výnos",
      severity: "medium",
      probability: 100,
      impact: 40,
      description: "Hrubý výnos pod 3% je pod odporúčaným minimom",
    });
  }

  // Liquidity risk
  if ((property.daysOnMarket || 0) > 90) {
    risks.push({
      type: "market",
      name: "Nízka likvidita",
      severity: "medium",
      probability: 60,
      impact: 30,
      description: "Nehnuteľnosť je na trhu dlhšie ako 90 dní",
    });
  }

  // Condition risk
  if (property.condition === "POVODNY") {
    risks.push({
      type: "property",
      name: "Potrebná rekonštrukcia",
      severity: "medium",
      probability: 80,
      impact: 35,
      description: "Pôvodný stav môže vyžadovať investície do opráv",
    });
  }

  // Calculate overall risk score
  const riskScore = risks.reduce((sum, r) => {
    return sum + (r.probability / 100) * (r.impact / 100) * 100;
  }, 0);

  const normalizedScore = Math.min(100, riskScore * 2);

  let overallRisk: RiskAssessment["overallRisk"];
  if (normalizedScore >= 70) overallRisk = "very_high";
  else if (normalizedScore >= 50) overallRisk = "high";
  else if (normalizedScore >= 30) overallRisk = "medium";
  else overallRisk = "low";

  // Generate mitigations
  const mitigations: string[] = [];
  if (risks.some((r) => r.type === "market")) {
    mitigations.push("Vyjednajte nižšiu cenu alebo počkajte na korekciu trhu");
  }
  if (risks.some((r) => r.type === "financial")) {
    mitigations.push("Zvážte prenájom na zvýšenie výnosu");
  }
  if (risks.some((r) => r.type === "property")) {
    mitigations.push("Získajte odhad nákladov na rekonštrukciu pred kúpou");
  }

  return {
    overallRisk,
    riskScore: Math.round(normalizedScore),
    risks,
    mitigations,
  };
}

function generateReasoning(scores: Record<string, number>): string[] {
  const reasons: string[] = [];

  if (scores.priceScore >= 80) {
    reasons.push("Atraktívna cena pod trhovým priemerom");
  } else if (scores.priceScore <= 40) {
    reasons.push("Cena je nadpriemerná pre danú lokalitu");
  }

  if (scores.yieldScore >= 80) {
    reasons.push("Vynikajúci potenciálny výnos z prenájmu");
  }

  if (scores.locationScore >= 85) {
    reasons.push("Prémiová lokalita s vysokým dopytom");
  }

  if (scores.growthScore >= 75) {
    reasons.push("Vysoký potenciál zhodnotenia");
  }

  if (scores.riskScore <= 40) {
    reasons.push("Zvýšené rizikové faktory vyžadujú opatrnosť");
  }

  if (scores.liquidityScore >= 80) {
    reasons.push("Vysoká likvidita - rýchly predaj v prípade potreby");
  }

  return reasons;
}
