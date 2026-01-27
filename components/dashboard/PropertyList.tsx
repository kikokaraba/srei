"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useUserPreferences } from "@/lib/hooks/useUserPreferences";
import {
  Search,
  SlidersHorizontal,
  MapPin,
  Home,
  TrendingUp,
  Loader2,
  Bookmark,
  BookmarkCheck,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  List,
  X,
  TrendingDown,
} from "lucide-react";
import { normalizeCityName, getCityInfo } from "@/lib/constants/cities";

// Slovenské kraje - mestá zodpovedajú formátu v databáze
const REGIONS = [
  { value: "BA", label: "Bratislavský", cities: ["Bratislava", "Pezinok", "Senec", "Malacky"] },
  { value: "TT", label: "Trnavský", cities: ["Trnava", "Piešťany", "Hlohovec", "Galanta", "Dunajská Streda", "Skalica", "Senica"] },
  { value: "TN", label: "Trenčiansky", cities: ["Trenčín", "Považská Bystrica", "Prievidza", "Partizánske", "Nové Mesto nad Váhom", "Dubnica nad Váhom"] },
  { value: "NR", label: "Nitriansky", cities: ["Nitra", "Komárno", "Nové Zámky", "Levice", "Šaľa", "Štúrovo"] },
  { value: "ZA", label: "Žilinský", cities: ["Žilina", "Martin", "Ružomberok", "Liptovský Mikuláš", "Čadca", "Dolný Kubín", "Námestovo"] },
  { value: "BB", label: "Banskobystrický", cities: ["Banská Bystrica", "Zvolen", "Brezno", "Lučenec", "Rimavská Sobota", "Žiar nad Hronom", "Veľký Krtíš"] },
  { value: "PO", label: "Prešovský", cities: ["Prešov", "Poprad", "Humenné", "Bardejov", "Vranov nad Topľou", "Svidník", "Stará Ľubovňa", "Kežmarok", "Snina"] },
  { value: "KE", label: "Košický", cities: ["Košice", "Michalovce", "Spišská Nová Ves", "Trebišov", "Rožňava", "Sobrance"] },
];

// Regions are now handled by lib/constants/cities.ts

const CONDITIONS = [
  { value: "POVODNY", label: "Pôvodný stav" },
  { value: "REKONSTRUKCIA", label: "Po rekonštrukcii" },
  { value: "NOVOSTAVBA", label: "Novostavba" },
];

const SORT_OPTIONS = [
  { value: "createdAt", label: "Najnovšie" },
  { value: "price", label: "Cena" },
  { value: "area", label: "Plocha" },
  { value: "price_per_m2", label: "Cena za m²" },
];

interface Property {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  city: string;
  district: string;
  address: string;
  price: number;
  area_m2: number;
  price_per_m2: number;
  rooms: number | null;
  floor: number | null;
  condition: string;
  energy_certificate: string;
  source_url: string | null;
  is_distressed: boolean;
  days_on_market: number;
  listing_type: "PREDAJ";
  source: "NEHNUTELNOSTI";
  investmentMetrics: {
    gross_yield: number;
    net_yield: number;
    cash_on_cash: number;
  } | null;
}

// Batch metriky pre investor insights
interface PriceHistoryPoint {
  price: number;
  date: string;
  changePercent: number | null;
}

interface BatchMetrics {
  duplicateCount: number;
  bestPrice: number | null;
  savingsPercent: number | null;
  priceDrops: number;
  lastPriceChange: number | null;
  daysOnMarket: number;
  trustIndicators: {
    hasMultipleSources: boolean;
    priceDropped: boolean;
    longOnMarket: boolean;
    freshListing: boolean;
  };
  priceStory: {
    originalPrice: number | null;
    currentPrice: number;
    totalChange: number | null;
    totalChangePercent: number | null;
    history: PriceHistoryPoint[];
  };
}

// Rental data is collected in background for yield calculations but not shown in UI

// Zdroje inzerátov
const SOURCES = [
  { value: "", label: "Všetky zdroje" },
  { value: "NEHNUTELNOSTI", label: "Nehnutelnosti.sk" },
];

interface Filters {
  search: string;
  region: string;
  listingType: string;
  source: string;
  minPrice: string;
  maxPrice: string;
  minArea: string;
  maxArea: string;
  minRooms: string;
  maxRooms: string;
  condition: string;
  minYield: string;
  sortBy: string;
  sortOrder: string;
}

const defaultFilters: Filters = {
  search: "",
  region: "",
  listingType: "PREDAJ",
  source: "",
  minPrice: "",
  maxPrice: "",
  minArea: "",
  maxArea: "",
  minRooms: "",
  maxRooms: "",
  condition: "",
  minYield: "",
  sortBy: "createdAt",
  sortOrder: "desc",
};

// Štýly pre zdroje
function getSourceStyle(source: string): { label: string; bg: string; text: string } {
  switch (source) {
    case "NEHNUTELNOSTI":
      return { label: "Nehnutelnosti.sk", bg: "bg-blue-500/20", text: "text-blue-400" };
    default:
      return { label: source, bg: "bg-slate-500/20", text: "text-slate-400" };
  }
}

// Štýly pre typ inzerátu (only PREDAJ shown in UI, PRENAJOM collected in background for yield calculations)
function getListingTypeStyle(_type: string): { label: string; bg: string; text: string } {
  return { label: "Predaj", bg: "bg-emerald-500/20", text: "text-emerald-400" };
}

export function PropertyList() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [filtersInitialized, setFiltersInitialized] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    totalCount: 0,
    totalPages: 0,
    hasMore: false,
  });
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [savingId, setSavingId] = useState<string | null>(null);
  
  // Investor batch metrics
  const [batchMetrics, setBatchMetrics] = useState<Record<string, BatchMetrics>>({});
  
  // Load user preferences (but DON'T auto-apply them to filters - let user choose)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { preferences: _preferences, isLoading: prefsLoading } = useUserPreferences();
  
  // Set filters as initialized immediately - don't wait for or apply preferences
  useEffect(() => {
    if (!filtersInitialized) {
      setFiltersInitialized(true);
    }
  }, [filtersInitialized]);

  const ITEMS_PER_PAGE = 12;

  const fetchProperties = useCallback(async () => {
    try {
      setLoading(true);
      
      // Zostav query string
      const params = new URLSearchParams();
      params.append("page", page.toString());
      params.append("limit", ITEMS_PER_PAGE.toString());
      params.append("sortBy", filters.sortBy);
      params.append("sortOrder", filters.sortOrder);
      
      if (filters.search) params.append("search", filters.search);
      if (filters.listingType) params.append("listingType", filters.listingType);
      if (filters.source) params.append("source", filters.source);
      
      // Mapuj región na mestá - "Všetky kraje" znamená žiadny filter
      if (filters.region) {
        const region = REGIONS.find(r => r.value === filters.region);
        if (region) {
          params.append("cities", region.cities.join(","));
        }
      }
      // Keď je region prázdny, nepoužívame žiadny mestský filter - zobrazia sa všetky nehnuteľnosti
      
      if (filters.minPrice) params.append("minPrice", filters.minPrice);
      if (filters.maxPrice) params.append("maxPrice", filters.maxPrice);
      if (filters.minArea) params.append("minArea", filters.minArea);
      if (filters.maxArea) params.append("maxArea", filters.maxArea);
      if (filters.minRooms) params.append("minRooms", filters.minRooms);
      if (filters.maxRooms) params.append("maxRooms", filters.maxRooms);
      if (filters.condition) params.append("condition", filters.condition);
      if (filters.minYield) params.append("minYield", filters.minYield);

      const response = await fetch(`/api/v1/properties/filtered?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error("Failed to fetch properties");
      }
      
      const data = await response.json();
      setProperties(data.data || []);
      setPagination(data.pagination || { totalCount: 0, totalPages: 0, hasMore: false });
    } catch (error) {
      console.error("Error fetching properties:", error);
      setProperties([]);
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  const fetchSavedProperties = useCallback(async () => {
    try {
      const response = await fetch("/api/v1/saved-properties");
      if (response.ok) {
        const data = await response.json();
        const ids = new Set<string>(data.data?.map((s: { propertyId: string }) => s.propertyId) || []);
        setSavedIds(ids);
      }
    } catch (error) {
      console.error("Error fetching saved properties:", error);
    }
  }, []);

  // Fetch batch investor metrics for all displayed properties
  const fetchBatchMetrics = useCallback(async (propertyIds: string[]) => {
    if (propertyIds.length === 0) return;
    try {
      const response = await fetch("/api/v1/investor/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertyIds }),
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setBatchMetrics(data.data);
        }
      }
    } catch (error) {
      console.error("Error fetching batch metrics:", error);
    }
  }, []);

  useEffect(() => {
    // Wait for filters to be initialized from user preferences
    if (!filtersInitialized) return;
    fetchProperties();
  }, [fetchProperties, filtersInitialized]);

  useEffect(() => {
    fetchSavedProperties();
  }, [fetchSavedProperties]);

  // Fetch investor metrics when properties change
  useEffect(() => {
    if (properties.length > 0) {
      const ids = properties.map(p => p.id);
      fetchBatchMetrics(ids);
    }
  }, [properties, fetchBatchMetrics]);

  const toggleSave = async (propertyId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSavingId(propertyId);
    try {
      if (savedIds.has(propertyId)) {
        await fetch(`/api/v1/saved-properties?propertyId=${propertyId}`, {
          method: "DELETE",
        });
        setSavedIds((prev) => {
          const next = new Set(prev);
          next.delete(propertyId);
          return next;
        });
      } else {
        await fetch("/api/v1/saved-properties", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ propertyId }),
        });
        setSavedIds((prev) => new Set(prev).add(propertyId));
      }
    } catch (error) {
      console.error("Error toggling save:", error);
    } finally {
      setSavingId(null);
    }
  };

  const handleFilterChange = (key: keyof Filters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1); // Reset page when filters change
  };

  const clearFilters = () => {
    setFilters(defaultFilters);
    setPage(1);
  };

  // Count only truly user-set filters (exclude sorting and defaults)
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    // Only count these specific filters if they have non-default values
    if (filters.search) count++;
    if (filters.region) count++;
    if (filters.source) count++;
    if (filters.minPrice) count++;
    if (filters.maxPrice) count++;
    if (filters.minArea) count++;
    if (filters.maxArea) count++;
    if (filters.minRooms) count++;
    if (filters.maxRooms) count++;
    if (filters.condition) count++;
    if (filters.minYield) count++;
    // listingType is always PREDAJ now (not user-selectable), don't count it
    return count;
  }, [filters]);

  const getRegionLabel = (city: string) => {
    const normalized = normalizeCityName(city);
    const cityInfo = getCityInfo(normalized);
    return cityInfo?.region || city;
  };

  const getConditionLabel = (condition: string) => {
    return CONDITIONS.find((c) => c.value === condition)?.label || condition;
  };

  return (
    <div className="space-y-6">
      {/* Search and Filter Bar */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Hľadať podľa názvu, adresy alebo okresu..."
              value={filters.search}
              onChange={(e) => handleFilterChange("search", e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Region Select */}
          <select
            value={filters.region}
            onChange={(e) => handleFilterChange("region", e.target.value)}
            className="px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-emerald-500 min-w-[180px]"
          >
            <option value="">Všetky kraje</option>
            {REGIONS.map((region) => (
              <option key={region.value} value={region.value}>
                {region.label} kraj
              </option>
            ))}
          </select>

          {/* Sort */}
          <div className="flex gap-2">
            <select
              value={filters.sortBy}
              onChange={(e) => handleFilterChange("sortBy", e.target.value)}
              className="px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-emerald-500"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <button
              onClick={() => handleFilterChange("sortOrder", filters.sortOrder === "asc" ? "desc" : "asc")}
              className="px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 hover:border-emerald-500 transition-colors"
            >
              {filters.sortOrder === "asc" ? "↑" : "↓"}
            </button>
          </div>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-3 rounded-lg border transition-colors ${
              showFilters || activeFiltersCount > 0
                ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400"
                : "bg-slate-800 border-slate-700 text-slate-100 hover:border-emerald-500"
            }`}
          >
            <SlidersHorizontal className="w-5 h-5" />
            <span>Filtre</span>
            {activeFiltersCount > 0 && (
              <span className="px-2 py-0.5 bg-emerald-500 text-white text-xs rounded-full">
                {activeFiltersCount}
              </span>
            )}
          </button>

          {/* View Mode */}
          <div className="flex bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-3 ${viewMode === "grid" ? "bg-emerald-500/20 text-emerald-400" : "text-slate-400"}`}
            >
              <LayoutGrid className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-3 ${viewMode === "list" ? "bg-emerald-500/20 text-emerald-400" : "text-slate-400"}`}
            >
              <List className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Source Filter */}
        <div className="mt-4 flex items-center gap-2">
          <span className="text-sm text-slate-400">Zdroj:</span>
          {SOURCES.map((src) => (
            <button
              key={src.value}
              onClick={() => handleFilterChange("source", filters.source === src.value ? "" : src.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                filters.source === src.value
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-800 text-slate-400 hover:bg-slate-700"
              }`}
            >
              {src.label}
            </button>
          ))}
        </div>

        {/* Expanded Filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-slate-700">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {/* Price Range */}
              <div>
                <label className="block text-sm text-slate-400 mb-1">
                  Min. cena (€)
                </label>
                <input
                  type="number"
                  placeholder="0"
                  value={filters.minPrice}
                  onChange={(e) => handleFilterChange("minPrice", e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Max. cena (€)</label>
                <input
                  type="number"
                  placeholder="∞"
                  value={filters.maxPrice}
                  onChange={(e) => handleFilterChange("maxPrice", e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Area Range */}
              <div>
                <label className="block text-sm text-slate-400 mb-1">Min. plocha (m²)</label>
                <input
                  type="number"
                  placeholder="0"
                  value={filters.minArea}
                  onChange={(e) => handleFilterChange("minArea", e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Max. plocha (m²)</label>
                <input
                  type="number"
                  placeholder="∞"
                  value={filters.maxArea}
                  onChange={(e) => handleFilterChange("maxArea", e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Rooms */}
              <div>
                <label className="block text-sm text-slate-400 mb-1">Min. izieb</label>
                <input
                  type="number"
                  placeholder="1"
                  min="1"
                  value={filters.minRooms}
                  onChange={(e) => handleFilterChange("minRooms", e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Max. izieb</label>
                <input
                  type="number"
                  placeholder="∞"
                  min="1"
                  value={filters.maxRooms}
                  onChange={(e) => handleFilterChange("maxRooms", e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Condition */}
              <div>
                <label className="block text-sm text-slate-400 mb-1">Stav</label>
                <select
                  value={filters.condition}
                  onChange={(e) => handleFilterChange("condition", e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
                >
                  <option value="">Všetky</option>
                  {CONDITIONS.map((cond) => (
                    <option key={cond.value} value={cond.value}>
                      {cond.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Min Yield */}
              <div>
                <label className="block text-sm text-slate-400 mb-1">Min. výnos (%)</label>
                <input
                  type="number"
                  placeholder="0"
                  step="0.1"
                  value={filters.minYield}
                  onChange={(e) => handleFilterChange("minYield", e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Clear Filters */}
            {activeFiltersCount > 0 && (
              <div className="mt-4 flex justify-end">
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-slate-400 hover:text-slate-100 transition-colors"
                >
                  <X className="w-4 h-4" />
                  Vymazať filtre
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between">
        <p className="text-slate-400">
          {loading ? (
            "Načítavam..."
          ) : (
            <>
              Nájdených <span className="text-slate-100 font-medium">{pagination.totalCount}</span> nehnuteľností
            </>
          )}
        </p>
      </div>

      {/* Properties Grid/List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
        </div>
      ) : properties.length === 0 ? (
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-12 text-center">
          <Home className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-300 mb-2">Žiadne nehnuteľnosti</h3>
          <p className="text-slate-500">Skúste upraviť filtre alebo vyhľadávanie</p>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {properties.map((property) => {
            const isSaved = savedIds.has(property.id);
            const isSaving = savingId === property.id;

            return (
              <div
                key={property.id}
                onClick={() => window.location.href = `/dashboard/property/${property.id}`}
                className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden hover:border-emerald-500/30 transition-colors group cursor-pointer"
              >
                {/* Header with badges */}
                <div className="p-4 border-b border-slate-800">
                  {/* Source & Type badges */}
                  <div className="flex items-center gap-2 mb-2">
                    {(() => {
                      const typeStyle = getListingTypeStyle(property.listing_type);
                      return (
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${typeStyle.bg} ${typeStyle.text}`}>
                          {typeStyle.label}
                        </span>
                      );
                    })()}
                    {(() => {
                      const srcStyle = getSourceStyle(property.source);
                      return (
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${srcStyle.bg} ${srcStyle.text}`}>
                          {srcStyle.label}
                        </span>
                      );
                    })()}
                  </div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-slate-100 truncate group-hover:text-emerald-400 transition-colors">
                        {property.title}
                      </h3>
                      <div className="flex items-center gap-1 text-sm text-slate-400 mt-1">
                        <MapPin className="w-4 h-4" />
                        <span className="truncate">{property.district}, {getRegionLabel(property.city)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => toggleSave(property.id, e)}
                        disabled={isSaving}
                        className={`p-2 rounded-lg transition-colors ${
                          isSaved
                            ? "bg-emerald-500/20 text-emerald-400"
                            : "bg-slate-800 text-slate-400 hover:text-emerald-400"
                        }`}
                      >
                        {isSaving ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : isSaved ? (
                          <BookmarkCheck className="w-4 h-4" />
                        ) : (
                          <Bookmark className="w-4 h-4" />
                        )}
                      </button>
                      {property.source_url && (
                        <a
                          href={property.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-blue-400 transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {/* Details */}
                <div className="p-4 space-y-4">
                  {/* Quick Stats */}
                  <div className="flex items-center gap-4 text-sm">
                    {property.rooms && (
                      <div className="flex items-center gap-1 text-slate-400">
                        <Home className="w-4 h-4" />
                        <span>{property.rooms} {property.rooms === 1 ? "izba" : property.rooms < 5 ? "izby" : "izieb"}</span>
                      </div>
                    )}
                    <div className="text-slate-400">{property.area_m2} m²</div>
                    <div className="px-2 py-0.5 bg-slate-800 rounded text-xs text-slate-300">
                      {getConditionLabel(property.condition)}
                    </div>
                  </div>

                  {/* Price and Yield */}
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-2xl font-bold text-slate-100">
                        €{property.price.toLocaleString()}
                      </p>
                      <p className="text-sm text-slate-400">
                        €{property.price_per_m2.toLocaleString()}/m²
                      </p>
                      {/* Price Story - inline */}
                      {(() => {
                        const metrics = batchMetrics[property.id];
                        const story = metrics?.priceStory;
                        if (!story || !story.originalPrice || story.history.length <= 1) {
                          return null;
                        }
                        return (
                          <div className="flex items-center gap-1.5 mt-1 text-xs">
                            {story.history.slice(-3).map((h, i, arr) => (
                              <span key={i} className="flex items-center gap-0.5">
                                {i > 0 && (
                                  <TrendingDown className="w-3 h-3 text-emerald-400" />
                                )}
                                <span className={i === 0 ? "text-slate-500 line-through" : "text-slate-300"}>
                                  {(h.price / 1000).toFixed(0)}k
                                </span>
                              </span>
                            ))}
                            {story.totalChangePercent !== null && story.totalChangePercent < 0 && (
                              <span className="text-emerald-400 font-medium ml-1">
                                ({story.totalChangePercent}%)
                              </span>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                    {property.investmentMetrics && (
                      <div className="text-right">
                        <div className="flex items-center gap-1 text-emerald-400">
                          <TrendingUp className="w-4 h-4" />
                          <span className="font-bold">
                            {property.investmentMetrics.gross_yield.toFixed(1)}%
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">hrubý výnos</p>
                      </div>
                    )}
                  </div>

                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List View */
        <div className="space-y-3">
          {properties.map((property) => {
            const isSaved = savedIds.has(property.id);
            const isSaving = savingId === property.id;

            return (
              <div
                key={property.id}
                onClick={() => window.location.href = `/dashboard/property/${property.id}`}
                className="bg-slate-900 rounded-xl border border-slate-800 p-4 hover:border-emerald-500/30 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-6">
                  {/* Main Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      {/* Type & Source badges */}
                      {(() => {
                        const typeStyle = getListingTypeStyle(property.listing_type);
                        return (
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${typeStyle.bg} ${typeStyle.text}`}>
                            {typeStyle.label}
                          </span>
                        );
                      })()}
                      {(() => {
                        const srcStyle = getSourceStyle(property.source);
                        return (
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${srcStyle.bg} ${srcStyle.text}`}>
                            {srcStyle.label}
                          </span>
                        );
                      })()}
                      <h3 className="font-semibold text-slate-100 truncate">
                        {property.title}
                      </h3>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-400">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        <span>{property.district}, {getRegionLabel(property.city)}</span>
                      </div>
                      {property.rooms && (
                        <span>{property.rooms} izby</span>
                      )}
                      <span>{property.area_m2} m²</span>
                      <span>{getConditionLabel(property.condition)}</span>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="text-right">
                    <p className="text-xl font-bold text-slate-100">
                      €{property.price.toLocaleString()}
                    </p>
                    <p className="text-sm text-slate-400">
                      €{property.price_per_m2.toLocaleString()}/m²
                    </p>
                  </div>

                  {/* Yield */}
                  {property.investmentMetrics && (
                    <div className="text-right w-20">
                      <div className="flex items-center justify-end gap-1 text-emerald-400">
                        <TrendingUp className="w-4 h-4" />
                        <span className="font-bold">
                          {property.investmentMetrics.gross_yield.toFixed(1)}%
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">výnos</p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => toggleSave(property.id, e)}
                      disabled={isSaving}
                      className={`p-2 rounded-lg transition-colors ${
                        isSaved
                          ? "bg-emerald-500/20 text-emerald-400"
                          : "bg-slate-800 text-slate-400 hover:text-emerald-400"
                      }`}
                    >
                      {isSaving ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : isSaved ? (
                        <BookmarkCheck className="w-4 h-4" />
                      ) : (
                        <Bookmark className="w-4 h-4" />
                      )}
                    </button>
                    {property.source_url && (
                      <a
                        href={property.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-blue-400 transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 disabled:opacity-50 disabled:cursor-not-allowed hover:border-emerald-500 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Predchádzajúca
          </button>
          
          <div className="flex items-center gap-2">
            {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
              let pageNum: number;
              if (pagination.totalPages <= 5) {
                pageNum = i + 1;
              } else if (page <= 3) {
                pageNum = i + 1;
              } else if (page >= pagination.totalPages - 2) {
                pageNum = pagination.totalPages - 4 + i;
              } else {
                pageNum = page - 2 + i;
              }
              
              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={`w-10 h-10 rounded-lg transition-colors ${
                    page === pageNum
                      ? "bg-emerald-500 text-white"
                      : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>
          
          <button
            onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
            disabled={page === pagination.totalPages}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 disabled:opacity-50 disabled:cursor-not-allowed hover:border-emerald-500 transition-colors"
          >
            Ďalšia
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
