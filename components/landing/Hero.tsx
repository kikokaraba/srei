"use client";

import Link from "next/link";
import { memo } from "react";
import { ArrowRight, TrendingUp, BarChart3, Shield } from "lucide-react";

function LandingHeroComponent() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950/20 pt-16">
      <div className="absolute inset-0 bg-grid-slate-800/[0.2] bg-[size:20px_20px]" />
      <div className="relative container mx-auto px-4 sm:px-6 py-16 sm:py-20 lg:py-32">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs sm:text-sm font-medium mb-6 sm:mb-8 animate-pulse">
            <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4" />
            <span>#1 investičná platforma na Slovensku</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-bold mb-4 sm:mb-6 leading-tight">
            <span className="bg-gradient-to-r from-emerald-400 via-emerald-300 to-emerald-200 bg-clip-text text-transparent" suppressHydrationWarning>
              Investujte inteligentne.
            </span>
            <br />
            <span className="text-slate-100">
              Získajte výhodu.
            </span>
          </h1>

          <p className="text-base sm:text-lg lg:text-xl text-slate-300 mb-3 sm:mb-4 max-w-2xl mx-auto leading-relaxed px-2">
            Jediná platforma, ktorá kombinuje <span className="text-emerald-400 font-semibold">AI predikcie</span>,{" "}
            <span className="text-emerald-400 font-semibold">real-time dáta</span> a{" "}
            <span className="text-emerald-400 font-semibold">pokročilé analytické nástroje</span>{" "}
            pre maximálny výnos z vašich investícií.
          </p>
          
          <p className="text-sm sm:text-base lg:text-lg text-slate-400 mb-8 sm:mb-12 max-w-2xl mx-auto">
            Pripojte sa k 500+ investorom na slovenskom trhu.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center mb-6 sm:mb-8 px-4 sm:px-0">
            <Link
              href="/auth/signin"
              className="group w-full sm:w-auto px-6 sm:px-10 py-4 sm:py-5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-base sm:text-lg rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-2xl shadow-emerald-500/30 hover:shadow-emerald-500/50 hover:scale-105"
            >
              Začať 14 dní zdarma
              <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="#pricing"
              className="w-full sm:w-auto px-6 sm:px-10 py-4 sm:py-5 bg-slate-800/80 hover:bg-slate-700 text-slate-100 font-semibold rounded-xl transition-all duration-200 border-2 border-slate-700 hover:border-slate-600 backdrop-blur-sm text-center"
            >
              Zobraziť cenník
            </Link>
          </div>
          
          <p className="text-xs sm:text-sm text-slate-400 mb-10 sm:mb-16 px-4">
            <span className="hidden sm:inline">✓ Bezplatná 14-dňová skúšobná verzia • ✓ Žiadna kreditná karta • ✓ Zrušiteľné kedykoľvek</span>
            <span className="sm:hidden">✓ 14 dní zdarma • ✓ Bez karty</span>
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 max-w-3xl mx-auto px-4 sm:px-0">
            <div className="flex items-start gap-3 p-3 sm:p-0 bg-slate-900/50 sm:bg-transparent rounded-lg sm:rounded-none">
              <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 shrink-0">
                <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400" />
              </div>
              <div className="text-left">
                <h3 className="text-slate-100 font-semibold mb-0.5 sm:mb-1 text-sm sm:text-base">
                  Real-time analýzy
                </h3>
                <p className="text-xs sm:text-sm text-slate-300">
                  Aktuálne dáta z celého Slovenska
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 sm:p-0 bg-slate-900/50 sm:bg-transparent rounded-lg sm:rounded-none">
              <div className="p-2 rounded-lg bg-gold-500/10 border border-gold-500/20 shrink-0">
                <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-gold-400" />
              </div>
              <div className="text-left">
                <h3 className="text-slate-100 font-semibold mb-0.5 sm:mb-1 text-sm sm:text-base">
                  AI predikcie
                </h3>
                <p className="text-xs sm:text-sm text-slate-300">
                  Prognózy výnosov a trendov
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 sm:p-0 bg-slate-900/50 sm:bg-transparent rounded-lg sm:rounded-none">
              <div className="p-2 rounded-lg bg-slate-800 border border-slate-700 shrink-0">
                <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-slate-400" />
              </div>
              <div className="text-left">
                <h3 className="text-slate-100 font-semibold mb-0.5 sm:mb-1 text-sm sm:text-base">
                  Bezpečná platforma
                </h3>
                <p className="text-xs sm:text-sm text-slate-300">
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
