"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Plus,
  X,
  Search,
  Home,
  MapPin,
  Euro,
  TrendingUp,
  Ruler,
  Calendar,
  Check,
  Loader2,
  Scale,
  ArrowRight,
} from "lucide-react";
import { getCityRegionLabel, CONDITION_LABELS } from "@/lib/constants";

interface Property {
  id: string;
  title: string;
  city: string;
  district: string;
  address: string;
  price: number;
  area_m2: number;
  price_per_m2: number;
  rooms: number | null;
  condition: string;
  days_on_market: number;
  investmentMetrics: {
    gross_yield: number;
    net_yield: number;
    cash_on_cash: number;
    price_to_rent_ratio: number;
  } | null;
}

// Compare two values and return which is better
function compareValues(a: number, b: number, higherIsBetter: boolean): "a" | "b" | "equal" {
  if (Math.abs(a - b) < 0.01) return "equal";
  if (higherIsBetter) {
    return a > b ? "a" : "b";
  }
  return a < b ? "a" : "b";
}

export function PropertyComparison() {
  const [selectedProperties, setSelectedProperties] = useState<Property[]>([]);
  const [searchResults, setSearchResults] = useState<Property[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  const MAX_PROPERTIES = 3;

  const searchProperties = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setSearching(true);
      const response = await fetch(`/api/v1/properties/filtered?search=${encodeURIComponent(query)}&limit=10`);
      if (response.ok) {
        const data = await response.json();
        // Filter out already selected properties
        const filtered = (data.data || []).filter(
          (p: Property) => !selectedProperties.some((sp) => sp.id === p.id)
        );
        setSearchResults(filtered);
      }
    } catch (error) {
      console.error("Error searching properties:", error);
    } finally {
      setSearching(false);
    }
  }, [selectedProperties]);

  useEffect(() => {
    const timer = setTimeout(() => {
      searchProperties(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, searchProperties]);

  const addProperty = (property: Property) => {
    if (selectedProperties.length < MAX_PROPERTIES) {
      setSelectedProperties([...selectedProperties, property]);
      setSearchQuery("");
      setSearchResults([]);
      setShowSearch(false);
    }
  };

  const removeProperty = (id: string) => {
    setSelectedProperties(selectedProperties.filter((p) => p.id !== id));
  };

  // Calculate 10-year ROI projection
  const calculateROI = (property: Property) => {
    if (!property.investmentMetrics) return null;
    
    const annualYield = property.investmentMetrics.net_yield / 100;
    const appreciation = 0.03; // Assume 3% annual appreciation
    const years = 10;
    
    let totalValue = property.price;
    let totalRent = 0;
    
    for (let i = 0; i < years; i++) {
      totalRent += totalValue * annualYield;
      totalValue *= (1 + appreciation);
    }
    
    const totalReturn = totalValue - property.price + totalRent;
    const roi = (totalReturn / property.price) * 100;
    
    return {
      finalValue: Math.round(totalValue),
      totalRent: Math.round(totalRent),
      totalReturn: Math.round(totalReturn),
      roi: roi,
    };
  };

  return (
    <div className="space-y-6">
      {/* Selected Properties Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Render selected properties */}
        {selectedProperties.map((property, idx) => (
          <div
            key={property.id}
            className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden"
          >
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
              <span className="text-sm text-zinc-400">Nehnuteľnosť {idx + 1}</span>
              <button
                onClick={() => removeProperty(property.id)}
                className="p-1 text-zinc-400 hover:text-red-400 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4">
              <h3 className="font-semibold text-zinc-100 mb-2 line-clamp-2">
                {property.title}
              </h3>
              <div className="flex items-center gap-1 text-sm text-zinc-400 mb-4">
                <MapPin className="w-4 h-4" />
                <span>{property.district}, {getCityRegionLabel(property.city)}</span>
              </div>
              <div className="text-2xl font-bold text-zinc-100">
                €{property.price.toLocaleString()}
              </div>
            </div>
          </div>
        ))}

        {/* Add property slots */}
        {Array.from({ length: MAX_PROPERTIES - selectedProperties.length }).map((_, idx) => (
          <div
            key={`empty-${idx}`}
            className="bg-zinc-900 rounded-xl border border-dashed border-zinc-700 min-h-[200px] flex items-center justify-center cursor-pointer hover:border-emerald-500/50 transition-colors"
            onClick={() => setShowSearch(true)}
          >
            <div className="text-center">
              <Plus className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
              <p className="text-zinc-400">Pridať nehnuteľnosť</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search Modal */}
      {showSearch && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 w-full max-w-lg max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
              <h3 className="font-bold text-zinc-100">Vyhľadať nehnuteľnosť</h3>
              <button
                onClick={() => {
                  setShowSearch(false);
                  setSearchQuery("");
                  setSearchResults([]);
                }}
                className="p-1 text-zinc-400 hover:text-zinc-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Hľadať podľa názvu alebo adresy..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-emerald-500"
                  autoFocus
                />
              </div>
            </div>

            <div className="max-h-[400px] overflow-y-auto">
              {searching ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
                </div>
              ) : searchResults.length > 0 ? (
                <div className="divide-y divide-zinc-800">
                  {searchResults.map((property) => (
                    <div
                      key={property.id}
                      className="p-4 hover:bg-zinc-800/50 cursor-pointer transition-colors"
                      onClick={() => addProperty(property)}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-zinc-100 truncate">
                            {property.title}
                          </h4>
                          <div className="flex items-center gap-1 text-sm text-zinc-400 mt-1">
                            <MapPin className="w-3 h-3" />
                            <span>{property.district}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-zinc-100">
                            €{property.price.toLocaleString()}
                          </div>
                          <div className="text-sm text-zinc-400">
                            {property.area_m2} m²
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : searchQuery ? (
                <div className="text-center py-8 text-zinc-400">
                  Žiadne výsledky pre "{searchQuery}"
                </div>
              ) : (
                <div className="text-center py-8 text-zinc-400">
                  Začnite písať pre vyhľadávanie
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Comparison Table */}
      {selectedProperties.length >= 2 && (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
          <div className="p-4 border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <Scale className="w-5 h-5 text-emerald-400" />
              <h3 className="font-bold text-zinc-100">Porovnanie</h3>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left p-4 text-zinc-400 font-medium">Metrika</th>
                  {selectedProperties.map((p, idx) => (
                    <th key={p.id} className="text-center p-4 text-zinc-100 font-medium">
                      Nehnuteľnosť {idx + 1}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {/* Price */}
                <tr>
                  <td className="p-4 text-zinc-400">
                    <div className="flex items-center gap-2">
                      <Euro className="w-4 h-4" />
                      Cena
                    </div>
                  </td>
                  {selectedProperties.map((p, idx) => {
                    const best = selectedProperties.length === 2 
                      ? compareValues(p.price, selectedProperties[1 - idx].price, false) === "a"
                      : false;
                    return (
                      <td key={p.id} className="p-4 text-center">
                        <span className={`font-bold ${best ? "text-emerald-400" : "text-zinc-100"}`}>
                          €{p.price.toLocaleString()}
                        </span>
                        {best && <Check className="w-4 h-4 text-emerald-400 inline ml-2" />}
                      </td>
                    );
                  })}
                </tr>

                {/* Price per m² */}
                <tr>
                  <td className="p-4 text-zinc-400">
                    <div className="flex items-center gap-2">
                      <Ruler className="w-4 h-4" />
                      Cena za m²
                    </div>
                  </td>
                  {selectedProperties.map((p, idx) => {
                    const best = selectedProperties.length === 2 
                      ? compareValues(p.price_per_m2, selectedProperties[1 - idx].price_per_m2, false) === "a"
                      : false;
                    return (
                      <td key={p.id} className="p-4 text-center">
                        <span className={`font-bold ${best ? "text-emerald-400" : "text-zinc-100"}`}>
                          €{p.price_per_m2.toLocaleString()}
                        </span>
                        {best && <Check className="w-4 h-4 text-emerald-400 inline ml-2" />}
                      </td>
                    );
                  })}
                </tr>

                {/* Area */}
                <tr>
                  <td className="p-4 text-zinc-400">
                    <div className="flex items-center gap-2">
                      <Home className="w-4 h-4" />
                      Plocha
                    </div>
                  </td>
                  {selectedProperties.map((p, idx) => {
                    const best = selectedProperties.length === 2 
                      ? compareValues(p.area_m2, selectedProperties[1 - idx].area_m2, true) === "a"
                      : false;
                    return (
                      <td key={p.id} className="p-4 text-center">
                        <span className={`font-bold ${best ? "text-emerald-400" : "text-zinc-100"}`}>
                          {p.area_m2} m²
                        </span>
                        {best && <Check className="w-4 h-4 text-emerald-400 inline ml-2" />}
                      </td>
                    );
                  })}
                </tr>

                {/* Rooms */}
                <tr>
                  <td className="p-4 text-zinc-400">Počet izieb</td>
                  {selectedProperties.map((p) => (
                    <td key={p.id} className="p-4 text-center text-zinc-100">
                      {p.rooms || "—"}
                    </td>
                  ))}
                </tr>

                {/* Condition */}
                <tr>
                  <td className="p-4 text-zinc-400">Stav</td>
                  {selectedProperties.map((p) => (
                    <td key={p.id} className="p-4 text-center text-zinc-100">
                      {CONDITION_LABELS[p.condition] || p.condition}
                    </td>
                  ))}
                </tr>

                {/* Gross Yield */}
                <tr>
                  <td className="p-4 text-zinc-400">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4" />
                      Hrubý výnos
                    </div>
                  </td>
                  {selectedProperties.map((p, idx) => {
                    const yieldA = p.investmentMetrics?.gross_yield || 0;
                    const yieldB = selectedProperties[1 - idx]?.investmentMetrics?.gross_yield || 0;
                    const best = selectedProperties.length === 2 && compareValues(yieldA, yieldB, true) === "a";
                    return (
                      <td key={p.id} className="p-4 text-center">
                        <span className={`font-bold ${best ? "text-emerald-400" : "text-zinc-100"}`}>
                          {p.investmentMetrics?.gross_yield.toFixed(1) || "—"}%
                        </span>
                        {best && <Check className="w-4 h-4 text-emerald-400 inline ml-2" />}
                      </td>
                    );
                  })}
                </tr>

                {/* Net Yield */}
                <tr>
                  <td className="p-4 text-zinc-400">Čistý výnos</td>
                  {selectedProperties.map((p, idx) => {
                    const yieldA = p.investmentMetrics?.net_yield || 0;
                    const yieldB = selectedProperties[1 - idx]?.investmentMetrics?.net_yield || 0;
                    const best = selectedProperties.length === 2 && compareValues(yieldA, yieldB, true) === "a";
                    return (
                      <td key={p.id} className="p-4 text-center">
                        <span className={`font-bold ${best ? "text-emerald-400" : "text-zinc-100"}`}>
                          {p.investmentMetrics?.net_yield.toFixed(1) || "—"}%
                        </span>
                        {best && <Check className="w-4 h-4 text-emerald-400 inline ml-2" />}
                      </td>
                    );
                  })}
                </tr>

                {/* Days on market */}
                <tr>
                  <td className="p-4 text-zinc-400">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Dní v ponuke
                    </div>
                  </td>
                  {selectedProperties.map((p) => (
                    <td key={p.id} className="p-4 text-center text-zinc-100">
                      {p.days_on_market}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 10-Year ROI Projection */}
      {selectedProperties.length >= 2 && (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-zinc-100">10-ročná projekcia ROI</h3>
            <span className="text-sm text-zinc-400">(predpoklad: 3% ročné zhodnotenie)</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {selectedProperties.map((property, idx) => {
              const roi = calculateROI(property);
              if (!roi) return null;

              return (
                <div key={property.id} className="bg-zinc-800/50 rounded-lg p-4">
                  <div className="text-sm text-zinc-400 mb-2">Nehnuteľnosť {idx + 1}</div>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Počiatočná investícia:</span>
                      <span className="font-medium text-zinc-100">€{property.price.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Hodnota po 10 rokoch:</span>
                      <span className="font-medium text-zinc-100">€{roi.finalValue.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Celkový príjem z nájmu:</span>
                      <span className="font-medium text-emerald-400">+€{roi.totalRent.toLocaleString()}</span>
                    </div>
                    <div className="border-t border-zinc-700 pt-3">
                      <div className="flex justify-between">
                        <span className="text-zinc-300">Celkový výnos:</span>
                        <span className="font-bold text-emerald-400">+€{roi.totalReturn.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between mt-1">
                        <span className="text-zinc-300">ROI:</span>
                        <span className="font-bold text-2xl text-emerald-400">{roi.roi.toFixed(0)}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty State */}
      {selectedProperties.length < 2 && (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-12 text-center">
          <Scale className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-zinc-300 mb-2">
            Vyberte minimálne 2 nehnuteľnosti
          </h3>
          <p className="text-zinc-500">
            Kliknite na "Pridať nehnuteľnosť" a vyhľadajte nehnuteľnosti na porovnanie
          </p>
        </div>
      )}
    </div>
  );
}
