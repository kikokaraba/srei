"use client";

import { useQuery } from "@tanstack/react-query";
import { 
  Flame, 
  TrendingDown, 
  MapPin, 
  ExternalLink,
  Clock,
  AlertCircle,
  Sparkles,
  Euro
} from "lucide-react";

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

async function fetchHotDeals(): Promise<HotDealsData> {
  const response = await fetch("/api/v1/scraper/stealth");
  if (!response.ok) {
    throw new Error("Failed to fetch hot deals");
  }
  return response.json();
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat("sk-SK", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(price);
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffMins < 60) return `pred ${diffMins} min`;
  if (diffHours < 24) return `pred ${diffHours} hod`;
  return `pred ${diffDays} dňami`;
}

function getCityName(city: string): string {
  const names: Record<string, string> = {
    BRATISLAVA: "Bratislava",
    KOSICE: "Košice",
    PRESOV: "Prešov",
    ZILINA: "Žilina",
    BANSKA_BYSTRICA: "Banská Bystrica",
    TRNAVA: "Trnava",
    TRENCIN: "Trenčín",
    NITRA: "Nitra",
    MARTIN: "Martin",
    POPRAD: "Poprad",
  };
  return names[city] || city;
}

export default function HotDeals() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["hot-deals"],
    queryFn: fetchHotDeals,
    refetchInterval: 5 * 60 * 1000, // Refresh každých 5 minút
    staleTime: 2 * 60 * 1000,
  });
  
  if (isLoading) {
    return (
      <div className="glass-card p-6 animate-pulse">
        <div className="h-6 bg-slate-700/50 rounded w-1/3 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 bg-slate-700/30 rounded" />
          ))}
        </div>
      </div>
    );
  }
  
  if (error || !data?.success) {
    return (
      <div className="glass-card p-6">
        <div className="flex items-center gap-2 text-amber-400 mb-4">
          <AlertCircle className="w-5 h-5" />
          <span>Chyba pri načítaní Hot Deals</span>
        </div>
        <p className="text-slate-400 text-sm">
          Skontrolujte pripojenie a skúste znova.
        </p>
      </div>
    );
  }
  
  const { hotDeals, lastScrape, stats } = data;
  
  return (
    <div className="glass-card p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500/20 to-red-500/20">
            <Flame className="w-5 h-5 text-orange-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              Hot Deals
              <Sparkles className="w-4 h-4 text-yellow-400" />
            </h3>
            <p className="text-sm text-slate-400">
              Nehnuteľnosti 15%+ pod trhovou cenou
            </p>
          </div>
        </div>
        
        {/* Stats Badge */}
        {stats && (
          <div className="flex items-center gap-4 text-sm">
            <div className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400">
              {stats.totalHotDeals} aktívnych
            </div>
            <div className="px-3 py-1 rounded-full bg-slate-700/50 text-slate-300">
              +{stats.newLast24h} za 24h
            </div>
          </div>
        )}
      </div>
      
      {/* Last Scrape Info */}
      {lastScrape && (
        <div className="flex items-center gap-2 text-xs text-slate-500 mb-4 pb-4 border-b border-slate-700/50">
          <Clock className="w-3 h-3" />
          <span>
            Posledná aktualizácia: {new Date(lastScrape.timestamp).toLocaleString("sk-SK")}
            {" • "}
            {lastScrape.recordsCount} záznamov
            {" • "}
            Stav: <span className={lastScrape.status === "success" ? "text-emerald-400" : "text-amber-400"}>
              {lastScrape.status}
            </span>
          </span>
        </div>
      )}
      
      {/* Hot Deals List */}
      {hotDeals.length === 0 ? (
        <div className="text-center py-8 text-slate-400">
          <TrendingDown className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Zatiaľ žiadne Hot Deals</p>
          <p className="text-sm mt-1">Spustite scraper pre nájdenie príležitostí</p>
        </div>
      ) : (
        <div className="space-y-3">
          {hotDeals.map((deal, index) => (
            <div
              key={deal.id}
              className="group relative p-4 rounded-xl bg-slate-800/50 border border-slate-700/50 
                         hover:border-orange-500/30 hover:bg-slate-800/70 transition-all duration-200"
            >
              {/* Ranking Badge */}
              <div className="absolute -top-2 -left-2 w-6 h-6 rounded-full bg-gradient-to-br from-orange-500 to-red-500 
                              flex items-center justify-center text-xs font-bold text-white shadow-lg">
                {index + 1}
              </div>
              
              <div className="flex items-start justify-between gap-4">
                {/* Left - Info */}
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-white truncate pr-4">
                    {deal.title}
                  </h4>
                  
                  <div className="flex items-center gap-2 mt-1 text-sm text-slate-400">
                    <MapPin className="w-3 h-3" />
                    <span>{getCityName(deal.city)}</span>
                    <span className="text-slate-600">•</span>
                    <span>{deal.district}</span>
                  </div>
                  
                  <div className="flex items-center gap-3 mt-2">
                    {/* Plocha */}
                    <span className="text-sm text-slate-300">
                      {deal.areaM2} m²
                    </span>
                    
                    {/* Cena za m² */}
                    <span className="text-sm text-slate-400">
                      {formatPrice(deal.pricePerM2)}/m²
                    </span>
                    
                    {/* Gap Badge */}
                    {deal.gapPercentage && (
                      <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-xs font-medium">
                        -{deal.gapPercentage.toFixed(1)}%
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Right - Price & Action */}
                <div className="text-right flex-shrink-0">
                  <div className="text-lg font-bold text-white">
                    {formatPrice(deal.price)}
                  </div>
                  
                  {deal.potentialProfit && deal.potentialProfit > 0 && (
                    <div className="flex items-center gap-1 text-emerald-400 text-sm mt-1">
                      <Euro className="w-3 h-3" />
                      <span>+{formatPrice(deal.potentialProfit)} potenciál</span>
                    </div>
                  )}
                  
                  <div className="text-xs text-slate-500 mt-1">
                    {formatTimeAgo(deal.createdAt)}
                  </div>
                  
                  {/* Link to source */}
                  {deal.sourceUrl && (
                    <a
                      href={deal.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 mt-2 text-xs text-emerald-400 
                                 hover:text-emerald-300 transition-colors"
                    >
                      <span>Zobraziť</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Footer - View All */}
      {hotDeals.length > 0 && (
        <div className="mt-4 pt-4 border-t border-slate-700/50 text-center">
          <button className="text-sm text-emerald-400 hover:text-emerald-300 transition-colors">
            Zobraziť všetky Hot Deals →
          </button>
        </div>
      )}
    </div>
  );
}
