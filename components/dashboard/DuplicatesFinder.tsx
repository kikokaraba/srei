"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Copy,
  ExternalLink,
  TrendingDown,
  AlertCircle,
  CheckCircle,
  ChevronRight,
  Sparkles,
} from "lucide-react";

interface DuplicateProperty {
  id: string;
  source: string;
  title: string;
  price: number;
  pricePerM2: number;
  city: string;
  district: string | null;
  url: string | null;
  isBestPrice: boolean;
}

interface DuplicateGroup {
  fingerprint: string;
  count: number;
  properties: DuplicateProperty[];
  bestPrice: number;
  worstPrice: number;
  potentialSavings: number;
  savingsPercent: number;
  sources: string[];
}

interface DuplicatesResponse {
  success: boolean;
  data: {
    groups: DuplicateGroup[];
    totalGroups: number;
    totalSavings: number;
  };
}

const SOURCE_COLORS: Record<string, { bg: string; text: string }> = {
  NEHNUTELNOSTI: { bg: "bg-blue-500/20", text: "text-blue-400" },
  REALITY: { bg: "bg-purple-500/20", text: "text-purple-400" },
  BAZOS: { bg: "bg-amber-500/20", text: "text-amber-400" },
  TOPREALITY: { bg: "bg-emerald-500/20", text: "text-emerald-400" },
};

export function DuplicatesFinder() {
  const { data, isLoading } = useQuery<DuplicatesResponse>({
    queryKey: ["investor-duplicates"],
    queryFn: async () => {
      const res = await fetch("/api/v1/investor/duplicates");
      return res.json();
    },
    staleTime: 1000 * 60 * 5,
  });

  if (isLoading) {
    return (
      <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6 animate-pulse">
        <div className="h-6 bg-slate-700 rounded w-1/3 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-slate-700/50 rounded" />
          ))}
        </div>
      </div>
    );
  }

  const groups = data?.data?.groups || [];
  const totalSavings = data?.data?.totalSavings || 0;

  return (
    <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/20 rounded-xl border border-slate-700/50 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
            <Copy className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Duplicitné inzeráty</h2>
            <p className="text-xs text-slate-400">Rovnaká nehnuteľnosť, rôzne ceny</p>
          </div>
        </div>
        
        {totalSavings > 0 && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-4 py-2">
            <p className="text-xs text-emerald-400">Potenciálna úspora</p>
            <p className="text-lg font-bold text-emerald-400">
              {totalSavings.toLocaleString()} €
            </p>
          </div>
        )}
      </div>

      {/* List */}
      {groups.length === 0 ? (
        <div className="text-center py-8">
          <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
          <p className="text-slate-400">Žiadne duplicity nenájdené</p>
          <p className="text-xs text-slate-500">Všetky inzeráty sú unikátne</p>
        </div>
      ) : (
        <div className="space-y-4">
          {groups.slice(0, 5).map((group) => (
            <div 
              key={group.fingerprint}
              className="bg-slate-800/50 rounded-lg p-4 hover:bg-slate-800/70 transition-all"
            >
              {/* Group Header */}
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-white font-medium">
                    {group.properties[0]?.title?.substring(0, 50)}...
                  </p>
                  <p className="text-sm text-slate-400">
                    {group.properties[0]?.city} • {group.properties[0]?.district}
                  </p>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1 text-emerald-400">
                    <TrendingDown className="w-4 h-4" />
                    <span className="font-bold">-{group.savingsPercent}%</span>
                  </div>
                  <p className="text-xs text-slate-500">úspora {group.potentialSavings.toLocaleString()} €</p>
                </div>
              </div>

              {/* Listings */}
              <div className="space-y-2">
                {group.properties.map((prop) => (
                  <div 
                    key={prop.id}
                    className={`flex items-center justify-between p-2 rounded ${
                      prop.isBestPrice 
                        ? "bg-emerald-500/10 border border-emerald-500/20" 
                        : "bg-slate-700/30"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        SOURCE_COLORS[prop.source]?.bg || "bg-slate-700"
                      } ${SOURCE_COLORS[prop.source]?.text || "text-slate-400"}`}>
                        {prop.source}
                      </span>
                      <span className="text-white font-medium">
                        {prop.price.toLocaleString()} €
                      </span>
                      <span className="text-xs text-slate-500">
                        ({prop.pricePerM2?.toLocaleString()} €/m²)
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {prop.isBestPrice && (
                        <span className="flex items-center gap-1 text-xs text-emerald-400">
                          <Sparkles className="w-3 h-3" />
                          Najlepšia cena
                        </span>
                      )}
                      {prop.url && (
                        <a 
                          href={prop.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 text-slate-400 hover:text-white transition-colors"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Recommendation */}
              <div className="mt-3 flex items-center gap-2 text-xs text-amber-400">
                <AlertCircle className="w-3 h-3" />
                <span>
                  {group.savingsPercent > 10 
                    ? `Kontaktuj ${group.properties.find(p => p.isBestPrice)?.source} - o ${group.savingsPercent}% lacnejšie!`
                    : "Porovnaj podmienky a vyber najlepšiu ponuku"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Show more */}
      {groups.length > 5 && (
        <button className="w-full mt-4 py-2 text-center text-slate-400 hover:text-white transition-colors flex items-center justify-center gap-2">
          Zobraziť ďalších {groups.length - 5} skupín
          <ChevronRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
