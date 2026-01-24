"use client";

import { useQuery } from "@tanstack/react-query";
import { 
  Flame, 
  TrendingDown, 
  MapPin, 
  ExternalLink,
  Sparkles,
  ArrowRight,
  Zap,
  Settings
} from "lucide-react";
import Link from "next/link";
import { useUserPreferences } from "@/lib/hooks/useUserPreferences";

interface HotDeal {
  id: string;
  title: string;
  city: string;
  district: string;
  price: number;
  pricePerM2: number;
  areaM2: number;
  gapPercentage?: number;
  potentialProfit?: number;
  sourceUrl?: string;
  createdAt: string;
}

interface HotDealsData {
  success: boolean;
  hotDeals: HotDeal[];
  lastScrape?: {
    timestamp: string;
    status: string;
    recordsCount: number;
  };
  stats?: {
    newLast24h: number;
    totalHotDeals: number;
  };
}

async function fetchHotDeals(regions: string[], districts: string[], cities: string[]): Promise<HotDealsData> {
  // Pridaj filtre do URL
  const params = new URLSearchParams();
  if (regions.length > 0) params.set("regions", regions.join(","));
  if (districts.length > 0) params.set("districts", districts.join(","));
  if (cities.length > 0) params.set("cities", cities.join(","));
  
  const url = `/api/v1/scraper/stealth${params.toString() ? `?${params}` : ""}`;
  const response = await fetch(url);
  
  if (!response.ok) {
    // Pre 401/403 vrať prázdne dáta namiesto chyby
    if (response.status === 401 || response.status === 403) {
      return { success: true, hotDeals: [], stats: { newLast24h: 0, totalHotDeals: 0 } };
    }
    throw new Error("Failed to fetch hot deals");
  }
  return response.json();
}

function formatPrice(price: number): string {
  if (price >= 1000000) {
    return `${(price / 1000000).toFixed(2)}M €`;
  }
  if (price >= 1000) {
    return `${(price / 1000).toFixed(0)}k €`;
  }
  return `${price.toLocaleString()} €`;
}

function getCityShort(city: string): string {
  const shorts: Record<string, string> = {
    BRATISLAVA: "BA",
    KOSICE: "KE",
    PRESOV: "PO",
    ZILINA: "ZA",
    BANSKA_BYSTRICA: "BB",
    TRNAVA: "TT",
    TRENCIN: "TN",
    NITRA: "NR",
  };
  return shorts[city] || city.slice(0, 2);
}

export default function HotDeals() {
  const { preferences, hasLocationPreferences } = useUserPreferences();
  
  const regions = preferences?.trackedRegions || [];
  const districts = preferences?.trackedDistricts || [];
  const cities = preferences?.trackedCities || [];
  
  const { data, isLoading, error } = useQuery({
    queryKey: ["hot-deals", regions, districts, cities],
    queryFn: () => fetchHotDeals(regions, districts, cities),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 2 * 60 * 1000,
  });
  
  if (isLoading) {
    return (
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-orange-950/20 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-800/50 rounded-lg w-2/3"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-slate-800/30 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }
  
  if (error || !data?.success) {
    return (
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-orange-950/20 p-6">
        <div className="text-center py-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-amber-500/10 flex items-center justify-center">
            <Flame className="w-8 h-8 text-amber-400" />
          </div>
          <p className="text-slate-400">Načítavam Hot Deals...</p>
        </div>
      </div>
    );
  }
  
  const { hotDeals, stats } = data;
  
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-orange-950/20">
      {/* Ambient glow */}
      <div className="absolute -top-24 -right-24 w-48 h-48 rounded-full blur-3xl opacity-30 bg-orange-500" />
      <div className="absolute -bottom-24 -left-24 w-48 h-48 rounded-full blur-3xl opacity-20 bg-red-500" />
      
      <div className="relative p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Flame className="w-5 h-5 text-orange-400" />
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                Hot Deals
              </span>
              <Sparkles className="w-4 h-4 text-yellow-400" />
            </div>
            <h3 className="text-2xl font-bold text-white">
              Príležitosti
            </h3>
          </div>
          
          {stats && (
            <div className="flex flex-col items-end gap-1">
              <div className="px-3 py-1.5 rounded-full bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-500/30">
                <span className="text-sm font-bold text-orange-400">{stats.totalHotDeals}</span>
                <span className="text-xs text-slate-400 ml-1">aktívnych</span>
              </div>
              {stats.newLast24h > 0 && (
                <span className="text-xs text-emerald-400">+{stats.newLast24h} nových</span>
              )}
            </div>
          )}
        </div>
        
        {/* Deals List */}
        {hotDeals.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-slate-800/50 flex items-center justify-center">
              {hasLocationPreferences ? (
                <TrendingDown className="w-10 h-10 text-slate-600" />
              ) : (
                <Settings className="w-10 h-10 text-slate-600" />
              )}
            </div>
            {hasLocationPreferences ? (
              <>
                <p className="text-slate-400 font-medium">Žiadne Hot Deals vo vašich lokalitách</p>
                <p className="text-sm text-slate-500 mt-1">Čoskoro pribudnú nové</p>
              </>
            ) : (
              <>
                <p className="text-slate-400 font-medium">Nastavte sledované lokality</p>
                <p className="text-sm text-slate-500 mt-1">Pre zobrazenie Hot Deals vo vašom regióne</p>
                <Link 
                  href="/dashboard/settings" 
                  className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-orange-500/20 text-orange-400 rounded-lg text-sm font-medium hover:bg-orange-500/30 transition-colors"
                >
                  <Settings className="w-4 h-4" />
                  Nastavenia
                </Link>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {hotDeals.slice(0, 4).map((deal, index) => (
              <div
                key={deal.id}
                className="group relative p-4 rounded-xl bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 
                           hover:border-orange-500/40 hover:bg-slate-800/50 transition-all duration-300"
              >
                {/* Rank indicator */}
                <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full 
                                bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center 
                                text-xs font-bold text-white shadow-lg shadow-orange-500/30">
                  {index + 1}
                </div>
                
                <div className="ml-6 flex items-center justify-between gap-4">
                  {/* Left - Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 rounded-md bg-slate-700/50 text-xs font-medium text-slate-300">
                        {getCityShort(deal.city)}
                      </span>
                      {deal.gapPercentage && (
                        <span className="px-2 py-0.5 rounded-md bg-red-500/20 text-xs font-bold text-red-400">
                          -{deal.gapPercentage.toFixed(0)}%
                        </span>
                      )}
                    </div>
                    <h4 className="font-medium text-white truncate text-sm">
                      {deal.title}
                    </h4>
                    <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                      <span>{deal.areaM2} m²</span>
                      <span>•</span>
                      <span>{formatPrice(deal.pricePerM2)}/m²</span>
                    </div>
                  </div>
                  
                  {/* Right - Price */}
                  <div className="text-right flex-shrink-0">
                    <div className="text-xl font-bold text-white tabular-nums">
                      {formatPrice(deal.price)}
                    </div>
                    {deal.potentialProfit && deal.potentialProfit > 0 && (
                      <div className="flex items-center justify-end gap-1 text-emerald-400 text-xs mt-1">
                        <Zap className="w-3 h-3" />
                        <span>+{formatPrice(deal.potentialProfit)}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Hover action */}
                {deal.sourceUrl && (
                  <a
                    href={deal.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute inset-0 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm
                               opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl"
                  >
                    <span className="flex items-center gap-2 px-4 py-2 bg-orange-500 rounded-lg text-white font-medium text-sm">
                      Zobraziť <ExternalLink className="w-4 h-4" />
                    </span>
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
        
        {/* Footer */}
        {hotDeals.length > 4 && (
          <button className="w-full mt-4 py-3 flex items-center justify-center gap-2 text-sm font-medium 
                             text-orange-400 hover:text-orange-300 transition-colors rounded-xl 
                             bg-slate-800/30 hover:bg-slate-800/50 border border-slate-700/50">
            Zobraziť všetkých {hotDeals.length}
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
