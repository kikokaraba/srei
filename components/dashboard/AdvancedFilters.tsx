"use client";

import { useState, useCallback } from "react";
import { Filter, Save, ChevronDown, ChevronUp, Check, MapPin } from "lucide-react";
import { useUserPreferences } from "@/lib/hooks/useUserPreferences";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CONDITION_OPTIONS } from "@/lib/constants";

// Slovenské kraje
const SLOVAK_REGIONS = [
  { id: "BA", name: "Bratislavský", shortName: "BA" },
  { id: "TT", name: "Trnavský", shortName: "TT" },
  { id: "TN", name: "Trenčiansky", shortName: "TN" },
  { id: "NR", name: "Nitriansky", shortName: "NR" },
  { id: "ZA", name: "Žilinský", shortName: "ZA" },
  { id: "BB", name: "Banskobystrický", shortName: "BB" },
  { id: "PO", name: "Prešovský", shortName: "PO" },
  { id: "KE", name: "Košický", shortName: "KE" },
];

const PROPERTY_CONDITIONS = CONDITION_OPTIONS;

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

interface UserPreferencesInput {
  trackedRegions?: string[];
  minPrice?: number | null;
  maxPrice?: number | null;
  minPricePerM2?: number | null;
  maxPricePerM2?: number | null;
  minArea?: number | null;
  maxArea?: number | null;
  minRooms?: number | null;
  maxRooms?: number | null;
  condition?: string;
  energyCertificates?: string;
  minFloor?: number | null;
  maxFloor?: number | null;
  onlyDistressed?: boolean;
  minYield?: number | null;
  maxYield?: number | null;
  minGrossYield?: number | null;
  maxGrossYield?: number | null;
  minCashOnCash?: number | null;
  maxDaysOnMarket?: number | null;
  minGapPercentage?: number | null;
  onboardingCompleted?: boolean;
  [key: string]: unknown;
}

async function savePreferences(preferences: UserPreferencesInput) {
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
    trackedRegions: [] as string[],
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
  });

  // Count active filters
  const countActiveFilters = useCallback(() => {
    let count = 0;
    if (filters.trackedRegions.length > 0) count++;
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
    return count;
  }, [filters]);

  const handleSave = useCallback(() => {
    if (preferences) {
      saveMutation.mutate({
        ...preferences,
        trackedRegions: filters.trackedRegions,
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
        onboardingCompleted: true,
      });
    }
  }, [filters, preferences, saveMutation]);

  const handleReset = useCallback(() => {
    setFilters({
      trackedRegions: [],
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
    });
  }, []);

  if (isLoading) {
    return null;
  }

  return (
    <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Filter className="w-5 h-5 text-emerald-400" />
          <h3 className="text-lg font-bold text-zinc-100">Pokročilé filtre</h3>
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
              className="px-3 py-1.5 text-sm text-zinc-400 hover:text-zinc-100 transition-colors"
            >
              Resetovať
            </button>
          )}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 text-zinc-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-zinc-400" />
            )}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="space-y-6 pt-4 border-t border-zinc-800">
          {/* Lokalita - Kraje */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="w-4 h-4 text-emerald-400" />
              <label className="text-zinc-300 font-medium">
                Sledované kraje
              </label>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {SLOVAK_REGIONS.map((region) => {
                const isSelected = filters.trackedRegions.includes(region.id);
                return (
                  <button
                    key={region.id}
                    type="button"
                    onClick={() => {
                      const regions = isSelected
                        ? filters.trackedRegions.filter((r) => r !== region.id)
                        : [...filters.trackedRegions, region.id];
                      setFilters({ ...filters, trackedRegions: regions });
                    }}
                    className={`relative p-3 rounded-xl border text-left transition-all ${
                      isSelected
                        ? "bg-emerald-500/10 border-emerald-500"
                        : "bg-zinc-800 border-zinc-700 hover:border-zinc-600"
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute top-1.5 right-1.5 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 text-white" />
                      </div>
                    )}
                    <span className={`text-lg font-bold ${isSelected ? "text-emerald-400" : "text-zinc-400"}`}>
                      {region.shortName}
                    </span>
                    <span className={`block text-xs mt-0.5 ${isSelected ? "text-emerald-400/70" : "text-zinc-500"}`}>
                      {region.name}
                    </span>
                  </button>
                );
              })}
            </div>
            {/* Quick select */}
            <div className="flex flex-wrap gap-2 mt-3">
              <button
                type="button"
                onClick={() => setFilters({ ...filters, trackedRegions: SLOVAK_REGIONS.map(r => r.id) })}
                className="text-xs px-3 py-1 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
              >
                Celé Slovensko
              </button>
              <button
                type="button"
                onClick={() => setFilters({ ...filters, trackedRegions: ["BA", "TT", "NR"] })}
                className="text-xs px-3 py-1 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
              >
                Západ
              </button>
              <button
                type="button"
                onClick={() => setFilters({ ...filters, trackedRegions: ["ZA", "BB", "TN"] })}
                className="text-xs px-3 py-1 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
              >
                Stred
              </button>
              <button
                type="button"
                onClick={() => setFilters({ ...filters, trackedRegions: ["PO", "KE"] })}
                className="text-xs px-3 py-1 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
              >
                Východ
              </button>
            </div>
          </div>

          {/* Cena */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-zinc-300 mb-2 font-medium text-sm">
                Cena (€)
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={filters.minPrice !== null && filters.minPrice !== undefined ? filters.minPrice : ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFilters({
                      ...filters,
                      minPrice: val === "" ? null : parseFloat(val) || null,
                    });
                  }}
                  placeholder="Od"
                  className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <input
                  type="number"
                  value={filters.maxPrice !== null && filters.maxPrice !== undefined ? filters.maxPrice : ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFilters({
                      ...filters,
                      maxPrice: val === "" ? null : parseFloat(val) || null,
                    });
                  }}
                  placeholder="Do"
                  className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-zinc-300 mb-2 font-medium text-sm">
                Cena za m² (€/m²)
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={filters.minPricePerM2 !== null && filters.minPricePerM2 !== undefined ? filters.minPricePerM2 : ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFilters({
                      ...filters,
                      minPricePerM2: val === "" ? null : parseFloat(val) || null,
                    });
                  }}
                  placeholder="Od"
                  className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <input
                  type="number"
                  value={filters.maxPricePerM2 !== null && filters.maxPricePerM2 !== undefined ? filters.maxPricePerM2 : ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFilters({
                      ...filters,
                      maxPricePerM2: val === "" ? null : parseFloat(val) || null,
                    });
                  }}
                  placeholder="Do"
                  className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Plocha a izby */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-zinc-300 mb-2 font-medium text-sm">
                Plocha (m²)
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={filters.minArea !== null && filters.minArea !== undefined ? filters.minArea : ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFilters({
                      ...filters,
                      minArea: val === "" ? null : parseFloat(val) || null,
                    });
                  }}
                  placeholder="Od"
                  className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <input
                  type="number"
                  value={filters.maxArea !== null && filters.maxArea !== undefined ? filters.maxArea : ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFilters({
                      ...filters,
                      maxArea: val === "" ? null : parseFloat(val) || null,
                    });
                  }}
                  placeholder="Do"
                  className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-zinc-300 mb-2 font-medium text-sm">
                Počet izieb
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={filters.minRooms !== null && filters.minRooms !== undefined ? filters.minRooms : ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFilters({
                      ...filters,
                      minRooms: val === "" ? null : parseInt(val) || null,
                    });
                  }}
                  placeholder="Od"
                  className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <input
                  type="number"
                  value={filters.maxRooms !== null && filters.maxRooms !== undefined ? filters.maxRooms : ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFilters({
                      ...filters,
                      maxRooms: val === "" ? null : parseInt(val) || null,
                    });
                  }}
                  placeholder="Do"
                  className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Stav a energia */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-zinc-300 mb-2 font-medium text-sm">
                Stav nehnuteľnosti
              </label>
              <div className="flex flex-wrap gap-2">
                {PROPERTY_CONDITIONS.map((cond) => (
                  <label
                    key={cond.value}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-zinc-700 bg-zinc-800 cursor-pointer hover:border-zinc-600 transition-colors"
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
                      className="w-4 h-4 rounded border-zinc-600 bg-zinc-700 text-emerald-500 focus:ring-emerald-500"
                    />
                    <span className="text-xs text-zinc-300">{cond.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-zinc-300 mb-2 font-medium text-sm">
                Energetický certifikát
              </label>
              <div className="flex flex-wrap gap-2">
                {ENERGY_CERTIFICATES.map((cert) => (
                  <label
                    key={cert.value}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-zinc-700 bg-zinc-800 cursor-pointer hover:border-zinc-600 transition-colors"
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
                      className="w-4 h-4 rounded border-zinc-600 bg-zinc-700 text-emerald-500 focus:ring-emerald-500"
                    />
                    <span className="text-xs text-zinc-300">{cert.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Výnos */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-zinc-300 mb-2 font-medium text-sm">
                Výnos (%)
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={filters.minYield !== null && filters.minYield !== undefined ? filters.minYield : ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFilters({
                      ...filters,
                      minYield: val === "" ? null : parseFloat(val) || null,
                    });
                  }}
                  placeholder="Od"
                  step="0.1"
                  className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <input
                  type="number"
                  value={filters.maxYield !== null && filters.maxYield !== undefined ? filters.maxYield : ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFilters({
                      ...filters,
                      maxYield: val === "" ? null : parseFloat(val) || null,
                    });
                  }}
                  placeholder="Do"
                  step="0.1"
                  className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-zinc-300 mb-2 font-medium text-sm">
                Hrubý výnos (%)
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={filters.minGrossYield !== null && filters.minGrossYield !== undefined ? filters.minGrossYield : ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFilters({
                      ...filters,
                      minGrossYield: val === "" ? null : parseFloat(val) || null,
                    });
                  }}
                  placeholder="Od"
                  step="0.1"
                  className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <input
                  type="number"
                  value={filters.maxGrossYield !== null && filters.maxGrossYield !== undefined ? filters.maxGrossYield : ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFilters({
                      ...filters,
                      maxGrossYield: val === "" ? null : parseFloat(val) || null,
                    });
                  }}
                  placeholder="Do"
                  step="0.1"
                  className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-zinc-300 mb-2 font-medium text-sm">
                Cash-on-Cash (%)
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={filters.minCashOnCash !== null && filters.minCashOnCash !== undefined ? filters.minCashOnCash : ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFilters({
                      ...filters,
                      minCashOnCash: val === "" ? null : parseFloat(val) || null,
                    });
                  }}
                  placeholder="Od"
                  step="0.1"
                  className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Pokročilé */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-zinc-300 mb-2 font-medium text-sm">
                Maximálne dni v ponuke
              </label>
              <input
                type="number"
                value={filters.maxDaysOnMarket !== null && filters.maxDaysOnMarket !== undefined ? filters.maxDaysOnMarket : ""}
                onChange={(e) => {
                  const val = e.target.value;
                  setFilters({
                    ...filters,
                    maxDaysOnMarket: val === "" ? null : parseInt(val) || null,
                  });
                }}
                placeholder="Napríklad 90"
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-zinc-300 mb-2 font-medium text-sm">
                Minimálny Market Gap (%)
              </label>
              <input
                type="number"
                value={filters.minGapPercentage !== null && filters.minGapPercentage !== undefined ? filters.minGapPercentage : ""}
                onChange={(e) => {
                  const val = e.target.value;
                  setFilters({
                    ...filters,
                    minGapPercentage: val === "" ? null : parseFloat(val) || null,
                  });
                }}
                placeholder="Napríklad 10"
                step="0.1"
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
                className="w-4 h-4 rounded border-zinc-600 bg-zinc-700 text-emerald-500 focus:ring-emerald-500"
              />
              <span className="text-sm text-zinc-300">Len nehnuteľnosti v núdzi</span>
            </label>
          </div>

          {/* Save button */}
          <div className="pt-4 border-t border-zinc-800">
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
