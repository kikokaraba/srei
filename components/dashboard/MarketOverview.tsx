"use client";

import { useQuery } from "@tanstack/react-query";
import { 
  BarChart3, 
  ArrowUpRight, 
  ArrowDownRight, 
  TrendingUp,
  Sparkles,
  Zap,
} from "lucide-react";
import { useUserPreferences } from "@/lib/hooks/useUserPreferences";

interface RealtimeRegionData {
  region: string;
  city: string;
  avgPricePerM2: number;
  propertyCount: number;
  changeVsLastMonth: number | null;
  changeVsLastWeek: number | null;
}

interface RealtimeResponse {
  success: boolean;
  data: {
    overview: {
      nationalAvg: number;
      nationalMedian: number;
      totalProperties: number;
      newLast24h: number;
      newLast7d: number;
      priceChangeLast30d: number | null;
    };
    regions: RealtimeRegionData[];
    generatedAt: string;
    dataSource: string;
  };
}

// Mapovanie city na skratku
const CITY_TO_SHORT: Record<string, string> = {
  BRATISLAVA: "BA",
  KOSICE: "KE",
  PRESOV: "PO",
  ZILINA: "ZA",
  BANSKA_BYSTRICA: "BB",
  TRNAVA: "TT",
  TRENCIN: "TN",
  NITRA: "NR",
};

// Mapovanie city na názov kraja
const CITY_TO_REGION_NAME: Record<string, string> = {
  BRATISLAVA: "Bratislavský",
  KOSICE: "Košický",
  PRESOV: "Prešovský",
  ZILINA: "Žilinský",
  BANSKA_BYSTRICA: "Banskobystrický",
  TRNAVA: "Trnavský",
  TRENCIN: "Trenčiansky",
  NITRA: "Nitriansky",
};

async function fetchRealtimeStats(): Promise<RealtimeResponse> {
  const res = await fetch("/api/v1/market/realtime");
  if (!res.ok) throw new Error("Failed to fetch realtime stats");
  return res.json();
}

export function MarketOverview() {
  const { preferences, hasLocationPreferences } = useUserPreferences();
  const { data, isLoading } = useQuery({
    queryKey: ["realtime-market"],
    queryFn: fetchRealtimeStats,
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 min
    staleTime: 60 * 1000, // Consider stale after 1 min
  });

  if (isLoading) {
    return (
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-900 via-zinc-900 to-emerald-950/20 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-zinc-800/50 rounded-lg w-2/3"></div>
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-20 bg-zinc-800/30 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const overview = data?.data?.overview;
  const allRegions = data?.data?.regions || [];
  
  // Filtruj podľa preferencií používateľa
  const trackedRegions = preferences?.trackedRegions || [];
  const analytics = hasLocationPreferences && trackedRegions.length > 0
    ? allRegions.filter(r => trackedRegions.includes(CITY_TO_SHORT[r.city] || r.city))
    : allRegions;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-900 via-zinc-900 to-emerald-950/20">
      {/* Ambient glow */}
      <div className="absolute -top-24 -right-24 w-48 h-48 rounded-full blur-3xl opacity-20 bg-emerald-500" />
      
      <div className="relative p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 className="w-5 h-5 text-emerald-400" />
              <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
                Prehľad trhu
              </span>
            </div>
            <h3 className="text-2xl font-bold text-white">
              Slovensko
            </h3>
            {overview && (
              <p className="text-sm text-zinc-400 mt-1">
                Ø €{overview.nationalAvg.toLocaleString()}/m² • {overview.totalProperties.toLocaleString()} nehnuteľností
              </p>
            )}
          </div>
          
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30">
              <Zap className="w-3 h-3 text-emerald-400" />
              <span className="text-xs font-medium text-emerald-400">Real-time</span>
            </div>
            {overview?.priceChangeLast30d !== null && (
              <div className={`text-xs font-medium ${
                (overview?.priceChangeLast30d || 0) >= 0 ? "text-emerald-400" : "text-red-400"
              }`}>
                {(overview?.priceChangeLast30d || 0) >= 0 ? "+" : ""}{overview?.priceChangeLast30d}% za 30 dní
              </div>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        {overview && (
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="p-3 rounded-xl bg-zinc-800/30 border border-zinc-700/50">
              <p className="text-xs text-zinc-500">Nové (24h)</p>
              <p className="text-lg font-bold text-white">{overview.newLast24h}</p>
            </div>
            <div className="p-3 rounded-xl bg-zinc-800/30 border border-zinc-700/50">
              <p className="text-xs text-zinc-500">Nové (7d)</p>
              <p className="text-lg font-bold text-white">{overview.newLast7d}</p>
            </div>
            <div className="p-3 rounded-xl bg-zinc-800/30 border border-zinc-700/50">
              <p className="text-xs text-zinc-500">Celkom</p>
              <p className="text-lg font-bold text-white">{overview.totalProperties.toLocaleString()}</p>
            </div>
          </div>
        )}

        {/* Regions Grid */}
        <div className="space-y-2">
          {analytics.slice(0, 4).map((region, index) => {
            const change = region.changeVsLastMonth;
            const isPositive = (change || 0) >= 0;
            const regionName = CITY_TO_REGION_NAME[region.city] || region.region;
            const shortCode = CITY_TO_SHORT[region.city] || region.city.substring(0, 2);
            
            return (
              <div
                key={index}
                className="group relative p-4 rounded-xl bg-zinc-800/30 backdrop-blur-sm border border-zinc-700/50 
                           hover:border-emerald-500/40 hover:bg-zinc-800/50 transition-all duration-300"
              >
                <div className="flex items-center justify-between">
                  {/* Left - Region info */}
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-zinc-700 to-zinc-800 
                                    flex items-center justify-center text-sm font-bold text-zinc-300
                                    group-hover:from-emerald-500/20 group-hover:to-emerald-600/20 
                                    group-hover:text-emerald-400 transition-all duration-300">
                      {shortCode}
                    </div>
                    <div>
                      <h4 className="font-semibold text-white">{regionName} kraj</h4>
                      <p className="text-xs text-zinc-500">
                        {region.propertyCount.toLocaleString()} nehnuteľností
                      </p>
                    </div>
                  </div>
                  
                  {/* Right - Stats */}
                  <div className="flex items-center gap-4">
                    {/* Price */}
                    <div className="text-right">
                      <p className="text-lg font-bold text-white tabular-nums">
                        €{region.avgPricePerM2.toLocaleString()}
                      </p>
                      <p className="text-xs text-zinc-500">za m²</p>
                    </div>
                    
                    {/* Change */}
                    {change !== null && (
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
                          {isPositive ? "+" : ""}{change}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Weekly change indicator */}
                {region.changeVsLastWeek !== null && (
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-xs text-zinc-500">Týždenná zmena:</span>
                    <span className={`text-xs font-medium ${
                      region.changeVsLastWeek >= 0 ? "text-emerald-400" : "text-red-400"
                    }`}>
                      {region.changeVsLastWeek >= 0 ? "+" : ""}{region.changeVsLastWeek}%
                    </span>
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
                             bg-zinc-800/30 hover:bg-zinc-800/50 border border-zinc-700/50">
            Zobraziť všetkých {analytics.length} krajov
            <TrendingUp className="w-4 h-4" />
          </button>
        )}
        
        {/* Source */}
        <div className="flex items-center justify-center gap-2 mt-4 text-xs text-zinc-600">
          <Zap className="w-3 h-3" />
          <span>SRIA Real-time Data</span>
          <span>•</span>
          <span>Aktualizované každú hodinu</span>
        </div>
      </div>
    </div>
  );
}
