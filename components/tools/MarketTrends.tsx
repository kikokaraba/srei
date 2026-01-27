"use client";

import { useState, useEffect } from "react";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Loader2,
  Sparkles,
  MapPin,
  AlertTriangle,
  CheckCircle2,
  Clock,
  BarChart3,
  ArrowUp,
  ArrowDown,
  Activity,
} from "lucide-react";

interface MarketData {
  city: string;
  totalListings: number;
  avgPrice: number;
  avgPricePerM2: number;
  minPrice: number;
  maxPrice: number;
  hotDealsRatio: number;
  newListingsWeek: number;
  byCondition: {
    condition: string;
    count: number;
    avgPricePerM2: number;
  }[];
  allCities: {
    city: string;
    count: number;
    avgPricePerM2: number;
  }[];
}

interface AIPrediction {
  currentState: string;
  shortTermTrend: {
    direction: "UP" | "DOWN" | "STABLE";
    percentage: number;
    reasoning: string;
  };
  longTermTrend: {
    direction: "UP" | "DOWN" | "STABLE";
    percentage: number;
    reasoning: string;
  };
  bestTimeToAction: {
    buy: string;
    sell: string;
    reasoning: string;
  };
  hotLocalities: string[];
  risks: string[];
  opportunities: string[];
  summary: string;
}

const CITIES = [
  { value: "BRATISLAVA", label: "Bratislava" },
  { value: "KOSICE", label: "Košice" },
  { value: "PRESOV", label: "Prešov" },
  { value: "ZILINA", label: "Žilina" },
  { value: "BANSKA_BYSTRICA", label: "Banská Bystrica" },
  { value: "TRNAVA", label: "Trnava" },
  { value: "TRENCIN", label: "Trenčín" },
  { value: "NITRA", label: "Nitra" },
];

const CONDITION_LABELS: Record<string, string> = {
  NOVOSTAVBA: "Novostavba",
  REKONSTRUKCIA: "Po rekonštrukcii",
  POVODNY: "Pôvodný stav",
};

export function MarketTrends() {
  const [selectedCity, setSelectedCity] = useState("BRATISLAVA");
  const [loading, setLoading] = useState(false);
  const [market, setMarket] = useState<MarketData | null>(null);
  const [prediction, setPrediction] = useState<AIPrediction | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchTrends = async (city: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/v1/ai/market-trends?city=${city}`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error);
      }

      setMarket(data.data.market);
      setPrediction(data.data.prediction);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nepodarilo sa načítať trendy");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrends(selectedCity);
  }, [selectedCity]);

  const getTrendIcon = (direction: string) => {
    switch (direction) {
      case "UP":
        return <TrendingUp className="w-5 h-5 text-emerald-400" />;
      case "DOWN":
        return <TrendingDown className="w-5 h-5 text-red-400" />;
      default:
        return <Minus className="w-5 h-5 text-zinc-400" />;
    }
  };

  const getTrendColor = (direction: string) => {
    switch (direction) {
      case "UP":
        return "text-emerald-400";
      case "DOWN":
        return "text-red-400";
      default:
        return "text-zinc-400";
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500/20 rounded-full mb-4">
          <Activity className="w-5 h-5 text-cyan-400" />
          <span className="text-cyan-400 font-medium">AI Market Analysis</span>
        </div>
        <h2 className="text-lg font-semibold text-zinc-100">Trhové Trendy & Predikcie</h2>
        <p className="text-zinc-400 mt-2">
          AI analyzuje trh a predikuje kam smerujú ceny nehnuteľností
        </p>
      </div>

      {/* City Selector */}
      <div className="flex flex-wrap justify-center gap-2">
        {CITIES.map(city => (
          <button
            key={city.value}
            onClick={() => setSelectedCity(city.value)}
            className={`px-4 py-2 rounded-lg transition-all ${
              selectedCity === city.value
                ? "bg-cyan-500 text-white"
                : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
            }`}
          >
            {city.label}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-16">
          <Loader2 className="w-12 h-12 animate-spin text-cyan-400 mb-4" />
          <p className="text-zinc-400">AI analyzuje trhové dáta...</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400" />
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {/* Results */}
      {!loading && market && (
        <div className="space-y-6">
          {/* Market Overview */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-zinc-800/50 rounded-xl border border-zinc-700 p-4 text-center">
              <p className="text-xl font-semibold text-zinc-100">{market.totalListings}</p>
              <p className="text-sm text-zinc-400">Aktívnych inzerátov</p>
            </div>
            <div className="bg-zinc-800/50 rounded-xl border border-zinc-700 p-4 text-center">
              <p className="text-xl font-semibold text-cyan-400">€{market.avgPricePerM2}</p>
              <p className="text-sm text-zinc-400">Priem. cena/m²</p>
            </div>
            <div className="bg-zinc-800/50 rounded-xl border border-zinc-700 p-4 text-center">
              <p className="text-xl font-semibold text-emerald-400">{market.hotDealsRatio}%</p>
              <p className="text-sm text-zinc-400">Hot deals</p>
            </div>
            <div className="bg-zinc-800/50 rounded-xl border border-zinc-700 p-4 text-center">
              <p className="text-xl font-semibold text-amber-400">{market.newListingsWeek}</p>
              <p className="text-sm text-zinc-400">Nových (7 dní)</p>
            </div>
          </div>

          {/* AI Prediction */}
          {prediction && (
            <>
              {/* Current State */}
              <div className="bg-cyan-500/10 rounded-xl border border-cyan-500/30 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Sparkles className="w-6 h-6 text-cyan-400" />
                  <h3 className="text-lg font-semibold text-zinc-100">AI Analýza trhu</h3>
                </div>
                <p className="text-zinc-300 leading-relaxed">{prediction.currentState}</p>
                
                <div className="mt-4 p-4 bg-zinc-800/50 rounded-lg">
                  <p className="text-zinc-200">{prediction.summary}</p>
                </div>
              </div>

              {/* Trends */}
              <div className="grid md:grid-cols-2 gap-6">
                {/* Short Term */}
                <div className="bg-zinc-800/50 rounded-xl border border-zinc-700 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-zinc-100">Krátkodobý trend</h3>
                    <span className="text-sm text-zinc-400">3 mesiace</span>
                  </div>
                  <div className="flex items-center gap-4 mb-4">
                    <div className={`p-3 rounded-xl ${
                      prediction.shortTermTrend.direction === "UP" ? "bg-emerald-500/20" :
                      prediction.shortTermTrend.direction === "DOWN" ? "bg-red-500/20" : "bg-zinc-700"
                    }`}>
                      {getTrendIcon(prediction.shortTermTrend.direction)}
                    </div>
                    <div>
                      <p className={`text-lg font-semibold ${getTrendColor(prediction.shortTermTrend.direction)}`}>
                        {prediction.shortTermTrend.percentage > 0 ? "+" : ""}
                        {prediction.shortTermTrend.percentage}%
                      </p>
                      <p className="text-sm text-zinc-400">očakávaná zmena</p>
                    </div>
                  </div>
                  <p className="text-sm text-zinc-400">{prediction.shortTermTrend.reasoning}</p>
                </div>

                {/* Long Term */}
                <div className="bg-zinc-800/50 rounded-xl border border-zinc-700 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-zinc-100">Dlhodobý trend</h3>
                    <span className="text-sm text-zinc-400">12 mesiacov</span>
                  </div>
                  <div className="flex items-center gap-4 mb-4">
                    <div className={`p-3 rounded-xl ${
                      prediction.longTermTrend.direction === "UP" ? "bg-emerald-500/20" :
                      prediction.longTermTrend.direction === "DOWN" ? "bg-red-500/20" : "bg-zinc-700"
                    }`}>
                      {getTrendIcon(prediction.longTermTrend.direction)}
                    </div>
                    <div>
                      <p className={`text-lg font-semibold ${getTrendColor(prediction.longTermTrend.direction)}`}>
                        {prediction.longTermTrend.percentage > 0 ? "+" : ""}
                        {prediction.longTermTrend.percentage}%
                      </p>
                      <p className="text-sm text-zinc-400">očakávaná zmena</p>
                    </div>
                  </div>
                  <p className="text-sm text-zinc-400">{prediction.longTermTrend.reasoning}</p>
                </div>
              </div>

              {/* Best Time to Action */}
              <div className="bg-zinc-800/50 rounded-xl border border-zinc-700 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Clock className="w-5 h-5 text-zinc-400" />
                  <h3 className="font-semibold text-zinc-100">Najlepší čas na akciu</h3>
                </div>
                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  <div className="flex items-center gap-4 p-4 bg-emerald-500/10 rounded-lg">
                    <ArrowDown className="w-8 h-8 text-emerald-400" />
                    <div>
                      <p className="text-sm text-zinc-400">Kúpiť</p>
                      <p className="text-lg font-semibold text-emerald-400">{prediction.bestTimeToAction.buy}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 p-4 bg-amber-500/10 rounded-lg">
                    <ArrowUp className="w-8 h-8 text-amber-400" />
                    <div>
                      <p className="text-sm text-zinc-400">Predať</p>
                      <p className="text-lg font-semibold text-amber-400">{prediction.bestTimeToAction.sell}</p>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-zinc-400">{prediction.bestTimeToAction.reasoning}</p>
              </div>

              {/* Hot Localities */}
              {prediction.hotLocalities.length > 0 && (
                <div className="bg-zinc-800/50 rounded-xl border border-zinc-700 p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <MapPin className="w-5 h-5 text-zinc-400" />
                    <h3 className="font-semibold text-zinc-100">Horúce lokality</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {prediction.hotLocalities.map((loc, i) => (
                      <span
                        key={i}
                        className="px-4 py-2 bg-orange-500/10 border border-orange-500/30 rounded-lg text-orange-400"
                      >
                        🔥 {loc}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Risks & Opportunities */}
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-emerald-500/10 rounded-xl border border-emerald-500/30 p-6">
                  <h3 className="font-semibold text-emerald-400 mb-4">Príležitosti</h3>
                  <ul className="space-y-2">
                    {prediction.opportunities.map((opp, i) => (
                      <li key={i} className="flex items-start gap-2 text-zinc-300">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-1" />
                        {opp}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="bg-amber-500/10 rounded-xl border border-amber-500/30 p-6">
                  <h3 className="font-semibold text-amber-400 mb-4">Riziká</h3>
                  <ul className="space-y-2">
                    {prediction.risks.map((risk, i) => (
                      <li key={i} className="flex items-start gap-2 text-zinc-300">
                        <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-1" />
                        {risk}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </>
          )}

          {/* By Condition */}
          <div className="bg-zinc-800/50 rounded-xl border border-zinc-700 p-6">
            <div className="flex items-center gap-3 mb-4">
              <BarChart3 className="w-5 h-5 text-zinc-400" />
              <h3 className="font-semibold text-zinc-100">Ceny podľa stavu nehnuteľnosti</h3>
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              {market.byCondition.map(item => (
                <div key={item.condition} className="p-4 bg-zinc-900 rounded-lg">
                  <p className="text-sm text-zinc-400">{CONDITION_LABELS[item.condition] || item.condition}</p>
                  <p className="text-lg font-semibold text-zinc-100">€{item.avgPricePerM2}/m²</p>
                  <p className="text-xs text-zinc-500">{item.count} nehnuteľností</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
