"use client";

import { useState, useCallback } from "react";
import { Filter, X, Save, ChevronDown, ChevronUp } from "lucide-react";
import { useUserPreferences } from "@/lib/hooks/useUserPreferences";
import { useMutation, useQueryClient } from "@tanstack/react-query";

const SLOVAK_CITIES = [
  { value: "BRATISLAVA", label: "Bratislava" },
  { value: "KOSICE", label: "Košice" },
  { value: "PRESOV", label: "Prešov" },
  { value: "ZILINA", label: "Žilina" },
  { value: "BANSKA_BYSTRICA", label: "Banská Bystrica" },
  { value: "TRNAVA", label: "Trnava" },
  { value: "TRENCIN", label: "Trenčín" },
  { value: "NITRA", label: "Nitra" },
] as const;

const PROPERTY_CONDITIONS = [
  { value: "POVODNY", label: "Pôvodný stav" },
  { value: "REKONSTRUKCIA", label: "Rekonštrukcia" },
  { value: "NOVOSTAVBA", label: "Novostavba" },
] as const;

const ENERGY_CERTIFICATES = [
  { value: "A", label: "A" },
  { value: "B", label: "B" },
  { value: "C", label: "C" },
  { value: "D", label: "D" },
  { value: "E", label: "E" },
  { value: "F", label: "F" },
  { value: "G", label: "G" },
  { value: "NONE", label: "Bez certifikátu" },
] as const;

const INFRASTRUCTURE_TYPES = [
  { value: "METRO_STATION", label: "Stanica metra" },
  { value: "TRAM_STATION", label: "Zastávka električky" },
  { value: "HIGHWAY", label: "Diaľnica" },
  { value: "SHOPPING_CENTER", label: "Nákupné centrum" },
  { value: "SCHOOL", label: "Škola" },
  { value: "HOSPITAL", label: "Nemocnica" },
  { value: "PARK", label: "Park" },
  { value: "BUSINESS_DISTRICT", label: "Obchodná zóna" },
] as const;

async function savePreferences(preferences: any) {
  const response = await fetch("/api/v1/user/preferences", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(preferences),
  });
  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error || "Failed to save preferences");
  }
  return data.data;
}

export function AdvancedFilters() {
  const { preferences, isLoading } = useUserPreferences();
  const queryClient = useQueryClient();
  const [isExpanded, setIsExpanded] = useState(false);
  const saveMutation = useMutation({
    mutationFn: savePreferences,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-preferences"] });
    },
  });

  const [filters, setFilters] = useState({
    trackedCities: [] as string[],
    minPrice: null as number | null,
    maxPrice: null as number | null,
    minPricePerM2: null as number | null,
    maxPricePerM2: null as number | null,
    minArea: null as number | null,
    maxArea: null as number | null,
    minRooms: null as number | null,
    maxRooms: null as number | null,
    condition: [] as string[],
    energyCertificates: [] as string[],
    minFloor: null as number | null,
    maxFloor: null as number | null,
    onlyDistressed: false,
    minYield: null as number | null,
    maxYield: null as number | null,
    minGrossYield: null as number | null,
    maxGrossYield: null as number | null,
    minCashOnCash: null as number | null,
    maxDaysOnMarket: null as number | null,
    minGapPercentage: null as number | null,
    minUrbanImpact: null as number | null,
    infrastructureTypes: [] as string[],
  });

  // Count active filters
  const countActiveFilters = useCallback(() => {
    let count = 0;
    if (filters.trackedCities.length > 0) count++;
    if (filters.minPrice || filters.maxPrice) count++;
    if (filters.minPricePerM2 || filters.maxPricePerM2) count++;
    if (filters.minArea || filters.maxArea) count++;
    if (filters.minRooms || filters.maxRooms) count++;
    if (filters.condition.length > 0) count++;
    if (filters.energyCertificates.length > 0) count++;
    if (filters.minFloor || filters.maxFloor) count++;
    if (filters.onlyDistressed) count++;
    if (filters.minYield || filters.maxYield) count++;
    if (filters.minGrossYield || filters.maxGrossYield) count++;
    if (filters.minCashOnCash) count++;
    if (filters.maxDaysOnMarket) count++;
    if (filters.minGapPercentage) count++;
    if (filters.minUrbanImpact) count++;
    if (filters.infrastructureTypes.length > 0) count++;
    return count;
  }, [filters]);

  const handleSave = useCallback(() => {
    if (preferences) {
      saveMutation.mutate({
        ...preferences,
        trackedCities: filters.trackedCities,
        minPrice: filters.minPrice,
        maxPrice: filters.maxPrice,
        minPricePerM2: filters.minPricePerM2,
        maxPricePerM2: filters.maxPricePerM2,
        minArea: filters.minArea,
        maxArea: filters.maxArea,
        minRooms: filters.minRooms,
        maxRooms: filters.maxRooms,
        condition: JSON.stringify(filters.condition),
        energyCertificates: JSON.stringify(filters.energyCertificates),
        minFloor: filters.minFloor,
        maxFloor: filters.maxFloor,
        onlyDistressed: filters.onlyDistressed,
        minYield: filters.minYield,
        maxYield: filters.maxYield,
        minGrossYield: filters.minGrossYield,
        maxGrossYield: filters.maxGrossYield,
        minCashOnCash: filters.minCashOnCash,
        maxDaysOnMarket: filters.maxDaysOnMarket,
        minGapPercentage: filters.minGapPercentage,
        minUrbanImpact: filters.minUrbanImpact,
        infrastructureTypes: JSON.stringify(filters.infrastructureTypes),
        onboardingCompleted: true,
      });
    }
  }, [filters, preferences, saveMutation]);

  const handleReset = useCallback(() => {
    setFilters({
      trackedCities: [],
      minPrice: null,
      maxPrice: null,
      minPricePerM2: null,
      maxPricePerM2: null,
      minArea: null,
      maxArea: null,
      minRooms: null,
      maxRooms: null,
      condition: [],
      energyCertificates: [],
      minFloor: null,
      maxFloor: null,
      onlyDistressed: false,
      minYield: null,
      maxYield: null,
      minGrossYield: null,
      maxGrossYield: null,
      minCashOnCash: null,
      maxDaysOnMarket: null,
      minGapPercentage: null,
      minUrbanImpact: null,
      infrastructureTypes: [],
    });
  }, []);

  if (isLoading) {
    return null;
  }

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Filter className="w-5 h-5 text-emerald-400" />
          <h3 className="text-lg font-bold text-slate-100">Pokročilé filtre</h3>
          {countActiveFilters() > 0 && (
            <span className="px-2 py-1 bg-emerald-500/10 text-emerald-400 text-xs font-semibold rounded-full">
              {countActiveFilters()} aktívnych
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {countActiveFilters() > 0 && (
            <button
              onClick={handleReset}
              className="px-3 py-1.5 text-sm text-slate-400 hover:text-slate-100 transition-colors"
            >
              Resetovať
            </button>
          )}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            )}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="space-y-6 pt-4 border-t border-slate-800">
          {/* Lokalita */}
          <div>
            <label className="block text-slate-300 mb-3 font-medium">
              Sledované mestá
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {SLOVAK_CITIES.map((city) => (
                <label
                  key={city.value}
                  className="flex items-center gap-2 p-2 rounded-lg border border-slate-700 bg-slate-800 cursor-pointer hover:border-slate-600 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={filters.trackedCities.includes(city.value)}
                    onChange={(e) => {
                      const cities = e.target.checked
                        ? [...filters.trackedCities, city.value]
                        : filters.trackedCities.filter((c) => c !== city.value);
                      setFilters({ ...filters, trackedCities: cities });
                    }}
                    className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-emerald-500 focus:ring-emerald-500"
                  />
                  <span className="text-sm text-slate-300">{city.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Cena */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 mb-2 font-medium text-sm">
                Cena (€)
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={filters.minPrice || ""}
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      minPrice: e.target.value ? parseFloat(e.target.value) : null,
                    })
                  }
                  placeholder="Od"
                  className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <input
                  type="number"
                  value={filters.maxPrice || ""}
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      maxPrice: e.target.value ? parseFloat(e.target.value) : null,
                    })
                  }
                  placeholder="Do"
                  className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 mb-2 font-medium text-sm">
                Cena za m² (€/m²)
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={filters.minPricePerM2 || ""}
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      minPricePerM2: e.target.value ? parseFloat(e.target.value) : null,
                    })
                  }
                  placeholder="Od"
                  className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <input
                  type="number"
                  value={filters.maxPricePerM2 || ""}
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      maxPricePerM2: e.target.value ? parseFloat(e.target.value) : null,
                    })
                  }
                  placeholder="Do"
                  className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Plocha a izby */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 mb-2 font-medium text-sm">
                Plocha (m²)
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={filters.minArea || ""}
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      minArea: e.target.value ? parseFloat(e.target.value) : null,
                    })
                  }
                  placeholder="Od"
                  className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <input
                  type="number"
                  value={filters.maxArea || ""}
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      maxArea: e.target.value ? parseFloat(e.target.value) : null,
                    })
                  }
                  placeholder="Do"
                  className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 mb-2 font-medium text-sm">
                Počet izieb
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={filters.minRooms || ""}
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      minRooms: e.target.value ? parseInt(e.target.value) : null,
                    })
                  }
                  placeholder="Od"
                  min="1"
                  className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <input
                  type="number"
                  value={filters.maxRooms || ""}
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      maxRooms: e.target.value ? parseInt(e.target.value) : null,
                    })
                  }
                  placeholder="Do"
                  min="1"
                  className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Stav a energia */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 mb-2 font-medium text-sm">
                Stav nehnuteľnosti
              </label>
              <div className="flex flex-wrap gap-2">
                {PROPERTY_CONDITIONS.map((cond) => (
                  <label
                    key={cond.value}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 cursor-pointer hover:border-slate-600 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={filters.condition.includes(cond.value)}
                      onChange={(e) => {
                        const conditions = e.target.checked
                          ? [...filters.condition, cond.value]
                          : filters.condition.filter((c) => c !== cond.value);
                        setFilters({ ...filters, condition: conditions });
                      }}
                      className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-emerald-500 focus:ring-emerald-500"
                    />
                    <span className="text-xs text-slate-300">{cond.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-slate-300 mb-2 font-medium text-sm">
                Energetický certifikát
              </label>
              <div className="flex flex-wrap gap-2">
                {ENERGY_CERTIFICATES.map((cert) => (
                  <label
                    key={cert.value}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 cursor-pointer hover:border-slate-600 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={filters.energyCertificates.includes(cert.value)}
                      onChange={(e) => {
                        const certs = e.target.checked
                          ? [...filters.energyCertificates, cert.value]
                          : filters.energyCertificates.filter((c) => c !== cert.value);
                        setFilters({ ...filters, energyCertificates: certs });
                      }}
                      className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-emerald-500 focus:ring-emerald-500"
                    />
                    <span className="text-xs text-slate-300">{cert.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Výnos */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-slate-300 mb-2 font-medium text-sm">
                Výnos (%)
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={filters.minYield || ""}
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      minYield: e.target.value ? parseFloat(e.target.value) : null,
                    })
                  }
                  placeholder="Od"
                  step="0.1"
                  className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <input
                  type="number"
                  value={filters.maxYield || ""}
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      maxYield: e.target.value ? parseFloat(e.target.value) : null,
                    })
                  }
                  placeholder="Do"
                  step="0.1"
                  className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 mb-2 font-medium text-sm">
                Hrubý výnos (%)
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={filters.minGrossYield || ""}
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      minGrossYield: e.target.value ? parseFloat(e.target.value) : null,
                    })
                  }
                  placeholder="Od"
                  step="0.1"
                  className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <input
                  type="number"
                  value={filters.maxGrossYield || ""}
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      maxGrossYield: e.target.value ? parseFloat(e.target.value) : null,
                    })
                  }
                  placeholder="Do"
                  step="0.1"
                  className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 mb-2 font-medium text-sm">
                Cash-on-Cash (%)
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={filters.minCashOnCash || ""}
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      minCashOnCash: e.target.value ? parseFloat(e.target.value) : null,
                    })
                  }
                  placeholder="Od"
                  step="0.1"
                  className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Pokročilé */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-slate-300 mb-2 font-medium text-sm">
                Maximálne dni v ponuke
              </label>
              <input
                type="number"
                value={filters.maxDaysOnMarket || ""}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    maxDaysOnMarket: e.target.value ? parseInt(e.target.value) : null,
                  })
                }
                placeholder="Napríklad 90"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 mb-2 font-medium text-sm">
                Minimálny Market Gap (%)
              </label>
              <input
                type="number"
                value={filters.minGapPercentage || ""}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    minGapPercentage: e.target.value ? parseFloat(e.target.value) : null,
                  })
                }
                placeholder="Napríklad 10"
                step="0.1"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 mb-2 font-medium text-sm">
                Minimálny Urban Impact (%)
              </label>
              <input
                type="number"
                value={filters.minUrbanImpact || ""}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    minUrbanImpact: e.target.value ? parseFloat(e.target.value) : null,
                  })
                }
                placeholder="Napríklad 15"
                step="0.1"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Checkboxy */}
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.onlyDistressed}
                onChange={(e) =>
                  setFilters({ ...filters, onlyDistressed: e.target.checked })
                }
                className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-emerald-500 focus:ring-emerald-500"
              />
              <span className="text-sm text-slate-300">Len nehnuteľnosti v núdzi</span>
            </label>
          </div>

          {/* Save button */}
          <div className="pt-4 border-t border-slate-800">
            <button
              onClick={handleSave}
              disabled={saveMutation.isPending}
              className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {saveMutation.isPending ? "Ukladám..." : "Uložiť filtre"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
