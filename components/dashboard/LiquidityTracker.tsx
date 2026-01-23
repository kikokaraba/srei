"use client";

import { useEffect, useState } from "react";
import { Clock, TrendingDown, TrendingUp, AlertCircle, RefreshCw } from "lucide-react";
import Link from "next/link";

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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLiquidityData();
  }, []);

  const fetchLiquidityData = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/v1/liquidity");
      
      if (!response.ok) {
        throw new Error("Failed to fetch liquidity data");
      }
      
      const data = await response.json();
      setProperties(data.data || []);
      setError(null);
    } catch (err) {
      console.error("Error fetching liquidity data:", err);
      setError("Nepodarilo sa načítať liquidity dáta");
    } finally {
      setLoading(false);
    }
  };

  const formatDays = (days: number): string => {
    if (days === 1) return "1 deň";
    if (days < 5) return `${days} dni`;
    if (days < 365) return `${days} dní`;
    const years = Math.floor(days / 365);
    const remainingDays = days % 365;
    if (remainingDays === 0) {
      return years === 1 ? "1 rok" : `${years} rokov`;
    }
    return `${years} ${years === 1 ? "rok" : "rokov"} ${remainingDays} ${remainingDays === 1 ? "deň" : "dní"}`;
  };

  if (loading) {
    return (
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-slate-800 rounded w-1/3"></div>
          <div className="h-32 bg-slate-800 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
        <div className="text-red-400 flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  if (properties.length === 0) {
    return (
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-rose-500/10 rounded-lg">
            <Clock className="w-6 h-6 text-rose-400" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-100">Čas na trhu</h3>
            <p className="text-sm text-slate-400">Sledovanie dní v ponuke a zmien cien</p>
          </div>
        </div>
        <div className="text-center py-8">
          <p className="text-slate-400">Momentálne nie sú k dispozícii žiadne dáta.</p>
        </div>
      </div>
    );
  }

  // Zoradiť podľa dní v ponuke (najdlhšie prvé)
  const sortedProperties = [...properties].sort((a, b) => b.days_on_market - a.days_on_market);

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-rose-500/10 rounded-lg">
            <Clock className="w-6 h-6 text-rose-400" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-100">Čas na trhu</h3>
            <p className="text-sm text-slate-400">
              {properties.length} {properties.length === 1 ? "nehnuteľnosť" : "nehnuteľností"} v ponuke viac ako 60 dní
            </p>
          </div>
        </div>
        <button
          onClick={fetchLiquidityData}
          className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
          title="Obnoviť dáta"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      <div className="space-y-3">
        {sortedProperties.slice(0, 10).map((property) => (
          <div
            key={property.propertyId}
            className="bg-slate-800/50 rounded-lg border border-slate-700 p-4 hover:border-rose-500/40 transition-all"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h4 className="text-base font-semibold text-slate-100 mb-1 truncate">
                  {property.title}
                </h4>
                <p className="text-sm text-slate-400 mb-3 truncate">
                  {property.address}
                  {property.city && ` • ${property.city}`}
                </p>

                {/* Stopky - dni v ponuke */}
                <div className="flex items-center gap-4 mb-2">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-rose-400" />
                    <span className="text-sm font-medium text-slate-300">
                      V ponuke: <span className="text-rose-400">{formatDays(property.days_on_market)}</span>
                    </span>
                  </div>
                </div>

                {/* Zmena ceny */}
                {property.price_change && (
                  <div className="flex items-center gap-2 mt-2">
                    {property.price_change.price_diff < 0 ? (
                      <TrendingDown className="w-4 h-4 text-emerald-400" />
                    ) : property.price_change.price_diff > 0 ? (
                      <TrendingUp className="w-4 h-4 text-rose-400" />
                    ) : null}
                    <span className="text-xs text-slate-400">
                      Cena{" "}
                      {property.price_change.price_diff < 0 ? (
                        <span className="text-emerald-400 font-semibold">
                          klesla pred {property.price_change.days_since_change}{" "}
                          {property.price_change.days_since_change === 1 ? "dňom" : "dňami"} o{" "}
                          {Math.abs(property.price_change.price_diff_percent).toFixed(1)}%
                        </span>
                      ) : property.price_change.price_diff > 0 ? (
                        <span className="text-rose-400 font-semibold">
                          stúpla pred {property.price_change.days_since_change}{" "}
                          {property.price_change.days_since_change === 1 ? "dňom" : "dňami"} o{" "}
                          {property.price_change.price_diff_percent.toFixed(1)}%
                        </span>
                      ) : (
                        <span className="text-slate-500">nezmenila sa</span>
                      )}
                    </span>
                  </div>
                )}
              </div>

              <div className="text-right flex-shrink-0">
                <p className="text-lg font-bold text-slate-100 mb-1">
                  {property.current_price.toLocaleString("sk-SK")} €
                </p>
                <Link
                  href={`/dashboard/properties/${property.propertyId}`}
                  className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
                >
                  Zobraziť detail →
                </Link>
              </div>
            </div>

            {/* Indikátor zúfalosti (čím dlhšie v ponuke, tým viac zúfalý) */}
            {property.days_on_market >= 90 && (
              <div className="mt-3 pt-3 border-t border-slate-700">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400" />
                  <span className="text-xs text-rose-400 font-medium">
                    Vysoký potenciál na vyjednávanie - nehnuteľnosť je v ponuke viac ako 3 mesiace
                  </span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {properties.length > 10 && (
        <div className="mt-4 text-center">
          <button className="text-sm text-slate-400 hover:text-slate-300 transition-colors">
            Zobraziť všetkých {properties.length} nehnuteľností →
          </button>
        </div>
      )}
    </div>
  );
}
