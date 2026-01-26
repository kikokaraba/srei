"use client";

import { useState, useMemo } from "react";
import {
  RefreshCw,
  Home,
  Wrench,
  TrendingUp,
  CheckCircle,
  AlertTriangle,
  Zap,
  DollarSign,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { calculateBRRRR } from "@/lib/math/investor-logic";

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

const PRESETS = [
  { name: "Konzervatívny", inputs: { ...DEFAULT_INPUTS, refinanceLTV: 65, renovationCost: 15000, afterRepairValue: 115000 } },
  { name: "Štandardný", inputs: DEFAULT_INPUTS },
  { name: "Agresívny", inputs: { ...DEFAULT_INPUTS, refinanceLTV: 80, renovationCost: 30000, afterRepairValue: 150000, monthlyRent: 650 } },
];

interface BRRRRCalculatorProps {
  initialPrice?: number;
}

export function BRRRRCalculator({ initialPrice }: BRRRRCalculatorProps) {
  const [inputs, setInputs] = useState<BRRRRInputs>(() => {
    if (initialPrice) {
      return {
        ...DEFAULT_INPUTS,
        purchasePrice: initialPrice,
        purchaseCosts: Math.round(initialPrice * 0.05),
        afterRepairValue: Math.round(initialPrice * 1.3),
      };
    }
    return DEFAULT_INPUTS;
  });
  const [expandedPhase, setExpandedPhase] = useState<number>(0);

  const results = useMemo(() => calculateBRRRR(inputs), [inputs]);

  const handleChange = (field: keyof BRRRRInputs, value: number) => {
    setInputs((prev) => ({ ...prev, [field]: value }));
  };

  const applyPreset = (preset: typeof PRESETS[0]) => {
    setInputs(preset.inputs);
  };

  const isSuccess = results.isInfiniteReturn || results.cashRecoveredPercent >= 100;
  const isClose = results.cashRecoveredPercent >= 80 && !isSuccess;

  const phases = [
    {
      id: 0,
      label: "Buy",
      sublabel: "Kúpa",
      icon: Home,
      color: "blue",
      fields: [
        { key: "purchasePrice", label: "Kúpna cena", min: 30000, max: 300000, step: 5000 },
        { key: "purchaseCosts", label: "Náklady na kúpu", min: 0, max: 20000, step: 500, sublabel: "Notár, daň, realitka" },
      ],
    },
    {
      id: 1,
      label: "Rehab",
      sublabel: "Rekonštrukcia",
      icon: Wrench,
      color: "orange",
      fields: [
        { key: "renovationCost", label: "Náklady na rekonštrukciu", min: 0, max: 80000, step: 1000 },
        { key: "afterRepairValue", label: "Hodnota po rekonštrukcii (ARV)", min: 50000, max: 400000, step: 5000 },
      ],
    },
    {
      id: 2,
      label: "Rent",
      sublabel: "Prenájom",
      icon: DollarSign,
      color: "green",
      fields: [
        { key: "monthlyRent", label: "Mesačný nájom", min: 200, max: 1500, step: 50 },
        { key: "monthlyExpenses", label: "Mesačné náklady", min: 0, max: 400, step: 10 },
      ],
    },
    {
      id: 3,
      label: "Refinance",
      sublabel: "Refinancovanie",
      icon: RefreshCw,
      color: "violet",
      fields: [
        { key: "refinanceLTV", label: "LTV", min: 50, max: 80, step: 5, format: "%" },
        { key: "refinanceInterestRate", label: "Úroková sadzba", min: 2, max: 8, step: 0.1, format: "%", decimals: 1 },
        { key: "refinanceTerm", label: "Doba splácania", min: 10, max: 30, step: 5, format: " rokov" },
      ],
    },
  ];

  const getPhaseColor = (color: string) => {
    const colors: Record<string, { bg: string; border: string; text: string }> = {
      blue: { bg: "bg-blue-500/10", border: "border-blue-500/20", text: "text-blue-400" },
      orange: { bg: "bg-orange-500/10", border: "border-orange-500/20", text: "text-orange-400" },
      green: { bg: "bg-green-500/10", border: "border-green-500/20", text: "text-green-400" },
      violet: { bg: "bg-violet-500/10", border: "border-violet-500/20", text: "text-violet-400" },
    };
    return colors[color] || colors.blue;
  };

  return (
    <div className="space-y-6">
      {/* Hero Result Card */}
      <div className={`relative p-6 rounded-2xl border overflow-hidden ${
        isSuccess 
          ? "bg-emerald-950/30 border-emerald-500/20" 
          : isClose 
            ? "bg-amber-950/30 border-amber-500/20" 
            : "bg-slate-800/30 border-slate-700/50"
      }`}>
        {/* Background glow */}
        {isSuccess && (
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl" />
        )}
        
        <div className="relative flex flex-col lg:flex-row lg:items-center gap-6">
          {/* Main Score */}
          <div className="lg:w-48 shrink-0">
            <div className="flex items-center gap-2 mb-2">
              {isSuccess ? (
                <CheckCircle className="w-5 h-5 text-emerald-400" />
              ) : isClose ? (
                <AlertTriangle className="w-5 h-5 text-amber-400" />
              ) : null}
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                {isSuccess ? "Úspešný BRRRR" : isClose ? "Takmer tam" : "Cash Recovery"}
              </span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className={`text-5xl font-light tabular-nums ${
                isSuccess ? "text-emerald-400" : isClose ? "text-amber-400" : "text-slate-300"
              }`}>
                {results.cashRecoveredPercent}
              </span>
              <span className="text-xl text-slate-600">%</span>
            </div>
            {/* Progress Bar */}
            <div className="mt-3 h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${
                  isSuccess ? "bg-emerald-500" : isClose ? "bg-amber-500" : "bg-slate-600"
                }`}
                style={{ width: `${Math.min(100, results.cashRecoveredPercent)}%` }}
              />
            </div>
            <div className="mt-1 flex justify-between text-[10px] text-slate-600">
              <span>0%</span>
              <span>100%</span>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-3">
            <MiniMetric 
              label="Investícia" 
              value={`€${(results.totalInvestment / 1000).toFixed(0)}k`}
            />
            <MiniMetric 
              label="Refinanc. úver" 
              value={`€${(results.refinanceAmount / 1000).toFixed(0)}k`}
              sublabel={`${inputs.refinanceLTV}% LTV`}
            />
            <MiniMetric 
              label="Vybraná hotovosť" 
              value={`€${results.cashRecovered.toLocaleString()}`}
              highlight={results.cashRecovered > 0}
            />
            <MiniMetric 
              label="Ročný Cash Flow" 
              value={results.isInfiniteReturn ? "∞" : `€${results.annualCashFlow.toLocaleString()}`}
              highlight={results.annualCashFlow > 0}
              icon={results.isInfiniteReturn ? <Zap className="w-3 h-3" /> : undefined}
            />
          </div>
        </div>
      </div>

      {/* Presets */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-600">Scenár:</span>
        <div className="flex gap-2">
          {PRESETS.map((preset) => {
            const isActive = JSON.stringify(inputs) === JSON.stringify(preset.inputs);
            return (
              <button
                key={preset.name}
                onClick={() => applyPreset(preset)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? "bg-violet-500/20 text-violet-400 border border-violet-500/30"
                    : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/50"
                }`}
              >
                {preset.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Inputs - Accordion Style */}
        <div className="space-y-2">
          {phases.map((phase) => {
            const Icon = phase.icon;
            const colors = getPhaseColor(phase.color);
            const isExpanded = expandedPhase === phase.id;

            return (
              <div 
                key={phase.id}
                className={`rounded-xl border transition-all ${
                  isExpanded ? `${colors.bg} ${colors.border}` : "bg-slate-800/20 border-slate-800/50"
                }`}
              >
                {/* Phase Header */}
                <button
                  onClick={() => setExpandedPhase(isExpanded ? -1 : phase.id)}
                  className="w-full p-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg ${colors.bg} flex items-center justify-center`}>
                      <Icon className={`w-4 h-4 ${colors.text}`} />
                    </div>
                    <div className="text-left">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium ${isExpanded ? "text-white" : "text-slate-300"}`}>
                          {phase.label}
                        </span>
                        <span className="text-xs text-slate-600">• {phase.sublabel}</span>
                      </div>
                    </div>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-slate-500" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-500" />
                  )}
                </button>

                {/* Phase Fields */}
                {isExpanded && (
                  <div className="px-4 pb-4 space-y-4">
                    {phase.fields.map((field) => (
                      <CompactSlider
                        key={field.key}
                        label={field.label}
                        sublabel={"sublabel" in field ? field.sublabel : undefined}
                        value={inputs[field.key as keyof BRRRRInputs]}
                        min={field.min}
                        max={field.max}
                        step={field.step}
                        format={"format" in field ? field.format : "€"}
                        decimals={"decimals" in field ? field.decimals : undefined}
                        color={phase.color}
                        onChange={(v) => handleChange(field.key as keyof BRRRRInputs, v)}
                      />
                    ))}

                    {/* Forced Equity Indicator in Rehab phase */}
                    {phase.id === 1 && (
                      <div className={`p-3 rounded-lg ${
                        results.forcedEquity > 0 
                          ? "bg-emerald-950/30 border border-emerald-500/20" 
                          : "bg-red-950/30 border border-red-500/20"
                      }`}>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-slate-500">Vytvorené equity</span>
                          <span className={`text-sm font-medium ${
                            results.forcedEquity > 0 ? "text-emerald-400" : "text-red-400"
                          }`}>
                            €{results.forcedEquity.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Results Column */}
        <div className="space-y-4">
          {/* Cash Flow Breakdown */}
          <div className="p-5 rounded-xl bg-slate-800/20 border border-slate-800/50">
            <div className="text-xs text-slate-500 uppercase tracking-wider mb-4">
              Mesačný Cash Flow
            </div>
            <div className="space-y-2">
              <FlowLine label="Nájom" value={inputs.monthlyRent} />
              <FlowLine label="Náklady" value={-inputs.monthlyExpenses} />
              <FlowLine label="Splátka" value={-results.monthlyMortgagePayment} />
              <div className="pt-3 mt-3 border-t border-slate-800">
                <FlowLine label="Cash Flow" value={results.monthlyCashFlow} highlight />
              </div>
            </div>
          </div>

          {/* Equity Position */}
          <div className="p-5 rounded-xl bg-slate-800/20 border border-slate-800/50">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-slate-500 uppercase tracking-wider">Equity pozícia</span>
              <span className="text-xs text-slate-500">
                {((results.equityPosition / inputs.afterRepairValue) * 100).toFixed(0)}% z ARV
              </span>
            </div>
            <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-violet-500 to-violet-400 rounded-full"
                style={{ width: `${(results.equityPosition / inputs.afterRepairValue) * 100}%` }}
              />
            </div>
            <div className="mt-3 flex items-center justify-between text-sm">
              <span className="text-violet-400 font-medium">€{results.equityPosition.toLocaleString()}</span>
              <span className="text-slate-600">ARV: €{inputs.afterRepairValue.toLocaleString()}</span>
            </div>
          </div>

          {/* Summary Grid */}
          <div className="grid grid-cols-2 gap-3">
            <SummaryTile
              label="Cash-on-Cash"
              value={results.isInfiniteReturn ? "∞" : `${results.cashOnCash.toFixed(1)}%`}
              good={results.cashOnCash >= 8 || results.isInfiniteReturn}
            />
            <SummaryTile
              label="ROI"
              value={`${results.roi}%`}
              good={results.roi > 0}
            />
            <SummaryTile
              label="Hotovosť v deale"
              value={`€${Math.max(0, results.cashLeftInDeal).toLocaleString()}`}
              good={results.cashLeftInDeal <= 0}
            />
            <SummaryTile
              label="ARV"
              value={`€${(inputs.afterRepairValue / 1000).toFixed(0)}k`}
            />
          </div>

          {/* Success Message */}
          {isSuccess && (
            <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/20">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-medium text-emerald-400">Nekonečná návratnosť</span>
              </div>
              <p className="text-xs text-slate-500">
                Vybrali ste všetku investovanú hotovosť a máte nehnuteľnosť generujúcu pasívny príjem. 
                Použite €{results.cashRecovered.toLocaleString()} na ďalší deal.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Compact Slider
function CompactSlider({
  label,
  sublabel,
  value,
  min,
  max,
  step,
  format,
  decimals = 0,
  color,
  onChange,
}: {
  label: string;
  sublabel?: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: string;
  decimals?: number;
  color: string;
  onChange: (value: number) => void;
}) {
  const percentage = ((value - min) / (max - min)) * 100;
  const colorClass = {
    blue: "from-blue-500/80 to-blue-400/80",
    orange: "from-orange-500/80 to-orange-400/80",
    green: "from-green-500/80 to-green-400/80",
    violet: "from-violet-500/80 to-violet-400/80",
  }[color] || "from-slate-500/80 to-slate-400/80";

  const formatValue = () => {
    const num = decimals > 0 ? value.toFixed(decimals) : value.toLocaleString();
    return format === "€" ? `€${num}` : `${num}${format}`;
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-sm text-slate-400">{label}</span>
          {sublabel && <span className="text-xs text-slate-600 ml-2">{sublabel}</span>}
        </div>
        <span className="text-sm font-medium text-white tabular-nums">{formatValue()}</span>
      </div>
      <div className="relative h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
        <div 
          className={`absolute inset-y-0 left-0 bg-gradient-to-r ${colorClass} rounded-full`}
          style={{ width: `${percentage}%` }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full opacity-0 cursor-pointer"
        />
      </div>
    </div>
  );
}

// Mini Metric
function MiniMetric({ 
  label, 
  value, 
  sublabel, 
  highlight,
  icon 
}: { 
  label: string; 
  value: string; 
  sublabel?: string; 
  highlight?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div className="p-3 rounded-lg bg-slate-800/30 border border-slate-800/50">
      <div className="text-[10px] text-slate-600 uppercase tracking-wider">{label}</div>
      <div className={`text-lg font-medium flex items-center gap-1 ${highlight ? "text-emerald-400" : "text-slate-300"}`}>
        {icon}
        {value}
      </div>
      {sublabel && <div className="text-[10px] text-slate-600">{sublabel}</div>}
    </div>
  );
}

// Flow Line
function FlowLine({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  const isPositive = value >= 0;
  return (
    <div className="flex justify-between items-center">
      <span className={`text-sm ${highlight ? "text-white font-medium" : "text-slate-500"}`}>{label}</span>
      <span className={`text-sm font-medium tabular-nums ${
        highlight 
          ? isPositive ? "text-emerald-400" : "text-red-400"
          : isPositive ? "text-slate-400" : "text-red-400/70"
      }`}>
        {isPositive ? "+" : ""}€{Math.abs(value).toLocaleString()}
      </span>
    </div>
  );
}

// Summary Tile
function SummaryTile({ label, value, good }: { label: string; value: string; good?: boolean }) {
  return (
    <div className="p-3 rounded-lg bg-slate-800/20 border border-slate-800/30">
      <div className="text-[10px] text-slate-600 uppercase tracking-wider">{label}</div>
      <div className={`text-lg font-medium ${
        good === undefined ? "text-slate-300" : good ? "text-emerald-400" : "text-slate-400"
      }`}>
        {value}
      </div>
    </div>
  );
}
