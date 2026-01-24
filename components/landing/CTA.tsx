"use client";

import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

export function CTA() {
  return (
    <section className="py-24 bg-gradient-to-br from-emerald-950/20 via-slate-900 to-gold-950/20 relative overflow-hidden">
      <div className="absolute inset-0 bg-grid-slate-800/[0.1] bg-[size:40px_40px]" />
      <div className="container mx-auto px-6 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium mb-8">
            <Sparkles className="w-4 h-4" />
            <span>Začnite ešte dnes</span>
          </div>

          <h2 className="text-4xl lg:text-6xl font-bold text-slate-100 mb-6">
            Pripravení{" "}
            <span className="bg-gradient-to-r from-emerald-400 to-emerald-200 bg-clip-text text-transparent" suppressHydrationWarning>
              zmeniť spôsob
            </span>
            <br />
            investovania?
          </h2>

          <p className="text-xl text-slate-300 mb-8 max-w-2xl mx-auto">
            Začnite zdarma ešte dnes a zistite, prečo si 500+ investorov vybralo SRIA
            pre svoje investičné rozhodnutia.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            <Link
              href="/auth/signin"
              className="group px-10 py-5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-lg rounded-xl transition-all duration-200 flex items-center gap-2 shadow-2xl shadow-emerald-500/30 hover:shadow-emerald-500/50 hover:scale-105"
            >
              Začať 14 dní zdarma
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="#pricing"
              className="px-10 py-5 bg-transparent hover:bg-slate-800/50 text-slate-100 font-semibold rounded-xl transition-all duration-200 border-2 border-slate-700 hover:border-slate-600 backdrop-blur-sm"
            >
              Zobraziť cenník
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto mb-8">
            <div className="text-center">
              <div className="text-2xl mb-2">⚡</div>
              <p className="text-sm text-slate-300">Okamžitý prístup</p>
            </div>
            <div className="text-center">
              <div className="text-2xl mb-2">🔒</div>
              <p className="text-sm text-slate-300">100% bezpečné</p>
            </div>
            <div className="text-center">
              <div className="text-2xl mb-2">💳</div>
              <p className="text-sm text-slate-300">Žiadna karta</p>
            </div>
            <div className="text-center">
              <div className="text-2xl mb-2">↩️</div>
              <p className="text-sm text-slate-300">Zrušiteľné</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
