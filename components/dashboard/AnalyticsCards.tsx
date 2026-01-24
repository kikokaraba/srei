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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 lg:gap-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="bg-slate-900 rounded-lg border border-slate-800 p-3 sm:p-4 lg:p-6 animate-pulse"
          >
            <div className="h-3 sm:h-4 bg-slate-800 rounded w-16 sm:w-24 mb-3 sm:mb-4"></div>
            <div className="h-6 sm:h-8 bg-slate-800 rounded w-20 sm:w-32"></div>
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
      title: "Priemerný výnos",
      value: `${avgYield.toFixed(2)}%`,
      icon: TrendingUp,
      change: "+0.3%",
      trend: "up",
      color: "emerald",
    },
    {
      title: "Celkom nehnuteľností",
      value: totalProperties.toLocaleString(),
      icon: MapPin,
      change: "+127",
      trend: "up",
      color: "gold",
    },
    {
      title: "Priemerná cena Bratislava",
      value: `€${bratislava?.avg_price_m2.toLocaleString() || 0}/m²`,
      icon: DollarSign,
      change: "Stabilná",
      trend: "neutral",
      color: "slate",
    },
    {
      title: "Mesto s najvyšším výnosom",
      value: nitra?.city || "N/A",
      icon: TrendingUp,
      change: `${nitra?.yield_benchmark.toFixed(1)}%`,
      trend: "up",
      color: "emerald",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 lg:gap-4">
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
            className={`bg-slate-900 rounded-lg border ${colorClasses[card.color as keyof typeof colorClasses]} p-3 sm:p-4 lg:p-6`}
          >
            <div className="flex items-center justify-between mb-2 sm:mb-3 lg:mb-4">
              <div className={`p-1.5 sm:p-2 rounded-lg ${colorClasses[card.color as keyof typeof colorClasses]}`}>
                <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              {card.trend === "up" && (
                <span className="text-[10px] sm:text-xs text-emerald-400 flex items-center gap-0.5 sm:gap-1">
                  <TrendingUp className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                  <span className="hidden sm:inline">{card.change}</span>
                </span>
              )}
              {card.trend === "neutral" && (
                <span className="text-[10px] sm:text-xs text-slate-400 hidden sm:block">{card.change}</span>
              )}
            </div>
            <h3 className="text-xs sm:text-sm text-slate-400 mb-0.5 sm:mb-1 line-clamp-1">{card.title}</h3>
            <p className="text-lg sm:text-xl lg:text-2xl font-bold text-slate-100 truncate">{card.value}</p>
          </div>
        );
      })}
    </div>
  );
}
