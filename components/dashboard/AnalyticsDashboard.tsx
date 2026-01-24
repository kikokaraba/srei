"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart,
  Activity,
  Euro,
  Home,
  Calendar,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { getCityRegionLabel, CONDITION_LABELS } from "@/lib/constants";

interface RegionStats {
  region: string;
  regionLabel: string;
  count: number;
  avgPrice: number;
  avgPricePerM2: number;
  avgYield: number;
  avgArea: number;
}

interface ConditionStats {
  condition: string;
  conditionLabel: string;
  count: number;
  percentage: number;
}

interface PriceRangeStats {
  range: string;
  count: number;
  percentage: number;
}

export function AnalyticsDashboard() {
  const [loading, setLoading] = useState(true);
  const [regionStats, setRegionStats] = useState<RegionStats[]>([]);
  const [conditionStats, setConditionStats] = useState<ConditionStats[]>([]);
  const [priceRanges, setPriceRanges] = useState<PriceRangeStats[]>([]);
  const [totalStats, setTotalStats] = useState({
    totalProperties: 0,
    avgPrice: 0,
    avgPricePerM2: 0,
    avgYield: 0,
    avgDaysOnMarket: 0,
  });

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);

      const response = await fetch("/api/v1/properties/filtered?limit=1000");
      if (!response.ok) throw new Error("Failed to fetch");

      const data = await response.json();
      const properties = data.data || [];

      if (properties.length === 0) {
        setLoading(false);
        return;
      }

      // Calculate total stats
      const totalPrice = properties.reduce((sum: number, p: { price: number }) => sum + p.price, 0);
      const totalPricePerM2 = properties.reduce((sum: number, p: { price_per_m2: number }) => sum + p.price_per_m2, 0);
      const totalYield = properties.reduce((sum: number, p: { investmentMetrics?: { gross_yield: number } }) => 
        sum + (p.investmentMetrics?.gross_yield || 0), 0);
      const totalDays = properties.reduce((sum: number, p: { days_on_market: number }) => sum + p.days_on_market, 0);
      const propertiesWithYield = properties.filter((p: { investmentMetrics?: { gross_yield: number } }) => p.investmentMetrics?.gross_yield).length;

      setTotalStats({
        totalProperties: properties.length,
        avgPrice: Math.round(totalPrice / properties.length),
        avgPricePerM2: Math.round(totalPricePerM2 / properties.length),
        avgYield: propertiesWithYield > 0 ? totalYield / propertiesWithYield : 0,
        avgDaysOnMarket: Math.round(totalDays / properties.length),
      });

      // Calculate region stats - group cities by region
      const regionMap: Record<string, { count: number; totalPrice: number; totalPricePerM2: number; totalYield: number; totalArea: number; yieldCount: number }> = {};
      
      for (const p of properties) {
        // Map city to region using getCityRegionLabel which returns region name
        const regionLabel = getCityRegionLabel(p.city);
        
        if (!regionMap[regionLabel]) {
          regionMap[regionLabel] = { count: 0, totalPrice: 0, totalPricePerM2: 0, totalYield: 0, totalArea: 0, yieldCount: 0 };
        }
        regionMap[regionLabel].count++;
        regionMap[regionLabel].totalPrice += p.price;
        regionMap[regionLabel].totalPricePerM2 += p.price_per_m2;
        regionMap[regionLabel].totalArea += p.area_m2;
        if (p.investmentMetrics?.gross_yield) {
          regionMap[regionLabel].totalYield += p.investmentMetrics.gross_yield;
          regionMap[regionLabel].yieldCount++;
        }
      }

      const regionStatsArray: RegionStats[] = Object.entries(regionMap).map(([regionLabel, stats]) => ({
        region: regionLabel,
        regionLabel: regionLabel,
        count: stats.count,
        avgPrice: Math.round(stats.totalPrice / stats.count),
        avgPricePerM2: Math.round(stats.totalPricePerM2 / stats.count),
        avgYield: stats.yieldCount > 0 ? stats.totalYield / stats.yieldCount : 0,
        avgArea: Math.round(stats.totalArea / stats.count),
      }));

      setRegionStats(regionStatsArray.sort((a, b) => b.count - a.count));

      // Calculate condition stats
      const conditionMap: Record<string, number> = {};
      for (const p of properties) {
        conditionMap[p.condition] = (conditionMap[p.condition] || 0) + 1;
      }

      const conditionStatsArray: ConditionStats[] = Object.entries(conditionMap).map(([condition, count]) => ({
        condition,
        conditionLabel: CONDITION_LABELS[condition] || condition,
        count,
        percentage: (count / properties.length) * 100,
      }));

      setConditionStats(conditionStatsArray.sort((a, b) => b.count - a.count));

      // Calculate price ranges
      const ranges = [
        { min: 0, max: 100000, label: "Do €100k" },
        { min: 100000, max: 150000, label: "€100k - €150k" },
        { min: 150000, max: 200000, label: "€150k - €200k" },
        { min: 200000, max: 300000, label: "€200k - €300k" },
        { min: 300000, max: Infinity, label: "Nad €300k" },
      ];

      const priceRangeStats: PriceRangeStats[] = ranges.map((range) => {
        const count = properties.filter((p: { price: number }) => p.price >= range.min && p.price < range.max).length;
        return {
          range: range.label,
          count,
          percentage: (count / properties.length) * 100,
        };
      });

      setPriceRanges(priceRangeStats);
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
          <div className="flex items-center gap-2 text-slate-400 mb-2">
            <Home className="w-5 h-5" />
            <span className="text-sm">Celkom nehnuteľností</span>
          </div>
          <div className="text-3xl font-bold text-slate-100">
            {totalStats.totalProperties}
          </div>
        </div>

        <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
          <div className="flex items-center gap-2 text-slate-400 mb-2">
            <Euro className="w-5 h-5" />
            <span className="text-sm">Priem. cena</span>
          </div>
          <div className="text-3xl font-bold text-slate-100">
            €{totalStats.avgPrice.toLocaleString()}
          </div>
        </div>

        <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
          <div className="flex items-center gap-2 text-slate-400 mb-2">
            <BarChart3 className="w-5 h-5" />
            <span className="text-sm">Priem. €/m²</span>
          </div>
          <div className="text-3xl font-bold text-slate-100">
            €{totalStats.avgPricePerM2.toLocaleString()}
          </div>
        </div>

        <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
          <div className="flex items-center gap-2 text-slate-400 mb-2">
            <TrendingUp className="w-5 h-5" />
            <span className="text-sm">Priem. výnos</span>
          </div>
          <div className="text-3xl font-bold text-emerald-400">
            {totalStats.avgYield.toFixed(1)}%
          </div>
        </div>

        <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
          <div className="flex items-center gap-2 text-slate-400 mb-2">
            <Calendar className="w-5 h-5" />
            <span className="text-sm">Priem. dní v ponuke</span>
          </div>
          <div className="text-3xl font-bold text-slate-100">
            {totalStats.avgDaysOnMarket}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* City Comparison */}
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
          <div className="flex items-center gap-2 mb-6">
            <Activity className="w-5 h-5 text-emerald-400" />
            <h3 className="text-lg font-bold text-slate-100">Porovnanie regiónov</h3>
          </div>

          <div className="space-y-4">
            {regionStats.map((region) => (
              <div key={region.region} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-100">{region.regionLabel}</span>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-slate-400">{region.count} ponúk</span>
                    <span className="text-slate-100">€{region.avgPricePerM2}/m²</span>
                    <span className="text-emerald-400 font-medium">{region.avgYield.toFixed(1)}%</span>
                  </div>
                </div>
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full"
                    style={{ width: `${(region.count / (regionStats[0]?.count || 1)) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Price Distribution */}
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
          <div className="flex items-center gap-2 mb-6">
            <BarChart3 className="w-5 h-5 text-emerald-400" />
            <h3 className="text-lg font-bold text-slate-100">Cenové rozloženie</h3>
          </div>

          <div className="space-y-4">
            {priceRanges.map((range) => (
              <div key={range.range} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-300">{range.range}</span>
                  <span className="text-slate-400">{range.count} ({range.percentage.toFixed(0)}%)</span>
                </div>
                <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full transition-all"
                    style={{ width: `${range.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Condition Distribution */}
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
          <div className="flex items-center gap-2 mb-6">
            <PieChart className="w-5 h-5 text-emerald-400" />
            <h3 className="text-lg font-bold text-slate-100">Stav nehnuteľností</h3>
          </div>

          <div className="flex items-center justify-center gap-8">
            {/* Simple pie chart representation */}
            <div className="relative w-40 h-40">
              <svg viewBox="0 0 100 100" className="transform -rotate-90">
                {conditionStats.reduce((acc, stat, idx) => {
                  const startAngle = acc.offset;
                  const angle = (stat.percentage / 100) * 360;
                  const colors = ["#10b981", "#3b82f6", "#f59e0b"];
                  
                  const x1 = 50 + 40 * Math.cos((startAngle * Math.PI) / 180);
                  const y1 = 50 + 40 * Math.sin((startAngle * Math.PI) / 180);
                  const x2 = 50 + 40 * Math.cos(((startAngle + angle) * Math.PI) / 180);
                  const y2 = 50 + 40 * Math.sin(((startAngle + angle) * Math.PI) / 180);
                  const largeArc = angle > 180 ? 1 : 0;

                  acc.paths.push(
                    <path
                      key={idx}
                      d={`M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArc} 1 ${x2} ${y2} Z`}
                      fill={colors[idx % colors.length]}
                      className="opacity-80 hover:opacity-100 transition-opacity"
                    />
                  );
                  acc.offset += angle;
                  return acc;
                }, { paths: [] as React.ReactElement[], offset: 0 }).paths}
              </svg>
            </div>

            <div className="space-y-3">
              {conditionStats.map((stat, idx) => {
                const colors = ["bg-emerald-500", "bg-blue-500", "bg-amber-500"];
                return (
                  <div key={stat.condition} className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded-full ${colors[idx % colors.length]}`} />
                    <div>
                      <div className="font-medium text-slate-100">{stat.conditionLabel}</div>
                      <div className="text-sm text-slate-400">
                        {stat.count} ({stat.percentage.toFixed(0)}%)
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Top Performers */}
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp className="w-5 h-5 text-emerald-400" />
            <h3 className="text-lg font-bold text-slate-100">Najlepšie investičné regióny</h3>
          </div>

          <div className="space-y-4">
            {[...regionStats]
              .sort((a, b) => b.avgYield - a.avgYield)
              .slice(0, 5)
              .map((region, idx) => (
                <div
                  key={region.region}
                  className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                      idx === 0 ? "bg-yellow-500/20 text-yellow-400" :
                      idx === 1 ? "bg-slate-400/20 text-slate-300" :
                      idx === 2 ? "bg-amber-600/20 text-amber-500" :
                      "bg-slate-700 text-slate-400"
                    }`}>
                      {idx + 1}
                    </div>
                    <div>
                      <div className="font-medium text-slate-100">{region.regionLabel}</div>
                      <div className="text-sm text-slate-400">€{region.avgPricePerM2}/m²</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-emerald-400 font-bold">
                      <ArrowUpRight className="w-4 h-4" />
                      {region.avgYield.toFixed(1)}%
                    </div>
                    <div className="text-sm text-slate-400">hrubý výnos</div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
