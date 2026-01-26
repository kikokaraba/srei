"use client";

import { useEffect, useState, useMemo } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  TrendingUp,
  TrendingDown,
  MapPin,
  Flame,
  ExternalLink,
  Loader2,
  ChevronRight,
  BarChart3,
} from "lucide-react";
import { 
  normalizeCityName, 
  getCityCoordinates, 
  TRACKED_CITIES,
  type CityInfo 
} from "@/lib/constants/cities";

// Fix Leaflet icons
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: () => string })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

// Extended city data for map display
interface CityMapData extends CityInfo {
  properties: number;
  avgPrice: number;
  hotDeals: number;
  priceChange: number;
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
}

export default function InteractiveMap() {
  const [selectedCity, setSelectedCity] = useState<CityMapData | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([48.7, 19.5]);
  const [mapZoom, setMapZoom] = useState(7);
  const [hoveredCity, setHoveredCity] = useState<string | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [dbConnected, setDbConnected] = useState<boolean | null>(null);

  // Initialize city stats from TRACKED_CITIES
  const [cityStats, setCityStats] = useState<CityMapData[]>(
    TRACKED_CITIES.map(city => ({
      ...city,
      properties: 0,
      avgPrice: 0,
      hotDeals: 0,
      priceChange: 0,
    }))
  );

  // Check database and load properties
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // Check DB connection
        const dbRes = await fetch("/api/db-test", { 
          signal: AbortSignal.timeout(5000) 
        });
        const dbData = await dbRes.json();
        setDbConnected(dbData.ok);
        
        if (dbData.ok) {
          // Load properties
          const propsRes = await fetch("/api/v1/properties/map", {
            signal: AbortSignal.timeout(15000)
          });
          const propsData = await propsRes.json();
          
          if (propsData.data && Array.isArray(propsData.data)) {
            const validProps = propsData.data.filter(
              (p: Property) => p.latitude && p.longitude && p.price > 0
            );
            setProperties(validProps);
            console.log(`Map: Loaded ${validProps.length} properties`);
          }
        }
      } catch (error) {
        console.error("Failed to load map data:", error);
        setDbConnected(false);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, []);

  // Calculate city stats from loaded properties
  useEffect(() => {
    if (properties.length === 0) return;
    
    // Group properties by normalized city name
    const cityData: Record<string, { 
      count: number; 
      totalPrice: number; 
      hotDeals: number;
      totalPricePerM2: number;
    }> = {};
    
    for (const prop of properties) {
      const normalizedCity = normalizeCityName(prop.city);
      if (!normalizedCity) continue; // Skip invalid cities
      
      if (!cityData[normalizedCity]) {
        cityData[normalizedCity] = { count: 0, totalPrice: 0, hotDeals: 0, totalPricePerM2: 0 };
      }
      
      cityData[normalizedCity].count++;
      cityData[normalizedCity].totalPrice += prop.price;
      
      // Calculate price per m2
      const pricePerM2 = prop.price_per_m2 || (prop.area_m2 > 0 ? prop.price / prop.area_m2 : 0);
      if (pricePerM2 > 0 && pricePerM2 < 50000) { // Sanity check
        cityData[normalizedCity].totalPricePerM2 += pricePerM2;
      }
      
      if (prop.is_distressed) {
        cityData[normalizedCity].hotDeals++;
      }
    }
    
    console.log("City aggregation:", Object.keys(cityData).map(k => `${k}: ${cityData[k].count}`).join(", "));
    
    // Update city stats
    setCityStats(prev => prev.map(city => {
      const data = cityData[city.name];
      if (data && data.count > 0) {
        return {
          ...city,
          properties: data.count,
          avgPrice: Math.round(data.totalPricePerM2 / data.count),
          hotDeals: data.hotDeals,
        };
      }
      return { ...city, properties: 0, avgPrice: 0, hotDeals: 0 };
    }));
  }, [properties]);

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
  const maxProps = useMemo(() => Math.max(...cityStats.map(c => c.properties), 1), [cityStats]);

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

  return (
    <div className="h-full w-full flex flex-col lg:flex-row bg-slate-950">
      {/* Sidebar */}
      <div className="w-full lg:w-80 bg-slate-900 border-b lg:border-b-0 lg:border-r border-slate-800 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-800">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <MapPin className="w-5 h-5 text-emerald-400" />
            Mapa Slovenska
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Klikni na mesto pre detail
          </p>
          
          {/* DB Status */}
          <div className="mt-3 flex items-center gap-2 text-xs">
            <div className={`w-2 h-2 rounded-full ${
              loading ? "bg-slate-600 animate-pulse" :
              dbConnected ? "bg-emerald-400" : "bg-amber-400"
            }`} />
            <span className="text-slate-500">
              {loading ? "Načítavam..." : dbConnected ? "Live dáta" : "Demo dáta"}
            </span>
          </div>
        </div>

        {/* Stats summary */}
        <div className="p-4 border-b border-slate-800 grid grid-cols-3 gap-3">
          <div className="text-center">
            <div className="text-xl font-bold text-white">{totals.properties.toLocaleString()}</div>
            <div className="text-xs text-slate-500">Nehnuteľností</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-red-400">{totals.hotDeals}</div>
            <div className="text-xs text-slate-500">Hot Deals</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-emerald-400">
              {totals.avgPrice > 0 ? `€${totals.avgPrice.toLocaleString()}` : "-"}
            </div>
            <div className="text-xs text-slate-500">Priem. €/m²</div>
          </div>
        </div>

        {/* City list */}
        <div className="flex-1 overflow-y-auto">
          {selectedCity ? (
            // City detail
            <div className="p-4">
              <button 
                onClick={handleReset}
                className="flex items-center gap-1 text-sm text-slate-400 hover:text-white mb-4 transition-colors"
              >
                ← Späť na Slovensko
              </button>
              
              <h3 className="text-xl font-bold text-white mb-1">{selectedCity.name}</h3>
              <p className="text-sm text-slate-500 mb-4">{selectedCity.region} kraj</p>
              
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-sm">Priemerná cena</span>
                    <div className="flex items-center gap-2">
                      <span className="text-white font-semibold">
                        {selectedCity.avgPrice > 0 ? `€${selectedCity.avgPrice.toLocaleString()}/m²` : "-"}
                      </span>
                      {selectedCity.priceChange !== 0 && (
                        <span className={`text-xs flex items-center gap-0.5 ${selectedCity.priceChange >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                          {selectedCity.priceChange >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                          {selectedCity.priceChange}%
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-sm">Počet ponúk</span>
                    <span className="text-white font-semibold">{selectedCity.properties.toLocaleString()}</span>
                  </div>
                </div>
                
                {selectedCity.population && (
                  <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 text-sm">Obyvateľov</span>
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
                        ? "bg-slate-800 border border-slate-700" 
                        : "hover:bg-slate-800/50 border border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: getPriceColor(city.avgPrice) }}
                      />
                      <div className="text-left">
                        <div className="text-white font-medium">{city.name}</div>
                        <div className="text-xs text-slate-500">{city.properties.toLocaleString()} ponúk</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-white">
                        {city.avgPrice > 0 ? `€${city.avgPrice.toLocaleString()}` : "-"}
                      </div>
                      <div className="text-xs text-slate-500">/m²</div>
                    </div>
                  </button>
                ))
              ) : loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500 text-sm">
                  Žiadne nehnuteľnosti
                </div>
              )}
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="p-4 border-t border-slate-800">
          <div className="text-xs text-slate-500 mb-2">Cena za m²</div>
          <div className="flex items-center gap-2 text-xs flex-wrap">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-slate-400">&lt;€1800</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <span className="text-slate-400">€1800-2200</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-orange-500" />
              <span className="text-slate-400">€2200-3000</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-slate-400">&gt;€3000</span>
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

          {/* City bubbles when not zoomed */}
          {!selectedCity && citiesWithProperties.map((city) => (
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
                  <h3 className="font-bold text-slate-900 text-lg mb-2">{city.name}</h3>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Cena/m²:</span>
                      <span className="font-semibold">
                        {city.avgPrice > 0 ? `€${city.avgPrice.toLocaleString()}` : "-"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Ponúk:</span>
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

          {/* Property markers when zoomed in */}
          {selectedCity && cityProperties.map((property) => (
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
                  <h3 className="font-semibold text-slate-900 text-sm mb-2 line-clamp-2">
                    {property.title}
                  </h3>
                  <div className="space-y-1 text-xs text-slate-600">
                    <div className="flex justify-between">
                      <span>Cena:</span>
                      <span className="font-semibold text-slate-900">€{property.price.toLocaleString()}</span>
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
            className="p-2 bg-slate-900/90 hover:bg-slate-800 text-white rounded-lg border border-slate-700 transition-colors"
            title="Reset view"
          >
            <MapPin className="w-5 h-5" />
          </button>
        </div>

        {/* Loading overlay */}
        {loading && (
          <div className="absolute inset-0 bg-slate-950/80 flex items-center justify-center z-[1000]">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
              <span className="text-slate-400 text-sm">Načítavam mapu...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
