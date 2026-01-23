"use client";

import { useEffect, useState } from "react";
import { TrendingDown, MapPin, AlertCircle, ExternalLink } from "lucide-react";
import Link from "next/link";

interface MarketGap {
  id: string;
  gap_percentage: number;
  potential_profit: number;
  street_avg_price: number;
  detected_at: string;
  property: {
    id: string;
    title: string;
    address: string;
    price: number;
    price_per_m2: number;
    area_m2: number;
    rooms: number | null;
  };
}

export function MarketGaps() {
  const [gaps, setGaps] = useState<MarketGap[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMarketGaps();
  }, []);

  const fetchMarketGaps = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/v1/market-gaps");
      
      if (!response.ok) {
        // Ak je 401, používateľ nie je prihlásený - to nie je chyba
        if (response.status === 401) {
          setGaps([]);
          setError(null);
          return;
        }
        throw new Error(`Failed to fetch market gaps: ${response.status}`);
      }
      
      const data = await response.json();
      setGaps(data.data || []);
      setError(null);
    } catch (err) {
      console.error("Error fetching market gaps:", err);
      // V development móde zobrazíme len warning, nie error
      if (process.env.NODE_ENV === "development") {
        setGaps([]);
        setError(null);
      } else {
        setError("Nepodarilo sa načítať market gaps");
      }
    } finally {
      setLoading(false);
    }
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

  if (gaps.length === 0) {
    return (
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-emerald-500/10 rounded-lg">
            <TrendingDown className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-100">Index skrytého potenciálu</h3>
            <p className="text-sm text-slate-400">Detekcia podhodnotených nehnuteľností</p>
          </div>
        </div>
        <div className="text-center py-8">
          <p className="text-slate-400">Momentálne nie sú detekované žiadne podhodnotené nehnuteľnosti.</p>
          <p className="text-sm text-slate-500 mt-2">Systém automaticky skenuje trh a upozorní vás na príležitosti.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 rounded-lg">
            <TrendingDown className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-100">Index skrytého potenciálu</h3>
            <p className="text-sm text-slate-400">
              {gaps.length} {gaps.length === 1 ? "podhodnotená nehnuteľnosť" : "podhodnotených nehnuteľností"}
            </p>
          </div>
        </div>
        <button
          onClick={fetchMarketGaps}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm transition-colors"
        >
          Obnoviť
        </button>
      </div>

      <div className="space-y-4">
        {gaps.map((gap) => (
          <div
            key={gap.id}
            className="bg-slate-800/50 rounded-lg border border-emerald-500/20 p-5 hover:border-emerald-500/40 transition-all"
          >
            {/* Push notification style header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <div className="px-2 py-1 bg-emerald-500/20 rounded text-xs font-semibold text-emerald-400">
                    {gap.gap_percentage.toFixed(1)}% pod priemerom
                  </div>
                  <span className="text-xs text-slate-500">
                    {new Date(gap.detected_at).toLocaleDateString("sk-SK")}
                  </span>
                </div>
                <h4 className="text-lg font-bold text-slate-100 mb-1">
                  {gap.property.title}
                </h4>
                <div className="flex items-center gap-2 text-sm text-slate-400 mb-3">
                  <MapPin className="w-4 h-4" />
                  <span>{gap.property.address}</span>
                </div>
              </div>
            </div>

            {/* Key metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div>
                <p className="text-xs text-slate-500 mb-1">Cena</p>
                <p className="text-base font-semibold text-slate-100">
                  {gap.property.price.toLocaleString("sk-SK")} €
                </p>
                <p className="text-xs text-slate-500">
                  {gap.property.price_per_m2.toLocaleString("sk-SK")} €/m²
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Priemer v ulici</p>
                <p className="text-base font-semibold text-slate-300">
                  {gap.street_avg_price.toLocaleString("sk-SK")} €/m²
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Potenciálny zisk</p>
                <p className="text-base font-semibold text-emerald-400">
                  {gap.potential_profit.toLocaleString("sk-SK")} €
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Plocha</p>
                <p className="text-base font-semibold text-slate-100">
                  {gap.property.area_m2} m²
                </p>
                {gap.property.rooms && (
                  <p className="text-xs text-slate-500">{gap.property.rooms} izieb</p>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-3 pt-4 border-t border-slate-700">
              <Link
                href={`/dashboard/properties/${gap.property.id}`}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                Zobraziť detail
              </Link>
              <button className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-sm transition-colors">
                Pridať do porovnania
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
