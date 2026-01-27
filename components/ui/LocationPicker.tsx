"use client";

import { useState, useMemo } from "react";
import { 
  MapPin, 
  ChevronDown, 
  ChevronRight, 
  Check, 
  Search,
  X,
  Building2,
  Map
} from "lucide-react";
import { 
  REGIONS, 
  DISTRICTS, 
  getDistrictsByRegion,
  type Region,
  type District,
} from "@/lib/constants/slovakia-locations";

interface LocationPickerProps {
  selectedRegions: string[];
  selectedDistricts: string[];
  selectedCities: string[];
  onRegionsChange: (regions: string[]) => void;
  onDistrictsChange: (districts: string[]) => void;
  onCitiesChange: (cities: string[]) => void;
  maxSelections?: number;
  compact?: boolean;
}

export function LocationPicker({
  selectedRegions,
  selectedDistricts,
  selectedCities,
  onRegionsChange,
  onDistrictsChange,
  onCitiesChange,
  compact = false,
}: LocationPickerProps) {
  const [expandedRegions, setExpandedRegions] = useState<Set<string>>(new Set());
  const [expandedDistricts, setExpandedDistricts] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");

  const regions = useMemo(() => Object.values(REGIONS), []);

  const toggleRegionExpand = (regionId: string) => {
    const newExpanded = new Set(expandedRegions);
    if (newExpanded.has(regionId)) {
      newExpanded.delete(regionId);
    } else {
      newExpanded.add(regionId);
    }
    setExpandedRegions(newExpanded);
  };

  const toggleDistrictExpand = (districtId: string) => {
    const newExpanded = new Set(expandedDistricts);
    if (newExpanded.has(districtId)) {
      newExpanded.delete(districtId);
    } else {
      newExpanded.add(districtId);
    }
    setExpandedDistricts(newExpanded);
  };

  const isRegionSelected = (regionId: string) => selectedRegions.includes(regionId);
  const isDistrictSelected = (districtId: string) => selectedDistricts.includes(districtId);
  const isCitySelected = (city: string) => selectedCities.includes(city);

  const isRegionPartiallySelected = (regionId: string) => {
    if (isRegionSelected(regionId)) return false;
    const districts = getDistrictsByRegion(regionId);
    return districts.some(d => isDistrictSelected(d.id) || d.cities.some(c => isCitySelected(c)));
  };

  const toggleRegion = (regionId: string) => {
    if (isRegionSelected(regionId)) {
      // Odznač región a všetky jeho okresy/mestá
      onRegionsChange(selectedRegions.filter(r => r !== regionId));
      const districtsInRegion = getDistrictsByRegion(regionId).map(d => d.id);
      onDistrictsChange(selectedDistricts.filter(d => !districtsInRegion.includes(d)));
      const citiesInRegion = getDistrictsByRegion(regionId).flatMap(d => d.cities);
      onCitiesChange(selectedCities.filter(c => !citiesInRegion.includes(c)));
    } else {
      // Označ celý región
      onRegionsChange([...selectedRegions, regionId]);
      // Odznač jednotlivé okresy/mestá v tomto regióne (sú zahrnuté v regióne)
      const districtsInRegion = getDistrictsByRegion(regionId).map(d => d.id);
      onDistrictsChange(selectedDistricts.filter(d => !districtsInRegion.includes(d)));
      const citiesInRegion = getDistrictsByRegion(regionId).flatMap(d => d.cities);
      onCitiesChange(selectedCities.filter(c => !citiesInRegion.includes(c)));
    }
  };

  const toggleDistrict = (district: District) => {
    // Ak je región vybraný, najprv ho odznač a označ všetky ostatné okresy
    if (isRegionSelected(district.regionId)) {
      onRegionsChange(selectedRegions.filter(r => r !== district.regionId));
      const allDistrictsInRegion = getDistrictsByRegion(district.regionId).map(d => d.id);
      const otherDistricts = allDistrictsInRegion.filter(d => d !== district.id);
      onDistrictsChange([...selectedDistricts.filter(d => !allDistrictsInRegion.includes(d)), ...otherDistricts]);
    } else if (isDistrictSelected(district.id)) {
      onDistrictsChange(selectedDistricts.filter(d => d !== district.id));
      // Odznač aj mestá v tomto okrese
      onCitiesChange(selectedCities.filter(c => !district.cities.includes(c)));
    } else {
      onDistrictsChange([...selectedDistricts, district.id]);
      // Odznač jednotlivé mestá v tomto okrese
      onCitiesChange(selectedCities.filter(c => !district.cities.includes(c)));
    }
  };

  const toggleCity = (city: string, district: District) => {
    // Ak je okres alebo región vybraný, najprv uprať
    if (isDistrictSelected(district.id)) {
      onDistrictsChange(selectedDistricts.filter(d => d !== district.id));
      const otherCities = district.cities.filter(c => c !== city);
      onCitiesChange([...selectedCities.filter(c => !district.cities.includes(c)), ...otherCities]);
    } else if (isRegionSelected(district.regionId)) {
      // Odznač región, označ všetky okresy okrem tohto
      onRegionsChange(selectedRegions.filter(r => r !== district.regionId));
      const allDistrictsInRegion = getDistrictsByRegion(district.regionId);
      const otherDistricts = allDistrictsInRegion.filter(d => d.id !== district.id).map(d => d.id);
      onDistrictsChange([...selectedDistricts, ...otherDistricts]);
      const otherCities = district.cities.filter(c => c !== city);
      onCitiesChange([...selectedCities, ...otherCities]);
    } else if (isCitySelected(city)) {
      onCitiesChange(selectedCities.filter(c => c !== city));
    } else {
      onCitiesChange([...selectedCities, city]);
    }
  };

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

  const clearAll = () => {
    onRegionsChange([]);
    onDistrictsChange([]);
    onCitiesChange([]);
  };

  return (
    <div className="space-y-4">
      {/* Search & Summary */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Hľadať kraj, okres alebo mesto..."
            className="w-full pl-10 pr-4 py-2.5 bg-zinc-800/50 border border-zinc-700/50 rounded-xl text-white 
                       placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
          />
        </div>
        {totalSelected > 0 && (
          <button
            onClick={clearAll}
            className="px-4 py-2 bg-zinc-800/50 border border-zinc-700/50 rounded-xl text-zinc-400 
                       hover:text-white hover:border-zinc-600 transition-all flex items-center gap-2"
          >
            <X className="w-4 h-4" />
            <span className="text-sm">{totalSelected}</span>
          </button>
        )}
      </div>

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
                <button onClick={() => toggleRegion(regionId)} className="ml-1 hover:text-white">
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
                <button onClick={() => toggleDistrict(district!)} className="ml-1 hover:text-white">
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
              <button onClick={() => {
                onCitiesChange(selectedCities.filter(c => c !== city));
              }} className="ml-1 hover:text-white">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          {selectedCities.length > 5 && (
            <span className="px-3 py-1 rounded-full bg-zinc-700/50 text-zinc-400 text-sm">
              +{selectedCities.length - 5} ďalších
            </span>
          )}
        </div>
      )}

      {/* Region list */}
      <div className="space-y-1 max-h-[400px] overflow-y-auto pr-2">
        {filteredRegions.map(region => {
          const isExpanded = expandedRegions.has(region.id);
          const isSelected = isRegionSelected(region.id);
          const isPartial = isRegionPartiallySelected(region.id);
          const districts = getDistrictsByRegion(region.id);

          return (
            <div key={region.id} className="rounded-xl overflow-hidden">
              {/* Region header */}
              <div 
                className={`flex items-center gap-2 p-3 transition-all cursor-pointer ${
                  isSelected 
                    ? "bg-emerald-500/20 border border-emerald-500/30" 
                    : isPartial
                    ? "bg-emerald-500/10 border border-emerald-500/20"
                    : "bg-zinc-800/30 border border-zinc-700/50 hover:bg-zinc-800/50"
                } rounded-xl`}
              >
                {/* Expand button - samostatné */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleRegionExpand(region.id);
                  }}
                  className="p-1 hover:bg-zinc-700/50 rounded z-10"
                >
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-zinc-400" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-zinc-400" />
                  )}
                </button>
                
                {/* Selection area - kliknuteľný celý riadok */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleRegion(region.id);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      toggleRegion(region.id);
                    }
                  }}
                  className="flex items-center gap-2 flex-1 cursor-pointer"
                >
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all shrink-0 ${
                    isSelected 
                      ? "bg-emerald-500 border-emerald-500" 
                      : isPartial
                      ? "border-emerald-500/50 bg-emerald-500/20"
                      : "border-zinc-600 hover:border-zinc-500"
                  }`}>
                    {isSelected && <Check className="w-3 h-3 text-white" />}
                    {isPartial && <div className="w-2 h-2 bg-emerald-500 rounded-sm" />}
                  </div>
                  
                  <Map className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="flex-1 font-medium text-white">{region.name}</span>
                </div>
                
                <span className="text-xs text-zinc-500 shrink-0">{districts.length} okresov</span>
              </div>

              {/* Districts */}
              {isExpanded && (
                <div className="ml-8 mt-1 space-y-1">
                  {districts.map(district => {
                    const isDistExpanded = expandedDistricts.has(district.id);
                    const isDistSelected = isDistrictSelected(district.id) || isSelected;
                    const hasCitySelected = district.cities.some(c => isCitySelected(c));

                    return (
                      <div key={district.id}>
                        {/* District header */}
                        <div
                          className={`flex items-center gap-2 p-2 rounded-lg transition-all cursor-pointer ${
                            isDistSelected
                              ? "bg-blue-500/10 border border-blue-500/20"
                              : hasCitySelected
                              ? "bg-blue-500/5 border border-blue-500/10"
                              : "bg-zinc-800/20 border border-transparent hover:bg-zinc-800/40"
                          } ${isSelected ? "opacity-50 pointer-events-none" : ""}`}
                        >
                          {/* Expand button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              toggleDistrictExpand(district.id);
                            }}
                            className="p-0.5 hover:bg-zinc-700/50 rounded z-10"
                          >
                            {isDistExpanded ? (
                              <ChevronDown className="w-3 h-3 text-zinc-400" />
                            ) : (
                              <ChevronRight className="w-3 h-3 text-zinc-400" />
                            )}
                          </button>
                          
                          {/* Selection area */}
                          <div
                            role="button"
                            tabIndex={isSelected ? -1 : 0}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (!isSelected) toggleDistrict(district);
                            }}
                            onKeyDown={(e) => {
                              if (!isSelected && (e.key === "Enter" || e.key === " ")) {
                                e.preventDefault();
                                toggleDistrict(district);
                              }
                            }}
                            className="flex items-center gap-2 flex-1 cursor-pointer"
                          >
                            <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all shrink-0 ${
                              isDistSelected
                                ? "bg-blue-500 border-blue-500"
                                : hasCitySelected
                                ? "border-blue-500/50 bg-blue-500/20"
                                : "border-zinc-600 hover:border-zinc-500"
                            }`}>
                              {isDistSelected && <Check className="w-2.5 h-2.5 text-white" />}
                              {!isDistSelected && hasCitySelected && <div className="w-1.5 h-1.5 bg-blue-500 rounded-sm" />}
                            </div>
                            
                            <MapPin className="w-3 h-3 text-blue-400 shrink-0" />
                            <span className="flex-1 text-sm text-zinc-300">{district.name}</span>
                          </div>
                          
                          <span className="text-xs text-zinc-600 shrink-0">{district.cities.length}</span>
                        </div>

                        {/* Cities */}
                        {isDistExpanded && (
                          <div className="ml-6 mt-1 grid grid-cols-2 gap-1">
                            {district.cities.map(city => {
                              const isCityChecked = isCitySelected(city) || isDistSelected;
                              
                              return (
                                <button
                                  key={city}
                                  onClick={() => toggleCity(city, district)}
                                  disabled={isDistSelected}
                                  className={`flex items-center gap-2 p-1.5 rounded text-left transition-all ${
                                    isCityChecked
                                      ? "bg-violet-500/10 text-violet-400"
                                      : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-300"
                                  } disabled:opacity-50`}
                                >
                                  <div className={`w-3 h-3 rounded border flex items-center justify-center ${
                                    isCityChecked
                                      ? "bg-violet-500 border-violet-500"
                                      : "border-zinc-600"
                                  }`}>
                                    {isCityChecked && <Check className="w-2 h-2 text-white" />}
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
      <div className="flex flex-wrap gap-2 pt-4 border-t border-zinc-800">
        <span className="text-xs text-zinc-500">Rýchly výber:</span>
        <button
          onClick={() => onRegionsChange(Object.keys(REGIONS))}
          className="text-xs px-2 py-1 rounded bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
        >
          Celé Slovensko
        </button>
        <button
          onClick={() => onRegionsChange(["BA", "TT", "NR"])}
          className="text-xs px-2 py-1 rounded bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
        >
          Západné Slovensko
        </button>
        <button
          onClick={() => onRegionsChange(["ZA", "BB", "TN"])}
          className="text-xs px-2 py-1 rounded bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
        >
          Stredné Slovensko
        </button>
        <button
          onClick={() => onRegionsChange(["PO", "KE"])}
          className="text-xs px-2 py-1 rounded bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
        >
          Východné Slovensko
        </button>
      </div>
    </div>
  );
}
