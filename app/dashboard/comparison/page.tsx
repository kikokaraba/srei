"use client";

import { PropertyComparison } from "@/components/dashboard/PropertyComparison";
import { Scale, Sparkles, GitCompare, Calculator } from "lucide-react";

export default function ComparisonPage() {
  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-900 via-zinc-900 to-violet-950/30 p-6 lg:p-8">
        {/* Ambient glow */}
        <div className="absolute -top-24 -right-24 w-48 h-48 rounded-full blur-3xl opacity-20 bg-violet-500" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 rounded-full blur-3xl opacity-10 bg-purple-500" />
        
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center shadow-lg shadow-violet-500/20 shrink-0">
              <Scale className="w-7 h-7 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-2xl lg:text-3xl font-bold text-white">
                  Porovnanie nehnuteľností
                </h1>
                <Sparkles className="w-5 h-5 text-violet-400" />
              </div>
              <p className="text-zinc-400 text-sm lg:text-base">
                Porovnajte až 3 nehnuteľnosti s 10-ročnými projekciami ROI
              </p>
            </div>
          </div>
          
          {/* Features */}
          <div className="flex gap-3">
            <div className="px-4 py-2 rounded-xl bg-zinc-800/50 border border-zinc-700/50 flex items-center gap-2">
              <GitCompare className="w-4 h-4 text-violet-400" />
              <span className="text-sm text-white font-medium">3 nehnuteľnosti</span>
            </div>
            <div className="px-4 py-2 rounded-xl bg-zinc-800/50 border border-zinc-700/50 flex items-center gap-2">
              <Calculator className="w-4 h-4 text-violet-400" />
              <span className="text-sm text-white font-medium">10Y ROI</span>
            </div>
          </div>
        </div>
      </div>

      <PropertyComparison />
    </div>
  );
}
