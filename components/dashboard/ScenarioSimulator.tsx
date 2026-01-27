"use client";

import { useState, useMemo, useCallback } from "react";
import {
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Info,
  ChevronRight,
} from "lucide-react";

interface ScenarioInputs {
  propertyPrice: number;
  monthlyRent: number;
  interestRate: number;
  downPayment: number;
  loanTerm: number;
  vacancyRate: number;
  monthlyExpenses: number;
  annualAppreciation: number;
  rentGrowth: number;
}

interface ScenarioResults {
  monthlyPayment: number;
  annualRent: number;
  annualRentAfterVacancy: number;
  annualExpenses: number;
  netAnnualIncome: number;
  cashOnCashReturn: number;
  grossYield: number;
  netYield: number;
  breakEvenRent: number;
  isPositive: boolean;
  downPaymentAmount: number;
  loanAmount: number;
  totalInterest: number;
  yearlyProjection: YearlyData[];
}

interface YearlyData {
  year: number;
  propertyValue: number;
  equity: number;
  annualRent: number;
  netIncome: number;
  cumulativeIncome: number;
  roi: number;
}

const PRESET_SCENARIOS = [
  { name: "Konzervatívny", downPayment: 30, interestRate: 4.0, vacancyRate: 8.33 },
  { name: "Štandardný", downPayment: 20, interestRate: 4.5, vacancyRate: 5 },
  { name: "Agresívny", downPayment: 15, interestRate: 5.0, vacancyRate: 3 },
];

interface ScenarioSimulatorProps {
  initialData?: {
    price: number;
    area: number;
    rent: number;
    title: string;
  } | null;
}

export function ScenarioSimulator({ initialData }: ScenarioSimulatorProps) {
  const [inputs, setInputs] = useState<ScenarioInputs>(() => {
    if (initialData?.price) {
      return {
        propertyPrice: initialData.price,
        monthlyRent: initialData.rent || Math.round(initialData.price * 0.004), // ~0.4% of price as estimate
        interestRate: 4.5,
        downPayment: 20,
        loanTerm: 25,
        vacancyRate: 5,
        monthlyExpenses: 120,
        annualAppreciation: 3,
        rentGrowth: 2,
      };
    }
    return {
      propertyPrice: 150000,
      monthlyRent: 650,
      interestRate: 4.5,
      downPayment: 20,
      loanTerm: 25,
      vacancyRate: 5,
      monthlyExpenses: 120,
      annualAppreciation: 3,
      rentGrowth: 2,
    };
  });

  const [activeSection, setActiveSection] = useState<"inputs" | "projection">("inputs");

  const results = useMemo<ScenarioResults>(() => {
    return calculateScenario(inputs);
  }, [inputs]);

  const handleInputChange = useCallback((field: keyof ScenarioInputs, value: number) => {
    setInputs((prev) => ({ ...prev, [field]: value }));
  }, []);

  const applyPreset = (preset: typeof PRESET_SCENARIOS[0]) => {
    setInputs((prev) => ({
      ...prev,
      downPayment: preset.downPayment,
      interestRate: preset.interestRate,
      vacancyRate: preset.vacancyRate,
    }));
  };

  // Investment score (0-100)
  const investmentScore = useMemo(() => {
    let score = 50;
    if (results.cashOnCashReturn > 8) score += 20;
    else if (results.cashOnCashReturn > 5) score += 10;
    else if (results.cashOnCashReturn < 0) score -= 20;
    
    if (results.grossYield > 6) score += 15;
    else if (results.grossYield > 4) score += 5;
    
    if (results.isPositive) score += 15;
    else score -= 15;
    
    return Math.max(0, Math.min(100, score));
  }, [results]);

  const getScoreColor = (score: number) => {
    if (score >= 70) return "emerald";
    if (score >= 50) return "amber";
    return "red";
  };

  const scoreColor = getScoreColor(investmentScore);

  return (
    <div className="space-y-6">
      {/* Score + Key Metrics Header */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Investment Score */}
        <div className="lg:w-64 shrink-0">
          <div className={`relative p-6 rounded-2xl border ${
            scoreColor === "emerald" ? "bg-emerald-950/30 border-emerald-500/20" :
            scoreColor === "amber" ? "bg-amber-950/30 border-amber-500/20" :
            "bg-red-950/30 border-red-500/20"
          }`}>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Skóre</span>
              {results.isPositive ? (
                <CheckCircle className={`w-4 h-4 ${
                  scoreColor === "emerald" ? "text-emerald-400" :
                  scoreColor === "amber" ? "text-amber-400" : "text-red-400"
                }`} />
              ) : (
                <AlertTriangle className="w-4 h-4 text-red-400" />
              )}
            </div>
            <div className="flex items-baseline gap-1">
              <span className={`text-5xl font-light tabular-nums ${
                scoreColor === "emerald" ? "text-emerald-400" :
                scoreColor === "amber" ? "text-amber-400" : "text-red-400"
              }`}>
                {investmentScore}
              </span>
              <span className="text-zinc-600 text-lg">/100</span>
            </div>
            {/* Score Bar */}
            <div className="mt-4 h-1 bg-zinc-800 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${
                  scoreColor === "emerald" ? "bg-emerald-500" :
                  scoreColor === "amber" ? "bg-amber-500" : "bg-red-500"
                }`}
                style={{ width: `${investmentScore}%` }}
              />
            </div>
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricTile
            label="Cash-on-Cash"
            value={`${results.cashOnCashReturn.toFixed(1)}%`}
            status={results.cashOnCashReturn >= 8 ? "good" : results.cashOnCashReturn >= 5 ? "neutral" : "bad"}
          />
          <MetricTile
            label="Hrubý výnos"
            value={`${results.grossYield.toFixed(1)}%`}
            status={results.grossYield >= 6 ? "good" : results.grossYield >= 4 ? "neutral" : "bad"}
          />
          <MetricTile
            label="Ročný zisk"
            value={`€${Math.abs(results.netAnnualIncome).toLocaleString()}`}
            status={results.netAnnualIncome >= 0 ? "good" : "bad"}
            prefix={results.netAnnualIncome >= 0 ? "+" : "-"}
          />
          <MetricTile
            label="Mesačná splátka"
            value={`€${results.monthlyPayment.toLocaleString()}`}
            status="neutral"
          />
        </div>
      </div>

      {/* Presets */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-zinc-600">Scenár:</span>
        <div className="flex gap-2">
          {PRESET_SCENARIOS.map((preset) => {
            const isActive = inputs.downPayment === preset.downPayment && inputs.interestRate === preset.interestRate;
            return (
              <button
                key={preset.name}
                onClick={() => applyPreset(preset)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? "bg-zinc-700 text-white"
                    : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50"
                }`}
              >
                {preset.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Section Toggle */}
      <div className="flex gap-1 p-1 bg-zinc-800/30 rounded-lg w-fit">
        <button
          onClick={() => setActiveSection("inputs")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
            activeSection === "inputs"
              ? "bg-zinc-700 text-white"
              : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          Parametre
        </button>
        <button
          onClick={() => setActiveSection("projection")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
            activeSection === "projection"
              ? "bg-zinc-700 text-white"
              : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          10-ročná projekcia
        </button>
      </div>

      {/* Content */}
      {activeSection === "inputs" && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Inputs Column */}
          <div className="lg:col-span-3 space-y-1">
            {/* Property & Rent */}
            <div className="p-4 rounded-xl bg-zinc-800/20 border border-zinc-800/50 space-y-4">
              <ModernSlider
                label="Cena nehnuteľnosti"
                value={inputs.propertyPrice}
                min={50000}
                max={500000}
                step={5000}
                format={(v) => `€${v.toLocaleString()}`}
                onChange={(v) => handleInputChange("propertyPrice", v)}
              />
              <ModernSlider
                label="Mesačný nájom"
                value={inputs.monthlyRent}
                min={200}
                max={2500}
                step={50}
                format={(v) => `€${v.toLocaleString()}`}
                onChange={(v) => handleInputChange("monthlyRent", v)}
              />
            </div>

            {/* Financing */}
            <div className="p-4 rounded-xl bg-zinc-800/20 border border-zinc-800/50 space-y-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-zinc-500 uppercase tracking-wider">Financovanie</span>
                <span className="text-xs text-zinc-600">
                  Úver: €{results.loanAmount.toLocaleString()}
                </span>
              </div>
              <ModernSlider
                label="Vlastné zdroje"
                value={inputs.downPayment}
                min={10}
                max={100}
                step={5}
                format={(v) => `${v}%`}
                sublabel={`€${(inputs.propertyPrice * inputs.downPayment / 100).toLocaleString()}`}
                onChange={(v) => handleInputChange("downPayment", v)}
              />
              <ModernSlider
                label="Úroková sadzba"
                value={inputs.interestRate}
                min={2}
                max={8}
                step={0.1}
                format={(v) => `${v.toFixed(1)}%`}
                onChange={(v) => handleInputChange("interestRate", v)}
              />
              <ModernSlider
                label="Doba splácania"
                value={inputs.loanTerm}
                min={5}
                max={30}
                step={1}
                format={(v) => `${v} rokov`}
                onChange={(v) => handleInputChange("loanTerm", v)}
              />
            </div>

            {/* Costs */}
            <div className="p-4 rounded-xl bg-zinc-800/20 border border-zinc-800/50 space-y-4">
              <span className="text-xs text-zinc-500 uppercase tracking-wider">Náklady & Rast</span>
              <ModernSlider
                label="Výpadok nájmu"
                value={inputs.vacancyRate}
                min={0}
                max={20}
                step={1}
                format={(v) => `${v}%`}
                sublabel={`≈ ${(inputs.vacancyRate * 12 / 100).toFixed(1)} mes/rok`}
                onChange={(v) => handleInputChange("vacancyRate", v)}
              />
              <ModernSlider
                label="Mesačné náklady"
                value={inputs.monthlyExpenses}
                min={0}
                max={500}
                step={10}
                format={(v) => `€${v}`}
                onChange={(v) => handleInputChange("monthlyExpenses", v)}
              />
              <ModernSlider
                label="Zhodnotenie nehnuteľnosti"
                value={inputs.annualAppreciation}
                min={0}
                max={10}
                step={0.5}
                format={(v) => `${v.toFixed(1)}%/rok`}
                onChange={(v) => handleInputChange("annualAppreciation", v)}
              />
            </div>
          </div>

          {/* Results Column */}
          <div className="lg:col-span-2 space-y-4">
            {/* Cash Flow */}
            <div className="p-5 rounded-xl bg-zinc-800/30 border border-zinc-800/50">
              <div className="text-xs text-zinc-500 uppercase tracking-wider mb-4">Mesačný Cash Flow</div>
              <div className="space-y-2">
                <FlowRow label="Nájom" value={inputs.monthlyRent} />
                <FlowRow label="Vacancy" value={-(inputs.monthlyRent * inputs.vacancyRate / 100)} />
                <FlowRow label="Náklady" value={-inputs.monthlyExpenses} />
                <FlowRow label="Splátka" value={-results.monthlyPayment} />
                <div className="pt-3 mt-3 border-t border-zinc-800">
                  <FlowRow label="Cash Flow" value={results.netAnnualIncome / 12} highlight />
                </div>
              </div>
            </div>

            {/* Summary Metrics */}
            <div className="grid grid-cols-2 gap-3">
              <SummaryCard
                label="Čistý výnos"
                value={`${results.netYield.toFixed(2)}%`}
                good={results.netYield > 0}
              />
              <SummaryCard
                label="Break-even nájom"
                value={`€${results.breakEvenRent.toFixed(0)}`}
                good={inputs.monthlyRent >= results.breakEvenRent}
              />
              <SummaryCard
                label="Návratnosť"
                value={results.cashOnCashReturn > 0 ? `${(100 / results.cashOnCashReturn).toFixed(1)} r.` : "—"}
              />
              <SummaryCard
                label="Celkové úroky"
                value={`€${(results.totalInterest / 1000).toFixed(0)}k`}
                sublabel={`za ${inputs.loanTerm} rokov`}
              />
            </div>
          </div>
        </div>
      )}

      {activeSection === "projection" && (
        <div className="space-y-6">
          {/* Chart */}
          <div className="p-6 rounded-xl bg-zinc-800/20 border border-zinc-800/50">
            <div className="flex items-center justify-between mb-6">
              <span className="text-xs text-zinc-500 uppercase tracking-wider">Vývoj hodnoty a equity</span>
              <div className="flex items-center gap-4 text-xs">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-zinc-600" />
                  <span className="text-zinc-500">Hodnota</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-zinc-500">Equity</span>
                </span>
              </div>
            </div>
            <div className="h-48 flex items-end gap-1">
              {results.yearlyProjection.map((year, idx) => {
                const maxValue = Math.max(...results.yearlyProjection.map(y => y.propertyValue));
                const height = (year.propertyValue / maxValue) * 100;
                const equityHeight = (year.equity / year.propertyValue) * 100;
                
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-1 group">
                    <div 
                      className="w-full bg-zinc-700/50 rounded-sm relative transition-all group-hover:bg-zinc-700" 
                      style={{ height: `${height}%` }}
                    >
                      <div
                        className="absolute bottom-0 left-0 right-0 bg-emerald-500/40 rounded-sm transition-all group-hover:bg-emerald-500/60"
                        style={{ height: `${equityHeight}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-zinc-600">{year.year}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 10 Year Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <ProjectionCard
              label="Hodnota po 10 rokoch"
              value={`€${(results.yearlyProjection[9]?.propertyValue / 1000).toFixed(0)}k`}
              change={`+€${((results.yearlyProjection[9]?.propertyValue || 0) - inputs.propertyPrice).toLocaleString()}`}
              color="emerald"
            />
            <ProjectionCard
              label="Kumulatívny príjem"
              value={`€${(results.yearlyProjection[9]?.cumulativeIncome / 1000).toFixed(0)}k`}
              change="za 10 rokov"
              color="blue"
            />
            <ProjectionCard
              label="Celkové ROI"
              value={`${results.yearlyProjection[9]?.roi.toFixed(0) || 0}%`}
              change="na investovaný kapitál"
              color="violet"
            />
          </div>

          {/* Compact Table */}
          <div className="overflow-x-auto rounded-xl border border-zinc-800/50">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-zinc-800/30">
                  <th className="text-left py-3 px-4 text-xs font-medium text-zinc-500 uppercase tracking-wider">Rok</th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-zinc-500 uppercase tracking-wider">Hodnota</th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-zinc-500 uppercase tracking-wider">Equity</th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-zinc-500 uppercase tracking-wider">Zisk/rok</th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-zinc-500 uppercase tracking-wider">ROI</th>
                </tr>
              </thead>
              <tbody>
                {results.yearlyProjection.map((year, idx) => (
                  <tr key={year.year} className={`border-t border-zinc-800/30 ${idx % 2 === 0 ? "bg-zinc-800/10" : ""}`}>
                    <td className="py-2.5 px-4 text-zinc-300 font-medium">{year.year}</td>
                    <td className="py-2.5 px-4 text-right text-zinc-400">€{year.propertyValue.toLocaleString()}</td>
                    <td className="py-2.5 px-4 text-right text-emerald-400/80">€{year.equity.toLocaleString()}</td>
                    <td className={`py-2.5 px-4 text-right ${year.netIncome >= 0 ? "text-emerald-400/80" : "text-red-400/80"}`}>
                      €{year.netIncome.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-4 text-right text-zinc-400">{year.roi.toFixed(0)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// Modern Slider Component
function ModernSlider({
  label,
  value,
  min,
  max,
  step,
  format,
  sublabel,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  sublabel?: string;
  onChange: (value: number) => void;
}) {
  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm text-zinc-400">{label}</span>
        <div className="text-right">
          <span className="text-sm font-medium text-white tabular-nums">{format(value)}</span>
          {sublabel && <span className="text-xs text-zinc-600 ml-2">{sublabel}</span>}
        </div>
      </div>
      <div className="relative h-1.5 bg-zinc-700/50 rounded-full overflow-hidden">
        <div 
          className="absolute inset-y-0 left-0 bg-emerald-500 rounded-full"
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

// Metric Tile Component
function MetricTile({
  label,
  value,
  status,
  prefix,
}: {
  label: string;
  value: string;
  status: "good" | "neutral" | "bad";
  prefix?: string;
}) {
  return (
    <div className="p-4 rounded-xl bg-zinc-800/20 border border-zinc-800/50">
      <div className="text-xs text-zinc-500 mb-1">{label}</div>
      <div className={`text-xl font-medium tabular-nums ${
        status === "good" ? "text-emerald-400" :
        status === "bad" ? "text-red-400" : "text-zinc-300"
      }`}>
        {prefix}{value}
      </div>
    </div>
  );
}

// Flow Row Component
function FlowRow({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  const isPositive = value >= 0;
  return (
    <div className="flex justify-between items-center">
      <span className={`text-sm ${highlight ? "text-white font-medium" : "text-zinc-500"}`}>{label}</span>
      <span className={`text-sm font-medium tabular-nums ${
        highlight 
          ? isPositive ? "text-emerald-400" : "text-red-400"
          : isPositive ? "text-zinc-400" : "text-red-400/70"
      }`}>
        {isPositive ? "+" : ""}€{Math.abs(value).toFixed(0)}
      </span>
    </div>
  );
}

// Summary Card Component
function SummaryCard({ label, value, good, sublabel }: { label: string; value: string; good?: boolean; sublabel?: string }) {
  return (
    <div className="p-3 rounded-lg bg-zinc-800/20 border border-zinc-800/30">
      <div className="text-[10px] text-zinc-600 uppercase tracking-wider">{label}</div>
      <div className={`text-lg font-medium ${
        good === undefined ? "text-zinc-300" : good ? "text-emerald-400" : "text-zinc-400"
      }`}>
        {value}
      </div>
      {sublabel && <div className="text-[10px] text-zinc-600">{sublabel}</div>}
    </div>
  );
}

// Projection Card Component
function ProjectionCard({ label, value, change, color }: { label: string; value: string; change: string; color: "emerald" | "blue" | "violet" }) {
  const colors = {
    emerald: "bg-emerald-950/30 border-emerald-500/20 text-emerald-400",
    blue: "bg-blue-950/30 border-blue-500/20 text-blue-400",
    violet: "bg-violet-950/30 border-violet-500/20 text-violet-400",
  };
  return (
    <div className={`p-5 rounded-xl border ${colors[color]}`}>
      <div className="text-xs text-zinc-500 mb-1">{label}</div>
      <div className={`text-3xl font-light ${colors[color].split(" ")[2]}`}>{value}</div>
      <div className="text-xs text-zinc-600 mt-1">{change}</div>
    </div>
  );
}

function calculateScenario(inputs: ScenarioInputs): ScenarioResults {
  const loanAmount = inputs.propertyPrice * (1 - inputs.downPayment / 100);
  const downPaymentAmount = inputs.propertyPrice * (inputs.downPayment / 100);
  const monthlyInterestRate = inputs.interestRate / 100 / 12;
  const numberOfPayments = inputs.loanTerm * 12;

  // Monthly payment calculation
  const monthlyPayment = loanAmount > 0
    ? loanAmount *
      (monthlyInterestRate * Math.pow(1 + monthlyInterestRate, numberOfPayments)) /
      (Math.pow(1 + monthlyInterestRate, numberOfPayments) - 1)
    : 0;

  // Annual values
  const annualRent = inputs.monthlyRent * 12;
  const annualRentAfterVacancy = annualRent * (1 - inputs.vacancyRate / 100);
  const annualExpenses = inputs.monthlyExpenses * 12;
  const annualLoanPayments = monthlyPayment * 12;
  const netAnnualIncome = annualRentAfterVacancy - annualExpenses - annualLoanPayments;

  // Yields
  const grossYield = (annualRent / inputs.propertyPrice) * 100;
  const netYield = (netAnnualIncome / inputs.propertyPrice) * 100;
  const cashOnCashReturn = downPaymentAmount > 0 ? (netAnnualIncome / downPaymentAmount) * 100 : 0;

  // Break-even rent
  const breakEvenRent = (annualLoanPayments + annualExpenses) / 12 / (1 - inputs.vacancyRate / 100);

  // Total interest
  const totalInterest = (monthlyPayment * numberOfPayments) - loanAmount;

  // 10-year projection
  const yearlyProjection: YearlyData[] = [];
  let propertyValue = inputs.propertyPrice;
  let currentRent = inputs.monthlyRent;
  let remainingLoan = loanAmount;
  let cumulativeIncome = 0;

  for (let year = 1; year <= 10; year++) {
    propertyValue *= (1 + inputs.annualAppreciation / 100);
    currentRent *= (1 + inputs.rentGrowth / 100);
    
    const yearlyRent = currentRent * 12 * (1 - inputs.vacancyRate / 100);
    const yearlyNet = yearlyRent - annualExpenses - annualLoanPayments;
    cumulativeIncome += yearlyNet;
    
    // Simple loan amortization
    const principalPaid = annualLoanPayments - (remainingLoan * (inputs.interestRate / 100));
    remainingLoan = Math.max(0, remainingLoan - principalPaid);
    
    const equity = propertyValue - remainingLoan;
    const totalReturn = (propertyValue - inputs.propertyPrice) + cumulativeIncome;
    const roi = (totalReturn / downPaymentAmount) * 100;

    yearlyProjection.push({
      year,
      propertyValue: Math.round(propertyValue),
      equity: Math.round(equity),
      annualRent: Math.round(yearlyRent),
      netIncome: Math.round(yearlyNet),
      cumulativeIncome: Math.round(cumulativeIncome),
      roi: Math.round(roi),
    });
  }

  return {
    monthlyPayment: Math.round(monthlyPayment),
    annualRent,
    annualRentAfterVacancy: Math.round(annualRentAfterVacancy),
    annualExpenses,
    netAnnualIncome: Math.round(netAnnualIncome),
    cashOnCashReturn,
    grossYield,
    netYield,
    breakEvenRent: Math.round(breakEvenRent),
    isPositive: netAnnualIncome > 0,
    downPaymentAmount,
    loanAmount,
    totalInterest: Math.round(totalInterest),
    yearlyProjection,
  };
}
