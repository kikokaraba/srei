"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Home,
  Euro,
  BarChart3,
  Filter,
  Loader2,
  MapPin,
  LayoutGrid,
  Ruler,
  Key,
} from "lucide-react";

interface RentSummary {
  totalListings: number;
  avgRent: number | null;
  avgRentPerM2: number | null;
  avgArea: number | null;
  minRent: number | null;
  maxRent: number | null;
}

interface ByCityRow {
  city: string;
  count: number;
  avgRent: number;
  avgRentPerM2: number | null;
  avgArea: number | null;
  minRent: number | null;
  maxRent: number | null;
}

interface ByRoomsRow {
  rooms: number;
  count: number;
  avgRent: number;
  avgArea: number | null;
  minRent: number | null;
  maxRent: number | null;
}

interface ByAreaRow {
  range: string;
  rangeKey: number;
  count: number;
  avgRent: number | null;
}

interface RentStatsData {
  summary: RentSummary;
  byCity: ByCityRow[];
  byRooms: ByRoomsRow[];
  byAreaRange: ByAreaRow[];
}

const PROPERTY_TYPE_OPTIONS = [
  { value: "", label: "Všetky typy" },
  { value: "BYT", label: "Byty" },
  { value: "DOM", label: "Domy" },
  { value: "KOMERCNE", label: "Komerčné" },
];

const ROOMS_OPTIONS = [
  { value: "", label: "Všetky" },
  { value: "1", label: "1 izba" },
  { value: "2", label: "2 izby" },
  { value: "3", label: "3 izby" },
  { value: "4", label: "4+ izby" },
];

function buildParams(f: {
  city: string;
  district: string;
  rooms: string;
  propertyType: string;
  areaMin: string;
  areaMax: string;
}): URLSearchParams {
  const p = new URLSearchParams();
  if (f.city) p.set("city", f.city);
  if (f.district) p.set("district", f.district);
  if (f.rooms) p.set("rooms", f.rooms);
  if (f.propertyType) p.set("propertyType", f.propertyType);
  if (f.areaMin) p.set("areaMin", f.areaMin);
  if (f.areaMax) p.set("areaMax", f.areaMax);
  return p;
}

export function RentalDashboard() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<RentStatsData | null>(null);
  const [filters, setFilters] = useState({
    city: "",
    district: "",
    rooms: "",
    propertyType: "",
    areaMin: "",
    areaMax: "",
  });
  const [showFilters, setShowFilters] = useState(false);

  const fetchRentStats = useCallback(async () => {
    try {
      setLoading(true);
      const params = buildParams(filters);
      const url = `/api/v1/rent-stats${params.toString() ? `?${params.toString()}` : ""}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      if (!json.success || !json.data) throw new Error("Invalid response");
      setData(json.data);
    } catch (e) {
      console.error("Rent stats fetch error:", e);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [filters.city, filters.district, filters.rooms, filters.propertyType, filters.areaMin, filters.areaMax]);

  useEffect(() => {
    fetchRentStats();
  }, [fetchRentStats]);

  const applyFilter = useCallback(
    (key: keyof typeof filters, value: string) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const clearFilters = useCallback(() => {
    setFilters({
      city: "",
      district: "",
      rooms: "",
      propertyType: "",
      areaMin: "",
      areaMax: "",
    });
  }, []);

  const hasActiveFilters = Object.values(filters).some((v) => v.trim() !== "");

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
      </div>
    );
  }

  const summary = data?.summary;
  const byCity = data?.byCity ?? [];
  const byRooms = data?.byRooms ?? [];
  const byAreaRange = data?.byAreaRange ?? [];

  return (
    <div className="space-y-6">
      {/* Filtre */}
      <div className="premium-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-zinc-400" />
            <span className="text-sm font-medium text-zinc-300">Filtre</span>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="text-xs text-blue-400 hover:text-blue-300"
              >
                Zrušiť filtre
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className="text-sm text-zinc-400 hover:text-zinc-200"
          >
            {showFilters ? "Skryť" : "Zobraziť"} filtre
          </button>
        </div>

        {showFilters && (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-zinc-500 mb-1.5">
                Mesto
              </label>
              <input
                type="text"
                value={filters.city}
                onChange={(e) => applyFilter("city", e.target.value)}
                placeholder="napr. Bratislava"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-zinc-500 mb-1.5">
                Okres / časť
              </label>
              <input
                type="text"
                value={filters.district}
                onChange={(e) => applyFilter("district", e.target.value)}
                placeholder="napr. Staré Mesto"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-zinc-500 mb-1.5">
                Počet izieb
              </label>
              <select
                value={filters.rooms}
                onChange={(e) => applyFilter("rooms", e.target.value)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:border-blue-500 focus:outline-none"
              >
                {ROOMS_OPTIONS.map((o) => (
                  <option key={o.value || "all"} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-zinc-500 mb-1.5">
                Typ
              </label>
              <select
                value={filters.propertyType}
                onChange={(e) => applyFilter("propertyType", e.target.value)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:border-blue-500 focus:outline-none"
              >
                {PROPERTY_TYPE_OPTIONS.map((o) => (
                  <option key={o.value || "all"} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-zinc-500 mb-1.5">
                Plocha od (m²)
              </label>
              <input
                type="number"
                min={0}
                step={5}
                value={filters.areaMin}
                onChange={(e) => applyFilter("areaMin", e.target.value)}
                placeholder="min"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-zinc-500 mb-1.5">
                Plocha do (m²)
              </label>
              <input
                type="number"
                min={0}
                step={5}
                value={filters.areaMax}
                onChange={(e) => applyFilter("areaMax", e.target.value)}
                placeholder="max"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>
        )}
      </div>

      {!data && !loading ? (
        <div className="premium-card p-12 text-center">
          <Key className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
          <p className="text-zinc-400">Momentálne nie sú k dispozícii žiadne dáta o nájomoch.</p>
          <p className="text-zinc-500 text-sm mt-1">Skúste zmeniť alebo zrušiť filtre.</p>
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="premium-card p-4">
              <div className="flex items-center gap-2 text-zinc-400 mb-2">
                <Home className="w-4 h-4" />
                <span className="text-xs">Ponúk v prenájme</span>
              </div>
              <div className="text-xl font-semibold text-zinc-100">
                {summary?.totalListings ?? 0}
              </div>
            </div>
            <div className="premium-card p-4">
              <div className="flex items-center gap-2 text-zinc-400 mb-2">
                <Euro className="w-4 h-4" />
                <span className="text-xs">Priem. nájom / mesiac</span>
              </div>
              <div className="text-xl font-semibold text-blue-400">
                {summary?.avgRent != null ? `€${summary.avgRent.toLocaleString()}` : "–"}
              </div>
            </div>
            <div className="premium-card p-4">
              <div className="flex items-center gap-2 text-zinc-400 mb-2">
                <BarChart3 className="w-4 h-4" />
                <span className="text-xs">Priem. €/m²</span>
              </div>
              <div className="text-xl font-semibold text-zinc-100">
                {summary?.avgRentPerM2 != null ? `€${summary.avgRentPerM2}` : "–"}
              </div>
            </div>
            <div className="premium-card p-4">
              <div className="flex items-center gap-2 text-zinc-400 mb-2">
                <Ruler className="w-4 h-4" />
                <span className="text-xs">Priem. plocha</span>
              </div>
              <div className="text-xl font-semibold text-zinc-100">
                {summary?.avgArea != null ? `${summary.avgArea} m²` : "–"}
              </div>
            </div>
            <div className="premium-card p-4">
              <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-2">
                Min. nájom
              </div>
              <div className="text-lg font-semibold text-zinc-200">
                {summary?.minRent != null ? `€${summary.minRent.toLocaleString()}` : "–"}
              </div>
            </div>
            <div className="premium-card p-4">
              <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-2">
                Max. nájom
              </div>
              <div className="text-lg font-semibold text-zinc-200">
                {summary?.maxRent != null ? `€${summary.maxRent.toLocaleString()}` : "–"}
              </div>
            </div>
          </div>

          {/* Podľa miest */}
          <div className="premium-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="w-5 h-5 text-blue-400" />
              <h3 className="text-lg font-bold text-zinc-100">Priemerný nájom podľa miest</h3>
            </div>
            {byCity.length === 0 ? (
              <p className="text-zinc-500 text-sm">Žiadne dáta pre zvolené filtre.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-zinc-500 border-b border-zinc-800">
                      <th className="pb-2 pr-4 font-medium">Mesto</th>
                      <th className="pb-2 pr-4 font-medium text-right">Ponúk</th>
                      <th className="pb-2 pr-4 font-medium text-right">Priem. nájom</th>
                      <th className="pb-2 pr-4 font-medium text-right">€/m²</th>
                      <th className="pb-2 font-medium text-right">Rozsah</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byCity.map((row) => (
                      <tr key={row.city} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                        <td className="py-3 pr-4 font-medium text-zinc-100">{row.city}</td>
                        <td className="py-3 pr-4 text-right text-zinc-400">{row.count}</td>
                        <td className="py-3 pr-4 text-right text-blue-400 font-medium">
                          €{row.avgRent.toLocaleString()}
                        </td>
                        <td className="py-3 pr-4 text-right text-zinc-300">
                          {row.avgRentPerM2 != null ? `€${row.avgRentPerM2}` : "–"}
                        </td>
                        <td className="py-3 text-right text-zinc-500 text-xs">
                          {row.minRent != null && row.maxRent != null
                            ? `€${row.minRent.toLocaleString()} – €${row.maxRent.toLocaleString()}`
                            : "–"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Podľa izieb */}
            <div className="premium-card p-5">
              <div className="flex items-center gap-2 mb-4">
                <LayoutGrid className="w-5 h-5 text-blue-400" />
                <h3 className="text-lg font-bold text-zinc-100">Priemerný nájom podľa izieb</h3>
              </div>
              {byRooms.length === 0 ? (
                <p className="text-zinc-500 text-sm">Žiadne dáta pre zvolené filtre.</p>
              ) : (
                <div className="space-y-3">
                  {byRooms.map((row) => (
                    <div
                      key={row.rooms}
                      className="flex items-center justify-between py-2 border-b border-zinc-800/50 last:border-0"
                    >
                      <span className="font-medium text-zinc-200">
                        {row.rooms} {row.rooms === 1 ? "izba" : "izby"}
                      </span>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-zinc-400">{row.count} ponúk</span>
                        <span className="text-blue-400 font-medium">
                          €{row.avgRent.toLocaleString()}
                        </span>
                        {row.avgArea != null && (
                          <span className="text-zinc-500">~{row.avgArea} m²</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Podľa plochy */}
            <div className="premium-card p-5">
              <div className="flex items-center gap-2 mb-4">
                <Ruler className="w-5 h-5 text-blue-400" />
                <h3 className="text-lg font-bold text-zinc-100">Priemerný nájom podľa plochy</h3>
              </div>
              {byAreaRange.every((r) => r.count === 0) ? (
                <p className="text-zinc-500 text-sm">Žiadne dáta pre zvolené filtre.</p>
              ) : (
                <div className="space-y-3">
                  {byAreaRange.map((row) => (
                    <div
                      key={row.rangeKey}
                      className="flex items-center justify-between py-2 border-b border-zinc-800/50 last:border-0"
                    >
                      <span className="font-medium text-zinc-200">{row.range}</span>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-zinc-400">{row.count} ponúk</span>
                        <span className="text-blue-400 font-medium">
                          {row.avgRent != null ? `€${row.avgRent.toLocaleString()}` : "–"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
