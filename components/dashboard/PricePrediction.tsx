"use client";

import { useState, useEffect } from "react";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Brain,
  BarChart3,
  Target,
  Shield,
  AlertTriangle,
  Loader2,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from "lucide-react";
import { REGION_LABELS, CITY_TO_REGION } from "@/lib/constants";

// Mapovanie regiónu na mesto pre API
const REGION_TO_CITY: Record<string, string> = {
  BA: "BRATISLAVA",
  KE: "KOSICE",
  PO: "PRESOV",
  ZA: "ZILINA",
  BB: "BANSKA_BYSTRICA",
  TT: "TRNAVA",
  TN: "TRENCIN",
  NR: "NITRA",
};

interface CityPrediction {
  city: string;
  analyzedAt: string;
  stats: {
    totalProperties: number;
    avgPrice: number;
    avgPricePerM2: number;
  };
  trends: {
    "3m": { trend: string; changePercent: number };
    "1y": { trend: string; changePercent: number };
  };
  predictions: {
    "6m": { predictedPricePerM2: number; confidence: number };
    "1y": { predictedPricePerM2: number; confidence: number };
  };
  topDistricts: Array<{ district: string; avgPricePerM2: number }>;
}

interface MarketOverview {
  analyzedAt: string;
  overall: {
    totalProperties: number;
    avgPrice: number;
    avgPricePerM2: number;
    avgYield: number;
  };
  cities: Array<{
    city: string;
    propertyCount: number;
    avgPricePerM2: number;
    avgYield: number;
  }>;
  insights: string[];
}

export function PricePrediction() {
  const [selectedCity, setSelectedCity] = useState<string>("BRATISLAVA");
  const [cityData, setCityData] = useState<CityPrediction | null>(null);
  const [marketData, setMarketData] = useState<MarketOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    fetchData();
  }, [selectedCity]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [cityRes, marketRes] = await Promise.all([
        fetch(`/api/v1/predictions?type=city&city=${selectedCity}`),
        fetch("/api/v1/predictions?type=market"),
      ]);

      const cityJson = await cityRes.json();
      const marketJson = await marketRes.json();

      if (cityJson.success) setCityData(cityJson.data);
      if (marketJson.success) setMarketData(marketJson.data);
    } catch (error) {
      console.error("Error fetching predictions:", error);
    } finally {
      setLoading(false);
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "rising":
        return <TrendingUp className="w-4 h-4 text-emerald-400" />;
      case "falling":
        return <TrendingDown className="w-4 h-4 text-red-400" />;
      default:
        return <Minus className="w-4 h-4 text-zinc-400" />;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case "rising":
        return "text-emerald-400";
      case "falling":
        return "text-red-400";
      default:
        return "text-zinc-400";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-500/10 rounded-lg">
            <Brain className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-zinc-100">AI Predikcie cien</h2>
            <p className="text-sm text-zinc-400">Analýza trendov a predpovede vývoja trhu</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-1 rounded">
            <Sparkles className="w-3 h-3 inline mr-1" />
            AI Powered
          </span>
        </div>
      </div>

      {/* Region Selector */}
      <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide">
        {Object.entries(REGION_LABELS).map(([code, name]) => (
          <button
            key={code}
            onClick={() => setSelectedCity(REGION_TO_CITY[code])}
            className={`px-2.5 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm rounded-lg whitespace-nowrap transition-colors shrink-0 ${
              selectedCity === REGION_TO_CITY[code]
                ? "bg-purple-500 text-white"
                : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
            }`}
          >
            {code}
          </button>
        ))}
      </div>

      {/* City Analysis */}
      {cityData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
          {/* Current Stats */}
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 lg:p-6">
            <h3 className="font-semibold text-zinc-100 mb-3 lg:mb-4 flex items-center gap-2 text-sm lg:text-base">
              <BarChart3 className="w-4 h-4 lg:w-5 lg:h-5 text-blue-400" />
              <span className="truncate">Stav - {REGION_LABELS[CITY_TO_REGION[selectedCity]] || selectedCity}</span>
            </h3>
            <div className="grid grid-cols-2 gap-2 sm:gap-4">
              <div className="p-3 lg:p-4 bg-zinc-800/50 rounded-lg">
                <div className="text-xs lg:text-sm text-zinc-400">Cena/m²</div>
                <div className="text-lg sm:text-xl lg:text-2xl font-bold text-zinc-100">
                  €{cityData.stats.avgPricePerM2.toLocaleString()}
                </div>
              </div>
              <div className="p-3 lg:p-4 bg-zinc-800/50 rounded-lg">
                <div className="text-xs lg:text-sm text-zinc-400">Nehnuteľností</div>
                <div className="text-lg sm:text-xl lg:text-2xl font-bold text-zinc-100">
                  {cityData.stats.totalProperties}
                </div>
              </div>
            </div>

            {/* Trends */}
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between p-3 bg-zinc-800/30 rounded-lg">
                <span className="text-zinc-400">Trend 3 mesiace</span>
                <div className="flex items-center gap-2">
                  {getTrendIcon(cityData.trends["3m"].trend)}
                  <span className={`font-medium ${getTrendColor(cityData.trends["3m"].trend)}`}>
                    {cityData.trends["3m"].changePercent > 0 ? "+" : ""}
                    {cityData.trends["3m"].changePercent.toFixed(1)}%
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 bg-zinc-800/30 rounded-lg">
                <span className="text-zinc-400">Trend 1 rok</span>
                <div className="flex items-center gap-2">
                  {getTrendIcon(cityData.trends["1y"].trend)}
                  <span className={`font-medium ${getTrendColor(cityData.trends["1y"].trend)}`}>
                    {cityData.trends["1y"].changePercent > 0 ? "+" : ""}
                    {cityData.trends["1y"].changePercent.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Predictions */}
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
            <h3 className="font-semibold text-zinc-100 mb-4 flex items-center gap-2">
              <Target className="w-5 h-5 text-purple-400" />
              Predikcie ceny/m²
            </h3>
            <div className="space-y-4">
              {/* 6 month prediction */}
              <div className="p-4 bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-lg border border-purple-500/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-zinc-400">Za 6 mesiacov</span>
                  <span className="text-xs text-purple-400">
                    Spoľahlivosť: {cityData.predictions["6m"].confidence}%
                  </span>
                </div>
                <div className="text-3xl font-bold text-zinc-100">
                  €{cityData.predictions["6m"].predictedPricePerM2.toLocaleString()}
                </div>
                <div className="mt-2 h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-purple-500 rounded-full"
                    style={{ width: `${cityData.predictions["6m"].confidence}%` }}
                  />
                </div>
              </div>

              {/* 1 year prediction */}
              <div className="p-4 bg-gradient-to-r from-blue-500/10 to-emerald-500/10 rounded-lg border border-blue-500/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-zinc-400">Za 1 rok</span>
                  <span className="text-xs text-blue-400">
                    Spoľahlivosť: {cityData.predictions["1y"].confidence}%
                  </span>
                </div>
                <div className="text-3xl font-bold text-zinc-100">
                  €{cityData.predictions["1y"].predictedPricePerM2.toLocaleString()}
                </div>
                <div className="mt-2 h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full"
                    style={{ width: `${cityData.predictions["1y"].confidence}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Disclaimer */}
            <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
                <p className="text-xs text-yellow-200/70">
                  Predikcie sú orientačné a vychádzajú z historických dát. 
                  Skutočný vývoj cien môže byť odlišný.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Market Insights */}
      {marketData && (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="w-full p-4 flex items-center justify-between hover:bg-zinc-800/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-emerald-400" />
              <span className="font-semibold text-zinc-100">Prehľad trhu SR</span>
            </div>
            {showDetails ? (
              <ChevronUp className="w-5 h-5 text-zinc-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-zinc-400" />
            )}
          </button>

          {showDetails && (
            <div className="p-4 border-t border-zinc-800">
              {/* Insights */}
              <div className="mb-4 space-y-2">
                {marketData.insights.map((insight, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 text-sm text-zinc-300"
                  >
                    <Sparkles className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                    {insight}
                  </div>
                ))}
              </div>

              {/* Cities comparison */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-zinc-800/50">
                    <tr>
                      <th className="text-left py-2 px-3 text-sm font-medium text-zinc-400">
                        Región
                      </th>
                      <th className="text-right py-2 px-3 text-sm font-medium text-zinc-400">
                        Cena/m²
                      </th>
                      <th className="text-right py-2 px-3 text-sm font-medium text-zinc-400">
                        Výnos
                      </th>
                      <th className="text-right py-2 px-3 text-sm font-medium text-zinc-400">
                        Počet
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    {marketData.cities.map((city) => (
                      <tr key={city.city} className="hover:bg-zinc-800/30">
                        <td className="py-2 px-3 text-zinc-100">
                          {REGION_LABELS[CITY_TO_REGION[city.city]] || city.city}
                        </td>
                        <td className="py-2 px-3 text-right text-zinc-300">
                          €{city.avgPricePerM2.toLocaleString()}
                        </td>
                        <td className="py-2 px-3 text-right">
                          <span className="text-emerald-400">{city.avgYield}%</span>
                        </td>
                        <td className="py-2 px-3 text-right text-zinc-400">
                          {city.propertyCount}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
