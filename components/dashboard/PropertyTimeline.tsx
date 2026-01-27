"use client";

import { useEffect, useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  Camera,
  FileText,
  Calendar,
  Tag,
  Loader2,
  ArrowRight,
  Link2,
  X,
} from "lucide-react";

interface TimelineEvent {
  type: "listed" | "price_change" | "update";
  date: string;
  data: {
    price?: number;
    from?: number;
    to?: number;
    change?: number;
    changePercent?: number;
    photosChanged?: boolean;
    descriptionChanged?: boolean;
    priceChange?: number | null;
    priceChangePercent?: number | null;
  };
}

interface PropertyMatch {
  matchId: string;
  property: {
    id: string;
    title: string;
    address: string;
    price: number;
    area_m2: number;
    source_url: string | null;
    createdAt: string;
  };
  matchScore: number;
  matchReason: string[];
  isConfirmed: boolean;
}

interface PropertyHistoryData {
  property: {
    id: string;
    title: string;
    address: string;
    city: string;
    district: string;
    price: number;
    area_m2: number;
    price_per_m2: number;
    rooms: number | null;
    source_url: string | null;
    first_listed_at: string | null;
    days_on_market: number;
    investmentMetrics: {
      gross_yield: number;
      net_yield: number;
    } | null;
  };
  priceHistory: Array<{
    id: string;
    price: number;
    price_per_m2: number;
    recorded_at: string;
  }>;
  priceChanges: Array<{
    from: number;
    to: number;
    change: number;
    changePercent: number;
    date: string;
  }>;
  matches: PropertyMatch[];
  timeline: TimelineEvent[];
  stats: {
    daysOnMarket: number;
    totalPriceChanges: number;
    totalPriceChange: number;
    matchesCount: number;
  };
}

interface PropertyTimelineProps {
  propertyId: string;
  onClose?: () => void;
}

export function PropertyTimeline({ propertyId, onClose }: PropertyTimelineProps) {
  const [data, setData] = useState<PropertyHistoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"timeline" | "matches">("timeline");

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/v1/property-history/${propertyId}`);
        
        if (!response.ok) {
          throw new Error("Failed to fetch property history");
        }
        
        const result = await response.json();
        setData(result.data);
        setError(null);
      } catch (err) {
        console.error("Error fetching property history:", err);
        setError("Nepodarilo sa načítať históriu nehnuteľnosti");
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [propertyId]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("sk-SK", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
        <div className="text-red-400">{error || "Nehnuteľnosť nebola nájdená"}</div>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-zinc-800">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-base font-semibold text-zinc-100 mb-1">
              {data.property.title}
            </h2>
            <p className="text-zinc-400">
              {data.property.district}, {data.property.city}
            </p>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-zinc-800 text-zinc-400 hover:text-zinc-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-zinc-800/50 rounded-lg p-3">
            <div className="text-sm text-zinc-400 mb-1">Aktuálna cena</div>
            <div className="text-lg font-bold text-zinc-100">
              €{data.property.price.toLocaleString()}
            </div>
          </div>
          <div className="bg-zinc-800/50 rounded-lg p-3">
            <div className="text-sm text-zinc-400 mb-1">Dni v ponuke</div>
            <div className="text-lg font-bold text-zinc-100">
              {data.stats.daysOnMarket}
            </div>
          </div>
          <div className="bg-zinc-800/50 rounded-lg p-3">
            <div className="text-sm text-zinc-400 mb-1">Zmeny ceny</div>
            <div className="text-lg font-bold text-zinc-100">
              {data.stats.totalPriceChanges}x
            </div>
          </div>
          <div className="bg-zinc-800/50 rounded-lg p-3">
            <div className="text-sm text-zinc-400 mb-1">Celková zmena</div>
            <div className={`text-lg font-bold ${
              data.stats.totalPriceChange < 0 ? "text-emerald-400" : 
              data.stats.totalPriceChange > 0 ? "text-red-400" : "text-zinc-100"
            }`}>
              {data.stats.totalPriceChange > 0 ? "+" : ""}
              €{data.stats.totalPriceChange.toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-800">
        <button
          onClick={() => setActiveTab("timeline")}
          className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
            activeTab === "timeline"
              ? "text-emerald-400 border-b-2 border-emerald-400"
              : "text-zinc-400 hover:text-zinc-100"
          }`}
        >
          História zmien ({data.timeline.length})
        </button>
        <button
          onClick={() => setActiveTab("matches")}
          className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
            activeTab === "matches"
              ? "text-emerald-400 border-b-2 border-emerald-400"
              : "text-zinc-400 hover:text-zinc-100"
          }`}
        >
          Podobné inzeráty ({data.matches.length})
        </button>
      </div>

      {/* Content */}
      <div className="p-6 max-h-[500px] overflow-y-auto">
        {activeTab === "timeline" ? (
          <div className="space-y-4">
            {data.timeline.length === 0 ? (
              <p className="text-zinc-400 text-center py-8">
                Zatiaľ neboli zaznamenané žiadne zmeny
              </p>
            ) : (
              data.timeline.map((event, idx) => (
                <div key={idx} className="flex gap-4">
                  {/* Icon */}
                  <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                    event.type === "listed" ? "bg-blue-500/20 text-blue-400" :
                    event.type === "price_change" 
                      ? (event.data.change && event.data.change < 0 ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400")
                      : "bg-purple-500/20 text-purple-400"
                  }`}>
                    {event.type === "listed" && <Tag className="w-5 h-5" />}
                    {event.type === "price_change" && (
                      event.data.change && event.data.change < 0 
                        ? <TrendingDown className="w-5 h-5" />
                        : <TrendingUp className="w-5 h-5" />
                    )}
                    {event.type === "update" && (
                      event.data.photosChanged ? <Camera className="w-5 h-5" /> : <FileText className="w-5 h-5" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 bg-zinc-800/30 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-zinc-100">
                        {event.type === "listed" && "Zverejnené"}
                        {event.type === "price_change" && "Zmena ceny"}
                        {event.type === "update" && "Aktualizácia"}
                      </span>
                      <span className="text-sm text-zinc-400 flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {formatDate(event.date)}
                      </span>
                    </div>

                    {event.type === "listed" && event.data.price && (
                      <p className="text-zinc-300">
                        Počiatočná cena: <span className="font-bold">€{event.data.price.toLocaleString()}</span>
                      </p>
                    )}

                    {event.type === "price_change" && (
                      <div className="flex items-center gap-2 text-zinc-300">
                        <span>€{event.data.from?.toLocaleString()}</span>
                        <ArrowRight className="w-4 h-4 text-zinc-500" />
                        <span className="font-bold">€{event.data.to?.toLocaleString()}</span>
                        <span className={`ml-2 ${
                          event.data.change && event.data.change < 0 ? "text-emerald-400" : "text-red-400"
                        }`}>
                          ({event.data.changePercent && event.data.changePercent > 0 ? "+" : ""}
                          {event.data.changePercent?.toFixed(1)}%)
                        </span>
                      </div>
                    )}

                    {event.type === "update" && (
                      <div className="space-y-1 text-sm text-zinc-400">
                        {event.data.photosChanged && (
                          <p className="flex items-center gap-2">
                            <Camera className="w-4 h-4" />
                            Zmenené fotky
                          </p>
                        )}
                        {event.data.descriptionChanged && (
                          <p className="flex items-center gap-2">
                            <FileText className="w-4 h-4" />
                            Zmenený popis
                          </p>
                        )}
                        {event.data.priceChange && (
                          <p className={`flex items-center gap-2 ${
                            event.data.priceChange < 0 ? "text-emerald-400" : "text-red-400"
                          }`}>
                            {event.data.priceChange < 0 ? <TrendingDown className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
                            Cena: {event.data.priceChange > 0 ? "+" : ""}€{event.data.priceChange.toLocaleString()}
                            ({event.data.priceChangePercent && event.data.priceChangePercent > 0 ? "+" : ""}
                            {event.data.priceChangePercent?.toFixed(1)}%)
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {data.matches.length === 0 ? (
              <p className="text-zinc-400 text-center py-8">
                Neboli nájdené žiadne podobné inzeráty
              </p>
            ) : (
              data.matches.map((match) => (
                <div
                  key={match.matchId}
                  className="bg-zinc-800/30 rounded-lg p-4 border border-zinc-700/50"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-medium text-zinc-100">
                          {match.property.title}
                        </h4>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          match.matchScore >= 80 ? "bg-emerald-500/20 text-emerald-400" :
                          match.matchScore >= 60 ? "bg-yellow-500/20 text-yellow-400" :
                          "bg-zinc-700 text-zinc-300"
                        }`}>
                          {match.matchScore}% zhoda
                        </span>
                      </div>
                      <p className="text-sm text-zinc-400 mb-2">
                        {match.property.address}
                      </p>
                      <div className="flex flex-wrap gap-3 text-sm">
                        <span className="text-zinc-300">
                          €{match.property.price.toLocaleString()}
                        </span>
                        <span className="text-zinc-400">
                          {match.property.area_m2} m²
                        </span>
                        <span className="text-zinc-500">
                          {formatDate(match.property.createdAt)}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {match.matchReason.map((reason, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded-full text-xs bg-zinc-700 text-zinc-300"
                          >
                            {reason}
                          </span>
                        ))}
                      </div>
                    </div>
                    {match.property.source_url && (
                      <a
                        href={match.property.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-lg bg-zinc-700/50 text-zinc-400 hover:text-blue-400 transition-colors"
                      >
                        <Link2 className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
