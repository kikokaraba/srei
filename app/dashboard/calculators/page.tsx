"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { 
  Calculator, 
  TrendingUp, 
  RefreshCw,
  Receipt,
  Banknote,
  ArrowRight,
  Sparkles,
  X,
} from "lucide-react";
import { ScenarioSimulator } from "@/components/dashboard/ScenarioSimulator";
import { TaxAssistant } from "@/components/dashboard/TaxAssistant";
import { BRRRRCalculator } from "@/components/calculators/BRRRRCalculator";
import PremiumGate from "@/components/ui/PremiumGate";

const MortgageCalculator = dynamic(
  () => import("@/components/tools/MortgageCalculator"),
  { ssr: false }
);

type CalculatorType = "investment" | "tax" | "brrrr" | "mortgage" | null;

export default function CalculatorsPage() {
  const [openCalculator, setOpenCalculator] = useState<CalculatorType>(null);

  const calculators = [
    {
      id: "mortgage" as const,
      name: "Hypotekárna kalkulačka",
      description: "Výpočet mesačnej splátky, porovnanie bánk a amortizačný plán",
      icon: Banknote,
      gradient: "from-blue-500 to-cyan-500",
      bgGradient: "from-blue-500/10 to-cyan-500/10",
      borderColor: "border-blue-500/20 hover:border-blue-500/40",
      metrics: ["Mesačná splátka", "LTV analýza", "Porovnanie 8 bánk"],
      popular: true,
    },
    {
      id: "investment" as const,
      name: "Výnosová analýza",
      description: "ROI, cash flow a 10-ročná projekcia investície",
      icon: TrendingUp,
      gradient: "from-emerald-500 to-teal-500",
      bgGradient: "from-emerald-500/10 to-teal-500/10",
      borderColor: "border-emerald-500/20 hover:border-emerald-500/40",
      metrics: ["Hrubý/čistý výnos", "Cash-on-Cash", "Break-even"],
      popular: false,
    },
    {
      id: "brrrr" as const,
      name: "BRRRR Stratégia",
      description: "Buy, Rehab, Rent, Refinance, Repeat - recyklácia kapitálu",
      icon: RefreshCw,
      gradient: "from-violet-500 to-purple-500",
      bgGradient: "from-violet-500/10 to-purple-500/10",
      borderColor: "border-violet-500/20 hover:border-violet-500/40",
      metrics: ["Forced equity", "Cash recovery", "Infinite ROI"],
      popular: false,
    },
    {
      id: "tax" as const,
      name: "Daňový asistent",
      description: "Daň z predaja, 5-ročný test a zdravotné odvody",
      icon: Receipt,
      gradient: "from-amber-500 to-orange-500",
      bgGradient: "from-amber-500/10 to-orange-500/10",
      borderColor: "border-amber-500/20 hover:border-amber-500/40",
      metrics: ["Oslobodenie od dane", "Výpočet ZP", "SK legislatíva 2026"],
      popular: false,
    },
  ];

  if (openCalculator) {
    const calc = calculators.find(c => c.id === openCalculator);
    if (!calc) return null;
    const Icon = calc.icon;

    return (
      <div className="min-h-screen">
        {/* Calculator Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${calc.gradient} flex items-center justify-center shadow-lg`}>
                <Icon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">{calc.name}</h1>
                <p className="text-sm text-slate-400">{calc.description}</p>
              </div>
            </div>
            <button
              onClick={() => setOpenCalculator(null)}
              className="p-3 rounded-xl bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 text-slate-400 hover:text-white transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Calculator Content */}
        <div className="bg-slate-900/50 backdrop-blur-xl rounded-3xl border border-slate-800/50 p-6 md:p-8">
          {calc.id === "mortgage" ? (
            <MortgageCalculator />
          ) : (
            <PremiumGate 
              feature={calc.id === "tax" ? "advancedTax" : "scenarioSimulator"} 
              minHeight="400px"
            >
              {calc.id === "investment" && <ScenarioSimulator />}
              {calc.id === "tax" && <TaxAssistant />}
              {calc.id === "brrrr" && <BRRRRCalculator />}
            </PremiumGate>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Hero Header */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 flex items-center justify-center">
            <Calculator className="w-6 h-6 text-slate-300" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Investičné kalkulačky</h1>
            <p className="text-slate-400">Profesionálne nástroje pre slovenských investorov</p>
          </div>
        </div>
      </div>

      {/* Calculator Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {calculators.map((calc) => {
          const Icon = calc.icon;
          
          return (
            <button
              key={calc.id}
              onClick={() => setOpenCalculator(calc.id)}
              className={`group relative text-left p-6 rounded-3xl border bg-gradient-to-br ${calc.bgGradient} ${calc.borderColor} transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-slate-900/50`}
            >
              {/* Popular Badge */}
              {calc.popular && (
                <div className="absolute -top-2 -right-2 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-medium flex items-center gap-1 shadow-lg">
                  <Sparkles className="w-3 h-3" />
                  Populárne
                </div>
              )}

              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${calc.gradient} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  <Icon className="w-7 h-7 text-white" />
                </div>
                <div className="p-2 rounded-xl bg-white/5 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0">
                  <ArrowRight className="w-5 h-5 text-white" />
                </div>
              </div>

              {/* Title & Description */}
              <h2 className="text-xl font-semibold text-white mb-2 group-hover:text-white/90">
                {calc.name}
              </h2>
              <p className="text-sm text-slate-400 mb-5 line-clamp-2">
                {calc.description}
              </p>

              {/* Metrics */}
              <div className="flex flex-wrap gap-2">
                {calc.metrics.map((metric, idx) => (
                  <span 
                    key={idx}
                    className="px-3 py-1.5 rounded-full bg-white/5 text-xs text-slate-300 border border-white/10"
                  >
                    {metric}
                  </span>
                ))}
              </div>

              {/* Bottom gradient line */}
              <div className={`absolute bottom-0 left-6 right-6 h-1 rounded-full bg-gradient-to-r ${calc.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
            </button>
          );
        })}
      </div>

      {/* Quick Stats */}
      <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-4">
        <QuickStat label="Priemerný výnos BA" value="4.2%" trend="+0.3%" />
        <QuickStat label="Hypotéka 5r fix" value="4.09%" trend="-0.1%" />
        <QuickStat label="Daň z predaja" value="19%" />
        <QuickStat label="5-ročný test" value="Oslobodenie" />
      </div>

      {/* Footer */}
      <div className="mt-8 pt-6 border-t border-slate-800/50 text-center">
        <p className="text-xs text-slate-500">
          Kalkulačky poskytujú orientačné výpočty podľa slovenskej legislatívy 2026.
          Pre presné výpočty kontaktujte finančného poradcu.
        </p>
      </div>
    </div>
  );
}

function QuickStat({ label, value, trend }: { label: string; value: string; trend?: string }) {
  const isPositive = trend?.startsWith("+");
  
  return (
    <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800/50">
      <div className="text-xs text-slate-500 mb-1">{label}</div>
      <div className="flex items-baseline gap-2">
        <span className="text-lg font-semibold text-white">{value}</span>
        {trend && (
          <span className={`text-xs ${isPositive ? "text-emerald-400" : "text-red-400"}`}>
            {trend}
          </span>
        )}
      </div>
    </div>
  );
}
