"use client";

import { useQuery } from "@tanstack/react-query";
import { TrendingUp, Building2, MapPin, Percent, ArrowUp, ArrowDown } from "lucide-react";

interface AnalyticsData {
  region: string;
  regionName: string;
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
          <div key={i} className="h-24 rounded-xl bg-zinc-900/50 animate-pulse" />
        ))}
      </div>
    );
  }

  const analytics: AnalyticsData[] = data?.data || [];
  const bratislava = analytics.find((a) => a.region === "BA");
  const bestYield = analytics.reduce((best, current) => 
    current.yield_benchmark > (best?.yield_benchmark || 0) ? current : best
  , analytics[0]);

  const avgYield = analytics.length > 0
    ? analytics.reduce((sum, a) => sum + a.yield_benchmark, 0) / analytics.length
    : 0;

  const totalProperties = analytics.reduce((sum, a) => sum + (a.properties_count || 0), 0);

  const cards = [
    {
      label: "PRIEM. VÝNOS",
      value: avgYield.toFixed(1),
      suffix: "%",
      change: 0.3,
      icon: Percent,
      positive: true,
    },
    {
      label: "NEHNUTEĽNOSTÍ",
      value: totalProperties.toLocaleString(),
      change: 127,
      isCount: true,
      icon: Building2,
      positive: true,
    },
    {
      label: "BA CENA/M²",
      value: (bratislava?.avg_price_m2 || 0).toLocaleString(),
      prefix: "€",
      icon: MapPin,
    },
    {
      label: "TOP VÝNOS",
      value: bestYield?.region || "N/A",
      suffix: ` ${bestYield?.yield_benchmark?.toFixed(1) || 0}%`,
      icon: TrendingUp,
      highlight: true,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((card, index) => {
        const Icon = card.icon;
        
        return (
          <div
            key={index}
            className="premium-card p-4 hover:border-zinc-700 transition-all"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <span className="text-[9px] text-zinc-600 font-medium tracking-widest">{card.label}</span>
              <Icon className="w-3.5 h-3.5 text-zinc-600" />
            </div>
            
            {/* Value */}
            <div className="flex items-baseline gap-1">
              {card.prefix && <span className="text-zinc-500 text-sm">{card.prefix}</span>}
              <p className="text-xl font-semibold text-zinc-100 font-mono tracking-tight">
                {card.value}
              </p>
              {card.suffix && (
                <span className={`text-sm font-mono ${card.highlight ? "text-emerald-400" : "text-zinc-500"}`}>
                  {card.suffix}
                </span>
              )}
            </div>
            
            {/* Change indicator */}
            {card.change !== undefined && (
              <div className="flex items-center gap-1 mt-2">
                <span className={`flex items-center gap-0.5 text-[10px] font-mono ${
                  card.positive ? "text-emerald-400" : "text-rose-400"
                }`}>
                  {card.positive ? <ArrowUp className="w-2.5 h-2.5" /> : <ArrowDown className="w-2.5 h-2.5" />}
                  {card.isCount ? `+${card.change}` : `${card.change}%`}
                </span>
                <span className="text-[10px] text-zinc-600">vs minulý týždeň</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
