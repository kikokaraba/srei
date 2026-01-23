"use client";

import { Home, MapPin, Euro, TrendingUp } from "lucide-react";

// Mock data for recent properties
const mockProperties = [
  {
    id: "1",
    title: "2-room apartment in Staré Mesto",
    city: "BRATISLAVA",
    district: "Staré Mesto",
    price: 185000,
    area_m2: 58,
    price_per_m2: 3190,
    yield: 4.8,
    rooms: 2,
  },
  {
    id: "2",
    title: "3-room apartment near city center",
    city: "KOSICE",
    district: "Košice I",
    price: 125000,
    area_m2: 72,
    price_per_m2: 1736,
    yield: 5.5,
    rooms: 3,
  },
  {
    id: "3",
    title: "1-room studio, renovated",
    city: "NITRA",
    district: "Nitra",
    price: 68000,
    area_m2: 35,
    price_per_m2: 1943,
    yield: 6.2,
    rooms: 1,
  },
];

export function RecentProperties() {
  return (
    <div className="bg-slate-900 rounded-lg border border-slate-800 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Home className="w-5 h-5 text-emerald-400" />
          <h2 className="text-xl font-bold text-slate-100">Recent Properties</h2>
        </div>
        <button className="text-sm text-emerald-400 hover:text-emerald-300 transition-colors">
          View All →
        </button>
      </div>

      <div className="space-y-4">
        {mockProperties.map((property) => (
          <div
            key={property.id}
            className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50 hover:border-emerald-500/30 transition-colors cursor-pointer"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-semibold text-slate-100 mb-2">
                  {property.title}
                </h3>
                <div className="flex items-center gap-4 text-sm text-slate-400 mb-3">
                  <div className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    <span>{property.district}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Home className="w-4 h-4" />
                    <span>{property.rooms} rooms</span>
                  </div>
                  <span>{property.area_m2} m²</span>
                </div>
                <div className="flex items-center gap-4">
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Price</p>
                    <p className="text-lg font-bold text-slate-100">
                      €{property.price.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Price/m²</p>
                    <p className="text-sm font-medium text-slate-200">
                      €{property.price_per_m2.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Yield</p>
                    <div className="flex items-center gap-1">
                      <TrendingUp className="w-4 h-4 text-emerald-400" />
                      <p className="text-sm font-bold text-emerald-400">
                        {property.yield}%
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
