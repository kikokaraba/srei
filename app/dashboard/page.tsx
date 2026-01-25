"use client";

import { CustomizableDashboard } from "@/components/dashboard/CustomizableDashboard";
import { UrbanImpactAlert } from "@/components/dashboard/UrbanImpactAlert";
import { LayoutGrid, Sparkles, Zap, TrendingUp } from "lucide-react";
import { useSession } from "next-auth/react";

export default function DashboardPage() {
  const { data: session } = useSession();
  const userName = session?.user?.name?.split(" ")[0] || "Investor";

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/30 p-6 lg:p-8">
        {/* Ambient glow */}
        <div className="absolute -top-24 -right-24 w-48 h-48 rounded-full blur-3xl opacity-20 bg-emerald-500" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 rounded-full blur-3xl opacity-10 bg-teal-500" />
        
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/20 shrink-0">
              <LayoutGrid className="w-7 h-7 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-2xl lg:text-3xl font-bold text-white">
                  Ahoj, {userName}
                </h1>
                <Sparkles className="w-5 h-5 text-emerald-400" />
              </div>
              <p className="text-slate-400 text-sm lg:text-base">
                Váš investičný dashboard je pripravený
              </p>
            </div>
          </div>
          
          {/* Quick insights */}
          <div className="flex gap-3">
            <div className="px-4 py-2 rounded-xl bg-slate-800/50 border border-slate-700/50">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                <span className="text-sm text-slate-400">Live</span>
              </div>
              <p className="text-lg font-bold text-white">2,847</p>
            </div>
            <div className="px-4 py-2 rounded-xl bg-slate-800/50 border border-slate-700/50">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <span className="text-sm text-slate-400">Trh</span>
              </div>
              <p className="text-lg font-bold text-emerald-400">+2.4%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Urban Impact Alert - infraštruktúrne príležitosti */}
      <UrbanImpactAlert />

      <CustomizableDashboard />
    </div>
  );
}
