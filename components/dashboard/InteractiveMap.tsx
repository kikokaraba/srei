"use client";

import { useEffect, useState, useMemo } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  TrendingUp,
  TrendingDown,
  Home,
  MapPin,
  Euro,
  Flame,
  ExternalLink,
  Building2,
  Loader2,
  ChevronRight,
  BarChart3,
} from "lucide-react";

// Fix Leaflet icons
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: () => string })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

// Koordináty slovenských miest (statické)
const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  "Bratislava": { lat: 48.1486, lng: 17.1077 },
  "Košice": { lat: 48.7164, lng: 21.2611 },
  "Prešov": { lat: 48.9986, lng: 21.2391 },
  "Žilina": { lat: 49.2231, lng: 18.7394 },
  "Banská Bystrica": { lat: 48.7364, lng: 19.1458 },
  "Trnava": { lat: 48.3774, lng: 17.5883 },
  "Trenčín": { lat: 48.8945, lng: 18.0444 },
  "Nitra": { lat: 48.3061, lng: 18.0833 },
  "Poprad": { lat: 49.0512, lng: 20.2943 },
  "Martin": { lat: 49.0636, lng: 18.9214 },
  "Piešťany": { lat: 48.7947, lng: 17.8382 },
  "Zvolen": { lat: 48.5744, lng: 19.1236 },
};

// Typ pre mesto s dátami
interface CityData {
  name: string;
  lat: number;
  lng: number;
  properties: number;
  avgPrice: number;
  hotDeals: number;
  priceChange: number;
  avgRent: number;
  yieldPercent: number;
  investorScore: number;
}

// Placeholder - bude nahradené reálnymi dátami
const CITIES: CityData[] = [
  { 
    name: "Bratislava", 
    lat: 48.1486, 
    lng: 17.1077, 
    properties: 0,
    avgPrice: 0,
    hotDeals: 0,
    priceChange: 0,
    avgRent: 0,
    yieldPercent: 0,
    investorScore: 0,
  },
  { 
    name: "Košice", 
    lat: 48.7164, 
    lng: 21.2611, 
    properties: 0,
    avgPrice: 0,
    hotDeals: 0,
    priceChange: 0,
    avgRent: 0,
    yieldPercent: 0,
    investorScore: 0,
  },
  { 
    name: "Prešov", 
    lat: 48.9986, 
    lng: 21.2391, 
    properties: 0,
    avgPrice: 0,
    hotDeals: 0,
    priceChange: 0,
    avgRent: 0,
    yieldPercent: 0,
    investorScore: 0,
  },
  { 
    name: "Žilina", 
    lat: 49.2231, 
    lng: 18.7394, 
    properties: 0,
    avgPrice: 0,
    hotDeals: 0,
    priceChange: 0,
    avgRent: 0,
    yieldPercent: 0,
    investorScore: 0,
  },
  { 
    name: "Banská Bystrica", 
    lat: 48.7364, 
    lng: 19.1458, 
    properties: 0,
    avgPrice: 0,
    hotDeals: 0,
    priceChange: 0,
    avgRent: 0,
    yieldPercent: 0,
    investorScore: 0,
  },
  { 
    name: "Trnava", 
    lat: 48.3774, 
    lng: 17.5883, 
    properties: 0,
    avgPrice: 0,
    hotDeals: 0,
    priceChange: 0,
    avgRent: 0,
    yieldPercent: 0,
    investorScore: 0,
  },
  { 
    name: "Trenčín", 
    lat: 48.8945, 
    lng: 18.0444, 
    properties: 0,
    avgPrice: 0,
    hotDeals: 0,
    priceChange: 0,
    avgRent: 0,
    yieldPercent: 0,
    investorScore: 0,
  },
  { 
    name: "Nitra", 
    lat: 48.3061, 
    lng: 18.0833, 
    properties: 0,
    avgPrice: 0,
    hotDeals: 0,
    priceChange: 0,
    avgRent: 0,
    yieldPercent: 0,
    investorScore: 0,
  },
  { 
    name: "Poprad", 
    lat: 49.0512, 
    lng: 20.2943, 
    properties: 0,
    avgPrice: 0,
    hotDeals: 0,
    priceChange: 0,
    avgRent: 0,
    yieldPercent: 0,
    investorScore: 0,
  },
  { 
    name: "Martin", 
    lat: 49.0636, 
    lng: 18.9214, 
    properties: 0,
    avgPrice: 0,
    hotDeals: 0,
    priceChange: 0,
    avgRent: 0,
    yieldPercent: 0,
    investorScore: 0,
  },
  { 
    name: "Piešťany", 
    lat: 48.7947, 
    lng: 17.8382, 
    properties: 0,
    avgPrice: 0,
    hotDeals: 0,
    priceChange: 0,
    avgRent: 0,
    yieldPercent: 0,
    investorScore: 0,
  },
  { 
    name: "Zvolen", 
    lat: 48.5744, 
    lng: 19.1236, 
    properties: 0,
    avgPrice: 0,
    hotDeals: 0,
    priceChange: 0,
    avgRent: 0,
    yieldPercent: 0,
    investorScore: 0,
  },
];

// Calculate bubble size based on property count
const getBubbleRadius = (properties: number, maxProps: number) => {
  const min = 15;
  const max = 45;
  if (maxProps === 0) return min;
  return min + (properties / maxProps) * (max - min);
};

// Get color based on price
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
  price_per_m2: number;
  area_m2: number;
  city: string;
  latitude: number;
  longitude: number;
  listing_type: string;
  is_distressed: boolean;
  source_url: string | null;
  rooms: number | null;
}

export default function InteractiveMap() {
  const [selectedCity, setSelectedCity] = useState<CityData | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([48.7, 19.5]);
  const [mapZoom, setMapZoom] = useState(7);
  const [hoveredCity, setHoveredCity] = useState<string | null>(null);
  const [cityStats, setCityStats] = useState<CityData[]>(CITIES);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(false);
  const [dbConnected, setDbConnected] = useState<boolean | null>(null);

  // Check database and load properties
  useEffect(() => {
    const checkDb = async () => {
      try {
        const res = await fetch("/api/db-test", { 
          signal: AbortSignal.timeout(5000) 
        });
        const data = await res.json();
        setDbConnected(data.ok);
        
        if (data.ok) {
          // Try to load properties
          const propsRes = await fetch("/api/v1/properties/map?limit=500", {
            signal: AbortSignal.timeout(10000)
          });
          const propsData = await propsRes.json();
          if (propsData.properties) {
            setProperties(propsData.properties.filter((p: Property) => p.latitude && p.longitude));
          }
        }
      } catch {
        setDbConnected(false);
      }
    };
    checkDb();
  }, []);

  // Calculate city stats from loaded properties
  useEffect(() => {
    if (properties.length === 0) return;
    
    // Group properties by city
    const cityData: Record<string, { count: number; totalPrice: number; hotDeals: number }> = {};
    
    for (const prop of properties) {
      const cityName = prop.city;
      if (!cityData[cityName]) {
        cityData[cityName] = { count: 0, totalPrice: 0, hotDeals: 0 };
      }
      cityData[cityName].count++;
      cityData[cityName].totalPrice += prop.price_per_m2;
      if (prop.is_distressed) {
        cityData[cityName].hotDeals++;
      }
    }
    
    // Update city stats
    setCityStats(prev => prev.map(city => {
      const data = cityData[city.name];
      if (data) {
        return {
          ...city,
          properties: data.count,
          avgPrice: Math.round(data.totalPrice / data.count),
          hotDeals: data.hotDeals,
        };
      }
      return city;
    }));
  }, [properties]);

  // Handle city click
  const handleCityClick = (city: CityData) => {
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
  const totals = useMemo(() => ({
    properties: cityStats.reduce((sum, c) => sum + c.properties, 0),
    hotDeals: cityStats.reduce((sum, c) => sum + c.hotDeals, 0),
    avgPrice: cityStats.filter(c => c.avgPrice > 0).length > 0 
      ? Math.round(cityStats.filter(c => c.avgPrice > 0).reduce((sum, c) => sum + c.avgPrice, 0) / cityStats.filter(c => c.avgPrice > 0).length)
      : 0,
  }), [cityStats]);
  
  // Max properties for bubble sizing
  const maxProps = useMemo(() => Math.max(...cityStats.map(c => c.properties), 1), [cityStats]);

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
            <div className={`w-2 h-2 rounded-full ${dbConnected ? "bg-emerald-400" : dbConnected === false ? "bg-amber-400" : "bg-slate-600 animate-pulse"}`} />
            <span className="text-slate-500">
              {dbConnected ? "Live dáta" : dbConnected === false ? "Demo dáta" : "Kontrolujem..."}
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
            <div className="text-xl font-bold text-emerald-400">€{totals.avgPrice}</div>
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
              
              <h3 className="text-xl font-bold text-white mb-4">{selectedCity.name}</h3>
              
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-sm">Priemerná cena</span>
                    <div className="flex items-center gap-2">
                      <span className="text-white font-semibold">€{selectedCity.avgPrice.toLocaleString()}/m²</span>
                      <span className={`text-xs flex items-center gap-0.5 ${selectedCity.priceChange >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {selectedCity.priceChange >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {selectedCity.priceChange}%
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-sm">Priemerný nájom</span>
                    <span className="text-white font-semibold">€{selectedCity.avgRent}/mes</span>
                  </div>
                </div>
                
                <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-sm">Výnos z nájmu</span>
                    <span className="text-emerald-400 font-semibold">{selectedCity.yieldPercent}%</span>
                  </div>
                </div>
                
                <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-sm">Počet ponúk</span>
                    <span className="text-white font-semibold">{selectedCity.properties}</span>
                  </div>
                </div>
                
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                  <div className="flex items-center justify-between">
                    <span className="text-red-400 text-sm flex items-center gap-1">
                      <Flame className="w-4 h-4" />
                      Hot Deals
                    </span>
                    <span className="text-red-400 font-semibold">{selectedCity.hotDeals}</span>
                  </div>
                </div>
                
                {/* Investor Score */}
                <div className="p-4 rounded-lg bg-gradient-to-r from-emerald-500/10 to-gold-500/10 border border-emerald-500/20">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white text-sm font-medium flex items-center gap-1">
                      <BarChart3 className="w-4 h-4 text-emerald-400" />
                      Investorské skóre
                    </span>
                    <span className={`font-bold text-lg ${
                      selectedCity.investorScore >= 80 ? "text-emerald-400" :
                      selectedCity.investorScore >= 70 ? "text-gold-400" :
                      "text-slate-400"
                    }`}>
                      {selectedCity.investorScore}/100
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        selectedCity.investorScore >= 80 ? "bg-emerald-500" :
                        selectedCity.investorScore >= 70 ? "bg-gold-500" :
                        "bg-slate-500"
                      }`}
                      style={{ width: `${selectedCity.investorScore}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    {selectedCity.investorScore >= 80 ? "Vynikajúca príležitosť" :
                     selectedCity.investorScore >= 70 ? "Dobrá príležitosť" :
                     "Priemerná príležitosť"}
                  </p>
                </div>
              </div>
              
              <a
                href={`/dashboard/properties?city=${selectedCity.name}`}
                className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition-colors"
              >
                Zobraziť ponuky
                <ChevronRight className="w-4 h-4" />
              </a>
            </div>
          ) : (
            // City list
            <div className="p-2">
              {CITIES.sort((a, b) => b.properties - a.properties).map((city) => (
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
                      <div className="text-xs text-slate-500">{city.properties} ponúk</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-white">€{city.avgPrice}</div>
                    <div className={`text-xs flex items-center justify-end gap-0.5 ${city.priceChange >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {city.priceChange >= 0 ? "+" : ""}{city.priceChange}%
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="p-4 border-t border-slate-800">
          <div className="text-xs text-slate-500 mb-2">Cena za m²</div>
          <div className="flex items-center gap-2 text-xs">
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
          
          {/* Light tile layer - like realitymap.sk */}
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />

          {/* City bubbles */}
          {!selectedCity && cityStats.filter(c => c.properties > 0).map((city) => (
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
                      <span className="font-semibold">€{city.avgPrice.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Ponúk:</span>
                      <span className="font-semibold">{city.properties}</span>
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
          {selectedCity && properties
            .filter(p => {
              const distance = Math.sqrt(
                Math.pow(p.latitude - selectedCity.lat, 2) + 
                Math.pow(p.longitude - selectedCity.lng, 2)
              );
              return distance < 0.2; // ~20km radius
            })
            .map((property) => (
              <CircleMarker
                key={property.id}
                center={[property.latitude, property.longitude]}
                radius={property.is_distressed ? 8 : 6}
                pathOptions={{
                  color: property.is_distressed ? "#ef4444" : property.listing_type === "PRENAJOM" ? "#8b5cf6" : "#3b82f6",
                  fillColor: property.is_distressed ? "#ef4444" : property.listing_type === "PRENAJOM" ? "#8b5cf6" : "#3b82f6",
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
                      <div className="flex justify-between">
                        <span>Cena/m²:</span>
                        <span className="font-semibold">€{property.price_per_m2}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Plocha:</span>
                        <span>{property.area_m2} m²</span>
                      </div>
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
            <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
          </div>
        )}
      </div>
    </div>
  );
}
