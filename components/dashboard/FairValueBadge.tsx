"use client";

import { useState, useEffect, memo } from "react";
import { TrendingUp, TrendingDown, Minus, Sparkles, Loader2 } from "lucide-react";

interface FairValueData {
  status: "great_deal" | "good_deal" | "fair" | "overpriced" | "very_overpriced" | "insufficient_data";
  label: string;
  color: string;
  fairValue?: number;
  currentPrice?: number;
  difference?: number;
  differencePercent?: number;
  comparablesCount?: number;
  message?: string;
}

interface FairValueBadgeProps {
  propertyId: string;
  compact?: boolean;
}

const STATUS_CONFIG = {
  great_deal: {
    bg: "bg-emerald-500/20",
    border: "border-emerald-500/50",
    text: "text-emerald-400",
    icon: TrendingDown,
  },
  good_deal: {
    bg: "bg-green-500/20",
    border: "border-green-500/50",
    text: "text-green-400",
    icon: TrendingDown,
  },
  fair: {
    bg: "bg-blue-500/20",
    border: "border-blue-500/50",
    text: "text-blue-400",
    icon: Minus,
  },
  overpriced: {
    bg: "bg-amber-500/20",
    border: "border-amber-500/50",
    text: "text-amber-400",
    icon: TrendingUp,
  },
  very_overpriced: {
    bg: "bg-red-500/20",
    border: "border-red-500/50",
    text: "text-red-400",
    icon: TrendingUp,
  },
  insufficient_data: {
    bg: "bg-zinc-500/20",
    border: "border-zinc-500/50",
    text: "text-zinc-400",
    icon: Minus,
  },
};

export const FairValueBadge = memo(function FairValueBadge({ propertyId, compact = false }: FairValueBadgeProps) {
  const [data, setData] = useState<FairValueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const fetchFairValue = async () => {
      try {
        const response = await fetch(`/api/v1/ai/fair-value?propertyId=${propertyId}`);
        const result = await response.json();
        if (result.success) {
          setData(result.data);
        }
      } catch (error) {
        console.error("Fair value fetch error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchFairValue();
  }, [propertyId]);

  if (loading) {
    return (
      <div className="inline-flex items-center gap-1 px-2 py-1 bg-zinc-700/50 rounded text-xs">
        <Loader2 className="w-3 h-3 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (!data) return null;

  const config = STATUS_CONFIG[data.status];
  const Icon = config.icon;

  if (compact) {
    return (
      <div
        className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs cursor-pointer ${config.bg} ${config.border} border`}
        onClick={() => setExpanded(!expanded)}
        title={data.label}
      >
        <Sparkles className={`w-3 h-3 ${config.text}`} />
        <Icon className={`w-3 h-3 ${config.text}`} />
        {data.differencePercent !== undefined && (
          <span className={config.text}>
            {data.differencePercent > 0 ? "+" : ""}{data.differencePercent}%
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setExpanded(!expanded)}
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium ${config.bg} ${config.border} border transition-all hover:scale-105`}
      >
        <Sparkles className={`w-4 h-4 ${config.text}`} />
        <span className={config.text}>{data.label}</span>
        {data.differencePercent !== undefined && (
          <span className={`${config.text} opacity-75`}>
            ({data.differencePercent > 0 ? "+" : ""}{data.differencePercent}%)
          </span>
        )}
      </button>

      {expanded && data.status !== "insufficient_data" && (
        <div className="absolute top-full left-0 mt-2 z-50 w-64 bg-zinc-800 border border-zinc-700 rounded-xl p-4 shadow-xl">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-zinc-400 text-sm">Aktuálna cena</span>
              <span className="text-zinc-100 font-medium">€{data.currentPrice?.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-zinc-400 text-sm">Férová cena</span>
              <span className="text-violet-400 font-medium">€{data.fairValue?.toLocaleString()}</span>
            </div>
            <div className="h-px bg-zinc-700" />
            <div className="flex justify-between items-center">
              <span className="text-zinc-400 text-sm">Rozdiel</span>
              <span className={`font-medium ${data.difference! > 0 ? "text-red-400" : "text-emerald-400"}`}>
                {data.difference! > 0 ? "+" : ""}€{data.difference?.toLocaleString()}
              </span>
            </div>
            <div className="text-xs text-zinc-500 text-center pt-2">
              Na základe {data.comparablesCount} podobných nehnuteľností
            </div>
          </div>
        </div>
      )}

      {expanded && data.status === "insufficient_data" && (
        <div className="absolute top-full left-0 mt-2 z-50 w-48 bg-zinc-800 border border-zinc-700 rounded-xl p-3 shadow-xl">
          <p className="text-sm text-zinc-400">{data.message}</p>
        </div>
      )}
    </div>
  );
});
