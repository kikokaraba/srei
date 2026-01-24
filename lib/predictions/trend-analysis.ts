/**
 * Analýza trendov cien nehnuteľností
 * Používa historické dáta na výpočet trendov a momentum
 */

import type {
  PriceDataPoint,
  TrendAnalysis,
  SeasonalPattern,
  MarketComparison,
} from "./types";

/**
 * Vypočíta trend z historických dát
 */
export function calculateTrend(
  data: PriceDataPoint[],
  period: "1m" | "3m" | "6m" | "1y" | "3y" | "5y"
): TrendAnalysis {
  if (data.length < 2) {
    return {
      city: "",
      period,
      trend: "stable",
      changePercent: 0,
      volatility: 0,
      momentum: 0,
      seasonality: null,
    };
  }

  // Sort by date
  const sortedData = [...data].sort(
    (a, b) => a.date.getTime() - b.date.getTime()
  );

  // Calculate period in days
  const periodDays: Record<string, number> = {
    "1m": 30,
    "3m": 90,
    "6m": 180,
    "1y": 365,
    "3y": 1095,
    "5y": 1825,
  };

  const now = new Date();
  const cutoffDate = new Date(now.getTime() - periodDays[period] * 24 * 60 * 60 * 1000);
  
  // Filter data for period
  const periodData = sortedData.filter((d) => d.date >= cutoffDate);
  
  if (periodData.length < 2) {
    return {
      city: "",
      period,
      trend: "stable",
      changePercent: 0,
      volatility: 0,
      momentum: 0,
      seasonality: null,
    };
  }

  // Calculate change
  const firstPrice = periodData[0].pricePerM2;
  const lastPrice = periodData[periodData.length - 1].pricePerM2;
  const changePercent = ((lastPrice - firstPrice) / firstPrice) * 100;

  // Determine trend
  let trend: "rising" | "falling" | "stable";
  if (changePercent > 2) trend = "rising";
  else if (changePercent < -2) trend = "falling";
  else trend = "stable";

  // Calculate volatility (standard deviation of daily changes)
  const changes: number[] = [];
  for (let i = 1; i < periodData.length; i++) {
    const change =
      ((periodData[i].pricePerM2 - periodData[i - 1].pricePerM2) /
        periodData[i - 1].pricePerM2) *
      100;
    changes.push(change);
  }

  const avgChange = changes.reduce((a, b) => a + b, 0) / changes.length;
  const variance =
    changes.reduce((sum, c) => sum + Math.pow(c - avgChange, 2), 0) /
    changes.length;
  const volatility = Math.min(100, Math.sqrt(variance) * 10); // Normalize to 0-100

  // Calculate momentum (rate of change acceleration)
  const halfPoint = Math.floor(periodData.length / 2);
  const firstHalfChange =
    (periodData[halfPoint].pricePerM2 - periodData[0].pricePerM2) /
    periodData[0].pricePerM2;
  const secondHalfChange =
    (periodData[periodData.length - 1].pricePerM2 -
      periodData[halfPoint].pricePerM2) /
    periodData[halfPoint].pricePerM2;

  const momentum = Math.max(-100, Math.min(100, (secondHalfChange - firstHalfChange) * 1000));

  // Detect seasonality (requires at least 1 year of data)
  let seasonality: SeasonalPattern | null = null;
  if (periodData.length >= 12 && period !== "1m" && period !== "3m") {
    seasonality = detectSeasonality(periodData);
  }

  return {
    city: "",
    period,
    trend,
    changePercent: Math.round(changePercent * 100) / 100,
    volatility: Math.round(volatility * 10) / 10,
    momentum: Math.round(momentum * 10) / 10,
    seasonality,
  };
}

/**
 * Detekuje sezónne vzory v dátach
 */
function detectSeasonality(data: PriceDataPoint[]): SeasonalPattern | null {
  // Group by month
  const monthlyAverages: Record<number, number[]> = {};
  
  data.forEach((d) => {
    const month = d.date.getMonth() + 1;
    if (!monthlyAverages[month]) monthlyAverages[month] = [];
    monthlyAverages[month].push(d.pricePerM2);
  });

  // Calculate average for each month
  const monthlyAvg: Record<number, number> = {};
  Object.entries(monthlyAverages).forEach(([month, prices]) => {
    monthlyAvg[parseInt(month)] = prices.reduce((a, b) => a + b, 0) / prices.length;
  });

  const overallAvg = Object.values(monthlyAvg).reduce((a, b) => a + b, 0) / Object.values(monthlyAvg).length;

  // Find peak and low months
  const deviations = Object.entries(monthlyAvg).map(([month, avg]) => ({
    month: parseInt(month),
    deviation: ((avg - overallAvg) / overallAvg) * 100,
  }));

  const peakMonths = deviations
    .filter((d) => d.deviation > 2)
    .map((d) => d.month);
  
  const lowMonths = deviations
    .filter((d) => d.deviation < -2)
    .map((d) => d.month);

  if (peakMonths.length === 0 && lowMonths.length === 0) {
    return null;
  }

  const maxDeviation = Math.max(...deviations.map((d) => Math.abs(d.deviation)));

  return {
    peakMonths,
    lowMonths,
    avgSeasonalVariation: Math.round(maxDeviation * 10) / 10,
  };
}

/**
 * Porovná nehnuteľnosť s trhom
 */
export function compareToMarket(
  propertyPricePerM2: number,
  marketPrices: number[],
  districtPrices: number[]
): MarketComparison {
  const marketAvg = marketPrices.reduce((a, b) => a + b, 0) / marketPrices.length;
  const districtAvg = districtPrices.length > 0
    ? districtPrices.reduce((a, b) => a + b, 0) / districtPrices.length
    : marketAvg;

  const deviation = ((propertyPricePerM2 - marketAvg) / marketAvg) * 100;
  
  // Calculate percentile
  const sortedMarket = [...marketPrices].sort((a, b) => a - b);
  const belowCount = sortedMarket.filter((p) => p < propertyPricePerM2).length;
  const percentile = (belowCount / sortedMarket.length) * 100;

  const isUndervalued = deviation < -10;
  const undervaluationPercent = isUndervalued ? Math.abs(deviation) : 0;

  return {
    propertyPricePerM2,
    marketAvgPricePerM2: Math.round(marketAvg),
    districtAvgPricePerM2: Math.round(districtAvg),
    deviation: Math.round(deviation * 10) / 10,
    percentile: Math.round(percentile),
    isUndervalued,
    undervaluationPercent: Math.round(undervaluationPercent * 10) / 10,
  };
}

/**
 * Vypočíta jednoduchú predikciu ceny
 * Používa lineárnu regresiu + sezónne úpravy
 */
export function predictPrice(
  historicalData: PriceDataPoint[],
  monthsAhead: number
): { predicted: number; confidence: number; range: { low: number; high: number } } {
  if (historicalData.length < 3) {
    const lastPrice = historicalData[historicalData.length - 1]?.pricePerM2 || 0;
    return {
      predicted: lastPrice,
      confidence: 20,
      range: { low: lastPrice * 0.85, high: lastPrice * 1.15 },
    };
  }

  const sortedData = [...historicalData].sort(
    (a, b) => a.date.getTime() - b.date.getTime()
  );

  // Simple linear regression
  const n = sortedData.length;
  const xValues = sortedData.map((_, i) => i);
  const yValues = sortedData.map((d) => d.pricePerM2);

  const sumX = xValues.reduce((a, b) => a + b, 0);
  const sumY = yValues.reduce((a, b) => a + b, 0);
  const sumXY = xValues.reduce((sum, x, i) => sum + x * yValues[i], 0);
  const sumXX = xValues.reduce((sum, x) => sum + x * x, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  // Predict future value
  const futureX = n - 1 + monthsAhead;
  const predicted = intercept + slope * futureX;

  // Calculate confidence based on data quality and volatility
  const trend = calculateTrend(sortedData, "1y");
  const dataQuality = Math.min(100, (n / 24) * 100); // More data = higher confidence
  const volatilityPenalty = trend.volatility / 2;
  const confidence = Math.max(20, Math.min(90, dataQuality - volatilityPenalty));

  // Calculate range based on volatility
  const rangePercent = (100 - confidence) / 100 + 0.05;
  const range = {
    low: Math.round(predicted * (1 - rangePercent)),
    high: Math.round(predicted * (1 + rangePercent)),
  };

  return {
    predicted: Math.round(predicted),
    confidence: Math.round(confidence),
    range,
  };
}
