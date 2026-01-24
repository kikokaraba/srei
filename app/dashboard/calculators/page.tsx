"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { 
  Calculator, 
  Receipt, 
  TrendingUp, 
  RefreshCw,
  ArrowRight,
  X,
  Sparkles,
  ChevronRight,
  BarChart3,
  Shield,
  Repeat,
  Info,
  Banknote,
  Brain,
  Activity,
} from "lucide-react";
import { ScenarioSimulator } from "@/components/dashboard/ScenarioSimulator";
import { TaxAssistant } from "@/components/dashboard/TaxAssistant";
import { BRRRRCalculator } from "@/components/calculators/BRRRRCalculator";
import { AIValuation } from "@/components/tools/AIValuation";
import { InvestmentAdvisor } from "@/components/tools/InvestmentAdvisor";
import { MarketTrends } from "@/components/tools/MarketTrends";
import PremiumGate from "@/components/ui/PremiumGate";

// Dynamic import for MortgageCalculator to avoid SSR issues
const MortgageCalculator = dynamic(
  () => import("@/components/tools/MortgageCalculator"),
  { ssr: false }
);

type CalculatorType = "investment" | "tax" | "brrrr" | "mortgage" | "ai-valuation" | "investment-advisor" | "market-trends" | null;

export default function CalculatorsPage() {
  const [openCalculator, setOpenCalculator] = useState<CalculatorType>(null);

  const calculators = [
    {
      id: "investment" as const,
      name: "Výnosová kalkulačka",
      subtitle: "Yield & Cash Flow",
      description: "Analyzujte potenciálne výnosy z nehnuteľnosti. Vypočítajte hrubý aj čistý výnos, cash-on-cash return a sledujte 10-ročnú projekciu vašej investície.",
      icon: TrendingUp,
      accentColor: "emerald",
      stats: [
        { label: "Hrubý výnos", value: "5-7%" },
        { label: "Cash-on-Cash", value: "8-12%" },
        { label: "Projekcia", value: "10 rokov" },
      ],
      capabilities: [
        "Investičné skóre 0-100",
        "Break-even analýza",
        "Mesačný cash flow",
        "ROI kalkulácia",
      ],
    },
    {
      id: "tax" as const,
      name: "Daňový asistent",
      subtitle: "Slovenská legislatíva 2026",
      description: "Presný výpočet dane z predaja nehnuteľnosti podľa aktuálnej slovenskej legislatívy. 5-ročný test oslobodenia, zdravotné odvody a optimalizácia.",
      icon: Receipt,
      accentColor: "blue",
      stats: [
        { label: "5-ročný test", value: "Oslobodenie" },
        { label: "Daň FO", value: "19-25%" },
        { label: "ZP odvody", value: "15%" },
      ],
      capabilities: [
        "Automatický výpočet oslobodenia",
        "Dedenie v priamom rade",
        "Obchodný majetok",
        "Časová os vlastníctva",
      ],
    },
    {
      id: "brrrr" as const,
      name: "BRRRR Stratégia",
      subtitle: "Buy, Rehab, Rent, Refinance, Repeat",
      description: "Pokročilá stratégia na recykláciu kapitálu. Vypočítajte forced equity, refinančnú sumu a zistite, či dokážete vybrať 100% vloženej hotovosti.",
      icon: RefreshCw,
      accentColor: "violet",
      stats: [
        { label: "Cieľ", value: "100%+ späť" },
        { label: "LTV", value: "65-80%" },
        { label: "Cash Flow", value: "Pasívny" },
      ],
      capabilities: [
        "Forced equity výpočet",
        "Nekonečná návratnosť",
        "Cash recovery %",
        "Equity pozícia",
      ],
    },
    {
      id: "ai-valuation" as const,
      name: "AI Ocenenie",
      subtitle: "Powered by Claude AI",
      description: "Inteligentný odhad trhovej hodnoty nehnuteľnosti na základe analýzy podobných inzerátov v databáze. AI zohľadňuje lokalitu, stav a aktuálny trh.",
      icon: Brain,
      accentColor: "violet",
      stats: [
        { label: "AI Model", value: "Claude" },
        { label: "Dáta", value: "Real-time" },
        { label: "Presnosť", value: "±10%" },
      ],
      capabilities: [
        "Analýza podobných nehnuteľností",
        "Cenový rozsah",
        "Faktory ovplyvňujúce cenu",
        "Trhové odporúčania",
      ],
    },
    {
      id: "investment-advisor" as const,
      name: "Investičný Asistent",
      subtitle: "AI-powered odporúčania",
      description: "AI analyzuje celý trh podľa vašich kritérií a nájde najlepšie investičné príležitosti. Personalizované odporúčania na základe rozpočtu a stratégie.",
      icon: Sparkles,
      accentColor: "emerald",
      stats: [
        { label: "Analýza", value: "100+ nehnuteľností" },
        { label: "Skóre", value: "0-100" },
        { label: "AI", value: "Claude" },
      ],
      capabilities: [
        "Personalizované odporúčania",
        "Investičné skóre",
        "Riziková analýza",
        "Trhová stratégia",
      ],
    },
    {
      id: "market-trends" as const,
      name: "Trhové Trendy",
      subtitle: "AI predikcia cien",
      description: "AI analyzuje aktuálny stav trhu a predikuje kam smerujú ceny. Krátkodobé aj dlhodobé trendy, horúce lokality a najlepší čas na kúpu/predaj.",
      icon: Activity,
      accentColor: "blue",
      stats: [
        { label: "Krátkodobý", value: "3 mesiace" },
        { label: "Dlhodobý", value: "12 mesiacov" },
        { label: "AI", value: "Claude" },
      ],
      capabilities: [
        "Predikcia cien",
        "Horúce lokality",
        "Najlepší čas na akciu",
        "Riziková analýza",
      ],
    },
    {
      id: "mortgage" as const,
      name: "Hypokalkulačka",
      subtitle: "Výpočet hypotéky a splátok",
      description: "Vypočítajte mesačné splátky hypotéky, celkové náklady na úver a porovnajte ponuky slovenských bánk. Vrátane amortizačného plánu.",
      icon: Banknote,
      accentColor: "amber",
      stats: [
        { label: "Úrok 2026", value: "3.5-5%" },
        { label: "LTV max", value: "80-90%" },
        { label: "Splatnosť", value: "5-30 rokov" },
      ],
      capabilities: [
        "Porovnanie bánk",
        "Mesačná splátka",
        "Amortizačný plán",
        "Potrebný príjem",
      ],
    },
  ];

  const getAccentClasses = (color: string) => {
    const classes = {
      emerald: {
        bg: "bg-emerald-500",
        bgLight: "bg-emerald-500/10",
        border: "border-emerald-500/20",
        borderHover: "hover:border-emerald-500/40",
        text: "text-emerald-400",
        glow: "shadow-emerald-500/20",
      },
      blue: {
        bg: "bg-blue-500",
        bgLight: "bg-blue-500/10",
        border: "border-blue-500/20",
        borderHover: "hover:border-blue-500/40",
        text: "text-blue-400",
        glow: "shadow-blue-500/20",
      },
      violet: {
        bg: "bg-violet-500",
        bgLight: "bg-violet-500/10",
        border: "border-violet-500/20",
        borderHover: "hover:border-violet-500/40",
        text: "text-violet-400",
        glow: "shadow-violet-500/20",
      },
      amber: {
        bg: "bg-amber-500",
        bgLight: "bg-amber-500/10",
        border: "border-amber-500/20",
        borderHover: "hover:border-amber-500/40",
        text: "text-amber-400",
        glow: "shadow-amber-500/20",
      },
    };
    return classes[color as keyof typeof classes] || classes.emerald;
  };

  const activeCalc = calculators.find(c => c.id === openCalculator);

  return (
    <div className="min-h-screen">
      {/* Minimalist Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 flex items-center justify-center">
            <Calculator className="w-5 h-5 text-slate-400" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-white">Kalkulačky</h1>
            <p className="text-sm text-slate-500">Profesionálne investičné nástroje</p>
          </div>
        </div>
      </div>

      {/* Calculator Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {calculators.map((calc) => {
          const Icon = calc.icon;
          const accent = getAccentClasses(calc.accentColor);
          const isOpen = openCalculator === calc.id;
          
          return (
            <div
              key={calc.id}
              className={`group relative rounded-2xl transition-all duration-300 ${
                isOpen 
                  ? "lg:col-span-3" 
                  : ""
              }`}
            >
              {/* Card */}
              <div 
                className={`relative overflow-hidden rounded-2xl border transition-all duration-300 ${
                  isOpen
                    ? `${accent.border} bg-slate-900/80 backdrop-blur-xl`
                    : `border-slate-800/50 bg-slate-900/40 backdrop-blur-sm ${accent.borderHover} hover:bg-slate-900/60 cursor-pointer`
                }`}
                onClick={() => !isOpen && setOpenCalculator(calc.id)}
              >
                {/* Subtle gradient overlay */}
                <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${
                  isOpen ? "opacity-100" : ""
                }`}>
                  <div className={`absolute -top-32 -right-32 w-64 h-64 rounded-full ${accent.bg} opacity-5 blur-3xl`} />
                </div>

                {/* Card Header - Always Visible */}
                <div className={`relative p-6 ${isOpen ? "border-b border-slate-800/50" : ""}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      {/* Icon */}
                      <div className={`w-12 h-12 rounded-xl ${accent.bgLight} flex items-center justify-center transition-transform duration-300 ${
                        !isOpen ? "group-hover:scale-110" : ""
                      }`}>
                        <Icon className={`w-6 h-6 ${accent.text}`} />
                      </div>
                      
                      {/* Title & Description */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h2 className="text-lg font-semibold text-white">{calc.name}</h2>
                        </div>
                        <p className="text-xs text-slate-500 mb-2">{calc.subtitle}</p>
                        {!isOpen && (
                          <p className="text-sm text-slate-400 line-clamp-2 pr-4">
                            {calc.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Action Button */}
                    {isOpen ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenCalculator(null);
                        }}
                        className="p-2 rounded-lg bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 transition-colors"
                      >
                        <X className="w-4 h-4 text-slate-400" />
                      </button>
                    ) : (
                      <div className={`p-2 rounded-lg ${accent.bgLight} opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0`}>
                        <ChevronRight className={`w-4 h-4 ${accent.text}`} />
                      </div>
                    )}
                  </div>

                  {/* Stats Row - Only when collapsed */}
                  {!isOpen && (
                    <div className="mt-5 pt-4 border-t border-slate-800/50">
                      <div className="flex items-center gap-6">
                        {calc.stats.map((stat, idx) => (
                          <div key={idx} className="flex-1">
                            <div className={`text-sm font-medium ${accent.text}`}>{stat.value}</div>
                            <div className="text-xs text-slate-500">{stat.label}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Capabilities - Only when collapsed */}
                  {!isOpen && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {calc.capabilities.slice(0, 3).map((cap, idx) => (
                        <span 
                          key={idx}
                          className="text-xs px-2.5 py-1 rounded-full bg-slate-800/50 text-slate-400 border border-slate-700/30"
                        >
                          {cap}
                        </span>
                      ))}
                      {calc.capabilities.length > 3 && (
                        <span className="text-xs px-2.5 py-1 rounded-full bg-slate-800/50 text-slate-500">
                          +{calc.capabilities.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Expanded Calculator Content */}
                {isOpen && (
                  <div className="relative p-6">
                    {calc.id === "mortgage" ? (
                      <MortgageCalculator />
                    ) : calc.id === "ai-valuation" ? (
                      <AIValuation />
                    ) : calc.id === "investment-advisor" ? (
                      <InvestmentAdvisor />
                    ) : calc.id === "market-trends" ? (
                      <MarketTrends />
                    ) : (
                      <PremiumGate 
                        feature={calc.id === "tax" ? "advancedTax" : "scenarioSimulator"} 
                        minHeight="400px"
                      >
                        {calc.id === "investment" && <ScenarioSimulator />}
                        {calc.id === "tax" && <TaxAssistant />}
                        {calc.id === "brrrr" && <BRRRRCalculator />}
                      </PremiumGate>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Reference - Only when no calculator is open */}
      {!openCalculator && (
        <div className="mt-8">
          <div className="flex items-center gap-2 mb-4">
            <Info className="w-4 h-4 text-slate-500" />
            <span className="text-sm text-slate-500">Rýchla referencia</span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <QuickRefCard
              icon={BarChart3}
              title="Výnosový benchmark"
              items={[
                { label: "Hrubý výnos", value: "> 5%", good: true },
                { label: "Čistý výnos", value: "> 3%", good: true },
                { label: "Cash-on-Cash", value: "> 8%", good: true },
              ]}
            />
            <QuickRefCard
              icon={Shield}
              title="Daňové oslobodenie"
              items={[
                { label: "Držba", value: "5+ rokov", good: true },
                { label: "Úspora", value: "až 34%", good: true },
                { label: "Dedenie", value: "Priamy rad", good: null },
              ]}
            />
            <QuickRefCard
              icon={Repeat}
              title="BRRRR ciele"
              items={[
                { label: "Cash späť", value: "100%+", good: true },
                { label: "Refinanc. LTV", value: "75%", good: null },
                { label: "Cash flow", value: "Pozitívny", good: true },
              ]}
            />
            <QuickRefCard
              icon={Banknote}
              title="Hypotéka 2026"
              items={[
                { label: "Úrok", value: "3.5-5%", good: null },
                { label: "Max LTV", value: "80-90%", good: null },
                { label: "DSTI limit", value: "40-50%", good: null },
              ]}
            />
          </div>
        </div>
      )}

      {/* Disclaimer */}
      <div className="mt-8 py-4 border-t border-slate-800/30">
        <p className="text-xs text-slate-600 text-center">
          Kalkulačky poskytujú orientačné výpočty. Pre presné daňové poradenstvo konzultujte odborníka.
          Výpočty vychádzajú zo zákonov platných pre rok 2026.
        </p>
      </div>
    </div>
  );
}

// Quick Reference Card Component
function QuickRefCard({ 
  icon: Icon, 
  title, 
  items 
}: { 
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  items: { label: string; value: string; good: boolean | null }[];
}) {
  return (
    <div className="p-4 rounded-xl bg-slate-900/30 border border-slate-800/30">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-4 h-4 text-slate-500" />
        <span className="text-sm font-medium text-slate-400">{title}</span>
      </div>
      <div className="space-y-2">
        {items.map((item, idx) => (
          <div key={idx} className="flex items-center justify-between">
            <span className="text-xs text-slate-500">{item.label}</span>
            <span className={`text-xs font-medium ${
              item.good === true ? "text-emerald-400" : 
              item.good === false ? "text-red-400" : 
              "text-slate-400"
            }`}>
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
