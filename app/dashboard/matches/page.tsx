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
  Sparkles,
  ArrowRight,
} from "lucide-react";
import PremiumGate from "@/components/ui/PremiumGate";

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
  if (!data.success) throw new Error(data.error || "Failed");
  return data.data;
}

async function fetchMatchDetail(id: string): Promise<MatchDetail> {
  const response = await fetch(`/api/v1/property-matches/${id}`);
  const data = await response.json();
  if (!data.success) throw new Error(data.error || "Failed");
  return data.data;
}

function MatchesContent() {
  const queryClient = useQueryClient();
  const [minScore, setMinScore] = useState(60);
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);

  const { data: matches, isLoading, error } = useQuery({
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
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-purple-950/30 p-6 lg:p-8">
        <div className="absolute -top-24 -right-24 w-48 h-48 rounded-full blur-3xl opacity-20 bg-purple-500" />
        
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/20 shrink-0">
              <Scale className="w-7 h-7 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-2xl lg:text-3xl font-bold text-white">
                  Porovnanie cien
                </h1>
                <Sparkles className="w-5 h-5 text-purple-400" />
              </div>
              <p className="text-slate-400 text-sm lg:text-base">
                Rovnaké nehnuteľnosti na rôznych portáloch
              </p>
            </div>
          </div>
          
          <button
            onClick={() => runMatchingMutation.mutate()}
            disabled={runMatchingMutation.isPending}
            className="px-5 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold 
                       rounded-xl transition-all hover:shadow-lg hover:shadow-purple-500/25 
                       disabled:opacity-50 flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${runMatchingMutation.isPending ? "animate-spin" : ""}`} />
            {runMatchingMutation.isPending ? "Hľadám..." : "Nájsť matches"}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-900/50 border border-slate-800">
        <Filter className="w-5 h-5 text-slate-400" />
        <div className="flex items-center gap-3">
          <label className="text-sm text-slate-400">Min. zhoda:</label>
          <div className="flex gap-1">
            {[50, 60, 70, 80, 90].map((score) => (
              <button
                key={score}
                onClick={() => setMinScore(score)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  minScore === score
                    ? "bg-purple-500 text-white"
                    : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                }`}
              >
                {score}%
              </button>
            ))}
          </div>
        </div>
        <div className="ml-auto text-sm text-slate-500">
          {matches?.length || 0} matches
        </div>
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Match List */}
        <div className="lg:col-span-1 space-y-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
            </div>
          ) : error ? (
            <div className="flex items-center gap-2 text-rose-400 p-4">
              <AlertCircle className="w-5 h-5" />
              <span>Nepodarilo sa načítať</span>
            </div>
          ) : matches && matches.length > 0 ? (
            matches.map((match) => (
              <button
                key={match.id}
                onClick={() => setSelectedMatchId(match.id)}
                className={`w-full text-left p-4 rounded-xl transition-all ${
                  selectedMatchId === match.id
                    ? "bg-purple-500/10 border-2 border-purple-500/50"
                    : "bg-slate-800/30 border border-slate-700/50 hover:bg-slate-800/50"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-white truncate max-w-[180px]">
                    {match.properties[0].title.substring(0, 30)}...
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    match.score >= 90 ? "bg-emerald-500/20 text-emerald-400" :
                    match.score >= 70 ? "bg-amber-500/20 text-amber-400" :
                    "bg-slate-700 text-slate-400"
                  }`}>
                    {match.score}%
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                  <span>{match.properties[0].areaM2}m²</span>
                  <span>•</span>
                  <span>{match.properties[0].city}</span>
                </div>
                <div className="flex items-center gap-2">
                  {match.properties.map((p) => (
                    <span key={p.id} className={`text-xs px-2 py-0.5 rounded border ${SOURCE_COLORS[p.source]}`}>
                      {SOURCE_LABELS[p.source]?.split(".")[0]}
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-2 mt-2 text-sm">
                  <TrendingDown className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400 font-medium">-{match.priceDifferencePercent}%</span>
                  <span className="text-slate-500">({match.priceDifference.toLocaleString()} €)</span>
                </div>
              </button>
            ))
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-800/50 flex items-center justify-center">
                <Building className="w-8 h-8 text-slate-600" />
              </div>
              <p className="text-slate-400">Žiadne matches</p>
              <p className="text-sm text-slate-500 mt-1">Skús znížiť minimálnu zhodu</p>
            </div>
          )}
        </div>

        {/* Match Detail */}
        <div className="lg:col-span-2">
          {selectedMatchId ? (
            isLoadingDetail ? (
              <div className="flex items-center justify-center py-24 rounded-2xl bg-slate-800/30 border border-slate-700/50">
                <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
              </div>
            ) : matchDetail ? (
              <div className="rounded-2xl bg-slate-800/30 border border-slate-700/50 p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <Scale className="w-6 h-6 text-purple-400" />
                    <div>
                      <h2 className="text-lg font-bold text-white">Detail porovnania</h2>
                      <p className="text-sm text-slate-400">
                        Zhoda: {matchDetail.score}% • Úspora: {matchDetail.comparison.savings.toLocaleString()} €
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => confirmMutation.mutate({ id: matchDetail.id, action: "confirm" })}
                      disabled={confirmMutation.isPending}
                      className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Potvrdiť
                    </button>
                    <button
                      onClick={() => confirmMutation.mutate({ id: matchDetail.id, action: "reject" })}
                      disabled={confirmMutation.isPending}
                      className="flex items-center gap-1 px-3 py-1.5 bg-rose-500/20 text-rose-400 rounded-lg hover:bg-rose-500/30"
                    >
                      <XCircle className="w-4 h-4" />
                      Odmietnuť
                    </button>
                  </div>
                </div>

                {/* Properties */}
                <div className="grid grid-cols-2 gap-4">
                  {matchDetail.properties.map((property) => (
                    <div
                      key={property.id}
                      className={`rounded-xl p-4 border ${
                        property.isCheaper
                          ? "bg-emerald-500/5 border-emerald-500/30"
                          : "bg-slate-900/50 border-slate-700/50"
                      }`}
                    >
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
                      <h3 className="font-medium text-white mb-2 line-clamp-2">{property.title}</h3>
                      <div className={`text-2xl font-bold mb-1 ${property.isCheaper ? "text-emerald-400" : "text-white"}`}>
                        {property.price.toLocaleString()} €
                      </div>
                      <div className="text-sm text-slate-400 mb-3">{property.pricePerM2.toLocaleString()} €/m²</div>
                      
                      <div className="space-y-1 text-sm">
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
                      </div>

                      {property.sourceUrl && (
                        <a
                          href={property.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`flex items-center justify-center gap-2 mt-4 py-2 rounded-lg transition-colors ${
                            property.isCheaper
                              ? "bg-emerald-500 hover:bg-emerald-600 text-white"
                              : "bg-slate-700 hover:bg-slate-600 text-white"
                          }`}
                        >
                          Otvoriť <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>

                {/* Savings */}
                <div className="mt-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TrendingDown className="w-5 h-5 text-emerald-400" />
                      <span className="text-slate-300">Potenciálna úspora</span>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-emerald-400">
                        {matchDetail.comparison.savings.toLocaleString()} €
                      </div>
                      <div className="text-sm text-emerald-400/70">
                        {matchDetail.comparison.priceDifferencePercent}% lacnejšie
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : null
          ) : (
            <div className="flex items-center justify-center py-24 rounded-2xl bg-slate-800/30 border border-slate-700/50">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-800/50 flex items-center justify-center">
                  <Scale className="w-8 h-8 text-slate-600" />
                </div>
                <p className="text-slate-400">Vyber match pre zobrazenie</p>
                <ArrowRight className="w-5 h-5 text-slate-500 mx-auto mt-2" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MatchesPage() {
  return (
    <PremiumGate feature="aiMatching" minHeight="500px">
      <MatchesContent />
    </PremiumGate>
  );
}
