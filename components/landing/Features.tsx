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
      "Aktuálne dáta a metriky z celého slovenského trhu nehnuteľností v reálnom čase.",
    color: "emerald",
  },
  {
    icon: Zap,
    title: "AI-powered insights",
    description:
      "Pokročilé algoritmy a strojové učenie pre presné predikcie výnosov a trendov.",
    color: "gold",
  },
  {
    icon: Shield,
    title: "Bezpečnosť na prvom mieste",
    description:
      "Bank-level šifrovanie a Zero Trust architektúra pre ochranu vašich dát.",
    color: "slate",
  },
  {
    icon: TrendingUp,
    title: "Optimalizácia výnosov",
    description:
      "Automatické výpočty ROI, cash-on-cash return a ďalších kľúčových metrík.",
    color: "emerald",
  },
  {
    icon: Map,
    title: "Geografická inteligencia",
    description:
      "PostGIS-powered mapy a analýzy investičnej atraktivity podľa lokalít.",
    color: "gold",
  },
  {
    icon: Target,
    title: "Cieľové investovanie",
    description:
      "Filtrovanie a porovnávanie nehnuteľností podľa vašich investičných cieľov.",
    color: "emerald",
  },
];

export function Features() {
  return (
    <section className="py-24 bg-slate-900">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl lg:text-5xl font-bold text-slate-100 mb-4">
            Všetko, čo potrebujete pre{" "}
            <span className="text-emerald-400">úspešné investovanie</span>
          </h2>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            Kombinácia AI technológie, real-time dát a pokročilých analytických nástrojov,
            ktoré vám dajú konkurenčnú výhodu na trhu
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            const colorClasses = {
              emerald:
                "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
              gold: "bg-gold-500/10 border-gold-500/20 text-gold-400",
              slate: "bg-slate-800 border-slate-700 text-slate-400",
            };

            return (
              <div
                key={index}
                className="group p-6 rounded-xl bg-slate-800/50 border border-slate-700/50 hover:border-emerald-500/30 transition-all duration-200"
              >
                <div
                  className={`w-12 h-12 rounded-lg ${colorClasses[feature.color as keyof typeof colorClasses]} border p-3 mb-4 group-hover:scale-110 transition-transform`}
                >
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-100 mb-2">
                  {feature.title}
                </h3>
                <p className="text-slate-400 leading-relaxed">
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
