"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Building2,
  Train,
  ShoppingBag,
  GraduationCap,
  Hospital,
  TreePine,
  Briefcase,
  MapPin,
  Rocket,
  Clock,
  TrendingUp,
  ChevronRight,
} from "lucide-react";

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

interface Hotspot {
  city: string;
  district?: string;
  impact: number;
  signal: string;
  topProject: string;
}

interface UrbanOverviewResponse {
  success: boolean;
  data: {
    hotspots: Hotspot[];
    upcomingProjects: UrbanProject[];
    summary: {
      totalProjects: number;
      strongBuyLocations: number;
      topOpportunity: Hotspot | null;
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

const TYPE_ICONS: Record<string, typeof Building2> = {
  METRO_STATION: Train,
  TRAM_STATION: Train,
  HIGHWAY: MapPin,
  SHOPPING_CENTER: ShoppingBag,
  SCHOOL: GraduationCap,
  HOSPITAL: Hospital,
  PARK: TreePine,
  BUSINESS_DISTRICT: Briefcase,
};

const SIGNAL_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  strong_buy: { bg: "bg-emerald-500/20", text: "text-emerald-400", label: "STRONG BUY" },
  buy: { bg: "bg-blue-500/20", text: "text-blue-400", label: "BUY" },
  hold: { bg: "bg-amber-500/20", text: "text-amber-400", label: "HOLD" },
  caution: { bg: "bg-slate-700/50", text: "text-slate-400", label: "CAUTION" },
};

export function UrbanImpactMap() {
  const { data, isLoading } = useQuery<UrbanOverviewResponse>({
    queryKey: ["urban-impact-overview"],
    queryFn: async () => {
      const res = await fetch("/api/v1/investor/urban-impact?overview=true");
      return res.json();
    },
    staleTime: 1000 * 60 * 30,
  });

  if (isLoading) {
    return (
      <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6 animate-pulse">
        <div className="h-6 bg-slate-700 rounded w-1/3 mb-4" />
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-24 bg-slate-700/50 rounded" />
          ))}
        </div>
      </div>
    );
  }

  const hotspots = data?.data?.hotspots || [];
  const projects = data?.data?.upcomingProjects || [];
  const summary = data?.data?.summary;

  return (
    <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-cyan-950/20 rounded-xl border border-slate-700/50 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Urban Development</h2>
            <p className="text-xs text-slate-400">Kde budú ceny rásť o 2 roky</p>
          </div>
        </div>
        
        {summary?.topOpportunity && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
            <Rocket className="w-4 h-4 text-emerald-400" />
            <span className="text-sm text-emerald-400 font-medium">
              {CITY_NAMES[summary.topOpportunity.city]} +{summary.topOpportunity.impact}%
            </span>
          </div>
        )}
      </div>

      {/* Hotspots Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {hotspots.slice(0, 4).map((hotspot) => {
          const signalConfig = SIGNAL_CONFIG[hotspot.signal] || SIGNAL_CONFIG.caution;
          
          return (
            <div 
              key={`${hotspot.city}-${hotspot.district}`}
              className={`${signalConfig.bg} border border-slate-700/50 rounded-lg p-3 hover:scale-105 transition-transform cursor-pointer`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs font-bold ${signalConfig.text}`}>
                  {signalConfig.label}
                </span>
                <TrendingUp className={`w-4 h-4 ${signalConfig.text}`} />
              </div>
              <p className="text-white font-medium">{CITY_NAMES[hotspot.city]}</p>
              {hotspot.district && (
                <p className="text-xs text-slate-400">{hotspot.district}</p>
              )}
              <p className={`text-lg font-bold ${signalConfig.text} mt-1`}>
                +{hotspot.impact}%
              </p>
              <p className="text-xs text-slate-500 truncate">{hotspot.topProject}</p>
            </div>
          );
        })}
      </div>

      {/* Upcoming Projects */}
      <div>
        <h3 className="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Nadchádzajúce projekty
        </h3>
        
        <div className="space-y-2">
          {projects.slice(0, 4).map((project) => {
            const Icon = TYPE_ICONS[project.type] || Building2;
            const completionDate = project.completionDate 
              ? new Date(project.completionDate).toLocaleDateString("sk-SK", { month: "short", year: "numeric" })
              : "TBD";
            
            return (
              <div 
                key={project.id}
                className="flex items-center gap-3 p-3 bg-slate-800/30 hover:bg-slate-800/50 rounded-lg transition-all cursor-pointer group"
              >
                <div className="w-10 h-10 rounded-lg bg-slate-700/50 flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 text-cyan-400" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium truncate">{project.name}</p>
                  <p className="text-xs text-slate-400">
                    {CITY_NAMES[project.city]} {project.district ? `• ${project.district}` : ""}
                  </p>
                </div>
                
                <div className="text-right shrink-0">
                  <p className={`text-sm font-bold ${
                    project.status === "in_progress" ? "text-amber-400" : "text-slate-400"
                  }`}>
                    {project.status === "in_progress" ? "Prebieha" : "Plánované"}
                  </p>
                  <p className="text-xs text-slate-500">{completionDate}</p>
                </div>
                
                <div className="text-emerald-400 font-bold shrink-0">
                  +{project.estimatedImpact}%
                </div>
                
                <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors shrink-0" />
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer tip */}
      <div className="mt-6 p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-lg">
        <p className="text-sm text-cyan-400">
          💡 <strong>Pro tip:</strong> Nakupuj v lokalitách s plánovanou infraštruktúrou 12-18 mesiacov pred dokončením. 
          Historicky to prináša 8-15% nárast hodnoty.
        </p>
      </div>
    </div>
  );
}
