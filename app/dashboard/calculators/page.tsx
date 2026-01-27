"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { 
  Calculator, 
  TrendingUp, 
  RefreshCw,
  Receipt,
  Banknote,
  ArrowRight,
  Sparkles,
  X,
  Home,
} from "lucide-react";
import { ScenarioSimulator } from "@/components/dashboard/ScenarioSimulator";
import { TaxAssistant } from "@/components/dashboard/TaxAssistant";
import { BRRRRCalculator } from "@/components/calculators/BRRRRCalculator";
import PremiumGate from "@/components/ui/PremiumGate";

const MortgageCalculator = dynamic(
  () => import("@/components/tools/MortgageCalculator"),
  { ssr: false }
);

type CalculatorType = "investment" | "tax" | "brrrr" | "mortgage" | null;

interface PropertyData {
  price: number;
  area: number;
  rent: number;
  title: string;
}

export default function CalculatorsPage() {
  const searchParams = useSearchParams();
  const [openCalculator, setOpenCalculator] = useState<CalculatorType>(null);
  const [propertyData, setPropertyData] = useState<PropertyData | null>(null);

  // Read URL params and auto-open calculator
  useEffect(() => {
    const calc = searchParams.get("calc") as CalculatorType;
    const price = searchParams.get("price");
    const area = searchParams.get("area");
    const rent = searchParams.get("rent");
    const title = searchParams.get("title");

    if (calc && ["mortgage", "investment", "tax", "brrrr"].includes(calc)) {
      setOpenCalculator(calc);
    }

    if (price) {
      setPropertyData({
        price: parseInt(price) || 0,
        area: parseInt(area || "0") || 0,
        rent: parseInt(rent || "0") || 0,
        title: title || "",
      });
    }
  }, [searchParams]);

  const calculators = [
    {
      id: "mortgage" as const,
      name: "Hypotekárna kalkulačka",
      description: "Výpočet mesačnej splátky, porovnanie bánk a amortizačný plán",
      icon: Banknote,
      iconColor: "text-blue-400",
      metrics: ["Mesačná splátka", "LTV analýza", "Porovnanie 8 bánk"],
      popular: true,
    },
    {
      id: "investment" as const,
      name: "Výnosová analýza",
      description: "ROI, cash flow a 10-ročná projekcia investície",
      icon: TrendingUp,
      iconColor: "text-emerald-400",
      metrics: ["Hrubý/čistý výnos", "Cash-on-Cash", "Break-even"],
      popular: false,
    },
    {
      id: "brrrr" as const,
      name: "BRRRR Stratégia",
      description: "Buy, Rehab, Rent, Refinance, Repeat - recyklácia kapitálu",
      icon: RefreshCw,
      iconColor: "text-violet-400",
      metrics: ["Forced equity", "Cash recovery", "Infinite ROI"],
      popular: false,
    },
    {
      id: "tax" as const,
      name: "Daňový asistent",
      description: "Daň z predaja, 5-ročný test a zdravotné odvody",
      icon: Receipt,
      iconColor: "text-amber-400",
      metrics: ["Oslobodenie od dane", "Výpočet ZP", "SK legislatíva 2026"],
      popular: false,
    },
  ];

  if (openCalculator) {
    const calc = calculators.find(c => c.id === openCalculator);
    if (!calc) return null;
    const Icon = calc.icon;

    return (
      <div>
        {/* Property Info Banner - Premium */}
        {propertyData && propertyData.price > 0 && (
          <div className="mb-6 p-4 premium-card">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <Home className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-emerald-400 font-medium">Kalkulácia pre nehnuteľnosť</p>
                <p className="text-zinc-100 font-medium text-sm truncate">{propertyData.title || "Vybraná nehnuteľnosť"}</p>
              </div>
              <div className="text-right">
                <p className="text-xl font-semibold text-zinc-100 font-mono">€{propertyData.price.toLocaleString()}</p>
                {propertyData.area > 0 && (
                  <p className="text-xs text-zinc-500 font-mono">{propertyData.area} m²</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Calculator Header - Premium */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center`}>
                <Icon className={`w-5 h-5 ${calc.iconColor}`} />
              </div>
              <div>
                <h1 className="text-lg font-medium text-zinc-100">{calc.name}</h1>
                <p className="text-xs text-zinc-500">{calc.description}</p>
              </div>
            </div>
            <button
              onClick={() => {
                setOpenCalculator(null);
                setPropertyData(null);
              }}
              className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-500 hover:text-zinc-200 hover:border-zinc-700 transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Calculator Content - Premium */}
        <div className="premium-card p-5 md:p-6">
          {calc.id === "mortgage" ? (
            <MortgageCalculator initialPrice={propertyData?.price} />
          ) : (
            <PremiumGate 
              feature={calc.id === "tax" ? "advancedTax" : "scenarioSimulator"} 
              minHeight="400px"
            >
              {calc.id === "investment" && <ScenarioSimulator initialData={propertyData} />}
              {calc.id === "tax" && <TaxAssistant />}
              {calc.id === "brrrr" && <BRRRRCalculator initialPrice={propertyData?.price} />}
            </PremiumGate>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Hero Header - Premium */}
      <div className="mb-8">
        <p className="text-[10px] text-zinc-600 uppercase tracking-widest font-medium mb-1">NÁSTROJE</p>
        <h1 className="text-2xl font-semibold text-zinc-100 tracking-tight mb-1">Investičné kalkulačky</h1>
        <p className="text-zinc-500 text-sm">Profesionálne nástroje pre slovenských investorov</p>
      </div>

      {/* Calculator Grid - Premium */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {calculators.map((calc) => {
          const Icon = calc.icon;
          
          return (
            <button
              key={calc.id}
              onClick={() => setOpenCalculator(calc.id)}
              className="group relative text-left premium-card-interactive p-5"
            >
              {/* Popular Badge */}
              {calc.popular && (
                <div className="absolute -top-2 -right-2 px-2.5 py-1 rounded-lg bg-zinc-100 text-zinc-900 text-[10px] font-medium flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  Populárne
                </div>
              )}

              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className={`w-11 h-11 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center group-hover:border-zinc-700 transition-colors`}>
                  <Icon className={`w-5 h-5 ${calc.iconColor}`} />
                </div>
                <div className="p-2 rounded-lg bg-zinc-800/50 opacity-0 group-hover:opacity-100 transition-all duration-200">
                  <ArrowRight className="w-4 h-4 text-zinc-300" />
                </div>
              </div>

              {/* Title & Description */}
              <h2 className="text-base font-medium text-zinc-100 mb-1.5 group-hover:text-white transition-colors">
                {calc.name}
              </h2>
              <p className="text-xs text-zinc-500 mb-4 line-clamp-2">
                {calc.description}
              </p>

              {/* Metrics */}
              <div className="flex flex-wrap gap-1.5">
                {calc.metrics.map((metric, idx) => (
                  <span 
                    key={idx}
                    className="px-2.5 py-1 rounded-lg bg-zinc-900/50 text-[10px] text-zinc-400 border border-zinc-800/50"
                  >
                    {metric}
                  </span>
                ))}
              </div>
            </button>
          );
        })}
      </div>

      {/* Quick Stats */}
      <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-4">
        <QuickStat label="Priemerný výnos BA" value="4.2%" trend="+0.3%" />
        <QuickStat label="Hypotéka 5r fix" value="4.09%" trend="-0.1%" />
        <QuickStat label="Daň z predaja" value="19%" />
        <QuickStat label="5-ročný test" value="Oslobodenie" />
      </div>

      {/* Footer */}
      <div className="mt-8 pt-6 border-t border-zinc-800/50 text-center">
        <p className="text-xs text-zinc-600">
          Kalkulačky poskytujú orientačné výpočty podľa slovenskej legislatívy 2026.
          Pre presné výpočty kontaktujte finančného poradcu.
        </p>
      </div>
    </div>
  );
}

function QuickStat({ label, value, trend }: { label: string; value: string; trend?: string }) {
  const isPositive = trend?.startsWith("+");
  
  return (
    <div className="premium-card p-4">
      <div className="text-[10px] text-zinc-500 uppercase tracking-wide mb-1.5">{label}</div>
      <div className="flex items-baseline gap-2">
        <span className="text-lg font-semibold text-zinc-100 font-mono">{value}</span>
        {trend && (
          <span className={`text-xs font-mono ${isPositive ? "text-emerald-400" : "text-red-400"}`}>
            {trend}
          </span>
        )}
      </div>
    </div>
  );
}
