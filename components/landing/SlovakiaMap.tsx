"use client";

import { useState, useCallback, useMemo } from "react";
import { MapPin, TrendingUp, Euro, X } from "lucide-react";
import { SLOVAK_CITIES, type CityData } from "@/lib/constants/cities";

export function SlovakiaMap() {
  const [selectedCity, setSelectedCity] = useState<CityData | null>(null);

  const handleCitySelect = useCallback((city: CityData) => {
    setSelectedCity(city);
  }, []);

  const handleCityDeselect = useCallback(() => {
    setSelectedCity(null);
  }, []);

  const sortedCitiesByYield = useMemo(
    () => [...SLOVAK_CITIES].sort((a, b) => b.metrics.yield - a.metrics.yield),
    []
  );

  return (
    <section className="py-24 bg-gradient-to-b from-slate-950 to-slate-900">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl lg:text-5xl font-bold text-slate-100 mb-4">
            Investičné príležitosti
            <span className="block text-emerald-400">naprieč Slovenskom</span>
          </h2>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            Interaktívna mapa zobrazujúca investičnú atraktivitu a výnosy v
            hlavných slovenských mestách
          </p>
        </div>

        <div className="relative max-w-6xl mx-auto">
          {/* SVG Map of Slovakia */}
          <div className="relative bg-slate-900 rounded-2xl border border-slate-800 p-8 lg:p-16 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-950/10 via-transparent to-gold-950/10" />
            
            <svg
              viewBox="0 0 400 300"
              className="w-full h-auto relative z-10"
              style={{ minHeight: "400px" }}
            >
              {/* More accurate Slovakia shape */}
              <path
                d="M 80 60 
                   L 120 50 
                   L 160 55 
                   L 200 65 
                   L 240 80 
                   L 280 95 
                   L 310 110 
                   L 330 135 
                   L 340 165 
                   L 335 195 
                   L 320 225 
                   L 290 250 
                   L 250 265 
                   L 200 270 
                   L 150 265 
                   L 110 250 
                   L 85 225 
                   L 70 195 
                   L 65 165 
                   L 70 135 
                   L 75 110 
                   Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="text-slate-700"
              />
              <path
                d="M 80 60 
                   L 120 50 
                   L 160 55 
                   L 200 65 
                   L 240 80 
                   L 280 95 
                   L 310 110 
                   L 330 135 
                   L 340 165 
                   L 335 195 
                   L 320 225 
                   L 290 250 
                   L 250 265 
                   L 200 270 
                   L 150 265 
                   L 110 250 
                   L 85 225 
                   L 70 195 
                   L 65 165 
                   L 70 135 
                   L 75 110 
                   Z"
                fill="url(#slovakiaGradient)"
                opacity="0.15"
              />
              
              <defs>
                <linearGradient id="slovakiaGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#10b981" />
                  <stop offset="100%" stopColor="#f59e0b" />
                </linearGradient>
              </defs>

              {/* City markers */}
              {SLOVAK_CITIES.map((city) => (
                <g key={city.slug}>
                  <circle
                    cx={`${city.coordinates.x}%`}
                    cy={`${city.coordinates.y}%`}
                    r="8"
                    fill="#10b981"
                    className="cursor-pointer hover:fill-emerald-300 transition-all focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-slate-900"
                    onClick={() => handleCitySelect(city)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleCitySelect(city);
                      }
                    }}
                    tabIndex={0}
                    role="button"
                    aria-label={`Vybrať mesto ${city.name}`}
                    style={{ filter: "drop-shadow(0 0 8px rgba(16, 185, 129, 0.5))" }}
                  />
                  <circle
                    cx={`${city.coordinates.x}%`}
                    cy={`${city.coordinates.y}%`}
                    r="12"
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="2"
                    opacity="0.3"
                    className="animate-pulse"
                    aria-hidden="true"
                  />
                  <text
                    x={`${city.coordinates.x}%`}
                    y={`${city.coordinates.y - 15}%`}
                    textAnchor="middle"
                    className="text-xs fill-slate-300 font-semibold pointer-events-none"
                    aria-hidden="true"
                  >
                    {city.name}
                  </text>
                </g>
              ))}
            </svg>
          </div>

          {/* City Info Panel */}
          {selectedCity && (
            <div
              className="absolute top-4 right-4 bg-slate-900 border border-emerald-500/20 rounded-lg p-6 shadow-2xl max-w-sm z-20 animate-in fade-in slide-in-from-right"
              role="dialog"
              aria-modal="true"
              aria-labelledby="city-info-title"
            >
              <button
                onClick={handleCityDeselect}
                onKeyDown={(e) => {
                  if (e.key === "Escape") handleCityDeselect();
                }}
                className="absolute top-2 right-2 text-slate-400 hover:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-400 rounded p-1"
                aria-label="Zavrieť panel"
              >
                <X className="w-5 h-5" />
              </button>
              <h3
                id="city-info-title"
                className="text-2xl font-bold text-slate-100 mb-4 flex items-center gap-2"
              >
                <MapPin className="w-6 h-6 text-emerald-400" aria-hidden="true" />
                {selectedCity.name}
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Euro className="w-4 h-4 text-slate-400" aria-hidden="true" />
                    <span className="text-sm text-slate-400">Priem. cena/m²</span>
                  </div>
                  <span className="text-lg font-bold text-slate-100">
                    €{selectedCity.metrics.avgPrice.toLocaleString("sk-SK")}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-400" aria-hidden="true" />
                    <span className="text-sm text-slate-400">Výnos</span>
                  </div>
                  <span className="text-lg font-bold text-emerald-400">
                    {selectedCity.metrics.yield}%
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                  <span className="text-sm text-slate-400">Nehnuteľností</span>
                  <span className="text-lg font-bold text-slate-100">
                    {selectedCity.metrics.properties.toLocaleString("sk-SK")}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* City List */}
          <div
            className="mt-8 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4"
            role="list"
            aria-label="Zoznam slovenských miest"
          >
            {sortedCitiesByYield.map((city) => (
              <button
                key={city.slug}
                onClick={() => handleCitySelect(city)}
                className={`p-4 rounded-lg border transition-all text-left focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-slate-900 ${
                  selectedCity?.slug === city.slug
                    ? "bg-emerald-500/10 border-emerald-500/50"
                    : "bg-slate-800/50 border-slate-700/50 hover:border-emerald-500/30"
                }`}
                aria-pressed={selectedCity?.slug === city.slug}
                aria-label={`${city.name}, výnos ${city.metrics.yield}%`}
              >
                <div className="text-sm font-semibold text-slate-100 mb-1">
                  {city.name}
                </div>
                <div className="text-xs text-emerald-400 font-medium">
                  {city.metrics.yield}% výnos
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
