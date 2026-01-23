"use client";

import { TrendingUp, Clock, Target, Shield, Zap, BarChart3 } from "lucide-react";

const benefits = [
  {
    icon: TrendingUp,
    title: "3x vyšší výnos",
    description: "Naši používatelia dosahujú v priemere 3x vyšší výnos vďaka AI-powered insights a automatickej detekcii príležitostí.",
    stat: "+180% vs. trh",
    color: "emerald",
  },
  {
    icon: Clock,
    title: "Ušetrite 20+ hodín/mesiac",
    description: "Automatizácia manuálnych analýz, vyhľadávania a porovnávania vám ušetrí desiatky hodín každý mesiac.",
    stat: "20+ hodín",
    color: "gold",
  },
  {
    icon: Target,
    title: "95% presnosť predikcií",
    description: "Naše AI modely majú 95% presnosť v predikcii výnosov a trendov na základe historických dát a market patterns.",
    stat: "95% presnosť",
    color: "emerald",
  },
  {
    icon: Shield,
    title: "Bank-level zabezpečenie",
    description: "Vaše dáta sú chránené enterprise-grade šifrovaním a Zero Trust architektúrou. GDPR compliant.",
    stat: "100% bezpečné",
    color: "slate",
  },
  {
    icon: Zap,
    title: "Real-time aktualizácie",
    description: "Dáta sa aktualizujú každých 15 minút. Vždy máte najaktuálnejšie informácie o trhu a príležitostiach.",
    stat: "Každých 15 min",
    color: "emerald",
  },
  {
    icon: BarChart3,
    title: "Komplexné analýzy",
    description: "Všetky metriky, ktoré potrebujete: ROI, IRR, cash-on-cash, break-even, daňové kalkulácie a viac.",
    stat: "15+ metrík",
    color: "gold",
  },
];

export function Benefits() {
  return (
    <section className="py-24 bg-gradient-to-b from-slate-900 to-slate-950">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl lg:text-5xl font-bold text-slate-100 mb-4">
            Prečo investori{" "}
            <span className="text-emerald-400">volia SRIA</span>
          </h2>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            Konkrétne výsledky a hodnota, ktorú získate s našou platformou
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {benefits.map((benefit, index) => {
            const Icon = benefit.icon;
            const colorClasses = {
              emerald: {
                icon: "text-emerald-400",
                iconBg: "bg-emerald-500/10 border-emerald-500/20",
                stat: "text-emerald-400",
                statBg: "bg-emerald-500/10",
              },
              gold: {
                icon: "text-gold-400",
                iconBg: "bg-gold-500/10 border-gold-500/20",
                stat: "text-gold-400",
                statBg: "bg-gold-500/10",
              },
              slate: {
                icon: "text-slate-400",
                iconBg: "bg-slate-800 border-slate-700",
                stat: "text-slate-400",
                statBg: "bg-slate-800",
              },
            };

            const colors = colorClasses[benefit.color as keyof typeof colorClasses];

            return (
              <div
                key={index}
                className="group relative bg-slate-800/30 rounded-xl border border-slate-700/50 p-6 hover:border-emerald-500/30 transition-all duration-300 hover:scale-105"
              >
                <div className={`w-14 h-14 rounded-xl ${colors.iconBg} border ${colors.iconBg.includes("border") ? "" : "border-slate-700"} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <Icon className={`w-7 h-7 ${colors.icon}`} />
                </div>

                <div className={`inline-block px-3 py-1 rounded-full ${colors.statBg} ${colors.stat} text-xs font-bold mb-3`}>
                  {benefit.stat}
                </div>

                <h3 className="text-xl font-bold text-slate-100 mb-2">
                  {benefit.title}
                </h3>
                <p className="text-slate-400 leading-relaxed">
                  {benefit.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
