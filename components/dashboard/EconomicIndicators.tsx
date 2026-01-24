"use client";

import { useQuery } from "@tanstack/react-query";
import { 
  TrendingUp, 
  TrendingDown, 
  Percent, 
  Users, 
  Banknote, 
  Building, 
  Home,
  ArrowUpRight,
  ArrowDownRight,
  Minus
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

// Mapovanie miest na slovenské názvy
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
    refetchInterval: 10 * 60 * 1000, // Refresh every 10 minutes
  });

  if (isLoading) {
    return (
      <div className="glass-card rounded-2xl p-6">
        <div className="h-6 bg-slate-800 rounded w-48 mb-6 animate-pulse"></div>
        <div className="grid grid-cols-2 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-20 bg-slate-800 rounded-xl animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  const summary = data?.data;
  if (!summary) return null;

  const indicators = [
    {
      label: "Priemerná cena/m²",
      value: `€${summary.nationalAvgPrice.toLocaleString()}`,
      change: summary.nationalPriceChange,
      icon: Home,
      color: "emerald",
    },
    {
      label: "Priemerný výnos",
      value: `${summary.avgYield}%`,
      change: null,
      icon: Percent,
      color: "gold",
    },
    {
      label: "Aktívne ponuky",
      value: summary.totalListings.toLocaleString(),
      change: null,
      icon: Building,
      color: "slate",
    },
    {
      label: "Rast HDP",
      value: `${summary.economicIndicators.gdpGrowth}%`,
      change: null,
      icon: TrendingUp,
      color: summary.economicIndicators.gdpGrowth > 0 ? "emerald" : "red",
    },
    {
      label: "Inflácia",
      value: `${summary.economicIndicators.inflation}%`,
      change: null,
      icon: Banknote,
      color: summary.economicIndicators.inflation > 5 ? "amber" : "emerald",
    },
    {
      label: "Nezamestnanosť",
      value: `${summary.economicIndicators.unemployment}%`,
      change: null,
      icon: Users,
      color: summary.economicIndicators.unemployment < 6 ? "emerald" : "amber",
    },
  ];

  return (
    <div className="glass-card rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gold-500/10 border border-gold-500/20 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-gold-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Ekonomické ukazovatele</h2>
            <p className="text-xs text-slate-400">Slovensko Q4 2025</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-500">Hypotekárna sadzba</p>
          <p className="text-lg font-bold text-amber-400">
            {summary.economicIndicators.mortgageRate}%
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {indicators.map((indicator, index) => {
          const Icon = indicator.icon;
          const colorClasses = {
            emerald: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
            gold: "bg-gold-500/10 border-gold-500/20 text-gold-400",
            amber: "bg-amber-500/10 border-amber-500/20 text-amber-400",
            red: "bg-red-500/10 border-red-500/20 text-red-400",
            slate: "bg-slate-700/50 border-slate-600 text-slate-400",
          };
          const colors = colorClasses[indicator.color as keyof typeof colorClasses];
          
          return (
            <div
              key={index}
              className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-7 h-7 rounded-lg ${colors} border flex items-center justify-center`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs text-slate-400">{indicator.label}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold text-white">{indicator.value}</span>
                {indicator.change !== null && (
                  <span className={`text-xs font-medium flex items-center gap-0.5 ${
                    indicator.change > 0 ? "text-emerald-400" : indicator.change < 0 ? "text-red-400" : "text-slate-400"
                  }`}>
                    {indicator.change > 0 ? (
                      <ArrowUpRight className="w-3 h-3" />
                    ) : indicator.change < 0 ? (
                      <ArrowDownRight className="w-3 h-3" />
                    ) : (
                      <Minus className="w-3 h-3" />
                    )}
                    {Math.abs(indicator.change)}%
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Hottest & Cheapest cities */}
      <div className="mt-4 pt-4 border-t border-slate-700/50 grid grid-cols-2 gap-4">
        <div className="bg-emerald-500/5 rounded-xl p-3 border border-emerald-500/20">
          <p className="text-xs text-emerald-400 mb-1">🔥 Najhorúcejšie mesto</p>
          <p className="text-lg font-bold text-white">
            {CITY_NAMES[summary.hottest] || summary.hottest}
          </p>
          <p className="text-xs text-slate-400">Najvyšší dopyt</p>
        </div>
        <div className="bg-gold-500/5 rounded-xl p-3 border border-gold-500/20">
          <p className="text-xs text-gold-400 mb-1">💰 Najlacnejšie mesto</p>
          <p className="text-lg font-bold text-white">
            {CITY_NAMES[summary.cheapest] || summary.cheapest}
          </p>
          <p className="text-xs text-slate-400">Najnižšie ceny</p>
        </div>
      </div>
      
      <p className="text-xs text-slate-500 mt-4 text-center">
        Zdroj: NBS, Štatistický úrad SR • Aktualizované: {new Date(data?.updatedAt || Date.now()).toLocaleDateString("sk-SK")}
      </p>
    </div>
  );
}
