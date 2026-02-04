"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
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
  Camera,
  User,
} from "lucide-react";
import { normalizeCityName, getCityInfo } from "@/lib/constants/cities";
import { PropertyImage } from "@/components/property/PropertyImage";

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
  is_negotiable?: boolean;
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
  investmentSummary?: string | null;
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
  city: string;
  listingType: string;
  propertyType: string;
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

const PROPERTY_TYPES = [
  { value: "", label: "Všetky" },
  { value: "BYT", label: "Byty" },
  { value: "DOM", label: "Domy" },
  { value: "POZEMOK", label: "Pozemky" },
  { value: "KOMERCNE", label: "Komerčné" },
];

// Hlavné mestá pre filter
const CITIES = [
  "Bratislava", "Košice", "Prešov", "Žilina", "Nitra", "Banská Bystrica",
  "Trnava", "Trenčín", "Martin", "Poprad", "Zvolen", "Považská Bystrica",
  "Michalovce", "Spišská Nová Ves", "Komárno", "Levice", "Humenné",
  "Bardejov", "Liptovský Mikuláš", "Ružomberok", "Piešťany", "Topoľčany",
  "Dubnica nad Váhom", "Čadca", "Dunajská Streda", "Pezinok", "Senec"
];

const defaultFilters: Filters = {
  search: "",
  region: "",
  city: "",
  listingType: "PREDAJ",
  propertyType: "BYT",
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
  const [myProfileOn, setMyProfileOn] = useState(false);
  const prefillDone = useRef(false);

  const { preferences, isLoading: prefsLoading } = useUserPreferences();

  // Predvyplnenie filtrov z preferencií a zapnutie "Môj profil" – aby sa zobrazovalo len to, čo má používateľ v nastaveniach
  useEffect(() => {
    if (prefillDone.current || !preferences || prefsLoading) return;
    const hasLoc = (preferences.trackedRegions?.length || 0) > 0 || (preferences.trackedDistricts?.length || 0) > 0 || (preferences.trackedCities?.length || 0) > 0;
    const hasYield = preferences.minYield != null && preferences.minYield > 0;
    const hasPrice = preferences.maxPrice != null && preferences.maxPrice > 0;
    const hasOther = (preferences.minGrossYield != null && preferences.minGrossYield > 0) || (preferences.minPrice != null) || (preferences.maxPrice != null) || (preferences.minArea != null) || (preferences.minRooms != null);
    const hasAnyPrefs = hasLoc || hasYield || hasPrice || hasOther;
    if (!hasAnyPrefs) return;
    prefillDone.current = true;
    setFilters((prev) => {
      const next = { ...prev };
      if (preferences.trackedRegions?.length === 1) {
        const r = REGIONS.find((x) => x.value === preferences.trackedRegions![0]);
        if (r) next.region = r.value;
      }
      if (preferences.trackedCities?.length === 1 && CITIES.includes(preferences.trackedCities[0])) {
        next.city = preferences.trackedCities[0];
        if (next.region) next.region = "";
      }
      if (hasYield) next.minYield = String(preferences.minYield!);
      if (hasPrice) next.maxPrice = String(preferences.maxPrice!);
      return next;
    });
    // Predvolene zapnúť "Môj profil" – výsledky podľa nastavení z /dashboard/settings
    setMyProfileOn(true);
  }, [preferences, prefsLoading]);

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

      if (myProfileOn) params.append("usePreferences", "true");
      // Vždy posielame všetky explicitné filtre (typ, lokalita, cena, …), aby sa zobrazovali len vybrané typy (byt/dom/…)
      if (filters.search) params.append("search", filters.search);
      if (filters.listingType) params.append("listingType", filters.listingType);
      if (filters.propertyType) params.append("propertyType", filters.propertyType);
      if (filters.source) params.append("source", filters.source);
      if (filters.city) {
        params.append("city", filters.city);
      } else if (filters.region) {
        const region = REGIONS.find((r) => r.value === filters.region);
        if (region) params.append("cities", region.cities.join(","));
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
  }, [filters, page, myProfileOn]);

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

  const toggleMyProfile = useCallback(() => {
    setMyProfileOn((v) => !v);
    setPage(1);
  }, []);

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
    if (filters.city) count++;
    if (filters.propertyType) count++;
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

  /** Zoznam aktívnych filtrov na zobrazenie ako chips – používateľ vidí, čo je zapnuté */
  const activeFilterChips = useMemo(() => {
    const chips: { key: keyof Filters; label: string; value: string }[] = [];
    if (filters.search.trim()) {
      chips.push({ key: "search", label: "Hľadám", value: filters.search.trim() });
    }
    if (filters.region) {
      const r = REGIONS.find((x) => x.value === filters.region);
      chips.push({ key: "region", label: "Kraj", value: r?.label ?? filters.region });
    }
    if (filters.city) {
      chips.push({ key: "city", label: "Mesto", value: filters.city });
    }
    if (filters.propertyType) {
      const p = PROPERTY_TYPES.find((x) => x.value === filters.propertyType);
      if (p?.label && p.label !== "Všetky") {
        chips.push({ key: "propertyType", label: "Typ", value: p.label });
      }
    }
    if (filters.source) {
      chips.push({ key: "source", label: "Zdroj", value: filters.source });
    }
    if (filters.minPrice || filters.maxPrice) {
      const parts = [];
      if (filters.minPrice) parts.push(`od €${Number(filters.minPrice).toLocaleString()}`);
      if (filters.maxPrice) parts.push(`do €${Number(filters.maxPrice).toLocaleString()}`);
      chips.push({ key: "minPrice", label: "Cena", value: parts.join(" ") });
    }
    if (filters.minArea || filters.maxArea) {
      const parts = [];
      if (filters.minArea) parts.push(`${filters.minArea} m²`);
      if (filters.maxArea) parts.push(`– ${filters.maxArea} m²`);
      chips.push({ key: "minArea", label: "Plocha", value: parts.join(" ") });
    }
    if (filters.minRooms || filters.maxRooms) {
      const parts = [];
      if (filters.minRooms) parts.push(filters.minRooms);
      if (filters.maxRooms) parts.push(`– ${filters.maxRooms}`);
      chips.push({ key: "minRooms", label: "Izby", value: parts.join(" ") });
    }
    if (filters.condition) {
      const c = CONDITIONS.find((x) => x.value === filters.condition);
      chips.push({ key: "condition", label: "Stav", value: c?.label ?? filters.condition });
    }
    if (filters.minYield) {
      chips.push({ key: "minYield", label: "Min. výnos", value: `${filters.minYield}%` });
    }
    return chips;
  }, [filters]);

  const clearSingleFilter = useCallback((key: keyof Filters) => {
    const defaults: Record<keyof Filters, string> = {
      search: "",
      region: "",
      city: "",
      listingType: "PREDAJ",
      propertyType: "BYT",
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
    setFilters((prev) => {
      const next = { ...prev };
      if (key === "minPrice" || key === "maxPrice") {
        next.minPrice = "";
        next.maxPrice = "";
      } else if (key === "minArea" || key === "maxArea") {
        next.minArea = "";
        next.maxArea = "";
      } else if (key === "minRooms" || key === "maxRooms") {
        next.minRooms = "";
        next.maxRooms = "";
      } else {
        next[key] = defaults[key];
      }
      return next;
    });
    setPage(1);
  }, []);

  const getRegionLabel = (city: string) => {
    const normalized = normalizeCityName(city);
    const cityInfo = getCityInfo(normalized);
    return cityInfo?.region || city;
  };

  const getConditionLabel = (condition: string) => {
    return CONDITIONS.find((c) => c.value === condition)?.label || condition;
  };

  // Helper pre získanie thumbnail URL (raw z API)
  const getThumbnailUrl = (property: Property): string | null => {
    if (property.thumbnail_url) return property.thumbnail_url;
    if (property.photos) {
      try {
        const photosArray = JSON.parse(property.photos);
        if (Array.isArray(photosArray) && photosArray.length > 0) {
          const u = photosArray[0];
          return typeof u === "string" ? (u.startsWith("//") ? `https:${u}` : u) : null;
        }
      } catch {
        if (property.photos.startsWith("http")) return property.photos;
        if (property.photos.startsWith("//")) return `https:${property.photos}`;
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
        color: "bg-emerald-500 text-white",
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
        color: "bg-orange-500 text-white",
        priority: 2,
      });
    }
    
    // Fresh listing (fallback ak nemáme presný čas)
    if (!freshness.isRecent && !freshness.isVeryRecent && property.days_on_market <= 1) {
      badges.push({
        icon: <Sparkles className="w-3 h-3" />,
        label: "Novinka",
        color: "bg-violet-500 text-white",
        priority: 3,
      });
    }
    
    // High yield
    if (property.investmentMetrics && property.investmentMetrics.gross_yield >= 6) {
      badges.push({
        icon: <TrendingUp className="w-3 h-3" />,
        label: `${property.investmentMetrics.gross_yield.toFixed(1)}% výnos`,
        color: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
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
      {/* Premium Search Bar */}
      <div className="premium-card p-4 lg:p-5">
        {/* Main Search Row */}
        <div className="flex flex-col lg:flex-row gap-3">
          {/* Search Input */}
          <div className="flex-1 relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 group-focus-within:text-emerald-400 transition-colors" />
            <input
              type="text"
              placeholder="Hľadať nehnuteľnosti..."
              value={filters.search}
              onChange={(e) => handleFilterChange("search", e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-zinc-900/50 border border-zinc-800 rounded-xl text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-700 focus:bg-zinc-900 transition-all text-sm"
            />
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap gap-2 items-center">
            {/* Môj investičný profil – filter podľa nastavení */}
            <button
              type="button"
              onClick={toggleMyProfile}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl border transition-all text-sm shrink-0 ${
                myProfileOn
                  ? "bg-amber-500/15 border-amber-500/50 text-amber-400"
                  : "bg-zinc-900/50 border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700"
              }`}
              title={myProfileOn ? "Zobrazujú sa len nehnuteľnosti podľa vašich nastavení (Nastavenia → filtre)" : "Zapnúť: zobrazovať len ponuky podľa kritérií z Nastavení"}
            >
              <User className="w-4 h-4" />
              <span className="hidden sm:inline">Môj profil</span>
            </button>
            {/* Region */}
            <select
              value={filters.region}
              onChange={(e) => handleFilterChange("region", e.target.value)}
              className="px-4 py-3 bg-zinc-900/50 border border-zinc-800 rounded-xl text-zinc-300 text-sm focus:outline-none focus:border-zinc-700 min-w-[150px] cursor-pointer"
            >
              <option value="">Celé Slovensko</option>
              {REGIONS.map((region) => (
                <option key={region.value} value={region.value}>
                  {region.label}
                </option>
              ))}
            </select>

            {/* City */}
            <select
              value={filters.city}
              onChange={(e) => {
                handleFilterChange("city", e.target.value);
                // Reset region keď vyberieme mesto
                if (e.target.value) handleFilterChange("region", "");
              }}
              className="px-4 py-3 bg-zinc-900/50 border border-zinc-800 rounded-xl text-zinc-300 text-sm focus:outline-none focus:border-zinc-700 min-w-[140px] cursor-pointer"
            >
              <option value="">Všetky mestá</option>
              {CITIES.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>

            {/* Kategória – predvolene Byty */}
            <select
              value={filters.propertyType}
              onChange={(e) => handleFilterChange("propertyType", e.target.value)}
              className="px-4 py-3 bg-zinc-900/50 border border-zinc-800 rounded-xl text-zinc-300 text-sm focus:outline-none focus:border-zinc-700 min-w-[120px] cursor-pointer"
            >
              {PROPERTY_TYPES.map((opt) => (
                <option key={opt.value || "all"} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            {/* Sort */}
            <div className="flex items-center bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
              <select
                value={filters.sortBy}
                onChange={(e) => handleFilterChange("sortBy", e.target.value)}
                className="px-4 py-3 bg-transparent text-zinc-300 text-sm focus:outline-none cursor-pointer border-r border-zinc-800"
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <button
                onClick={() => handleFilterChange("sortOrder", filters.sortOrder === "asc" ? "desc" : "asc")}
                className="px-3 py-3 text-zinc-500 hover:text-zinc-200 transition-colors"
              >
                {filters.sortOrder === "asc" ? "↑" : "↓"}
              </button>
            </div>

            {/* Advanced Filters Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl border transition-all text-sm ${
                showFilters || activeFiltersCount > 0
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                  : "bg-zinc-900/50 border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700"
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span className="hidden sm:inline">Filtre</span>
              {activeFiltersCount > 0 && (
                <span className="w-5 h-5 flex items-center justify-center bg-emerald-500 text-white text-xs rounded-full font-medium">
                  {activeFiltersCount}
                </span>
              )}
            </button>

            {/* View Mode */}
            <div className="flex bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-3 transition-all ${viewMode === "grid" ? "bg-zinc-800 text-zinc-100" : "text-zinc-600 hover:text-zinc-300"}`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-3 transition-all ${viewMode === "list" ? "bg-zinc-800 text-zinc-100" : "text-zinc-600 hover:text-zinc-300"}`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

          {/* Aktívne filtre – chips, vždy viditeľné keď niečo je zapnuté */}
          {activeFilterChips.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-medium mr-1">Aktívne filtre:</span>
              {activeFilterChips.map((chip) => (
                <button
                  key={chip.key}
                  type="button"
                  onClick={() => clearSingleFilter(chip.key)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium hover:bg-emerald-500/20 hover:border-emerald-500/50 transition-colors"
                >
                  <span className="text-zinc-500">{chip.label}:</span>
                  <span className="max-w-[140px] truncate" title={chip.value}>{chip.value}</span>
                  <X className="w-3 h-3 flex-shrink-0 opacity-70" />
                </button>
              ))}
            </div>
          )}

          {/* Expanded Filters */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-zinc-800/50">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                <div>
                  <label className={`block text-[10px] mb-1.5 uppercase tracking-widest font-medium ${filters.minPrice ? "text-emerald-500/80" : "text-zinc-600"}`}>Min. cena</label>
                  <input
                    type="number"
                    placeholder="€0"
                    value={filters.minPrice}
                    onChange={(e) => handleFilterChange("minPrice", e.target.value)}
                    className={`w-full px-3 py-2.5 rounded-lg text-zinc-200 text-sm focus:outline-none font-mono border transition-colors ${
                      filters.minPrice ? "bg-emerald-500/5 border-emerald-500/40 focus:border-emerald-500/60" : "bg-zinc-900/50 border-zinc-800 focus:border-zinc-700"
                    }`}
                  />
                </div>
                <div>
                  <label className={`block text-[10px] mb-1.5 uppercase tracking-widest font-medium ${filters.maxPrice ? "text-emerald-500/80" : "text-zinc-600"}`}>Max. cena</label>
                  <input
                    type="number"
                    placeholder="€∞"
                    value={filters.maxPrice}
                    onChange={(e) => handleFilterChange("maxPrice", e.target.value)}
                    className={`w-full px-3 py-2.5 rounded-lg text-zinc-200 text-sm focus:outline-none font-mono border transition-colors ${
                      filters.maxPrice ? "bg-emerald-500/5 border-emerald-500/40 focus:border-emerald-500/60" : "bg-zinc-900/50 border-zinc-800 focus:border-zinc-700"
                    }`}
                  />
                </div>
                <div>
                  <label className={`block text-[10px] mb-1.5 uppercase tracking-widest font-medium ${filters.minArea ? "text-emerald-500/80" : "text-zinc-600"}`}>Min. plocha</label>
                  <input
                    type="number"
                    placeholder="0 m²"
                    value={filters.minArea}
                    onChange={(e) => handleFilterChange("minArea", e.target.value)}
                    className={`w-full px-3 py-2.5 rounded-lg text-zinc-200 text-sm focus:outline-none font-mono border transition-colors ${
                      filters.minArea ? "bg-emerald-500/5 border-emerald-500/40 focus:border-emerald-500/60" : "bg-zinc-900/50 border-zinc-800 focus:border-zinc-700"
                    }`}
                  />
                </div>
                <div>
                  <label className={`block text-[10px] mb-1.5 uppercase tracking-widest font-medium ${filters.maxArea ? "text-emerald-500/80" : "text-zinc-600"}`}>Max. plocha</label>
                  <input
                    type="number"
                    placeholder="∞ m²"
                    value={filters.maxArea}
                    onChange={(e) => handleFilterChange("maxArea", e.target.value)}
                    className={`w-full px-3 py-2.5 rounded-lg text-zinc-200 text-sm focus:outline-none font-mono border transition-colors ${
                      filters.maxArea ? "bg-emerald-500/5 border-emerald-500/40 focus:border-emerald-500/60" : "bg-zinc-900/50 border-zinc-800 focus:border-zinc-700"
                    }`}
                  />
                </div>
                <div>
                  <label className={`block text-[10px] mb-1.5 uppercase tracking-widest font-medium ${(filters.minRooms || filters.maxRooms) ? "text-emerald-500/80" : "text-zinc-600"}`}>Izby</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      placeholder="Od"
                      min="1"
                      value={filters.minRooms}
                      onChange={(e) => handleFilterChange("minRooms", e.target.value)}
                      className={`w-full px-3 py-2.5 rounded-lg text-zinc-200 text-sm focus:outline-none font-mono border transition-colors ${
                        filters.minRooms ? "bg-emerald-500/5 border-emerald-500/40 focus:border-emerald-500/60" : "bg-zinc-900/50 border-zinc-800 focus:border-zinc-700"
                      }`}
                    />
                    <input
                      type="number"
                      placeholder="Do"
                      min="1"
                      value={filters.maxRooms}
                      onChange={(e) => handleFilterChange("maxRooms", e.target.value)}
                      className={`w-full px-3 py-2.5 rounded-lg text-zinc-200 text-sm focus:outline-none font-mono border transition-colors ${
                        filters.maxRooms ? "bg-emerald-500/5 border-emerald-500/40 focus:border-emerald-500/60" : "bg-zinc-900/50 border-zinc-800 focus:border-zinc-700"
                      }`}
                    />
                  </div>
                </div>
                <div>
                  <label className={`block text-[10px] mb-1.5 uppercase tracking-widest font-medium ${filters.condition ? "text-emerald-500/80" : "text-zinc-600"}`}>Stav</label>
                  <select
                    value={filters.condition}
                    onChange={(e) => handleFilterChange("condition", e.target.value)}
                    className={`w-full px-3 py-2.5 rounded-lg text-zinc-200 text-sm focus:outline-none cursor-pointer border transition-colors ${
                      filters.condition ? "bg-emerald-500/5 border-emerald-500/40 focus:border-emerald-500/60" : "bg-zinc-900/50 border-zinc-800 focus:border-zinc-700"
                    }`}
                  >
                    <option value="">Všetky</option>
                    {CONDITIONS.map((cond) => (
                      <option key={cond.value} value={cond.value}>{cond.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={`block text-[10px] mb-1.5 uppercase tracking-widest font-medium ${filters.minYield ? "text-emerald-500/80" : "text-zinc-600"}`}>Min. výnos %</label>
                  <input
                    type="number"
                    placeholder="0"
                    step="0.1"
                    value={filters.minYield}
                    onChange={(e) => handleFilterChange("minYield", e.target.value)}
                    className={`w-full px-3 py-2.5 rounded-lg text-zinc-200 text-sm focus:outline-none font-mono border transition-colors ${
                      filters.minYield ? "bg-emerald-500/5 border-emerald-500/40 focus:border-emerald-500/60" : "bg-zinc-900/50 border-zinc-800 focus:border-zinc-700"
                    }`}
                  />
                </div>
              </div>

              {activeFiltersCount > 0 && (
                <div className="mt-3 flex justify-end">
                  <button
                    onClick={clearFilters}
                    className="flex items-center gap-2 px-3 py-1.5 text-xs text-zinc-500 hover:text-zinc-200 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                    Vymazať filtre
                  </button>
                </div>
              )}
            </div>
          )}
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between px-1">
        <p className="text-zinc-500 text-sm">
          {loading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Načítavam...</span>
            </span>
          ) : (
            <>
              Nájdených <span className="text-zinc-200 font-mono font-medium">{pagination.totalCount.toLocaleString()}</span> nehnuteľností
            </>
          )}
        </p>
      </div>

      {/* Properties */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <div className="w-12 h-12 border-2 border-zinc-800 rounded-full"></div>
              <div className="absolute top-0 left-0 w-12 h-12 border-2 border-emerald-500 rounded-full animate-spin border-t-transparent"></div>
            </div>
            <p className="text-zinc-500 text-sm">Hľadám nehnuteľnosti...</p>
          </div>
        </div>
      ) : properties.length === 0 ? (
        <div className="premium-card p-16 text-center">
          <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-zinc-900 flex items-center justify-center">
            <Building2 className="w-8 h-8 text-zinc-700" />
          </div>
          <h3 className="text-lg font-medium text-zinc-200 mb-2">Žiadne nehnuteľnosti</h3>
          <p className="text-zinc-500 text-sm max-w-md mx-auto">
            Skúste upraviť vyhľadávacie kritériá alebo odstrániť niektoré filtre
          </p>
          {activeFiltersCount > 0 && (
            <button
              onClick={clearFilters}
              className="mt-5 px-5 py-2.5 bg-zinc-800 text-zinc-300 rounded-xl hover:bg-zinc-700 transition-colors text-sm"
            >
              Vymazať filtre
            </button>
          )}
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4">
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
                className="group premium-card-interactive overflow-hidden"
              >
                {/* Photo Section */}
                <div className="relative h-44 bg-zinc-900 overflow-hidden">
                  <PropertyImage
                    url={thumbnailUrl}
                    alt={property.title}
                    fill
                    className="object-cover group-hover:scale-[1.02] transition-transform duration-500"
                    aspectRatio="auto"
                  />
                  
                  {/* Photo Count Badge */}
                  {property.photo_count && property.photo_count > 1 && (
                    <div className="absolute bottom-2 right-2 flex items-center gap-1 px-2 py-1 bg-black/70 backdrop-blur-sm rounded-md text-[10px] text-zinc-300 font-medium">
                      <Camera className="w-3 h-3" />
                      {property.photo_count}
                    </div>
                  )}
                  
                  {/* Subtle Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0f0f0f] via-transparent to-transparent opacity-80" />
                  
                  {/* Top Badges - Redesigned */}
                  {badges.length > 0 && (
                    <div className="absolute top-2.5 left-2.5 z-10 flex flex-wrap gap-1.5">
                      {badges.map((badge, i) => (
                        <span key={i} className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold tracking-wide ${badge.color}`}>
                          {badge.icon}
                          {badge.label}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Save Button - Minimal */}
                  <button
                    onClick={(e) => toggleSave(property.id, e)}
                    disabled={isSaving}
                    className={`absolute top-2.5 right-2.5 z-10 w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                      isSaved
                        ? "bg-emerald-500 text-white"
                        : "bg-black/50 backdrop-blur-sm text-zinc-300 hover:bg-black/70 hover:text-white"
                    }`}
                  >
                    {isSaving ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : isSaved ? (
                      <BookmarkCheck className="w-3.5 h-3.5" />
                    ) : (
                      <Bookmark className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                {/* Card Content */}
                <div className="p-4">
                  {/* Location */}
                  <div className="flex items-center gap-1.5 text-zinc-500 text-xs mb-2">
                    <MapPin className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate">
                      {property.district && property.city 
                        ? `${property.district}, ${getRegionLabel(property.city)}`
                        : property.city 
                          ? getRegionLabel(property.city)
                          : property.district || property.address || "Slovensko"}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="font-medium text-zinc-100 text-sm leading-snug mb-2 line-clamp-2 group-hover:text-emerald-400 transition-colors min-h-[2.5rem]">
                    {property.title}
                  </h3>

                  {/* AI Verdikt - jedna veta */}
                  {property.investmentSummary && (
                    <p className="text-zinc-400 text-xs leading-snug mb-3 line-clamp-2">
                      {property.investmentSummary.length > 100
                        ? `${property.investmentSummary.slice(0, 100)}…`
                        : property.investmentSummary}
                    </p>
                  )}

                  {/* Key Metrics - Minimal Grid */}
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    <div className="bg-zinc-900/50 rounded-lg p-2 text-center">
                      <p className="text-zinc-500 text-[9px] uppercase tracking-wider mb-0.5">Plocha</p>
                      <p className="text-zinc-200 font-mono text-sm font-medium">{property.area_m2}</p>
                    </div>
                    <div className="bg-zinc-900/50 rounded-lg p-2 text-center">
                      <p className="text-zinc-500 text-[9px] uppercase tracking-wider mb-0.5">Izby</p>
                      <p className="text-zinc-200 font-mono text-sm font-medium">{property.rooms || "–"}</p>
                    </div>
                    <div className="bg-zinc-900/50 rounded-lg p-2 text-center">
                      <p className="text-zinc-500 text-[9px] uppercase tracking-wider mb-0.5">€/m²</p>
                      <p className="text-zinc-200 font-mono text-sm font-medium">
                        {(property.price === 0 || property.is_negotiable) ? "–" : property.price_per_m2.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {/* Price Section - Clean */}
                  <div className="flex items-end justify-between pt-3 border-t border-zinc-800/50">
                    <div>
                      <p className="text-xl font-semibold text-zinc-100 font-mono tracking-tight">
                        {(property.price === 0 || property.is_negotiable) ? "Cena dohodou" : `€${property.price.toLocaleString()}`}
                      </p>
                      {/* Price History Mini */}
                      {metrics?.priceStory?.totalChangePercent && metrics.priceStory.totalChangePercent < 0 && (
                        <span className="flex items-center gap-1 text-[10px] text-emerald-400 mt-0.5">
                          <TrendingDown className="w-2.5 h-2.5" />
                          -{Math.abs(metrics.priceStory.totalChangePercent)}% zľava
                        </span>
                      )}
                    </div>

                    {/* Yield Badge - Clean */}
                    {property.investmentMetrics && property.investmentMetrics.gross_yield > 0 && (
                      <div className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-mono font-semibold ${
                        property.investmentMetrics.gross_yield >= 6
                          ? "bg-emerald-500/10 text-emerald-400"
                          : property.investmentMetrics.gross_yield >= 4
                          ? "bg-blue-500/10 text-blue-400"
                          : "bg-zinc-800 text-zinc-400"
                      }`}>
                        <TrendingUp className="w-3 h-3" />
                        {property.investmentMetrics.gross_yield.toFixed(1)}%
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer - Subtle */}
                <div className="px-4 py-2.5 bg-zinc-950/50 border-t border-zinc-800/30 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[10px] text-zinc-600">
                    <Clock className="w-3 h-3" />
                    <span>{property.days_on_market}d na trhu</span>
                  </div>
                  {property.source_url && (
                    <a
                      href={property.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-1 text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Zdroj
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
                className="group relative bg-zinc-900/80 backdrop-blur rounded-xl border border-zinc-800/50 overflow-hidden hover:border-emerald-500/30 transition-all cursor-pointer hover:shadow-lg hover:shadow-emerald-500/5"
              >
                <div className="flex">
                  {/* Thumbnail */}
                  <div className="relative w-40 h-28 flex-shrink-0 bg-zinc-800/50 overflow-hidden">
                    <PropertyImage
                      url={thumbnailUrl}
                      alt={property.title}
                      fill
                      className="object-cover"
                      aspectRatio="auto"
                    />
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
                      {property.investmentSummary && (
                        <p className="text-zinc-400 text-xs mb-1.5 line-clamp-1 max-w-xl">
                          {property.investmentSummary.length > 80
                            ? `${property.investmentSummary.slice(0, 80)}…`
                            : property.investmentSummary}
                        </p>
                      )}
                      <div className="flex items-center gap-4 text-sm text-zinc-400">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" />
                          {property.district && property.city 
                          ? `${property.district}, ${getRegionLabel(property.city)}`
                          : property.city 
                            ? getRegionLabel(property.city)
                            : property.district || "Slovensko"}
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
                      <div className="text-right min-w-[120px]">
                        <p className="text-lg font-semibold text-zinc-100 font-mono">
                          {(property.price === 0 || property.is_negotiable) ? "Cena dohodou" : `€${property.price.toLocaleString()}`}
                        </p>
                        {property.price > 0 && !property.is_negotiable && (
                          <p className="text-xs text-zinc-500 font-mono">
                            €{property.price_per_m2.toLocaleString()}/m²
                          </p>
                        )}
                      </div>

                      {/* Yield */}
                      {property.investmentMetrics && (
                        <div className={`text-center px-3 py-1.5 rounded-lg min-w-[70px] ${
                          property.investmentMetrics.gross_yield >= 6
                            ? "bg-emerald-500/10 text-emerald-400"
                            : "bg-zinc-800/50 text-zinc-500"
                        }`}>
                          <p className="text-base font-semibold font-mono flex items-center justify-center gap-1">
                            <TrendingUp className="w-3.5 h-3.5" />
                            {property.investmentMetrics.gross_yield.toFixed(1)}%
                          </p>
                          <p className="text-[10px] opacity-70">výnos</p>
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
                              : "bg-zinc-800 text-zinc-400 hover:text-emerald-400"
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
                            className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-blue-400 transition-colors"
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

      {/* Pagination - Premium */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-1.5 pt-8">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="flex items-center gap-1.5 px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-300 text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-zinc-800 hover:border-zinc-700 transition-all"
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
                  className={`w-9 h-9 rounded-lg text-sm font-mono font-medium transition-all ${
                    page === pageNum
                      ? "bg-zinc-100 text-zinc-900"
                      : "bg-zinc-900 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
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
            className="flex items-center gap-1.5 px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-300 text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-zinc-800 hover:border-zinc-700 transition-all"
          >
            <span className="hidden sm:inline">Ďalej</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
