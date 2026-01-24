"use client";

import dynamic from "next/dynamic";
import { Sparkles, Loader2 } from "lucide-react";

const PropertyValuator = dynamic(
  () => import("@/components/tools/PropertyValuator"),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    ),
  }
);

export default function ValuationPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/30 p-6 lg:p-8">
        <div className="absolute -top-24 -right-24 w-48 h-48 rounded-full blur-3xl opacity-20 bg-emerald-500" />
        
        <div className="relative flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 shrink-0">
            <Sparkles className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-white mb-1">
              Nacenenie nehnuteľnosti
            </h1>
            <p className="text-slate-400">
              AI-powered odhad trhovej hodnoty na základe aktuálnych dát
            </p>
          </div>
        </div>
      </div>
      
      <PropertyValuator />
    </div>
  );
}
