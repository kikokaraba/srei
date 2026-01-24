"use client";

import { useQuery } from "@tanstack/react-query";
import { 
  BarChart3, 
  ArrowUpRight, 
  ArrowDownRight, 
  TrendingUp,
  Building2,
  Sparkles
} from "lucide-react";

interface AnalyticsData {
  city: string;
  avg_price_m2: number;
  avg_rent_m2: number;
  yield_benchmark: number;
  volatility_index: number;
  properties_count: number;
  trend: "rising" | "falling" | "stable";
  last_updated: string;
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

const CITY_SHORTS: Record<string, string> = {
  Bratislava: "BA",
  Košice: "KE",
  Prešov: "PO",
  Žilina: "ZA",
  "Banská Bystrica": "BB",
  "B. Bystrica": "BB",
  Trnava: "TT",
  Trenčín: "TN",
  Nitra: "NR",
};

export function MarketOverview() {
  const { data, isLoading } = useQuery({
    queryKey: ["analytics"],
    queryFn: fetchAnalytics,
    refetchInterval: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/20 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-800/50 rounded-lg w-2/3"></div>
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-20 bg-slate-800/30 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const analytics: AnalyticsData[] = data?.data || [];

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/20">
      {/* Ambient glow */}
      <div className="absolute -top-24 -right-24 w-48 h-48 rounded-full blur-3xl opacity-20 bg-emerald-500" />
      
      <div className="relative p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 className="w-5 h-5 text-emerald-400" />
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                Prehľad trhu
              </span>
            </div>
            <h3 className="text-2xl font-bold text-white">
              Slovensko
            </h3>
          </div>
          
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30">
            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            <span className="text-xs font-medium text-emerald-400">Q3 2025</span>
          </div>
        </div>

        {/* Cities Grid */}
        <div className="space-y-2">
          {analytics.slice(0, 4).map((city, index) => {
            const isPositive = (city.price_change_yoy || 0) >= 0;
            const cityShort = CITY_SHORTS[city.city] || city.city.slice(0, 2);
            
            return (
              <div
                key={index}
                className="group relative p-4 rounded-xl bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 
                           hover:border-emerald-500/40 hover:bg-slate-800/50 transition-all duration-300"
              >
                <div className="flex items-center justify-between">
                  {/* Left - City info */}
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-700 to-slate-800 
                                    flex items-center justify-center text-sm font-bold text-slate-300
                                    group-hover:from-emerald-500/20 group-hover:to-emerald-600/20 
                                    group-hover:text-emerald-400 transition-all duration-300">
                      {cityShort}
                    </div>
                    <div>
                      <h4 className="font-semibold text-white">{city.city}</h4>
                      <p className="text-xs text-slate-500">
                        {city.properties_count.toLocaleString()} nehnuteľností
                      </p>
                    </div>
                  </div>
                  
                  {/* Right - Stats */}
                  <div className="flex items-center gap-6">
                    {/* Price */}
                    <div className="text-right hidden sm:block">
                      <p className="text-lg font-bold text-white tabular-nums">
                        €{city.avg_price_m2.toLocaleString()}
                      </p>
                      <p className="text-xs text-slate-500">za m²</p>
                    </div>
                    
                    {/* Yield */}
                    <div className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <span className="text-lg font-bold text-emerald-400 tabular-nums">
                          {city.yield_benchmark.toFixed(1)}%
                        </span>
                        <Sparkles className="w-3 h-3 text-emerald-400" />
                      </div>
                      <p className="text-xs text-slate-500">výnos</p>
                    </div>
                    
                    {/* Change */}
                    <div className={`flex items-center gap-1 px-2 py-1 rounded-lg ${
                      isPositive 
                        ? "bg-emerald-500/10 text-emerald-400" 
                        : "bg-red-500/10 text-red-400"
                    }`}>
                      {isPositive ? (
                        <ArrowUpRight className="w-4 h-4" />
                      ) : (
                        <ArrowDownRight className="w-4 h-4" />
                      )}
                      <span className="text-sm font-semibold tabular-nums">
                        {isPositive ? "+" : ""}{city.price_change_yoy || 0}%
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Demand/Supply Bar */}
                {city.demand_index !== undefined && city.supply_index !== undefined && (
                  <div className="mt-3 pt-3 border-t border-slate-700/50">
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <div className="flex gap-0.5 h-1.5 rounded-full overflow-hidden bg-slate-700/50">
                          <div 
                            className="bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-l-full"
                            style={{ width: `${city.demand_index}%` }}
                          />
                          <div 
                            className="bg-gradient-to-r from-amber-500 to-amber-400 rounded-r-full"
                            style={{ width: `${city.supply_index}%` }}
                          />
                        </div>
                      </div>
                      <span className={`text-xs font-medium ${
                        city.demand_index > city.supply_index ? "text-emerald-400" : "text-amber-400"
                      }`}>
                        {city.demand_index > city.supply_index ? "Vysoký dopyt" : "Vysoká ponuka"}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        
        {/* Footer */}
        {analytics.length > 4 && (
          <button className="w-full mt-4 py-3 flex items-center justify-center gap-2 text-sm font-medium 
                             text-emerald-400 hover:text-emerald-300 transition-colors rounded-xl 
                             bg-slate-800/30 hover:bg-slate-800/50 border border-slate-700/50">
            Zobraziť všetkých {analytics.length} miest
            <TrendingUp className="w-4 h-4" />
          </button>
        )}
        
        {/* Source */}
        <div className="flex items-center justify-center gap-2 mt-4 text-xs text-slate-600">
          <span>NBS</span>
          <span>•</span>
          <span>Aktualizované Q3 2025</span>
        </div>
      </div>
    </div>
  );
}
