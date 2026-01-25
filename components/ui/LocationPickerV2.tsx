"use client";

import { useState, useMemo, useCallback } from "react";
import { 
  MapPin, 
  ChevronDown, 
  ChevronRight, 
  Check, 
  Search,
  X,
  Building2,
  Map,
  Minus
} from "lucide-react";
import { 
  REGIONS, 
  DISTRICTS, 
  getDistrictsByRegion,
} from "@/lib/constants/slovakia-locations";
import {
  normalizeSelection,
  getRegionState,
  getDistrictState,
  isCitySelected,
  toggleRegion,
  toggleDistrict,
  toggleCity,
  getSelectionStats,
  type NormalizedSelection,
} from "@/lib/location-utils";

interface LocationPickerV2Props {
  selectedRegions: string[];
  selectedDistricts: string[];
  selectedCities: string[];
  onChange: (selection: NormalizedSelection) => void;
  compact?: boolean;
}

export function LocationPickerV2({
  selectedRegions,
  selectedDistricts,
  selectedCities,
  onChange,
  compact = false,
}: LocationPickerV2Props) {
  const [expandedRegions, setExpandedRegions] = useState<Set<string>>(new Set());
  const [expandedDistricts, setExpandedDistricts] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");

  const regions = useMemo(() => Object.values(REGIONS), []);

  const stats = useMemo(() => 
    getSelectionStats({ 
      regions: selectedRegions, 
      districts: selectedDistricts, 
      cities: selectedCities 
    }),
    [selectedRegions, selectedDistricts, selectedCities]
  );

  // ============================================
  // EXPAND/COLLAPSE
  // ============================================

  const handleToggleRegionExpand = useCallback((regionId: string) => {
    setExpandedRegions(prev => {
      const next = new Set(prev);
      if (next.has(regionId)) {
        next.delete(regionId);
      } else {
        next.add(regionId);
      }
      return next;
    });
  }, []);

  const handleToggleDistrictExpand = useCallback((districtId: string) => {
    setExpandedDistricts(prev => {
      const next = new Set(prev);
      if (next.has(districtId)) {
        next.delete(districtId);
      } else {
        next.add(districtId);
      }
      return next;
    });
  }, []);

  // ============================================
  // SELECTION HANDLERS
  // ============================================

  const handleToggleRegion = useCallback((regionId: string) => {
    const newSelection = toggleRegion(
      regionId,
      selectedRegions,
      selectedDistricts,
      selectedCities
    );
    onChange(newSelection);
  }, [selectedRegions, selectedDistricts, selectedCities, onChange]);

  const handleToggleDistrict = useCallback((districtId: string) => {
    const newSelection = toggleDistrict(
      districtId,
      selectedRegions,
      selectedDistricts,
      selectedCities
    );
    onChange(newSelection);
  }, [selectedRegions, selectedDistricts, selectedCities, onChange]);

  const handleToggleCity = useCallback((cityName: string, districtId: string) => {
    const newSelection = toggleCity(
      cityName,
      districtId,
      selectedRegions,
      selectedDistricts,
      selectedCities
    );
    onChange(newSelection);
  }, [selectedRegions, selectedDistricts, selectedCities, onChange]);

  const clearAll = useCallback(() => {
    onChange({ regions: [], districts: [], cities: [] });
  }, [onChange]);

  const selectAllSlovakia = useCallback(() => {
    onChange({ 
      regions: Object.keys(REGIONS), 
      districts: [], 
      cities: [] 
    });
  }, [onChange]);

  // ============================================
  // FILTERING
  // ============================================

  const filteredRegions = useMemo(() => {
    if (!searchQuery) return regions;
    const q = searchQuery.toLowerCase();
    return regions.filter(region => {
      if (region.name.toLowerCase().includes(q)) return true;
      const districts = getDistrictsByRegion(region.id);
      return districts.some(d => 
        d.name.toLowerCase().includes(q) || 
        d.cities.some(c => c.toLowerCase().includes(q))
      );
    });
  }, [regions, searchQuery]);

  const totalSelected = selectedRegions.length + selectedDistricts.length + selectedCities.length;

  // ============================================
  // RENDER CHECKBOX
  // ============================================

  const renderCheckbox = (
    isSelected: boolean,
    isIndeterminate: boolean,
    size: "sm" | "md" = "md"
  ) => {
    const sizeClasses = size === "sm" 
      ? "w-4 h-4" 
      : "w-5 h-5";
    const iconSize = size === "sm" ? "w-2.5 h-2.5" : "w-3 h-3";

    return (
      <div className={`${sizeClasses} rounded border-2 flex items-center justify-center transition-all shrink-0 ${
        isSelected 
          ? "bg-emerald-500 border-emerald-500" 
          : isIndeterminate
          ? "border-emerald-500 bg-emerald-500/30"
          : "border-slate-600 hover:border-slate-500"
      }`}>
        {isSelected && <Check className={`${iconSize} text-white`} />}
        {isIndeterminate && !isSelected && <Minus className={`${iconSize} text-emerald-300`} />}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Search & Summary */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Hľadať kraj, okres alebo mesto..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white 
                       placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
          />
        </div>
        {totalSelected > 0 && (
          <button
            onClick={clearAll}
            className="px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-xl text-slate-400 
                       hover:text-white hover:border-slate-600 transition-all flex items-center gap-2"
          >
            <X className="w-4 h-4" />
            <span className="text-sm">Vymazať</span>
          </button>
        )}
      </div>

      {/* Stats bar */}
      {!compact && (
        <div className="flex items-center gap-4 text-sm text-slate-400">
          <span>
            {stats.isAllSlovakia ? (
              <span className="text-emerald-400 font-medium">Celé Slovensko</span>
            ) : stats.totalRegions > 0 ? (
              <>
                <span className="text-emerald-400 font-medium">{stats.totalRegions}</span> krajov, 
                <span className="text-blue-400 font-medium ml-1">{stats.totalDistricts}</span> okresov
              </>
            ) : stats.totalDistricts > 0 ? (
              <>
                <span className="text-blue-400 font-medium">{stats.totalDistricts}</span> okresov, 
                <span className="text-violet-400 font-medium ml-1">{stats.totalCities}</span> miest
              </>
            ) : stats.totalCities > 0 ? (
              <span><span className="text-violet-400 font-medium">{stats.totalCities}</span> miest/obcí</span>
            ) : (
              <span className="text-slate-500">Žiadne lokality vybrané</span>
            )}
          </span>
        </div>
      )}

      {/* Selected chips */}
      {totalSelected > 0 && !compact && (
        <div className="flex flex-wrap gap-2">
          {selectedRegions.map(regionId => {
            const region = REGIONS[regionId];
            return (
              <span key={regionId} className="inline-flex items-center gap-1 px-3 py-1 rounded-full 
                                               bg-emerald-500/20 text-emerald-400 text-sm border border-emerald-500/30">
                <Map className="w-3 h-3" />
                {region?.name}
                <button 
                  onClick={() => handleToggleRegion(regionId)} 
                  className="ml-1 hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            );
          })}
          {selectedDistricts.map(districtId => {
            const district = DISTRICTS[districtId];
            return (
              <span key={districtId} className="inline-flex items-center gap-1 px-3 py-1 rounded-full 
                                                 bg-blue-500/20 text-blue-400 text-sm border border-blue-500/30">
                <MapPin className="w-3 h-3" />
                {district?.name}
                <button 
                  onClick={() => handleToggleDistrict(districtId)} 
                  className="ml-1 hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            );
          })}
          {selectedCities.slice(0, 5).map(city => (
            <span key={city} className="inline-flex items-center gap-1 px-3 py-1 rounded-full 
                                         bg-violet-500/20 text-violet-400 text-sm border border-violet-500/30">
              <Building2 className="w-3 h-3" />
              {city}
            </span>
          ))}
          {selectedCities.length > 5 && (
            <span className="px-3 py-1 rounded-full bg-slate-700/50 text-slate-400 text-sm">
              +{selectedCities.length - 5} ďalších
            </span>
          )}
        </div>
      )}

      {/* Region list */}
      <div className="space-y-1 max-h-[400px] overflow-y-auto pr-2">
        {filteredRegions.map(region => {
          const regionState = getRegionState(
            region.id,
            selectedRegions,
            selectedDistricts,
            selectedCities
          );
          const isExpanded = expandedRegions.has(region.id);
          const districts = getDistrictsByRegion(region.id);

          return (
            <div key={region.id} className="rounded-xl overflow-hidden">
              {/* Region header */}
              <div 
                className={`flex items-center gap-2 p-3 transition-all ${
                  regionState.isSelected 
                    ? "bg-emerald-500/20 border border-emerald-500/30" 
                    : regionState.isIndeterminate
                    ? "bg-emerald-500/10 border border-emerald-500/20"
                    : "bg-slate-800/30 border border-slate-700/50 hover:bg-slate-800/50"
                } rounded-xl`}
              >
                {/* Expand button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleToggleRegionExpand(region.id);
                  }}
                  className="p-1 hover:bg-slate-700/50 rounded z-10"
                >
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  )}
                </button>
                
                {/* Selection area */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleToggleRegion(region.id);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleToggleRegion(region.id);
                    }
                  }}
                  className="flex items-center gap-2 flex-1 cursor-pointer"
                >
                  {renderCheckbox(regionState.isSelected, regionState.isIndeterminate)}
                  <Map className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="flex-1 font-medium text-white">{region.name}</span>
                </div>
                
                <span className="text-xs text-slate-500 shrink-0">{districts.length} okresov</span>
              </div>

              {/* Districts */}
              {isExpanded && (
                <div className="ml-8 mt-1 space-y-1">
                  {districts.map(district => {
                    const districtState = getDistrictState(
                      district.id,
                      selectedRegions,
                      selectedDistricts,
                      selectedCities
                    );
                    const isDistExpanded = expandedDistricts.has(district.id);

                    return (
                      <div key={district.id}>
                        {/* District header */}
                        <div
                          className={`flex items-center gap-2 p-2 rounded-lg transition-all cursor-pointer ${
                            districtState.isSelected
                              ? "bg-blue-500/10 border border-blue-500/20"
                              : districtState.isIndeterminate
                              ? "bg-blue-500/5 border border-blue-500/10"
                              : "bg-slate-800/20 border border-transparent hover:bg-slate-800/40"
                          }`}
                        >
                          {/* Expand button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleToggleDistrictExpand(district.id);
                            }}
                            className="p-0.5 hover:bg-slate-700/50 rounded z-10"
                          >
                            {isDistExpanded ? (
                              <ChevronDown className="w-3 h-3 text-slate-400" />
                            ) : (
                              <ChevronRight className="w-3 h-3 text-slate-400" />
                            )}
                          </button>
                          
                          {/* Selection area */}
                          <div
                            role="button"
                            tabIndex={0}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleToggleDistrict(district.id);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                handleToggleDistrict(district.id);
                              }
                            }}
                            className="flex items-center gap-2 flex-1 cursor-pointer"
                          >
                            {renderCheckbox(districtState.isSelected, districtState.isIndeterminate, "sm")}
                            <MapPin className="w-3 h-3 text-blue-400 shrink-0" />
                            <span className="flex-1 text-sm text-slate-300">{district.name}</span>
                          </div>
                          
                          <span className="text-xs text-slate-600 shrink-0">{district.cities.length}</span>
                        </div>

                        {/* Cities */}
                        {isDistExpanded && (
                          <div className="ml-6 mt-1 grid grid-cols-2 gap-1">
                            {district.cities.map(city => {
                              const citySelected = isCitySelected(
                                city,
                                district.id,
                                selectedRegions,
                                selectedDistricts,
                                selectedCities
                              );
                              
                              return (
                                <button
                                  key={city}
                                  onClick={() => handleToggleCity(city, district.id)}
                                  className={`flex items-center gap-2 p-1.5 rounded text-left transition-all ${
                                    citySelected
                                      ? "bg-violet-500/10 text-violet-400"
                                      : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-300"
                                  }`}
                                >
                                  <div className={`w-3 h-3 rounded border flex items-center justify-center ${
                                    citySelected
                                      ? "bg-violet-500 border-violet-500"
                                      : "border-slate-600"
                                  }`}>
                                    {citySelected && <Check className="w-2 h-2 text-white" />}
                                  </div>
                                  <span className="text-xs truncate">{city}</span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Quick select */}
      <div className="flex flex-wrap gap-2 pt-4 border-t border-slate-800">
        <span className="text-xs text-slate-500">Rýchly výber:</span>
        <button
          onClick={selectAllSlovakia}
          className="text-xs px-2 py-1 rounded bg-slate-800 text-slate-400 hover:text-white transition-colors"
        >
          Celé Slovensko
        </button>
        <button
          onClick={() => onChange(normalizeSelection(["BA", "TT", "NR"], [], []))}
          className="text-xs px-2 py-1 rounded bg-slate-800 text-slate-400 hover:text-white transition-colors"
        >
          Západné Slovensko
        </button>
        <button
          onClick={() => onChange(normalizeSelection(["ZA", "BB", "TN"], [], []))}
          className="text-xs px-2 py-1 rounded bg-slate-800 text-slate-400 hover:text-white transition-colors"
        >
          Stredné Slovensko
        </button>
        <button
          onClick={() => onChange(normalizeSelection(["PO", "KE"], [], []))}
          className="text-xs px-2 py-1 rounded bg-slate-800 text-slate-400 hover:text-white transition-colors"
        >
          Východné Slovensko
        </button>
      </div>
    </div>
  );
}
