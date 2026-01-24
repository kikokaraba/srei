"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Heart,
  Bell,
  BellOff,
  Trash2,
  TrendingUp,
  TrendingDown,
  History,
  ExternalLink,
  Loader2,
  Bookmark,
  BarChart3,
} from "lucide-react";

interface PriceHistoryItem {
  id: string;
  price: number;
  price_per_m2: number;
  recorded_at: string;
}

interface SavedPropertyData {
  id: string;
  propertyId: string;
  notes: string | null;
  isFavorite: boolean;
  alertOnChange: boolean;
  savedAt: string;
  property: {
    id: string;
    title: string;
    address: string;
    city: string;
    district: string;
    price: number;
    area_m2: number;
    price_per_m2: number;
    rooms: number | null;
    source_url: string | null;
    days_on_market: number;
    first_listed_at: string | null;
    priceHistory: PriceHistoryItem[];
    investmentMetrics: {
      gross_yield: number;
    } | null;
  };
}

interface SavedPropertiesProps {
  onSelectProperty?: (propertyId: string) => void;
}

export function SavedProperties({ onSelectProperty }: SavedPropertiesProps) {
  const [savedProperties, setSavedProperties] = useState<SavedPropertyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSavedProperties = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/v1/saved-properties");
      
      if (!response.ok) {
        if (response.status === 401) {
          setSavedProperties([]);
          return;
        }
        throw new Error("Failed to fetch saved properties");
      }
      
      const data = await response.json();
      setSavedProperties(data.data || []);
      setError(null);
    } catch (err) {
      console.error("Error fetching saved properties:", err);
      setError("Nepodarilo sa načítať uložené nehnuteľnosti");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSavedProperties();
  }, [fetchSavedProperties]);

  const toggleFavorite = async (propertyId: string, currentValue: boolean) => {
    try {
      await fetch("/api/v1/saved-properties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertyId, isFavorite: !currentValue }),
      });
      fetchSavedProperties();
    } catch (err) {
      console.error("Error toggling favorite:", err);
    }
  };

  const toggleAlert = async (propertyId: string, currentValue: boolean) => {
    try {
      await fetch("/api/v1/saved-properties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertyId, alertOnChange: !currentValue }),
      });
      fetchSavedProperties();
    } catch (err) {
      console.error("Error toggling alert:", err);
    }
  };

  const removeProperty = async (propertyId: string) => {
    try {
      await fetch(`/api/v1/saved-properties?propertyId=${propertyId}`, {
        method: "DELETE",
      });
      fetchSavedProperties();
    } catch (err) {
      console.error("Error removing property:", err);
    }
  };

  const getPriceChange = (priceHistory: PriceHistoryItem[]) => {
    if (priceHistory.length < 2) return null;
    const latest = priceHistory[0].price;
    const previous = priceHistory[1].price;
    const change = latest - previous;
    const changePercent = (change / previous) * 100;
    return { change, changePercent };
  };

  if (loading) {
    return (
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
        <div className="text-red-400">{error}</div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Bookmark className="w-5 h-5 text-emerald-400" />
          <h2 className="text-xl font-bold text-slate-100">Sledované nehnuteľnosti</h2>
        </div>
        <span className="text-sm text-slate-400">{savedProperties.length} uložených</span>
      </div>

      {savedProperties.length === 0 ? (
        <div className="text-center py-8">
          <Bookmark className="w-12 h-12 text-slate-700 mx-auto mb-4" />
          <p className="text-slate-400 mb-2">Žiadne uložené nehnuteľnosti</p>
          <p className="text-sm text-slate-500">
            Uložte si nehnuteľnosti a sledujte ich cenové zmeny
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {savedProperties.map((saved) => {
            const priceChange = getPriceChange(saved.property.priceHistory);
            
            return (
              <div
                key={saved.id}
                className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50 hover:border-emerald-500/30 transition-colors cursor-pointer"
                onClick={() => onSelectProperty?.(saved.propertyId)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-slate-100 truncate">
                        {saved.property.title}
                      </h3>
                      {saved.isFavorite && (
                        <Heart className="w-4 h-4 text-red-400 fill-red-400" />
                      )}
                    </div>
                    
                    <p className="text-sm text-slate-400 mb-3">
                      {saved.property.district}, {saved.property.city}
                    </p>
                    
                    <div className="flex flex-wrap items-center gap-4 text-sm">
                      <div>
                        <span className="text-slate-500">Cena:</span>{" "}
                        <span className="font-bold text-slate-100">
                          €{saved.property.price.toLocaleString()}
                        </span>
                      </div>
                      
                      <div>
                        <span className="text-slate-500">Plocha:</span>{" "}
                        <span className="text-slate-200">{saved.property.area_m2} m²</span>
                      </div>
                      
                      {saved.property.investmentMetrics && (
                        <div className="flex items-center gap-1">
                          <BarChart3 className="w-4 h-4 text-emerald-400" />
                          <span className="text-emerald-400 font-medium">
                            {saved.property.investmentMetrics.gross_yield.toFixed(1)}%
                          </span>
                        </div>
                      )}
                      
                      {priceChange && (
                        <div className={`flex items-center gap-1 ${
                          priceChange.change < 0 ? "text-emerald-400" : "text-red-400"
                        }`}>
                          {priceChange.change < 0 ? (
                            <TrendingDown className="w-4 h-4" />
                          ) : (
                            <TrendingUp className="w-4 h-4" />
                          )}
                          <span className="font-medium">
                            {priceChange.changePercent > 0 ? "+" : ""}
                            {priceChange.changePercent.toFixed(1)}%
                          </span>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-1 text-slate-400">
                        <History className="w-4 h-4" />
                        <span>{saved.property.days_on_market} dní</span>
                      </div>
                    </div>
                    
                    {saved.notes && (
                      <p className="mt-2 text-sm text-slate-400 italic">
                        "{saved.notes}"
                      </p>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleFavorite(saved.propertyId, saved.isFavorite)}
                      className={`p-2 rounded-lg transition-colors ${
                        saved.isFavorite
                          ? "bg-red-500/20 text-red-400"
                          : "bg-slate-700/50 text-slate-400 hover:text-red-400"
                      }`}
                      title={saved.isFavorite ? "Odstrániť z obľúbených" : "Pridať do obľúbených"}
                    >
                      <Heart className={`w-4 h-4 ${saved.isFavorite ? "fill-current" : ""}`} />
                    </button>
                    
                    <button
                      onClick={() => toggleAlert(saved.propertyId, saved.alertOnChange)}
                      className={`p-2 rounded-lg transition-colors ${
                        saved.alertOnChange
                          ? "bg-emerald-500/20 text-emerald-400"
                          : "bg-slate-700/50 text-slate-400 hover:text-emerald-400"
                      }`}
                      title={saved.alertOnChange ? "Vypnúť upozornenia" : "Zapnúť upozornenia"}
                    >
                      {saved.alertOnChange ? (
                        <Bell className="w-4 h-4" />
                      ) : (
                        <BellOff className="w-4 h-4" />
                      )}
                    </button>
                    
                    {saved.property.source_url && (
                      <a
                        href={saved.property.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-lg bg-slate-700/50 text-slate-400 hover:text-blue-400 transition-colors"
                        title="Otvoriť inzerát"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                    
                    <button
                      onClick={() => removeProperty(saved.propertyId)}
                      className="p-2 rounded-lg bg-slate-700/50 text-slate-400 hover:text-red-400 transition-colors"
                      title="Odstrániť zo sledovaných"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
