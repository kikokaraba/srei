"use client";

import { useEffect, useState, useCallback } from "react";
import { Home, MapPin, TrendingUp, Loader2 } from "lucide-react";

interface Property {
  id: string;
  title: string;
  city: string;
  district: string;
  price: number;
  area_m2: number;
  price_per_m2: number;
  rooms: number | null;
  investmentMetrics?: {
    gross_yield: number;
  } | null;
}

// Fallback data ak databáza nemá dáta
const fallbackProperties: Property[] = [
  {
    id: "1",
    title: "2-izbový byt v Starom Meste",
    city: "BRATISLAVA",
    district: "Staré Mesto",
    price: 185000,
    area_m2: 58,
    price_per_m2: 3190,
    rooms: 2,
    investmentMetrics: { gross_yield: 4.8 },
  },
  {
    id: "2",
    title: "3-izbový byt blízko centra",
    city: "KOSICE",
    district: "Košice I",
    price: 125000,
    area_m2: 72,
    price_per_m2: 1736,
    rooms: 3,
    investmentMetrics: { gross_yield: 5.5 },
  },
  {
    id: "3",
    title: "1-izbové štúdio, zrekonštruované",
    city: "NITRA",
    district: "Nitra",
    price: 68000,
    area_m2: 35,
    price_per_m2: 1943,
    rooms: 1,
    investmentMetrics: { gross_yield: 6.2 },
  },
];

export function RecentProperties() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProperties = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/v1/properties/filtered?sortBy=createdAt&sortOrder=desc&limit=3");
      
      if (!response.ok) {
        if (response.status === 401) {
          // Používateľ nie je prihlásený - použijeme fallback
          setProperties(fallbackProperties);
          return;
        }
        throw new Error("Failed to fetch properties");
      }
      
      const data = await response.json();
      
      if (data.data && data.data.length > 0) {
        setProperties(data.data);
      } else {
        // Ak nemáme dáta, použijeme fallback
        setProperties(fallbackProperties);
      }
    } catch (error) {
      console.error("Error fetching properties:", error);
      setProperties(fallbackProperties);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProperties();
  }, [fetchProperties]);

  if (loading) {
    return (
      <div className="bg-slate-900 rounded-lg border border-slate-800 p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 rounded-lg border border-slate-800 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Home className="w-5 h-5 text-emerald-400" />
          <h2 className="text-xl font-bold text-slate-100">Nedávne nehnuteľnosti</h2>
        </div>
        <button className="text-sm text-emerald-400 hover:text-emerald-300 transition-colors">
          Zobraziť všetko →
        </button>
      </div>

      <div className="space-y-4">
        {properties.map((property) => (
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
                  {property.rooms && (
                    <div className="flex items-center gap-1">
                      <Home className="w-4 h-4" />
                      <span>{property.rooms} {property.rooms === 1 ? "izba" : property.rooms < 5 ? "izby" : "izieb"}</span>
                    </div>
                  )}
                  <span>{property.area_m2} m²</span>
                </div>
                <div className="flex items-center gap-4">
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Cena</p>
                    <p className="text-lg font-bold text-slate-100">
                      €{property.price.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Cena/m²</p>
                    <p className="text-sm font-medium text-slate-200">
                      €{property.price_per_m2.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Výnos</p>
                    <div className="flex items-center gap-1">
                      <TrendingUp className="w-4 h-4 text-emerald-400" />
                      <p className="text-sm font-bold text-emerald-400">
                        {property.investmentMetrics?.gross_yield?.toFixed(1) || "N/A"}%
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
