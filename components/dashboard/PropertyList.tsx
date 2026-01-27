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
  Clock,
  Flame,
  Sparkles,
  ArrowDownRight,
  Building2,
  Maximize2,
  DoorOpen,
  Zap,
  ImageOff,
  Camera,
} from "lucide-react";
import Image from "next/image";
import { normalizeCityName, getCityInfo } from "@/lib/constants/cities";

// Slovenské kraje
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

const CONDITIONS = [
  { value: "POVODNY", label: "Pôvodný stav" },
  { value: "REKONSTRUKCIA", label: "Po rekonštrukcii" },
  { value: "NOVOSTAVBA", label: "Novostavba" },
];

const SORT_OPTIONS = [
  { value: "createdAt", label: "Najnovšie" },
  { value: "price", label: "Cena" },
  { value: "area", label: "Plocha" },
  { value: "price_per_m2", label: "Cena/m²" },
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
  source: "NEHNUTELNOSTI" | "BAZOS" | "REALITY" | "TOPREALITY";
  // Fotky
  photos?: string;
  thumbnail_url?: string | null;
  photo_count?: number;
  // Kontakt
  seller_name?: string | null;
  seller_phone?: string | null;
  // Časové polia pre freshness
  createdAt?: string;
  updatedAt?: string;
  last_seen_at?: string;
  investmentMetrics: {
    gross_yield: number;
    net_yield: number;
    cash_on_cash: number;
  } | null;
}

// Helper pre formatovanie relatívneho času
function getRelativeTime(dateString: string | undefined): { text: string; isRecent: boolean; isVeryRecent: boolean } {
  if (!dateString) return { text: "", isRecent: false, isVeryRecent: false };
  
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  // Veľmi čerstvé (do 30 minút)
  if (diffMins < 30) {
    return { 
      text: diffMins <= 1 ? "Práve teraz" : `pred ${diffMins} min`, 
      isRecent: true, 
      isVeryRecent: true 
    };
  }
  
  // Čerstvé (do 2 hodín)
  if (diffHours < 2) {
    return { 
      text: `pred ${diffMins} min`, 
      isRecent: true, 
      isVeryRecent: false 
    };
  }
  
  // Dnes
  if (diffHours < 24) {
    return { 
      text: `pred ${diffHours} hod`, 
      isRecent: diffHours < 6, 
      isVeryRecent: false 
    };
  }
  
  // Včera alebo starší
  if (diffDays === 1) {
    return { text: "včera", isRecent: false, isVeryRecent: false };
  }
  
  if (diffDays < 7) {
    return { text: `pred ${diffDays} dňami`, isRecent: false, isVeryRecent: false };
  }
  
  return { text: "", isRecent: false, isVeryRecent: false };
}

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
  const [batchMetrics, setBatchMetrics] = useState<Record<string, BatchMetrics>>({});
  
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { preferences: _preferences, isLoading: prefsLoading } = useUserPreferences();
  
  useEffect(() => {
    if (!filtersInitialized) {
      setFiltersInitialized(true);
    }
  }, [filtersInitialized]);

  const ITEMS_PER_PAGE = 12;

  const fetchProperties = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append("page", page.toString());
      params.append("limit", ITEMS_PER_PAGE.toString());
      params.append("sortBy", filters.sortBy);
      params.append("sortOrder", filters.sortOrder);
      
      if (filters.search) params.append("search", filters.search);
      if (filters.listingType) params.append("listingType", filters.listingType);
      if (filters.source) params.append("source", filters.source);
      
      if (filters.region) {
        const region = REGIONS.find(r => r.value === filters.region);
        if (region) {
          params.append("cities", region.cities.join(","));
        }
      }
      
      if (filters.minPrice) params.append("minPrice", filters.minPrice);
      if (filters.maxPrice) params.append("maxPrice", filters.maxPrice);
      if (filters.minArea) params.append("minArea", filters.minArea);
      if (filters.maxArea) params.append("maxArea", filters.maxArea);
      if (filters.minRooms) params.append("minRooms", filters.minRooms);
      if (filters.maxRooms) params.append("maxRooms", filters.maxRooms);
      if (filters.condition) params.append("condition", filters.condition);
      if (filters.minYield) params.append("minYield", filters.minYield);

      const response = await fetch(`/api/v1/properties/filtered?${params.toString()}`);
      
      if (!response.ok) throw new Error("Failed to fetch properties");
      
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
    if (!filtersInitialized) return;
    fetchProperties();
  }, [fetchProperties, filtersInitialized]);

  useEffect(() => {
    fetchSavedProperties();
  }, [fetchSavedProperties]);

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
        await fetch(`/api/v1/saved-properties?propertyId=${propertyId}`, { method: "DELETE" });
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
    setPage(1);
  };

  const clearFilters = () => {
    setFilters(defaultFilters);
    setPage(1);
  };

  const activeFiltersCount = useMemo(() => {
    let count = 0;
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

  // Helper pre získanie thumbnail URL
  const getThumbnailUrl = (property: Property): string | null => {
    // Prioritne thumbnail_url
    if (property.thumbnail_url) {
      return property.thumbnail_url;
    }
    // Fallback na prvú fotku z JSON poľa
    if (property.photos) {
      try {
        const photosArray = JSON.parse(property.photos);
        if (Array.isArray(photosArray) && photosArray.length > 0) {
          return photosArray[0];
        }
      } catch {
        // Ak photos nie je validné JSON, skús či to nie je samotná URL
        if (property.photos.startsWith("http")) {
          return property.photos;
        }
      }
    }
    return null;
  };

  // Investor-focused badges
  const getPropertyBadges = (property: Property, metrics?: BatchMetrics) => {
    const badges: { icon: React.ReactNode; label: string; color: string; priority: number }[] = [];
    
    // Freshness Indicator - veľmi čerstvé (PRÁVE PRIDANÉ)
    const freshness = getRelativeTime(property.last_seen_at || property.updatedAt);
    if (freshness.isVeryRecent) {
      badges.push({
        icon: <Zap className="w-3 h-3" />,
        label: freshness.text === "Práve teraz" ? "LIVE" : freshness.text.toUpperCase(),
        color: "bg-gradient-to-r from-green-400 to-emerald-500 text-white animate-pulse",
        priority: 0, // Najvyššia priorita
      });
    } else if (freshness.isRecent) {
      badges.push({
        icon: <Clock className="w-3 h-3" />,
        label: freshness.text,
        color: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
        priority: 1,
      });
    }
    
    // Hot deal - significant price drop
    if (metrics?.priceStory?.totalChangePercent && metrics.priceStory.totalChangePercent <= -10) {
      badges.push({
        icon: <Flame className="w-3 h-3" />,
        label: `${Math.abs(metrics.priceStory.totalChangePercent)}% zľava`,
        color: "bg-gradient-to-r from-orange-500 to-red-500 text-white",
        priority: 2,
      });
    }
    
    // Fresh listing (fallback ak nemáme presný čas)
    if (!freshness.isRecent && !freshness.isVeryRecent && property.days_on_market <= 1) {
      badges.push({
        icon: <Sparkles className="w-3 h-3" />,
        label: "Novinka",
        color: "bg-gradient-to-r from-violet-500 to-purple-500 text-white",
        priority: 3,
      });
    }
    
    // High yield
    if (property.investmentMetrics && property.investmentMetrics.gross_yield >= 6) {
      badges.push({
        icon: <TrendingUp className="w-3 h-3" />,
        label: `${property.investmentMetrics.gross_yield.toFixed(1)}% výnos`,
        color: "bg-gradient-to-r from-emerald-500 to-teal-500 text-white",
        priority: 4,
      });
    }
    
    // Long on market (negotiation opportunity)
    if (property.days_on_market >= 60) {
      badges.push({
        icon: <Clock className="w-3 h-3" />,
        label: `${property.days_on_market}d v ponuke`,
        color: "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30",
        priority: 5,
      });
    }
    
    // Multiple price drops
    if (metrics?.priceDrops && metrics.priceDrops >= 2) {
      badges.push({
        icon: <ArrowDownRight className="w-3 h-3" />,
        label: `${metrics.priceDrops}x znížené`,
        color: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
        priority: 6,
      });
    }
    
    return badges.sort((a, b) => a.priority - b.priority).slice(0, 2);
  };

  return (
    <div className="space-y-6">
      {/* Modern Search Bar */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 via-transparent to-blue-500/10 rounded-2xl blur-xl"></div>
        <div className="relative bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-slate-800/50 p-5">
          {/* Main Search Row */}
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search Input */}
            <div className="flex-1 relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-emerald-400 transition-colors" />
              <input
                type="text"
                placeholder="Hľadať nehnuteľnosti..."
                value={filters.search}
                onChange={(e) => handleFilterChange("search", e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 focus:bg-slate-800 transition-all"
              />
            </div>

            {/* Quick Filters */}
            <div className="flex flex-wrap gap-2 items-center">
              {/* Region */}
              <select
                value={filters.region}
                onChange={(e) => handleFilterChange("region", e.target.value)}
                className="px-4 py-3.5 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white focus:outline-none focus:border-emerald-500/50 min-w-[160px] cursor-pointer"
              >
                <option value="">Celé Slovensko</option>
                {REGIONS.map((region) => (
                  <option key={region.value} value={region.value}>
                    {region.label}
                  </option>
                ))}
              </select>

              {/* Sort */}
              <div className="flex items-center bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
                <select
                  value={filters.sortBy}
                  onChange={(e) => handleFilterChange("sortBy", e.target.value)}
                  className="px-4 py-3.5 bg-transparent text-white focus:outline-none cursor-pointer border-r border-slate-700/50"
                >
                  {SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => handleFilterChange("sortOrder", filters.sortOrder === "asc" ? "desc" : "asc")}
                  className="px-4 py-3.5 text-slate-400 hover:text-white transition-colors"
                >
                  {filters.sortOrder === "asc" ? "↑" : "↓"}
                </button>
              </div>

              {/* Advanced Filters Toggle */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-4 py-3.5 rounded-xl border transition-all ${
                  showFilters || activeFiltersCount > 0
                    ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400"
                    : "bg-slate-800/50 border-slate-700/50 text-slate-400 hover:text-white hover:border-slate-600"
                }`}
              >
                <SlidersHorizontal className="w-4 h-4" />
                <span className="hidden sm:inline">Filtre</span>
                {activeFiltersCount > 0 && (
                  <span className="w-5 h-5 flex items-center justify-center bg-emerald-500 text-white text-xs rounded-full">
                    {activeFiltersCount}
                  </span>
                )}
              </button>

              {/* View Mode */}
              <div className="flex bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-3.5 transition-all ${viewMode === "grid" ? "bg-emerald-500/20 text-emerald-400" : "text-slate-400 hover:text-white"}`}
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-3.5 transition-all ${viewMode === "list" ? "bg-emerald-500/20 text-emerald-400" : "text-slate-400 hover:text-white"}`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Expanded Filters */}
          {showFilters && (
            <div className="mt-5 pt-5 border-t border-slate-700/50">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <div>
                  <label className="block text-xs text-slate-500 mb-2 uppercase tracking-wider">Min. cena</label>
                  <input
                    type="number"
                    placeholder="€0"
                    value={filters.minPrice}
                    onChange={(e) => handleFilterChange("minPrice", e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500/50"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-2 uppercase tracking-wider">Max. cena</label>
                  <input
                    type="number"
                    placeholder="€∞"
                    value={filters.maxPrice}
                    onChange={(e) => handleFilterChange("maxPrice", e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500/50"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-2 uppercase tracking-wider">Min. plocha</label>
                  <input
                    type="number"
                    placeholder="0 m²"
                    value={filters.minArea}
                    onChange={(e) => handleFilterChange("minArea", e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500/50"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-2 uppercase tracking-wider">Max. plocha</label>
                  <input
                    type="number"
                    placeholder="∞ m²"
                    value={filters.maxArea}
                    onChange={(e) => handleFilterChange("maxArea", e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500/50"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-2 uppercase tracking-wider">Izby</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      placeholder="Od"
                      min="1"
                      value={filters.minRooms}
                      onChange={(e) => handleFilterChange("minRooms", e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500/50"
                    />
                    <input
                      type="number"
                      placeholder="Do"
                      min="1"
                      value={filters.maxRooms}
                      onChange={(e) => handleFilterChange("maxRooms", e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500/50"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-2 uppercase tracking-wider">Stav</label>
                  <select
                    value={filters.condition}
                    onChange={(e) => handleFilterChange("condition", e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500/50 cursor-pointer"
                  >
                    <option value="">Všetky</option>
                    {CONDITIONS.map((cond) => (
                      <option key={cond.value} value={cond.value}>{cond.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {activeFiltersCount > 0 && (
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={clearFilters}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
                  >
                    <X className="w-4 h-4" />
                    Vymazať filtre
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between px-1">
        <p className="text-slate-400">
          {loading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Načítavam...
            </span>
          ) : (
            <>
              Nájdených <span className="text-white font-semibold">{pagination.totalCount.toLocaleString()}</span> nehnuteľností
            </>
          )}
        </p>
      </div>

      {/* Properties */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-slate-700 rounded-full"></div>
              <div className="absolute top-0 left-0 w-16 h-16 border-4 border-emerald-500 rounded-full animate-spin border-t-transparent"></div>
            </div>
            <p className="text-slate-400">Hľadám nehnuteľnosti...</p>
          </div>
        </div>
      ) : properties.length === 0 ? (
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-b from-slate-800/50 to-transparent rounded-2xl"></div>
          <div className="relative bg-slate-900/50 backdrop-blur rounded-2xl border border-slate-800/50 p-16 text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-slate-800/50 flex items-center justify-center">
              <Building2 className="w-10 h-10 text-slate-600" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Žiadne nehnuteľnosti</h3>
            <p className="text-slate-400 max-w-md mx-auto">
              Skúste upraviť vyhľadávacie kritériá alebo odstrániť niektoré filtre
            </p>
            {activeFiltersCount > 0 && (
              <button
                onClick={clearFilters}
                className="mt-6 px-6 py-3 bg-emerald-500/20 text-emerald-400 rounded-xl hover:bg-emerald-500/30 transition-colors"
              >
                Vymazať filtre
              </button>
            )}
          </div>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-5">
          {properties.map((property) => {
            const isSaved = savedIds.has(property.id);
            const isSaving = savingId === property.id;
            const metrics = batchMetrics[property.id];
            const badges = getPropertyBadges(property, metrics);
            const thumbnailUrl = getThumbnailUrl(property);

            return (
              <div
                key={property.id}
                onClick={() => window.location.href = `/dashboard/property/${property.id}`}
                className="group relative bg-slate-900/80 backdrop-blur rounded-xl sm:rounded-2xl border border-slate-800/50 overflow-hidden hover:border-emerald-500/30 transition-all duration-300 cursor-pointer hover:shadow-lg hover:shadow-emerald-500/5 active:scale-[0.98]"
              >
                {/* Photo Section - menšia výška na mobile */}
                <div className="relative h-40 sm:h-48 bg-slate-800/50 overflow-hidden">
                  {thumbnailUrl ? (
                    <Image
                      src={thumbnailUrl}
                      alt={property.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      unoptimized // Použijeme external images
                    />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-600">
                      <ImageOff className="w-12 h-12 mb-2" />
                      <span className="text-xs">Bez fotky</span>
                    </div>
                  )}
                  
                  {/* Photo Count Badge */}
                  {property.photo_count && property.photo_count > 1 && (
                    <div className="absolute bottom-3 right-3 flex items-center gap-1 px-2 py-1 bg-black/60 backdrop-blur rounded-lg text-xs text-white">
                      <Camera className="w-3 h-3" />
                      {property.photo_count}
                    </div>
                  )}
                  
                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent" />
                  
                  {/* Top Badges */}
                  {badges.length > 0 && (
                    <div className="absolute top-3 left-3 z-10 flex flex-wrap gap-2">
                      {badges.map((badge, i) => (
                        <span key={i} className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium shadow-lg ${badge.color}`}>
                          {badge.icon}
                          {badge.label}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Save Button */}
                  <button
                    onClick={(e) => toggleSave(property.id, e)}
                    disabled={isSaving}
                    className={`absolute top-3 right-3 z-10 w-9 h-9 rounded-full flex items-center justify-center transition-all shadow-lg ${
                      isSaved
                        ? "bg-emerald-500 text-white shadow-emerald-500/25"
                        : "bg-black/50 backdrop-blur text-white hover:bg-black/70"
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
                </div>

                {/* Card Content - menší padding na mobile */}
                <div className="p-3 sm:p-5">
                  {/* Location */}
                  <div className="flex items-center gap-1.5 text-slate-400 text-xs sm:text-sm mb-2 sm:mb-3">
                    <MapPin className="w-3 sm:w-3.5 h-3 sm:h-3.5 flex-shrink-0" />
                    <span className="truncate">{property.district}, {getRegionLabel(property.city)}</span>
                  </div>

                  {/* Title */}
                  <h3 className="font-semibold text-white text-base sm:text-lg leading-tight mb-3 sm:mb-4 line-clamp-2 group-hover:text-emerald-400 transition-colors min-h-[2.5rem] sm:min-h-[3.5rem]">
                    {property.title}
                  </h3>

                  {/* Key Metrics - horizontálne scrollovateľné na mobile */}
                  <div className="flex sm:grid sm:grid-cols-3 gap-2 sm:gap-3 mb-3 sm:mb-5 overflow-x-auto pb-1 sm:pb-0 -mx-1 px-1 sm:mx-0 sm:px-0 scrollbar-hide">
                    <div className="flex-shrink-0 bg-slate-800/50 rounded-lg sm:rounded-xl p-2 sm:p-3 text-center min-w-[70px] sm:min-w-0">
                      <div className="flex items-center justify-center gap-1 text-slate-400 text-[10px] sm:text-xs mb-0.5 sm:mb-1">
                        <Maximize2 className="w-2.5 sm:w-3 h-2.5 sm:h-3" />
                        <span>Plocha</span>
                      </div>
                      <p className="text-white font-semibold text-sm sm:text-base">{property.area_m2} m²</p>
                    </div>
                    <div className="flex-shrink-0 bg-slate-800/50 rounded-lg sm:rounded-xl p-2 sm:p-3 text-center min-w-[60px] sm:min-w-0">
                      <div className="flex items-center justify-center gap-1 text-slate-400 text-[10px] sm:text-xs mb-0.5 sm:mb-1">
                        <DoorOpen className="w-2.5 sm:w-3 h-2.5 sm:h-3" />
                        <span>Izby</span>
                      </div>
                      <p className="text-white font-semibold text-sm sm:text-base">{property.rooms || "–"}</p>
                    </div>
                    <div className="flex-shrink-0 bg-slate-800/50 rounded-lg sm:rounded-xl p-2 sm:p-3 text-center min-w-[70px] sm:min-w-0">
                      <div className="flex items-center justify-center gap-1 text-slate-400 text-[10px] sm:text-xs mb-0.5 sm:mb-1">
                        <Home className="w-2.5 sm:w-3 h-2.5 sm:h-3" />
                        <span>Stav</span>
                      </div>
                      <p className="text-white font-semibold text-[10px] sm:text-xs">{getConditionLabel(property.condition).split(" ")[0]}</p>
                    </div>
                  </div>

                  {/* Price Section - kompaktnejšie na mobile */}
                  <div className="flex items-end justify-between pt-3 sm:pt-4 border-t border-slate-800/50">
                    <div>
                      <p className="text-2xl sm:text-3xl font-bold text-white">
                        €{property.price.toLocaleString()}
                      </p>
                      <div className="flex items-center gap-1.5 sm:gap-2 mt-0.5 sm:mt-1">
                        <span className="text-xs sm:text-sm text-slate-400">
                          €{property.price_per_m2.toLocaleString()}/m²
                        </span>
                        {/* Price History Mini */}
                        {metrics?.priceStory?.totalChangePercent && metrics.priceStory.totalChangePercent < 0 && (
                          <span className="flex items-center gap-0.5 text-[10px] sm:text-xs text-emerald-400">
                            <TrendingDown className="w-2.5 sm:w-3 h-2.5 sm:h-3" />
                            {Math.abs(metrics.priceStory.totalChangePercent)}%
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Yield Badge */}
                    {property.investmentMetrics && property.investmentMetrics.gross_yield > 0 && (
                      <div className="text-right">
                        <div className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg ${
                          property.investmentMetrics.gross_yield >= 6
                            ? "bg-emerald-500/20 text-emerald-400"
                            : property.investmentMetrics.gross_yield >= 4
                            ? "bg-blue-500/20 text-blue-400"
                            : "bg-slate-700/50 text-slate-400"
                        }`}>
                          <TrendingUp className="w-3.5 h-3.5" />
                          <span className="font-bold">{property.investmentMetrics.gross_yield.toFixed(1)}%</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">výnos</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Quick Actions Footer */}
                <div className="px-5 py-3 bg-slate-800/30 border-t border-slate-800/50 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Clock className="w-3 h-3" />
                    <span>{property.days_on_market} dní v ponuke</span>
                  </div>
                  {property.source_url && (
                    <a
                      href={property.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-blue-400 transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Originál
                    </a>
                  )}
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
            const metrics = batchMetrics[property.id];
            const badges = getPropertyBadges(property, metrics);
            const thumbnailUrl = getThumbnailUrl(property);

            return (
              <div
                key={property.id}
                onClick={() => window.location.href = `/dashboard/property/${property.id}`}
                className="group relative bg-slate-900/80 backdrop-blur rounded-xl border border-slate-800/50 overflow-hidden hover:border-emerald-500/30 transition-all cursor-pointer hover:shadow-lg hover:shadow-emerald-500/5"
              >
                <div className="flex">
                  {/* Thumbnail */}
                  <div className="relative w-40 h-28 flex-shrink-0 bg-slate-800/50">
                    {thumbnailUrl ? (
                      <Image
                        src={thumbnailUrl}
                        alt={property.title}
                        fill
                        className="object-cover"
                        sizes="160px"
                        unoptimized
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-slate-600">
                        <ImageOff className="w-8 h-8" />
                      </div>
                    )}
                    {/* Photo Count */}
                    {property.photo_count && property.photo_count > 1 && (
                      <div className="absolute bottom-2 right-2 flex items-center gap-1 px-1.5 py-0.5 bg-black/60 backdrop-blur rounded text-xs text-white">
                        <Camera className="w-3 h-3" />
                        {property.photo_count}
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 p-4 flex items-center gap-6 min-w-0">
                    {/* Left: Badges + Info */}
                    <div className="flex-1 min-w-0">
                      {/* Badges */}
                      {badges.length > 0 && (
                        <div className="flex gap-2 mb-2">
                          {badges.map((badge, i) => (
                            <span key={i} className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${badge.color}`}>
                              {badge.icon}
                              {badge.label}
                            </span>
                          ))}
                        </div>
                      )}
                      
                      {/* Title & Location */}
                      <h3 className="font-semibold text-white truncate group-hover:text-emerald-400 transition-colors mb-1">
                        {property.title}
                      </h3>
                      <div className="flex items-center gap-4 text-sm text-slate-400">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" />
                          {property.district}, {getRegionLabel(property.city)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Maximize2 className="w-3.5 h-3.5" />
                          {property.area_m2} m²
                        </span>
                        {property.rooms && (
                          <span className="flex items-center gap-1">
                            <DoorOpen className="w-3.5 h-3.5" />
                            {property.rooms} izby
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {property.days_on_market}d
                        </span>
                      </div>
                    </div>

                    {/* Right: Price + Yield */}
                    <div className="flex items-center gap-6">
                      {/* Price */}
                      <div className="text-right min-w-[140px]">
                        <p className="text-2xl font-bold text-white">
                          €{property.price.toLocaleString()}
                        </p>
                        <p className="text-sm text-slate-400">
                          €{property.price_per_m2.toLocaleString()}/m²
                        </p>
                      </div>

                      {/* Yield */}
                      {property.investmentMetrics && (
                        <div className={`text-center px-4 py-2 rounded-xl min-w-[80px] ${
                          property.investmentMetrics.gross_yield >= 6
                            ? "bg-emerald-500/20 text-emerald-400"
                            : "bg-slate-800/50 text-slate-400"
                        }`}>
                          <p className="text-xl font-bold flex items-center justify-center gap-1">
                            <TrendingUp className="w-4 h-4" />
                            {property.investmentMetrics.gross_yield.toFixed(1)}%
                          </p>
                          <p className="text-xs opacity-70">výnos</p>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => toggleSave(property.id, e)}
                          disabled={isSaving}
                          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                            isSaved
                              ? "bg-emerald-500 text-white"
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
                            onClick={(e) => e.stopPropagation()}
                            className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 hover:text-blue-400 transition-colors"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-6">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="flex items-center gap-2 px-5 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white disabled:opacity-50 disabled:cursor-not-allowed hover:border-emerald-500/50 transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Späť</span>
          </button>
          
          <div className="flex items-center gap-1">
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
                  className={`w-10 h-10 rounded-xl transition-all ${
                    page === pageNum
                      ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/25"
                      : "bg-slate-800/50 text-slate-400 hover:bg-slate-700 hover:text-white"
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
            className="flex items-center gap-2 px-5 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white disabled:opacity-50 disabled:cursor-not-allowed hover:border-emerald-500/50 transition-all"
          >
            <span className="hidden sm:inline">Ďalej</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
