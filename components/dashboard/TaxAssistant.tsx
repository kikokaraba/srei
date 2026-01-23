"use client";

import { useState, useMemo } from "react";
import { Calculator, FileText, Calendar, AlertCircle, CheckCircle } from "lucide-react";

interface TaxCalculation {
  purchaseDate: Date;
  purchasePrice: number;
  salePrice: number;
  saleDate: Date;
  isPrimaryResidence: boolean;
  ownershipType: "individual" | "sro";
  depreciationGroup?: number;
}

interface TaxResult {
  daysOwned: number;
  yearsOwned: number;
  isExempt: boolean;
  exemptionDate: Date | null;
  daysUntilExemption: number | null;
  capitalGain: number;
  taxAmount: number;
  netProfit: number;
  depreciationInfo: {
    annualDepreciation: number;
    totalDepreciation: number;
    taxableGain: number;
  } | null;
}

const DEPRECIATION_RATES: Record<number, number> = {
  1: 3.0, // 33.3 rokov
  2: 5.0, // 20 rokov
  3: 10.0, // 10 rokov
  4: 20.0, // 5 rokov
  5: 33.3, // 3 roky
  6: 50.0, // 2 roky
};

export function TaxAssistant() {
  const [inputs, setInputs] = useState<TaxCalculation>({
    purchaseDate: new Date(new Date().setFullYear(new Date().getFullYear() - 3)),
    purchasePrice: 150000,
    salePrice: 180000,
    saleDate: new Date(),
    isPrimaryResidence: false,
    ownershipType: "individual",
    depreciationGroup: undefined,
  });

  const results = useMemo<TaxResult>(() => {
    return calculateTax(inputs);
  }, [inputs]);

  const handleInputChange = (field: keyof TaxCalculation, value: string | number | boolean | Date) => {
    setInputs((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-amber-500/10 rounded-lg">
          <FileText className="w-6 h-6 text-amber-400" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-slate-100">Daňový a právny asistent</h3>
          <p className="text-sm text-slate-400">Výpočet daní a odpisov pre slovenský trh</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input sekcia */}
        <div className="space-y-6">
          <h4 className="text-lg font-semibold text-slate-200 mb-4">Vstupné parametre</h4>

          {/* Dátum kúpy */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Dátum kúpy
            </label>
            <input
              type="date"
              value={inputs.purchaseDate.toISOString().split("T")[0]}
              onChange={(e) => handleInputChange("purchaseDate", new Date(e.target.value))}
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Kúpna cena */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Kúpna cena: {inputs.purchasePrice.toLocaleString("sk-SK")} €
            </label>
            <input
              type="range"
              min="50000"
              max="500000"
              step="5000"
              value={inputs.purchasePrice}
              onChange={(e) => handleInputChange("purchasePrice", Number(e.target.value))}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
          </div>

          {/* Predajná cena */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Predajná cena: {inputs.salePrice.toLocaleString("sk-SK")} €
            </label>
            <input
              type="range"
              min="50000"
              max="500000"
              step="5000"
              value={inputs.salePrice}
              onChange={(e) => handleInputChange("salePrice", Number(e.target.value))}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
          </div>

          {/* Dátum predaja */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Dátum predaja
            </label>
            <input
              type="date"
              value={inputs.saleDate.toISOString().split("T")[0]}
              onChange={(e) => handleInputChange("saleDate", new Date(e.target.value))}
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Hlavné bydlisko */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="primaryResidence"
              checked={inputs.isPrimaryResidence}
              onChange={(e) => handleInputChange("isPrimaryResidence", e.target.checked)}
              className="w-5 h-5 rounded border-slate-700 bg-slate-800 text-amber-500 focus:ring-2 focus:ring-amber-500"
            />
            <label htmlFor="primaryResidence" className="text-sm text-slate-300">
              Hlavné bydlisko (oslobodenie od dane)
            </label>
          </div>

          {/* Typ vlastníctva */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Typ vlastníctva
            </label>
            <select
              value={inputs.ownershipType}
              onChange={(e) => handleInputChange("ownershipType", e.target.value as "individual" | "sro")}
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="individual">Fyzická osoba</option>
              <option value="sro">S.r.o.</option>
            </select>
          </div>

          {/* Odpisová skupina (len pre s.r.o.) */}
          {inputs.ownershipType === "sro" && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Odpisová skupina
              </label>
              <select
                value={inputs.depreciationGroup || ""}
                onChange={(e) => handleInputChange("depreciationGroup", e.target.value ? Number(e.target.value) : undefined)}
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="">Vyberte skupinu</option>
                <option value="1">Skupina 1 (3% ročne, 33.3 rokov)</option>
                <option value="2">Skupina 2 (5% ročne, 20 rokov)</option>
                <option value="3">Skupina 3 (10% ročne, 10 rokov)</option>
                <option value="4">Skupina 4 (20% ročne, 5 rokov)</option>
                <option value="5">Skupina 5 (33.3% ročne, 3 roky)</option>
                <option value="6">Skupina 6 (50% ročne, 2 roky)</option>
              </select>
            </div>
          )}
        </div>

        {/* Výsledky */}
        <div className="space-y-4">
          <h4 className="text-lg font-semibold text-slate-200 mb-4">Daňové výsledky</h4>

          {/* 5-ročný test */}
          <div className={`bg-slate-800/50 rounded-lg p-4 border ${
            results.isExempt 
              ? "border-emerald-500/50" 
              : "border-amber-500/50"
          }`}>
            <div className="flex items-center gap-2 mb-2">
              {results.isExempt ? (
                <CheckCircle className="w-5 h-5 text-emerald-400" />
              ) : (
                <AlertCircle className="w-5 h-5 text-amber-400" />
              )}
              <span className="text-sm font-medium text-slate-300">
                {results.isExempt ? "Oslobodenie od dane" : "5-ročný test"}
              </span>
            </div>
            {results.isExempt ? (
              <p className="text-emerald-400 font-semibold">
                Nehnuteľnosť je vo vlastníctve viac ako 5 rokov - oslobodenie od dane z predaja
              </p>
            ) : (
              <div>
                <p className="text-amber-400 font-semibold mb-1">
                  Vlastníctvo: {results.yearsOwned} {results.yearsOwned === 1 ? "rok" : "rokov"}
                </p>
                <p className="text-sm text-slate-400">
                  Oslobodenie od dane: {results.exemptionDate?.toLocaleDateString("sk-SK") || "Neuvedené"}
                </p>
                {results.daysUntilExemption !== null && (
                  <p className="text-xs text-slate-500 mt-1">
                    Zostáva: {results.daysUntilExemption} {results.daysUntilExemption === 1 ? "deň" : "dní"}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Kapitálový zisk */}
          <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Kapitálový zisk:</span>
                <span className="text-slate-300 font-semibold">
                  {results.capitalGain.toLocaleString("sk-SK")} €
                </span>
              </div>
              {results.depreciationInfo && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Odpisy:</span>
                  <span className="text-slate-300">
                    -{results.depreciationInfo.totalDepreciation.toLocaleString("sk-SK")} €
                  </span>
                </div>
              )}
              <div className="border-t border-slate-700 pt-2 flex justify-between">
                <span className="text-slate-300 font-semibold">Zdaniteľný zisk:</span>
                <span className="text-slate-100 font-bold">
                  {(results.depreciationInfo?.taxableGain || results.capitalGain).toLocaleString("sk-SK")} €
                </span>
              </div>
            </div>
          </div>

          {/* Daň */}
          {!results.isExempt && (
            <div className="bg-slate-800/50 rounded-lg p-4 border border-rose-500/50">
              <div className="flex items-center gap-2 mb-2">
                <Calculator className="w-5 h-5 text-rose-400" />
                <span className="text-sm font-medium text-slate-300">Daň z predaja</span>
              </div>
              <p className="text-2xl font-bold text-rose-400">
                {results.taxAmount.toLocaleString("sk-SK")} €
              </p>
              <p className="text-xs text-slate-500 mt-1">
                19% z zdaniteľného zisku
              </p>
            </div>
          )}

          {/* Čistý zisk */}
          <div className={`bg-slate-800/50 rounded-lg p-4 border ${
            results.netProfit > 0 
              ? "border-emerald-500/50" 
              : "border-slate-700"
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-300">Čistý zisk po dani</span>
            </div>
            <p className={`text-2xl font-bold ${
              results.netProfit > 0 ? "text-emerald-400" : "text-slate-300"
            }`}>
              {results.netProfit.toLocaleString("sk-SK")} €
            </p>
          </div>

          {/* Odpisy info (len pre s.r.o.) */}
          {inputs.ownershipType === "sro" && inputs.depreciationGroup && results.depreciationInfo && (
            <div className="bg-slate-800/50 rounded-lg p-4 border border-blue-500/50">
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="w-5 h-5 text-blue-400" />
                <span className="text-sm font-medium text-slate-300">Odpisy (S.r.o.)</span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Ročný odpis:</span>
                  <span className="text-slate-300">
                    {results.depreciationInfo.annualDepreciation.toLocaleString("sk-SK")} €
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Celkové odpisy:</span>
                  <span className="text-slate-300 font-semibold">
                    {results.depreciationInfo.totalDepreciation.toLocaleString("sk-SK")} €
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Odpisová skupina {inputs.depreciationGroup}: {DEPRECIATION_RATES[inputs.depreciationGroup]}% ročne
                </p>
              </div>
            </div>
          )}

          {/* Právne poznámky */}
          <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
            <p className="text-xs text-slate-400 leading-relaxed">
              <strong className="text-slate-300">Poznámka:</strong> Tento výpočet je orientačný. 
              Pre presný daňový výpočet sa poraďte s daňovým poradcom. 
              Pravidlá sa môžu meniť podľa aktuálnej legislatívy.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function calculateTax(inputs: TaxCalculation): TaxResult {
  const daysOwned = Math.floor(
    (inputs.saleDate.getTime() - inputs.purchaseDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  const yearsOwned = daysOwned / 365.25;

  // 5-ročný test
  const FIVE_YEARS_DAYS = 5 * 365.25;
  const isExempt = daysOwned >= FIVE_YEARS_DAYS || inputs.isPrimaryResidence;
  
  const exemptionDate = new Date(inputs.purchaseDate);
  exemptionDate.setFullYear(exemptionDate.getFullYear() + 5);
  const daysUntilExemption = isExempt 
    ? null 
    : Math.max(0, Math.ceil((exemptionDate.getTime() - inputs.saleDate.getTime()) / (1000 * 60 * 60 * 24)));

  // Kapitálový zisk
  const capitalGain = inputs.salePrice - inputs.purchasePrice;

  // Odpisy (len pre s.r.o.)
  let depreciationInfo = null;
  if (inputs.ownershipType === "sro" && inputs.depreciationGroup) {
    const rate = DEPRECIATION_RATES[inputs.depreciationGroup] / 100;
    const annualDepreciation = inputs.purchasePrice * rate;
    const totalDepreciation = annualDepreciation * yearsOwned;
    const taxableGain = Math.max(0, capitalGain - totalDepreciation);
    
    depreciationInfo = {
      annualDepreciation,
      totalDepreciation: Math.min(totalDepreciation, inputs.purchasePrice), // Odpisy nemôžu presiahnuť kúpnu cenu
      taxableGain,
    };
  }

  // Daň (19% z zdaniteľného zisku)
  const taxableGain = depreciationInfo?.taxableGain || capitalGain;
  const taxAmount = isExempt ? 0 : Math.max(0, taxableGain * 0.19);
  const netProfit = capitalGain - taxAmount;

  return {
    daysOwned,
    yearsOwned,
    isExempt,
    exemptionDate: isExempt ? null : exemptionDate,
    daysUntilExemption,
    capitalGain,
    taxAmount,
    netProfit,
    depreciationInfo,
  };
}
