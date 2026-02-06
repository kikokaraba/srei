"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Percent,
  Home,
  ArrowUp,
  ArrowDown,
  Flame,
  Coins,
  Database,
  Banknote,
} from "lucide-react";

interface EconomyLive {
  nationalAvgPrice: number;
  nationalPriceChange: number | null;
  totalListings: number;
  avgYield: number | null;
  hottest: string;
  cheapest: string;
  mortgageRate: number | null;
  dataSource: string;
  generatedAt: string;
}

interface MarketResponse {
  success: boolean;
  data: EconomyLive;
  source: string;
  updatedAt: string;
}

async function fetchEconomyLive(): Promise<MarketResponse> {
  const res = await fetch("/api/v1/market-data?type=economy-live");
  if (!res.ok) throw new Error("Failed to fetch economy data");
  return res.json();
}

const CITY_NAMES: Record<string, string> = {
  BRATISLAVA: "Bratislava",
  KOSICE: "Košice",
  ZILINA: "Žilina",
  NITRA: "Nitra",
  PRESOV: "Prešov",
  BANSKA_BYSTRICA: "B. Bystrica",
  TRNAVA: "Trnava",
  TRENCIN: "Trenčín",
};

export function EconomicIndicators() {
  const { data, isLoading } = useQuery({
    queryKey: ["economy-live"],
    queryFn: fetchEconomyLive,
    refetchInterval: 10 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="relative overflow-hidden rounded-2xl bg-[#0f0f0f] p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-zinc-800/50 rounded-lg w-2/3" />
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-zinc-800/30 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const s = data?.data;
  if (!s) return null;

  const liveIndicators: Array<{
    label: string;
    value: number;
    format: (v: number) => string;
    change?: number | null;
    icon: typeof Home;
    iconColor: string;
    bg: string;
  }> = [
    {
      label: "Cena/m²",
      value: s.nationalAvgPrice,
      format: (v) => `€${v.toLocaleString()}`,
      change: s.nationalPriceChange,
      icon: Home,
      iconColor: "text-emerald-400",
      bg: "bg-emerald-500/5",
    },
  ];

  if (s.avgYield != null) {
    liveIndicators.push({
      label: "Výnos",
      value: s.avgYield,
      format: (v) => `${v}%`,
      icon: Percent,
      iconColor: "text-amber-400",
      bg: "bg-amber-500/5",
    });
  }
  if (s.mortgageRate != null && s.mortgageRate > 0) {
    liveIndicators.push({
      label: "Hypo sadzba",
      value: s.mortgageRate,
      format: (v) => `${v.toFixed(2)}%`,
      icon: Banknote,
      iconColor: "text-violet-400",
      bg: "bg-violet-500/5",
    });
  }

  return (
    <div className="premium-card p-5">
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Database className="w-5 h-5 text-emerald-400" />
            <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
              Ekonomika
            </span>
          </div>
          <h3 className="text-lg font-semibold text-white">
            100% živé dáta
          </h3>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        {liveIndicators.map((ind, idx) => {
          const Icon = ind.icon;
          const isPositive = ind.change != null ? ind.change > 0 : undefined;
          return (
            <div
              key={idx}
              className={`relative overflow-hidden p-4 rounded-xl ${ind.bg} border border-zinc-800/50 hover:border-zinc-700/50 transition-all duration-300`}
            >
              <div className={`${ind.iconColor} mb-2`}>
                <Icon className="w-4 h-4" />
              </div>
              <p className="text-lg font-semibold text-white tabular-nums">
                {ind.format(ind.value)}
              </p>
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs text-zinc-400">{ind.label}</span>
                {isPositive !== undefined && ind.change != null && (
                  <span
                    className={`flex items-center gap-0.5 text-xs font-medium ${
                      isPositive ? "text-emerald-400" : "text-red-400"
                    }`}
                  >
                    {isPositive ? (
                      <ArrowUp className="w-3 h-3" />
                    ) : (
                      <ArrowDown className="w-3 h-3" />
                    )}
                    {Math.abs(ind.change)}%
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/20 hover:border-orange-500/40 transition-colors">
          <div className="flex items-center gap-2 mb-2">
            <Flame className="w-4 h-4 text-orange-400" />
            <span className="text-xs text-orange-400">Najhorúcejšie</span>
          </div>
          <p className="text-lg font-bold text-white">
            {CITY_NAMES[s.hottest] || s.hottest}
          </p>
        </div>
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 hover:border-emerald-500/40 transition-colors">
          <div className="flex items-center gap-2 mb-2">
            <Coins className="w-4 h-4 text-emerald-400" />
            <span className="text-xs text-emerald-400">Najlacnejšie</span>
          </div>
          <p className="text-lg font-bold text-white">
            {CITY_NAMES[s.cheapest] || s.cheapest}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-end mt-4 pt-4 border-t border-zinc-800/50">
        <span className="text-sm text-zinc-400">
          <span className="text-white font-semibold">
            {s.totalListings.toLocaleString()}
          </span>{" "}
          ponúk
        </span>
      </div>

      <div className="flex items-center justify-center gap-2 mt-4 text-xs text-zinc-600">
        <span>100% živé dáta zo zoznamu inzerátov</span>
        {data?.updatedAt && (
          <>
            <span>•</span>
            <span>
              {new Date(data.updatedAt).toLocaleDateString("sk-SK", {
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </>
        )}
      </div>
    </div>
  );
}
