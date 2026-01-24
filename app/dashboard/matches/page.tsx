"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Scale,
  ExternalLink,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
  Filter,
  TrendingDown,
  Building,
  RefreshCw,
} from "lucide-react";

// Source badge colors and labels
const SOURCE_COLORS: Record<string, string> = {
  BAZOS: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  NEHNUTELNOSTI: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  REALITY: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  TOPREALITY: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  MANUAL: "bg-slate-500/20 text-slate-400 border-slate-500/30",
};

const SOURCE_LABELS: Record<string, string> = {
  BAZOS: "Bazoš",
  NEHNUTELNOSTI: "Nehnuteľnosti.sk",
  REALITY: "Reality.sk",
  TOPREALITY: "Topreality.sk",
  MANUAL: "Manuálne",
};

interface MatchProperty {
  id: string;
  title: string;
  description: string | null;
  price: number;
  pricePerM2: number;
  areaM2: number;
  rooms: number | null;
  floor: number | null;
  city: string;
  district: string;
  address: string;
  source: string;
  sourceUrl: string | null;
  listingType: string;
  daysOnMarket: number;
  isCheaper: boolean;
}

interface MatchDetail {
  id: string;
  score: number;
  isConfirmed: boolean;
  confirmedBy: string | null;
  comparison: {
    priceDifference: number;
    priceDifferencePercent: string;
    cheaperSource: string;
    savings: number;
  };
  properties: MatchProperty[];
}

interface MatchListItem {
  id: string;
  score: number;
  isConfirmed: boolean;
  properties: Array<{
    id: string;
    title: string;
    price: number;
    pricePerM2: number;
    areaM2: number;
    city: string;
    district: string;
    source: string;
    sourceUrl: string | null;
  }>;
  priceDifference: number;
  priceDifferencePercent: string;
  cheaperSource: string;
}

async function fetchMatches(minScore: number): Promise<MatchListItem[]> {
  const response = await fetch(`/api/v1/property-matches?minScore=${minScore}&limit=50`);
  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error || "Failed to fetch matches");
  }
  return data.data;
}

async function fetchMatchDetail(id: string): Promise<MatchDetail> {
  const response = await fetch(`/api/v1/property-matches/${id}`);
  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error || "Failed to fetch match detail");
  }
  return data.data;
}

export default function MatchesPage() {
  const queryClient = useQueryClient();
  const [minScore, setMinScore] = useState(60);
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);

  const { data: matches, isLoading, error, refetch } = useQuery({
    queryKey: ["property-matches", minScore],
    queryFn: () => fetchMatches(minScore),
  });

  const { data: matchDetail, isLoading: isLoadingDetail } = useQuery({
    queryKey: ["match-detail", selectedMatchId],
    queryFn: () => fetchMatchDetail(selectedMatchId!),
    enabled: !!selectedMatchId,
  });

  const confirmMutation = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: "confirm" | "reject" }) => {
      const response = await fetch(`/api/v1/property-matches/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["property-matches"] });
      queryClient.invalidateQueries({ queryKey: ["match-detail", selectedMatchId] });
    },
  });

  const runMatchingMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/v1/property-matches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ runBatch: true, minScore }),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["property-matches"] });
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Porovnanie cien</h1>
          <p className="text-slate-400">Rovnaké nehnuteľnosti na rôznych portáloch</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => runMatchingMutation.mutate()}
            disabled={runMatchingMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${runMatchingMutation.isPending ? "animate-spin" : ""}`} />
            {runMatchingMutation.isPending ? "Hľadám..." : "Nájsť matches"}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 bg-slate-800/50 rounded-xl border border-slate-700 p-4">
        <Filter className="w-5 h-5 text-slate-400" />
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-400">Min. zhoda:</label>
          <select
            value={minScore}
            onChange={(e) => setMinScore(parseInt(e.target.value, 10))}
            className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-100"
          >
            <option value={50}>50%</option>
            <option value={60}>60%</option>
            <option value={70}>70%</option>
            <option value={80}>80%</option>
            <option value={90}>90%</option>
          </select>
        </div>
        <div className="text-sm text-slate-500">
          {matches?.length || 0} matches nájdených
        </div>
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Match List */}
        <div className="lg:col-span-1 space-y-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
            </div>
          ) : error ? (
            <div className="flex items-center gap-2 text-rose-400 p-4">
              <AlertCircle className="w-5 h-5" />
              <span>Nepodarilo sa načítať matches</span>
            </div>
          ) : matches && matches.length > 0 ? (
            matches.map((match) => (
              <button
                key={match.id}
                onClick={() => setSelectedMatchId(match.id)}
                className={`w-full text-left bg-slate-800/50 rounded-lg border p-4 transition-colors ${
                  selectedMatchId === match.id
                    ? "border-emerald-500/50 bg-emerald-500/5"
                    : "border-slate-700 hover:border-slate-600"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-200 truncate max-w-[180px]">
                    {match.properties[0].title.substring(0, 35)}...
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    match.score >= 90 ? "bg-emerald-500/20 text-emerald-400" :
                    match.score >= 70 ? "bg-amber-500/20 text-amber-400" :
                    "bg-slate-600/50 text-slate-400"
                  }`}>
                    {match.score}%
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span>{match.properties[0].areaM2}m²</span>
                  <span>•</span>
                  <span>{match.properties[0].city}</span>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  {match.properties.map((p) => (
                    <span
                      key={p.id}
                      className={`text-xs px-2 py-0.5 rounded border ${SOURCE_COLORS[p.source]}`}
                    >
                      {SOURCE_LABELS[p.source]}
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-2 mt-2 text-sm">
                  <TrendingDown className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400 font-medium">
                    -{match.priceDifferencePercent}%
                  </span>
                  <span className="text-slate-500">
                    ({match.priceDifference.toLocaleString("sk-SK")} €)
                  </span>
                </div>
              </button>
            ))
          ) : (
            <div className="text-center py-12 text-slate-500">
              <Building className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Žiadne matches</p>
              <p className="text-sm mt-1">Skús znížiť minimálnu zhodu</p>
            </div>
          )}
        </div>

        {/* Match Detail */}
        <div className="lg:col-span-2">
          {selectedMatchId ? (
            isLoadingDetail ? (
              <div className="flex items-center justify-center py-12 bg-slate-800/50 rounded-xl border border-slate-700">
                <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
              </div>
            ) : matchDetail ? (
              <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
                {/* Detail Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <Scale className="w-6 h-6 text-purple-400" />
                    <div>
                      <h2 className="text-lg font-bold text-slate-100">Detail porovnania</h2>
                      <p className="text-sm text-slate-400">
                        Zhoda: {matchDetail.score}% • 
                        Úspora: {matchDetail.comparison.savings.toLocaleString("sk-SK")} €
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => confirmMutation.mutate({ id: matchDetail.id, action: "confirm" })}
                      disabled={confirmMutation.isPending}
                      className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30 transition-colors"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Potvrdiť
                    </button>
                    <button
                      onClick={() => confirmMutation.mutate({ id: matchDetail.id, action: "reject" })}
                      disabled={confirmMutation.isPending}
                      className="flex items-center gap-1 px-3 py-1.5 bg-rose-500/20 text-rose-400 rounded-lg hover:bg-rose-500/30 transition-colors"
                    >
                      <XCircle className="w-4 h-4" />
                      Odmietnuť
                    </button>
                  </div>
                </div>

                {/* Property Comparison */}
                <div className="grid grid-cols-2 gap-4">
                  {matchDetail.properties.map((property) => (
                    <div
                      key={property.id}
                      className={`rounded-xl p-4 border ${
                        property.isCheaper
                          ? "bg-emerald-500/5 border-emerald-500/30"
                          : "bg-slate-900/50 border-slate-700"
                      }`}
                    >
                      {/* Source Badge */}
                      <div className="flex items-center justify-between mb-3">
                        <span className={`text-sm px-2 py-1 rounded border ${SOURCE_COLORS[property.source]}`}>
                          {SOURCE_LABELS[property.source]}
                        </span>
                        {property.isCheaper && (
                          <span className="text-xs px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded-full">
                            Najlacnejšie
                          </span>
                        )}
                      </div>

                      {/* Title */}
                      <h3 className="font-medium text-slate-100 mb-2 line-clamp-2">
                        {property.title}
                      </h3>

                      {/* Price */}
                      <div className={`text-2xl font-bold mb-2 ${
                        property.isCheaper ? "text-emerald-400" : "text-slate-200"
                      }`}>
                        {property.price.toLocaleString("sk-SK")} €
                      </div>
                      <div className="text-sm text-slate-400 mb-4">
                        {property.pricePerM2.toLocaleString("sk-SK")} €/m²
                      </div>

                      {/* Details */}
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Plocha</span>
                          <span className="text-slate-300">{property.areaM2} m²</span>
                        </div>
                        {property.rooms && (
                          <div className="flex justify-between">
                            <span className="text-slate-500">Izby</span>
                            <span className="text-slate-300">{property.rooms}</span>
                          </div>
                        )}
                        {property.floor !== null && (
                          <div className="flex justify-between">
                            <span className="text-slate-500">Poschodie</span>
                            <span className="text-slate-300">{property.floor}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-slate-500">Lokalita</span>
                          <span className="text-slate-300">{property.district}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Dni na trhu</span>
                          <span className="text-slate-300">{property.daysOnMarket}</span>
                        </div>
                      </div>

                      {/* Link */}
                      {property.sourceUrl && (
                        <a
                          href={property.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`flex items-center justify-center gap-2 mt-4 py-2 rounded-lg transition-colors ${
                            property.isCheaper
                              ? "bg-emerald-500 hover:bg-emerald-600 text-white"
                              : "bg-slate-700 hover:bg-slate-600 text-slate-200"
                          }`}
                        >
                          Otvoriť inzerát
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>

                {/* Savings Summary */}
                <div className="mt-6 p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TrendingDown className="w-5 h-5 text-emerald-400" />
                      <span className="text-slate-300">Potenciálna úspora</span>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-emerald-400">
                        {matchDetail.comparison.savings.toLocaleString("sk-SK")} €
                      </div>
                      <div className="text-sm text-emerald-400/70">
                        {matchDetail.comparison.priceDifferencePercent}% lacnejšie na {SOURCE_LABELS[matchDetail.comparison.cheaperSource]}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : null
          ) : (
            <div className="flex items-center justify-center py-24 bg-slate-800/50 rounded-xl border border-slate-700">
              <div className="text-center text-slate-500">
                <Scale className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Vyber match pre zobrazenie detailu</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
