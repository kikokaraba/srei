"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  TrendingUp,
  TrendingDown,
  Clock,
  Euro,
  Home,
  MapPin,
  Loader2,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
} from "lucide-react";

interface CityStats {
  city: string;
  totalSold: number;
  avgPrice: number;
  avgPricePerM2: number;
  avgDaysOnMarket: number;
  avgPriceChange: number;
  avgPriceChangePercent: number;
}

interface MonthlyStats {
  month: string;
  count: number;
  avgPrice: number;
  avgPricePerM2: number;
  avgDaysOnMarket: number;
}

interface HistoryData {
  totalSold: number;
  avgDaysOnMarket: number;
  avgPriceChange: number;
  avgPriceChangePercent: number;
  cityStats: CityStats[];
  monthlyStats: MonthlyStats[];
  recentlySold: {
    id: string;
    title: string;
    city: string;
    initialPrice: number;
    finalPrice: number;
    priceChange: number;
    daysOnMarket: number;
    lastSeenAt: string;
  }[];
}

export function MarketHistory() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<HistoryData | null>(null);
  const [selectedCity, setSelectedCity] = useState<string>("all");
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (selectedCity !== "all") {
        params.set("city", selectedCity);
      }

      const response = await fetch(`/api/v1/market/history?${params}`);
      if (!response.ok) {
        throw new Error("Nepodarilo sa načítať dáta");
      }

      const result = await response.json();
      setData(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Neznáma chyba");
    } finally {
      setLoading(false);
    }
  }, [selectedCity]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-800 rounded-xl p-6 text-center">
        <p className="text-red-400">{error}</p>
        <p className="text-slate-400 text-sm mt-2">
          Historické dáta sa zobrazia až po tom, čo sa niektoré inzeráty odstránia z trhu.
        </p>
      </div>
    );
  }

  if (!data || data.totalSold === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center">
        <Clock className="w-12 h-12 text-slate-600 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-slate-300 mb-2">Zatiaľ žiadne historické dáta</h3>
        <p className="text-slate-400">
          Historické dáta sa zobrazia po tom, čo začneme sledovať nehnuteľnosti a niektoré sa predajú alebo odstránia z trhu.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
          <div className="flex items-center gap-2 text-slate-400 mb-2">
            <Home className="w-5 h-5" />
            <span className="text-sm">Predaných/Odstránených</span>
          </div>
          <div className="text-3xl font-bold text-slate-100">
            {data.totalSold}
          </div>
        </div>

        <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
          <div className="flex items-center gap-2 text-slate-400 mb-2">
            <Clock className="w-5 h-5" />
            <span className="text-sm">Priem. dní na trhu</span>
          </div>
          <div className="text-3xl font-bold text-purple-400">
            {data.avgDaysOnMarket}
          </div>
        </div>

        <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
          <div className="flex items-center gap-2 text-slate-400 mb-2">
            <Euro className="w-5 h-5" />
            <span className="text-sm">Priem. zmena ceny</span>
          </div>
          <div className={`text-3xl font-bold flex items-center gap-1 ${
            data.avgPriceChange < 0 ? "text-emerald-400" : data.avgPriceChange > 0 ? "text-red-400" : "text-slate-400"
          }`}>
            {data.avgPriceChange < 0 ? (
              <ArrowDownRight className="w-6 h-6" />
            ) : data.avgPriceChange > 0 ? (
              <ArrowUpRight className="w-6 h-6" />
            ) : null}
            €{Math.abs(data.avgPriceChange).toLocaleString()}
          </div>
        </div>

        <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
          <div className="flex items-center gap-2 text-slate-400 mb-2">
            {data.avgPriceChangePercent < 0 ? (
              <TrendingDown className="w-5 h-5" />
            ) : (
              <TrendingUp className="w-5 h-5" />
            )}
            <span className="text-sm">Priem. zmena %</span>
          </div>
          <div className={`text-3xl font-bold ${
            data.avgPriceChangePercent < 0 ? "text-emerald-400" : data.avgPriceChangePercent > 0 ? "text-red-400" : "text-slate-400"
          }`}>
            {data.avgPriceChangePercent > 0 ? "+" : ""}{data.avgPriceChangePercent.toFixed(1)}%
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* City Comparison */}
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
          <div className="flex items-center gap-2 mb-6">
            <MapPin className="w-5 h-5 text-purple-400" />
            <h3 className="text-lg font-bold text-slate-100">Porovnanie miest</h3>
          </div>

          <div className="space-y-4 max-h-[400px] overflow-y-auto">
            {data.cityStats.slice(0, 10).map((city) => (
              <div key={city.city} className="p-3 bg-slate-800/50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-slate-100">{city.city}</span>
                  <span className="text-sm text-slate-400">{city.totalSold} predaných</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <span className="text-slate-400">€/m²:</span>
                    <span className="text-slate-100 ml-1">€{city.avgPricePerM2.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Dní:</span>
                    <span className="text-purple-400 ml-1">{city.avgDaysOnMarket}</span>
                  </div>
                  <div className={city.avgPriceChangePercent < 0 ? "text-emerald-400" : "text-red-400"}>
                    {city.avgPriceChangePercent > 0 ? "+" : ""}{city.avgPriceChangePercent.toFixed(1)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Monthly Trend */}
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
          <div className="flex items-center gap-2 mb-6">
            <Calendar className="w-5 h-5 text-purple-400" />
            <h3 className="text-lg font-bold text-slate-100">Mesačný vývoj</h3>
          </div>

          {data.monthlyStats.length > 0 ? (
            <div className="space-y-4">
              {data.monthlyStats.map((month) => (
                <div key={month.month} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300">{month.month}</span>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-slate-400">{month.count} predajov</span>
                      <span className="text-slate-100">€{month.avgPricePerM2}/m²</span>
                    </div>
                  </div>
                  <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-500 to-purple-400 rounded-full"
                      style={{ width: `${Math.min((month.count / (data.monthlyStats[0]?.count || 1)) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-400 text-center py-8">
              Mesačné štatistiky sa zobrazia po zozbieraní viac dát.
            </p>
          )}
        </div>
      </div>

      {/* Recently Sold */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
        <div className="flex items-center gap-2 mb-6">
          <BarChart3 className="w-5 h-5 text-purple-400" />
          <h3 className="text-lg font-bold text-slate-100">Posledné predané/odstránené</h3>
        </div>

        {data.recentlySold.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-slate-400 text-sm border-b border-slate-800">
                  <th className="pb-3 font-medium">Nehnuteľnosť</th>
                  <th className="pb-3 font-medium">Mesto</th>
                  <th className="pb-3 font-medium text-right">Pôvodná cena</th>
                  <th className="pb-3 font-medium text-right">Finálna cena</th>
                  <th className="pb-3 font-medium text-right">Zmena</th>
                  <th className="pb-3 font-medium text-right">Dní na trhu</th>
                </tr>
              </thead>
              <tbody>
                {data.recentlySold.map((item) => (
                  <tr key={item.id} className="border-b border-slate-800/50">
                    <td className="py-3">
                      <span className="text-slate-100 line-clamp-1">{item.title}</span>
                    </td>
                    <td className="py-3 text-slate-400">{item.city}</td>
                    <td className="py-3 text-right text-slate-400">
                      €{item.initialPrice.toLocaleString()}
                    </td>
                    <td className="py-3 text-right text-slate-100">
                      €{item.finalPrice.toLocaleString()}
                    </td>
                    <td className={`py-3 text-right font-medium ${
                      item.priceChange < 0 ? "text-emerald-400" : item.priceChange > 0 ? "text-red-400" : "text-slate-400"
                    }`}>
                      {item.priceChange !== 0 && (item.priceChange > 0 ? "+" : "")}
                      {item.priceChange !== 0 ? `€${item.priceChange.toLocaleString()}` : "-"}
                    </td>
                    <td className="py-3 text-right text-purple-400">
                      {item.daysOnMarket} dní
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-slate-400 text-center py-8">
            Zatiaľ žiadne záznamy o predaných nehnuteľnostiach.
          </p>
        )}
      </div>
    </div>
  );
}
