"use client";

import { 
  Check, 
  X, 
  Calculator, 
  Briefcase, 
  Brain, 
  TrendingUp, 
  Flame, 
  Scale,
  Receipt,
  Building2,
  Sparkles,
} from "lucide-react";

const comparisonData = [
  {
    feature: "Investorské kalkulačky",
    description: "BRRRR, Yield, Cash-on-Cash, IRR",
    sria: true,
    competition: false,
    icon: Calculator,
  },
  {
    feature: "Správa portfólia",
    description: "Sledovanie vlastných nehnuteľností a výnosov",
    sria: true,
    competition: false,
    icon: Briefcase,
  },
  {
    feature: "AI predikcie cien",
    description: "6-mesačné a ročné predikcie s 95% presnosťou",
    sria: true,
    competition: false,
    icon: Brain,
  },
  {
    feature: "Hot Deals detekcia",
    description: "Automatická detekcia nehnuteľností 15%+ pod trhom",
    sria: true,
    competition: false,
    icon: Flame,
  },
  {
    feature: "Cross-portal porovnanie",
    description: "Nájdenie tej istej nehnuteľnosti na rôznych portáloch",
    sria: true,
    competition: false,
    icon: Scale,
  },
  {
    feature: "Daňový asistent",
    description: "Výpočet dane z predaja podľa SK legislatívy 2026",
    sria: true,
    competition: false,
    icon: Receipt,
  },
  {
    feature: "Urban Development tracker",
    description: "Vplyv plánovanej infraštruktúry na ceny",
    sria: true,
    competition: false,
    icon: Building2,
  },
  {
    feature: "Interaktívna mapa",
    description: "Mapa s filtrami a cenami",
    sria: true,
    competition: true,
    icon: null,
  },
];

const investorFeatures = [
  {
    title: "Pre serióznych investorov",
    description: "Nie len prezeranie inzerátov, ale komplexná analýza investičného potenciálu každej nehnuteľnosti.",
    icon: TrendingUp,
    color: "emerald",
  },
  {
    title: "Úspora 20+ hodín týždenne",
    description: "Automatická detekcia príležitostí, porovnávanie cien a analýzy - všetko na jednom mieste.",
    icon: Sparkles,
    color: "gold",
  },
  {
    title: "Data-driven rozhodnutia",
    description: "Rozhodujte sa na základe dát, nie pocitov. AI predikcie, historické trendy, market gaps.",
    icon: Brain,
    color: "emerald",
  },
];

export function CompetitiveAdvantage() {
  return (
    <section id="why-sria" className="py-24 sm:py-32 bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-grid-slate-800/[0.05] bg-[size:40px_40px]" />
      <div className="absolute top-1/2 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-gold-500/10 rounded-full blur-3xl" />
      
      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-gold-500/20 text-gold-400 text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4" />
            <span>Konkurenčná výhoda</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6">
            Prečo investori volia{" "}
            <span className="text-emerald-400">SRIA</span>
          </h2>
          <p className="text-lg sm:text-xl text-zinc-400 max-w-3xl mx-auto">
            Ostatné portály sú pre bežných kupujúcich. SRIA je postavená špeciálne pre investorov, 
            ktorí potrebujú viac než len zoznam inzerátov.
          </p>
        </div>

        {/* Investor Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          {investorFeatures.map((feature, index) => {
            const Icon = feature.icon;
            const colorClasses = feature.color === "emerald" 
              ? "from-emerald-500/20 to-transparent border-emerald-500/30 text-emerald-400"
              : "from-gold-500/20 to-transparent border-gold-500/30 text-gold-400";
            
            return (
              <div 
                key={index}
                className={`p-6 sm:p-8 rounded-2xl bg-gradient-to-br ${colorClasses} border backdrop-blur-sm`}
              >
                <div className={`w-14 h-14 rounded-xl bg-zinc-900/80 border ${feature.color === "emerald" ? "border-emerald-500/30" : "border-gold-500/30"} flex items-center justify-center mb-5`}>
                  <Icon className={`w-7 h-7 ${feature.color === "emerald" ? "text-emerald-400" : "text-gold-400"}`} />
                </div>
                <h3 className="text-base font-semibold text-white mb-3">{feature.title}</h3>
                <p className="text-zinc-400">{feature.description}</p>
              </div>
            );
          })}
        </div>

        {/* Comparison Table */}
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h3 className="text-lg font-semibold text-white mb-2">Porovnanie funkcií</h3>
            <p className="text-zinc-400">SRIA vs. bežné realitné portály</p>
          </div>
          
          <div className="rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-900/50 backdrop-blur-sm">
            {/* Table header */}
            <div className="grid grid-cols-3 bg-zinc-800/50 border-b border-zinc-700">
              <div className="p-4 sm:p-5 text-sm font-semibold text-zinc-400">Funkcia</div>
              <div className="p-4 sm:p-5 text-sm font-bold text-emerald-400 text-center">SRIA</div>
              <div className="p-4 sm:p-5 text-sm font-semibold text-zinc-500 text-center">Konkurencia</div>
            </div>
            
            {/* Table rows */}
            {comparisonData.map((item, index) => {
              const Icon = item.icon;
              return (
                <div 
                  key={index} 
                  className={`grid grid-cols-3 ${index < comparisonData.length - 1 ? "border-b border-zinc-800" : ""} hover:bg-zinc-800/30 transition-colors`}
                >
                  <div className="p-4 sm:p-5 flex items-center gap-3">
                    {Icon && <Icon className="w-5 h-5 text-zinc-500 hidden sm:block" />}
                    <div>
                      <div className="text-sm font-medium text-white">{item.feature}</div>
                      <div className="text-xs text-zinc-500 hidden sm:block">{item.description}</div>
                    </div>
                  </div>
                  <div className="p-4 sm:p-5 flex items-center justify-center">
                    {item.sria ? (
                      <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                        <Check className="w-5 h-5 text-emerald-400" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center">
                        <X className="w-5 h-5 text-zinc-600" />
                      </div>
                    )}
                  </div>
                  <div className="p-4 sm:p-5 flex items-center justify-center">
                    {item.competition ? (
                      <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center">
                        <Check className="w-5 h-5 text-zinc-400" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center">
                        <X className="w-5 h-5 text-red-400" />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Bottom CTA */}
          <div className="text-center mt-10">
            <p className="text-zinc-400 mb-4">
              <span className="text-emerald-400 font-semibold">7 funkcií</span> ktoré konkurencia nemá
            </p>
            <a
              href="/auth/signin"
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-bold rounded-xl transition-all duration-300  shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:scale-105"
            >
              Vyskúšať zadarmo
              <Sparkles className="w-5 h-5" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
