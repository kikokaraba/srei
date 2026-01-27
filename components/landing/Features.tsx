"use client";

import {
  BarChart3,
  Zap,
  Shield,
  TrendingUp,
  Map,
  Target,
} from "lucide-react";

const features = [
  {
    icon: BarChart3,
    title: "Real-time analýzy",
    description:
      "Aktuálne dáta a metriky z celého slovenského trhu nehnuteľností v reálnom čase. Aktualizácie každých 15 minút.",
    color: "emerald",
    stat: "Každých 15 min",
  },
  {
    icon: Zap,
    title: "AI-powered insights",
    description:
      "Pokročilé algoritmy a strojové učenie pre presné predikcie výnosov a trendov. 95% presnosť predikcií.",
    color: "gold",
    stat: "95% presnosť",
  },
  {
    icon: TrendingUp,
    title: "3x vyšší výnos",
    description:
      "Naši používatelia dosahujú v priemere 3x vyšší výnos vďaka AI-powered insights a automatickej detekcii príležitostí.",
    color: "emerald",
    stat: "+180% vs. trh",
  },
  {
    icon: Target,
    title: "Index skrytého potenciálu",
    description:
      "Automatická detekcia podhodnotených nehnuteľností porovnaním s priemernými cenami ulíc. Ušetrite 20+ hodín mesačne.",
    color: "emerald",
    stat: "20+ hodín",
  },
  {
    icon: Map,
    title: "Geografická inteligencia",
    description:
      "PostGIS-powered mapy a analýzy investičnej atraktivity podľa lokalít. Urban development tracker pre budúci rast.",
    color: "gold",
    stat: "8 regiónov",
  },
  {
    icon: Shield,
    title: "Komplexné analýzy",
    description:
      "Všetky metriky, ktoré potrebujete: ROI, IRR, cash-on-cash, break-even, daňové kalkulácie a viac. 15+ metrík.",
    color: "slate",
    stat: "15+ metrík",
  },
];

export function Features() {
  return (
    <section id="features" className="py-24 sm:py-32 bg-zinc-950 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-grid-slate-800/[0.08] bg-[size:48px_48px]" />
      <div className="absolute top-1/4 -left-20 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-gold-500/10 rounded-full blur-3xl" />
      
      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        <div className="text-center mb-16 sm:mb-20">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-emerald-500/20 text-emerald-400 text-sm font-medium mb-6">
            <Target className="w-4 h-4" />
            <span>Profesionálne nástroje</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-6xl font-bold text-white mb-6">
            Všetko pre{" "}
            <span className="text-emerald-400">úspešné investovanie</span>
          </h2>
          <p className="text-lg sm:text-xl text-zinc-400 max-w-3xl mx-auto">
            Kombinácia AI technológie, real-time dát a pokročilých analytických nástrojov,
            ktoré vám dajú konkurenčnú výhodu na trhu
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 lg:gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            const colorClasses = {
              emerald: {
                icon: "text-emerald-400",
                iconBg: "bg-emerald-500/10 border-emerald-500/20",
                stat: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
                glow: "hover:glow-emerald-soft hover:border-emerald-500/30",
              },
              gold: {
                icon: "text-gold-400",
                iconBg: "bg-amber-500/10 border-gold-500/20",
                stat: "text-gold-400 bg-gold-500/10 border-gold-500/20",
                glow: "hover:glow-gold-soft hover:border-gold-500/30",
              },
              slate: {
                icon: "text-zinc-400",
                iconBg: "bg-zinc-800/80 border-zinc-700",
                stat: "text-zinc-400 bg-zinc-800 border-zinc-700",
                glow: "hover:border-zinc-600",
              },
            };
            const colors = colorClasses[feature.color as keyof typeof colorClasses];

            return (
              <div
                key={index}
                className={`group glass-card rounded-2xl p-6 sm:p-8 transition-all duration-300 ${colors.glow} shine-effect`}
              >
                <div className="flex items-start justify-between mb-5">
                  <div className={`w-14 h-14 rounded-xl ${colors.iconBg} border flex items-center justify-center group-hover:scale-110 transition-transform`}>
                    <Icon className={`w-7 h-7 ${colors.icon}`} />
                  </div>
                  {feature.stat && (
                    <span className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${colors.stat}`}>
                      {feature.stat}
                    </span>
                  )}
                </div>
                <h3 className="text-base font-semibold text-white mb-3">
                  {feature.title}
                </h3>
                <p className="text-zinc-400 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
