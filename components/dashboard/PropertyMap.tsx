"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, CircleMarker } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { 
  Search, 
  Filter, 
  X, 
  Home, 
  Building2, 
  TrendingUp, 
  MapPin,
  ChevronDown,
  Flame,
  ExternalLink,
  Loader2,
  SlidersHorizontal,
  RotateCcw
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

interface MapFilters {
  priceMin: number | null;
  priceMax: number | null;
  areaMin: number | null;
  areaMax: number | null;
  listingType: "ALL" | "PREDAJ" | "PRENAJOM";
  city: string;
  condition: string;
  hotDealsOnly: boolean;
}

// City coordinates for centering
const CITY_COORDS: Record<string, [number, number]> = {
  ALL: [48.7, 19.5], // Center of Slovakia
  BRATISLAVA: [48.1486, 17.1077],
  KOSICE: [48.7164, 21.2611],
  ZILINA: [49.2231, 18.7394],
  PRESOV: [48.9986, 21.2391],
  BANSKA_BYSTRICA: [48.7395, 19.1532],
  TRNAVA: [48.3774, 17.5883],
  TRENCIN: [48.8945, 18.0444],
  NITRA: [48.3069, 18.0864],
};

// Zoom levels
const CITY_ZOOM: Record<string, number> = {
  ALL: 8,
  BRATISLAVA: 12,
  KOSICE: 13,
  ZILINA: 13,
  PRESOV: 13,
  BANSKA_BYSTRICA: 13,
  TRNAVA: 13,
  TRENCIN: 13,
  NITRA: 13,
};

// Map controller component
function MapController({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  
  useEffect(() => {
    map.setView(center, zoom, { animate: true });
  }, [map, center, zoom]);
  
  return null;
}

// Custom marker component
function PropertyMarker({ property, onClick }: { property: Property; onClick: () => void }) {
  const isHotDeal = property.is_distressed;
  const isRent = property.listing_type === "PRENAJOM";
  
  // Color based on type and status
  const getColor = () => {
    if (isHotDeal) return "#ef4444"; // red for hot deals
    if (isRent) return "#8b5cf6"; // purple for rent
    return "#3b82f6"; // blue for sale
  };
  
  if (!property.latitude || !property.longitude) return null;
  
  return (
    <CircleMarker
      center={[property.latitude, property.longitude]}
      radius={isHotDeal ? 10 : 7}
      pathOptions={{
        color: getColor(),
        fillColor: getColor(),
        fillOpacity: 0.7,
        weight: isHotDeal ? 3 : 2,
      }}
      eventHandlers={{
        click: onClick,
      }}
    >
      <Popup className="property-popup">
        <div className="min-w-[250px] p-1">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="font-semibold text-sm text-slate-900 line-clamp-2">
              {property.title}
            </h3>
            {isHotDeal && (
              <span className="flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full whitespace-nowrap">
                <Flame className="w-3 h-3" />
                Hot Deal
              </span>
            )}
          </div>
          
          <div className="space-y-1.5 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              <span>{property.district}, {property.city}</span>
            </div>
            
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <div>
                <div className="text-lg font-bold text-slate-900">
                  {property.price.toLocaleString("sk-SK")} €
                </div>
                <div className="text-slate-500">
                  {property.price_per_m2.toLocaleString("sk-SK")} €/m²
                </div>
              </div>
              <div className="text-right">
                <div className="font-medium text-slate-700">
                  {property.area_m2} m²
                </div>
                {property.rooms && (
                  <div className="text-slate-500">
                    {property.rooms} izby
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex items-center justify-between pt-2">
              <span className={`px-2 py-0.5 rounded text-xs ${
                isRent 
                  ? "bg-purple-100 text-purple-700" 
                  : "bg-blue-100 text-blue-700"
              }`}>
                {isRent ? "Prenájom" : "Predaj"}
              </span>
              
              {property.source_url && (
                <a 
                  href={property.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-blue-600 hover:text-blue-800"
                  onClick={(e) => e.stopPropagation()}
                >
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

// Cluster indicator (simplified - shows count when many properties in area)
function ClusterIndicator({ 
  properties, 
  center 
}: { 
  properties: Property[]; 
  center: [number, number];
}) {
  const count = properties.length;
  const hasHotDeals = properties.some(p => p.is_distressed);
  
  return (
    <CircleMarker
      center={center}
      radius={20 + Math.min(count, 50) / 5}
      pathOptions={{
        color: hasHotDeals ? "#ef4444" : "#3b82f6",
        fillColor: hasHotDeals ? "#ef4444" : "#3b82f6",
        fillOpacity: 0.6,
        weight: 2,
      }}
    >
      <Popup>
        <div className="text-center p-2">
          <div className="text-2xl font-bold text-slate-900">{count}</div>
          <div className="text-sm text-slate-600">nehnuteľností</div>
          {hasHotDeals && (
            <div className="text-xs text-red-600 mt-1">
              vrátane Hot Deals
            </div>
          )}
        </div>
      </Popup>
    </CircleMarker>
  );
}

// Main component
export default function PropertyMap() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  
  const [filters, setFilters] = useState<MapFilters>({
    priceMin: null,
    priceMax: null,
    areaMin: null,
    areaMax: null,
    listingType: "ALL",
    city: "ALL",
    condition: "ALL",
    hotDealsOnly: false,
  });
  
  // Fetch properties
  const fetchProperties = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      params.set("limit", "1000"); // Get more for the map
      params.set("hasCoordinates", "true"); // Only properties with coordinates
      
      if (filters.city !== "ALL") {
        params.set("city", filters.city);
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
      
      if (!response.ok) {
        throw new Error("Nepodarilo sa načítať nehnuteľnosti");
      }
      
      const data = await response.json();
      setProperties(data.properties || []);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : "Neznáma chyba");
    } finally {
      setLoading(false);
    }
  }, [filters]);
  
  useEffect(() => {
    fetchProperties();
  }, [fetchProperties]);
  
  // Filter properties client-side for additional filters
  const filteredProperties = useMemo(() => {
    return properties.filter(p => {
      if (filters.areaMin && p.area_m2 < filters.areaMin) return false;
      if (filters.areaMax && p.area_m2 > filters.areaMax) return false;
      if (filters.condition !== "ALL" && p.condition !== filters.condition) return false;
      return true;
    });
  }, [properties, filters.areaMin, filters.areaMax, filters.condition]);
  
  // Properties with valid coordinates
  const mappableProperties = useMemo(() => {
    return filteredProperties.filter(p => p.latitude && p.longitude);
  }, [filteredProperties]);
  
  // Stats
  const stats = useMemo(() => {
    const total = mappableProperties.length;
    const hotDeals = mappableProperties.filter(p => p.is_distressed).length;
    const avgPrice = total > 0 
      ? Math.round(mappableProperties.reduce((sum, p) => sum + p.price_per_m2, 0) / total)
      : 0;
    const forSale = mappableProperties.filter(p => p.listing_type === "PREDAJ").length;
    const forRent = mappableProperties.filter(p => p.listing_type === "PRENAJOM").length;
    
    return { total, hotDeals, avgPrice, forSale, forRent };
  }, [mappableProperties]);
  
  // Map center and zoom based on city filter
  const mapCenter = CITY_COORDS[filters.city] || CITY_COORDS.ALL;
  const mapZoom = CITY_ZOOM[filters.city] || CITY_ZOOM.ALL;
  
  // Reset filters
  const resetFilters = () => {
    setFilters({
      priceMin: null,
      priceMax: null,
      areaMin: null,
      areaMax: null,
      listingType: "ALL",
      city: "ALL",
      condition: "ALL",
      hotDealsOnly: false,
    });
  };
  
  return (
    <div className="relative h-full w-full flex flex-col">
      {/* Header with stats */}
      <div className="flex-none bg-slate-900/95 backdrop-blur-xl border-b border-slate-800 p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Title and stats */}
          <div className="flex items-center gap-6">
            <h1 className="text-lg font-semibold text-white flex items-center gap-2">
              <MapPin className="w-5 h-5 text-blue-400" />
              Mapa nehnuteľností
            </h1>
            
            <div className="hidden md:flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2 text-slate-400">
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
              
              <div className="flex items-center gap-2 text-slate-400">
                <TrendingUp className="w-4 h-4" />
                <span className="text-white font-medium">{stats.avgPrice.toLocaleString("sk-SK")}</span>
                <span>€/m² priemer</span>
              </div>
            </div>
          </div>
          
          {/* Filter toggles */}
          <div className="flex items-center gap-2">
            {/* Quick city select */}
            <select
              value={filters.city}
              onChange={(e) => setFilters(f => ({ ...f, city: e.target.value }))}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">Celé Slovensko</option>
              <option value="BRATISLAVA">Bratislava</option>
              <option value="KOSICE">Košice</option>
              <option value="ZILINA">Žilina</option>
              <option value="PRESOV">Prešov</option>
              <option value="BANSKA_BYSTRICA">Banská Bystrica</option>
              <option value="TRNAVA">Trnava</option>
              <option value="TRENCIN">Trenčín</option>
              <option value="NITRA">Nitra</option>
            </select>
            
            {/* Listing type */}
            <select
              value={filters.listingType}
              onChange={(e) => setFilters(f => ({ ...f, listingType: e.target.value as MapFilters["listingType"] }))}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">Všetky typy</option>
              <option value="PREDAJ">Predaj</option>
              <option value="PRENAJOM">Prenájom</option>
            </select>
            
            {/* Hot deals toggle */}
            <button
              onClick={() => setFilters(f => ({ ...f, hotDealsOnly: !f.hotDealsOnly }))}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                filters.hotDealsOnly 
                  ? "bg-red-500/20 text-red-400 border border-red-500/50" 
                  : "bg-slate-800 text-slate-400 border border-slate-700 hover:text-white"
              }`}
            >
              <Flame className="w-4 h-4" />
              <span className="hidden sm:inline">Hot Deals</span>
            </button>
            
            {/* More filters */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                showFilters 
                  ? "bg-blue-500/20 text-blue-400 border border-blue-500/50" 
                  : "bg-slate-800 text-slate-400 border border-slate-700 hover:text-white"
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span className="hidden sm:inline">Filtre</span>
            </button>
            
            {/* Reset */}
            <button
              onClick={resetFilters}
              className="p-2 rounded-lg bg-slate-800 text-slate-400 border border-slate-700 hover:text-white transition-colors"
              title="Reset filtrov"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        {/* Extended filters panel */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-slate-800 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Cena od (€)</label>
              <input
                type="number"
                value={filters.priceMin || ""}
                onChange={(e) => setFilters(f => ({ ...f, priceMin: e.target.value ? Number(e.target.value) : null }))}
                placeholder="0"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-xs text-slate-500 mb-1">Cena do (€)</label>
              <input
                type="number"
                value={filters.priceMax || ""}
                onChange={(e) => setFilters(f => ({ ...f, priceMax: e.target.value ? Number(e.target.value) : null }))}
                placeholder="∞"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-xs text-slate-500 mb-1">Plocha od (m²)</label>
              <input
                type="number"
                value={filters.areaMin || ""}
                onChange={(e) => setFilters(f => ({ ...f, areaMin: e.target.value ? Number(e.target.value) : null }))}
                placeholder="0"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-xs text-slate-500 mb-1">Plocha do (m²)</label>
              <input
                type="number"
                value={filters.areaMax || ""}
                onChange={(e) => setFilters(f => ({ ...f, areaMax: e.target.value ? Number(e.target.value) : null }))}
                placeholder="∞"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        )}
      </div>
      
      {/* Map container */}
      <div className="flex-1 relative">
        {loading && (
          <div className="absolute inset-0 z-[1000] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
              <span className="text-slate-400">Načítavam mapu...</span>
            </div>
          </div>
        )}
        
        {error && (
          <div className="absolute inset-0 z-[1000] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center">
            <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-6 max-w-md text-center">
              <div className="text-red-400 mb-2">Chyba pri načítaní</div>
              <div className="text-white">{error}</div>
              <button 
                onClick={fetchProperties}
                className="mt-4 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                Skúsiť znova
              </button>
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
          
          {/* Render property markers */}
          {mappableProperties.map((property) => (
            <PropertyMarker 
              key={property.id} 
              property={property}
              onClick={() => setSelectedProperty(property)}
            />
          ))}
        </MapContainer>
        
        {/* Legend */}
        <div className="absolute bottom-4 left-4 z-[1000] bg-slate-900/90 backdrop-blur-xl rounded-xl p-3 border border-slate-800">
          <div className="text-xs text-slate-400 mb-2">Legenda</div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <span className="text-slate-300">Predaj ({stats.forSale})</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <div className="w-3 h-3 rounded-full bg-purple-500" />
              <span className="text-slate-300">Prenájom ({stats.forRent})</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <div className="w-4 h-4 rounded-full bg-red-500 border-2 border-red-300" />
              <span className="text-slate-300">Hot Deal ({stats.hotDeals})</span>
            </div>
          </div>
        </div>
        
        {/* Property count indicator */}
        <div className="absolute top-4 right-4 z-[1000] bg-slate-900/90 backdrop-blur-xl rounded-xl px-4 py-2 border border-slate-800">
          <div className="text-white font-medium">
            {mappableProperties.length} 
            <span className="text-slate-400 ml-1 font-normal">na mape</span>
          </div>
        </div>
      </div>
    </div>
  );
}
