"use client";

import { useState, useMemo, useCallback } from "react";
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Info,
  Wallet,
  Home,
  Percent,
  Calendar,
  PiggyBank,
  ArrowRight,
  Sparkles,
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

export function ScenarioSimulator() {
  const [inputs, setInputs] = useState<ScenarioInputs>({
    propertyPrice: 150000,
    monthlyRent: 650,
    interestRate: 4.5,
    downPayment: 20,
    loanTerm: 25,
    vacancyRate: 5,
    monthlyExpenses: 120,
    annualAppreciation: 3,
    rentGrowth: 2,
  });

  const [activeTab, setActiveTab] = useState<"basic" | "advanced" | "projection">("basic");

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
    if (score >= 70) return "text-emerald-400";
    if (score >= 50) return "text-yellow-400";
    return "text-red-400";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return "Výborná investícia";
    if (score >= 70) return "Dobrá investícia";
    if (score >= 50) return "Priemerná investícia";
    if (score >= 30) return "Riziková investícia";
    return "Nevýhodná investícia";
  };

  return (
    <div className="space-y-6">
      {/* Investment Score Card */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 border border-slate-700">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-yellow-400" />
              <span className="text-sm text-slate-400">Investičné skóre</span>
            </div>
            <div className="flex items-baseline gap-3">
              <span className={`text-5xl font-bold ${getScoreColor(investmentScore)}`}>
                {investmentScore}
              </span>
              <span className="text-slate-400">/100</span>
            </div>
            <p className={`text-sm mt-1 ${getScoreColor(investmentScore)}`}>
              {getScoreLabel(investmentScore)}
            </p>
          </div>
          
          {/* Score Ring */}
          <div className="relative w-32 h-32">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="64"
                cy="64"
                r="56"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                className="text-slate-700"
              />
              <circle
                cx="64"
                cy="64"
                r="56"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={`${(investmentScore / 100) * 352} 352`}
                className={getScoreColor(investmentScore)}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              {results.isPositive ? (
                <CheckCircle className="w-10 h-10 text-emerald-400" />
              ) : (
                <AlertTriangle className="w-10 h-10 text-red-400" />
              )}
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-700">
          <div className="text-center">
            <div className="text-2xl font-bold text-slate-100">
              {results.cashOnCashReturn.toFixed(1)}%
            </div>
            <div className="text-xs text-slate-400">Cash-on-Cash</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-slate-100">
              {results.grossYield.toFixed(1)}%
            </div>
            <div className="text-xs text-slate-400">Hrubý výnos</div>
          </div>
          <div className="text-center">
            <div className={`text-2xl font-bold ${results.netAnnualIncome >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              €{Math.abs(results.netAnnualIncome).toLocaleString()}
            </div>
            <div className="text-xs text-slate-400">Ročný zisk</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-slate-100">
              €{results.monthlyPayment.toLocaleString()}
            </div>
            <div className="text-xs text-slate-400">Mesačná splátka</div>
          </div>
        </div>
      </div>

      {/* Preset Scenarios */}
      <div className="flex gap-3">
        {PRESET_SCENARIOS.map((preset) => (
          <button
            key={preset.name}
            onClick={() => applyPreset(preset)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              inputs.downPayment === preset.downPayment &&
              inputs.interestRate === preset.interestRate
                ? "bg-emerald-500 text-white"
                : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            }`}
          >
            {preset.name}
          </button>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800">
        {[
          { id: "basic", label: "Základné parametre" },
          { id: "advanced", label: "Pokročilé" },
          { id: "projection", label: "10-ročná projekcia" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "text-emerald-400 border-b-2 border-emerald-400"
                : "text-slate-400 hover:text-slate-100"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "basic" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Inputs */}
          <div className="space-y-6">
            {/* Property Price */}
            <InputSlider
              icon={<Home className="w-5 h-5" />}
              label="Cena nehnuteľnosti"
              value={inputs.propertyPrice}
              min={50000}
              max={500000}
              step={5000}
              unit="€"
              onChange={(v) => handleInputChange("propertyPrice", v)}
            />

            {/* Monthly Rent */}
            <InputSlider
              icon={<Wallet className="w-5 h-5" />}
              label="Mesačný nájom"
              value={inputs.monthlyRent}
              min={200}
              max={2500}
              step={50}
              unit="€"
              onChange={(v) => handleInputChange("monthlyRent", v)}
            />

            {/* Down Payment */}
            <InputSlider
              icon={<PiggyBank className="w-5 h-5" />}
              label="Vlastné zdroje"
              value={inputs.downPayment}
              min={10}
              max={100}
              step={5}
              unit="%"
              onChange={(v) => handleInputChange("downPayment", v)}
              info={`= €${(inputs.propertyPrice * inputs.downPayment / 100).toLocaleString()}`}
            />

            {/* Interest Rate */}
            <InputSlider
              icon={<Percent className="w-5 h-5" />}
              label="Úroková sadzba"
              value={inputs.interestRate}
              min={2}
              max={8}
              step={0.1}
              unit="%"
              decimals={2}
              onChange={(v) => handleInputChange("interestRate", v)}
            />

            {/* Loan Term */}
            <InputSlider
              icon={<Calendar className="w-5 h-5" />}
              label="Doba splácania"
              value={inputs.loanTerm}
              min={5}
              max={30}
              step={1}
              unit=" rokov"
              onChange={(v) => handleInputChange("loanTerm", v)}
            />
          </div>

          {/* Results */}
          <div className="space-y-4">
            {/* Cash Flow Breakdown */}
            <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700">
              <h4 className="font-semibold text-slate-100 mb-4">Mesačný cash flow</h4>
              <div className="space-y-3">
                <FlowItem label="Príjem z nájmu" value={inputs.monthlyRent} positive />
                <FlowItem label="Výpadok (vacancy)" value={-(inputs.monthlyRent * inputs.vacancyRate / 100)} />
                <FlowItem label="Prevádzkové náklady" value={-inputs.monthlyExpenses} />
                <FlowItem label="Splátka hypotéky" value={-results.monthlyPayment} />
                <div className="border-t border-slate-600 pt-3 mt-3">
                  <FlowItem
                    label="Čistý mesačný cash flow"
                    value={results.netAnnualIncome / 12}
                    highlight
                  />
                </div>
              </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-2 gap-4">
              <MetricCard
                label="Hrubý výnos"
                value={`${results.grossYield.toFixed(2)}%`}
                info="Ročný nájom / Cena"
                good={results.grossYield > 5}
              />
              <MetricCard
                label="Čistý výnos"
                value={`${results.netYield.toFixed(2)}%`}
                info="Po odpočítaní nákladov"
                good={results.netYield > 0}
              />
              <MetricCard
                label="Break-even nájom"
                value={`€${results.breakEvenRent.toFixed(0)}`}
                info="Min. nájom na pokrytie"
                good={inputs.monthlyRent >= results.breakEvenRent}
              />
              <MetricCard
                label="Celkové úroky"
                value={`€${results.totalInterest.toLocaleString()}`}
                info={`Za ${inputs.loanTerm} rokov`}
              />
            </div>

            {/* Investment Summary */}
            <div className="bg-gradient-to-r from-emerald-500/10 to-blue-500/10 rounded-xl p-5 border border-emerald-500/20">
              <div className="flex items-center gap-2 mb-3">
                <Info className="w-5 h-5 text-emerald-400" />
                <span className="font-semibold text-slate-100">Zhrnutie investície</span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-slate-400">Investovaný kapitál:</span>
                  <span className="text-slate-100 font-medium ml-2">
                    €{results.downPaymentAmount.toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400">Výška úveru:</span>
                  <span className="text-slate-100 font-medium ml-2">
                    €{results.loanAmount.toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400">Návratnosť:</span>
                  <span className="text-emerald-400 font-medium ml-2">
                    {results.cashOnCashReturn > 0
                      ? `${(100 / results.cashOnCashReturn).toFixed(1)} rokov`
                      : "—"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400">Ročný zisk:</span>
                  <span className={`font-medium ml-2 ${results.netAnnualIncome >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    €{results.netAnnualIncome.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "advanced" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <InputSlider
              label="Výpadok nájmu (vacancy)"
              value={inputs.vacancyRate}
              min={0}
              max={20}
              step={1}
              unit="%"
              onChange={(v) => handleInputChange("vacancyRate", v)}
              info={`≈ ${(inputs.vacancyRate * 12 / 100).toFixed(1)} mesiacov/rok prázdny`}
            />
            <InputSlider
              label="Mesačné prevádzkové náklady"
              value={inputs.monthlyExpenses}
              min={0}
              max={500}
              step={10}
              unit="€"
              onChange={(v) => handleInputChange("monthlyExpenses", v)}
              info="Správa, poistenie, údržba..."
            />
            <InputSlider
              label="Ročné zhodnotenie nehnuteľnosti"
              value={inputs.annualAppreciation}
              min={0}
              max={10}
              step={0.5}
              unit="%"
              decimals={1}
              onChange={(v) => handleInputChange("annualAppreciation", v)}
            />
            <InputSlider
              label="Ročný rast nájmu"
              value={inputs.rentGrowth}
              min={0}
              max={8}
              step={0.5}
              unit="%"
              decimals={1}
              onChange={(v) => handleInputChange("rentGrowth", v)}
            />
          </div>
          <div className="bg-slate-800/30 rounded-xl p-6 border border-slate-700">
            <h4 className="font-semibold text-slate-100 mb-4">Čo znamenajú tieto parametre?</h4>
            <div className="space-y-4 text-sm text-slate-400">
              <p>
                <strong className="text-slate-200">Výpadok nájmu</strong> — percento času, keď je byt prázdny
                (hľadanie nájomníka, rekonštrukcia). Štandard je 5-10%.
              </p>
              <p>
                <strong className="text-slate-200">Prevádzkové náklady</strong> — mesačné výdavky na správu,
                poistenie, fond opráv, drobné opravy. Typicky €80-200.
              </p>
              <p>
                <strong className="text-slate-200">Zhodnotenie</strong> — predpokladaný ročný rast ceny
                nehnuteľnosti. Historicky 2-5% na Slovensku.
              </p>
              <p>
                <strong className="text-slate-200">Rast nájmu</strong> — očakávané zvyšovanie nájmu ročne.
                Závisí od lokality a inflácie.
              </p>
            </div>
          </div>
        </div>
      )}

      {activeTab === "projection" && (
        <div className="space-y-6">
          {/* 10 Year Chart */}
          <div className="bg-slate-800/30 rounded-xl p-6 border border-slate-700">
            <h4 className="font-semibold text-slate-100 mb-6">Vývoj investície za 10 rokov</h4>
            <div className="h-64 flex items-end gap-2">
              {results.yearlyProjection.map((year, idx) => {
                const maxValue = Math.max(...results.yearlyProjection.map(y => y.propertyValue));
                const height = (year.propertyValue / maxValue) * 100;
                const equityHeight = (year.equity / maxValue) * 100;
                
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full bg-slate-700 rounded-t relative" style={{ height: `${height}%` }}>
                      <div
                        className="absolute bottom-0 left-0 right-0 bg-emerald-500/50 rounded-t"
                        style={{ height: `${(equityHeight / height) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-slate-500">{year.year}</span>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-center gap-6 mt-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-slate-700" />
                <span className="text-slate-400">Hodnota nehnuteľnosti</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-emerald-500/50" />
                <span className="text-slate-400">Vaše equity</span>
              </div>
            </div>
          </div>

          {/* Projection Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">Rok</th>
                  <th className="text-right py-3 px-4 text-slate-400 font-medium">Hodnota</th>
                  <th className="text-right py-3 px-4 text-slate-400 font-medium">Equity</th>
                  <th className="text-right py-3 px-4 text-slate-400 font-medium">Ročný nájom</th>
                  <th className="text-right py-3 px-4 text-slate-400 font-medium">Čistý zisk</th>
                  <th className="text-right py-3 px-4 text-slate-400 font-medium">Kumulatívne</th>
                  <th className="text-right py-3 px-4 text-slate-400 font-medium">ROI</th>
                </tr>
              </thead>
              <tbody>
                {results.yearlyProjection.map((year) => (
                  <tr key={year.year} className="border-b border-slate-800 hover:bg-slate-800/30">
                    <td className="py-3 px-4 text-slate-100 font-medium">{year.year}</td>
                    <td className="py-3 px-4 text-right text-slate-100">€{year.propertyValue.toLocaleString()}</td>
                    <td className="py-3 px-4 text-right text-emerald-400">€{year.equity.toLocaleString()}</td>
                    <td className="py-3 px-4 text-right text-slate-100">€{year.annualRent.toLocaleString()}</td>
                    <td className={`py-3 px-4 text-right ${year.netIncome >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      €{year.netIncome.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right text-blue-400">€{year.cumulativeIncome.toLocaleString()}</td>
                    <td className="py-3 px-4 text-right text-yellow-400">{year.roi.toFixed(0)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 10 Year Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 rounded-xl p-5 border border-emerald-500/20">
              <div className="text-sm text-slate-400 mb-1">Hodnota po 10 rokoch</div>
              <div className="text-3xl font-bold text-emerald-400">
                €{results.yearlyProjection[9]?.propertyValue.toLocaleString() || 0}
              </div>
              <div className="text-sm text-slate-500 mt-1">
                +€{((results.yearlyProjection[9]?.propertyValue || 0) - inputs.propertyPrice).toLocaleString()}
              </div>
            </div>
            <div className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 rounded-xl p-5 border border-blue-500/20">
              <div className="text-sm text-slate-400 mb-1">Celkový príjem z nájmu</div>
              <div className="text-3xl font-bold text-blue-400">
                €{results.yearlyProjection[9]?.cumulativeIncome.toLocaleString() || 0}
              </div>
              <div className="text-sm text-slate-500 mt-1">za 10 rokov</div>
            </div>
            <div className="bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 rounded-xl p-5 border border-yellow-500/20">
              <div className="text-sm text-slate-400 mb-1">Celková návratnosť (ROI)</div>
              <div className="text-3xl font-bold text-yellow-400">
                {results.yearlyProjection[9]?.roi.toFixed(0) || 0}%
              </div>
              <div className="text-sm text-slate-500 mt-1">na investovaný kapitál</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Slider Input Component
function InputSlider({
  icon,
  label,
  value,
  min,
  max,
  step,
  unit,
  decimals = 0,
  info,
  onChange,
}: {
  icon?: React.ReactNode;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  decimals?: number;
  info?: string;
  onChange: (value: number) => void;
}) {
  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-slate-300">
          {icon && <span className="text-slate-400">{icon}</span>}
          <span className="font-medium">{label}</span>
        </div>
        <div className="text-right">
          <span className="text-lg font-bold text-slate-100">
            {decimals > 0 ? value.toFixed(decimals) : value.toLocaleString()}{unit}
          </span>
          {info && <span className="text-xs text-slate-500 ml-2">{info}</span>}
        </div>
      </div>
      <div className="relative">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, #10b981 0%, #10b981 ${percentage}%, #334155 ${percentage}%, #334155 100%)`,
          }}
        />
      </div>
      <div className="flex justify-between text-xs text-slate-500">
        <span>{min.toLocaleString()}{unit}</span>
        <span>{max.toLocaleString()}{unit}</span>
      </div>
    </div>
  );
}

// Flow Item Component
function FlowItem({
  label,
  value,
  positive,
  highlight,
}: {
  label: string;
  value: number;
  positive?: boolean;
  highlight?: boolean;
}) {
  const isPositive = value >= 0;
  
  return (
    <div className={`flex justify-between items-center ${highlight ? "font-semibold" : ""}`}>
      <span className={highlight ? "text-slate-100" : "text-slate-400"}>{label}</span>
      <span className={`font-medium ${
        highlight
          ? isPositive ? "text-emerald-400" : "text-red-400"
          : isPositive ? "text-emerald-400/70" : "text-red-400/70"
      }`}>
        {isPositive ? "+" : ""}€{Math.abs(value).toFixed(0)}
      </span>
    </div>
  );
}

// Metric Card Component
function MetricCard({
  label,
  value,
  info,
  good,
}: {
  label: string;
  value: string;
  info: string;
  good?: boolean;
}) {
  return (
    <div className={`bg-slate-800/50 rounded-xl p-4 border ${
      good === undefined ? "border-slate-700" : good ? "border-emerald-500/30" : "border-slate-700"
    }`}>
      <div className="text-xs text-slate-400 mb-1">{label}</div>
      <div className={`text-xl font-bold ${
        good === undefined ? "text-slate-100" : good ? "text-emerald-400" : "text-slate-100"
      }`}>
        {value}
      </div>
      <div className="text-xs text-slate-500 mt-1">{info}</div>
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
