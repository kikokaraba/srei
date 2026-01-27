"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  TrendingUp,
  Home,
  MapPin,
  Euro,
  BarChart3,
  Loader2,
  Info,
  Layers,
  Filter,
  Flame,
  ExternalLink,
  Building2,
  SlidersHorizontal,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Eye,
} from "lucide-react";

// Fix Leaflet default icon issue
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: () => string })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

// Types
interface Property {
  id: string;
  title: string;
  price: number;
  price_per_m2: number;
  area_m2: number;
  city: string;
  district: string;
  latitude: number | null;
  longitude: number | null;
  condition: string;
  listing_type: string;
  is_distressed: boolean;
  source_url: string | null;
  rooms: number | null;
  source: string;
}

interface CityData {
  name: string;
  slug: string;
  lat: number;
  lng: number;
  avgPrice: number;
  avgYield: number;
  properties: number;
  hotDeals: number;
  trend: number;
}

type ViewMode = "heatmap" | "properties" | "auto";
type HeatmapMetric = "price" | "yield" | "properties";

interface MapFilters {
  listingType: "ALL" | "PREDAJ" | "PRENAJOM";
  priceMin: number | null;
  priceMax: number | null;
  hotDealsOnly: boolean;
}

// Slovak cities data - initial values, will be updated from API
const CITIES_DATA: CityData[] = [
  { name: "Bratislava", slug: "BRATISLAVA", lat: 48.1486, lng: 17.1077, avgPrice: 0, avgYield: 0, properties: 0, hotDeals: 0, trend: 0 },
  { name: "Košice", slug: "KOSICE", lat: 48.7164, lng: 21.2611, avgPrice: 0, avgYield: 0, properties: 0, hotDeals: 0, trend: 0 },
  { name: "Prešov", slug: "PRESOV", lat: 48.9986, lng: 21.2391, avgPrice: 0, avgYield: 0, properties: 0, hotDeals: 0, trend: 0 },
  { name: "Žilina", slug: "ZILINA", lat: 49.2231, lng: 18.7394, avgPrice: 0, avgYield: 0, properties: 0, hotDeals: 0, trend: 0 },
  { name: "Banská Bystrica", slug: "BANSKA_BYSTRICA", lat: 48.7364, lng: 19.1458, avgPrice: 0, avgYield: 0, properties: 0, hotDeals: 0, trend: 0 },
  { name: "Trnava", slug: "TRNAVA", lat: 48.3774, lng: 17.5883, avgPrice: 0, avgYield: 0, properties: 0, hotDeals: 0, trend: 0 },
  { name: "Trenčín", slug: "TRENCIN", lat: 48.8945, lng: 18.0444, avgPrice: 0, avgYield: 0, properties: 0, hotDeals: 0, trend: 0 },
  { name: "Nitra", slug: "NITRA", lat: 48.3061, lng: 18.0833, avgPrice: 0, avgYield: 0, properties: 0, hotDeals: 0, trend: 0 },
];

// Auto-switch zoom threshold
const ZOOM_THRESHOLD = 11;

// Map controller for programmatic navigation
function MapController({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom, { animate: true });
  }, [map, center, zoom]);
  return null;
}

// Zoom watcher for auto mode
function ZoomWatcher({ onZoomChange }: { onZoomChange: (zoom: number) => void }) {
  useMapEvents({
    zoomend: (e) => {
      onZoomChange(e.target.getZoom());
    },
  });
  return null;
}

// Property marker
function PropertyMarker({ property }: { property: Property }) {
  if (!property.latitude || !property.longitude) return null;
  
  const isHotDeal = property.is_distressed;
  const isRent = property.listing_type === "PRENAJOM";
  
  const getColor = () => {
    if (isHotDeal) return "#ef4444";
    if (isRent) return "#8b5cf6";
    return "#3b82f6";
  };
  
  return (
    <CircleMarker
      center={[property.latitude, property.longitude]}
      radius={isHotDeal ? 8 : 6}
      pathOptions={{
        color: getColor(),
        fillColor: getColor(),
        fillOpacity: 0.8,
        weight: isHotDeal ? 2 : 1,
      }}
    >
      <Popup>
        <div className="min-w-[220px] p-1">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="font-semibold text-sm text-zinc-900 line-clamp-2">
              {property.title}
            </h3>
            {isHotDeal && (
              <span className="flex items-center gap-1 px-1.5 py-0.5 bg-red-100 text-red-700 text-xs rounded-full whitespace-nowrap">
                <Flame className="w-3 h-3" />
              </span>
            )}
          </div>
          
          <div className="space-y-1.5 text-xs text-zinc-600">
            <div className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-zinc-400" />
              <span>{property.district}</span>
            </div>
            
            <div className="flex items-center justify-between pt-2 border-t border-zinc-100">
              <div>
                <div className="text-base font-bold text-zinc-900">
                  {property.price.toLocaleString("sk-SK")} €
                </div>
                <div className="text-zinc-500">
                  {property.price_per_m2.toLocaleString("sk-SK")} €/m²
                </div>
              </div>
              <div className="text-right">
                <div className="font-medium text-zinc-700">{property.area_m2} m²</div>
                {property.rooms && <div className="text-zinc-500">{property.rooms} izby</div>}
              </div>
            </div>
            
            <div className="flex items-center justify-between pt-2">
              <span className={`px-2 py-0.5 rounded text-xs ${isRent ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}`}>
                {isRent ? "Prenájom" : "Predaj"}
              </span>
              {property.source_url && (
                <a href={property.source_url} target="_blank" rel="noopener noreferrer"
                   className="flex items-center gap-1 text-blue-600 hover:text-blue-800">
                  <span>Detail</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>
        </div>
      </Popup>
    </CircleMarker>
  );
}

// City heatmap marker
function CityMarker({ 
  city, 
  metric, 
  onClick,
  isSelected 
}: { 
  city: CityData; 
  metric: HeatmapMetric;
  onClick: () => void;
  isSelected: boolean;
}) {
  const getColor = () => {
    if (metric === "price") {
      const normalized = (city.avgPrice - 1500) / (3500 - 1500);
      const hue = (1 - Math.min(1, Math.max(0, normalized))) * 120;
      return `hsl(${hue}, 70%, 50%)`;
    } else if (metric === "yield") {
      const normalized = (city.avgYield - 4) / (6 - 4);
      const hue = Math.min(1, Math.max(0, normalized)) * 120;
      return `hsl(${hue}, 70%, 50%)`;
    } else {
      return city.hotDeals > 0 ? "#ef4444" : "#3b82f6";
    }
  };
  
  const getRadius = () => {
    const base = 20;
    if (metric === "price") return base + (city.avgPrice / 400);
    if (metric === "yield") return base + city.avgYield * 4;
    return base + Math.min(city.properties, 50) / 2;
  };
  
  return (
    <CircleMarker
      center={[city.lat, city.lng]}
      radius={getRadius()}
      pathOptions={{
        fillColor: getColor(),
        fillOpacity: isSelected ? 0.9 : 0.7,
        color: isSelected ? "#fff" : getColor(),
        weight: isSelected ? 3 : 2,
      }}
      eventHandlers={{ click: onClick }}
    >
      <Tooltip direction="top" offset={[0, -10]} permanent={isSelected}>
        <div className="text-center font-medium">
          <div>{city.name}</div>
          <div className="text-xs opacity-80">
            {metric === "price" && `€${city.avgPrice.toLocaleString()}/m²`}
            {metric === "yield" && `${city.avgYield.toFixed(1)}% výnos`}
            {metric === "properties" && `${city.properties} nehnuteľností`}
          </div>
        </div>
      </Tooltip>
    </CircleMarker>
  );
}

export default function UnifiedMap() {
  // State
  const [cities, setCities] = useState<CityData[]>(CITIES_DATA);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("auto");
  const [currentZoom, setCurrentZoom] = useState(8);
  const [metric, setMetric] = useState<HeatmapMetric>("price");
  const [selectedCity, setSelectedCity] = useState<CityData | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<MapFilters>({
    listingType: "ALL",
    priceMin: null,
    priceMax: null,
    hotDealsOnly: false,
  });
  
  // Map position
  const [mapCenter, setMapCenter] = useState<[number, number]>([48.7, 19.5]);
  const [mapZoom, setMapZoom] = useState(8);
  
  // Determine effective view mode
  const effectiveViewMode = useMemo(() => {
    if (viewMode === "auto") {
      return currentZoom >= ZOOM_THRESHOLD ? "properties" : "heatmap";
    }
    return viewMode;
  }, [viewMode, currentZoom]);
  
  // Fetch city statistics
  const fetchCityStats = useCallback(async () => {
    try {
      const response = await fetch("/api/v1/properties/map?limit=2000");
      if (!response.ok) return;
      
      const data = await response.json();
      const allProperties = data.properties || [];
      
      // Calculate stats per city
      const cityStats: Record<string, { count: number; totalPrice: number; hotDeals: number }> = {};
      
      for (const property of allProperties) {
        if (!cityStats[property.city]) {
          cityStats[property.city] = { count: 0, totalPrice: 0, hotDeals: 0 };
        }
        cityStats[property.city].count++;
        cityStats[property.city].totalPrice += property.price_per_m2;
        if (property.is_distressed) cityStats[property.city].hotDeals++;
      }
      
      setCities(prev => prev.map(city => {
        const stats = cityStats[city.slug];
        if (stats) {
          return {
            ...city,
            properties: stats.count,
            hotDeals: stats.hotDeals,
            avgPrice: Math.round(stats.totalPrice / stats.count),
          };
        }
        return city;
      }));
    } catch (error) {
      console.error("Error fetching city stats:", error);
    }
  }, []);
  
  // Fetch properties for detailed view
  const fetchProperties = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      params.set("limit", "1000");
      params.set("hasCoordinates", "true");
      
      if (selectedCity) {
        params.set("city", selectedCity.slug);
      }
      if (filters.listingType !== "ALL") {
        params.set("listingType", filters.listingType);
      }
      if (filters.priceMin) {
        params.set("priceMin", filters.priceMin.toString());
      }
      if (filters.priceMax) {
        params.set("priceMax", filters.priceMax.toString());
      }
      if (filters.hotDealsOnly) {
        params.set("hotDealsOnly", "true");
      }
      
      const response = await fetch(`/api/v1/properties/map?${params.toString()}`);
      if (!response.ok) return;
      
      const data = await response.json();
      setProperties(data.properties || []);
    } catch (error) {
      console.error("Error fetching properties:", error);
    }
  }, [selectedCity, filters]);
  
  // Initial load
  useEffect(() => {
    setLoading(true);
    Promise.all([fetchCityStats(), fetchProperties()]).finally(() => setLoading(false));
  }, [fetchCityStats, fetchProperties]);
  
  // Refetch when filters change
  useEffect(() => {
    if (effectiveViewMode === "properties") {
      fetchProperties();
    }
  }, [effectiveViewMode, fetchProperties]);
  
  // Handle city click
  const handleCityClick = (city: CityData) => {
    setSelectedCity(city);
    setMapCenter([city.lat, city.lng]);
    setMapZoom(13);
  };
  
  // Reset to overview
  const resetToOverview = () => {
    setSelectedCity(null);
    setMapCenter([48.7, 19.5]);
    setMapZoom(8);
  };
  
  // Filter properties
  const filteredProperties = useMemo(() => {
    return properties.filter(p => p.latitude && p.longitude);
  }, [properties]);
  
  // Stats
  const stats = useMemo(() => {
    const total = cities.reduce((sum, c) => sum + c.properties, 0);
    const hotDeals = cities.reduce((sum, c) => sum + c.hotDeals, 0);
    const avgPrice = cities.length > 0 
      ? Math.round(cities.reduce((sum, c) => sum + c.avgPrice, 0) / cities.length)
      : 0;
    return { total, hotDeals, avgPrice };
  }, [cities]);
  
  return (
    <div className="h-full w-full flex flex-col bg-zinc-950">
      {/* Header */}
      <div className="flex-none bg-zinc-900/95 backdrop-blur-xl border-b border-zinc-800 p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Title and stats */}
          <div className="flex items-center gap-6">
            <h1 className="text-lg font-semibold text-white flex items-center gap-2">
              <MapPin className="w-5 h-5 text-blue-400" />
              Mapa nehnuteľností
            </h1>
            
            <div className="hidden md:flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2 text-zinc-400">
                <Building2 className="w-4 h-4" />
                <span className="text-white font-medium">{stats.total}</span>
                <span>nehnuteľností</span>
              </div>
              {stats.hotDeals > 0 && (
                <div className="flex items-center gap-2 text-red-400">
                  <Flame className="w-4 h-4" />
                  <span className="text-white font-medium">{stats.hotDeals}</span>
                  <span>hot deals</span>
                </div>
              )}
            </div>
          </div>
          
          {/* View mode toggle */}
          <div className="flex items-center gap-2">
            <div className="flex bg-zinc-800 rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode("auto")}
                className={`px-3 py-2 text-sm flex items-center gap-2 transition-colors ${
                  viewMode === "auto" ? "bg-blue-500/20 text-blue-400" : "text-zinc-400 hover:text-white"
                }`}
              >
                <Eye className="w-4 h-4" />
                Auto
              </button>
              <button
                onClick={() => setViewMode("heatmap")}
                className={`px-3 py-2 text-sm flex items-center gap-2 transition-colors ${
                  viewMode === "heatmap" ? "bg-blue-500/20 text-blue-400" : "text-zinc-400 hover:text-white"
                }`}
              >
                <Layers className="w-4 h-4" />
                Heatmapa
              </button>
              <button
                onClick={() => setViewMode("properties")}
                className={`px-3 py-2 text-sm flex items-center gap-2 transition-colors ${
                  viewMode === "properties" ? "bg-blue-500/20 text-blue-400" : "text-zinc-400 hover:text-white"
                }`}
              >
                <Home className="w-4 h-4" />
                Nehnuteľnosti
              </button>
            </div>
            
            {/* Heatmap metric selector (only in heatmap mode) */}
            {effectiveViewMode === "heatmap" && (
              <div className="flex bg-zinc-800 rounded-lg overflow-hidden">
                <button
                  onClick={() => setMetric("price")}
                  className={`px-3 py-2 text-sm flex items-center gap-1 transition-colors ${
                    metric === "price" ? "bg-emerald-500/20 text-emerald-400" : "text-zinc-400 hover:text-white"
                  }`}
                >
                  <Euro className="w-4 h-4" />
                  <span className="hidden sm:inline">Ceny</span>
                </button>
                <button
                  onClick={() => setMetric("yield")}
                  className={`px-3 py-2 text-sm flex items-center gap-1 transition-colors ${
                    metric === "yield" ? "bg-emerald-500/20 text-emerald-400" : "text-zinc-400 hover:text-white"
                  }`}
                >
                  <TrendingUp className="w-4 h-4" />
                  <span className="hidden sm:inline">Výnosy</span>
                </button>
                <button
                  onClick={() => setMetric("properties")}
                  className={`px-3 py-2 text-sm flex items-center gap-1 transition-colors ${
                    metric === "properties" ? "bg-emerald-500/20 text-emerald-400" : "text-zinc-400 hover:text-white"
                  }`}
                >
                  <Home className="w-4 h-4" />
                  <span className="hidden sm:inline">Ponuky</span>
                </button>
              </div>
            )}
            
            {/* Property filters (only in properties mode) */}
            {effectiveViewMode === "properties" && (
              <>
                <select
                  value={filters.listingType}
                  onChange={(e) => setFilters(f => ({ ...f, listingType: e.target.value as MapFilters["listingType"] }))}
                  className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white"
                >
                  <option value="ALL">Všetky typy</option>
                  <option value="PREDAJ">Predaj</option>
                  <option value="PRENAJOM">Prenájom</option>
                </select>
                
                <button
                  onClick={() => setFilters(f => ({ ...f, hotDealsOnly: !f.hotDealsOnly }))}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                    filters.hotDealsOnly 
                      ? "bg-red-500/20 text-red-400 border border-red-500/50" 
                      : "bg-zinc-800 text-zinc-400 border border-zinc-700 hover:text-white"
                  }`}
                >
                  <Flame className="w-4 h-4" />
                </button>
                
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                    showFilters ? "bg-blue-500/20 text-blue-400" : "bg-zinc-800 text-zinc-400 hover:text-white"
                  } border border-zinc-700`}
                >
                  <SlidersHorizontal className="w-4 h-4" />
                </button>
              </>
            )}
            
            {/* Reset */}
            {selectedCity && (
              <button
                onClick={resetToOverview}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm bg-zinc-800 text-zinc-400 border border-zinc-700 hover:text-white"
              >
                <RotateCcw className="w-4 h-4" />
                <span className="hidden sm:inline">Reset</span>
              </button>
            )}
          </div>
        </div>
        
        {/* Extended filters */}
        {showFilters && effectiveViewMode === "properties" && (
          <div className="mt-4 pt-4 border-t border-zinc-800 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Cena od (€)</label>
              <input
                type="number"
                value={filters.priceMin || ""}
                onChange={(e) => setFilters(f => ({ ...f, priceMin: e.target.value ? Number(e.target.value) : null }))}
                placeholder="0"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Cena do (€)</label>
              <input
                type="number"
                value={filters.priceMax || ""}
                onChange={(e) => setFilters(f => ({ ...f, priceMax: e.target.value ? Number(e.target.value) : null }))}
                placeholder="∞"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500"
              />
            </div>
          </div>
        )}
      </div>
      
      {/* Map + Sidebar */}
      <div className="flex-1 flex">
        {/* Map */}
        <div className="flex-1 relative">
          {loading && (
            <div className="absolute inset-0 z-[1000] bg-zinc-900/80 backdrop-blur-sm flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                <span className="text-zinc-400">Načítavam mapu...</span>
              </div>
            </div>
          )}
          
          <MapContainer
            center={mapCenter}
            zoom={mapZoom}
            style={{ height: "100%", width: "100%" }}
            className="z-0"
          >
            <TileLayer
              attribution='&copy; <a href="https://carto.com/">CARTO</a>'
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            />
            
            <MapController center={mapCenter} zoom={mapZoom} />
            <ZoomWatcher onZoomChange={setCurrentZoom} />
            
            {/* Heatmap mode - show city circles */}
            {effectiveViewMode === "heatmap" && cities.map((city) => (
              <CityMarker
                key={city.slug}
                city={city}
                metric={metric}
                onClick={() => handleCityClick(city)}
                isSelected={selectedCity?.slug === city.slug}
              />
            ))}
            
            {/* Properties mode - show individual properties */}
            {effectiveViewMode === "properties" && filteredProperties.map((property) => (
              <PropertyMarker key={property.id} property={property} />
            ))}
          </MapContainer>
          
          {/* Legend */}
          <div className="absolute bottom-4 left-4 z-[1000] bg-zinc-900/90 backdrop-blur-xl rounded-xl p-3 border border-zinc-800">
            <div className="text-xs text-zinc-400 mb-2">
              {effectiveViewMode === "heatmap" ? "Mestá" : "Nehnuteľnosti"}
            </div>
            {effectiveViewMode === "heatmap" ? (
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-16 h-2 rounded-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500" />
                </div>
                <div className="flex justify-between text-xs text-zinc-500">
                  <span>{metric === "yield" ? "Nízky" : "Lacné"}</span>
                  <span>{metric === "yield" ? "Vysoký" : "Drahé"}</span>
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  <span className="text-zinc-300">Predaj</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-3 h-3 rounded-full bg-purple-500" />
                  <span className="text-zinc-300">Prenájom</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-4 h-4 rounded-full bg-red-500 border-2 border-red-300" />
                  <span className="text-zinc-300">Hot Deal</span>
                </div>
              </div>
            )}
          </div>
          
          {/* Zoom indicator */}
          <div className="absolute top-4 left-4 z-[1000] bg-zinc-900/90 backdrop-blur-xl rounded-lg px-3 py-2 border border-zinc-800 text-xs text-zinc-400">
            Zoom: {currentZoom} | Režim: {effectiveViewMode === "heatmap" ? "Heatmapa" : "Detail"}
          </div>
          
          {/* Property count */}
          {effectiveViewMode === "properties" && (
            <div className="absolute top-4 right-4 z-[1000] bg-zinc-900/90 backdrop-blur-xl rounded-xl px-4 py-2 border border-zinc-800">
              <div className="text-white font-medium">
                {filteredProperties.length}
                <span className="text-zinc-400 ml-1 font-normal">na mape</span>
              </div>
            </div>
          )}
        </div>
        
        {/* Sidebar - City Details */}
        {selectedCity && (
          <div className="w-80 flex-none bg-zinc-900 border-l border-zinc-800 p-4 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-white">{selectedCity.name}</h3>
              <button onClick={() => setSelectedCity(null)} className="text-zinc-400 hover:text-white text-xl">×</button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-zinc-800/50 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-zinc-400 mb-1">
                    <Euro className="w-4 h-4" />
                    <span className="text-xs">Priem. cena</span>
                  </div>
                  <div className="text-base font-semibold text-white">€{selectedCity.avgPrice.toLocaleString()}</div>
                  <div className="text-xs text-zinc-500">za m²</div>
                </div>
                
                <div className="bg-zinc-800/50 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-zinc-400 mb-1">
                    <TrendingUp className="w-4 h-4" />
                    <span className="text-xs">Výnos</span>
                  </div>
                  <div className="text-base font-semibold text-emerald-400">{selectedCity.avgYield.toFixed(1)}%</div>
                  <div className="text-xs text-zinc-500">hrubý ročný</div>
                </div>
              </div>
              
              <div className="bg-zinc-800/50 rounded-lg p-3">
                <div className="flex items-center gap-2 text-zinc-400 mb-1">
                  <Home className="w-4 h-4" />
                  <span className="text-xs">Nehnuteľností</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-base font-semibold text-white">{selectedCity.properties}</div>
                  {selectedCity.hotDeals > 0 && (
                    <div className="flex items-center gap-1 text-red-400 text-sm">
                      <Flame className="w-4 h-4" />
                      {selectedCity.hotDeals} hot deals
                    </div>
                  )}
                </div>
              </div>
              
              <div className="bg-zinc-800/50 rounded-lg p-3">
                <div className="flex items-center gap-2 text-zinc-400 mb-1">
                  <BarChart3 className="w-4 h-4" />
                  <span className="text-xs">Cenový trend (12 mes.)</span>
                </div>
                <div className={`text-base font-semibold ${selectedCity.trend > 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {selectedCity.trend > 0 ? "+" : ""}{selectedCity.trend.toFixed(1)}%
                </div>
              </div>
              
              <a
                href={`/dashboard/properties?city=${selectedCity.slug}`}
                className="block w-full py-3 px-4 bg-blue-500 hover:bg-blue-600 text-white text-center rounded-lg font-medium transition-colors"
              >
                Zobraziť všetky nehnuteľnosti
              </a>
            </div>
            
            {/* City Rankings */}
            <div className="mt-6 pt-6 border-t border-zinc-800">
              <h4 className="font-medium text-white mb-3">Porovnanie miest</h4>
              <div className="space-y-2">
                {[...cities]
                  .sort((a, b) => metric === "yield" ? b.avgYield - a.avgYield : b.avgPrice - a.avgPrice)
                  .map((city, idx) => (
                    <div
                      key={city.slug}
                      className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                        city.slug === selectedCity.slug ? "bg-blue-500/20" : "hover:bg-zinc-800/50"
                      }`}
                      onClick={() => handleCityClick(city)}
                    >
                      <div className="w-5 h-5 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-400">
                        {idx + 1}
                      </div>
                      <div className="flex-1 text-sm text-white">{city.name}</div>
                      <div className="text-sm font-medium">
                        {metric === "yield" ? (
                          <span className="text-emerald-400">{city.avgYield.toFixed(1)}%</span>
                        ) : (
                          <span className="text-white">€{city.avgPrice.toLocaleString()}</span>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
