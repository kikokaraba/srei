"use client";

import { useState, useMemo } from "react";
import { Calculator, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";

interface ScenarioInputs {
  propertyPrice: number;
  monthlyRent: number;
  interestRate: number; // Úroková sadzba v %
  downPayment: number; // Záloha v %
  loanTerm: number; // Doba splácania v rokoch
  vacancyRate: number; // % mesiacov v roku, keď je byt prázdny
  monthlyExpenses: number; // Mesačné náklady (správa, poistenie, atď.)
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
  breakEvenRent: number; // Minimálny nájom na pokrytie nákladov
  isPositive: boolean;
}

export function ScenarioSimulator() {
  const [inputs, setInputs] = useState<ScenarioInputs>({
    propertyPrice: 150000,
    monthlyRent: 600,
    interestRate: 4.5,
    downPayment: 20,
    loanTerm: 25,
    vacancyRate: 8.33, // ~1 mesiac v roku (8.33%)
    monthlyExpenses: 150,
  });

  const results = useMemo<ScenarioResults>(() => {
    return calculateScenario(inputs);
  }, [inputs]);

  const handleInputChange = (field: keyof ScenarioInputs, value: number) => {
    setInputs((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-blue-500/10 rounded-lg">
          <Calculator className="w-6 h-6 text-blue-400" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-slate-100">Simulátor scenárov</h3>
          <p className="text-sm text-slate-400">What-if analýza pre rôzne investičné scenáre</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input sekcia */}
        <div className="space-y-6">
          <h4 className="text-lg font-semibold text-slate-200 mb-4">Vstupné parametre</h4>

          {/* Cena nehnuteľnosti */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Cena nehnuteľnosti: {inputs.propertyPrice.toLocaleString("sk-SK")} €
            </label>
            <input
              type="range"
              min="50000"
              max="500000"
              step="5000"
              value={inputs.propertyPrice}
              onChange={(e) => handleInputChange("propertyPrice", Number(e.target.value))}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>50 000 €</span>
              <span>500 000 €</span>
            </div>
          </div>

          {/* Mesačný nájom */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Mesačný nájom: {inputs.monthlyRent.toLocaleString("sk-SK")} €
            </label>
            <input
              type="range"
              min="200"
              max="2000"
              step="50"
              value={inputs.monthlyRent}
              onChange={(e) => handleInputChange("monthlyRent", Number(e.target.value))}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>200 €</span>
              <span>2 000 €</span>
            </div>
          </div>

          {/* Úroková sadzba */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Úroková sadzba: {inputs.interestRate.toFixed(2)} %
            </label>
            <input
              type="range"
              min="2"
              max="8"
              step="0.1"
              value={inputs.interestRate}
              onChange={(e) => handleInputChange("interestRate", Number(e.target.value))}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>2 %</span>
              <span>8 %</span>
            </div>
          </div>

          {/* Záloha */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Záloha: {inputs.downPayment} %
            </label>
            <input
              type="range"
              min="10"
              max="50"
              step="5"
              value={inputs.downPayment}
              onChange={(e) => handleInputChange("downPayment", Number(e.target.value))}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>10 %</span>
              <span>50 %</span>
            </div>
          </div>

          {/* Doba splácania */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Doba splácania: {inputs.loanTerm} rokov
            </label>
            <input
              type="range"
              min="10"
              max="30"
              step="5"
              value={inputs.loanTerm}
              onChange={(e) => handleInputChange("loanTerm", Number(e.target.value))}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>10 rokov</span>
              <span>30 rokov</span>
            </div>
          </div>

          {/* Výpadok nájmu */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Výpadok nájmu: {inputs.vacancyRate.toFixed(1)} % ({((inputs.vacancyRate / 100) * 12).toFixed(1)} mesiacov/rok)
            </label>
            <input
              type="range"
              min="0"
              max="25"
              step="0.1"
              value={inputs.vacancyRate}
              onChange={(e) => handleInputChange("vacancyRate", Number(e.target.value))}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>0 %</span>
              <span>25 %</span>
            </div>
          </div>

          {/* Mesačné náklady */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Mesačné náklady: {inputs.monthlyExpenses.toLocaleString("sk-SK")} €
            </label>
            <input
              type="range"
              min="0"
              max="500"
              step="25"
              value={inputs.monthlyExpenses}
              onChange={(e) => handleInputChange("monthlyExpenses", Number(e.target.value))}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>0 €</span>
              <span>500 €</span>
            </div>
          </div>
        </div>

        {/* Výsledky */}
        <div className="space-y-4">
          <h4 className="text-lg font-semibold text-slate-200 mb-4">Výsledky analýzy</h4>

          {/* Mesačná splátka */}
          <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-400">Mesačná splátka hypotéky</span>
            </div>
            <p className="text-2xl font-bold text-slate-100">
              {results.monthlyPayment.toLocaleString("sk-SK", { maximumFractionDigits: 0 })} €
            </p>
          </div>

          {/* Cash-on-Cash Return */}
          <div className={`bg-slate-800/50 rounded-lg p-4 border ${
            results.cashOnCashReturn > 0 
              ? "border-emerald-500/50" 
              : "border-rose-500/50"
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-400">Cash-on-Cash Return</span>
              {results.cashOnCashReturn > 0 ? (
                <TrendingUp className="w-5 h-5 text-emerald-400" />
              ) : (
                <TrendingDown className="w-5 h-5 text-rose-400" />
              )}
            </div>
            <p className={`text-2xl font-bold ${
              results.cashOnCashReturn > 0 ? "text-emerald-400" : "text-rose-400"
            }`}>
              {results.cashOnCashReturn.toFixed(2)} %
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Ročný výnos na investovaný kapitál
            </p>
          </div>

          {/* Výnosy */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
              <span className="text-xs text-slate-400 block mb-1">Hrubý výnos</span>
              <p className="text-xl font-bold text-slate-100">
                {results.grossYield.toFixed(2)} %
              </p>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
              <span className="text-xs text-slate-400 block mb-1">Čistý výnos</span>
              <p className="text-xl font-bold text-slate-100">
                {results.netYield.toFixed(2)} %
              </p>
            </div>
          </div>

          {/* Ročný príjem */}
          <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Ročný nájom:</span>
                <span className="text-slate-300">{results.annualRent.toLocaleString("sk-SK")} €</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Po výpadku:</span>
                <span className="text-slate-300">
                  {results.annualRentAfterVacancy.toLocaleString("sk-SK")} €
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Ročné náklady:</span>
                <span className="text-rose-400">
                  -{results.annualExpenses.toLocaleString("sk-SK")} €
                </span>
              </div>
              <div className="border-t border-slate-700 pt-2 flex justify-between">
                <span className="text-slate-300 font-semibold">Čistý príjem:</span>
                <span className={`font-bold ${
                  results.netAnnualIncome > 0 ? "text-emerald-400" : "text-rose-400"
                }`}>
                  {results.netAnnualIncome.toLocaleString("sk-SK")} €
                </span>
              </div>
            </div>
          </div>

          {/* Break-even nájom */}
          <div className="bg-slate-800/50 rounded-lg p-4 border border-amber-500/50">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span className="text-sm text-slate-400">Minimálny nájom na pokrytie nákladov</span>
            </div>
            <p className="text-lg font-bold text-amber-400">
              {results.breakEvenRent.toLocaleString("sk-SK", { maximumFractionDigits: 0 })} €/mesiac
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {results.monthlyRent >= results.breakEvenRent ? (
                <span className="text-emerald-400">✓ Nájom pokrýva náklady</span>
              ) : (
                <span className="text-rose-400">
                  ⚠ Nájom je o{" "}
                  {(results.breakEvenRent - results.monthlyRent).toLocaleString("sk-SK", {
                    maximumFractionDigits: 0,
                  })}{" "}
                  € nižší ako potrebné
                </span>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function calculateScenario(inputs: ScenarioInputs): ScenarioResults {
  const loanAmount = inputs.propertyPrice * (1 - inputs.downPayment / 100);
  const monthlyInterestRate = inputs.interestRate / 100 / 12;
  const numberOfPayments = inputs.loanTerm * 12;

  // Výpočet mesačnej splátky (anuitná splátka)
  const monthlyPayment =
    loanAmount *
    (monthlyInterestRate * Math.pow(1 + monthlyInterestRate, numberOfPayments)) /
    (Math.pow(1 + monthlyInterestRate, numberOfPayments) - 1);

  // Ročné hodnoty
  const annualRent = inputs.monthlyRent * 12;
  const vacancyMonths = (inputs.vacancyRate / 100) * 12;
  const annualRentAfterVacancy = inputs.monthlyRent * (12 - vacancyMonths);
  const annualExpenses = inputs.monthlyExpenses * 12;
  const annualLoanPayments = monthlyPayment * 12;
  const netAnnualIncome = annualRentAfterVacancy - annualExpenses - annualLoanPayments;

  // Výnosy
  const grossYield = (annualRent / inputs.propertyPrice) * 100;
  const netYield = (netAnnualIncome / inputs.propertyPrice) * 100;

  // Cash-on-Cash Return
  const downPaymentAmount = inputs.propertyPrice * (inputs.downPayment / 100);
  const cashOnCashReturn = (netAnnualIncome / downPaymentAmount) * 100;

  // Break-even nájom (nájom, ktorý pokryje všetky náklady)
  const breakEvenRent = (annualLoanPayments + annualExpenses) / 12;

  return {
    monthlyPayment,
    annualRent,
    annualRentAfterVacancy,
    annualExpenses,
    netAnnualIncome,
    cashOnCashReturn,
    grossYield,
    netYield,
    breakEvenRent,
    isPositive: netAnnualIncome > 0,
  };
}
