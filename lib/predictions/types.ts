/**
 * Types pre AI predikcie cien nehnuteľností
 */

// Historické dáta pre analýzu
export interface PriceDataPoint {
  date: Date;
  price: number;
  pricePerM2: number;
}

// Predikcia budúcej ceny
export interface PricePrediction {
  targetDate: Date;
  predictedPrice: number;
  predictedPricePerM2: number;
  confidenceLevel: number; // 0-100%
  confidenceRange: {
    low: number;
    high: number;
  };
  factors: PredictionFactor[];
}

// Faktory ovplyvňujúce predikciu
export interface PredictionFactor {
  name: string;
  impact: number; // -100 to +100 (% vplyv na cenu)
  description: string;
  category: "market" | "location" | "infrastructure" | "economy" | "property";
}

// Trendová analýza
export interface TrendAnalysis {
  city: string;
  period: "1m" | "3m" | "6m" | "1y" | "3y" | "5y";
  trend: "rising" | "falling" | "stable";
  changePercent: number;
  volatility: number; // 0-100
  momentum: number; // -100 to +100
  seasonality: SeasonalPattern | null;
}

// Sezónne vzory
export interface SeasonalPattern {
  peakMonths: number[]; // 1-12
  lowMonths: number[];
  avgSeasonalVariation: number; // %
}

// Investičné skóre nehnuteľnosti
export interface InvestmentScore {
  overall: number; // 0-100
  categories: {
    location: number;
    price: number;
    yield: number;
    growth: number;
    risk: number;
    liquidity: number;
  };
  recommendation: "strong_buy" | "buy" | "hold" | "sell" | "strong_sell";
  reasoning: string[];
}

// Rizikové hodnotenie
export interface RiskAssessment {
  overallRisk: "low" | "medium" | "high" | "very_high";
  riskScore: number; // 0-100
  risks: Risk[];
  mitigations: string[];
}

export interface Risk {
  type: "market" | "location" | "legal" | "financial" | "property";
  name: string;
  severity: "low" | "medium" | "high";
  probability: number; // 0-100
  impact: number; // 0-100
  description: string;
}

// Porovnanie s trhom
export interface MarketComparison {
  propertyPricePerM2: number;
  marketAvgPricePerM2: number;
  districtAvgPricePerM2: number;
  deviation: number; // % rozdiel od priemeru
  percentile: number; // 0-100 (koľko % nehnuteľností je lacnejších)
  isUndervalued: boolean;
  undervaluationPercent: number;
}

// Kompletná analýza nehnuteľnosti
export interface PropertyAnalysis {
  propertyId: string;
  analyzedAt: Date;
  prediction: PricePrediction;
  trends: TrendAnalysis[];
  investmentScore: InvestmentScore;
  riskAssessment: RiskAssessment;
  marketComparison: MarketComparison;
}

// Mestská analýza
export interface CityAnalysis {
  city: string;
  analyzedAt: Date;
  currentAvgPrice: number;
  currentAvgPricePerM2: number;
  yearOverYearChange: number;
  predictions: {
    "3m": PricePrediction;
    "6m": PricePrediction;
    "1y": PricePrediction;
    "3y": PricePrediction;
  };
  trends: TrendAnalysis;
  hotDistricts: {
    district: string;
    reason: string;
    expectedGrowth: number;
  }[];
  risks: Risk[];
}
