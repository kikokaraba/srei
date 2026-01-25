"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Building2,
  TrendingUp,
  MapPin,
  Clock,
  ChevronRight,
  Sparkles,
  AlertCircle,
  Construction,
} from "lucide-react";
import { useState } from "react";

interface Hotspot {
  city: string;
  district?: string;
  impact: number;
  signal: "strong_buy" | "buy" | "hold" | "caution";
  topProject: string;
}

interface UrbanProject {
  id: string;
  name: string;
  type: string;
  city: string;
  district?: string;
  status: string;
  completionDate?: string;
  estimatedImpact: number;
  description: string;
}

interface UrbanOverview {
  hotspots: Hotspot[];
  upcomingProjects: UrbanProject[];
}

const CITY_NAMES: Record<string, string> = {
  BRATISLAVA: "Bratislava",
  KOSICE: "Košice",
  PRESOV: "Prešov",
  ZILINA: "Žilina",
  BANSKA_BYSTRICA: "Banská Bystrica",
  TRNAVA: "Trnava",
  TRENCIN: "Trenčín",
  NITRA: "Nitra",
};

const SIGNAL_CONFIG = {
  strong_buy: {
    label: "Silný nákup",
    color: "text-emerald-400",
    bg: "bg-emerald-500/20",
    border: "border-emerald-500/30",
  },
  buy: {
    label: "Nákup",
    color: "text-blue-400",
    bg: "bg-blue-500/20",
    border: "border-blue-500/30",
  },
  hold: {
    label: "Držať",
    color: "text-amber-400",
    bg: "bg-amber-500/20",
    border: "border-amber-500/30",
  },
  caution: {
    label: "Opatrne",
    color: "text-slate-400",
    bg: "bg-slate-500/20",
    border: "border-slate-500/30",
  },
};

/**
 * Urban Impact Alert - automatický banner zobrazujúci
 * investičné príležitosti založené na infraštruktúre
 */
export function UrbanImpactAlert() {
  const [expanded, setExpanded] = useState(false);

  const { data, isLoading } = useQuery<UrbanOverview>({
    queryKey: ["urban-impact-overview"],
    queryFn: async () => {
      const res = await fetch("/api/v1/investor/urban-impact?overview=true");
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      return json.success ? json.data : null;
    },
    staleTime: 1000 * 60 * 60, // 1 hour cache
    retry: false,
  });

  if (isLoading || !data || data.hotspots.length === 0) {
    return null;
  }

  const topHotspot = data.hotspots[0];
  const config = SIGNAL_CONFIG[topHotspot.signal];

  return (
    <div className={`rounded-xl border ${config.border} ${config.bg} overflow-hidden`}>
      {/* Main Alert */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${config.bg}`}>
            <Construction className={`w-5 h-5 ${config.color}`} />
          </div>
          <div className="text-left">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-100">
                {CITY_NAMES[topHotspot.city] || topHotspot.city}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.color} border ${config.border}`}>
                +{topHotspot.impact.toFixed(0)}% rast
              </span>
            </div>
            <p className="text-sm text-slate-400">
              {topHotspot.topProject}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-sm font-medium ${config.color}`}>
            {config.label}
          </span>
          <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${expanded ? "rotate-90" : ""}`} />
        </div>
      </button>

      {/* Expanded Details */}
      {expanded && (
        <div className="border-t border-slate-700/50 p-4 space-y-4">
          {/* All Hotspots */}
          <div>
            <h4 className="text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Investičné hotspoty
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {data.hotspots.map((hotspot) => {
                const hConfig = SIGNAL_CONFIG[hotspot.signal];
                return (
                  <div
                    key={`${hotspot.city}-${hotspot.district || "all"}`}
                    className="flex items-center justify-between p-2 rounded-lg bg-slate-800/50"
                  >
                    <div>
                      <span className="text-sm font-medium text-slate-200">
                        {CITY_NAMES[hotspot.city] || hotspot.city}
                      </span>
                      {hotspot.district && (
                        <span className="text-xs text-slate-500 ml-1">
                          ({hotspot.district})
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-bold ${hConfig.color}`}>
                        +{hotspot.impact.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Upcoming Projects */}
          <div>
            <h4 className="text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Najbližšie projekty
            </h4>
            <div className="space-y-2">
              {data.upcomingProjects.slice(0, 3).map((project) => (
                <div
                  key={project.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-slate-800/50"
                >
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-slate-500" />
                    <div>
                      <span className="text-sm font-medium text-slate-200">
                        {project.name}
                      </span>
                      <span className="text-xs text-slate-500 ml-2">
                        {CITY_NAMES[project.city] || project.city}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      project.status === "in_progress" 
                        ? "bg-blue-500/20 text-blue-400" 
                        : "bg-slate-500/20 text-slate-400"
                    }`}>
                      {project.status === "in_progress" ? "V realizácii" : "Plánovaný"}
                    </span>
                    <span className="text-sm text-emerald-400">
                      +{project.estimatedImpact}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pro Tip */}
          <div className="flex items-start gap-2 p-3 rounded-lg bg-slate-800/30 border border-slate-700/50">
            <Sparkles className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-slate-400">
              <strong className="text-slate-300">Tip:</strong> Nakupuj nehnuteľnosti v okolí týchto projektov 
              <em> pred</em> ich dokončením. Historicky ceny rastú najrýchlejšie 6-12 mesiacov pred otvorením.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Inline Urban Badge - pre property kartu
 * Zobrazuje ak je property v hotspot oblasti
 */
export function UrbanBadge({ city, district }: { city: string; district?: string }) {
  const { data } = useQuery<UrbanOverview>({
    queryKey: ["urban-impact-overview"],
    queryFn: async () => {
      const res = await fetch("/api/v1/investor/urban-impact?overview=true");
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      return json.success ? json.data : null;
    },
    staleTime: 1000 * 60 * 60,
    retry: false,
  });

  if (!data) return null;

  const hotspot = data.hotspots.find(h => 
    h.city === city && (!district || !h.district || h.district === district)
  );

  if (!hotspot || hotspot.impact < 5) return null;

  const config = SIGNAL_CONFIG[hotspot.signal];

  return (
    <div
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${config.bg} ${config.color} ${config.border}`}
      title={`Infraštruktúrny rast: ${hotspot.topProject}`}
    >
      <Construction className="w-3 h-3" />
      <span>+{hotspot.impact.toFixed(0)}%</span>
    </div>
  );
}
