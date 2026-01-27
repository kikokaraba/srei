"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Clock, TrendingDown, TrendingUp, AlertTriangle, ArrowRight } from "lucide-react";

interface PriceChange {
  price_diff: number;
  price_diff_percent: number;
  days_since_change: number;
  changed_at: string;
}

interface LiquidityData {
  propertyId: string;
  title: string;
  address: string;
  city?: string;
  days_on_market: number;
  current_price: number;
  price_change: PriceChange | null;
}

export function LiquidityTracker() {
  const [properties, setProperties] = useState<LiquidityData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLiquidityData = useCallback(async () => {
    try {
      setLoading(true);
      
      const response = await fetch("/api/v1/liquidity");
      
      if (!response.ok) {
        if (response.status === 401) {
          setProperties([]);
          return;
        }
        throw new Error("Failed to fetch");
      }
      const data = await response.json();
      setProperties(data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLiquidityData();
  }, [fetchLiquidityData]);

  const sortedProperties = useMemo(() => {
    return [...properties].sort((a, b) => b.days_on_market - a.days_on_market);
  }, [properties]);

  const getDaysColor = (days: number) => {
    if (days >= 180) return "text-red-400";
    if (days >= 90) return "text-amber-400";
    return "text-zinc-400";
  };

  const getDaysLabel = (days: number) => {
    if (days >= 365) return `${Math.floor(days / 365)}r ${days % 365}d`;
    return `${days}d`;
  };

  if (loading) {
    return (
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-900 via-zinc-900 to-rose-950/20 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-zinc-800/50 rounded-lg w-2/3"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-zinc-800/30 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (properties.length === 0) {
    return (
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-900 via-zinc-900 to-rose-950/20 p-6">
        <div className="text-center py-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
            <Clock className="w-8 h-8 text-emerald-400" />
          </div>
          <p className="text-zinc-300 font-medium">Žiadne dlhodobé ponuky</p>
          <p className="text-sm text-zinc-500 mt-1">
            Všetky ponuky sú na trhu menej ako 60 dní
          </p>
          <p className="text-xs text-zinc-600 mt-3">
            Dlhodobé ponuky (60+ dní) môžu byť vhodné na vyjednávanie
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-900 via-zinc-900 to-rose-950/20">
      {/* Ambient glow */}
      <div className="absolute -top-24 -right-24 w-48 h-48 rounded-full blur-3xl opacity-20 bg-rose-500" />
      
      <div className="relative p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-5 h-5 text-rose-400" />
              <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
                Čas na trhu
              </span>
            </div>
            <h3 className="text-2xl font-bold text-white">
              Dlhodobé ponuky
            </h3>
          </div>
          
          <div className="px-3 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/30">
            <span className="text-sm font-bold text-rose-400">{properties.length}</span>
            <span className="text-xs text-zinc-400 ml-1">60+ dní</span>
          </div>
        </div>

        {/* Properties List */}
        <div className="space-y-2">
          {sortedProperties.slice(0, 5).map((property) => (
            <div
              key={property.propertyId}
              className="group relative p-4 rounded-xl bg-zinc-800/30 backdrop-blur-sm border border-zinc-700/50 
                         hover:border-rose-500/40 hover:bg-zinc-800/50 transition-all duration-300"
            >
              <div className="flex items-center justify-between gap-4">
                {/* Left - Days indicator */}
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl bg-zinc-800 flex flex-col items-center justify-center ${
                    property.days_on_market >= 90 ? "border-2 border-rose-500/50" : ""
                  }`}>
                    <span className={`text-lg font-bold ${getDaysColor(property.days_on_market)}`}>
                      {getDaysLabel(property.days_on_market)}
                    </span>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-white truncate text-sm">
                      {property.title}
                    </h4>
                    <p className="text-xs text-zinc-500 truncate">
                      {property.address}
                    </p>
                  </div>
                </div>
                
                {/* Right - Price & Change */}
                <div className="text-right flex-shrink-0">
                  <p className="text-lg font-bold text-white tabular-nums">
                    {(property.current_price / 1000).toFixed(0)}k €
                  </p>
                  
                  {property.price_change && (
                    <div className={`flex items-center justify-end gap-1 text-xs ${
                      property.price_change.price_diff < 0 ? "text-emerald-400" : "text-rose-400"
                    }`}>
                      {property.price_change.price_diff < 0 ? (
                        <TrendingDown className="w-3 h-3" />
                      ) : (
                        <TrendingUp className="w-3 h-3" />
                      )}
                      <span>{Math.abs(property.price_change.price_diff_percent).toFixed(0)}%</span>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Negotiation indicator */}
              {property.days_on_market >= 90 && (
                <div className="mt-3 pt-2 border-t border-zinc-700/50 flex items-center gap-2">
                  <AlertTriangle className="w-3 h-3 text-amber-400" />
                  <span className="text-xs text-amber-400">Vysoký potenciál vyjednávania</span>
                </div>
              )}
            </div>
          ))}
        </div>
        
        {/* Footer */}
        {properties.length > 5 && (
          <button className="w-full mt-4 py-3 flex items-center justify-center gap-2 text-sm font-medium 
                             text-rose-400 hover:text-rose-300 transition-colors rounded-xl 
                             bg-zinc-800/30 hover:bg-zinc-800/50 border border-zinc-700/50">
            Zobraziť všetkých {properties.length}
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
