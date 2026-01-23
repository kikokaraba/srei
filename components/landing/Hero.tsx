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
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium mb-8">
            <TrendingUp className="w-4 h-4" />
            <span>Prémiová investičná platforma</span>
          </div>

          <h1 className="text-5xl lg:text-7xl font-bold text-slate-100 mb-6 leading-tight">
            <span className="bg-gradient-to-r from-emerald-400 via-emerald-300 to-gold-400 bg-clip-text text-transparent">
              Slovenská realitná investičná aplikácia
            </span>
          </h1>

          <p className="text-xl text-slate-400 mb-12 max-w-2xl mx-auto leading-relaxed">
            Real-time analýzy, pokročilé metriky a AI-powered insights pre
            maximálny výnos z vašich investícií na slovenskom trhu
            nehnuteľností.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
            <Link
              href="/auth/signin"
              className="group px-8 py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-lg transition-all duration-200 flex items-center gap-2 shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40"
            >
              Začať investovať
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/dashboard"
              className="px-8 py-4 bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold rounded-lg transition-all duration-200 border border-slate-700"
            >
              Prehliadka platformy
            </Link>
          </div>

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
