"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Shield,
  TrendingDown,
  TrendingUp,
  Clock,
  AlertTriangle,
  Copy,
  Sparkles,
  Target,
} from "lucide-react";

interface InvestorBadgesProps {
  propertyId: string;
  compact?: boolean;
}

interface PropertyMetrics {
  trustScore: number;
  redFlags: string[];
  greenFlags: string[];
  negotiationPower: number;
  suggestedDiscount: number;
  priceDrops: number;
  daysOnMarket: number;
  hasDuplicates: boolean;
  duplicateCount?: number;
  bestPrice?: number;
  currentPrice: number;
}

/**
 * Automatické investorské badge pre každú property kartu.
 * Zobrazuje Trust Score, Price Drops, Duplicity, Negotiation Power.
 */
export function InvestorBadges({ propertyId, compact = false }: InvestorBadgesProps) {
  const { data: metrics, isLoading } = useQuery<PropertyMetrics>({
    queryKey: ["property-investor-metrics", propertyId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/investor/metrics?type=full&propertyId=${propertyId}`);
      if (!res.ok) return null;
      const json = await res.json();
      return json.success ? json.data : null;
    },
    staleTime: 1000 * 60 * 10, // 10 min cache
    retry: false,
  });

  if (isLoading || !metrics) {
    return null; // Nezobraziť nič kým sa načítava
  }

  const badges = [];

  // Trust Score Badge
  if (metrics.trustScore !== undefined) {
    const trustColor = 
      metrics.trustScore >= 80 ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" :
      metrics.trustScore >= 50 ? "bg-amber-500/20 text-amber-400 border-amber-500/30" :
      "bg-red-500/20 text-red-400 border-red-500/30";
    
    const trustIcon = 
      metrics.trustScore >= 80 ? <Shield className="w-3 h-3" /> :
      metrics.trustScore >= 50 ? <Shield className="w-3 h-3" /> :
      <AlertTriangle className="w-3 h-3" />;

    badges.push(
      <div 
        key="trust" 
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${trustColor}`}
        title={`Trust Score: ${metrics.trustScore}/100\n${metrics.redFlags.join("\n")}`}
      >
        {trustIcon}
        {!compact && <span>{metrics.trustScore}</span>}
      </div>
    );
  }

  // Price Drops Badge
  if (metrics.priceDrops > 0) {
    badges.push(
      <div 
        key="drops" 
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
        title={`${metrics.priceDrops}x zníženie ceny`}
      >
        <TrendingDown className="w-3 h-3" />
        {!compact && <span>-{metrics.priceDrops}x</span>}
      </div>
    );
  }

  // Duplicates Badge
  if (metrics.hasDuplicates && metrics.duplicateCount && metrics.duplicateCount > 1) {
    const savings = metrics.bestPrice && metrics.currentPrice > metrics.bestPrice
      ? Math.round(((metrics.currentPrice - metrics.bestPrice) / metrics.currentPrice) * 100)
      : 0;

    badges.push(
      <div 
        key="duplicates" 
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/20 text-amber-400 border border-amber-500/30"
        title={`Rovnaká nehnuteľnosť na ${metrics.duplicateCount} portáloch${savings > 0 ? `. Ušetri ${savings}%!` : ""}`}
      >
        <Copy className="w-3 h-3" />
        {!compact && <span>{metrics.duplicateCount}x</span>}
      </div>
    );
  }

  // Negotiation Power Badge
  if (metrics.negotiationPower >= 70) {
    badges.push(
      <div 
        key="negotiate" 
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
        title={`Silná vyjednávacia pozícia. Navrhni -${metrics.suggestedDiscount}%`}
      >
        <Target className="w-3 h-3" />
        {!compact && <span>-{metrics.suggestedDiscount}%</span>}
      </div>
    );
  }

  // Days on Market Badge (if stale)
  if (metrics.daysOnMarket > 90) {
    badges.push(
      <div 
        key="stale" 
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-500/20 text-slate-400 border border-slate-500/30"
        title={`Na trhu ${metrics.daysOnMarket} dní - možná motivovaný predajca`}
      >
        <Clock className="w-3 h-3" />
        {!compact && <span>{metrics.daysOnMarket}d</span>}
      </div>
    );
  }

  // Green Flags Badge
  if (metrics.greenFlags && metrics.greenFlags.length > 0) {
    badges.push(
      <div 
        key="green" 
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
        title={metrics.greenFlags.join("\n")}
      >
        <Sparkles className="w-3 h-3" />
      </div>
    );
  }

  if (badges.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-1">
      {badges}
    </div>
  );
}

/**
 * Inline Price Story - zobrazuje históriu ceny priamo v karte
 */
export function PriceStoryInline({ propertyId }: { propertyId: string }) {
  const { data } = useQuery({
    queryKey: ["price-story", propertyId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/investor/metrics?type=story&propertyId=${propertyId}`);
      if (!res.ok) return null;
      const json = await res.json();
      return json.success ? json.data : null;
    },
    staleTime: 1000 * 60 * 10,
    retry: false,
  });

  if (!data || !data.changes || data.changes.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 text-xs text-slate-400">
      {data.changes.slice(0, 3).map((change: { price: number }, i: number) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && <TrendingDown className="w-3 h-3 text-emerald-400" />}
          <span className={i === 0 ? "line-through text-slate-500" : ""}>
            {(change.price / 1000).toFixed(0)}k
          </span>
        </span>
      ))}
      {data.totalChangePercent && data.totalChangePercent < 0 && (
        <span className="text-emerald-400 font-medium">
          ({data.totalChangePercent}%)
        </span>
      )}
    </div>
  );
}

/**
 * Momentum Indicator - ukazuje trend cien v lokalite
 */
export function MomentumIndicator({ city }: { city: string }) {
  const { data } = useQuery({
    queryKey: ["price-momentum", city],
    queryFn: async () => {
      const res = await fetch(`/api/v1/investor/metrics?type=momentum&city=${city}`);
      if (!res.ok) return null;
      const json = await res.json();
      return json.success ? json.data : null;
    },
    staleTime: 1000 * 60 * 30, // 30 min cache
    retry: false,
  });

  if (!data) return null;

  const trendConfig = {
    rising: { icon: TrendingUp, color: "text-red-400", label: "Ceny rastú" },
    falling: { icon: TrendingDown, color: "text-emerald-400", label: "Ceny klesajú" },
    stable: { icon: Clock, color: "text-slate-400", label: "Stabilné" },
  };

  const config = trendConfig[data.trend as keyof typeof trendConfig] || trendConfig.stable;
  const Icon = config.icon;

  return (
    <div className={`inline-flex items-center gap-1 text-xs ${config.color}`} title={config.label}>
      <Icon className="w-3 h-3" />
      <span>{data.change30d > 0 ? "+" : ""}{data.change30d?.toFixed(1)}%</span>
    </div>
  );
}
