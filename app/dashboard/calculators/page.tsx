"use client";

import { useState } from "react";
import { Calculator, Receipt, TrendingUp, Sparkles, PiggyBank, Percent, ArrowRight } from "lucide-react";
import { ScenarioSimulator } from "@/components/dashboard/ScenarioSimulator";
import { TaxAssistant } from "@/components/dashboard/TaxAssistant";
import PremiumGate from "@/components/ui/PremiumGate";

type CalculatorType = "investment" | "tax";

export default function CalculatorsPage() {
  const [activeCalculator, setActiveCalculator] = useState<CalculatorType>("investment");

  const calculators = [
    {
      id: "investment" as const,
      name: "Investičný simulátor",
      description: "Výnosy, cash-on-cash, hypotéka",
      icon: TrendingUp,
      gradient: "from-emerald-500 to-teal-500",
      glow: "bg-emerald-500",
    },
    {
      id: "tax" as const,
      name: "Daňový asistent",
      description: "Daň z predaja, 5-ročný test",
      icon: Receipt,
      gradient: "from-blue-500 to-cyan-500",
      glow: "bg-blue-500",
    },
  ];

  const tips = [
    { icon: PiggyBank, title: "Záloha", text: "Vyššia záloha = nižšia splátka, ale viazaný kapitál", color: "emerald" },
    { icon: Percent, title: "Výnos", text: "Hrubý výnos nad 5% je dobrý, cash-on-cash nad 8% výborný", color: "blue" },
    { icon: Receipt, title: "Dane", text: "Po 5 rokoch vlastníctva ste oslobodený od dane z predaja", color: "amber" },
  ];

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/30 p-6 lg:p-8">
        <div className="absolute -top-24 -right-24 w-48 h-48 rounded-full blur-3xl opacity-20 bg-emerald-500" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 rounded-full blur-3xl opacity-10 bg-blue-500" />
        
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-blue-500 flex items-center justify-center shadow-lg shadow-emerald-500/20 shrink-0">
              <Calculator className="w-7 h-7 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-2xl lg:text-3xl font-bold text-white">Kalkulačky</h1>
                <Sparkles className="w-5 h-5 text-amber-400" />
              </div>
              <p className="text-slate-400 text-sm lg:text-base">
                Profesionálne investičné nástroje pre slovenský realitný trh
              </p>
            </div>
          </div>
          
          <div className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500/10 to-blue-500/10 border border-emerald-500/20 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span className="text-sm text-white font-medium">Pro nástroje</span>
          </div>
        </div>
      </div>

      {/* Calculator Tabs */}
      <div className="grid grid-cols-2 gap-3">
        {calculators.map((calc) => {
          const Icon = calc.icon;
          const isActive = activeCalculator === calc.id;
          
          return (
            <button
              key={calc.id}
              onClick={() => setActiveCalculator(calc.id)}
              className={`relative overflow-hidden p-5 rounded-xl transition-all text-left ${
                isActive
                  ? "bg-gradient-to-br from-slate-800 to-slate-900 border-2 border-emerald-500/50"
                  : "bg-slate-900/50 border border-slate-800 hover:bg-slate-800/50"
              }`}
            >
              {isActive && (
                <div className={`absolute -top-12 -right-12 w-24 h-24 rounded-full blur-2xl opacity-20 ${calc.glow}`} />
              )}
              
              <div className="relative flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  isActive ? `bg-gradient-to-br ${calc.gradient}` : "bg-slate-800"
                }`}>
                  <Icon className={`w-6 h-6 ${isActive ? "text-white" : "text-slate-400"}`} />
                </div>
                <div>
                  <div className={`font-semibold ${isActive ? "text-white" : "text-slate-300"}`}>
                    {calc.name}
                  </div>
                  <div className="text-sm text-slate-500">{calc.description}</div>
                </div>
                {isActive && (
                  <ArrowRight className="w-5 h-5 text-emerald-400 ml-auto" />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Active Calculator */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 p-6 border border-slate-800">
        {activeCalculator === "investment" && (
          <PremiumGate feature="scenarioSimulator" minHeight="400px">
            <ScenarioSimulator />
          </PremiumGate>
        )}
        {activeCalculator === "tax" && (
          <PremiumGate feature="advancedTax" minHeight="400px">
            <TaxAssistant />
          </PremiumGate>
        )}
      </div>

      {/* Tips */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {tips.map((tip, index) => {
          const Icon = tip.icon;
          const colorClasses = {
            emerald: "from-emerald-500/10 to-teal-500/10 border-emerald-500/20",
            blue: "from-blue-500/10 to-cyan-500/10 border-blue-500/20",
            amber: "from-amber-500/10 to-orange-500/10 border-amber-500/20",
          };
          const iconColors = {
            emerald: "text-emerald-400",
            blue: "text-blue-400",
            amber: "text-amber-400",
          };
          
          return (
            <div key={index} className={`relative overflow-hidden rounded-xl p-4 bg-gradient-to-br ${colorClasses[tip.color as keyof typeof colorClasses]} border`}>
              <div className="flex items-center gap-2 mb-2">
                <Icon className={`w-5 h-5 ${iconColors[tip.color as keyof typeof iconColors]}`} />
                <span className="font-medium text-white">{tip.title}</span>
              </div>
              <p className="text-sm text-slate-400">{tip.text}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
