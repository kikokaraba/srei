"use client";

import { useState, useCallback, useMemo } from "react";
import { Calculator, TrendingUp, DollarSign, Percent } from "lucide-react";

export function ROICalculator() {
  const [propertyPrice, setPropertyPrice] = useState(150000);
  const [monthlyRent, setMonthlyRent] = useState(800);
  const [downPayment, setDownPayment] = useState(20);
  const [interestRate, setInterestRate] = useState(4.5);
  const [loanTerm, setLoanTerm] = useState(25);

  const calculations = useMemo(() => {
    const downPaymentAmount = (propertyPrice * downPayment) / 100;
    const loanAmount = propertyPrice - downPaymentAmount;
    const monthlyRate = interestRate / 100 / 12;
    const numPayments = loanTerm * 12;

    // Monthly mortgage payment
    const monthlyPayment =
      loanAmount *
      (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
      (Math.pow(1 + monthlyRate, numPayments) - 1);

    // Annual cash flow
    const annualRent = monthlyRent * 12;
    const annualMortgage = monthlyPayment * 12;
    const annualCashFlow = annualRent - annualMortgage;

    // ROI calculations
    const cashOnCashReturn = (annualCashFlow / downPaymentAmount) * 100;
    const capRate = (annualRent / propertyPrice) * 100;
    const grossYield = (annualRent / propertyPrice) * 100;

    return {
      monthlyPayment: Math.round(monthlyPayment),
      annualCashFlow: Math.round(annualCashFlow),
      cashOnCashReturn: cashOnCashReturn.toFixed(2),
      capRate: capRate.toFixed(2),
      grossYield: grossYield.toFixed(2),
      downPaymentAmount: Math.round(downPaymentAmount),
    };
  }, [propertyPrice, monthlyRent, downPayment, interestRate, loanTerm]);

  return (
    <section className="py-24 bg-gradient-to-b from-slate-950 to-slate-900">
      <div className="container mx-auto px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium mb-6">
              <Calculator className="w-4 h-4" />
              <span>Interaktívny kalkulátor</span>
            </div>
            <h2 className="text-4xl lg:text-5xl font-bold text-slate-100 mb-4">
              Vypočítajte si{" "}
              <span className="text-emerald-400">svoj výnos</span>
            </h2>
            <p className="text-xl text-slate-400 max-w-2xl mx-auto">
              Zistite, aký výnos môžete očakávať z vašej investície do nehnuteľnosti
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Inputs */}
            <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-8">
              <h3 className="text-2xl font-bold text-slate-100 mb-6">
                Vstupné parametre
              </h3>

              <div className="space-y-6">
                <div>
                  <label className="block text-slate-300 mb-2 font-medium">
                    Cena nehnuteľnosti
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="number"
                      value={propertyPrice}
                      onChange={(e) => setPropertyPrice(Number(e.target.value))}
                      className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      min="0"
                      step="1000"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 mb-2 font-medium">
                    Mesačný nájom
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="number"
                      value={monthlyRent}
                      onChange={(e) => setMonthlyRent(Number(e.target.value))}
                      className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      min="0"
                      step="50"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 mb-2 font-medium">
                    Vlastné prostriedky: {downPayment}%
                  </label>
                  <input
                    type="range"
                    value={downPayment}
                    onChange={(e) => setDownPayment(Number(e.target.value))}
                    className="w-full accent-emerald-500"
                    min="0"
                    max="100"
                    step="5"
                  />
                  <div className="flex justify-between text-xs text-slate-500 mt-1">
                    <span>0%</span>
                    <span>50%</span>
                    <span>100%</span>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 mb-2 font-medium">
                    Úroková sadzba: {interestRate}%
                  </label>
                  <input
                    type="range"
                    value={interestRate}
                    onChange={(e) => setInterestRate(Number(e.target.value))}
                    className="w-full accent-emerald-500"
                    min="0"
                    max="10"
                    step="0.1"
                  />
                  <div className="flex justify-between text-xs text-slate-500 mt-1">
                    <span>0%</span>
                    <span>5%</span>
                    <span>10%</span>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 mb-2 font-medium">
                    Doba splácania: {loanTerm} rokov
                  </label>
                  <input
                    type="range"
                    value={loanTerm}
                    onChange={(e) => setLoanTerm(Number(e.target.value))}
                    className="w-full accent-emerald-500"
                    min="5"
                    max="30"
                    step="1"
                  />
                  <div className="flex justify-between text-xs text-slate-500 mt-1">
                    <span>5</span>
                    <span>15</span>
                    <span>30</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Results */}
            <div className="bg-gradient-to-br from-emerald-950/20 to-slate-900 rounded-2xl border border-emerald-500/20 p-8">
              <h3 className="text-2xl font-bold text-slate-100 mb-6">
                Výsledky
              </h3>

              <div className="space-y-6">
                <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                  <div className="flex items-center gap-3 mb-2">
                    <TrendingUp className="w-6 h-6 text-emerald-400" />
                    <span className="text-slate-400 text-sm">Cash-on-Cash Return</span>
                  </div>
                  <div className="text-4xl font-bold text-emerald-400">
                    {calculations.cashOnCashReturn}%
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    Ročný výnos z vlastných prostriedkov
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                    <div className="text-slate-400 text-xs mb-1">Mesačná splátka</div>
                    <div className="text-2xl font-bold text-slate-100">
                      €{calculations.monthlyPayment.toLocaleString("sk-SK")}
                    </div>
                  </div>
                  <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                    <div className="text-slate-400 text-xs mb-1">Ročný cash flow</div>
                    <div className={`text-2xl font-bold ${calculations.annualCashFlow >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                      €{calculations.annualCashFlow.toLocaleString("sk-SK")}
                    </div>
                  </div>
                  <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                    <div className="text-slate-400 text-xs mb-1">Cap Rate</div>
                    <div className="text-2xl font-bold text-gold-400">
                      {calculations.capRate}%
                    </div>
                  </div>
                  <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                    <div className="text-slate-400 text-xs mb-1">Gross Yield</div>
                    <div className="text-2xl font-bold text-gold-400">
                      {calculations.grossYield}%
                    </div>
                  </div>
                </div>

                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
                  <p className="text-sm text-slate-300">
                    <span className="font-semibold text-emerald-400">Tip:</span>{" "}
                    S Premium plánom získate prístup k pokročilejším kalkuláciám vrátane
                    daňových odpisov, scenárov a AI predikcií výnosov.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
