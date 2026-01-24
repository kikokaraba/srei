"use client";

import { useState, useMemo } from "react";
import {
  Receipt,
  Calendar,
  Home,
  Building,
  User,
  CheckCircle,
  AlertTriangle,
  Clock,
  TrendingUp,
  Shield,
  Info,
  Euro,
  FileText,
  Sparkles,
} from "lucide-react";

interface TaxInputs {
  purchaseDate: string;
  purchasePrice: number;
  currentValue: number;
  saleDate: string;
  isPrimaryResidence: boolean;
  ownershipType: "individual" | "sro";
  investmentCosts: number; // Rekonštrukcia, právnik, atď.
}

interface TaxResults {
  daysOwned: number;
  yearsOwned: number;
  isExempt: boolean;
  exemptionDate: string;
  daysUntilExemption: number;
  capitalGain: number;
  taxableGain: number;
  taxRate: number;
  taxAmount: number;
  netProfit: number;
  healthInsurance: number;
  totalDeductions: number;
  effectiveTaxRate: number;
}

const TAX_RATE_INDIVIDUAL = 19; // 19% daň z príjmu
const TAX_RATE_SRO = 21; // 21% daň z príjmu právnických osôb
const HEALTH_INSURANCE_RATE = 14; // 14% zdravotné poistenie pre SZČO

export function TaxAssistant() {
  const [inputs, setInputs] = useState<TaxInputs>({
    purchaseDate: new Date(Date.now() - 3 * 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    purchasePrice: 120000,
    currentValue: 155000,
    saleDate: new Date().toISOString().split("T")[0],
    isPrimaryResidence: false,
    ownershipType: "individual",
    investmentCosts: 8000,
  });

  const results = useMemo<TaxResults>(() => calculateTax(inputs), [inputs]);

  const handleChange = (field: keyof TaxInputs, value: string | number | boolean) => {
    setInputs((prev) => ({ ...prev, [field]: value }));
  };

  // Score for tax efficiency
  const taxScore = useMemo(() => {
    if (results.isExempt) return 100;
    if (results.effectiveTaxRate < 5) return 85;
    if (results.effectiveTaxRate < 10) return 70;
    if (results.effectiveTaxRate < 15) return 50;
    return 30;
  }, [results]);

  return (
    <div className="space-y-6">
      {/* Tax Status Card */}
      <div className={`rounded-2xl p-6 border ${
        results.isExempt
          ? "bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/30"
          : results.daysUntilExemption < 365
            ? "bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 border-yellow-500/30"
            : "bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700"
      }`}>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              {results.isExempt ? (
                <>
                  <Shield className="w-6 h-6 text-emerald-400" />
                  <span className="text-lg font-semibold text-emerald-400">Oslobodené od dane</span>
                </>
              ) : results.daysUntilExemption < 365 ? (
                <>
                  <Clock className="w-6 h-6 text-yellow-400" />
                  <span className="text-lg font-semibold text-yellow-400">Blízko oslobodenia</span>
                </>
              ) : (
                <>
                  <Receipt className="w-6 h-6 text-slate-400" />
                  <span className="text-lg font-semibold text-slate-300">Podlieha zdaneniu</span>
                </>
              )}
            </div>

            {results.isExempt ? (
              <p className="text-slate-300">
                Nehnuteľnosť vlastníte viac ako 5 rokov. Predaj je{" "}
                <strong className="text-emerald-400">oslobodený od dane z príjmu</strong>.
              </p>
            ) : (
              <div>
                <p className="text-slate-300 mb-2">
                  Do oslobodenia zostáva{" "}
                  <strong className="text-yellow-400">
                    {Math.ceil(results.daysUntilExemption / 30)} mesiacov
                  </strong>
                </p>
                <p className="text-sm text-slate-400">
                  Dátum oslobodenia: {new Date(results.exemptionDate).toLocaleDateString("sk-SK")}
                </p>
              </div>
            )}
          </div>

          {/* Progress Ring */}
          <div className="relative w-24 h-24">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="48"
                cy="48"
                r="40"
                stroke="currentColor"
                strokeWidth="6"
                fill="none"
                className="text-slate-700"
              />
              <circle
                cx="48"
                cy="48"
                r="40"
                stroke="currentColor"
                strokeWidth="6"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={`${Math.min(100, (results.yearsOwned / 5) * 100) * 2.51} 251`}
                className={results.isExempt ? "text-emerald-400" : "text-yellow-400"}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-bold text-slate-100">
                {results.yearsOwned.toFixed(1)}
              </span>
              <span className="text-xs text-slate-400">z 5 rokov</span>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-700/50">
          <div className="text-center">
            <div className="text-2xl font-bold text-slate-100">
              €{results.capitalGain.toLocaleString()}
            </div>
            <div className="text-xs text-slate-400">Kapitálový zisk</div>
          </div>
          <div className="text-center">
            <div className={`text-2xl font-bold ${results.isExempt ? "text-emerald-400" : "text-red-400"}`}>
              €{results.taxAmount.toLocaleString()}
            </div>
            <div className="text-xs text-slate-400">Daň</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-emerald-400">
              €{results.netProfit.toLocaleString()}
            </div>
            <div className="text-xs text-slate-400">Čistý zisk</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-slate-100">
              {results.effectiveTaxRate.toFixed(1)}%
            </div>
            <div className="text-xs text-slate-400">Efektívna sadzba</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Inputs */}
        <div className="space-y-6">
          <h4 className="font-semibold text-slate-100 flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-400" />
            Údaje o nehnuteľnosti
          </h4>

          {/* Ownership Type */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-slate-300">
              Typ vlastníctva
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleChange("ownershipType", "individual")}
                className={`flex items-center gap-3 p-4 rounded-xl border transition-all ${
                  inputs.ownershipType === "individual"
                    ? "bg-emerald-500/10 border-emerald-500/50"
                    : "bg-slate-800 border-slate-700 hover:border-slate-600"
                }`}
              >
                <User className={`w-5 h-5 ${
                  inputs.ownershipType === "individual" ? "text-emerald-400" : "text-slate-400"
                }`} />
                <div className="text-left">
                  <div className={inputs.ownershipType === "individual" ? "text-emerald-400" : "text-slate-100"}>
                    Fyzická osoba
                  </div>
                  <div className="text-xs text-slate-400">19% daň</div>
                </div>
              </button>
              <button
                onClick={() => handleChange("ownershipType", "sro")}
                className={`flex items-center gap-3 p-4 rounded-xl border transition-all ${
                  inputs.ownershipType === "sro"
                    ? "bg-emerald-500/10 border-emerald-500/50"
                    : "bg-slate-800 border-slate-700 hover:border-slate-600"
                }`}
              >
                <Building className={`w-5 h-5 ${
                  inputs.ownershipType === "sro" ? "text-emerald-400" : "text-slate-400"
                }`} />
                <div className="text-left">
                  <div className={inputs.ownershipType === "sro" ? "text-emerald-400" : "text-slate-100"}>
                    s.r.o.
                  </div>
                  <div className="text-xs text-slate-400">21% daň</div>
                </div>
              </button>
            </div>
          </div>

          {/* Primary Residence */}
          {inputs.ownershipType === "individual" && (
            <label className="flex items-center gap-3 p-4 rounded-xl border border-slate-700 bg-slate-800 cursor-pointer hover:border-slate-600 transition-colors">
              <input
                type="checkbox"
                checked={inputs.isPrimaryResidence}
                onChange={(e) => handleChange("isPrimaryResidence", e.target.checked)}
                className="w-5 h-5 rounded border-slate-600 bg-slate-700 text-emerald-500 focus:ring-emerald-500"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Home className="w-4 h-4 text-slate-400" />
                  <span className="font-medium text-slate-100">Trvalý pobyt</span>
                </div>
                <p className="text-sm text-slate-400 mt-1">
                  Mali ste na tejto adrese trvalý pobyt min. 2 roky?
                </p>
              </div>
            </label>
          )}

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                <Calendar className="w-4 h-4 inline mr-2" />
                Dátum kúpy
              </label>
              <input
                type="date"
                value={inputs.purchaseDate}
                onChange={(e) => handleChange("purchaseDate", e.target.value)}
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                <Calendar className="w-4 h-4 inline mr-2" />
                Dátum predaja
              </label>
              <input
                type="date"
                value={inputs.saleDate}
                onChange={(e) => handleChange("saleDate", e.target.value)}
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Prices */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                <Euro className="w-4 h-4 inline mr-2" />
                Kúpna cena
              </label>
              <input
                type="number"
                value={inputs.purchasePrice}
                onChange={(e) => handleChange("purchasePrice", Number(e.target.value))}
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                <TrendingUp className="w-4 h-4 inline mr-2" />
                Predajná cena
              </label>
              <input
                type="number"
                value={inputs.currentValue}
                onChange={(e) => handleChange("currentValue", Number(e.target.value))}
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Investment Costs */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Investičné náklady (odpočítateľné)
            </label>
            <input
              type="number"
              value={inputs.investmentCosts}
              onChange={(e) => handleChange("investmentCosts", Number(e.target.value))}
              placeholder="Rekonštrukcia, právnik, realitka..."
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-emerald-500"
            />
            <p className="text-xs text-slate-500 mt-1">
              Rekonštrukcia, právne služby, realitná provízia...
            </p>
          </div>
        </div>

        {/* Results */}
        <div className="space-y-6">
          <h4 className="font-semibold text-slate-100 flex items-center gap-2">
            <Receipt className="w-5 h-5 text-emerald-400" />
            Výpočet dane
          </h4>

          {/* Tax Breakdown */}
          <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Predajná cena</span>
              <span className="font-medium text-slate-100">€{inputs.currentValue.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Kúpna cena</span>
              <span className="font-medium text-red-400">-€{inputs.purchasePrice.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Investičné náklady</span>
              <span className="font-medium text-red-400">-€{inputs.investmentCosts.toLocaleString()}</span>
            </div>
            <div className="border-t border-slate-700 pt-4 flex justify-between items-center">
              <span className="text-slate-300 font-medium">Zdaniteľný zisk</span>
              <span className="font-bold text-slate-100">€{results.taxableGain.toLocaleString()}</span>
            </div>

            {!results.isExempt && results.taxableGain > 0 && (
              <>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">
                    Daň z príjmu ({results.taxRate}%)
                  </span>
                  <span className="font-medium text-red-400">
                    -€{Math.round(results.taxableGain * results.taxRate / 100).toLocaleString()}
                  </span>
                </div>
                {inputs.ownershipType === "individual" && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Zdravotné poistenie ({HEALTH_INSURANCE_RATE}%)</span>
                    <span className="font-medium text-red-400">
                      -€{results.healthInsurance.toLocaleString()}
                    </span>
                  </div>
                )}
              </>
            )}

            <div className="border-t border-slate-700 pt-4 flex justify-between items-center">
              <span className="text-slate-100 font-semibold">Čistý zisk z predaja</span>
              <span className="font-bold text-2xl text-emerald-400">
                €{results.netProfit.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Tips */}
          <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl p-5 border border-blue-500/20">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-5 h-5 text-blue-400" />
              <span className="font-semibold text-slate-100">Tipy na optimalizáciu</span>
            </div>
            <ul className="space-y-2 text-sm text-slate-300">
              {!results.isExempt && results.daysUntilExemption < 365 && (
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                  <span>
                    Počkajte {Math.ceil(results.daysUntilExemption / 30)} mesiacov a ušetríte{" "}
                    <strong className="text-emerald-400">€{results.taxAmount.toLocaleString()}</strong> na daniach.
                  </span>
                </li>
              )}
              {inputs.ownershipType === "individual" && !inputs.isPrimaryResidence && (
                <li className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
                  <span>
                    Ak ste mali na adrese trvalý pobyt 2+ roky, môžete byť oslobodený od dane.
                  </span>
                </li>
              )}
              <li className="flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
                <span>
                  Všetky náklady na rekonštrukciu a právne služby si môžete odpočítať zo základu dane.
                </span>
              </li>
              {inputs.ownershipType === "individual" && results.taxableGain > 0 && (
                <li className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5 shrink-0" />
                  <span>
                    Nezabudnite podať daňové priznanie do 31. marca nasledujúceho roka.
                  </span>
                </li>
              )}
            </ul>
          </div>

          {/* Timeline */}
          <div className="bg-slate-800/30 rounded-xl p-5 border border-slate-700">
            <h5 className="font-medium text-slate-100 mb-4">Časová os vlastníctva</h5>
            <div className="relative">
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-700" />
              
              {/* Purchase */}
              <div className="relative flex items-center gap-4 pb-4">
                <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center z-10">
                  <div className="w-3 h-3 rounded-full bg-blue-400" />
                </div>
                <div>
                  <div className="text-sm font-medium text-slate-100">Kúpa nehnuteľnosti</div>
                  <div className="text-xs text-slate-400">
                    {new Date(inputs.purchaseDate).toLocaleDateString("sk-SK")}
                  </div>
                </div>
              </div>

              {/* Today */}
              <div className="relative flex items-center gap-4 pb-4">
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center z-10">
                  <div className="w-3 h-3 rounded-full bg-emerald-400" />
                </div>
                <div>
                  <div className="text-sm font-medium text-slate-100">
                    {results.isExempt ? "Predaj (oslobodený)" : "Plánovaný predaj"}
                  </div>
                  <div className="text-xs text-slate-400">
                    {new Date(inputs.saleDate).toLocaleDateString("sk-SK")}
                  </div>
                </div>
              </div>

              {/* Exemption Date */}
              {!results.isExempt && (
                <div className="relative flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center z-10">
                    <Shield className="w-4 h-4 text-yellow-400" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-yellow-400">Oslobodenie od dane</div>
                    <div className="text-xs text-slate-400">
                      {new Date(results.exemptionDate).toLocaleDateString("sk-SK")}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function calculateTax(inputs: TaxInputs): TaxResults {
  const purchaseDate = new Date(inputs.purchaseDate);
  const saleDate = new Date(inputs.saleDate);
  
  // Days owned
  const daysOwned = Math.floor((saleDate.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24));
  const yearsOwned = daysOwned / 365;

  // Exemption date (5 years from purchase)
  const exemptionDate = new Date(purchaseDate);
  exemptionDate.setFullYear(exemptionDate.getFullYear() + 5);

  // Is exempt?
  const isExempt = daysOwned >= 5 * 365 || (inputs.ownershipType === "individual" && inputs.isPrimaryResidence && yearsOwned >= 2);
  const daysUntilExemption = Math.max(0, Math.floor((exemptionDate.getTime() - saleDate.getTime()) / (1000 * 60 * 60 * 24)));

  // Capital gain
  const capitalGain = inputs.currentValue - inputs.purchasePrice;
  const taxableGain = Math.max(0, capitalGain - inputs.investmentCosts);

  // Tax calculation
  const taxRate = inputs.ownershipType === "sro" ? TAX_RATE_SRO : TAX_RATE_INDIVIDUAL;
  
  let taxAmount = 0;
  let healthInsurance = 0;

  if (!isExempt && taxableGain > 0) {
    taxAmount = Math.round(taxableGain * taxRate / 100);
    
    // Health insurance only for individuals
    if (inputs.ownershipType === "individual") {
      healthInsurance = Math.round(taxableGain * HEALTH_INSURANCE_RATE / 100);
    }
  }

  const totalDeductions = taxAmount + healthInsurance;
  const netProfit = capitalGain - totalDeductions;
  const effectiveTaxRate = capitalGain > 0 ? (totalDeductions / capitalGain) * 100 : 0;

  return {
    daysOwned,
    yearsOwned,
    isExempt,
    exemptionDate: exemptionDate.toISOString(),
    daysUntilExemption,
    capitalGain,
    taxableGain,
    taxRate,
    taxAmount,
    netProfit,
    healthInsurance,
    totalDeductions,
    effectiveTaxRate,
  };
}
