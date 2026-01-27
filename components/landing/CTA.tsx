"use client";

import Link from "next/link";
import { ArrowRight, Sparkles, Zap, Shield, CreditCard, RotateCcw } from "lucide-react";

export function CTA() {
  return (
    <section className="py-24 sm:py-32 bg-zinc-950 relative overflow-hidden">
      {/* Premium background effects */}
      <div className="absolute inset-0 bg-grid-slate-800/[0.08] bg-[size:48px_48px]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-emerald-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-gold-500/10 rounded-full blur-3xl" />
      
      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        <div className="max-w-5xl mx-auto">
          {/* Glass card container */}
          <div className="glass-card rounded-3xl p-8 sm:p-12 lg:p-16 text-center glow-emerald-soft">
            <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full glass border border-emerald-500/30 text-emerald-400 text-sm font-medium mb-8">
              <Sparkles className="w-4 h-4" />
              <span>Začnite ešte dnes</span>
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-6xl font-bold text-white mb-6 leading-tight">
              Pripravení{" "}
              <span className="text-emerald-400">
                zmeniť spôsob
              </span>
              <br />
              investovania?
            </h2>

            <p className="text-lg sm:text-xl text-zinc-300 mb-10 max-w-2xl mx-auto">
              Začnite zdarma ešte dnes a zistite, prečo si{" "}
              <span className="text-white font-semibold">500+ investorov</span> vybralo SRIA
              pre svoje investičné rozhodnutia.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 sm:gap-5 justify-center items-center mb-12">
              <Link
                href="/auth/signin"
                className="group w-full sm:w-auto px-10 sm:px-14 py-5 sm:py-6 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-bold text-lg rounded-2xl transition-all duration-300 flex items-center justify-center gap-3 shadow-2xl shadow-emerald-500/30 hover:shadow-emerald-500/50 hover:scale-105 glow-emerald"
              >
                Začať 14 dní zdarma
                <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="#pricing"
                className="w-full sm:w-auto px-10 sm:px-14 py-5 sm:py-6 glass hover:bg-zinc-800/80 text-white font-semibold rounded-2xl transition-all duration-300 border border-zinc-600 hover:border-emerald-500/50 text-center"
              >
                Zobraziť cenník
              </Link>
            </div>

            {/* Trust indicators with icons */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 max-w-3xl mx-auto">
              <div className="flex flex-col items-center gap-2 p-4 rounded-xl glass-light">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-emerald-400" />
                </div>
                <p className="text-sm text-zinc-300 font-medium">Okamžitý prístup</p>
              </div>
              <div className="flex flex-col items-center gap-2 p-4 rounded-xl glass-light">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-emerald-400" />
                </div>
                <p className="text-sm text-zinc-300 font-medium">100% bezpečné</p>
              </div>
              <div className="flex flex-col items-center gap-2 p-4 rounded-xl glass-light">
                <div className="w-10 h-10 rounded-lg bg-gold-500/10 border border-gold-500/20 flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-gold-400" />
                </div>
                <p className="text-sm text-zinc-300 font-medium">Žiadna karta</p>
              </div>
              <div className="flex flex-col items-center gap-2 p-4 rounded-xl glass-light">
                <div className="w-10 h-10 rounded-lg bg-zinc-700/50 border border-zinc-600 flex items-center justify-center">
                  <RotateCcw className="w-5 h-5 text-zinc-400" />
                </div>
                <p className="text-sm text-zinc-300 font-medium">Zrušiteľné</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
