"use client";

import { useQuery } from "@tanstack/react-query";
import { TrendingUp, Building2, MapPin, Percent, ArrowUp, ArrowDown, Sparkles } from "lucide-react";

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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-28 rounded-2xl bg-slate-800/30 animate-pulse" />
        ))}
      </div>
    );
  }

  const analytics: AnalyticsData[] = data?.data || [];
  const bratislava = analytics.find((a) => a.city === "BRATISLAVA" || a.city === "Bratislava");
  const bestYield = analytics.reduce((best, current) => 
    current.yield_benchmark > (best?.yield_benchmark || 0) ? current : best
  , analytics[0]);

  const avgYield = analytics.length > 0
    ? analytics.reduce((sum, a) => sum + a.yield_benchmark, 0) / analytics.length
    : 0;

  const totalProperties = analytics.reduce((sum, a) => sum + (a.properties_count || 0), 0);

  const cards = [
    {
      title: "Priem. výnos",
      value: `${avgYield.toFixed(1)}%`,
      change: 0.3,
      gradient: "from-emerald-500 to-teal-500",
      bgGlow: "bg-emerald-500",
      icon: Percent,
    },
    {
      title: "Nehnuteľností",
      value: totalProperties.toLocaleString(),
      change: 127,
      isCount: true,
      gradient: "from-violet-500 to-purple-500",
      bgGlow: "bg-violet-500",
      icon: Building2,
    },
    {
      title: "BA cena/m²",
      value: `€${(bratislava?.avg_price_m2 || 0).toLocaleString()}`,
      gradient: "from-blue-500 to-cyan-500",
      bgGlow: "bg-blue-500",
      icon: MapPin,
    },
    {
      title: "Top výnos",
      value: bestYield?.city?.replace("BANSKA_BYSTRICA", "B.B.") || "N/A",
      subtitle: `${bestYield?.yield_benchmark?.toFixed(1) || 0}%`,
      gradient: "from-amber-500 to-orange-500",
      bgGlow: "bg-amber-500",
      icon: TrendingUp,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((card, index) => {
        const Icon = card.icon;
        
        return (
          <div
            key={index}
            className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 p-4"
          >
            {/* Ambient glow */}
            <div className={`absolute -top-12 -right-12 w-24 h-24 rounded-full blur-2xl opacity-20 ${card.bgGlow}`} />
            
            <div className="relative">
              {/* Icon */}
              <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${card.gradient} flex items-center justify-center mb-3 shadow-lg`}>
                <Icon className="w-4 h-4 text-white" />
              </div>
              
              {/* Value */}
              <p className="text-2xl font-bold text-white tabular-nums mb-0.5">
                {card.value}
              </p>
              
              {/* Title & Change */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">{card.title}</span>
                {card.change !== undefined && (
                  <span className={`flex items-center gap-0.5 text-xs font-medium ${
                    card.change > 0 ? "text-emerald-400" : "text-red-400"
                  }`}>
                    {card.change > 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                    {card.isCount ? `+${card.change}` : `${card.change}%`}
                  </span>
                )}
                {card.subtitle && (
                  <span className="flex items-center gap-1 text-xs font-medium text-amber-400">
                    <Sparkles className="w-3 h-3" />
                    {card.subtitle}
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
