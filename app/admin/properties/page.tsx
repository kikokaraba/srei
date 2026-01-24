"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Building,
  Search,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Trash2,
  ExternalLink,
  MapPin,
  TrendingUp,
  Bookmark,
  History,
} from "lucide-react";

interface PropertyData {
  id: string;
  slug: string;
  title: string;
  city: string;
  district: string;
  address: string;
  price: number;
  area_m2: number;
  price_per_m2: number;
  rooms: number | null;
  condition: string;
  source_url: string | null;
  days_on_market: number;
  createdAt: string;
  investmentMetrics: {
    gross_yield: number;
  } | null;
  _count: {
    savedBy: number;
    priceHistory: number;
  };
}

const CITY_LABELS: Record<string, string> = {
  BRATISLAVA: "Bratislava",
  KOSICE: "Košice",
  PRESOV: "Prešov",
  ZILINA: "Žilina",
  BANSKA_BYSTRICA: "B. Bystrica",
  TRNAVA: "Trnava",
  TRENCIN: "Trenčín",
  NITRA: "Nitra",
};

const CITIES = Object.keys(CITY_LABELS);

export default function AdminPropertiesPage() {
  const [properties, setProperties] = useState<PropertyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const fetchProperties = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: page.toString(),
      limit: "20",
    });
    if (search) params.append("search", search);
    if (cityFilter) params.append("city", cityFilter);

    try {
      const res = await fetch(`/api/v1/admin/properties?${params}`);
      const data = await res.json();
      if (data.success) {
        setProperties(data.data);
        setTotalPages(data.pagination.totalPages);
        setTotalCount(data.pagination.totalCount);
      }
    } catch (error) {
      console.error("Error fetching properties:", error);
    } finally {
      setLoading(false);
    }
  }, [page, search, cityFilter]);

  useEffect(() => {
    fetchProperties();
  }, [fetchProperties]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchProperties();
  };

  const handleDeleteProperty = async (propertyId: string) => {
    if (!confirm("Naozaj chcete vymazať túto nehnuteľnosť? Táto akcia je nevratná.")) {
      return;
    }

    try {
      const res = await fetch(`/api/v1/admin/properties?propertyId=${propertyId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        fetchProperties();
      }
    } catch (error) {
      console.error("Error deleting property:", error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-100 mb-2 flex items-center gap-3">
            <Building className="w-8 h-8 text-emerald-400" />
            Správa nehnuteľností
          </h1>
          <p className="text-slate-400">
            Celkom {totalCount} nehnuteľností v databáze
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-4">
        <form onSubmit={handleSearch} className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Hľadať podľa názvu alebo adresy..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-400 focus:outline-none focus:border-red-500"
            />
          </div>
          <select
            value={cityFilter}
            onChange={(e) => {
              setCityFilter(e.target.value);
              setPage(1);
            }}
            className="px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-red-500"
          >
            <option value="">Všetky mestá</option>
            {CITIES.map((city) => (
              <option key={city} value={city}>
                {CITY_LABELS[city]}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg transition-colors"
          >
            Hľadať
          </button>
        </form>
      </div>

      {/* Properties Table */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-red-400 animate-spin" />
          </div>
        ) : properties.length === 0 ? (
          <div className="text-center py-12">
            <Building className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400">Žiadne nehnuteľnosti</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-800/50">
                <tr>
                  <th className="text-left py-3 px-6 text-sm font-medium text-slate-400">Nehnuteľnosť</th>
                  <th className="text-left py-3 px-6 text-sm font-medium text-slate-400">Cena</th>
                  <th className="text-left py-3 px-6 text-sm font-medium text-slate-400">Výnos</th>
                  <th className="text-left py-3 px-6 text-sm font-medium text-slate-400">Štatistiky</th>
                  <th className="text-left py-3 px-6 text-sm font-medium text-slate-400">Pridané</th>
                  <th className="text-right py-3 px-6 text-sm font-medium text-slate-400">Akcie</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {properties.map((property) => (
                  <tr key={property.id} className="hover:bg-slate-800/30">
                    <td className="py-4 px-6">
                      <div>
                        <div className="font-medium text-slate-100 line-clamp-1">{property.title}</div>
                        <div className="flex items-center gap-1 text-sm text-slate-400">
                          <MapPin className="w-3 h-3" />
                          {property.district}, {CITY_LABELS[property.city]}
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="font-bold text-slate-100">€{property.price.toLocaleString()}</div>
                      <div className="text-sm text-slate-400">€{property.price_per_m2}/m²</div>
                    </td>
                    <td className="py-4 px-6">
                      {property.investmentMetrics ? (
                        <div className="flex items-center gap-1 text-emerald-400">
                          <TrendingUp className="w-4 h-4" />
                          <span className="font-medium">
                            {property.investmentMetrics.gross_yield.toFixed(1)}%
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-4 text-sm text-slate-400">
                        <div className="flex items-center gap-1" title="Uložené používateľmi">
                          <Bookmark className="w-4 h-4" />
                          {property._count.savedBy}
                        </div>
                        <div className="flex items-center gap-1" title="Cenové záznamy">
                          <History className="w-4 h-4" />
                          {property._count.priceHistory}
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-slate-400">
                      {new Date(property.createdAt).toLocaleDateString("sk-SK")}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center justify-end gap-2">
                        {property.source_url && (
                          <a
                            href={property.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-blue-400 transition-colors"
                            title="Otvoriť zdroj"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                        <button
                          onClick={() => handleDeleteProperty(property.id)}
                          className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-red-400 transition-colors"
                          title="Vymazať"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 p-4 border-t border-slate-800">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 disabled:opacity-50"
            >
              <ChevronLeft className="w-4 h-4" />
              Predchádzajúca
            </button>
            <span className="text-slate-400">
              Strana {page} z {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 disabled:opacity-50"
            >
              Ďalšia
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
