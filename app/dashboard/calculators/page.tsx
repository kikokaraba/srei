"use client";

import { useState } from "react";
import { Calculator, Receipt, TrendingUp } from "lucide-react";
import { ScenarioSimulator } from "@/components/dashboard/ScenarioSimulator";
import { TaxAssistant } from "@/components/dashboard/TaxAssistant";

type CalculatorType = "investment" | "tax";

export default function CalculatorsPage() {
  const [activeCalculator, setActiveCalculator] = useState<CalculatorType>("investment");

  const calculators = [
    {
      id: "investment" as const,
      name: "Investičný simulátor",
      description: "Vypočítajte výnosy, cash-on-cash return a hypotekárne splátky",
      icon: TrendingUp,
    },
    {
      id: "tax" as const,
      name: "Daňový asistent",
      description: "Zistite daňové povinnosti pri predaji nehnuteľnosti",
      icon: Receipt,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-100 mb-2">Kalkulačky</h1>
        <p className="text-slate-400">
          Investičné nástroje pre výpočet výnosov a daňových povinností
        </p>
      </div>

      {/* Calculator Selector */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {calculators.map((calc) => {
          const Icon = calc.icon;
          const isActive = activeCalculator === calc.id;
          
          return (
            <button
              key={calc.id}
              onClick={() => setActiveCalculator(calc.id)}
              className={`p-6 rounded-xl border text-left transition-all ${
                isActive
                  ? "bg-emerald-500/10 border-emerald-500/50"
                  : "bg-slate-900 border-slate-800 hover:border-slate-700"
              }`}
            >
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-lg ${
                  isActive ? "bg-emerald-500/20" : "bg-slate-800"
                }`}>
                  <Icon className={`w-6 h-6 ${
                    isActive ? "text-emerald-400" : "text-slate-400"
                  }`} />
                </div>
                <div>
                  <h3 className={`font-semibold mb-1 ${
                    isActive ? "text-emerald-400" : "text-slate-100"
                  }`}>
                    {calc.name}
                  </h3>
                  <p className="text-sm text-slate-400">{calc.description}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Active Calculator */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
        <div className="flex items-center gap-2 mb-6">
          <Calculator className="w-5 h-5 text-emerald-400" />
          <h2 className="text-xl font-bold text-slate-100">
            {calculators.find((c) => c.id === activeCalculator)?.name}
          </h2>
        </div>

        {activeCalculator === "investment" && <ScenarioSimulator />}
        {activeCalculator === "tax" && <TaxAssistant />}
      </div>
    </div>
  );
}
