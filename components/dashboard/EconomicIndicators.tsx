"use client";

import { useQuery } from "@tanstack/react-query";
import { 
  TrendingUp, 
  Percent, 
  Users, 
  Banknote, 
  Home,
  ArrowUp,
  ArrowDown,
  Flame,
  Coins
} from "lucide-react";

interface MarketSummary {
  nationalAvgPrice: number;
  nationalPriceChange: number;
  totalListings: number;
  avgYield: number;
  hottest: string;
  cheapest: string;
  economicIndicators: {
    gdpGrowth: number;
    inflation: number;
    unemployment: number;
    mortgageRate: number;
  };
}

interface MarketResponse {
  success: boolean;
  data: MarketSummary;
  source: string;
  updatedAt: string;
}

async function fetchMarketSummary(): Promise<MarketResponse> {
  const res = await fetch("/api/v1/market-data?type=summary");
  if (!res.ok) throw new Error("Failed to fetch market data");
  return res.json();
}

const CITY_NAMES: Record<string, string> = {
  BRATISLAVA: "Bratislava",
  KOSICE: "Košice",
  ZILINA: "Žilina",
  NITRA: "Nitra",
  PRESOV: "Prešov",
  BANSKA_BYSTRICA: "B. Bystrica",
  TRNAVA: "Trnava",
  TRENCIN: "Trenčín",
};

export function EconomicIndicators() {
  const { data, isLoading } = useQuery({
    queryKey: ["market-summary"],
    queryFn: fetchMarketSummary,
    refetchInterval: 10 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="relative overflow-hidden rounded-2xl bg-[#0f0f0f] p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-zinc-800/50 rounded-lg w-2/3"></div>
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-zinc-800/30 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const summary = data?.data;
  if (!summary) return null;

  const indicators = [
    {
      label: "Cena/m²",
      value: summary.nationalAvgPrice,
      format: (v: number) => `€${v.toLocaleString()}`,
      change: summary.nationalPriceChange,
      icon: Home,
      gradient: "from-emerald-500 to-teal-500",
      bg: "from-emerald-500/10 to-teal-500/10",
    },
    {
      label: "Výnos",
      value: summary.avgYield,
      format: (v: number) => `${v}%`,
      icon: Percent,
      gradient: "from-amber-500 to-orange-500",
      bg: "from-amber-500/10 to-orange-500/10",
    },
    {
      label: "HDP",
      value: summary.economicIndicators.gdpGrowth,
      format: (v: number) => `${v > 0 ? "+" : ""}${v}%`,
      icon: TrendingUp,
      gradient: summary.economicIndicators.gdpGrowth > 0 
        ? "from-emerald-500 to-green-500" 
        : "from-red-500 to-rose-500",
      bg: summary.economicIndicators.gdpGrowth > 0 
        ? "from-emerald-500/10 to-green-500/10" 
        : "from-red-500/10 to-rose-500/10",
    },
    {
      label: "Inflácia",
      value: summary.economicIndicators.inflation,
      format: (v: number) => `${v}%`,
      icon: Banknote,
      gradient: summary.economicIndicators.inflation > 5 
        ? "from-red-500 to-rose-500" 
        : "from-blue-500 to-cyan-500",
      bg: summary.economicIndicators.inflation > 5 
        ? "from-red-500/10 to-rose-500/10" 
        : "from-blue-500/10 to-cyan-500/10",
    },
  ];

  return (
    <div className="relative overflow-hidden rounded-2xl bg-[#0f0f0f]">
      {/* Ambient glow */}
      <div className="absolute -top-24 -right-24 w-48 h-48 rounded-full blur-3xl opacity-20 bg-amber-500" />
      <div className="absolute -bottom-24 -left-24 w-48 h-48 rounded-full blur-3xl opacity-10 bg-orange-500" />
      
      <div className="relative p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-5 h-5 text-amber-400" />
              <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
                Ekonomika
              </span>
            </div>
            <h3 className="text-lg font-semibold text-white">
              Ukazovatele
            </h3>
          </div>
          
          {/* Mortgage rate highlight */}
          <div className="text-right">
            <p className="text-xs text-zinc-500 mb-0.5">Hypotéka</p>
            <p className="text-lg font-semibold text-amber-400 tabular-nums">
              {summary.economicIndicators.mortgageRate}%
            </p>
          </div>
        </div>

        {/* Indicators Grid */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {indicators.map((indicator, index) => {
            const Icon = indicator.icon;
            const isPositive = indicator.change ? indicator.change > 0 : undefined;
            
            return (
              <div
                key={index}
                className={`relative overflow-hidden p-4 rounded-xl bg-gradient-to-br ${indicator.bg} 
                            border border-zinc-700/50 hover:border-zinc-600/50 transition-all duration-300`}
              >
                {/* Icon */}
                <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${indicator.gradient} 
                                flex items-center justify-center mb-3 shadow-lg`}>
                  <Icon className="w-4 h-4 text-white" />
                </div>
                
                {/* Value */}
                <p className="text-lg font-semibold text-white tabular-nums">
                  {indicator.format(indicator.value)}
                </p>
                
                {/* Label & Change */}
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-zinc-400">{indicator.label}</span>
                  {isPositive !== undefined && (
                    <span className={`flex items-center gap-0.5 text-xs font-medium ${
                      isPositive ? "text-emerald-400" : "text-red-400"
                    }`}>
                      {isPositive ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                      {Math.abs(indicator.change!)}%
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Hottest & Cheapest */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-4 rounded-xl bg-gradient-to-br from-orange-500/10 to-red-500/10 
                          border border-orange-500/20 hover:border-orange-500/40 transition-colors">
            <div className="flex items-center gap-2 mb-2">
              <Flame className="w-4 h-4 text-orange-400" />
              <span className="text-xs text-orange-400">Najhorúcejšie</span>
            </div>
            <p className="text-lg font-bold text-white">
              {CITY_NAMES[summary.hottest] || summary.hottest}
            </p>
          </div>
          
          <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-500/10 to-green-500/10 
                          border border-emerald-500/20 hover:border-emerald-500/40 transition-colors">
            <div className="flex items-center gap-2 mb-2">
              <Coins className="w-4 h-4 text-emerald-400" />
              <span className="text-xs text-emerald-400">Najlacnejšie</span>
            </div>
            <p className="text-lg font-bold text-white">
              {CITY_NAMES[summary.cheapest] || summary.cheapest}
            </p>
          </div>
        </div>

        {/* Unemployment & Listings */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-zinc-800/50">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-zinc-500" />
            <span className="text-sm text-zinc-400">
              Nezamestnanosť: <span className="text-white font-semibold">{summary.economicIndicators.unemployment}%</span>
            </span>
          </div>
          <div className="text-sm text-zinc-400">
            <span className="text-white font-semibold">{summary.totalListings.toLocaleString()}</span> ponúk
          </div>
        </div>
        
        {/* Source */}
        <div className="flex items-center justify-center gap-2 mt-4 text-xs text-zinc-600">
          <span>NBS + ŠÚ SR</span>
          <span>•</span>
          <span>Q3 2025</span>
        </div>
      </div>
    </div>
  );
}
