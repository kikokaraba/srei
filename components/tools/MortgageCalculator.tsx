"use client";

import { useState, useMemo } from "react";
import {
  Building2,
  PiggyBank,
  Percent,
  Calendar,
  TrendingDown,
  ChevronDown,
  ChevronUp,
  Info,
  CheckCircle,
  Banknote,
} from "lucide-react";

const BANK_RATES = [
  { name: "Prima banka", rate: 3.99, color: "bg-emerald-500" },
  { name: "VÚB banka", rate: 4.09, color: "bg-blue-500" },
  { name: "mBank", rate: 4.09, color: "bg-violet-500" },
  { name: "ČSOB", rate: 4.15, color: "bg-cyan-500" },
  { name: "Slovenská sporiteľňa", rate: 4.19, color: "bg-amber-500" },
  { name: "365.bank", rate: 4.19, color: "bg-pink-500" },
  { name: "UniCredit Bank", rate: 4.25, color: "bg-indigo-500" },
  { name: "Tatra banka", rate: 4.29, color: "bg-orange-500" },
];

interface MortgageCalculatorProps {
  initialPrice?: number;
}

export default function MortgageCalculator({ initialPrice }: MortgageCalculatorProps) {
  const [propertyPrice, setPropertyPrice] = useState(initialPrice || 150000);
  const [downPayment, setDownPayment] = useState(Math.round((initialPrice || 150000) * 0.2));
  const [interestRate, setInterestRate] = useState(4.09);
  const [loanTermYears, setLoanTermYears] = useState(30);
  const [showBanks, setShowBanks] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);

  const calc = useMemo(() => {
    const loanAmount = propertyPrice - downPayment;
    const monthlyRate = interestRate / 100 / 12;
    const totalPayments = loanTermYears * 12;
    
    const monthlyPayment = loanAmount * 
      (monthlyRate * Math.pow(1 + monthlyRate, totalPayments)) / 
      (Math.pow(1 + monthlyRate, totalPayments) - 1);
    
    const totalPaid = monthlyPayment * totalPayments;
    const totalInterest = totalPaid - loanAmount;
    const ltv = (loanAmount / propertyPrice) * 100;
    const requiredIncome = monthlyPayment / 0.4;
    const downPaymentPercent = (downPayment / propertyPrice) * 100;

    // Amortization
    const schedule = [];
    let balance = loanAmount;
    for (let month = 1; month <= totalPayments; month++) {
      const interest = balance * monthlyRate;
      const principal = monthlyPayment - interest;
      balance -= principal;
      if (month <= 12 || month % 12 === 0) {
        schedule.push({ month, principal, interest, balance: Math.max(0, balance) });
      }
    }

    return { loanAmount, monthlyPayment, totalPaid, totalInterest, ltv, requiredIncome, downPaymentPercent, schedule };
  }, [propertyPrice, downPayment, interestRate, loanTermYears]);

  const bankComparison = useMemo(() => {
    return BANK_RATES.map(bank => {
      const loanAmount = propertyPrice - downPayment;
      const monthlyRate = bank.rate / 100 / 12;
      const totalPayments = loanTermYears * 12;
      const monthlyPayment = loanAmount * 
        (monthlyRate * Math.pow(1 + monthlyRate, totalPayments)) / 
        (Math.pow(1 + monthlyRate, totalPayments) - 1);
      return { ...bank, monthlyPayment, diff: monthlyPayment - calc.monthlyPayment };
    }).sort((a, b) => a.monthlyPayment - b.monthlyPayment);
  }, [propertyPrice, downPayment, loanTermYears, calc.monthlyPayment]);

  const fmt = (n: number) => n.toLocaleString("sk-SK", { maximumFractionDigits: 0 });

  return (
    <div className="space-y-8">
      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Inputs - Left Side */}
        <div className="lg:col-span-2 space-y-6">
          <InputSlider
            icon={Building2}
            label="Cena nehnuteľnosti"
            value={propertyPrice}
            min={50000}
            max={500000}
            step={5000}
            format="€"
            color="blue"
            onChange={setPropertyPrice}
          />
          
          <InputSlider
            icon={PiggyBank}
            label="Vlastné zdroje"
            sublabel={`${calc.downPaymentPercent.toFixed(0)}%`}
            value={downPayment}
            min={propertyPrice * 0.1}
            max={propertyPrice * 0.5}
            step={1000}
            format="€"
            color="emerald"
            onChange={setDownPayment}
          />
          
          <InputSlider
            icon={Percent}
            label="Úroková sadzba"
            value={interestRate}
            min={2.5}
            max={7}
            step={0.01}
            format="% p.a."
            decimals={2}
            color="amber"
            onChange={setInterestRate}
          />
          
          <InputSlider
            icon={Calendar}
            label="Doba splácania"
            value={loanTermYears}
            min={5}
            max={30}
            step={1}
            format=" rokov"
            color="violet"
            onChange={setLoanTermYears}
          />

          {/* LTV Warning */}
          {calc.ltv > 80 && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-amber-400 font-medium">LTV nad 80%</p>
                  <p className="text-xs text-amber-400/70 mt-1">
                    Banky môžu požadovať vyšší úrok alebo dodatočné zabezpečenie.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Results - Right Side */}
        <div className="lg:col-span-3 space-y-6">
          {/* Hero Card */}
          <div className="relative overflow-hidden rounded-xl bg-blue-600 p-8">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="relative">
              <p className="text-blue-200 text-sm font-medium mb-2">Mesačná splátka</p>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-bold text-white">€{fmt(calc.monthlyPayment)}</span>
                <span className="text-blue-200">/mesiac</span>
              </div>
              <p className="text-blue-200/70 text-sm mt-3">
                Pri úrokovej sadzbe {interestRate.toFixed(2)}% p.a. na {loanTermYears} rokov
              </p>
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 gap-4">
            <MetricCard
              label="Výška úveru"
              value={`€${fmt(calc.loanAmount)}`}
              icon={Banknote}
            />
            <MetricCard
              label="LTV"
              value={`${calc.ltv.toFixed(0)}%`}
              icon={TrendingDown}
              status={calc.ltv <= 80 ? "good" : "warning"}
            />
            <MetricCard
              label="Celkovo zaplatíte"
              value={`€${fmt(calc.totalPaid)}`}
              sublabel={`Úroky: €${fmt(calc.totalInterest)}`}
            />
            <MetricCard
              label="Potrebný príjem"
              value={`€${fmt(calc.requiredIncome)}`}
              sublabel="Hrubý mesačný"
            />
          </div>
        </div>
      </div>

      {/* Bank Comparison */}
      <div className="rounded-xl border border-zinc-800/50 overflow-hidden bg-zinc-900/30">
        <button
          onClick={() => setShowBanks(!showBanks)}
          className="w-full px-6 py-5 flex items-center justify-between hover:bg-zinc-800/30 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-blue-400" />
            </div>
            <div className="text-left">
              <p className="font-semibold text-white">Porovnanie slovenských bánk</p>
              <p className="text-sm text-zinc-400">Aktuálne sadzby pre 5-ročnú fixáciu</p>
            </div>
          </div>
          {showBanks ? <ChevronUp className="w-5 h-5 text-zinc-400" /> : <ChevronDown className="w-5 h-5 text-zinc-400" />}
        </button>

        {showBanks && (
          <div className="px-6 pb-6 space-y-3">
            {bankComparison.map((bank, idx) => (
              <div
                key={bank.name}
                className={`flex items-center justify-between p-4 rounded-2xl transition-all ${
                  idx === 0 
                    ? "bg-emerald-500/10 border border-emerald-500/20" 
                    : "bg-zinc-800/30 border border-zinc-800/50"
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl ${bank.color} flex items-center justify-center text-white font-bold text-sm`}>
                    {idx + 1}
                  </div>
                  <div>
                    <p className="font-medium text-white">{bank.name}</p>
                    <p className="text-sm text-zinc-400">{bank.rate.toFixed(2)}% p.a.</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-white">€{fmt(bank.monthlyPayment)}</p>
                  {idx === 0 ? (
                    <p className="text-sm text-emerald-400 flex items-center gap-1 justify-end">
                      <CheckCircle className="w-3 h-3" /> Najlepšia
                    </p>
                  ) : (
                    <p className="text-sm text-zinc-500">+€{fmt(bank.diff)}/mes</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Amortization Schedule */}
      <div className="rounded-xl border border-zinc-800/50 overflow-hidden bg-zinc-900/30">
        <button
          onClick={() => setShowSchedule(!showSchedule)}
          className="w-full px-6 py-5 flex items-center justify-between hover:bg-zinc-800/30 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-violet-400" />
            </div>
            <div className="text-left">
              <p className="font-semibold text-white">Splátkový kalendár</p>
              <p className="text-sm text-zinc-400">Rozloženie splátok v čase</p>
            </div>
          </div>
          {showSchedule ? <ChevronUp className="w-5 h-5 text-zinc-400" /> : <ChevronDown className="w-5 h-5 text-zinc-400" />}
        </button>

        {showSchedule && (
          <div className="px-6 pb-6">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="text-left py-3 text-xs font-medium text-zinc-500 uppercase">Obdobie</th>
                    <th className="text-right py-3 text-xs font-medium text-zinc-500 uppercase">Istina</th>
                    <th className="text-right py-3 text-xs font-medium text-zinc-500 uppercase">Úrok</th>
                    <th className="text-right py-3 text-xs font-medium text-zinc-500 uppercase">Zostatok</th>
                  </tr>
                </thead>
                <tbody>
                  {calc.schedule.slice(0, 15).map((row) => (
                    <tr key={row.month} className="border-b border-zinc-800/50">
                      <td className="py-3 text-sm text-white">
                        {row.month <= 12 ? `${row.month}. mesiac` : `${Math.floor(row.month / 12)}. rok`}
                      </td>
                      <td className="py-3 text-sm text-right text-emerald-400">€{fmt(row.principal)}</td>
                      <td className="py-3 text-sm text-right text-amber-400">€{fmt(row.interest)}</td>
                      <td className="py-3 text-sm text-right text-zinc-400">€{fmt(row.balance)}</td>
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

function InputSlider({
  icon: Icon,
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
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  sublabel?: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: string;
  decimals?: number;
  color: string;
  onChange: (v: number) => void;
}) {
  const percentage = ((value - min) / (max - min)) * 100;
  const colorClasses: Record<string, { bg: string; track: string; icon: string }> = {
    blue: { bg: "bg-blue-500/10", track: "bg-blue-500", icon: "text-blue-400" },
    emerald: { bg: "bg-emerald-500/10", track: "bg-emerald-500", icon: "text-emerald-400" },
    amber: { bg: "bg-amber-500/10", track: "bg-amber-500", icon: "text-amber-400" },
    violet: { bg: "bg-violet-500/10", track: "bg-violet-500", icon: "text-violet-400" },
  };
  const c = colorClasses[color] || colorClasses.blue;

  const formatValue = () => {
    const num = decimals > 0 ? value.toFixed(decimals) : value.toLocaleString("sk-SK");
    return format === "€" ? `€${num}` : `${num}${format}`;
  };

  return (
    <div className="p-5 rounded-2xl bg-zinc-900/50 border border-zinc-800/50">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl ${c.bg} flex items-center justify-center`}>
            <Icon className={`w-5 h-5 ${c.icon}`} />
          </div>
          <div>
            <p className="text-sm text-zinc-400">{label}</p>
            {sublabel && <p className="text-xs text-zinc-500">{sublabel}</p>}
          </div>
        </div>
        <p className="text-lg font-semibold text-white">{formatValue()}</p>
      </div>
      
      <div className="relative h-2 bg-zinc-800 rounded-full overflow-hidden">
        <div 
          className={`absolute inset-y-0 left-0 ${c.track} rounded-full transition-all`}
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
      
      <div className="flex justify-between mt-2 text-xs text-zinc-600">
        <span>{format === "€" ? `€${min.toLocaleString()}` : `${min}${format}`}</span>
        <span>{format === "€" ? `€${max.toLocaleString()}` : `${max}${format}`}</span>
      </div>
    </div>
  );
}

function MetricCard({ 
  label, 
  value, 
  sublabel, 
  icon: Icon,
  status,
}: { 
  label: string; 
  value: string; 
  sublabel?: string;
  icon?: React.ComponentType<{ className?: string }>;
  status?: "good" | "warning";
}) {
  return (
    <div className="p-5 rounded-2xl bg-zinc-900/50 border border-zinc-800/50">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm text-zinc-400">{label}</p>
        {Icon && <Icon className="w-4 h-4 text-zinc-500" />}
      </div>
      <p className={`text-lg font-semibold ${
        status === "good" ? "text-emerald-400" : 
        status === "warning" ? "text-amber-400" : 
        "text-white"
      }`}>
        {value}
      </p>
      {sublabel && <p className="text-xs text-zinc-500 mt-1">{sublabel}</p>}
    </div>
  );
}
