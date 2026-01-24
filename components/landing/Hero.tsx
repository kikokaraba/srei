"use client";

import Link from "next/link";
import { memo } from "react";
import { ArrowRight, TrendingUp, BarChart3, Shield, Sparkles } from "lucide-react";

function LandingHeroComponent() {
  return (
    <section className="relative overflow-hidden bg-premium-dark pt-16 min-h-[90vh] flex items-center">
      {/* Animated background effects */}
      <div className="absolute inset-0 bg-grid-slate-800/[0.15] bg-[size:32px_32px]" />
      <div className="absolute top-20 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-20 right-1/4 w-80 h-80 bg-gold-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-3xl" />
      
      <div className="relative container mx-auto px-4 sm:px-6 py-16 sm:py-20 lg:py-24">
        <div className="max-w-5xl mx-auto text-center">
          {/* Premium badge */}
          <div className="inline-flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-full glass border border-emerald-500/30 text-emerald-400 text-xs sm:text-sm font-medium mb-8 sm:mb-10 glow-emerald-soft">
            <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>#1 investičná platforma na Slovensku</span>
            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
          </div>

          {/* Main headline with gradient */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-8xl font-bold mb-6 sm:mb-8 leading-[1.1] tracking-tight">
            <span className="bg-gradient-to-r from-emerald-400 via-emerald-300 to-gold-400 bg-clip-text text-transparent" suppressHydrationWarning>
              Investujte
            </span>
            <br />
            <span className="text-white">
              inteligentne.
            </span>
          </h1>

          <p className="text-lg sm:text-xl lg:text-2xl text-slate-300 mb-4 sm:mb-6 max-w-3xl mx-auto leading-relaxed px-2">
            Jediná platforma, ktorá kombinuje{" "}
            <span className="text-emerald-400 font-semibold">AI predikcie</span>,{" "}
            <span className="text-gold-400 font-semibold">real-time dáta</span> a{" "}
            <span className="text-emerald-400 font-semibold">pokročilé analytické nástroje</span>{" "}
            pre maximálny výnos z investícií do nehnuteľností.
          </p>
          
          <p className="text-base sm:text-lg text-slate-400 mb-10 sm:mb-14 max-w-2xl mx-auto">
            Pripojte sa k <span className="text-white font-semibold">500+ investorom</span> na slovenskom trhu.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-5 justify-center items-center mb-8 sm:mb-12 px-4 sm:px-0">
            <Link
              href="/auth/signin"
              className="group w-full sm:w-auto px-8 sm:px-12 py-4 sm:py-5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-bold text-base sm:text-lg rounded-2xl transition-all duration-300 flex items-center justify-center gap-3 shadow-2xl shadow-emerald-500/30 hover:shadow-emerald-500/50 hover:scale-105 glow-emerald"
            >
              Začať 14 dní zdarma
              <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="#pricing"
              className="w-full sm:w-auto px-8 sm:px-12 py-4 sm:py-5 glass hover:bg-slate-800/80 text-white font-semibold rounded-2xl transition-all duration-300 border border-slate-600 hover:border-emerald-500/50 text-center hover:glow-emerald-soft"
            >
              Zobraziť cenník
            </Link>
          </div>
          
          {/* Trust indicators */}
          <div className="flex flex-wrap justify-center gap-4 sm:gap-8 text-sm text-slate-400 mb-16 sm:mb-20 px-4">
            <span className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
              14 dní zdarma
            </span>
            <span className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
              Bez kreditnej karty
            </span>
            <span className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
              Zrušiteľné kedykoľvek
            </span>
          </div>

          {/* Feature cards with glass effect */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 max-w-4xl mx-auto px-4 sm:px-0">
            <div className="glass-card rounded-2xl p-5 sm:p-6 text-left hover:border-emerald-500/30 transition-all duration-300 hover:glow-emerald-soft shine-effect">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 border border-emerald-500/20 flex items-center justify-center mb-4">
                <BarChart3 className="w-6 h-6 text-emerald-400" />
              </div>
              <h3 className="text-white font-bold mb-2 text-lg">
                Real-time analýzy
              </h3>
              <p className="text-sm text-slate-400">
                Aktuálne dáta zo všetkých slovenských regiónov, aktualizované každých 15 minút
              </p>
            </div>

            <div className="glass-card rounded-2xl p-5 sm:p-6 text-left hover:border-gold-500/30 transition-all duration-300 hover:glow-gold-soft shine-effect">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gold-500/20 to-gold-500/5 border border-gold-500/20 flex items-center justify-center mb-4">
                <TrendingUp className="w-6 h-6 text-gold-400" />
              </div>
              <h3 className="text-white font-bold mb-2 text-lg">
                AI predikcie
              </h3>
              <p className="text-sm text-slate-400">
                95% presnosť predikcií výnosov a vývoja cien nehnuteľností
              </p>
            </div>

            <div className="glass-card rounded-2xl p-5 sm:p-6 text-left hover:border-slate-500/30 transition-all duration-300 shine-effect">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-500/20 to-slate-500/5 border border-slate-600 flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-slate-400" />
              </div>
              <h3 className="text-white font-bold mb-2 text-lg">
                Bezpečná platforma
              </h3>
              <p className="text-sm text-slate-400">
                Bank-level zabezpečenie, GDPR compliant, 99.9% uptime
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export const LandingHero = memo(LandingHeroComponent);
LandingHero.displayName = "LandingHero";
