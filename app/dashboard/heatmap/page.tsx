"use client";

import { SlovakiaHeatmap } from "@/components/dashboard/SlovakiaHeatmap";
import { Map, Sparkles, Target, Flame } from "lucide-react";

export default function HeatmapPage() {
  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-orange-950/30 p-6 lg:p-8">
        {/* Ambient glow */}
        <div className="absolute -top-24 -right-24 w-48 h-48 rounded-full blur-3xl opacity-20 bg-orange-500" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 rounded-full blur-3xl opacity-10 bg-red-500" />
        
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-lg shadow-orange-500/20 shrink-0">
              <Map className="w-7 h-7 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-2xl lg:text-3xl font-bold text-white">
                  Investičná Heatmapa
                </h1>
                <Sparkles className="w-5 h-5 text-orange-400" />
              </div>
              <p className="text-slate-400 text-sm lg:text-base">
                Interaktívna mapa zobrazujúca investičnú atraktivitu regiónov
              </p>
            </div>
          </div>
          
          {/* Legend */}
          <div className="flex gap-3">
            <div className="px-4 py-2 rounded-xl bg-slate-800/50 border border-slate-700/50 flex items-center gap-2">
              <Flame className="w-4 h-4 text-red-400" />
              <span className="text-sm text-white font-medium">Hot zones</span>
            </div>
            <div className="px-4 py-2 rounded-xl bg-slate-800/50 border border-slate-700/50 flex items-center gap-2">
              <Target className="w-4 h-4 text-orange-400" />
              <span className="text-sm text-white font-medium">Opportunity</span>
            </div>
          </div>
        </div>
      </div>

      <SlovakiaHeatmap />
    </div>
  );
}
