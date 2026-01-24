"use client";

import { useState, useMemo } from "react";
import {
  RefreshCw,
  Home,
  Wrench,
  TrendingUp,
  Wallet,
  Percent,
  Calendar,
  HelpCircle,
  CheckCircle,
  AlertTriangle,
  Sparkles,
  ArrowRight,
  Info,
  Repeat,
  Target,
  Zap,
  DollarSign,
} from "lucide-react";
import { calculateBRRRR, type BRRRRResults } from "@/lib/math/investor-logic";

interface BRRRRInputs {
  purchasePrice: number;
  purchaseCosts: number;
  renovationCost: number;
  afterRepairValue: number;
  refinanceLTV: number;
  refinanceInterestRate: number;
  refinanceTerm: number;
  monthlyRent: number;
  monthlyExpenses: number;
}

const DEFAULT_INPUTS: BRRRRInputs = {
  purchasePrice: 80000,
  purchaseCosts: 4000,
  renovationCost: 20000,
  afterRepairValue: 130000,
  refinanceLTV: 75,
  refinanceInterestRate: 4.5,
  refinanceTerm: 25,
  monthlyRent: 550,
  monthlyExpenses: 100,
};

// Preset scenáre
const PRESETS = [
  {
    name: "Konzervatívny",
    description: "Nízky LTV, bezpečný deal",
    inputs: { ...DEFAULT_INPUTS, refinanceLTV: 65, renovationCost: 15000, afterRepairValue: 115000 },
  },
  {
    name: "Štandardný",
    description: "Typický BRRRR projekt",
    inputs: DEFAULT_INPUTS,
  },
  {
    name: "Agresívny",
    description: "Max páka, vyššie riziko",
    inputs: { ...DEFAULT_INPUTS, refinanceLTV: 80, renovationCost: 30000, afterRepairValue: 150000, monthlyRent: 650 },
  },
];

export function BRRRRCalculator() {
  const [inputs, setInputs] = useState<BRRRRInputs>(DEFAULT_INPUTS);
  const [showGuide, setShowGuide] = useState(false);
  const [activeStep, setActiveStep] = useState(0);

  const results = useMemo(() => calculateBRRRR(inputs), [inputs]);

  const handleChange = (field: keyof BRRRRInputs, value: number) => {
    setInputs((prev) => ({ ...prev, [field]: value }));
  };

  const applyPreset = (preset: typeof PRESETS[0]) => {
    setInputs(preset.inputs);
  };

  // Fázy BRRRR stratégie
  const phases = [
    {
      id: "buy",
      label: "Buy",
      icon: Home,
      color: "blue",
      description: "Kúpiš podhodnotenú nehnuteľnosť",
    },
    {
      id: "rehab",
      label: "Rehab",
      icon: Wrench,
      color: "orange",
      description: "Zrekonštruuješ a zvýšiš hodnotu",
    },
    {
      id: "rent",
      label: "Rent",
      icon: DollarSign,
      color: "green",
      description: "Prenajmeš a generuješ príjem",
    },
    {
      id: "refinance",
      label: "Refinance",
      icon: RefreshCw,
      color: "purple",
      description: "Refinancuješ na novú hodnotu",
    },
    {
      id: "repeat",
      label: "Repeat",
      icon: Repeat,
      color: "emerald",
      description: "Vyberieš kapitál a opakuješ",
    },
  ];

  const getScoreColor = (isGood: boolean) => (isGood ? "text-emerald-400" : "text-amber-400");

  return (
    <div className="space-y-8">
      {/* Header s vysvetlením */}
      <div className="bg-gradient-to-br from-purple-500/10 via-slate-900 to-emerald-500/10 rounded-2xl p-6 border border-purple-500/20">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-emerald-500 flex items-center justify-center">
                <RefreshCw className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">BRRRR Stratégia</h2>
                <p className="text-slate-400 text-sm">Buy, Rehab, Rent, Refinance, Repeat</p>
              </div>
            </div>
          </div>
          <button
            onClick={() => setShowGuide(!showGuide)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors"
          >
            <HelpCircle className="w-4 h-4" />
            <span className="text-sm">{showGuide ? "Skryť" : "Ako to funguje?"}</span>
          </button>
        </div>

        {/* Guide */}
        {showGuide && (
          <div className="mt-6 pt-6 border-t border-slate-700/50">
            <div className="grid grid-cols-5 gap-2">
              {phases.map((phase, idx) => {
                const Icon = phase.icon;
                const colorClasses = {
                  blue: "from-blue-500 to-blue-600",
                  orange: "from-orange-500 to-orange-600",
                  green: "from-green-500 to-green-600",
                  purple: "from-purple-500 to-purple-600",
                  emerald: "from-emerald-500 to-emerald-600",
                };
                
                return (
                  <div key={phase.id} className="text-center">
                    <div className={`w-12 h-12 mx-auto rounded-xl bg-gradient-to-br ${colorClasses[phase.color as keyof typeof colorClasses]} flex items-center justify-center mb-2`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="text-sm font-bold text-white">{phase.label}</div>
                    <div className="text-xs text-slate-400 mt-1">{phase.description}</div>
                    {idx < 4 && (
                      <ArrowRight className="w-4 h-4 text-slate-600 mx-auto mt-2" />
                    )}
                  </div>
                );
              })}
            </div>
            
            <div className="mt-6 p-4 bg-slate-800/50 rounded-xl">
              <h4 className="font-semibold text-white mb-2 flex items-center gap-2">
                <Target className="w-4 h-4 text-emerald-400" />
                Cieľ BRRRR stratégie
              </h4>
              <p className="text-sm text-slate-300">
                Ideálne je vybrať <strong className="text-emerald-400">100%+ vloženého kapitálu</strong> pri refinancovaní, 
                takže ostanete s nehnuteľnosťou, ktorá generuje pasívny príjem, 
                ale <strong className="text-purple-400">neviazali ste v nej žiadnu hotovosť</strong>. 
                Tú môžete použiť na ďalší deal.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Preset scenáre */}
      <div className="flex gap-3">
        {PRESETS.map((preset) => (
          <button
            key={preset.name}
            onClick={() => applyPreset(preset)}
            className={`flex-1 p-4 rounded-xl border transition-all text-left ${
              JSON.stringify(inputs) === JSON.stringify(preset.inputs)
                ? "bg-purple-500/10 border-purple-500/50"
                : "bg-slate-800/50 border-slate-700 hover:border-slate-600"
            }`}
          >
            <div className="font-semibold text-white">{preset.name}</div>
            <div className="text-xs text-slate-400 mt-1">{preset.description}</div>
          </button>
        ))}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Inputs */}
        <div className="space-y-6">
          {/* Fáza 1: Buy */}
          <div className="bg-slate-800/30 rounded-xl p-5 border border-slate-700">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Home className="w-4 h-4 text-blue-400" />
              </div>
              <h3 className="font-semibold text-white">1. Kúpa (Buy)</h3>
            </div>
            
            <div className="space-y-4">
              <SliderInput
                label="Kúpna cena"
                value={inputs.purchasePrice}
                min={30000}
                max={300000}
                step={5000}
                unit="€"
                onChange={(v) => handleChange("purchasePrice", v)}
                hint="Cena, za ktorú kúpite nehnuteľnosť"
              />
              <SliderInput
                label="Náklady na kúpu"
                value={inputs.purchaseCosts}
                min={0}
                max={20000}
                step={500}
                unit="€"
                onChange={(v) => handleChange("purchaseCosts", v)}
                hint="Notár, daň z prevodu, realitka..."
              />
            </div>
          </div>

          {/* Fáza 2: Rehab */}
          <div className="bg-slate-800/30 rounded-xl p-5 border border-slate-700">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center">
                <Wrench className="w-4 h-4 text-orange-400" />
              </div>
              <h3 className="font-semibold text-white">2. Rekonštrukcia (Rehab)</h3>
            </div>
            
            <div className="space-y-4">
              <SliderInput
                label="Náklady na rekonštrukciu"
                value={inputs.renovationCost}
                min={0}
                max={80000}
                step={1000}
                unit="€"
                onChange={(v) => handleChange("renovationCost", v)}
                hint="Celkové náklady na zhodnotenie"
              />
              <SliderInput
                label="Hodnota po rekonštrukcii (ARV)"
                value={inputs.afterRepairValue}
                min={50000}
                max={400000}
                step={5000}
                unit="€"
                onChange={(v) => handleChange("afterRepairValue", v)}
                hint="After Repair Value - trhovú cenu po úpravách"
              />
            </div>
            
            {/* Forced Equity indicator */}
            <div className={`mt-4 p-3 rounded-lg ${results.forcedEquity > 0 ? "bg-emerald-500/10 border border-emerald-500/30" : "bg-red-500/10 border border-red-500/30"}`}>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-300">Vytvorené equity:</span>
                <span className={`font-bold ${results.forcedEquity > 0 ? "text-emerald-400" : "text-red-400"}`}>
                  €{results.forcedEquity.toLocaleString()}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {results.forcedEquity > 0 
                  ? "Zhodnotili ste nehnuteľnosť! Toto equity môžete využiť pri refinancovaní."
                  : "ARV musí byť vyššia ako celkové náklady pre úspešný BRRRR."}
              </p>
            </div>
          </div>

          {/* Fáza 3: Rent */}
          <div className="bg-slate-800/30 rounded-xl p-5 border border-slate-700">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                <DollarSign className="w-4 h-4 text-green-400" />
              </div>
              <h3 className="font-semibold text-white">3. Prenájom (Rent)</h3>
            </div>
            
            <div className="space-y-4">
              <SliderInput
                label="Mesačný nájom"
                value={inputs.monthlyRent}
                min={200}
                max={1500}
                step={50}
                unit="€"
                onChange={(v) => handleChange("monthlyRent", v)}
              />
              <SliderInput
                label="Mesačné náklady"
                value={inputs.monthlyExpenses}
                min={0}
                max={400}
                step={10}
                unit="€"
                onChange={(v) => handleChange("monthlyExpenses", v)}
                hint="Správa, poistenie, fond opráv..."
              />
            </div>
          </div>

          {/* Fáza 4: Refinance */}
          <div className="bg-slate-800/30 rounded-xl p-5 border border-slate-700">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <RefreshCw className="w-4 h-4 text-purple-400" />
              </div>
              <h3 className="font-semibold text-white">4. Refinancovanie (Refinance)</h3>
            </div>
            
            <div className="space-y-4">
              <SliderInput
                label="LTV pri refinancovaní"
                value={inputs.refinanceLTV}
                min={50}
                max={80}
                step={5}
                unit="%"
                onChange={(v) => handleChange("refinanceLTV", v)}
                hint="Loan-to-Value - koľko % z ARV vám banka požičia"
              />
              <SliderInput
                label="Úroková sadzba"
                value={inputs.refinanceInterestRate}
                min={2}
                max={8}
                step={0.1}
                unit="%"
                decimals={1}
                onChange={(v) => handleChange("refinanceInterestRate", v)}
              />
              <SliderInput
                label="Doba splácania"
                value={inputs.refinanceTerm}
                min={10}
                max={30}
                step={5}
                unit=" rokov"
                onChange={(v) => handleChange("refinanceTerm", v)}
              />
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="space-y-6">
          {/* Hlavný výsledok */}
          <div className={`rounded-2xl p-6 border ${
            results.isInfiniteReturn || results.cashRecoveredPercent >= 100
              ? "bg-gradient-to-br from-emerald-500/10 via-slate-900 to-emerald-500/5 border-emerald-500/30"
              : results.cashRecoveredPercent >= 80
                ? "bg-gradient-to-br from-yellow-500/10 via-slate-900 to-yellow-500/5 border-yellow-500/30"
                : "bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 border-slate-700"
          }`}>
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  {results.isInfiniteReturn || results.cashRecoveredPercent >= 100 ? (
                    <>
                      <CheckCircle className="w-6 h-6 text-emerald-400" />
                      <span className="text-lg font-semibold text-emerald-400">Úspešný BRRRR!</span>
                    </>
                  ) : results.cashRecoveredPercent >= 80 ? (
                    <>
                      <AlertTriangle className="w-6 h-6 text-yellow-400" />
                      <span className="text-lg font-semibold text-yellow-400">Takmer tam</span>
                    </>
                  ) : (
                    <>
                      <Info className="w-6 h-6 text-slate-400" />
                      <span className="text-lg font-semibold text-slate-300">Upravte parametre</span>
                    </>
                  )}
                </div>
                <p className="text-sm text-slate-400">
                  {results.isInfiniteReturn || results.cashRecoveredPercent >= 100
                    ? "Vybrali ste všetku vloženú hotovosť a máte nehnuteľnosť s cash flow!"
                    : results.cashRecoveredPercent >= 80
                      ? "Blízko k vybraniu celej investície, zvážte vyššie ARV alebo LTV."
                      : "Deal nie je optimálny pre BRRRR stratégiu."}
                </p>
              </div>
              
              <div className="text-right">
                <div className="text-4xl font-bold tabular-nums">
                  <span className={results.cashRecoveredPercent >= 100 ? "text-emerald-400" : results.cashRecoveredPercent >= 80 ? "text-yellow-400" : "text-slate-300"}>
                    {results.cashRecoveredPercent}%
                  </span>
                </div>
                <div className="text-xs text-slate-400">hotovosti vybranej</div>
              </div>
            </div>

            {/* Progress bar */}
            <div className="mb-6">
              <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    results.cashRecoveredPercent >= 100 ? "bg-emerald-500" : results.cashRecoveredPercent >= 80 ? "bg-yellow-500" : "bg-slate-500"
                  }`}
                  style={{ width: `${Math.min(100, results.cashRecoveredPercent)}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-slate-500 mt-1">
                <span>0%</span>
                <span className="text-emerald-400">100% = Celá investícia</span>
              </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-2 gap-4">
              <MetricCard
                label="Celková investícia"
                value={`€${results.totalInvestment.toLocaleString()}`}
                sublabel="Hotovosť potrebná na začiatok"
              />
              <MetricCard
                label="Refinančný úver"
                value={`€${results.refinanceAmount.toLocaleString()}`}
                sublabel={`${inputs.refinanceLTV}% z ARV`}
              />
              <MetricCard
                label="Hotovosť vybraná"
                value={`€${results.cashRecovered.toLocaleString()}`}
                sublabel="Vrátená pri refinancovaní"
                highlight={results.cashRecovered > 0}
              />
              <MetricCard
                label="Hotovosť v deale"
                value={`€${Math.max(0, results.cashLeftInDeal).toLocaleString()}`}
                sublabel={results.cashLeftInDeal <= 0 ? "Nič! Bonus navyše." : "Ostáva viazaná"}
                highlight={results.cashLeftInDeal <= 0}
              />
            </div>
          </div>

          {/* Cash Flow po refinancovaní */}
          <div className="bg-slate-800/30 rounded-xl p-5 border border-slate-700">
            <h4 className="font-semibold text-white mb-4 flex items-center gap-2">
              <Wallet className="w-5 h-5 text-emerald-400" />
              Cash Flow po refinancovaní
            </h4>
            
            <div className="space-y-3">
              <FlowRow label="Mesačný nájom" value={inputs.monthlyRent} isPositive />
              <FlowRow label="Prevádzkové náklady" value={-inputs.monthlyExpenses} />
              <FlowRow label="Splátka hypotéky" value={-results.monthlyMortgagePayment} />
              <div className="border-t border-slate-700 pt-3">
                <FlowRow 
                  label="Mesačný Cash Flow" 
                  value={results.monthlyCashFlow} 
                  highlight 
                />
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-4">
              <div className="bg-slate-800/50 rounded-lg p-3">
                <div className="text-xs text-slate-400 mb-1">Ročný Cash Flow</div>
                <div className={`text-xl font-bold ${results.annualCashFlow >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  €{results.annualCashFlow.toLocaleString()}
                </div>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-3">
                <div className="text-xs text-slate-400 mb-1">Cash-on-Cash</div>
                <div className="text-xl font-bold">
                  {results.isInfiniteReturn ? (
                    <span className="text-emerald-400 flex items-center gap-1">
                      <Zap className="w-5 h-5" />∞
                    </span>
                  ) : (
                    <span className={results.cashOnCash >= 8 ? "text-emerald-400" : "text-yellow-400"}>
                      {results.cashOnCash.toFixed(1)}%
                    </span>
                  )}
                </div>
              </div>
            </div>

            {results.isInfiniteReturn && (
              <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm text-emerald-400 font-medium">Nekonečná návratnosť!</span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Nevložili ste žiadnu hotovosť a generujete pasívny príjem. 
                  Toto je svätý grál BRRRR stratégie.
                </p>
              </div>
            )}
          </div>

          {/* Equity pozícia */}
          <div className="bg-slate-800/30 rounded-xl p-5 border border-slate-700">
            <h4 className="font-semibold text-white mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-purple-400" />
              Vaša equity pozícia
            </h4>
            
            <div className="relative h-8 bg-slate-700 rounded-lg overflow-hidden mb-3">
              <div
                className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-purple-500 to-purple-400"
                style={{ width: `${(results.equityPosition / inputs.afterRepairValue) * 100}%` }}
              />
              <div
                className="absolute right-0 top-0 bottom-0 bg-gradient-to-r from-slate-600 to-slate-500"
                style={{ width: `${(results.refinanceAmount / inputs.afterRepairValue) * 100}%` }}
              />
            </div>
            
            <div className="flex justify-between text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-purple-500" />
                <span className="text-slate-400">Vaše equity: </span>
                <span className="font-medium text-purple-400">
                  €{results.equityPosition.toLocaleString()} ({((results.equityPosition / inputs.afterRepairValue) * 100).toFixed(0)}%)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-slate-500" />
                <span className="text-slate-400">Dlh</span>
              </div>
            </div>
          </div>

          {/* Zhrnutie */}
          <div className="bg-gradient-to-r from-purple-500/10 to-emerald-500/10 rounded-xl p-5 border border-purple-500/20">
            <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
              <Repeat className="w-5 h-5 text-purple-400" />
              5. Repeat - Čo môžete urobiť ďalej
            </h4>
            
            <ul className="space-y-2 text-sm text-slate-300">
              {results.cashRecovered > 0 && (
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                  <span>
                    Máte <strong className="text-emerald-400">€{results.cashRecovered.toLocaleString()}</strong> na ďalší deal.
                  </span>
                </li>
              )}
              {results.annualCashFlow > 0 && (
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                  <span>
                    Generujete <strong className="text-emerald-400">€{results.annualCashFlow.toLocaleString()}</strong> ročne pasívne.
                  </span>
                </li>
              )}
              <li className="flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
                <span>
                  Hodnota nehnuteľnosti: <strong className="text-blue-400">€{inputs.afterRepairValue.toLocaleString()}</strong>
                </span>
              </li>
              <li className="flex items-start gap-2">
                <TrendingUp className="w-4 h-4 text-purple-400 mt-0.5 shrink-0" />
                <span>
                  Celková návratnosť (ROI): <strong className="text-purple-400">{results.roi}%</strong>
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// HELPER KOMPONENTY
// ============================================

function SliderInput({
  label,
  value,
  min,
  max,
  step,
  unit,
  decimals = 0,
  hint,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  decimals?: number;
  hint?: string;
  onChange: (value: number) => void;
}) {
  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-300">{label}</span>
        <span className="text-lg font-bold text-white tabular-nums">
          {decimals > 0 ? value.toFixed(decimals) : value.toLocaleString()}{unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
        style={{
          background: `linear-gradient(to right, #a855f7 0%, #a855f7 ${percentage}%, #334155 ${percentage}%, #334155 100%)`,
        }}
      />
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

function MetricCard({
  label,
  value,
  sublabel,
  highlight,
}: {
  label: string;
  value: string;
  sublabel: string;
  highlight?: boolean;
}) {
  return (
    <div className={`p-4 rounded-xl ${highlight ? "bg-emerald-500/10 border border-emerald-500/30" : "bg-slate-800/50"}`}>
      <div className="text-xs text-slate-400 mb-1">{label}</div>
      <div className={`text-xl font-bold ${highlight ? "text-emerald-400" : "text-white"}`}>
        {value}
      </div>
      <div className="text-xs text-slate-500 mt-1">{sublabel}</div>
    </div>
  );
}

function FlowRow({
  label,
  value,
  isPositive,
  highlight,
}: {
  label: string;
  value: number;
  isPositive?: boolean;
  highlight?: boolean;
}) {
  const valuePositive = value >= 0;
  
  return (
    <div className={`flex justify-between items-center ${highlight ? "font-semibold" : ""}`}>
      <span className={highlight ? "text-white" : "text-slate-400"}>{label}</span>
      <span className={`font-medium ${
        highlight
          ? valuePositive ? "text-emerald-400" : "text-red-400"
          : valuePositive ? "text-emerald-400/70" : "text-red-400/70"
      }`}>
        {valuePositive ? "+" : ""}€{Math.abs(value).toLocaleString()}
      </span>
    </div>
  );
}
