"use client";

import Link from "next/link";
import { memo } from "react";
import { ArrowRight, TrendingUp, BarChart3, Shield } from "lucide-react";

function LandingHeroComponent() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950/20 pt-16">
      <div className="absolute inset-0 bg-grid-slate-800/[0.2] bg-[size:20px_20px]" />
      <div className="relative container mx-auto px-6 py-24 lg:py-32">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium mb-8 animate-pulse">
            <TrendingUp className="w-4 h-4" />
            <span>#1 investičná platforma na Slovensku</span>
          </div>

          <h1 className="text-5xl lg:text-7xl font-bold mb-6 leading-tight">
            <span className="bg-gradient-to-r from-emerald-400 via-emerald-300 to-gold-400 bg-clip-text text-transparent" suppressHydrationWarning>
              Investujte inteligentne.
            </span>
            <br />
            <span className="text-slate-100">
              Získajte výhodu.
            </span>
          </h1>

          <p className="text-xl text-slate-400 mb-4 max-w-2xl mx-auto leading-relaxed">
            Jediná platforma, ktorá kombinuje <span className="text-emerald-400 font-semibold">AI predikcie</span>,{" "}
            <span className="text-emerald-400 font-semibold">real-time dáta</span> a{" "}
            <span className="text-emerald-400 font-semibold">pokročilé analytické nástroje</span>{" "}
            pre maximálny výnos z vašich investícií do nehnuteľností.
          </p>
          
          <p className="text-lg text-slate-500 mb-12 max-w-2xl mx-auto">
            Pripojte sa k 500+ investorom, ktorí už maximalizujú svoje výnosy na slovenskom trhu.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
            <Link
              href="/auth/signin"
              className="group px-10 py-5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-lg rounded-xl transition-all duration-200 flex items-center gap-2 shadow-2xl shadow-emerald-500/30 hover:shadow-emerald-500/50 hover:scale-105"
            >
              Začať 14 dní zdarma
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="#pricing"
              className="px-10 py-5 bg-slate-800/80 hover:bg-slate-700 text-slate-100 font-semibold rounded-xl transition-all duration-200 border-2 border-slate-700 hover:border-slate-600 backdrop-blur-sm"
            >
              Zobraziť cenník
            </Link>
          </div>
          
          <p className="text-sm text-slate-500 mb-16">
            ✓ Bezplatná 14-dňová skúšobná verzia • ✓ Žiadna kreditná karta • ✓ Zrušiteľné kedykoľvek
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-3xl mx-auto">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <BarChart3 className="w-6 h-6 text-emerald-400" />
              </div>
              <div className="text-left">
                <h3 className="text-slate-100 font-semibold mb-1">
                  Real-time analýzy
                </h3>
                <p className="text-sm text-slate-400">
                  Aktuálne dáta z celého Slovenska
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-gold-500/10 border border-gold-500/20">
                <TrendingUp className="w-6 h-6 text-gold-400" />
              </div>
              <div className="text-left">
                <h3 className="text-slate-100 font-semibold mb-1">
                  AI predikcie
                </h3>
                <p className="text-sm text-slate-400">
                  Prognózy výnosov a trendov
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-slate-800 border border-slate-700">
                <Shield className="w-6 h-6 text-slate-400" />
              </div>
              <div className="text-left">
                <h3 className="text-slate-100 font-semibold mb-1">
                  Bezpečná platforma
                </h3>
                <p className="text-sm text-slate-400">
                  Bank-level zabezpečenie
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export const LandingHero = memo(LandingHeroComponent);
LandingHero.displayName = "LandingHero";
