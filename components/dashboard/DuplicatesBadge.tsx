"use client";

import { useState, useEffect } from "react";
import { Layers, ExternalLink, TrendingDown, TrendingUp } from "lucide-react";

interface DuplicateSource {
  source: string;
  url: string | null;
  price: number;
  lastUpdate: string;
}

interface DuplicatesData {
  sources: DuplicateSource[];
  priceComparison: {
    lowest: number;
    highest: number;
    average: number;
  };
  totalSources: number;
}

// Mapovanie zdrojov na farby a názvy
const SOURCE_INFO: Record<string, { name: string; color: string; bgColor: string }> = {
  NEHNUTELNOSTI: { name: "Nehnutelnosti.sk", color: "text-blue-400", bgColor: "bg-blue-500/20" },
  REALITY: { name: "Reality.sk", color: "text-purple-400", bgColor: "bg-purple-500/20" },
  BAZOS: { name: "Bazoš", color: "text-orange-400", bgColor: "bg-orange-500/20" },
  TOPREALITY: { name: "TopReality", color: "text-green-400", bgColor: "bg-green-500/20" },
};

interface DuplicatesBadgeProps {
  propertyId: string;
  currentPrice: number;
  compact?: boolean;
}

export function DuplicatesBadge({ propertyId, currentPrice, compact = false }: DuplicatesBadgeProps) {
  const [data, setData] = useState<DuplicatesData | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDuplicates = async () => {
      try {
        const response = await fetch(`/api/v1/properties/${propertyId}/duplicates`);
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data.totalSources > 1) {
            setData(result.data);
          }
        }
      } catch (error) {
        console.error("Error fetching duplicates:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDuplicates();
  }, [propertyId]);

  // Nezobrazuj ak sa načítava alebo nie sú duplicity
  if (loading || !data || data.totalSources <= 1) {
    return null;
  }

  const priceDiff = currentPrice - data.priceComparison.lowest;
  const isLowestPrice = currentPrice === data.priceComparison.lowest;
  const savingsPercent = ((priceDiff / currentPrice) * 100).toFixed(1);

  if (compact) {
    return (
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-500/20 text-indigo-400 text-xs rounded-full font-medium hover:bg-indigo-500/30 transition-colors"
        >
          <Layers className="w-3 h-3" />
          <span>{data.totalSources} portály</span>
          {!isLowestPrice && (
            <TrendingDown className="w-3 h-3 text-emerald-400" />
          )}
        </button>

        {/* Dropdown */}
        {isOpen && (
          <div className="absolute top-full left-0 mt-2 z-50 w-72 bg-slate-800 rounded-lg border border-slate-700 shadow-xl p-3">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-slate-200">
                Dostupné na {data.totalSources} portáloch
              </span>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            {/* Price comparison */}
            {!isLowestPrice && (
              <div className="mb-3 p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                <div className="flex items-center gap-2 text-emerald-400">
                  <TrendingDown className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    Lacnejšie o €{priceDiff.toLocaleString()} ({savingsPercent}%)
                  </span>
                </div>
              </div>
            )}

            {/* Sources list */}
            <div className="space-y-2">
              {data.sources.map((source, idx) => {
                const info = SOURCE_INFO[source.source] || {
                  name: source.source,
                  color: "text-slate-400",
                  bgColor: "bg-slate-500/20",
                };
                const isLowest = source.price === data.priceComparison.lowest;

                return (
                  <div
                    key={idx}
                    className={`flex items-center justify-between p-2 rounded-lg ${info.bgColor}`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium ${info.color}`}>
                        {info.name}
                      </span>
                      {isLowest && (
                        <span className="px-1.5 py-0.5 bg-emerald-500/30 text-emerald-400 text-xs rounded">
                          Najlacnejšie
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-200">
                        €{source.price.toLocaleString()}
                      </span>
                      {source.url && (
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-slate-400 hover:text-slate-200"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Price range */}
            <div className="mt-3 pt-3 border-t border-slate-700">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Cenový rozsah:</span>
                <span className="text-slate-300">
                  €{data.priceComparison.lowest.toLocaleString()} - €{data.priceComparison.highest.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Full version
  return (
    <div className="bg-indigo-500/10 rounded-lg border border-indigo-500/20 p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-indigo-400" />
          <span className="text-sm font-medium text-indigo-300">
            Dostupné na {data.totalSources} portáloch
          </span>
        </div>
        {!isLowestPrice && (
          <div className="flex items-center gap-1 text-emerald-400 text-sm">
            <TrendingDown className="w-4 h-4" />
            <span>-{savingsPercent}% inde</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2">
        {data.sources.slice(0, 3).map((source, idx) => {
          const info = SOURCE_INFO[source.source] || {
            name: source.source,
            color: "text-slate-400",
            bgColor: "bg-slate-500/20",
          };
          const isLowest = source.price === data.priceComparison.lowest;

          return (
            <a
              key={idx}
              href={source.url || "#"}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex flex-col items-center p-2 rounded-lg ${info.bgColor} hover:opacity-80 transition-opacity`}
            >
              <span className={`text-xs font-medium ${info.color}`}>
                {info.name.split(".")[0]}
              </span>
              <span className={`text-sm font-bold ${isLowest ? "text-emerald-400" : "text-slate-200"}`}>
                €{(source.price / 1000).toFixed(0)}k
              </span>
              {isLowest && (
                <span className="text-[10px] text-emerald-400">Najlacnejšie</span>
              )}
            </a>
          );
        })}
      </div>
    </div>
  );
}
