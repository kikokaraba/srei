"use client";

import { useState, useEffect, useMemo } from "react";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Info,
  RefreshCw,
} from "lucide-react";

interface YearlyData {
  year: number;
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
}

interface RegionStats {
  currentPrice: number;
  priceChange1Y: number;
  priceChange5Y: number;
  priceChange10Y: number;
  allTimeHigh: number;
  allTimeLow: number;
  averagePrice: number;
}

interface HistoryData {
  region: string;
  name: string;
  yearly: YearlyData[];
  stats: RegionStats;
  source: string;
}

const REGIONS = [
  { code: "SLOVENSKO", name: "Slovensko" },
  { code: "BRATISLAVSKY", name: "Bratislava" },
  { code: "KOSICKY", name: "Košice" },
  { code: "PRESOVSKY", name: "Prešov" },
  { code: "ZILINSKY", name: "Žilina" },
  { code: "BANSKOBYSTRICKY", name: "B. Bystrica" },
  { code: "TRNAVSKY", name: "Trnava" },
  { code: "TRENCIANSKY", name: "Trenčín" },
  { code: "NITRIANSKY", name: "Nitra" },
];

const PERIOD_OPTIONS = [
  { value: "5", label: "5 rokov" },
  { value: "10", label: "10 rokov" },
  { value: "20", label: "20 rokov" },
];

export function PriceHistory() {
  const [selectedRegion, setSelectedRegion] = useState("SLOVENSKO");
  const [period, setPeriod] = useState("10");
  const [data, setData] = useState<HistoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [selectedRegion, period]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const fromYear = 2025 - parseInt(period);
      const response = await fetch(
        `/api/v1/price-history?region=${selectedRegion}&type=yearly&from=${fromYear}&to=2025`
      );
      
      if (!response.ok) {
        throw new Error("Nepodarilo sa načítať dáta");
      }
      
      const result = await response.json();
      if (result.success) {
        // Fetch stats separately
        const statsResponse = await fetch(
          `/api/v1/price-history?region=${selectedRegion}&type=stats`
        );
        const statsResult = await statsResponse.json();
        
        setData({
          region: selectedRegion,
          name: result.data.name,
          yearly: result.data.yearly,
          stats: statsResult.data?.stats || {},
          source: result.data.source,
        });
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError("Nepodarilo sa načítať historické dáta");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Výpočet pre graf
  const chartData = useMemo(() => {
    if (!data?.yearly?.length) return null;
    
    const prices = data.yearly.map(d => d.avgPrice);
    const maxPrice = Math.max(...prices);
    const minPrice = Math.min(...prices);
    const range = maxPrice - minPrice || 1;
    
    return {
      points: data.yearly.map((d, i) => ({
        ...d,
        height: ((d.avgPrice - minPrice) / range) * 100,
        x: (i / (data.yearly.length - 1)) * 100,
      })),
      maxPrice,
      minPrice,
      trend: prices[prices.length - 1] > prices[0] ? "up" : "down",
    };
  }, [data]);

  const getTrendIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="w-4 h-4 text-emerald-400" />;
    if (change < 0) return <TrendingDown className="w-4 h-4 text-red-400" />;
    return <Minus className="w-4 h-4 text-slate-400" />;
  };

  const getTrendColor = (change: number) => {
    if (change > 0) return "text-emerald-400";
    if (change < 0) return "text-red-400";
    return "text-slate-400";
  };

  const formatChange = (change: number) => {
    const sign = change > 0 ? "+" : "";
    return `${sign}${change.toFixed(1)}%`;
  };

  if (loading && !data) {
    return (
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-slate-800 rounded w-1/3"></div>
          <div className="h-48 bg-slate-800 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/10 rounded-lg">
            <BarChart3 className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-100">Vývoj cien</h3>
            <p className="text-sm text-slate-400">Historický vývoj cien nehnuteľností</p>
          </div>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
          title="Obnoviť"
        >
          <RefreshCw className={`w-4 h-4 text-slate-400 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        {/* Region selector */}
        <div className="flex gap-1 overflow-x-auto pb-1 -mx-2 px-2">
          {REGIONS.map((region) => (
            <button
              key={region.code}
              onClick={() => setSelectedRegion(region.code)}
              className={`px-3 py-1.5 text-xs sm:text-sm rounded-lg whitespace-nowrap transition-colors ${
                selectedRegion === region.code
                  ? "bg-blue-500 text-white"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              {region.name}
            </button>
          ))}
        </div>
        
        {/* Period selector */}
        <div className="flex gap-1 ml-auto">
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setPeriod(opt.value)}
              className={`px-3 py-1.5 text-xs sm:text-sm rounded-lg transition-colors ${
                period === opt.value
                  ? "bg-slate-700 text-white"
                  : "bg-slate-800/50 text-slate-400 hover:bg-slate-700"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <div className="text-center py-8 text-red-400">{error}</div>
      ) : data && chartData ? (
        <>
          {/* Stats cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <div className="bg-slate-800/50 rounded-lg p-3">
              <div className="text-xs text-slate-400 mb-1">Aktuálna cena</div>
              <div className="text-xl font-bold text-slate-100">
                {data.stats.currentPrice?.toLocaleString()} €/m²
              </div>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-3">
              <div className="text-xs text-slate-400 mb-1">Zmena 1 rok</div>
              <div className={`text-xl font-bold flex items-center gap-1 ${getTrendColor(data.stats.priceChange1Y)}`}>
                {getTrendIcon(data.stats.priceChange1Y)}
                {formatChange(data.stats.priceChange1Y)}
              </div>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-3">
              <div className="text-xs text-slate-400 mb-1">Zmena 5 rokov</div>
              <div className={`text-xl font-bold flex items-center gap-1 ${getTrendColor(data.stats.priceChange5Y)}`}>
                {getTrendIcon(data.stats.priceChange5Y)}
                {formatChange(data.stats.priceChange5Y)}
              </div>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-3">
              <div className="text-xs text-slate-400 mb-1">Zmena 10 rokov</div>
              <div className={`text-xl font-bold flex items-center gap-1 ${getTrendColor(data.stats.priceChange10Y)}`}>
                {getTrendIcon(data.stats.priceChange10Y)}
                {formatChange(data.stats.priceChange10Y)}
              </div>
            </div>
          </div>

          {/* Chart */}
          <div className="relative h-48 mb-4">
            {/* Y-axis labels */}
            <div className="absolute left-0 top-0 bottom-0 w-16 flex flex-col justify-between text-xs text-slate-500 pr-2">
              <span>{chartData.maxPrice.toLocaleString()} €</span>
              <span>{Math.round((chartData.maxPrice + chartData.minPrice) / 2).toLocaleString()} €</span>
              <span>{chartData.minPrice.toLocaleString()} €</span>
            </div>
            
            {/* Chart area */}
            <div className="ml-16 h-full relative">
              {/* Grid lines */}
              <div className="absolute inset-0 flex flex-col justify-between">
                <div className="border-b border-slate-800"></div>
                <div className="border-b border-slate-800/50"></div>
                <div className="border-b border-slate-800"></div>
              </div>
              
              {/* Bars */}
              <div className="absolute inset-0 flex items-end gap-1 px-1">
                {chartData.points.map((point, i) => (
                  <div
                    key={point.year}
                    className="flex-1 flex flex-col items-center group relative"
                  >
                    {/* Tooltip */}
                    <div className="absolute bottom-full mb-2 hidden group-hover:block z-10">
                      <div className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs whitespace-nowrap shadow-lg">
                        <div className="font-semibold text-slate-100">{point.year}</div>
                        <div className="text-slate-300">{point.avgPrice.toLocaleString()} €/m²</div>
                        <div className="text-slate-500">
                          Min: {point.minPrice.toLocaleString()} € | Max: {point.maxPrice.toLocaleString()} €
                        </div>
                      </div>
                    </div>
                    
                    {/* Bar */}
                    <div
                      className={`w-full rounded-t transition-all cursor-pointer ${
                        chartData.trend === "up"
                          ? "bg-gradient-to-t from-blue-600 to-blue-400 hover:from-blue-500 hover:to-blue-300"
                          : "bg-gradient-to-t from-red-600 to-red-400 hover:from-red-500 hover:to-red-300"
                      }`}
                      style={{ height: `${Math.max(point.height, 5)}%` }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* X-axis labels */}
          <div className="ml-16 flex justify-between text-xs text-slate-500 px-1">
            {chartData.points
              .filter((_, i) => i === 0 || i === chartData.points.length - 1 || i % Math.ceil(chartData.points.length / 5) === 0)
              .map((point) => (
                <span key={point.year}>{point.year}</span>
              ))}
          </div>

          {/* Additional stats */}
          <div className="mt-6 pt-4 border-t border-slate-800 grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-xs text-slate-500 mb-1">Historické maximum</div>
              <div className="text-sm font-semibold text-emerald-400 flex items-center justify-center gap-1">
                <ArrowUpRight className="w-3 h-3" />
                {data.stats.allTimeHigh?.toLocaleString()} €/m²
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500 mb-1">Historické minimum</div>
              <div className="text-sm font-semibold text-red-400 flex items-center justify-center gap-1">
                <ArrowDownRight className="w-3 h-3" />
                {data.stats.allTimeLow?.toLocaleString()} €/m²
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500 mb-1">Priemerná cena</div>
              <div className="text-sm font-semibold text-slate-300">
                {data.stats.averagePrice?.toLocaleString()} €/m²
              </div>
            </div>
          </div>

          {/* Source */}
          <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
            <Info className="w-3 h-3" />
            <span>Zdroj: {data.source} | Údaje za byty (€/m²)</span>
          </div>
        </>
      ) : null}
    </div>
  );
}

export default PriceHistory;
