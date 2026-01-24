"use client";

import { AnalyticsDashboard } from "@/components/dashboard/AnalyticsDashboard";
import { BarChart3, Sparkles, TrendingUp, Activity } from "lucide-react";

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950/30 p-6 lg:p-8">
        {/* Ambient glow */}
        <div className="absolute -top-24 -right-24 w-48 h-48 rounded-full blur-3xl opacity-20 bg-blue-500" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 rounded-full blur-3xl opacity-10 bg-cyan-500" />
        
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/20 shrink-0">
              <BarChart3 className="w-7 h-7 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-2xl lg:text-3xl font-bold text-white">
                  Trhová analytika
                </h1>
                <Sparkles className="w-5 h-5 text-blue-400" />
              </div>
              <p className="text-slate-400 text-sm lg:text-base">
                Hlboký pohľad na trhové trendy a výkonnostné metriky
              </p>
            </div>
          </div>
          
          {/* Quick stats */}
          <div className="flex gap-3">
            <div className="px-4 py-2 rounded-xl bg-slate-800/50 border border-slate-700/50">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <span className="text-sm text-slate-400">Trend</span>
              </div>
              <p className="text-lg font-bold text-emerald-400">+2.4%</p>
            </div>
            <div className="px-4 py-2 rounded-xl bg-slate-800/50 border border-slate-700/50">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-400" />
                <span className="text-sm text-slate-400">Aktivita</span>
              </div>
              <p className="text-lg font-bold text-white">Vysoká</p>
            </div>
          </div>
        </div>
      </div>

      <AnalyticsDashboard />
    </div>
  );
}
