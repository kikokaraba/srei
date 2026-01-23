"use client";

import { useState } from "react";
import { MapPin, TrendingUp, Euro } from "lucide-react";

interface City {
  name: string;
  x: number; // Percentage from left
  y: number; // Percentage from top
  avgPrice: number;
  yield: number;
  properties: number;
}

const cities: City[] = [
  {
    name: "Bratislava",
    x: 15,
    y: 75,
    avgPrice: 3200,
    yield: 4.7,
    properties: 1247,
  },
  {
    name: "Košice",
    x: 85,
    y: 60,
    avgPrice: 1850,
    yield: 5.3,
    properties: 892,
  },
  {
    name: "Prešov",
    x: 80,
    y: 45,
    avgPrice: 1650,
    yield: 5.5,
    properties: 456,
  },
  {
    name: "Žilina",
    x: 35,
    y: 35,
    avgPrice: 1950,
    yield: 5.1,
    properties: 623,
  },
  {
    name: "Banská Bystrica",
    x: 50,
    y: 50,
    avgPrice: 1750,
    yield: 5.4,
    properties: 389,
  },
  {
    name: "Trnava",
    x: 25,
    y: 70,
    avgPrice: 2100,
    yield: 4.9,
    properties: 512,
  },
  {
    name: "Trenčín",
    x: 30,
    y: 55,
    avgPrice: 1900,
    yield: 5.2,
    properties: 445,
  },
  {
    name: "Nitra",
    x: 30,
    y: 80,
    avgPrice: 1650,
    yield: 5.7,
    properties: 456,
  },
];

export function SlovakiaMap() {
  const [selectedCity, setSelectedCity] = useState<City | null>(null);

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
              {cities.map((city, index) => (
                <g key={index}>
                  <circle
                    cx={`${city.x}%`}
                    cy={`${city.y}%`}
                    r="8"
                    fill="#10b981"
                    className="cursor-pointer hover:fill-emerald-300 transition-all"
                    onClick={() => setSelectedCity(city)}
                    style={{ filter: "drop-shadow(0 0 8px rgba(16, 185, 129, 0.5))" }}
                  />
                  <circle
                    cx={`${city.x}%`}
                    cy={`${city.y}%`}
                    r="12"
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="2"
                    opacity="0.3"
                    className="animate-pulse"
                  />
                  <text
                    x={`${city.x}%`}
                    y={`${city.y - 15}%`}
                    textAnchor="middle"
                    className="text-xs fill-slate-300 font-semibold pointer-events-none"
                  >
                    {city.name}
                  </text>
                </g>
              ))}
            </svg>
          </div>

          {/* City Info Panel */}
          {selectedCity && (
            <div className="absolute top-4 right-4 bg-slate-900 border border-emerald-500/20 rounded-lg p-6 shadow-2xl max-w-sm z-20 animate-in fade-in slide-in-from-right">
              <button
                onClick={() => setSelectedCity(null)}
                className="absolute top-2 right-2 text-slate-400 hover:text-slate-100"
              >
                ×
              </button>
              <h3 className="text-2xl font-bold text-slate-100 mb-4 flex items-center gap-2">
                <MapPin className="w-6 h-6 text-emerald-400" />
                {selectedCity.name}
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Euro className="w-4 h-4 text-slate-400" />
                    <span className="text-sm text-slate-400">Priem. cena/m²</span>
                  </div>
                  <span className="text-lg font-bold text-slate-100">
                    €{selectedCity.avgPrice.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                    <span className="text-sm text-slate-400">Výnos</span>
                  </div>
                  <span className="text-lg font-bold text-emerald-400">
                    {selectedCity.yield}%
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                  <span className="text-sm text-slate-400">Nehnuteľností</span>
                  <span className="text-lg font-bold text-slate-100">
                    {selectedCity.properties.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* City List */}
          <div className="mt-8 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
            {cities.map((city, index) => (
              <button
                key={index}
                onClick={() => setSelectedCity(city)}
                className={`p-4 rounded-lg border transition-all text-left ${
                  selectedCity?.name === city.name
                    ? "bg-emerald-500/10 border-emerald-500/50"
                    : "bg-slate-800/50 border-slate-700/50 hover:border-emerald-500/30"
                }`}
              >
                <div className="text-sm font-semibold text-slate-100 mb-1">
                  {city.name}
                </div>
                <div className="text-xs text-emerald-400 font-medium">
                  {city.yield}% výnos
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
