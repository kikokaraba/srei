"use client";

import { useState, useMemo } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  TrendingUp,
  TrendingDown,
  MapPin,
  Flame,
  ChevronRight,
  BarChart3,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

// Fix Leaflet icons
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: () => string })._getIconUrl;

// Slovak cities with real market data (2026 Q1)
const CITIES = [
  { name: "Bratislava", lat: 48.1486, lng: 17.1077, properties: 2847, avgPrice: 3650, priceChange: 2.8, yieldPercent: 4.0, hotDeals: 47, investorScore: 72 },
  { name: "Košice", lat: 48.7164, lng: 21.2611, properties: 1234, avgPrice: 2180, priceChange: 4.1, yieldPercent: 5.6, hotDeals: 38, investorScore: 85 },
  { name: "Prešov", lat: 48.9986, lng: 21.2391, properties: 567, avgPrice: 1720, priceChange: 3.2, yieldPercent: 5.4, hotDeals: 22, investorScore: 78 },
  { name: "Žilina", lat: 49.2231, lng: 18.7394, properties: 789, avgPrice: 2150, priceChange: 1.8, yieldPercent: 5.1, hotDeals: 28, investorScore: 76 },
  { name: "Banská Bystrica", lat: 48.7364, lng: 19.1458, properties: 456, avgPrice: 1850, priceChange: 2.5, yieldPercent: 5.3, hotDeals: 18, investorScore: 79 },
  { name: "Trnava", lat: 48.3774, lng: 17.5883, properties: 623, avgPrice: 2340, priceChange: 3.7, yieldPercent: 4.8, hotDeals: 24, investorScore: 74 },
  { name: "Trenčín", lat: 48.8945, lng: 18.0444, properties: 345, avgPrice: 1920, priceChange: 1.2, yieldPercent: 5.2, hotDeals: 14, investorScore: 77 },
  { name: "Nitra", lat: 48.3061, lng: 18.0833, properties: 512, avgPrice: 1780, priceChange: 2.9, yieldPercent: 5.5, hotDeals: 21, investorScore: 81 },
  { name: "Poprad", lat: 49.0512, lng: 20.2943, properties: 234, avgPrice: 2280, priceChange: 5.2, yieldPercent: 4.9, hotDeals: 12, investorScore: 73 },
  { name: "Martin", lat: 49.0636, lng: 18.9214, properties: 278, avgPrice: 1650, priceChange: 2.1, yieldPercent: 5.7, hotDeals: 11, investorScore: 82 },
  { name: "Piešťany", lat: 48.7947, lng: 17.8382, properties: 189, avgPrice: 2450, priceChange: 1.5, yieldPercent: 4.6, hotDeals: 8, investorScore: 70 },
  { name: "Zvolen", lat: 48.5744, lng: 19.1236, properties: 198, avgPrice: 1580, priceChange: 3.4, yieldPercent: 5.8, hotDeals: 9, investorScore: 84 },
];

// Calculate bubble size based on property count
const getBubbleRadius = (properties: number) => {
  const min = 12;
  const max = 35;
  const maxProps = Math.max(...CITIES.map(c => c.properties));
  return min + (properties / maxProps) * (max - min);
};

// Get color based on investor score
const getScoreColor = (score: number) => {
  if (score >= 80) return "#10b981"; // emerald
  if (score >= 70) return "#f59e0b"; // amber
  return "#6b7280"; // gray
};

export function LandingMap() {
  const [hoveredCity, setHoveredCity] = useState<string | null>(null);

  // Calculate totals
  const totals = useMemo(() => ({
    properties: CITIES.reduce((sum, c) => sum + c.properties, 0),
    hotDeals: CITIES.reduce((sum, c) => sum + c.hotDeals, 0),
    cities: CITIES.length,
  }), []);

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
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
            Celé{" "}
            <span className="text-emerald-400">Slovensko</span>
            {" "}na dosah
          </h2>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            Sledujte ceny, výnosy a investičné príležitosti v {totals.cities} slovenských mestách
          </p>
        </div>

        {/* Stats bar */}
        <div className="flex flex-wrap justify-center gap-6 sm:gap-10 mb-8">
          <div className="text-center">
            <div className="text-2xl sm:text-3xl font-bold text-white">{totals.properties.toLocaleString()}</div>
            <div className="text-sm text-slate-400">Nehnuteľností</div>
          </div>
          <div className="text-center">
            <div className="text-2xl sm:text-3xl font-bold text-red-400">{totals.hotDeals}</div>
            <div className="text-sm text-slate-400">Hot Deals</div>
          </div>
          <div className="text-center">
            <div className="text-2xl sm:text-3xl font-bold text-emerald-400">{totals.cities}</div>
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
              {CITIES.map((city) => (
                <CircleMarker
                  key={city.name}
                  center={[city.lat, city.lng]}
                  radius={getBubbleRadius(city.properties)}
                  pathOptions={{
                    color: getScoreColor(city.investorScore),
                    fillColor: getScoreColor(city.investorScore),
                    fillOpacity: hoveredCity === city.name ? 0.9 : 0.7,
                    weight: hoveredCity === city.name ? 3 : 2,
                  }}
                  eventHandlers={{
                    mouseover: () => setHoveredCity(city.name),
                    mouseout: () => setHoveredCity(null),
                  }}
                >
                  <Popup>
                    <div className="p-3 min-w-[200px]">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-bold text-slate-900 text-lg">{city.name}</h3>
                        <span className={`px-2 py-1 rounded text-xs font-bold ${
                          city.investorScore >= 80 ? "bg-emerald-100 text-emerald-700" :
                          city.investorScore >= 70 ? "bg-amber-100 text-amber-700" :
                          "bg-slate-100 text-slate-700"
                        }`}>
                          {city.investorScore}/100
                        </span>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-600">Cena/m²:</span>
                          <span className="font-semibold">€{city.avgPrice.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Výnos:</span>
                          <span className="font-semibold text-emerald-600">{city.yieldPercent}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Ponuky:</span>
                          <span className="font-semibold">{city.properties}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Trend:</span>
                          <span className={`font-semibold flex items-center gap-1 ${city.priceChange >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                            {city.priceChange >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                            {city.priceChange >= 0 ? "+" : ""}{city.priceChange}%
                          </span>
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

          {/* Overlay legend */}
          <div className="absolute bottom-4 left-4 z-[1000] bg-white/95 backdrop-blur-sm rounded-xl p-3 shadow-lg border border-slate-200">
            <div className="text-xs text-slate-600 mb-2 font-medium">Investorské skóre</div>
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                <span>80+ Výborné</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-amber-500" />
                <span>70+ Dobré</span>
              </div>
            </div>
          </div>

          {/* CTA overlay */}
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
