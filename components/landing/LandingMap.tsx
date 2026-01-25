"use client";

import { useState, useEffect } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  MapPin,
  Flame,
  ChevronRight,
  BarChart3,
  Sparkles,
  Loader2,
} from "lucide-react";
import Link from "next/link";

// Fix Leaflet icons
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: () => string })._getIconUrl;

interface CityData {
  name: string;
  lat: number;
  lng: number;
  properties: number;
  avgPrice: number;
  hotDeals: number;
}

interface TotalsData {
  properties: number;
  hotDeals: number;
  cities: number;
}

// Calculate bubble size based on property count
const getBubbleRadius = (properties: number, maxProps: number) => {
  const min = 12;
  const max = 35;
  if (maxProps === 0) return min;
  return min + (properties / maxProps) * (max - min);
};

// Get color based on property count (as a proxy for score)
const getScoreColor = (properties: number, maxProps: number) => {
  const ratio = maxProps > 0 ? properties / maxProps : 0;
  if (ratio >= 0.5) return "#10b981"; // emerald - high
  if (ratio >= 0.2) return "#f59e0b"; // amber - medium
  return "#6b7280"; // gray - low
};

export function LandingMap() {
  const [hoveredCity, setHoveredCity] = useState<string | null>(null);
  const [cities, setCities] = useState<CityData[]>([]);
  const [totals, setTotals] = useState<TotalsData>({ properties: 0, hotDeals: 0, cities: 0 });
  const [loading, setLoading] = useState(true);
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch("/api/public/cities");
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data) {
            setCities(data.data.cities || []);
            setTotals(data.data.totals || { properties: 0, hotDeals: 0, cities: 0 });
            setIsLive(data.live);
          }
        }
      } catch (error) {
        console.error("Error fetching city stats:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const maxProps = Math.max(...cities.map(c => c.properties), 1);

  return (
    <section id="map" className="py-16 sm:py-24 bg-gradient-to-b from-slate-950 to-slate-900 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-grid-slate-800/[0.05] bg-[size:40px_40px]" />
      
      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        {/* Header */}
        <div className="text-center mb-10 sm:mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-emerald-500/20 text-emerald-400 text-sm font-medium mb-6">
            <MapPin className="w-4 h-4" />
            <span>Interaktívna mapa</span>
            {isLive && (
              <span className="flex items-center gap-1 ml-2 text-xs">
                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                Live
              </span>
            )}
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
            Celé{" "}
            <span className="text-emerald-400">Slovensko</span>
            {" "}na dosah
          </h2>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            {totals.cities > 0 
              ? `Sledujte ceny a investičné príležitosti v ${totals.cities} slovenských mestách`
              : "Sledujte ceny a investičné príležitosti po celom Slovensku"
            }
          </p>
        </div>

        {/* Stats bar */}
        <div className="flex flex-wrap justify-center gap-6 sm:gap-10 mb-8">
          <div className="text-center">
            <div className="text-2xl sm:text-3xl font-bold text-white">
              {loading ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : totals.properties.toLocaleString()}
            </div>
            <div className="text-sm text-slate-400">Nehnuteľností</div>
          </div>
          <div className="text-center">
            <div className="text-2xl sm:text-3xl font-bold text-red-400">
              {loading ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : totals.hotDeals}
            </div>
            <div className="text-sm text-slate-400">Hot Deals</div>
          </div>
          <div className="text-center">
            <div className="text-2xl sm:text-3xl font-bold text-emerald-400">
              {loading ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : totals.cities}
            </div>
            <div className="text-sm text-slate-400">Miest</div>
          </div>
        </div>

        {/* Map container */}
        <div className="relative rounded-2xl overflow-hidden border border-slate-800 shadow-2xl">
          <div className="h-[400px] sm:h-[500px] lg:h-[550px]">
            <MapContainer
              center={[48.7, 19.5]}
              zoom={7}
              className="h-full w-full"
              zoomControl={false}
              scrollWheelZoom={false}
              style={{ background: "#f8fafc" }}
            >
              {/* Light tile layer */}
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              />

              {/* City bubbles */}
              {cities.map((city) => (
                <CircleMarker
                  key={city.name}
                  center={[city.lat, city.lng]}
                  radius={getBubbleRadius(city.properties, maxProps)}
                  pathOptions={{
                    color: getScoreColor(city.properties, maxProps),
                    fillColor: getScoreColor(city.properties, maxProps),
                    fillOpacity: hoveredCity === city.name ? 0.9 : 0.7,
                    weight: hoveredCity === city.name ? 3 : 2,
                  }}
                  eventHandlers={{
                    mouseover: () => setHoveredCity(city.name),
                    mouseout: () => setHoveredCity(null),
                  }}
                >
                  <Popup>
                    <div className="p-3 min-w-[180px]">
                      <h3 className="font-bold text-slate-900 text-lg mb-3">{city.name}</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-600">Cena/m²:</span>
                          <span className="font-semibold">€{city.avgPrice.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Ponuky:</span>
                          <span className="font-semibold">{city.properties}</span>
                        </div>
                        {city.hotDeals > 0 && (
                          <div className="flex justify-between pt-1 border-t">
                            <span className="text-red-600 flex items-center gap-1">
                              <Flame className="w-3 h-3" />
                              Hot Deals:
                            </span>
                            <span className="font-bold text-red-600">{city.hotDeals}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </Popup>
                </CircleMarker>
              ))}
            </MapContainer>
          </div>

          {/* Empty state overlay */}
          {!loading && cities.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 z-[1000]">
              <div className="text-center p-6">
                <MapPin className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400 mb-4">Zatiaľ nemáme dáta z trhu</p>
                <Link
                  href="/auth/signin"
                  className="inline-flex items-center gap-2 px-5 py-3 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold rounded-xl"
                >
                  Začať zbierať dáta
                </Link>
              </div>
            </div>
          )}

          {/* CTA overlay */}
          {cities.length > 0 && (
            <div className="absolute bottom-4 right-4 z-[1000]">
              <Link
                href="/auth/signin"
                className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 transition-all hover:scale-105"
              >
                <BarChart3 className="w-4 h-4" />
                Otvoriť detailnú mapu
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          )}
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-10">
          <p className="text-slate-400 mb-4">
            Získajte prístup k <span className="text-emerald-400 font-semibold">AI predikciam</span>, 
            <span className="text-gold-400 font-semibold"> hot deals</span> a 
            <span className="text-white font-semibold"> investorským nástrojom</span>
          </p>
          <Link
            href="/auth/signin"
            className="inline-flex items-center gap-2 px-8 py-4 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl border border-slate-700 hover:border-emerald-500/50 transition-all"
          >
            <Sparkles className="w-5 h-5 text-emerald-400" />
            Začať 14 dní zadarmo
          </Link>
        </div>
      </div>
    </section>
  );
}
