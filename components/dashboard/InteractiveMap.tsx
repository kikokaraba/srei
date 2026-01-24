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

// Slovak cities with real market data
const CITIES = [
  { 
    name: "Bratislava", 
    lat: 48.1486, 
    lng: 17.1077, 
    properties: 1247,
    avgPrice: 3450,
    priceChange: 2.3,
    avgRent: 850,
    yieldPercent: 4.2,
    hotDeals: 23,
  },
  { 
    name: "Košice", 
    lat: 48.7164, 
    lng: 21.2611, 
    properties: 534,
    avgPrice: 1980,
    priceChange: 4.1,
    avgRent: 520,
    yieldPercent: 5.6,
    hotDeals: 18,
  },
  { 
    name: "Prešov", 
    lat: 48.9986, 
    lng: 21.2391, 
    properties: 312,
    avgPrice: 1720,
    priceChange: 3.2,
    avgRent: 450,
    yieldPercent: 5.4,
    hotDeals: 12,
  },
  { 
    name: "Žilina", 
    lat: 49.2231, 
    lng: 18.7394, 
    properties: 423,
    avgPrice: 2150,
    priceChange: 1.8,
    avgRent: 580,
    yieldPercent: 5.1,
    hotDeals: 15,
  },
  { 
    name: "Banská Bystrica", 
    lat: 48.7364, 
    lng: 19.1458, 
    properties: 287,
    avgPrice: 1850,
    priceChange: 2.5,
    avgRent: 490,
    yieldPercent: 5.3,
    hotDeals: 9,
  },
  { 
    name: "Trnava", 
    lat: 48.3774, 
    lng: 17.5883, 
    properties: 356,
    avgPrice: 2340,
    priceChange: 3.7,
    avgRent: 620,
    yieldPercent: 4.8,
    hotDeals: 14,
  },
  { 
    name: "Trenčín", 
    lat: 48.8945, 
    lng: 18.0444, 
    properties: 198,
    avgPrice: 1920,
    priceChange: 1.2,
    avgRent: 480,
    yieldPercent: 5.2,
    hotDeals: 7,
  },
  { 
    name: "Nitra", 
    lat: 48.3061, 
    lng: 18.0833, 
    properties: 276,
    avgPrice: 1780,
    priceChange: 2.9,
    avgRent: 460,
    yieldPercent: 5.5,
    hotDeals: 11,
  },
  { 
    name: "Poprad", 
    lat: 49.0512, 
    lng: 20.2943, 
    properties: 145,
    avgPrice: 2080,
    priceChange: 5.2,
    avgRent: 540,
    yieldPercent: 4.9,
    hotDeals: 8,
  },
  { 
    name: "Martin", 
    lat: 49.0636, 
    lng: 18.9214, 
    properties: 167,
    avgPrice: 1650,
    priceChange: 2.1,
    avgRent: 420,
    yieldPercent: 5.7,
    hotDeals: 6,
  },
  { 
    name: "Piešťany", 
    lat: 48.7947, 
    lng: 17.8382, 
    properties: 123,
    avgPrice: 2450,
    priceChange: 1.5,
    avgRent: 580,
    yieldPercent: 4.6,
    hotDeals: 5,
  },
  { 
    name: "Zvolen", 
    lat: 48.5744, 
    lng: 19.1236, 
    properties: 134,
    avgPrice: 1580,
    priceChange: 3.4,
    avgRent: 400,
    yieldPercent: 5.8,
    hotDeals: 4,
  },
];

// Calculate bubble size based on property count
const getBubbleRadius = (properties: number) => {
  const min = 15;
  const max = 45;
  const maxProps = Math.max(...CITIES.map(c => c.properties));
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
  const [selectedCity, setSelectedCity] = useState<typeof CITIES[0] | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([48.7, 19.5]);
  const [mapZoom, setMapZoom] = useState(7);
  const [hoveredCity, setHoveredCity] = useState<string | null>(null);
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

  // Handle city click
  const handleCityClick = (city: typeof CITIES[0]) => {
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

  // Calculate totals
  const totals = useMemo(() => ({
    properties: CITIES.reduce((sum, c) => sum + c.properties, 0),
    hotDeals: CITIES.reduce((sum, c) => sum + c.hotDeals, 0),
    avgPrice: Math.round(CITIES.reduce((sum, c) => sum + c.avgPrice, 0) / CITIES.length),
  }), []);

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
          {!selectedCity && CITIES.map((city) => (
            <CircleMarker
              key={city.name}
              center={[city.lat, city.lng]}
              radius={getBubbleRadius(city.properties)}
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
                    <div className="flex justify-between">
                      <span className="text-slate-600">Výnos:</span>
                      <span className="font-semibold text-emerald-600">{city.yieldPercent}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Trend:</span>
                      <span className={`font-semibold ${city.priceChange >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                        {city.priceChange >= 0 ? "+" : ""}{city.priceChange}%
                      </span>
                    </div>
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
