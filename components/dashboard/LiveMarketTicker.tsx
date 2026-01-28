"use client";

import { useQuery } from "@tanstack/react-query";
import { Zap, TrendingUp, Activity } from "lucide-react";

interface RealtimeOverview {
  nationalAvg: number;
  nationalMedian: number;
  totalProperties: number;
  newLast24h: number;
  newLast7d: number;
  priceChangeLast30d: number | null;
}

interface RealtimeResponse {
  success: boolean;
  data?: {
    overview: RealtimeOverview;
    regions: Array< { city: string; avgPricePerM2: number; propertyCount: number } >;
    dataSource?: string;
  };
}

async function fetchRealtime(): Promise<RealtimeResponse> {
  const res = await fetch("/api/v1/market/realtime");
  if (!res.ok) throw new Error("Failed to fetch");
  return res.json();
}

export function LiveMarketTicker() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["market-realtime"],
    queryFn: fetchRealtime,
    refetchInterval: 60_000,
    staleTime: 55_000,
  });

  const overview = data?.data?.overview;
  const regions = data?.data?.regions ?? [];
  const ba = regions.find((r) =>
    r.city.toUpperCase().includes("BRATISLAVA")
  );

  if (isLoading || isError || !overview) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 premium-card">
        <div className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-pulse" />
        <span className="text-[11px] text-zinc-600 font-medium tracking-wide">
          LIVE
        </span>
        <div className="flex items-center gap-6 text-zinc-600">
          <span className="font-mono text-sm">—</span>
          <span className="font-mono text-sm">—</span>
          <span className="font-mono text-sm">—</span>
        </div>
      </div>
    );
  }

  const total = overview.totalProperties ?? 0;
  const new7d = overview.newLast7d ?? 0;
  const change30 = overview.priceChangeLast30d;
  const avgM2 = ba?.avgPricePerM2 ?? overview.nationalAvg ?? 0;
  const avgLabel = ba ? "BA" : "SK";

  return (
    <div className="flex items-center gap-2 px-4 py-2 premium-card" title="Reálne dáta z nášho zoznamu inzerátov (Bazoš, Nehnuteľnosti, Reality)">
      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
      <span className="text-[11px] text-zinc-500 font-medium tracking-wide">
        LIVE
      </span>
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          <span className="font-mono text-sm text-zinc-300">
            {total.toLocaleString()}
          </span>
          <span className="text-[10px] text-zinc-600">ponúk</span>
        </div>
        <div className="w-px h-4 bg-zinc-800" />
        <div className="flex items-center gap-1.5">
          <TrendingUp
            className={`w-3.5 h-3.5 ${
              change30 != null && change30 >= 0 ? "text-emerald-400" : "text-red-400"
            }`}
          />
          <span
            className={`font-mono text-sm ${
              change30 != null && change30 >= 0 ? "text-emerald-400" : "text-red-400"
            }`}
          >
            {change30 != null
              ? `${change30 >= 0 ? "+" : ""}${change30.toFixed(1)}%`
              : "—"}
          </span>
          <span className="text-[10px] text-zinc-600">30d</span>
        </div>
        <div className="w-px h-4 bg-zinc-800" />
        <div className="flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5 text-blue-400" />
          <span className="font-mono text-sm text-zinc-300">
            €{avgM2.toLocaleString()}
          </span>
          <span className="text-[10px] text-zinc-600">/m² {avgLabel}</span>
        </div>
      </div>
    </div>
  );
}
