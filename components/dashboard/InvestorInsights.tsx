"use client";

import { useQuery } from "@tanstack/react-query";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  CheckCircle,
  Target,
  Clock,
  Shield,
  Zap,
  ChevronRight,
} from "lucide-react";

interface PriceMomentum {
  city: string;
  trend: "rising" | "stable" | "falling";
  changePercent30d: number;
  avgPricePerM2: number;
  signal: "buy" | "hold" | "negotiate";
  confidence: number;
}

interface MomentumResponse {
  success: boolean;
  data: {
    momentumByCity: PriceMomentum[];
    summary: {
      fallingMarkets: string[];
      risingMarkets: string[];
      bestNegotiationOpportunity: string;
      hottest: string;
    };
  };
}

const CITY_NAMES: Record<string, string> = {
  BRATISLAVA: "Bratislava",
  KOSICE: "Košice",
  PRESOV: "Prešov",
  ZILINA: "Žilina",
  BANSKA_BYSTRICA: "B. Bystrica",
  TRNAVA: "Trnava",
  TRENCIN: "Trenčín",
  NITRA: "Nitra",
};

export function InvestorInsights() {
  const { data, isLoading } = useQuery<MomentumResponse>({
    queryKey: ["investor-momentum"],
    queryFn: async () => {
      const res = await fetch("/api/v1/investor/metrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      return res.json();
    },
    staleTime: 1000 * 60 * 15, // 15 minút
  });

  if (isLoading) {
    return (
      <div className="bg-zinc-800/50 rounded-xl border border-zinc-700 p-6 animate-pulse">
        <div className="h-6 bg-zinc-700 rounded w-1/3 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-12 bg-zinc-700/50 rounded" />
          ))}
        </div>
      </div>
    );
  }

  const momentum = data?.data?.momentumByCity || [];
  const summary = data?.data?.summary;

  return (
    <div className="bg-gradient-to-br from-zinc-900 via-zinc-900 to-indigo-950/30 rounded-xl border border-zinc-700/50 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
            <Target className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Price Momentum</h2>
            <p className="text-xs text-zinc-400">Kam smerujú ceny v reálnom čase</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 bg-zinc-800/50 rounded-full">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs text-zinc-400">Live</span>
        </div>
      </div>

      {/* Quick Summary */}
      {summary && (
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown className="w-4 h-4 text-rose-400" />
              <span className="text-xs font-medium text-rose-400">Klesajúce trhy</span>
            </div>
            <p className="text-sm text-white">
              {summary.fallingMarkets.length > 0 
                ? summary.fallingMarkets.map(c => CITY_NAMES[c]).join(", ")
                : "Žiadne"}
            </p>
            <p className="text-xs text-rose-400/70 mt-1">Najlepšie na vyjednávanie</p>
          </div>
          
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-medium text-emerald-400">Rastúce trhy</span>
            </div>
            <p className="text-sm text-white">
              {summary.risingMarkets.length > 0 
                ? summary.risingMarkets.map(c => CITY_NAMES[c]).join(", ")
                : "Žiadne"}
            </p>
            <p className="text-xs text-emerald-400/70 mt-1">Kúp teraz alebo nikdy</p>
          </div>
        </div>
      )}

      {/* Momentum List */}
      <div className="space-y-2">
        {momentum.map((m) => (
          <div 
            key={m.city}
            className="flex items-center gap-3 p-3 bg-zinc-800/30 hover:bg-zinc-800/50 rounded-lg transition-all cursor-pointer group"
          >
            {/* Trend Icon */}
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              m.trend === "rising" 
                ? "bg-emerald-500/20" 
                : m.trend === "falling" 
                ? "bg-rose-500/20" 
                : "bg-zinc-700/50"
            }`}>
              {m.trend === "rising" ? (
                <TrendingUp className="w-4 h-4 text-emerald-400" />
              ) : m.trend === "falling" ? (
                <TrendingDown className="w-4 h-4 text-rose-400" />
              ) : (
                <Minus className="w-4 h-4 text-zinc-400" />
              )}
            </div>

            {/* City */}
            <div className="flex-1">
              <p className="font-medium text-white">{CITY_NAMES[m.city] || m.city}</p>
              <p className="text-xs text-zinc-400">
                Ø {m.avgPricePerM2.toLocaleString()} €/m²
              </p>
            </div>

            {/* Change */}
            <div className={`text-right ${
              m.changePercent30d > 0 
                ? "text-emerald-400" 
                : m.changePercent30d < 0 
                ? "text-rose-400" 
                : "text-zinc-400"
            }`}>
              <p className="font-semibold">
                {m.changePercent30d > 0 ? "+" : ""}{m.changePercent30d}%
              </p>
              <p className="text-xs opacity-70">30 dní</p>
            </div>

            {/* Signal */}
            <div className={`px-2 py-1 rounded text-xs font-medium ${
              m.signal === "buy" 
                ? "bg-emerald-500/20 text-emerald-400" 
                : m.signal === "negotiate" 
                ? "bg-amber-500/20 text-amber-400" 
                : "bg-zinc-700/50 text-zinc-400"
            }`}>
              {m.signal === "buy" ? "KÚP" : m.signal === "negotiate" ? "VYJEDNÁVAJ" : "ČAK"}
            </div>

            <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-6 pt-4 border-t border-zinc-800">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400" />
          <span className="text-xs text-zinc-500">Rastúci</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-zinc-400" />
          <span className="text-xs text-zinc-500">Stabilný</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-rose-400" />
          <span className="text-xs text-zinc-500">Klesajúci</span>
        </div>
      </div>
    </div>
  );
}

// Trust Score Badge pre property card
export function TrustScoreBadge({ 
  score, 
  level 
}: { 
  score: number; 
  level: "high" | "medium" | "low" | "suspicious" 
}) {
  const config = {
    high: { bg: "bg-emerald-500/20", text: "text-emerald-400", icon: CheckCircle, label: "Dôveryhodný" },
    medium: { bg: "bg-blue-500/20", text: "text-blue-400", icon: Shield, label: "OK" },
    low: { bg: "bg-amber-500/20", text: "text-amber-400", icon: AlertTriangle, label: "Pozor" },
    suspicious: { bg: "bg-rose-500/20", text: "text-rose-400", icon: AlertTriangle, label: "Podozrivý" },
  };

  const { bg, text, icon: Icon, label } = config[level];

  return (
    <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full ${bg}`}>
      <Icon className={`w-3 h-3 ${text}`} />
      <span className={`text-xs font-medium ${text}`}>{score}</span>
      <span className="text-xs text-zinc-500">{label}</span>
    </div>
  );
}

// Negotiation Power Badge
export function NegotiationPowerBadge({ 
  score, 
  suggestedDiscount 
}: { 
  score: number;
  suggestedDiscount: number;
}) {
  const level = score >= 70 ? "strong" : score >= 40 ? "medium" : "weak";
  
  const config = {
    strong: { bg: "bg-emerald-500/20", text: "text-emerald-400", label: "Silná pozícia" },
    medium: { bg: "bg-amber-500/20", text: "text-amber-400", label: "Stredná pozícia" },
    weak: { bg: "bg-zinc-700/50", text: "text-zinc-400", label: "Slabá pozícia" },
  };

  const { bg, text, label } = config[level];

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg ${bg}`}>
      <Zap className={`w-4 h-4 ${text}`} />
      <div>
        <p className={`text-sm font-medium ${text}`}>{label}</p>
        {suggestedDiscount > 0 && (
          <p className="text-xs text-zinc-400">Navrhni -{suggestedDiscount}%</p>
        )}
      </div>
    </div>
  );
}

// Price Story Timeline
export function PriceStoryTimeline({ 
  story 
}: { 
  story: Array<{ date: string; price: number; change: number; event: string }>;
}) {
  return (
    <div className="space-y-3">
      {story.map((point, index) => (
        <div key={index} className="flex items-start gap-3">
          <div className="flex flex-col items-center">
            <div className={`w-3 h-3 rounded-full ${
              point.change < 0 
                ? "bg-emerald-400" 
                : point.change > 0 
                ? "bg-rose-400" 
                : "bg-zinc-400"
            }`} />
            {index < story.length - 1 && (
              <div className="w-0.5 h-8 bg-zinc-700" />
            )}
          </div>
          <div className="flex-1 pb-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-white">
                {point.price.toLocaleString()} €
              </p>
              {point.change !== 0 && (
                <span className={`text-xs ${point.change < 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  {point.change > 0 ? "+" : ""}{point.change}%
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-400">{point.event}</p>
            <p className="text-xs text-zinc-500">{point.date}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
