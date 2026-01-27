"use client";

import { PricePrediction } from "@/components/dashboard/PricePrediction";
import PremiumGate from "@/components/ui/PremiumGate";
import { Brain, Sparkles, TrendingUp } from "lucide-react";

function PredictionPlaceholder() {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-900 via-zinc-900 to-purple-950/20 p-6">
      {/* Ambient glow */}
      <div className="absolute -top-24 -right-24 w-48 h-48 rounded-full blur-3xl opacity-20 bg-purple-500" />
      
      <div className="relative">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-violet-500 flex items-center justify-center">
            <Brain className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">AI Predikcie cien</h2>
            <p className="text-sm text-zinc-400">Analýza a predpovede vývoja trhu</p>
          </div>
        </div>
        
        {/* Demo cards */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="p-4 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span className="text-xs text-zinc-400">Predikcia 6M</span>
            </div>
            <div className="h-8 bg-zinc-700/50 rounded animate-pulse" />
          </div>
          <div className="p-4 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span className="text-xs text-zinc-400">Predikcia 1Y</span>
            </div>
            <div className="h-8 bg-zinc-700/50 rounded animate-pulse" />
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="h-4 bg-zinc-800/50 rounded w-3/4" />
          <div className="h-4 bg-zinc-800/50 rounded w-1/2" />
        </div>
      </div>
    </div>
  );
}

export default function PredictionsPage() {
  return (
    <div>
      <PremiumGate 
        feature="aiPredictions" 
        minHeight="400px"
        fallback={<PredictionPlaceholder />}
      >
        <PricePrediction />
      </PremiumGate>
    </div>
  );
}
