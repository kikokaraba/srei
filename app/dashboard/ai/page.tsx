"use client";

import { useState } from "react";
import { 
  Brain, 
  Sparkles, 
  TrendingUp, 
  Target,
  ChevronRight,
  X,
  Zap,
  Activity,
  LineChart,
  Search,
  MessageSquare,
} from "lucide-react";
import { AIValuation } from "@/components/tools/AIValuation";
import { InvestmentAdvisor } from "@/components/tools/InvestmentAdvisor";
import { MarketTrends } from "@/components/tools/MarketTrends";

type AIToolType = "valuation" | "advisor" | "trends" | null;

export default function AIToolsPage() {
  const [openTool, setOpenTool] = useState<AIToolType>(null);

  const aiTools = [
    {
      id: "valuation" as const,
      name: "AI Ocenenie",
      subtitle: "Inteligentný odhad hodnoty",
      description: "AI analyzuje podobné nehnuteľnosti v databáze a poskytne presný odhad trhovej hodnoty. Zohľadňuje lokalitu, stav, veľkosť a aktuálny trh.",
      icon: Target,
      accentColor: "violet",
      features: [
        "Analýza podobných nehnuteľností",
        "Cenový rozsah min/max",
        "Faktory ovplyvňujúce cenu",
        "Odporúčania pre predaj/kúpu",
      ],
      badge: "Claude AI",
    },
    {
      id: "advisor" as const,
      name: "Investičný Asistent",
      subtitle: "Personalizované odporúčania",
      description: "AI prehľadá celý trh a nájde najlepšie investičné príležitosti podľa vašich kritérií. Rozpočet, lokalita, stratégia - všetko zohľadnené.",
      icon: Sparkles,
      accentColor: "emerald",
      features: [
        "Filtrovanie podľa kritérií",
        "Investičné skóre 0-100",
        "Riziková analýza",
        "Top 5 odporúčaní",
      ],
      badge: "Claude AI",
    },
    {
      id: "trends" as const,
      name: "Trhové Trendy",
      subtitle: "AI predikcia vývoja trhu",
      description: "Kam smerujú ceny? AI analyzuje aktuálny stav trhu a predikuje krátkodobý aj dlhodobý vývoj. Identifikuje horúce lokality.",
      icon: Activity,
      accentColor: "blue",
      features: [
        "Krátkodobá predikcia (3 mes.)",
        "Dlhodobý výhľad (12 mes.)",
        "Horúce lokality",
        "Najlepší čas na akciu",
      ],
      badge: "Claude AI",
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
        gradient: "from-emerald-500 to-teal-500",
      },
      blue: {
        bg: "bg-blue-500",
        bgLight: "bg-blue-500/10",
        border: "border-blue-500/20",
        borderHover: "hover:border-blue-500/40",
        text: "text-blue-400",
        gradient: "from-blue-500 to-cyan-500",
      },
      violet: {
        bg: "bg-violet-500",
        bgLight: "bg-violet-500/10",
        border: "border-violet-500/20",
        borderHover: "hover:border-violet-500/40",
        text: "text-violet-400",
        gradient: "from-violet-500 to-purple-500",
      },
    };
    return classes[color as keyof typeof classes] || classes.emerald;
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-900 via-violet-950/20 to-zinc-900 p-6 lg:p-8 border border-zinc-800/50">
          <div className="absolute -top-24 -right-24 w-48 h-48 rounded-full blur-3xl opacity-20 bg-violet-500" />
          <div className="absolute -bottom-24 -left-24 w-48 h-48 rounded-full blur-3xl opacity-10 bg-emerald-500" />
          
          <div className="relative flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center shadow-lg shadow-violet-500/25">
              <Brain className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-2xl font-bold text-white">AI Nástroje</h1>
                <span className="px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-400 text-xs font-medium">
                  Powered by Claude
                </span>
              </div>
              <p className="text-zinc-400 max-w-2xl">
                Využite silu AI pre inteligentné rozhodnutia. Ocenenie nehnuteľností, 
                personalizované investičné odporúčania a predikcie trhových trendov.
              </p>
            </div>
          </div>

          {/* Quick stats */}
          <div className="relative mt-6 grid grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-800/30">
              <Zap className="w-5 h-5 text-amber-400" />
              <div>
                <p className="text-sm font-medium text-white">Real-time</p>
                <p className="text-xs text-zinc-500">Aktuálne dáta</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-800/30">
              <LineChart className="w-5 h-5 text-emerald-400" />
              <div>
                <p className="text-sm font-medium text-white">95% presnosť</p>
                <p className="text-xs text-zinc-500">Predikcií</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-800/30">
              <Search className="w-5 h-5 text-blue-400" />
              <div>
                <p className="text-sm font-medium text-white">8 000+</p>
                <p className="text-xs text-zinc-500">Nehnuteľností</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* AI Tools Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {aiTools.map((tool) => {
          const Icon = tool.icon;
          const accent = getAccentClasses(tool.accentColor);
          const isOpen = openTool === tool.id;
          
          return (
            <div
              key={tool.id}
              className={`group relative rounded-2xl transition-all duration-300 ${
                isOpen ? "lg:col-span-3" : ""
              }`}
            >
              <div 
                className={`relative overflow-hidden rounded-2xl border transition-all duration-300 ${
                  isOpen
                    ? `${accent.border} bg-zinc-900/80 backdrop-blur-xl`
                    : `border-zinc-800/50 bg-zinc-900/40 backdrop-blur-sm ${accent.borderHover} hover:bg-zinc-900/60 cursor-pointer`
                }`}
                onClick={() => !isOpen && setOpenTool(tool.id)}
              >
                {/* Gradient overlay */}
                <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${
                  isOpen ? "opacity-100" : ""
                }`}>
                  <div className={`absolute -top-32 -right-32 w-64 h-64 rounded-full ${accent.bg} opacity-5 blur-3xl`} />
                </div>

                {/* Card Header */}
                <div className={`relative p-6 ${isOpen ? "border-b border-zinc-800/50" : ""}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${accent.gradient} flex items-center justify-center transition-transform duration-300 ${
                        !isOpen ? "group-hover:scale-110" : ""
                      }`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h2 className="text-lg font-semibold text-white">{tool.name}</h2>
                          <span className={`px-2 py-0.5 rounded-full ${accent.bgLight} ${accent.text} text-xs font-medium`}>
                            {tool.badge}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-500 mb-2">{tool.subtitle}</p>
                        {!isOpen && (
                          <p className="text-sm text-zinc-400 line-clamp-2 pr-4">
                            {tool.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {isOpen ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenTool(null);
                        }}
                        className="p-2 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/50 transition-colors"
                      >
                        <X className="w-4 h-4 text-zinc-400" />
                      </button>
                    ) : (
                      <div className={`p-2 rounded-lg ${accent.bgLight} opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0`}>
                        <ChevronRight className={`w-4 h-4 ${accent.text}`} />
                      </div>
                    )}
                  </div>

                  {/* Features - Only when collapsed */}
                  {!isOpen && (
                    <div className="mt-5 pt-4 border-t border-zinc-800/50">
                      <div className="grid grid-cols-2 gap-2">
                        {tool.features.map((feature, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <div className={`w-1.5 h-1.5 rounded-full ${accent.bg}`} />
                            <span className="text-xs text-zinc-400">{feature}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Expanded Tool Content */}
                {isOpen && (
                  <div className="relative p-6">
                    {tool.id === "valuation" && <AIValuation />}
                    {tool.id === "advisor" && <InvestmentAdvisor />}
                    {tool.id === "trends" && <MarketTrends />}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* AI Chat Teaser - Coming Soon */}
      {!openTool && (
        <div className="mt-8">
          <div className="relative overflow-hidden rounded-2xl border border-dashed border-zinc-700/50 p-6 bg-zinc-900/20">
            <div className="absolute inset-0 bg-gradient-to-r from-violet-500/5 to-emerald-500/5" />
            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-zinc-800/50 flex items-center justify-center">
                  <MessageSquare className="w-6 h-6 text-zinc-500" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-white">AI Chat Asistent</h3>
                    <span className="px-2 py-0.5 rounded-full bg-zinc-700/50 text-zinc-400 text-xs">
                      Čoskoro
                    </span>
                  </div>
                  <p className="text-sm text-zinc-500">
                    Pýtajte sa AI na čokoľvek o trhu, investíciách alebo konkrétnych nehnuteľnostiach
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Disclaimer */}
      <div className="mt-8 py-4 border-t border-zinc-800/30">
        <p className="text-xs text-zinc-600 text-center">
          AI nástroje poskytujú orientačné analýzy a odporúčania. Pred investičným rozhodnutím 
          odporúčame konzultovať s odborníkom. Dáta sú aktualizované v reálnom čase.
        </p>
      </div>
    </div>
  );
}
