"use client";

import { TrendingUp, TrendingDown, Minus, Info, DollarSign, Calendar, Percent } from "lucide-react";

interface YieldData {
  averageRent: number;
  rentRange: { min: number; max: number };
  sampleSize: number;
  grossYield: number;
  netYield: number;
  priceToRent: number;
  paybackYears: number;
  monthlyExpenses: number;
  monthlyProfit: number;
}

interface MarketComparison {
  propertyYield: number;
  cityAverage: number;
  districtAverage: number;
  countryAverage: number;
  rating: "EXCELLENT" | "GOOD" | "AVERAGE" | "BELOW_AVERAGE" | "POOR";
  percentile: number;
}

interface YieldCardProps {
  yield: YieldData;
  comparison?: MarketComparison;
  propertyPrice: number;
  city: string;
}

const ratingConfig = {
  EXCELLENT: { label: "Výborná", color: "text-emerald-400", bg: "bg-emerald-500/10" },
  GOOD: { label: "Dobrá", color: "text-green-400", bg: "bg-green-500/10" },
  AVERAGE: { label: "Priemerná", color: "text-yellow-400", bg: "bg-yellow-500/10" },
  BELOW_AVERAGE: { label: "Podpriemerná", color: "text-orange-400", bg: "bg-orange-500/10" },
  POOR: { label: "Slabá", color: "text-red-400", bg: "bg-red-500/10" },
};

export function YieldCard({ yield: yieldData, comparison, propertyPrice, city }: YieldCardProps) {
  const rating = comparison ? ratingConfig[comparison.rating] : null;
  const yieldDiff = comparison ? yieldData.grossYield - comparison.cityAverage : 0;

  return (
    <div className="premium-card p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
            <Percent className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-zinc-100">Investičná výnosnosť</h3>
            <p className="text-sm text-zinc-500">Analýza na základe {yieldData.sampleSize} nájmov</p>
          </div>
        </div>
        {rating && (
          <div className={`px-3 py-1.5 rounded-full ${rating.bg}`}>
            <span className={`text-sm font-medium ${rating.color}`}>{rating.label}</span>
          </div>
        )}
      </div>

      {/* Main Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-lg bg-zinc-800/50 border border-zinc-700/50">
          <div className="text-sm text-zinc-500 mb-1">Hrubý Yield</div>
          <div className="text-2xl font-bold text-emerald-400">{yieldData.grossYield}%</div>
          <div className="flex items-center gap-1 mt-1">
            {yieldDiff > 0 ? (
              <TrendingUp className="w-3 h-3 text-emerald-400" />
            ) : yieldDiff < 0 ? (
              <TrendingDown className="w-3 h-3 text-red-400" />
            ) : (
              <Minus className="w-3 h-3 text-zinc-500" />
            )}
            <span className={`text-xs ${yieldDiff > 0 ? "text-emerald-400" : yieldDiff < 0 ? "text-red-400" : "text-zinc-500"}`}>
              {yieldDiff > 0 ? "+" : ""}{yieldDiff.toFixed(1)}% vs. {city}
            </span>
          </div>
        </div>

        <div className="p-4 rounded-lg bg-zinc-800/50 border border-zinc-700/50">
          <div className="text-sm text-zinc-500 mb-1">Čistý Yield</div>
          <div className="text-2xl font-bold text-zinc-100">{yieldData.netYield}%</div>
          <div className="text-xs text-zinc-500 mt-1">Po odpočte nákladov</div>
        </div>

        <div className="p-4 rounded-lg bg-zinc-800/50 border border-zinc-700/50">
          <div className="text-sm text-zinc-500 mb-1">Priem. nájom</div>
          <div className="text-2xl font-bold text-zinc-100">{yieldData.averageRent} €</div>
          <div className="text-xs text-zinc-500 mt-1">
            {yieldData.rentRange.min} - {yieldData.rentRange.max} €
          </div>
        </div>

        <div className="p-4 rounded-lg bg-zinc-800/50 border border-zinc-700/50">
          <div className="text-sm text-zinc-500 mb-1">Návratnosť</div>
          <div className="text-2xl font-bold text-zinc-100">{yieldData.paybackYears} r</div>
          <div className="text-xs text-zinc-500 mt-1">Pri 100% obsadenosti</div>
        </div>
      </div>

      {/* Detailed Breakdown */}
      <div className="pt-4 border-t border-zinc-800">
        <h4 className="text-sm font-medium text-zinc-400 mb-3">Mesačná kalkulácia</h4>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-zinc-500">Očakávaný nájom</span>
            <span className="text-zinc-100 font-medium">+{yieldData.averageRent} €</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-zinc-500">Odhadované náklady</span>
            <span className="text-red-400">-{yieldData.monthlyExpenses} €</span>
          </div>
          <div className="flex justify-between text-sm pt-2 border-t border-zinc-800">
            <span className="text-zinc-400 font-medium">Čistý mesačný zisk</span>
            <span className="text-emerald-400 font-bold">{yieldData.monthlyProfit} €</span>
          </div>
        </div>
      </div>

      {/* Comparison */}
      {comparison && (
        <div className="pt-4 border-t border-zinc-800">
          <h4 className="text-sm font-medium text-zinc-400 mb-3">Porovnanie s trhom</h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-500">Táto nehnuteľnosť</span>
              <div className="flex items-center gap-2">
                <div className="w-24 h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-emerald-500 rounded-full"
                    style={{ width: `${Math.min(comparison.propertyYield / 10 * 100, 100)}%` }}
                  />
                </div>
                <span className="text-sm text-zinc-100 font-medium w-12 text-right">
                  {comparison.propertyYield}%
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-500">Priemer {city}</span>
              <div className="flex items-center gap-2">
                <div className="w-24 h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-zinc-500 rounded-full"
                    style={{ width: `${Math.min(comparison.cityAverage / 10 * 100, 100)}%` }}
                  />
                </div>
                <span className="text-sm text-zinc-500 w-12 text-right">
                  {comparison.cityAverage}%
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-500">Priemer SR</span>
              <div className="flex items-center gap-2">
                <div className="w-24 h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-zinc-600 rounded-full"
                    style={{ width: `${Math.min(comparison.countryAverage / 10 * 100, 100)}%` }}
                  />
                </div>
                <span className="text-sm text-zinc-500 w-12 text-right">
                  {comparison.countryAverage}%
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Info */}
      <div className="flex items-start gap-2 p-3 rounded-lg bg-zinc-800/30 border border-zinc-700/30">
        <Info className="w-4 h-4 text-zinc-500 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-zinc-500">
          Výpočet zahŕňa odhadované náklady: daň z nehnuteľnosti, poistenie, údržbu, správu a rezervu na neobsadenosť (~26% z nájmu).
        </p>
      </div>
    </div>
  );
}
