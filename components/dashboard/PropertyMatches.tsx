"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Scale,
  ExternalLink,
  ChevronRight,
  TrendingDown,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
  Building,
} from "lucide-react";
import Link from "next/link";

// Source badge colors
const SOURCE_COLORS: Record<string, string> = {
  BAZOS: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  REALITY: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  TOPREALITY: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  MANUAL: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
};

const SOURCE_LABELS: Record<string, string> = {
  BAZOS: "Bazoš",
  REALITY: "Reality.sk",
  TOPREALITY: "Topreality.sk",
  MANUAL: "Manuálne",
};

interface MatchProperty {
  id: string;
  title: string;
  price: number;
  pricePerM2: number;
  areaM2: number;
  city: string;
  district: string;
  source: string;
  sourceUrl: string | null;
  listingType: string;
}

interface PropertyMatch {
  id: string;
  score: number;
  isConfirmed: boolean;
  properties: MatchProperty[];
  priceDifference: number;
  priceDifferencePercent: string;
  cheaperSource: string;
}

async function fetchMatches(): Promise<PropertyMatch[]> {
  const response = await fetch("/api/v1/property-matches?minScore=60&limit=10");
  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error || "Failed to fetch matches");
  }
  return data.data;
}

export default function PropertyMatches() {
  const { data: matches, isLoading, error } = useQuery({
    queryKey: ["property-matches"],
    queryFn: fetchMatches,
  });

  if (isLoading) {
    return (
      <div className="bg-zinc-800/50 rounded-xl border border-zinc-700 p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
          <span className="ml-2 text-zinc-400">Načítavam matches...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-zinc-800/50 rounded-xl border border-zinc-700 p-6">
        <div className="flex items-center gap-2 text-rose-400">
          <AlertCircle className="w-5 h-5" />
          <span>Nepodarilo sa načítať matches</span>
        </div>
      </div>
    );
  }

  if (!matches || matches.length === 0) {
    return (
      <div className="bg-zinc-800/50 rounded-xl border border-zinc-700 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
            <Scale className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-zinc-100">Porovnanie cien</h2>
            <p className="text-sm text-zinc-400">Rovnaké nehnuteľnosti na rôznych portáloch</p>
          </div>
        </div>
        <div className="text-center py-8 text-zinc-500">
          <Building className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Zatiaľ žiadne matches</p>
          <p className="text-sm mt-1">Spusti scraping pre viac portálov</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-zinc-800/50 rounded-xl border border-zinc-700 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
            <Scale className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-zinc-100">Porovnanie cien</h2>
            <p className="text-sm text-zinc-400">Rovnaké nehnuteľnosti na rôznych portáloch</p>
          </div>
        </div>
        <Link
          href="/dashboard/matches"
          className="text-sm text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
        >
          Zobraziť všetky
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="space-y-4">
        {matches.slice(0, 5).map((match) => (
          <MatchCard key={match.id} match={match} />
        ))}
      </div>
    </div>
  );
}

function MatchCard({ match }: { match: PropertyMatch }) {
  const [p1, p2] = match.properties;
  const cheaper = p1.price <= p2.price ? p1 : p2;
  const moreExpensive = p1.price > p2.price ? p1 : p2;

  return (
    <div className="bg-zinc-900/50 rounded-lg border border-zinc-700 p-4 hover:border-zinc-600 transition-colors">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-zinc-300 truncate max-w-[200px]">
            {p1.title.substring(0, 40)}...
          </span>
          <span className="text-xs text-zinc-500">
            {p1.areaM2}m² • {p1.city}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-0.5 rounded-full ${
            match.score >= 90 ? "bg-emerald-500/20 text-emerald-400" :
            match.score >= 70 ? "bg-amber-500/20 text-amber-400" :
            "bg-zinc-600/50 text-zinc-400"
          }`}>
            {match.score}% zhoda
          </span>
          {match.isConfirmed && (
            <CheckCircle className="w-4 h-4 text-emerald-400" />
          )}
        </div>
      </div>

      {/* Price comparison */}
      <div className="grid grid-cols-2 gap-3">
        {/* Cheaper */}
        <div className="bg-emerald-500/5 rounded-lg p-3 border border-emerald-500/20">
          <div className="flex items-center justify-between mb-2">
            <span className={`text-xs px-2 py-0.5 rounded border ${SOURCE_COLORS[cheaper.source]}`}>
              {SOURCE_LABELS[cheaper.source]}
            </span>
            <TrendingDown className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-base font-semibold text-emerald-400">
            {cheaper.price.toLocaleString("sk-SK")} €
          </div>
          <div className="text-xs text-zinc-400 mt-1">
            {cheaper.pricePerM2.toLocaleString("sk-SK")} €/m²
          </div>
          {cheaper.sourceUrl && (
            <a
              href={cheaper.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 mt-2"
            >
              Otvoriť inzerát
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>

        {/* More expensive */}
        <div className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700">
          <div className="flex items-center justify-between mb-2">
            <span className={`text-xs px-2 py-0.5 rounded border ${SOURCE_COLORS[moreExpensive.source]}`}>
              {SOURCE_LABELS[moreExpensive.source]}
            </span>
          </div>
          <div className="text-base font-semibold text-zinc-300">
            {moreExpensive.price.toLocaleString("sk-SK")} €
          </div>
          <div className="text-xs text-zinc-400 mt-1">
            {moreExpensive.pricePerM2.toLocaleString("sk-SK")} €/m²
          </div>
          {moreExpensive.sourceUrl && (
            <a
              href={moreExpensive.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-300 mt-2"
            >
              Otvoriť inzerát
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>

      {/* Savings */}
      <div className="mt-3 flex items-center justify-center gap-2 text-sm">
        <span className="text-zinc-400">Úspora:</span>
        <span className="font-bold text-emerald-400">
          {match.priceDifference.toLocaleString("sk-SK")} € ({match.priceDifferencePercent}%)
        </span>
      </div>
    </div>
  );
}
