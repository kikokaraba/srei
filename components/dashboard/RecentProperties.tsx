"use client";

import { useEffect, useState, useCallback } from "react";
import { Home, MapPin, TrendingUp, Loader2, Bookmark, BookmarkCheck, Settings } from "lucide-react";
import Link from "next/link";
import { useUserPreferences } from "@/lib/hooks/useUserPreferences";

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


export function RecentProperties() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [savingId, setSavingId] = useState<string | null>(null);
  const { preferences, hasLocationPreferences } = useUserPreferences();

  const fetchSavedProperties = useCallback(async () => {
    try {
      const response = await fetch("/api/v1/saved-properties");
      if (response.ok) {
        const data = await response.json();
        const ids = new Set<string>(data.data?.map((s: { propertyId: string }) => s.propertyId) || []);
        setSavedIds(ids);
      }
    } catch (error) {
      console.error("Error fetching saved properties:", error);
    }
  }, []);

  const toggleSave = async (propertyId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSavingId(propertyId);
    try {
      if (savedIds.has(propertyId)) {
        await fetch(`/api/v1/saved-properties?propertyId=${propertyId}`, {
          method: "DELETE",
        });
        setSavedIds((prev) => {
          const next = new Set(prev);
          next.delete(propertyId);
          return next;
        });
      } else {
        await fetch("/api/v1/saved-properties", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ propertyId }),
        });
        setSavedIds((prev) => new Set(prev).add(propertyId));
      }
    } catch (error) {
      console.error("Error toggling save:", error);
    } finally {
      setSavingId(null);
    }
  };

  const fetchProperties = useCallback(async () => {
    try {
      setLoading(true);
      
      // Pridaj filtre podľa preferencií
      const params = new URLSearchParams({
        propertyType: "BYT",
        sortBy: "createdAt",
        sortOrder: "desc",
        limit: "3",
      });
      
      // Použi usePreferences=true aby API aplikovalo všetky uložené preferencie
      if (hasLocationPreferences) {
        params.set("usePreferences", "true");
      }
      
      const response = await fetch(`/api/v1/properties/filtered?${params}`);
      
      if (!response.ok) {
        if (response.status === 401) {
          // Používateľ nie je prihlásený
          setProperties([]);
          return;
        }
        throw new Error("Failed to fetch properties");
      }
      
      const data = await response.json();
      setProperties(data.data || []);
    } catch (error) {
      console.error("Error fetching properties:", error);
      setProperties([]);
    } finally {
      setLoading(false);
    }
  }, [preferences]);

  useEffect(() => {
    fetchProperties();
    fetchSavedProperties();
  }, [fetchProperties, fetchSavedProperties]);

  if (loading) {
    return (
      <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Home className="w-5 h-5 text-emerald-400" />
          <h2 className="text-base font-semibold text-zinc-100">Nedávne nehnuteľnosti</h2>
        </div>
        <button className="text-sm text-emerald-400 hover:text-emerald-300 transition-colors">
          Zobraziť všetko →
        </button>
      </div>

      <div className="space-y-4">
        {properties.length === 0 ? (
          <div className="text-center py-8">
            <Home className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
            <p className="text-zinc-400 mb-2">Zatiaľ žiadne nehnuteľnosti</p>
            <p className="text-zinc-500 text-sm">
              Nastavte si lokality v{" "}
              <Link href="/dashboard/settings" className="text-emerald-400 hover:underline">
                nastaveniach
              </Link>
            </p>
          </div>
        ) : null}
        {properties.map((property) => {
          const isSaved = savedIds.has(property.id);
          const isSaving = savingId === property.id;
          
          return (
          <div
            key={property.id}
            className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700/50 hover:border-emerald-500/30 transition-colors cursor-pointer"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-zinc-100">
                    {property.title}
                  </h3>
                  <button
                    onClick={(e) => toggleSave(property.id, e)}
                    disabled={isSaving}
                    className={`p-2 rounded-lg transition-colors ${
                      isSaved
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "bg-zinc-700/50 text-zinc-400 hover:text-emerald-400"
                    }`}
                    title={isSaved ? "Odstrániť zo sledovaných" : "Pridať do sledovaných"}
                  >
                    {isSaving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : isSaved ? (
                      <BookmarkCheck className="w-4 h-4" />
                    ) : (
                      <Bookmark className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <div className="flex items-center gap-4 text-sm text-zinc-400 mb-3">
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
                    <p className="text-xs text-zinc-500 mb-1">Cena</p>
                    <p className="text-lg font-bold text-zinc-100">
                      €{property.price.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 mb-1">Cena/m²</p>
                    <p className="text-sm font-medium text-zinc-200">
                      €{property.price_per_m2.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 mb-1">Výnos</p>
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
        );
        })}
      </div>
    </div>
  );
}
