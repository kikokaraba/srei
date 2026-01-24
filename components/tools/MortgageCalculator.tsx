"use client";

import { useState, useMemo } from "react";
import {
  Calculator,
  Euro,
  Percent,
  Calendar,
  TrendingDown,
  Building2,
  PiggyBank,
  Info,
  ChevronDown,
  ChevronUp,
  Banknote,
  ArrowRight,
} from "lucide-react";

// Aktuálne úrokové sadzby slovenských bánk (január 2026)
const BANK_RATES = [
  { name: "Slovenská sporiteľňa", rate: 4.19, fixation: [1, 3, 5, 10], logo: "SLSP" },
  { name: "VÚB banka", rate: 4.09, fixation: [1, 3, 5, 10], logo: "VUB" },
  { name: "Tatra banka", rate: 4.29, fixation: [1, 3, 5, 10], logo: "TATRA" },
  { name: "ČSOB", rate: 4.15, fixation: [1, 3, 5, 10], logo: "CSOB" },
  { name: "Prima banka", rate: 3.99, fixation: [1, 3, 5], logo: "PRIMA" },
  { name: "UniCredit Bank", rate: 4.25, fixation: [1, 3, 5, 10], logo: "UCB" },
  { name: "mBank", rate: 4.09, fixation: [1, 3, 5], logo: "MBANK" },
  { name: "365.bank", rate: 4.19, fixation: [1, 3, 5], logo: "365" },
];

interface AmortizationRow {
  month: number;
  payment: number;
  principal: number;
  interest: number;
  balance: number;
}

export default function MortgageCalculator() {
  // Inputs
  const [propertyPrice, setPropertyPrice] = useState(150000);
  const [downPayment, setDownPayment] = useState(30000);
  const [interestRate, setInterestRate] = useState(4.19);
  const [loanTermYears, setLoanTermYears] = useState(30);
  const [showAmortization, setShowAmortization] = useState(false);
  const [showBankComparison, setShowBankComparison] = useState(false);
  
  // Calculated values
  const calculations = useMemo(() => {
    const loanAmount = propertyPrice - downPayment;
    const monthlyRate = interestRate / 100 / 12;
    const totalPayments = loanTermYears * 12;
    
    // Monthly payment formula: M = P * [r(1+r)^n] / [(1+r)^n - 1]
    const monthlyPayment = loanAmount * 
      (monthlyRate * Math.pow(1 + monthlyRate, totalPayments)) / 
      (Math.pow(1 + monthlyRate, totalPayments) - 1);
    
    const totalPaid = monthlyPayment * totalPayments;
    const totalInterest = totalPaid - loanAmount;
    
    // LTV ratio
    const ltv = (loanAmount / propertyPrice) * 100;
    
    // Required income (rough estimate - 40% of income for mortgage)
    const requiredIncome = (monthlyPayment / 0.4);
    
    // Amortization schedule (first 12 months)
    const amortization: AmortizationRow[] = [];
    let balance = loanAmount;
    
    for (let month = 1; month <= Math.min(totalPayments, 360); month++) {
      const interestPayment = balance * monthlyRate;
      const principalPayment = monthlyPayment - interestPayment;
      balance -= principalPayment;
      
      if (month <= 12 || month % 12 === 0) {
        amortization.push({
          month,
          payment: monthlyPayment,
          principal: principalPayment,
          interest: interestPayment,
          balance: Math.max(0, balance),
        });
      }
    }
    
    return {
      loanAmount,
      monthlyPayment,
      totalPaid,
      totalInterest,
      ltv,
      requiredIncome,
      amortization,
      downPaymentPercent: (downPayment / propertyPrice) * 100,
    };
  }, [propertyPrice, downPayment, interestRate, loanTermYears]);
  
  // Bank comparison
  const bankComparison = useMemo(() => {
    return BANK_RATES.map(bank => {
      const loanAmount = propertyPrice - downPayment;
      const monthlyRate = bank.rate / 100 / 12;
      const totalPayments = loanTermYears * 12;
      
      const monthlyPayment = loanAmount * 
        (monthlyRate * Math.pow(1 + monthlyRate, totalPayments)) / 
        (Math.pow(1 + monthlyRate, totalPayments) - 1);
      
      const totalPaid = monthlyPayment * totalPayments;
      
      return {
        ...bank,
        monthlyPayment,
        totalPaid,
        difference: monthlyPayment - calculations.monthlyPayment,
      };
    }).sort((a, b) => a.monthlyPayment - b.monthlyPayment);
  }, [propertyPrice, downPayment, loanTermYears, calculations.monthlyPayment]);
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("sk-SK", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };
  
  return (
    <div className="space-y-6">
      {/* Main Calculator */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Inputs */}
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6">
          <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
            <Calculator className="w-5 h-5 text-blue-400" />
            Parametre hypotéky
          </h3>
          
          <div className="space-y-6">
            {/* Property Price */}
            <div>
              <label className="flex items-center justify-between text-sm text-slate-400 mb-2">
                <span className="flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  Cena nehnuteľnosti
                </span>
                <span className="text-white font-medium">{formatCurrency(propertyPrice)}</span>
              </label>
              <input
                type="range"
                min={50000}
                max={500000}
                step={5000}
                value={propertyPrice}
                onChange={(e) => setPropertyPrice(Number(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
              <div className="flex justify-between text-xs text-slate-500 mt-1">
                <span>50 000 €</span>
                <span>500 000 €</span>
              </div>
            </div>
            
            {/* Down Payment */}
            <div>
              <label className="flex items-center justify-between text-sm text-slate-400 mb-2">
                <span className="flex items-center gap-2">
                  <PiggyBank className="w-4 h-4" />
                  Vlastné zdroje
                </span>
                <span className="text-white font-medium">
                  {formatCurrency(downPayment)} ({calculations.downPaymentPercent.toFixed(0)}%)
                </span>
              </label>
              <input
                type="range"
                min={propertyPrice * 0.1}
                max={propertyPrice * 0.5}
                step={1000}
                value={downPayment}
                onChange={(e) => setDownPayment(Number(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
              <div className="flex justify-between text-xs text-slate-500 mt-1">
                <span>10%</span>
                <span>50%</span>
              </div>
            </div>
            
            {/* Interest Rate */}
            <div>
              <label className="flex items-center justify-between text-sm text-slate-400 mb-2">
                <span className="flex items-center gap-2">
                  <Percent className="w-4 h-4" />
                  Úroková sadzba
                </span>
                <span className="text-white font-medium">{interestRate.toFixed(2)}% p.a.</span>
              </label>
              <input
                type="range"
                min={2.5}
                max={7}
                step={0.01}
                value={interestRate}
                onChange={(e) => setInterestRate(Number(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
              />
              <div className="flex justify-between text-xs text-slate-500 mt-1">
                <span>2.5%</span>
                <span>7%</span>
              </div>
            </div>
            
            {/* Loan Term */}
            <div>
              <label className="flex items-center justify-between text-sm text-slate-400 mb-2">
                <span className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Doba splácania
                </span>
                <span className="text-white font-medium">{loanTermYears} rokov</span>
              </label>
              <input
                type="range"
                min={5}
                max={30}
                step={1}
                value={loanTermYears}
                onChange={(e) => setLoanTermYears(Number(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
              />
              <div className="flex justify-between text-xs text-slate-500 mt-1">
                <span>5 rokov</span>
                <span>30 rokov</span>
              </div>
            </div>
          </div>
          
          {/* LTV Warning */}
          {calculations.ltv > 80 && (
            <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <div className="flex items-start gap-2 text-yellow-400 text-sm">
                <Info className="w-4 h-4 mt-0.5 shrink-0" />
                <span>
                  LTV {calculations.ltv.toFixed(0)}% je nad 80%. Banky môžu požadovať vyššiu úrokovú sadzbu.
                </span>
              </div>
            </div>
          )}
        </div>
        
        {/* Results */}
        <div className="space-y-4">
          {/* Monthly Payment - Hero */}
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-6 text-white">
            <div className="text-sm opacity-80 mb-1">Mesačná splátka</div>
            <div className="text-4xl font-bold">
              {formatCurrency(calculations.monthlyPayment)}
            </div>
            <div className="text-sm opacity-80 mt-2">
              pri úrokovej sadzbe {interestRate.toFixed(2)}% p.a.
            </div>
          </div>
          
          {/* Key Metrics */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-900 rounded-xl border border-slate-800 p-4">
              <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
                <Banknote className="w-4 h-4" />
                Výška úveru
              </div>
              <div className="text-xl font-bold text-white">
                {formatCurrency(calculations.loanAmount)}
              </div>
            </div>
            
            <div className="bg-slate-900 rounded-xl border border-slate-800 p-4">
              <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
                <TrendingDown className="w-4 h-4" />
                LTV
              </div>
              <div className={`text-xl font-bold ${calculations.ltv > 80 ? "text-yellow-400" : "text-emerald-400"}`}>
                {calculations.ltv.toFixed(0)}%
              </div>
            </div>
            
            <div className="bg-slate-900 rounded-xl border border-slate-800 p-4">
              <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
                <Euro className="w-4 h-4" />
                Celkovo zaplatíte
              </div>
              <div className="text-xl font-bold text-white">
                {formatCurrency(calculations.totalPaid)}
              </div>
              <div className="text-xs text-slate-500">
                z toho úroky: {formatCurrency(calculations.totalInterest)}
              </div>
            </div>
            
            <div className="bg-slate-900 rounded-xl border border-slate-800 p-4">
              <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
                <Info className="w-4 h-4" />
                Odporúčaný príjem
              </div>
              <div className="text-xl font-bold text-white">
                {formatCurrency(calculations.requiredIncome)}
              </div>
              <div className="text-xs text-slate-500">
                min. mesačný hrubý príjem
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Bank Comparison */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
        <button
          onClick={() => setShowBankComparison(!showBankComparison)}
          className="w-full px-6 py-4 flex items-center justify-between text-white hover:bg-slate-800/50 transition-colors"
        >
          <span className="font-semibold flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-400" />
            Porovnanie bánk
          </span>
          {showBankComparison ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>
        
        {showBankComparison && (
          <div className="px-6 pb-6">
            <div className="text-sm text-slate-400 mb-4">
              Aktuálne úrokové sadzby pre fixáciu 5 rokov (január 2026)
            </div>
            
            <div className="space-y-2">
              {bankComparison.map((bank, idx) => (
                <div
                  key={bank.name}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    idx === 0 ? "bg-emerald-500/10 border border-emerald-500/30" : "bg-slate-800/50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                      idx === 0 ? "bg-emerald-500 text-white" : "bg-slate-700 text-slate-300"
                    }`}>
                      {idx + 1}
                    </div>
                    <div>
                      <div className="font-medium text-white">{bank.name}</div>
                      <div className="text-sm text-slate-400">{bank.rate.toFixed(2)}% p.a.</div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="font-bold text-white">{formatCurrency(bank.monthlyPayment)}/mes</div>
                    {idx !== 0 && (
                      <div className="text-sm text-red-400">
                        +{formatCurrency(bank.difference)}/mes
                      </div>
                    )}
                    {idx === 0 && (
                      <div className="text-sm text-emerald-400">Najvýhodnejšia</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <div className="flex items-start gap-2 text-blue-400 text-sm">
                <Info className="w-4 h-4 mt-0.5 shrink-0" />
                <span>
                  Úrokové sadzby sú orientačné. Skutočná sadzba závisí od bonity klienta, fixácie a ďalších podmienok.
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Amortization Schedule */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
        <button
          onClick={() => setShowAmortization(!showAmortization)}
          className="w-full px-6 py-4 flex items-center justify-between text-white hover:bg-slate-800/50 transition-colors"
        >
          <span className="font-semibold flex items-center gap-2">
            <Calendar className="w-5 h-5 text-purple-400" />
            Splátkový kalendár
          </span>
          {showAmortization ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>
        
        {showAmortization && (
          <div className="px-6 pb-6">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800">
                    <th className="text-left py-3 text-slate-400 font-medium">Mesiac</th>
                    <th className="text-right py-3 text-slate-400 font-medium">Splátka</th>
                    <th className="text-right py-3 text-slate-400 font-medium">Istina</th>
                    <th className="text-right py-3 text-slate-400 font-medium">Úrok</th>
                    <th className="text-right py-3 text-slate-400 font-medium">Zostatok</th>
                  </tr>
                </thead>
                <tbody>
                  {calculations.amortization.slice(0, 24).map((row) => (
                    <tr key={row.month} className="border-b border-slate-800/50">
                      <td className="py-2 text-white">
                        {row.month <= 12 ? `${row.month}. mesiac` : `${Math.floor(row.month / 12)}. rok`}
                      </td>
                      <td className="py-2 text-right text-white">{formatCurrency(row.payment)}</td>
                      <td className="py-2 text-right text-emerald-400">{formatCurrency(row.principal)}</td>
                      <td className="py-2 text-right text-orange-400">{formatCurrency(row.interest)}</td>
                      <td className="py-2 text-right text-slate-400">{formatCurrency(row.balance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
