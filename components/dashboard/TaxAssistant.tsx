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
  HelpCircle,
  Scale,
} from "lucide-react";

interface TaxInputs {
  purchaseDate: string;
  purchasePrice: number;
  currentValue: number;
  saleDate: string;
  ownershipType: "individual" | "sro";
  investmentCosts: number;
  wasInBusinessAssets: boolean; // Bola nehnuteľnosť v obchodnom majetku?
  removedFromAssetsDate: string; // Kedy bola vyradená z obchodného majetku?
  acquiredByInheritance: boolean; // Nadobudnutá dedením?
  inheritanceDirectLine: boolean; // Dedenie v priamom rade?
  originalOwnerPurchaseDate: string; // Kedy ju nadobudol poručiteľ?
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
  exemptionReason: string;
  taxBreakdown: { label: string; amount: number; rate: number }[];
}

// Aktuálne sadzby podľa zákona o dani z príjmov 2026
// Zdroj: Zákon č. 595/2003 Z. z. o dani z príjmov
const TAX_THRESHOLDS_2026 = {
  // 176,8-násobok životného minima (284,13 € pre 2026)
  firstThreshold: 50234, // 19% do tejto hranice
  // Ďalšie pásma pre bežné príjmy (mzdy) - pre kapitálové príjmy platí 19%/25%
};

const TAX_RATE_INDIVIDUAL_LOW = 19; // 19% do hranice
const TAX_RATE_INDIVIDUAL_HIGH = 25; // 25% nad hranicu
const TAX_RATE_SRO = 21; // 21% daň z príjmu právnických osôb

// Zdravotné poistenie z kapitálových príjmov
// Zdroj: Zákon č. 580/2004 Z. z. o zdravotnom poistení
const HEALTH_INSURANCE_RATE = 15; // 15% (od 2026 pre SZČO 16%, ale pre § 8 príjmy ostáva 15%)
const HEALTH_INSURANCE_RATE_DISABLED = 7.5; // Pre osoby so ZŤP

// Minimálny vymeriavací základ pre zdravotné poistenie
const MIN_ASSESSMENT_BASE_2026 = 652.00; // mesačne

export function TaxAssistant() {
  const [inputs, setInputs] = useState<TaxInputs>({
    purchaseDate: new Date(Date.now() - 3 * 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    purchasePrice: 120000,
    currentValue: 155000,
    saleDate: new Date().toISOString().split("T")[0],
    ownershipType: "individual",
    investmentCosts: 8000,
    wasInBusinessAssets: false,
    removedFromAssetsDate: "",
    acquiredByInheritance: false,
    inheritanceDirectLine: true,
    originalOwnerPurchaseDate: "",
  });

  const [showAdvanced, setShowAdvanced] = useState(false);

  const results = useMemo<TaxResults>(() => calculateTax(inputs), [inputs]);

  const handleChange = (field: keyof TaxInputs, value: string | number | boolean) => {
    setInputs((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-6">
      {/* Legal Notice */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 flex items-start gap-3">
        <Scale className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="text-blue-300 font-medium">Právne informácie</p>
          <p className="text-slate-400 mt-1">
            Výpočet vychádza zo zákona č. 595/2003 Z. z. o dani z príjmov a zákona č. 580/2004 Z. z. 
            o zdravotnom poistení v znení platnom pre rok 2026. Pre presné posúdenie odporúčame 
            konzultáciu s daňovým poradcom.
          </p>
        </div>
      </div>

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
              <div>
                <p className="text-slate-300">
                  Predaj je <strong className="text-emerald-400">oslobodený od dane z príjmu</strong>.
                </p>
                <p className="text-sm text-slate-400 mt-1">
                  Dôvod: {results.exemptionReason}
                </p>
              </div>
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
            <div className="text-xs text-slate-400">Daň + odvody</div>
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
                  <div className="text-xs text-slate-400">19% / 25% daň + 15% ZP</div>
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
                  <div className="text-xs text-slate-400">21% daň z príjmu PO</div>
                </div>
              </button>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                <Calendar className="w-4 h-4 inline mr-2" />
                Dátum nadobudnutia
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
                Nadobúdacia cena
              </label>
              <input
                type="number"
                value={inputs.purchasePrice}
                onChange={(e) => handleChange("purchasePrice", Number(e.target.value))}
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-emerald-500"
              />
              <p className="text-xs text-slate-500 mt-1">
                Pri dedení: hodnota z dedičského konania
              </p>
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
              Preukázateľné výdavky (§ 8 ods. 5)
            </label>
            <input
              type="number"
              value={inputs.investmentCosts}
              onChange={(e) => handleChange("investmentCosts", Number(e.target.value))}
              placeholder="Rekonštrukcia, právnik, realitka..."
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-emerald-500"
            />
            <p className="text-xs text-slate-500 mt-1">
              Technické zhodnotenie, poplatky, služby súvisiace s predajom
            </p>
          </div>

          {/* Advanced Options */}
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-2 text-sm text-emerald-400 hover:text-emerald-300"
          >
            <HelpCircle className="w-4 h-4" />
            {showAdvanced ? "Skryť" : "Zobraziť"} rozšírené možnosti
          </button>

          {showAdvanced && (
            <div className="space-y-4 p-4 bg-slate-800/50 rounded-xl border border-slate-700">
              {/* Was in business assets */}
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={inputs.wasInBusinessAssets}
                  onChange={(e) => handleChange("wasInBusinessAssets", e.target.checked)}
                  className="mt-1 w-5 h-5 rounded border-slate-600 bg-slate-700 text-emerald-500 focus:ring-emerald-500"
                />
                <div>
                  <span className="font-medium text-slate-100">Bola v obchodnom majetku</span>
                  <p className="text-sm text-slate-400 mt-1">
                    Ak bola nehnuteľnosť zaradená v obchodnom majetku, oslobodenie nastáva až 5 rokov 
                    od jej vyradenia do osobného užívania.
                  </p>
                </div>
              </label>

              {inputs.wasInBusinessAssets && (
                <div className="ml-8">
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Dátum vyradenia z obchodného majetku
                  </label>
                  <input
                    type="date"
                    value={inputs.removedFromAssetsDate}
                    onChange={(e) => handleChange("removedFromAssetsDate", e.target.value)}
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              )}

              {/* Inheritance */}
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={inputs.acquiredByInheritance}
                  onChange={(e) => handleChange("acquiredByInheritance", e.target.checked)}
                  className="mt-1 w-5 h-5 rounded border-slate-600 bg-slate-700 text-emerald-500 focus:ring-emerald-500"
                />
                <div>
                  <span className="font-medium text-slate-100">Nadobudnutá dedením</span>
                  <p className="text-sm text-slate-400 mt-1">
                    Pri dedení v priamom rade sa do 5-ročnej lehoty započítava aj doba vlastníctva poručiteľa.
                  </p>
                </div>
              </label>

              {inputs.acquiredByInheritance && (
                <div className="ml-8 space-y-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={inputs.inheritanceDirectLine}
                      onChange={(e) => handleChange("inheritanceDirectLine", e.target.checked)}
                      className="w-5 h-5 rounded border-slate-600 bg-slate-700 text-emerald-500 focus:ring-emerald-500"
                    />
                    <div>
                      <span className="font-medium text-slate-100">Dedenie v priamom rade</span>
                      <p className="text-xs text-slate-400">
                        Rodičia, deti, starí rodičia, vnuci, manžel/manželka
                      </p>
                    </div>
                  </label>

                  {inputs.inheritanceDirectLine && (
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Kedy poručiteľ nadobudol nehnuteľnosť?
                      </label>
                      <input
                        type="date"
                        value={inputs.originalOwnerPurchaseDate}
                        onChange={(e) => handleChange("originalOwnerPurchaseDate", e.target.value)}
                        className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Results */}
        <div className="space-y-6">
          <h4 className="font-semibold text-slate-100 flex items-center gap-2">
            <Receipt className="w-5 h-5 text-emerald-400" />
            Výpočet dane (2026)
          </h4>

          {/* Tax Breakdown */}
          <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Predajná cena</span>
              <span className="font-medium text-slate-100">€{inputs.currentValue.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Nadobúdacia cena</span>
              <span className="font-medium text-red-400">-€{inputs.purchasePrice.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Preukázateľné výdavky</span>
              <span className="font-medium text-red-400">-€{inputs.investmentCosts.toLocaleString()}</span>
            </div>
            <div className="border-t border-slate-700 pt-4 flex justify-between items-center">
              <span className="text-slate-300 font-medium">Základ dane (§ 8)</span>
              <span className="font-bold text-slate-100">€{results.taxableGain.toLocaleString()}</span>
            </div>

            {!results.isExempt && results.taxableGain > 0 && (
              <>
                {results.taxBreakdown.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center">
                    <span className="text-slate-400">
                      {item.label} ({item.rate}%)
                    </span>
                    <span className="font-medium text-red-400">
                      -€{item.amount.toLocaleString()}
                    </span>
                  </div>
                ))}
              </>
            )}

            <div className="border-t border-slate-700 pt-4 flex justify-between items-center">
              <span className="text-slate-100 font-semibold">Čistý zisk z predaja</span>
              <span className="font-bold text-2xl text-emerald-400">
                €{results.netProfit.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Oslobodenie Info */}
          <div className="bg-slate-800/30 rounded-xl p-5 border border-slate-700">
            <h5 className="font-medium text-slate-100 mb-3 flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-400" />
              Podmienky oslobodenia (§ 9 ods. 1)
            </h5>
            <ul className="space-y-2 text-sm text-slate-400">
              <li className="flex items-start gap-2">
                <span className={results.yearsOwned >= 5 ? "text-emerald-400" : "text-slate-500"}>
                  {results.yearsOwned >= 5 ? "✓" : "○"}
                </span>
                <span>5 rokov od nadobudnutia (ak nie je v obchodnom majetku)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-slate-500">○</span>
                <span>Pri dedení v priamom rade sa započítava doba poručiteľa</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-slate-500">○</span>
                <span>Pri obchodnom majetku: 5 rokov od vyradenia</span>
              </li>
            </ul>
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
                    <strong className="text-emerald-400">€{results.totalDeductions.toLocaleString()}</strong> na daniach a odvodoch.
                  </span>
                </li>
              )}
              <li className="flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
                <span>
                  Všetky náklady na technické zhodnotenie a služby súvisiace s predajom 
                  si môžete odpočítať zo základu dane.
                </span>
              </li>
              {inputs.ownershipType === "individual" && (
                <li className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
                  <span>
                    Zaplatené zdravotné poistenie si môžete uplatniť ako výdavok v nasledujúcom roku.
                  </span>
                </li>
              )}
              {inputs.ownershipType === "individual" && results.taxableGain > 0 && !results.isExempt && (
                <li className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5 shrink-0" />
                  <span>
                    Daňové priznanie typu B podajte do <strong>31. marca</strong> nasledujúceho roka 
                    (v roku prijatia príjmu).
                  </span>
                </li>
              )}
              {inputs.ownershipType === "individual" && results.taxableGain > 0 && !results.isExempt && (
                <li className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5 shrink-0" />
                  <span>
                    Zdravotné poistenie vám vypočíta poisťovňa v ročnom zúčtovaní (do októbra).
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
              
              {/* Original Purchase (if inheritance) */}
              {inputs.acquiredByInheritance && inputs.inheritanceDirectLine && inputs.originalOwnerPurchaseDate && (
                <div className="relative flex items-center gap-4 pb-4">
                  <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center z-10">
                    <div className="w-3 h-3 rounded-full bg-purple-400" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-slate-100">Nadobudnutie poručiteľom</div>
                    <div className="text-xs text-slate-400">
                      {new Date(inputs.originalOwnerPurchaseDate).toLocaleDateString("sk-SK")}
                    </div>
                  </div>
                </div>
              )}

              {/* Purchase/Inheritance */}
              <div className="relative flex items-center gap-4 pb-4">
                <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center z-10">
                  <div className="w-3 h-3 rounded-full bg-blue-400" />
                </div>
                <div>
                  <div className="text-sm font-medium text-slate-100">
                    {inputs.acquiredByInheritance ? "Nadobudnutie dedením" : "Kúpa nehnuteľnosti"}
                  </div>
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
  
  // Determine effective purchase date for exemption calculation
  let effectivePurchaseDate = purchaseDate;
  let exemptionReason = "";
  
  // If inherited in direct line, use original owner's purchase date
  if (inputs.acquiredByInheritance && inputs.inheritanceDirectLine && inputs.originalOwnerPurchaseDate) {
    effectivePurchaseDate = new Date(inputs.originalOwnerPurchaseDate);
  }
  
  // If was in business assets, use removal date
  if (inputs.wasInBusinessAssets && inputs.removedFromAssetsDate) {
    effectivePurchaseDate = new Date(inputs.removedFromAssetsDate);
  }
  
  // Days owned (for display, use actual ownership)
  const daysOwned = Math.floor((saleDate.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24));
  const yearsOwned = daysOwned / 365;
  
  // Days for exemption calculation
  const daysForExemption = Math.floor((saleDate.getTime() - effectivePurchaseDate.getTime()) / (1000 * 60 * 60 * 24));

  // Exemption date (5 years from effective purchase)
  const exemptionDate = new Date(effectivePurchaseDate);
  exemptionDate.setFullYear(exemptionDate.getFullYear() + 5);

  // Is exempt? (5 years rule - § 9 ods. 1 písm. a)
  const isExempt = daysForExemption >= 5 * 365;
  
  if (isExempt) {
    if (inputs.wasInBusinessAssets) {
      exemptionReason = "Uplynulo 5 rokov od vyradenia z obchodného majetku";
    } else if (inputs.acquiredByInheritance && inputs.inheritanceDirectLine) {
      exemptionReason = "Uplynulo 5 rokov od nadobudnutia poručiteľom (dedenie v priamom rade)";
    } else {
      exemptionReason = "Uplynulo 5 rokov od nadobudnutia nehnuteľnosti";
    }
  }
  
  const daysUntilExemption = Math.max(0, Math.floor((exemptionDate.getTime() - saleDate.getTime()) / (1000 * 60 * 60 * 24)));

  // Capital gain
  const capitalGain = inputs.currentValue - inputs.purchasePrice;
  const taxableGain = Math.max(0, capitalGain - inputs.investmentCosts);

  // Tax calculation
  let taxAmount = 0;
  let healthInsurance = 0;
  const taxBreakdown: { label: string; amount: number; rate: number }[] = [];

  if (!isExempt && taxableGain > 0) {
    if (inputs.ownershipType === "sro") {
      // s.r.o. - flat 21% corporate tax
      taxAmount = Math.round(taxableGain * TAX_RATE_SRO / 100);
      taxBreakdown.push({
        label: "Daň z príjmu PO",
        amount: taxAmount,
        rate: TAX_RATE_SRO,
      });
    } else {
      // Individual - progressive tax + health insurance
      // For "other income" (§ 8), progressive rates apply
      if (taxableGain <= TAX_THRESHOLDS_2026.firstThreshold) {
        // All at 19%
        taxAmount = Math.round(taxableGain * TAX_RATE_INDIVIDUAL_LOW / 100);
        taxBreakdown.push({
          label: "Daň z príjmu (do €50 234)",
          amount: taxAmount,
          rate: TAX_RATE_INDIVIDUAL_LOW,
        });
      } else {
        // Split: 19% on first threshold, 25% on rest
        const taxLow = Math.round(TAX_THRESHOLDS_2026.firstThreshold * TAX_RATE_INDIVIDUAL_LOW / 100);
        const taxHigh = Math.round((taxableGain - TAX_THRESHOLDS_2026.firstThreshold) * TAX_RATE_INDIVIDUAL_HIGH / 100);
        taxAmount = taxLow + taxHigh;
        
        taxBreakdown.push({
          label: "Daň z príjmu 19% (do €50 234)",
          amount: taxLow,
          rate: TAX_RATE_INDIVIDUAL_LOW,
        });
        taxBreakdown.push({
          label: "Daň z príjmu 25% (nad €50 234)",
          amount: taxHigh,
          rate: TAX_RATE_INDIVIDUAL_HIGH,
        });
      }
      
      // Health insurance (15% for capital gains)
      // Only for individuals, calculated from taxable gain
      healthInsurance = Math.round(taxableGain * HEALTH_INSURANCE_RATE / 100);
      taxBreakdown.push({
        label: "Zdravotné poistenie",
        amount: healthInsurance,
        rate: HEALTH_INSURANCE_RATE,
      });
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
    taxRate: inputs.ownershipType === "sro" ? TAX_RATE_SRO : TAX_RATE_INDIVIDUAL_LOW,
    taxAmount: totalDeductions, // Include health insurance in total
    netProfit,
    healthInsurance,
    totalDeductions,
    effectiveTaxRate,
    exemptionReason,
    taxBreakdown,
  };
}
