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
            Pripravení na{" "}
            <span className="bg-gradient-to-r from-emerald-400 to-gold-400 bg-clip-text text-transparent" suppressHydrationWarning>
              maximálny výnos
            </span>
            ?
          </h2>

          <p className="text-xl text-slate-400 mb-12 max-w-2xl mx-auto">
            Pripojte sa k stovkám investorov, ktorí už využívajú SRIA pre
            inteligentné rozhodnutia v nehnuteľnostiach.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href="/auth/signin"
              className="group px-8 py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-lg transition-all duration-200 flex items-center gap-2 shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40"
            >
              Vytvoriť účet zdarma
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/dashboard"
              className="px-8 py-4 bg-transparent hover:bg-slate-800 text-slate-100 font-semibold rounded-lg transition-all duration-200 border border-slate-700 hover:border-slate-600"
            >
              Pozrieť demo
            </Link>
          </div>

          <div className="mt-16 pt-8 border-t border-slate-800">
            <p className="text-sm text-slate-500 mb-4">
              Bezplatné 14-dňové skúšobné obdobie • Žiadna kreditná karta
            </p>
            <div className="flex flex-wrap justify-center gap-6 text-xs text-slate-600">
              <span>✓ Real-time dáta</span>
              <span>✓ AI predikcie</span>
              <span>✓ Pokročilé filtre</span>
              <span>✓ 24/7 podpora</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
