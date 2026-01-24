"use client";

import { useState } from "react";
import { 
  Calculator, 
  Receipt, 
  TrendingUp, 
  Sparkles, 
  PiggyBank, 
  Percent, 
  RefreshCw,
  ArrowRight,
  HelpCircle,
  BookOpen,
  Target,
  Clock,
  Shield,
  Zap,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { ScenarioSimulator } from "@/components/dashboard/ScenarioSimulator";
import { TaxAssistant } from "@/components/dashboard/TaxAssistant";
import { BRRRRCalculator } from "@/components/calculators/BRRRRCalculator";
import PremiumGate from "@/components/ui/PremiumGate";

type CalculatorType = "investment" | "tax" | "brrrr";

export default function CalculatorsPage() {
  const [activeCalculator, setActiveCalculator] = useState<CalculatorType>("investment");
  const [showEducation, setShowEducation] = useState(false);

  const calculators = [
    {
      id: "investment" as const,
      name: "Yield & Cash Flow",
      description: "Výnosy, cash-on-cash, 10Y projekcia",
      icon: TrendingUp,
      gradient: "from-emerald-500 to-teal-500",
      glow: "bg-emerald-500",
      features: ["Hrubý a čistý výnos", "Cash-on-Cash Return", "10-ročná projekcia", "Investičné skóre"],
    },
    {
      id: "tax" as const,
      name: "Daňový asistent",
      description: "5-ročný test, daň z predaja",
      icon: Receipt,
      gradient: "from-blue-500 to-cyan-500",
      glow: "bg-blue-500",
      features: ["5-ročný test oslobodenia", "Daň z kapitálového zisku", "Zdravotné odvody", "Dedenie a obchodný majetok"],
    },
    {
      id: "brrrr" as const,
      name: "BRRRR Stratégia",
      description: "Recyklácia kapitálu",
      icon: RefreshCw,
      gradient: "from-purple-500 to-pink-500",
      glow: "bg-purple-500",
      features: ["Forced Equity", "Refinančný výpočet", "Cash Recovery", "Nekonečná návratnosť"],
    },
  ];

  const educationContent = [
    {
      icon: Percent,
      title: "Hrubý vs. Čistý výnos",
      content: `**Hrubý výnos (Gross Yield)** = Ročný nájom ÷ Cena nehnuteľnosti
      
Príklad: €7 200 nájom ÷ €120 000 cena = **6%**

**Čistý výnos (Net Yield)** zohľadňuje náklady:
- Fond opráv (cca 5-10% nájmu)
- Poistenie (€100-200/rok)
- Správa (8-12% nájmu ak prenajímate cez agentúru)
- Vacancy (5-10% času prázdny)

Na Slovensku je dobrý hrubý výnos **5-7%**, čistý **3-5%**.`,
      color: "emerald",
    },
    {
      icon: PiggyBank,
      title: "Cash-on-Cash Return",
      content: `Najdôležitejšia metrika pre investorov s hypotékou!

**Cash-on-Cash** = Ročný Cash Flow ÷ Vlastná investícia

Príklad:
- Cena: €100 000
- Záloha 20%: €20 000
- Ročný čistý príjem: €2 400
- **CoC = €2 400 ÷ €20 000 = 12%**

Prečo je to lepšie ako pozerať len výnos?
Lebo ukazuje skutočný výnos na VAŠE peniaze, nie na celú nehnuteľnosť.

**Benchmarky:**
- Vynikajúce: > 12%
- Dobré: 8-12%
- Priemerné: 5-8%
- Slabé: < 5%`,
      color: "blue",
    },
    {
      icon: Shield,
      title: "5-ročný daňový test",
      content: `**Oslobodenie od dane z predaja nehnuteľnosti v SR:**

Ak vlastníte nehnuteľnosť **viac ako 5 rokov**, zisk z predaja je **oslobodený od dane aj zdravotných odvodov**.

Pri predaji pred 5 rokmi platíte:
- **19%** daň z príjmu (do €50 234)
- **25%** nad touto hranicou
- **15%** zdravotné poistenie

Príklad (predaj po 3 rokoch):
- Kúpa: €100 000
- Predaj: €130 000
- Zisk: €30 000
- Daň 19%: €5 700
- ZP 15%: €4 500
- **Celkom: €10 200** (34% zo zisku!)

**Počkajte 5 rokov** = Ušetríte celú túto sumu.`,
      color: "amber",
    },
    {
      icon: RefreshCw,
      title: "BRRRR Stratégia",
      content: `**Buy, Rehab, Rent, Refinance, Repeat**

Stratégia na "recykláciu" kapitálu:

1. **Buy** - Kúpte podhodnotenú nehnuteľnosť
2. **Rehab** - Zrekonštruujte a zvýšte hodnotu
3. **Rent** - Prenajmite a vytvorte cash flow
4. **Refinance** - Refinancujte na novú (vyššiu) hodnotu
5. **Repeat** - Vybratý kapitál použite na ďalší deal

**Príklad:**
- Kúpa: €80 000
- Rekonštrukcia: €20 000
- **Celkom: €100 000**
- Hodnota po rekonštrukcii (ARV): €130 000
- Refinancovanie 75%: €97 500
- **Vrátená hotovosť: €97 500 - €80 000 = €17 500**

Výsledok: Máte nehnuteľnosť s cash flow a €17 500 na ďalší deal!`,
      color: "purple",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/30 p-6 lg:p-8">
        <div className="absolute -top-24 -right-24 w-48 h-48 rounded-full blur-3xl opacity-20 bg-emerald-500" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 rounded-full blur-3xl opacity-10 bg-purple-500" />
        
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-purple-500 flex items-center justify-center shadow-lg shadow-emerald-500/20 shrink-0">
              <Calculator className="w-7 h-7 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-2xl lg:text-3xl font-bold text-white">Investičné Kalkulačky</h1>
                <Sparkles className="w-5 h-5 text-amber-400" />
              </div>
              <p className="text-slate-400 text-sm lg:text-base">
                Profesionálne nástroje prispôsobené pre slovenský realitný trh
              </p>
            </div>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={() => setShowEducation(!showEducation)}
              className="px-4 py-2 rounded-xl bg-slate-800/50 border border-slate-700/50 flex items-center gap-2 hover:bg-slate-800 transition-colors"
            >
              <BookOpen className="w-4 h-4 text-amber-400" />
              <span className="text-sm text-white font-medium">Vzdelávanie</span>
              {showEducation ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>
          </div>
        </div>

        {/* Education Section */}
        {showEducation && (
          <div className="mt-6 pt-6 border-t border-slate-700/50">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {educationContent.map((item, idx) => {
                const Icon = item.icon;
                const colorClasses = {
                  emerald: "from-emerald-500/10 to-emerald-500/5 border-emerald-500/30",
                  blue: "from-blue-500/10 to-blue-500/5 border-blue-500/30",
                  amber: "from-amber-500/10 to-amber-500/5 border-amber-500/30",
                  purple: "from-purple-500/10 to-purple-500/5 border-purple-500/30",
                };
                const iconColors = {
                  emerald: "text-emerald-400 bg-emerald-500/20",
                  blue: "text-blue-400 bg-blue-500/20",
                  amber: "text-amber-400 bg-amber-500/20",
                  purple: "text-purple-400 bg-purple-500/20",
                };

                return (
                  <div 
                    key={idx} 
                    className={`p-5 rounded-xl bg-gradient-to-br ${colorClasses[item.color as keyof typeof colorClasses]} border`}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`w-10 h-10 rounded-lg ${iconColors[item.color as keyof typeof iconColors]} flex items-center justify-center`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <h3 className="font-semibold text-white">{item.title}</h3>
                    </div>
                    <div className="text-sm text-slate-300 whitespace-pre-line leading-relaxed">
                      {item.content.split('**').map((part, i) => 
                        i % 2 === 0 ? part : <strong key={i} className="text-white">{part}</strong>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Calculator Tabs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {calculators.map((calc) => {
          const Icon = calc.icon;
          const isActive = activeCalculator === calc.id;
          
          return (
            <button
              key={calc.id}
              onClick={() => setActiveCalculator(calc.id)}
              className={`relative overflow-hidden p-5 rounded-xl transition-all text-left ${
                isActive
                  ? "bg-gradient-to-br from-slate-800 to-slate-900 border-2 border-emerald-500/50"
                  : "bg-slate-900/50 border border-slate-800 hover:bg-slate-800/50"
              }`}
            >
              {isActive && (
                <div className={`absolute -top-12 -right-12 w-24 h-24 rounded-full blur-2xl opacity-30 ${calc.glow}`} />
              )}
              
              <div className="relative">
                <div className="flex items-center gap-4 mb-3">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    isActive ? `bg-gradient-to-br ${calc.gradient}` : "bg-slate-800"
                  }`}>
                    <Icon className={`w-6 h-6 ${isActive ? "text-white" : "text-slate-400"}`} />
                  </div>
                  <div className="flex-1">
                    <div className={`font-semibold ${isActive ? "text-white" : "text-slate-300"}`}>
                      {calc.name}
                    </div>
                    <div className="text-sm text-slate-500">{calc.description}</div>
                  </div>
                  {isActive && (
                    <ArrowRight className="w-5 h-5 text-emerald-400" />
                  )}
                </div>
                
                {/* Features */}
                <div className="flex flex-wrap gap-2">
                  {calc.features.slice(0, 3).map((feature, idx) => (
                    <span 
                      key={idx} 
                      className={`text-xs px-2 py-1 rounded-md ${
                        isActive 
                          ? "bg-emerald-500/10 text-emerald-400" 
                          : "bg-slate-800 text-slate-500"
                      }`}
                    >
                      {feature}
                    </span>
                  ))}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Active Calculator */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 p-6 border border-slate-800">
        {activeCalculator === "investment" && (
          <PremiumGate feature="scenarioSimulator" minHeight="400px">
            <ScenarioSimulator />
          </PremiumGate>
        )}
        {activeCalculator === "tax" && (
          <PremiumGate feature="advancedTax" minHeight="400px">
            <TaxAssistant />
          </PremiumGate>
        )}
        {activeCalculator === "brrrr" && (
          <PremiumGate feature="scenarioSimulator" minHeight="400px">
            <BRRRRCalculator />
          </PremiumGate>
        )}
      </div>

      {/* Quick Tips */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { 
            icon: Target, 
            title: "Hrubý výnos", 
            text: "Nad 5% je dobrý, nad 7% výborný", 
            color: "emerald" 
          },
          { 
            icon: Zap, 
            title: "Cash-on-Cash", 
            text: "Cieľ nad 8%, ideálne 12%+", 
            color: "blue" 
          },
          { 
            icon: Clock, 
            title: "5-ročný test", 
            text: "Počkajte a ušetrite 34% z zisku", 
            color: "amber" 
          },
          { 
            icon: RefreshCw, 
            title: "BRRRR", 
            text: "Vybrať 100%+ kapitálu", 
            color: "purple" 
          },
        ].map((tip, index) => {
          const Icon = tip.icon;
          const colorClasses = {
            emerald: "from-emerald-500/10 to-teal-500/10 border-emerald-500/20 text-emerald-400",
            blue: "from-blue-500/10 to-cyan-500/10 border-blue-500/20 text-blue-400",
            amber: "from-amber-500/10 to-orange-500/10 border-amber-500/20 text-amber-400",
            purple: "from-purple-500/10 to-pink-500/10 border-purple-500/20 text-purple-400",
          };
          
          return (
            <div 
              key={index} 
              className={`relative overflow-hidden rounded-xl p-4 bg-gradient-to-br ${colorClasses[tip.color as keyof typeof colorClasses]} border`}
            >
              <div className="flex items-center gap-2 mb-2">
                <Icon className={`w-5 h-5`} />
                <span className="font-medium text-white">{tip.title}</span>
              </div>
              <p className="text-sm text-slate-400">{tip.text}</p>
            </div>
          );
        })}
      </div>

      {/* Disclaimer */}
      <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/50">
        <div className="flex items-start gap-3">
          <HelpCircle className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
          <div className="text-sm text-slate-400">
            <p className="mb-1">
              <strong className="text-slate-300">Dôležité upozornenie:</strong> Kalkulačky poskytujú orientačné výpočty 
              založené na zadaných parametroch. Skutočné výnosy sa môžu líšiť v závislosti od trhových podmienok, 
              stavu nehnuteľnosti a ďalších faktorov.
            </p>
            <p>
              Pre presné daňové poradenstvo konzultujte s daňovým poradcom. Výpočty vychádzajú zo zákonov 
              platných pre rok 2026.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
