"use client";

import { CustomizableDashboard } from "@/components/dashboard/CustomizableDashboard";
import { UrbanImpactAlert } from "@/components/dashboard/UrbanImpactAlert";
import { Zap, TrendingUp, Activity } from "lucide-react";
import { useSession } from "next-auth/react";

export default function DashboardPage() {
  const { data: session } = useSession();
  const userName = session?.user?.name?.split(" ")[0] || "Investor";

  return (
    <div className="space-y-8">
      {/* Premium Header - Minimal */}
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
        {/* Welcome Text */}
        <div>
          <p className="text-zinc-500 text-sm font-medium tracking-wide mb-1">
            INVESTIČNÝ DASHBOARD
          </p>
          <h1 className="text-2xl lg:text-3xl font-semibold text-zinc-100 tracking-tight">
            Vitaj späť, {userName}
          </h1>
        </div>
        
        {/* Live Market Ticker - Premium */}
        <div className="flex items-center gap-2 px-4 py-2 premium-card">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] text-zinc-500 font-medium tracking-wide">LIVE</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span className="font-mono text-sm text-zinc-300">2,847</span>
              <span className="text-[10px] text-zinc-600">ponúk</span>
            </div>
            <div className="w-px h-4 bg-zinc-800" />
            <div className="flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-mono text-sm text-emerald-400">+2.4%</span>
              <span className="text-[10px] text-zinc-600">týždeň</span>
            </div>
            <div className="w-px h-4 bg-zinc-800" />
            <div className="flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-blue-400" />
              <span className="font-mono text-sm text-zinc-300">€2,431</span>
              <span className="text-[10px] text-zinc-600">/m² BA</span>
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
