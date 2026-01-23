"use client";

import { useQuery } from "@tanstack/react-query";
import { TrendingUp, DollarSign, MapPin } from "lucide-react";

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

export function AnalyticsCards() {
  const { data, isLoading } = useQuery({
    queryKey: ["analytics"],
    queryFn: fetchAnalytics,
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="bg-slate-900 rounded-lg border border-slate-800 p-6 animate-pulse"
          >
            <div className="h-4 bg-slate-800 rounded w-24 mb-4"></div>
            <div className="h-8 bg-slate-800 rounded w-32"></div>
          </div>
        ))}
      </div>
    );
  }

  const analytics: AnalyticsData[] = data?.data || [];
  const bratislava = analytics.find((a) => a.city === "BRATISLAVA");
  const nitra = analytics.find((a) => a.city === "NITRA");

  const avgYield =
    analytics.length > 0
      ? analytics.reduce((sum, a) => sum + a.yield_benchmark, 0) /
        analytics.length
      : 0;

  const totalProperties = analytics.reduce(
    (sum, a) => sum + (a.properties_count || 0),
    0
  );

  const cards = [
    {
      title: "Average Yield",
      value: `${avgYield.toFixed(2)}%`,
      icon: TrendingUp,
      change: "+0.3%",
      trend: "up",
      color: "emerald",
    },
    {
      title: "Total Properties",
      value: totalProperties.toLocaleString(),
      icon: MapPin,
      change: "+127",
      trend: "up",
      color: "gold",
    },
    {
      title: "Bratislava Avg Price",
      value: `€${bratislava?.avg_price_m2.toLocaleString() || 0}/m²`,
      icon: DollarSign,
      change: "Stable",
      trend: "neutral",
      color: "slate",
    },
    {
      title: "Top Yield City",
      value: nitra?.city || "N/A",
      icon: TrendingUp,
      change: `${nitra?.yield_benchmark.toFixed(1)}%`,
      trend: "up",
      color: "emerald",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, index) => {
        const Icon = card.icon;
        const colorClasses = {
          emerald: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
          gold: "text-gold-400 bg-gold-400/10 border-gold-400/20",
          slate: "text-slate-400 bg-slate-800 border-slate-700",
        };

        return (
          <div
            key={index}
            className={`bg-slate-900 rounded-lg border ${colorClasses[card.color as keyof typeof colorClasses]} p-6`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`p-2 rounded-lg ${colorClasses[card.color as keyof typeof colorClasses]}`}>
                <Icon className="w-5 h-5" />
              </div>
              {card.trend === "up" && (
                <span className="text-xs text-emerald-400 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  {card.change}
                </span>
              )}
              {card.trend === "neutral" && (
                <span className="text-xs text-slate-400">{card.change}</span>
              )}
            </div>
            <h3 className="text-sm text-slate-400 mb-1">{card.title}</h3>
            <p className="text-2xl font-bold text-slate-100">{card.value}</p>
          </div>
        );
      })}
    </div>
  );
}
