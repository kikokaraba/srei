"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import {
  TrendingUp,
  Home,
  MapPin,
  Euro,
  BarChart3,
  Loader2,
  Info,
  Layers,
} from "lucide-react";

// Dynamický import Leaflet komponentov (SSR fix)
const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false }
);
const CircleMarker = dynamic(
  () => import("react-leaflet").then((mod) => mod.CircleMarker),
  { ssr: false }
);
const Popup = dynamic(
  () => import("react-leaflet").then((mod) => mod.Popup),
  { ssr: false }
);
const Tooltip = dynamic(
  () => import("react-leaflet").then((mod) => mod.Tooltip),
  { ssr: false }
);

// Leaflet CSS import
import "leaflet/dist/leaflet.css";

// Slovenské mestá s GPS súradnicami
const CITIES_DATA = [
  {
    name: "Bratislava",
    slug: "BRATISLAVA",
    lat: 48.1486,
    lng: 17.1077,
    avgPrice: 3200,
    avgYield: 4.2,
    properties: 0,
    trend: 2.5,
  },
  {
    name: "Košice",
    slug: "KOSICE",
    lat: 48.7164,
    lng: 21.2611,
    avgPrice: 1850,
    avgYield: 5.8,
    properties: 0,
    trend: 3.1,
  },
  {
    name: "Prešov",
    slug: "PRESOV",
    lat: 48.9986,
    lng: 21.2391,
    avgPrice: 1650,
    avgYield: 5.5,
    properties: 0,
    trend: 1.8,
  },
  {
    name: "Žilina",
    slug: "ZILINA",
    lat: 49.2231,
    lng: 18.7394,
    avgPrice: 1950,
    avgYield: 5.1,
    properties: 0,
    trend: 2.2,
  },
  {
    name: "Banská Bystrica",
    slug: "BANSKA_BYSTRICA",
    lat: 48.7364,
    lng: 19.1458,
    avgPrice: 1750,
    avgYield: 5.4,
    properties: 0,
    trend: 1.5,
  },
  {
    name: "Trnava",
    slug: "TRNAVA",
    lat: 48.3774,
    lng: 17.5883,
    avgPrice: 2100,
    avgYield: 4.9,
    properties: 0,
    trend: 2.8,
  },
  {
    name: "Trenčín",
    slug: "TRENCIN",
    lat: 48.8945,
    lng: 18.0444,
    avgPrice: 1900,
    avgYield: 5.2,
    properties: 0,
    trend: 1.2,
  },
  {
    name: "Nitra",
    slug: "NITRA",
    lat: 48.3061,
    lng: 18.0833,
    avgPrice: 1650,
    avgYield: 5.7,
    properties: 0,
    trend: 2.0,
  },
];

type HeatmapMetric = "price" | "yield" | "properties";

interface CityData {
  name: string;
  slug: string;
  lat: number;
  lng: number;
  avgPrice: number;
  avgYield: number;
  properties: number;
  trend: number;
}

export function SlovakiaHeatmap() {
  const [cities, setCities] = useState<CityData[]>(CITIES_DATA);
  const [loading, setLoading] = useState(true);
  const [selectedCity, setSelectedCity] = useState<CityData | null>(null);
  const [metric, setMetric] = useState<HeatmapMetric>("price");
  const [mapReady, setMapReady] = useState(false);

  // Fetch real data from API
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch property counts per city
      const response = await fetch("/api/v1/properties/filtered?limit=1000");
      if (response.ok) {
        const data = await response.json();
        const properties = data.data || [];

        // Count properties per city and calculate averages
        const cityStats: Record<string, { count: number; totalPrice: number; totalArea: number }> = {};
        
        for (const property of properties) {
          if (!cityStats[property.city]) {
            cityStats[property.city] = { count: 0, totalPrice: 0, totalArea: 0 };
          }
          cityStats[property.city].count++;
          cityStats[property.city].totalPrice += property.price_per_m2;
          cityStats[property.city].totalArea += property.area_m2;
        }

        // Update cities with real data
        setCities((prev) =>
          prev.map((city) => {
            const stats = cityStats[city.slug];
            if (stats) {
              return {
                ...city,
                properties: stats.count,
                avgPrice: Math.round(stats.totalPrice / stats.count),
              };
            }
            return city;
          })
        );
      }
    } catch (error) {
      console.error("Error fetching heatmap data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    // Small delay to ensure Leaflet CSS is loaded
    const timer = setTimeout(() => setMapReady(true), 100);
    return () => clearTimeout(timer);
  }, [fetchData]);

  // Get color based on metric value
  const getColor = useCallback((city: CityData) => {
    if (metric === "price") {
      // Higher price = red, lower = green
      const normalized = (city.avgPrice - 1500) / (3500 - 1500);
      const hue = (1 - Math.min(1, Math.max(0, normalized))) * 120; // 120 = green, 0 = red
      return `hsl(${hue}, 70%, 50%)`;
    } else if (metric === "yield") {
      // Higher yield = green, lower = red
      const normalized = (city.avgYield - 4) / (6 - 4);
      const hue = Math.min(1, Math.max(0, normalized)) * 120;
      return `hsl(${hue}, 70%, 50%)`;
    } else {
      // Properties count - blue gradient
      const normalized = city.properties / 5;
      return `hsl(210, 70%, ${50 + normalized * 20}%)`;
    }
  }, [metric]);

  // Get radius based on metric
  const getRadius = useCallback((city: CityData) => {
    if (metric === "price") {
      return 15 + (city.avgPrice / 500);
    } else if (metric === "yield") {
      return 15 + city.avgYield * 3;
    } else {
      return 15 + city.properties * 3;
    }
  }, [metric]);

  // Calculate min/max for legend
  const legendData = useMemo(() => {
    if (metric === "price") {
      const prices = cities.map((c) => c.avgPrice);
      return {
        min: Math.min(...prices),
        max: Math.max(...prices),
        unit: "€/m²",
        label: "Priemerná cena",
      };
    } else if (metric === "yield") {
      const yields = cities.map((c) => c.avgYield);
      return {
        min: Math.min(...yields),
        max: Math.max(...yields),
        unit: "%",
        label: "Priemerný výnos",
      };
    } else {
      const counts = cities.map((c) => c.properties);
      return {
        min: Math.min(...counts),
        max: Math.max(...counts),
        unit: "",
        label: "Počet nehnuteľností",
      };
    }
  }, [cities, metric]);

  if (!mapReady) {
    return (
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6 min-h-[600px] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Metric Selection */}
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-zinc-400" />
            <span className="text-zinc-400">Zobraziť:</span>
            <div className="flex bg-zinc-800 rounded-lg overflow-hidden">
              <button
                onClick={() => setMetric("price")}
                className={`px-4 py-2 text-sm flex items-center gap-2 transition-colors ${
                  metric === "price"
                    ? "bg-emerald-500/20 text-emerald-400"
                    : "text-zinc-300 hover:bg-zinc-700"
                }`}
              >
                <Euro className="w-4 h-4" />
                Ceny
              </button>
              <button
                onClick={() => setMetric("yield")}
                className={`px-4 py-2 text-sm flex items-center gap-2 transition-colors ${
                  metric === "yield"
                    ? "bg-emerald-500/20 text-emerald-400"
                    : "text-zinc-300 hover:bg-zinc-700"
                }`}
              >
                <TrendingUp className="w-4 h-4" />
                Výnosy
              </button>
              <button
                onClick={() => setMetric("properties")}
                className={`px-4 py-2 text-sm flex items-center gap-2 transition-colors ${
                  metric === "properties"
                    ? "bg-emerald-500/20 text-emerald-400"
                    : "text-zinc-300 hover:bg-zinc-700"
                }`}
              >
                <Home className="w-4 h-4" />
                Ponuky
              </button>
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: metric === "yield" ? "hsl(120, 70%, 50%)" : "hsl(0, 70%, 50%)" }}
              />
              <span className="text-sm text-zinc-400">
                {metric === "yield" ? "Vysoký" : "Nízky"}: {legendData.min.toLocaleString()}{legendData.unit}
              </span>
            </div>
            <div className="w-20 h-2 rounded-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500" />
            <div className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: metric === "yield" ? "hsl(0, 70%, 50%)" : "hsl(120, 70%, 50%)" }}
              />
              <span className="text-sm text-zinc-400">
                {metric === "yield" ? "Nízky" : "Vysoký"}: {legendData.max.toLocaleString()}{legendData.unit}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map */}
        <div className="lg:col-span-2 bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
          <div className="h-[600px]">
            <MapContainer
              center={[48.7, 19.5]}
              zoom={7}
              className="h-full w-full"
              style={{ background: "#0f172a" }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              />
              {cities.map((city) => (
                <CircleMarker
                  key={city.slug}
                  center={[city.lat, city.lng]}
                  radius={getRadius(city)}
                  pathOptions={{
                    fillColor: getColor(city),
                    fillOpacity: 0.7,
                    color: getColor(city),
                    weight: 2,
                  }}
                  eventHandlers={{
                    click: () => setSelectedCity(city),
                  }}
                >
                  <Tooltip direction="top" offset={[0, -10]}>
                    <div className="text-center">
                      <div className="font-bold">{city.name}</div>
                      <div className="text-sm">
                        {metric === "price" && `€${city.avgPrice.toLocaleString()}/m²`}
                        {metric === "yield" && `${city.avgYield.toFixed(1)}% výnos`}
                        {metric === "properties" && `${city.properties} nehnuteľností`}
                      </div>
                    </div>
                  </Tooltip>
                  <Popup>
                    <div className="p-2 min-w-[200px]">
                      <h3 className="font-bold text-lg mb-2">{city.name}</h3>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span>Priem. cena:</span>
                          <span className="font-medium">€{city.avgPrice.toLocaleString()}/m²</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Výnos:</span>
                          <span className="font-medium text-emerald-600">{city.avgYield.toFixed(1)}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Nehnuteľností:</span>
                          <span className="font-medium">{city.properties}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Trend:</span>
                          <span className={`font-medium ${city.trend > 0 ? "text-emerald-600" : "text-red-600"}`}>
                            {city.trend > 0 ? "+" : ""}{city.trend.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </Popup>
                </CircleMarker>
              ))}
            </MapContainer>
          </div>
        </div>

        {/* City Details Panel */}
        <div className="space-y-4">
          {/* Selected City or Instructions */}
          {selectedCity ? (
            <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-zinc-100">{selectedCity.name}</h3>
                <button
                  onClick={() => setSelectedCity(null)}
                  className="text-zinc-400 hover:text-zinc-100"
                >
                  ×
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-zinc-800/50 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-zinc-400 mb-1">
                      <Euro className="w-4 h-4" />
                      <span className="text-sm">Priem. cena</span>
                    </div>
                    <div className="text-2xl font-bold text-zinc-100">
                      €{selectedCity.avgPrice.toLocaleString()}
                    </div>
                    <div className="text-sm text-zinc-400">za m²</div>
                  </div>

                  <div className="bg-zinc-800/50 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-zinc-400 mb-1">
                      <TrendingUp className="w-4 h-4" />
                      <span className="text-sm">Výnos</span>
                    </div>
                    <div className="text-2xl font-bold text-emerald-400">
                      {selectedCity.avgYield.toFixed(1)}%
                    </div>
                    <div className="text-sm text-zinc-400">hrubý ročný</div>
                  </div>
                </div>

                <div className="bg-zinc-800/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-zinc-400 mb-1">
                    <Home className="w-4 h-4" />
                    <span className="text-sm">Nehnuteľností v ponuke</span>
                  </div>
                  <div className="text-2xl font-bold text-zinc-100">
                    {selectedCity.properties}
                  </div>
                </div>

                <div className="bg-zinc-800/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-zinc-400 mb-1">
                    <BarChart3 className="w-4 h-4" />
                    <span className="text-sm">Cenový trend (12 mesiacov)</span>
                  </div>
                  <div className={`text-2xl font-bold ${selectedCity.trend > 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {selectedCity.trend > 0 ? "+" : ""}{selectedCity.trend.toFixed(1)}%
                  </div>
                </div>

                <a
                  href={`/dashboard/properties?city=${selectedCity.slug}`}
                  className="block w-full py-3 px-4 bg-emerald-500 hover:bg-emerald-600 text-white text-center rounded-lg font-medium transition-colors"
                >
                  Zobraziť nehnuteľnosti v {selectedCity.name}
                </a>
              </div>
            </div>
          ) : (
            <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
              <div className="flex items-center gap-2 text-zinc-400 mb-4">
                <Info className="w-5 h-5" />
                <span>Vyberte lokalitu na mape</span>
              </div>
              <p className="text-sm text-zinc-500">
                Kliknite na bod pre zobrazenie detailných štatistík regiónu.
              </p>
            </div>
          )}

          {/* City Rankings */}
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
            <h3 className="font-bold text-zinc-100 mb-4">
              {metric === "price" && "Najdrahšie regióny"}
              {metric === "yield" && "Najvyšší výnos"}
              {metric === "properties" && "Najviac ponúk"}
            </h3>
            <div className="space-y-3">
              {[...cities]
                .sort((a, b) => {
                  if (metric === "price") return b.avgPrice - a.avgPrice;
                  if (metric === "yield") return b.avgYield - a.avgYield;
                  return b.properties - a.properties;
                })
                .slice(0, 5)
                .map((city, idx) => (
                  <div
                    key={city.slug}
                    className="flex items-center gap-3 cursor-pointer hover:bg-zinc-800/50 p-2 rounded-lg transition-colors"
                    onClick={() => setSelectedCity(city)}
                  >
                    <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-sm font-bold text-zinc-300">
                      {idx + 1}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-zinc-100">{city.name}</div>
                    </div>
                    <div className="text-right">
                      {metric === "price" && (
                        <span className="font-bold text-zinc-100">€{city.avgPrice.toLocaleString()}</span>
                      )}
                      {metric === "yield" && (
                        <span className="font-bold text-emerald-400">{city.avgYield.toFixed(1)}%</span>
                      )}
                      {metric === "properties" && (
                        <span className="font-bold text-blue-400">{city.properties}</span>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
