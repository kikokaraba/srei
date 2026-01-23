"use client";

import { useQuery } from "@tanstack/react-query";
import { BarChart3, ArrowUpRight, ArrowDownRight } from "lucide-react";

interface AnalyticsData {
  city: string;
  avg_price_m2: number;
  avg_rent_m2: number;
  yield_benchmark: number;
  volatility_index: number;
  properties_count: number;
  trend: "rising" | "falling" | "stable";
  last_updated: string;
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
  const { data, isLoading } = useQuery({
    queryKey: ["analytics"],
    queryFn: fetchAnalytics,
  });

  if (isLoading) {
    return (
      <div className="bg-slate-900 rounded-lg border border-slate-800 p-6">
        <div className="h-6 bg-slate-800 rounded w-48 mb-6 animate-pulse"></div>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 bg-slate-800 rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  const analytics: AnalyticsData[] = data?.data || [];

  return (
    <div className="bg-slate-900 rounded-lg border border-slate-800 p-6">
      <div className="flex items-center gap-2 mb-6">
        <BarChart3 className="w-5 h-5 text-emerald-400" />
        <h2 className="text-xl font-bold text-slate-100">Market Overview</h2>
      </div>

      <div className="space-y-4">
        {analytics.map((city, index) => (
          <div
            key={index}
            className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50"
          >
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-semibold text-slate-100">{city.city}</h3>
                <p className="text-sm text-slate-400">
                  {city.properties_count} properties
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-emerald-400">
                  {city.yield_benchmark.toFixed(2)}%
                </p>
                <p className="text-xs text-slate-400">Yield</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mt-4">
              <div>
                <p className="text-xs text-slate-500 mb-1">Avg Price/m²</p>
                <p className="text-sm font-medium text-slate-200">
                  €{city.avg_price_m2.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Avg Rent/m²</p>
                <p className="text-sm font-medium text-slate-200">
                  €{city.avg_rent_m2.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Risk Index</p>
                <div className="flex items-center gap-1">
                  <p className="text-sm font-medium text-slate-200">
                    {(city.volatility_index * 100).toFixed(0)}%
                  </p>
                  {city.volatility_index < 0.4 ? (
                    <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <ArrowDownRight className="w-4 h-4 text-amber-400" />
                  )}
                </div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-700">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Trend</span>
                <span
                  className={`text-xs font-medium px-2 py-1 rounded ${
                    city.trend === "rising"
                      ? "bg-emerald-500/20 text-emerald-400"
                      : city.trend === "falling"
                      ? "bg-red-500/20 text-red-400"
                      : "bg-slate-700 text-slate-300"
                  }`}
                >
                  {city.trend.toUpperCase()}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
