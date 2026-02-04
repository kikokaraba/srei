"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.heat";
import {
  TrendingUp,
  TrendingDown,
  MapPin,
  Flame,
  ExternalLink,
  Loader2,
  ChevronRight,
  BarChart3,
  Layers,
  ThermometerSun,
  Building,
} from "lucide-react";

// Heatmap Layer Component
function HeatmapLayer({ points }: { points: [number, number, number][] }) {
  const map = useMap();
  
  useEffect(() => {
    if (!points || points.length === 0) return;
    
    const heat = L.heatLayer(points, {
      radius: 25,
      blur: 15,
      maxZoom: 17,
      max: 1.0,
      gradient: {
        0.0: '#22c55e',  // green - cheap
        0.3: '#84cc16',  // lime
        0.5: '#eab308',  // yellow
        0.7: '#f97316',  // orange
        1.0: '#ef4444'   // red - expensive
      }
    });
    
    heat.addTo(map);
    
    return () => {
      map.removeLayer(heat);
    };
  }, [map, points]);
  
  return null;
}
// Fix Leaflet icons
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: () => string })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

// City data from API or for map display
interface CityMapData {
  name: string;
  lat: number;
  lng: number;
  properties: number;
  avgPrice: number;
  hotDeals: number;
  priceChange?: number;
  region?: string;
  population?: number;
}

// Calculate bubble size based on property count
const getBubbleRadius = (properties: number, maxProps: number) => {
  const min = 15;
  const max = 45;
  if (maxProps === 0) return min;
  return min + (properties / maxProps) * (max - min);
};

// Get color based on price per m2
const getPriceColor = (price: number) => {
  if (price >= 3000) return "#ef4444"; // red - expensive
  if (price >= 2200) return "#f97316"; // orange
  if (price >= 1800) return "#eab308"; // yellow
  return "#22c55e"; // green - affordable
};

// Map controller
function MapController({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, zoom, { duration: 1 });
  }, [map, center, zoom]);
  return null;
}

interface Property {
  id: string;
  title: string;
  price: number;
  area_m2: number;
  city: string;
  latitude: number;
  longitude: number;
  rooms: number | null;
  price_per_m2?: number;
  listing_type?: string;
  is_distressed?: boolean;
  source_url?: string | null;
  approximate?: boolean;
}

type ViewMode = "bubbles" | "heatmap" | "markers";

const MAP_LIMIT = 5000;

export default function InteractiveMap() {
  const [selectedCity, setSelectedCity] = useState<CityMapData | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([48.7, 19.5]);
  const [mapZoom, setMapZoom] = useState(7);
  const [hoveredCity, setHoveredCity] = useState<string | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [cityStats, setCityStats] = useState<CityMapData[]>([]);
  const [loading, setLoading] = useState(true);
  const [dbConnected, setDbConnected] = useState<boolean | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("bubbles");

  const [filterCity, setFilterCity] = useState("");
  const [filterMinPrice, setFilterMinPrice] = useState<string>("");
  const [filterMaxPrice, setFilterMaxPrice] = useState<string>("");
  const [includeWithoutCoords, setIncludeWithoutCoords] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const dbRes = await fetch("/api/db-test", { signal: AbortSignal.timeout(5000) });
      const dbData = await dbRes.json();
      setDbConnected(dbData.ok);

      if (!dbData.ok) {
        setLoading(false);
        return;
      }

      const params = new URLSearchParams();
      params.set("limit", String(MAP_LIMIT));
      if (includeWithoutCoords) params.set("includeWithoutCoords", "true");
      if (filterCity.trim()) params.set("city", filterCity.trim());
      const minP = filterMinPrice.trim() ? parseFloat(filterMinPrice) : NaN;
      const maxP = filterMaxPrice.trim() ? parseFloat(filterMaxPrice) : NaN;
      if (!Number.isNaN(minP)) params.set("minPrice", String(minP));
      if (!Number.isNaN(maxP)) params.set("maxPrice", String(maxP));

      const propsRes = await fetch(`/api/v1/properties/map?${params.toString()}`, {
        signal: AbortSignal.timeout(20000),
      });
      const propsData = await propsRes.json();

      if (propsData.data && Array.isArray(propsData.data)) {
        const validProps = propsData.data.filter(
          (p: Property) => p.latitude && p.longitude && p.price > 0
        ) as Property[];
        setProperties(validProps);
      } else {
        setProperties([]);
      }

      if (propsData.citySummary && Array.isArray(propsData.citySummary)) {
        setCityStats(
          propsData.citySummary.map((c: { name: string; lat: number; lng: number; properties: number; avgPrice: number; hotDeals: number }) => ({
            name: c.name,
            lat: c.lat,
            lng: c.lng,
            properties: c.properties,
            avgPrice: c.avgPrice ?? 0,
            hotDeals: c.hotDeals ?? 0,
          }))
        );
      } else {
        setCityStats([]);
      }
    } catch (error) {
      console.error("Failed to load map data:", error);
      setDbConnected(false);
      setProperties([]);
      setCityStats([]);
    } finally {
      setLoading(false);
    }
  }, [filterCity, filterMinPrice, filterMaxPrice, includeWithoutCoords]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle city click
  const handleCityClick = (city: CityMapData) => {
    setSelectedCity(city);
    setMapCenter([city.lat, city.lng]);
    setMapZoom(12);
  };

  // Reset view
  const handleReset = () => {
    setSelectedCity(null);
    setMapCenter([48.7, 19.5]);
    setMapZoom(7);
  };

  // Calculate totals from real data
  const totals = useMemo(() => {
    const citiesWithData = cityStats.filter(c => c.properties > 0);
    return {
      properties: cityStats.reduce((sum, c) => sum + c.properties, 0),
      hotDeals: cityStats.reduce((sum, c) => sum + c.hotDeals, 0),
      avgPrice: citiesWithData.length > 0 
        ? Math.round(citiesWithData.reduce((sum, c) => sum + c.avgPrice, 0) / citiesWithData.length)
        : 0,
    };
  }, [cityStats]);
  
  // Max properties for bubble sizing
  const maxProps = useMemo(() => {
    const counts = cityStats.map(c => c.properties);
    return counts.length > 0 ? Math.max(...counts, 1) : 1;
  }, [cityStats]);

  // Cities with properties for display
  const citiesWithProperties = useMemo(
    () => cityStats.filter(c => c.properties > 0).sort((a, b) => b.properties - a.properties),
    [cityStats]
  );

  // Properties in selected city area
  const cityProperties = useMemo(() => {
    if (!selectedCity) return [];
    return properties.filter(p => {
      const distance = Math.sqrt(
        Math.pow(p.latitude - selectedCity.lat, 2) + 
        Math.pow(p.longitude - selectedCity.lng, 2)
      );
      return distance < 0.15; // ~15km radius
    });
  }, [selectedCity, properties]);

  // Heatmap points - normalized price per m2
  const heatmapPoints = useMemo(() => {
    if (properties.length === 0) return [];
    
    // Find min/max price per m2 for normalization
    const pricesPerM2 = properties
      .filter(p => p.area_m2 > 0)
      .map(p => p.price / p.area_m2);
    
    if (pricesPerM2.length === 0) return [];
    
    const minPrice = Math.min(...pricesPerM2);
    const maxPrice = Math.max(...pricesPerM2);
    const range = maxPrice - minPrice || 1;
    
    return properties
      .filter(p => p.latitude && p.longitude && p.area_m2 > 0)
      .map(p => {
        const pricePerM2 = p.price / p.area_m2;
        const intensity = (pricePerM2 - minPrice) / range; // 0-1
        return [p.latitude, p.longitude, intensity] as [number, number, number];
      });
  }, [properties]);

  return (
    <div className="h-full w-full flex flex-col lg:flex-row bg-zinc-950">
      {/* Sidebar */}
      <div className="w-full lg:w-80 bg-zinc-900 border-b lg:border-b-0 lg:border-r border-zinc-800 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-zinc-800">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <MapPin className="w-5 h-5 text-emerald-400" />
            Mapa Slovenska
          </h2>
          <p className="text-sm text-zinc-400 mt-1">
            Klikni na mesto alebo bod pre detail
          </p>

          {/* Filters */}
          <div className="mt-3 space-y-2">
            <input
              type="text"
              placeholder="Mesto (filter)"
              value={filterCity}
              onChange={(e) => setFilterCity(e.target.value)}
              onBlur={loadData}
              onKeyDown={(e) => e.key === "Enter" && loadData()}
              className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="Min €"
                value={filterMinPrice}
                onChange={(e) => setFilterMinPrice(e.target.value)}
                onBlur={loadData}
                min={0}
                className="flex-1 px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <input
                type="number"
                placeholder="Max €"
                value={filterMaxPrice}
                onChange={(e) => setFilterMaxPrice(e.target.value)}
                onBlur={loadData}
                min={0}
                className="flex-1 px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-zinc-400 cursor-pointer">
              <input
                type="checkbox"
                checked={includeWithoutCoords}
                onChange={(e) => {
                  setIncludeWithoutCoords(e.target.checked);
                  setTimeout(loadData, 0);
                }}
                className="rounded border-zinc-600 bg-zinc-800 text-emerald-500 focus:ring-emerald-500"
              />
              Zobraziť aj bez presnej polohy (stred mesta)
            </label>
            <button
              type="button"
              onClick={loadData}
              disabled={loading}
              className="w-full py-2 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-white text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Obnoviť dáta
            </button>
          </div>

          {/* DB Status */}
          <div className="mt-3 flex items-center gap-2 text-xs">
            <div className={`w-2 h-2 rounded-full ${
              loading ? "bg-zinc-600 animate-pulse" :
              dbConnected ? "bg-emerald-400" : "bg-amber-400"
            }`} />
            <span className="text-zinc-500">
              {loading ? "Načítavam..." : dbConnected ? "Live dáta" : "Demo dáta"}
            </span>
          </div>
        </div>

        {/* Stats summary */}
        <div className="p-4 border-b border-zinc-800 grid grid-cols-3 gap-3">
          <div className="text-center">
            <div className="text-base font-semibold text-white">{totals.properties.toLocaleString()}</div>
            <div className="text-xs text-zinc-500">Nehnuteľností</div>
          </div>
          <div className="text-center">
            <div className="text-base font-semibold text-red-400">{totals.hotDeals}</div>
            <div className="text-xs text-zinc-500">Hot Deals</div>
          </div>
          <div className="text-center">
            <div className="text-base font-semibold text-emerald-400">
              {totals.avgPrice > 0 ? `€${totals.avgPrice.toLocaleString()}` : "-"}
            </div>
            <div className="text-xs text-zinc-500">Priem. €/m²</div>
          </div>
        </div>

        {/* City list */}
        <div className="flex-1 overflow-y-auto">
          {selectedCity ? (
            // City detail
            <div className="p-4">
              <button 
                onClick={handleReset}
                className="flex items-center gap-1 text-sm text-zinc-400 hover:text-white mb-4 transition-colors"
              >
                ← Späť na Slovensko
              </button>
              
              <h3 className="text-base font-semibold text-white mb-1">{selectedCity.name}</h3>
              {selectedCity.region && (
                <p className="text-sm text-zinc-500 mb-4">{selectedCity.region} kraj</p>
              )}
              
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-zinc-800/50 border border-zinc-700/50">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400 text-sm">Priemerná cena</span>
                    <div className="flex items-center gap-2">
                      <span className="text-white font-semibold">
                        {selectedCity.avgPrice > 0 ? `€${selectedCity.avgPrice.toLocaleString()}/m²` : "-"}
                      </span>
                      {(selectedCity.priceChange ?? 0) !== 0 && (
                        <span className={`text-xs flex items-center gap-0.5 ${(selectedCity.priceChange ?? 0) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                          {(selectedCity.priceChange ?? 0) >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                          {selectedCity.priceChange}%
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="p-3 rounded-lg bg-zinc-800/50 border border-zinc-700/50">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400 text-sm">Počet ponúk</span>
                    <span className="text-white font-semibold">{selectedCity.properties.toLocaleString()}</span>
                  </div>
                </div>
                
                {selectedCity.population && (
                  <div className="p-3 rounded-lg bg-zinc-800/50 border border-zinc-700/50">
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-400 text-sm">Obyvateľov</span>
                      <span className="text-white font-semibold">{selectedCity.population.toLocaleString()}</span>
                    </div>
                  </div>
                )}
                
                {selectedCity.hotDeals > 0 && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                    <div className="flex items-center justify-between">
                      <span className="text-red-400 text-sm flex items-center gap-1">
                        <Flame className="w-4 h-4" />
                        Hot Deals
                      </span>
                      <span className="text-red-400 font-semibold">{selectedCity.hotDeals}</span>
                    </div>
                  </div>
                )}
              </div>
              
              <a
                href={`/dashboard/properties?city=${encodeURIComponent(selectedCity.name)}`}
                className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition-colors"
              >
                Zobraziť ponuky
                <ChevronRight className="w-4 h-4" />
              </a>
            </div>
          ) : (
            // City list
            <div className="p-2">
              {citiesWithProperties.length > 0 ? (
                citiesWithProperties.map((city) => (
                  <button
                    key={city.name}
                    onClick={() => handleCityClick(city)}
                    onMouseEnter={() => setHoveredCity(city.name)}
                    onMouseLeave={() => setHoveredCity(null)}
                    className={`w-full p-3 rounded-lg flex items-center justify-between transition-all ${
                      hoveredCity === city.name 
                        ? "bg-zinc-800 border border-zinc-700" 
                        : "hover:bg-zinc-800/50 border border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: getPriceColor(city.avgPrice) }}
                      />
                      <div className="text-left">
                        <div className="text-white font-medium">{city.name}</div>
                        <div className="text-xs text-zinc-500">{city.properties.toLocaleString()} ponúk</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-white">
                        {city.avgPrice > 0 ? `€${city.avgPrice.toLocaleString()}` : "-"}
                      </div>
                      <div className="text-xs text-zinc-500">/m²</div>
                    </div>
                  </button>
                ))
              ) : loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
                </div>
              ) : (
                <div className="text-center py-8 text-zinc-500 text-sm">
                  Žiadne nehnuteľnosti
                </div>
              )}
            </div>
          )}
        </div>

        {/* View Mode Toggle */}
        <div className="p-4 border-t border-zinc-800">
          <div className="text-xs text-zinc-500 mb-2">Zobrazenie</div>
          <div className="grid grid-cols-3 gap-1 bg-zinc-800/50 rounded-lg p-1">
            <button
              onClick={() => setViewMode("bubbles")}
              className={`flex flex-col items-center gap-1 p-2 rounded-md transition-colors ${
                viewMode === "bubbles" ? "bg-zinc-700 text-emerald-400" : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Layers className="w-4 h-4" />
              <span className="text-[10px]">Bubliny</span>
            </button>
            <button
              onClick={() => setViewMode("heatmap")}
              className={`flex flex-col items-center gap-1 p-2 rounded-md transition-colors ${
                viewMode === "heatmap" ? "bg-zinc-700 text-emerald-400" : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <ThermometerSun className="w-4 h-4" />
              <span className="text-[10px]">Heatmapa</span>
            </button>
            <button
              onClick={() => setViewMode("markers")}
              className={`flex flex-col items-center gap-1 p-2 rounded-md transition-colors ${
                viewMode === "markers" ? "bg-zinc-700 text-emerald-400" : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Building className="w-4 h-4" />
              <span className="text-[10px]">Body</span>
            </button>
          </div>
        </div>

        {/* Legend */}
        <div className="p-4 border-t border-zinc-800">
          <div className="text-xs text-zinc-500 mb-2">
            {viewMode === "heatmap" ? "Intenzita = Cena/m²" : "Cena za m²"}
          </div>
          <div className="flex items-center gap-2 text-xs flex-wrap">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-zinc-400">{viewMode === "heatmap" ? "Lacné" : "<€1800"}</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <span className="text-zinc-400">{viewMode === "heatmap" ? "Stredné" : "€1800-2200"}</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-orange-500" />
              <span className="text-zinc-400">{viewMode === "heatmap" ? "Drahšie" : "€2200-3000"}</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-zinc-400">{viewMode === "heatmap" ? "Drahé" : ">€3000"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 relative min-h-[400px] lg:min-h-0">
        <MapContainer
          center={mapCenter}
          zoom={mapZoom}
          className="h-full w-full"
          zoomControl={false}
          style={{ background: "#f8fafc" }}
        >
          <MapController center={mapCenter} zoom={mapZoom} />
          
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />

          {/* Heatmap Layer */}
          {viewMode === "heatmap" && heatmapPoints.length > 0 && (
            <HeatmapLayer points={heatmapPoints} />
          )}

          {/* City bubbles when not zoomed - only in bubbles mode */}
          {viewMode === "bubbles" && !selectedCity && citiesWithProperties.map((city) => (
            <CircleMarker
              key={city.name}
              center={[city.lat, city.lng]}
              radius={getBubbleRadius(city.properties, maxProps)}
              pathOptions={{
                color: getPriceColor(city.avgPrice),
                fillColor: getPriceColor(city.avgPrice),
                fillOpacity: hoveredCity === city.name ? 0.9 : 0.6,
                weight: hoveredCity === city.name ? 3 : 2,
              }}
              eventHandlers={{
                click: () => handleCityClick(city),
                mouseover: () => setHoveredCity(city.name),
                mouseout: () => setHoveredCity(null),
              }}
            >
              <Popup>
                <div className="p-2 min-w-[180px]">
                  <h3 className="font-bold text-zinc-900 text-lg mb-2">{city.name}</h3>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-zinc-600">Cena/m²:</span>
                      <span className="font-semibold">
                        {city.avgPrice > 0 ? `€${city.avgPrice.toLocaleString()}` : "-"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-600">Ponúk:</span>
                      <span className="font-semibold">{city.properties.toLocaleString()}</span>
                    </div>
                    {city.hotDeals > 0 && (
                      <div className="flex justify-between text-red-600">
                        <span className="flex items-center gap-1">
                          <Flame className="w-3 h-3" />
                          Hot Deals:
                        </span>
                        <span className="font-semibold">{city.hotDeals}</span>
                      </div>
                    )}
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          ))}

          {/* All property markers - in markers mode or when zoomed in */}
          {(viewMode === "markers" || selectedCity) && properties.filter(p => {
            if (selectedCity) {
              const distance = Math.sqrt(
                Math.pow(p.latitude - selectedCity.lat, 2) + 
                Math.pow(p.longitude - selectedCity.lng, 2)
              );
              return distance < 0.15;
            }
            return true;
          }).map((property) => (
            <CircleMarker
              key={property.id}
              center={[property.latitude, property.longitude]}
              radius={property.is_distressed ? 8 : 6}
              pathOptions={{
                color: property.is_distressed ? "#ef4444" : "#3b82f6",
                fillColor: property.is_distressed ? "#ef4444" : "#3b82f6",
                fillOpacity: 0.8,
                weight: property.is_distressed ? 2 : 1,
              }}
            >
              <Popup>
                <div className="p-2 min-w-[200px]">
                  {property.approximate && (
                    <p className="text-[10px] text-amber-600 mb-1">Približná poloha (stred mesta)</p>
                  )}
                  <h3 className="font-semibold text-zinc-900 text-sm mb-2 line-clamp-2">
                    {property.title}
                  </h3>
                  <div className="space-y-1 text-xs text-zinc-600">
                    <div className="flex justify-between">
                      <span>Cena:</span>
                      <span className="font-semibold text-zinc-900">€{property.price.toLocaleString()}</span>
                    </div>
                    {property.area_m2 > 0 && (
                      <>
                        <div className="flex justify-between">
                          <span>Plocha:</span>
                          <span>{property.area_m2} m²</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Cena/m²:</span>
                          <span className="font-semibold">€{Math.round(property.price / property.area_m2).toLocaleString()}</span>
                        </div>
                      </>
                    )}
                    {property.rooms && (
                      <div className="flex justify-between">
                        <span>Izby:</span>
                        <span>{property.rooms}</span>
                      </div>
                    )}
                  </div>
                  {property.source_url && (
                    <a
                      href={property.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 flex items-center gap-1 text-xs text-blue-600 hover:underline"
                    >
                      Otvoriť inzerát <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>

        {/* Zoom controls */}
        <div className="absolute top-4 right-4 flex flex-col gap-2 z-[1000]">
          <button
            onClick={handleReset}
            className="p-2 bg-zinc-900/90 hover:bg-zinc-800 text-white rounded-lg border border-zinc-700 transition-colors"
            title="Reset view"
          >
            <MapPin className="w-5 h-5" />
          </button>
        </div>

        {/* Loading overlay */}
        {loading && (
          <div className="absolute inset-0 bg-zinc-950/80 flex items-center justify-center z-[1000]">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
              <span className="text-zinc-400 text-sm">Načítavam mapu...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
