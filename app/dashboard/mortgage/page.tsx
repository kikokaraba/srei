"use client";

import dynamic from "next/dynamic";
import { Calculator, Loader2 } from "lucide-react";

const MortgageCalculator = dynamic(
  () => import("@/components/tools/MortgageCalculator"),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    ),
  }
);

export default function MortgagePage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950/30 p-6 lg:p-8">
        <div className="absolute -top-24 -right-24 w-48 h-48 rounded-full blur-3xl opacity-20 bg-blue-500" />
        
        <div className="relative flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20 shrink-0">
            <Calculator className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-white mb-1">
              Hypotekárna kalkulačka
            </h1>
            <p className="text-slate-400">
              Vypočítajte si mesačnú splátku a porovnajte ponuky slovenských bánk
            </p>
          </div>
        </div>
      </div>
      
      <MortgageCalculator />
    </div>
  );
}
