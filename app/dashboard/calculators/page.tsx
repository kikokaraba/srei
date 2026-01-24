"use client";

import { useState } from "react";
import { Calculator, Receipt, TrendingUp, Sparkles, PiggyBank } from "lucide-react";
import { ScenarioSimulator } from "@/components/dashboard/ScenarioSimulator";
import { TaxAssistant } from "@/components/dashboard/TaxAssistant";

type CalculatorType = "investment" | "tax";

export default function CalculatorsPage() {
  const [activeCalculator, setActiveCalculator] = useState<CalculatorType>("investment");

  const calculators = [
    {
      id: "investment" as const,
      name: "Investičný simulátor",
      description: "Výnosy, cash-on-cash, hypotéka, 10-ročná projekcia",
      icon: TrendingUp,
      color: "emerald",
    },
    {
      id: "tax" as const,
      name: "Daňový asistent",
      description: "Daň z predaja, 5-ročný test, zdravotné poistenie",
      icon: Receipt,
      color: "blue",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-gradient-to-br from-emerald-500/20 to-blue-500/20 rounded-lg">
              <Calculator className="w-6 h-6 text-emerald-400" />
            </div>
            <h1 className="text-3xl font-bold text-slate-100">Kalkulačky</h1>
          </div>
          <p className="text-slate-400">
            Profesionálne investičné nástroje pre slovenský realitný trh
          </p>
        </div>
        <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500/10 to-blue-500/10 rounded-full border border-emerald-500/20">
          <Sparkles className="w-4 h-4 text-yellow-400" />
          <span className="text-sm text-slate-300">Pro nástroje</span>
        </div>
      </div>

      {/* Calculator Tabs */}
      <div className="flex gap-2 p-1 bg-slate-900 rounded-xl border border-slate-800">
        {calculators.map((calc) => {
          const Icon = calc.icon;
          const isActive = activeCalculator === calc.id;
          
          return (
            <button
              key={calc.id}
              onClick={() => setActiveCalculator(calc.id)}
              className={`flex-1 flex items-center justify-center gap-3 px-6 py-4 rounded-lg transition-all ${
                isActive
                  ? "bg-gradient-to-r from-emerald-500/20 to-blue-500/20 border border-emerald-500/30"
                  : "hover:bg-slate-800"
              }`}
            >
              <Icon className={`w-5 h-5 ${
                isActive ? "text-emerald-400" : "text-slate-400"
              }`} />
              <div className="text-left">
                <div className={`font-semibold ${
                  isActive ? "text-slate-100" : "text-slate-300"
                }`}>
                  {calc.name}
                </div>
                <div className="text-xs text-slate-500 hidden sm:block">{calc.description}</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Active Calculator */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6">
        {activeCalculator === "investment" && <ScenarioSimulator />}
        {activeCalculator === "tax" && <TaxAssistant />}
      </div>

      {/* Footer Tips */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-800">
          <div className="flex items-center gap-2 mb-2">
            <PiggyBank className="w-5 h-5 text-emerald-400" />
            <span className="font-medium text-slate-100">Tip: Záloha</span>
          </div>
          <p className="text-sm text-slate-400">
            Vyššia záloha = nižšia splátka, ale viazaný kapitál. Hľadajte balans.
          </p>
        </div>
        <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-800">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-blue-400" />
            <span className="font-medium text-slate-100">Tip: Výnos</span>
          </div>
          <p className="text-sm text-slate-400">
            Hrubý výnos nad 5% je dobrý. Čistý cash-on-cash nad 8% je výborný.
          </p>
        </div>
        <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-800">
          <div className="flex items-center gap-2 mb-2">
            <Receipt className="w-5 h-5 text-yellow-400" />
            <span className="font-medium text-slate-100">Tip: Dane</span>
          </div>
          <p className="text-sm text-slate-400">
            Po 5 rokoch vlastníctva ste oslobodený od dane z predaja.
          </p>
        </div>
      </div>
    </div>
  );
}
