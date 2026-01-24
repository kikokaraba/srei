"use client";

import { useQuery } from "@tanstack/react-query";
import { BarChart3, ArrowUpRight, ArrowDownRight, TrendingUp, Clock, Activity, Building2 } from "lucide-react";

interface AnalyticsData {
  city: string;
  avg_price_m2: number;
  avg_rent_m2: number;
  yield_benchmark: number;
  volatility_index: number;
  properties_count: number;
  trend: "rising" | "falling" | "stable";
  last_updated: string;
  // Nové polia z reálnych dát NBS
  price_change_yoy?: number;
  price_change_qoq?: number;
  demand_index?: number;
  supply_index?: number;
  avg_days_on_market?: number;
}

interface AnalyticsResponse {
  success: boolean;
  data: AnalyticsData[];
  timestamp: string;
}

async function fetchAnalytics(): Promise<AnalyticsResponse> {
  const res = await fetch("/api/v1/analytics/snapshot");
  if (!res.ok) throw new Error("Failed to fetch analytics");
  return res.json();
}

export function MarketOverview() {
  const { data, isLoading, dataUpdatedAt } = useQuery({
    queryKey: ["analytics"],
    queryFn: fetchAnalytics,
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
  });

  if (isLoading) {
    return (
      <div className="glass-card rounded-2xl p-6">
        <div className="h-6 bg-slate-800 rounded w-48 mb-6 animate-pulse"></div>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-slate-800 rounded-xl animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  const analytics: AnalyticsData[] = data?.data || [];

  return (
    <div className="glass-card rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Prehľad trhu</h2>
            <p className="text-xs text-slate-400">NBS Q3 2025 • Ďalšia aktualizácia: Feb 2026</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
          Live data
        </div>
      </div>

      <div className="space-y-4">
        {analytics.slice(0, 4).map((city, index) => (
          <div
            key={index}
            className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50 hover:border-emerald-500/30 transition-all"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center">
                  <Building2 className="w-4 h-4 text-slate-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">{city.city}</h3>
                  <p className="text-xs text-slate-400">
                    {city.properties_count.toLocaleString()} nehnuteľností
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1">
                  <span className="text-lg font-bold text-emerald-400">
                    {city.yield_benchmark.toFixed(1)}%
                  </span>
                  {city.price_change_yoy && city.price_change_yoy > 0 && (
                    <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                  )}
                </div>
                <p className="text-xs text-slate-400">Hrubý výnos</p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
              <div className="bg-slate-900/50 rounded-lg p-2">
                <p className="text-xs text-slate-500 mb-1">Cena/m²</p>
                <p className="text-sm font-semibold text-white">
                  €{city.avg_price_m2.toLocaleString()}
                </p>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-2">
                <p className="text-xs text-slate-500 mb-1">Nájom/m²</p>
                <p className="text-sm font-semibold text-white">
                  €{city.avg_rent_m2.toFixed(1)}
                </p>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-2">
                <p className="text-xs text-slate-500 mb-1">Zmena YoY</p>
                <p className={`text-sm font-semibold flex items-center gap-1 ${
                  (city.price_change_yoy || 0) > 0 ? "text-emerald-400" : "text-red-400"
                }`}>
                  {city.price_change_yoy ? `${city.price_change_yoy > 0 ? "+" : ""}${city.price_change_yoy}%` : "N/A"}
                </p>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-2">
                <p className="text-xs text-slate-500 mb-1">Dni na trhu</p>
                <p className="text-sm font-semibold text-white flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-400" />
                  {city.avg_days_on_market || "—"}
                </p>
              </div>
            </div>

            {/* Demand/Supply indicator */}
            {city.demand_index !== undefined && city.supply_index !== undefined && (
              <div className="mt-4 pt-3 border-t border-slate-700/50">
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="text-slate-400">Dopyt vs. Ponuka</span>
                  <span className={`font-medium ${
                    city.demand_index > city.supply_index ? "text-emerald-400" : "text-amber-400"
                  }`}>
                    {city.demand_index > city.supply_index ? "Dopyt prevyšuje" : "Ponuka prevyšuje"}
                  </span>
                </div>
                <div className="flex gap-1 h-2">
                  <div 
                    className="bg-emerald-500 rounded-l"
                    style={{ width: `${city.demand_index}%` }}
                  />
                  <div 
                    className="bg-amber-500 rounded-r"
                    style={{ width: `${city.supply_index}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs mt-1">
                  <span className="text-emerald-400">Dopyt: {city.demand_index}</span>
                  <span className="text-amber-400">Ponuka: {city.supply_index}</span>
                </div>
              </div>
            )}

            <div className="mt-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-3 h-3 text-slate-500" />
                <span className="text-xs text-slate-500">
                  Aktualizované: {new Date(city.last_updated).toLocaleDateString("sk-SK")}
                </span>
              </div>
              <span
                className={`text-xs font-medium px-2 py-1 rounded-lg ${
                  city.trend === "rising"
                    ? "bg-emerald-500/20 text-emerald-400"
                    : city.trend === "falling"
                    ? "bg-red-500/20 text-red-400"
                    : "bg-slate-700 text-slate-300"
                }`}
              >
                {city.trend === "rising" ? "↗ RASTÚCI" : city.trend === "falling" ? "↘ KLESAJÚCI" : "→ STABILNÝ"}
              </span>
            </div>
          </div>
        ))}
      </div>
      
      {analytics.length > 4 && (
        <button className="w-full mt-4 py-3 text-sm font-medium text-emerald-400 hover:text-emerald-300 transition-colors">
          Zobraziť všetkých {analytics.length} miest →
        </button>
      )}
    </div>
  );
}
