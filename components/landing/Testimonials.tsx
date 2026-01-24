"use client";

import { Star, Quote } from "lucide-react";

const testimonials = [
  {
    name: "Peter Novák",
    role: "Investor do nehnuteľností",
    location: "Bratislava",
    image: "👤",
    content: "SRIA mi ušetrila desiatky hodín manuálnej analýzy. Index skrytého potenciálu mi už našiel 3 skvelé príležitosti, ktoré by som inak prehliadol.",
    rating: 5,
    highlight: "3x vyšší výnos",
  },
  {
    name: "Mária Kováčová",
    role: "Realitná kancelária",
    location: "Košice",
    image: "👤",
    content: "Pre našu kanceláriu je SRIA nepostrádateľná. AI predikcie sú presné a klienti oceňujú profesionálne reporty. ROI sa nám vrátil za 2 mesiace.",
    rating: 5,
    highlight: "ROI za 2 mesiace",
  },
  {
    name: "Ján Horváth",
    role: "Portfolio investor",
    location: "Nitra",
    image: "👤",
    content: "Liquidity tracker a scenario simulator sú game-changer. Viem presne, kedy vyjednávať a aké scenáre očakávať. Investoval som už do 8 nehnuteľností cez SRIA.",
    rating: 5,
    highlight: "8 úspešných investícií",
  },
];

export function Testimonials() {
  return (
    <section className="py-24 bg-slate-900 border-y border-slate-800">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl lg:text-5xl font-bold text-slate-100 mb-4">
            Čo hovoria naši{" "}
            <span className="text-emerald-400">používatelia</span>
          </h2>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto">
            Pripojte sa k stovkám investorov, ktorí už maximalizujú svoje výnosy
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="relative bg-slate-800/50 rounded-xl border border-slate-700 p-6 hover:border-emerald-500/30 transition-all duration-200"
            >
              <Quote className="w-8 h-8 text-emerald-400/20 absolute top-4 right-4" />
              
              <div className="flex items-center gap-1 mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star
                    key={i}
                    className="w-4 h-4 fill-gold-400 text-gold-400"
                  />
                ))}
              </div>

              <p className="text-slate-200 mb-6 leading-relaxed relative z-10">
                "{testimonial.content}"
              </p>

              <div className="flex items-center gap-4 pt-4 border-t border-slate-700">
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-2xl">
                  {testimonial.image}
                </div>
                <div className="flex-1">
                  <p className="text-slate-100 font-semibold">
                    {testimonial.name}
                  </p>
                  <p className="text-sm text-slate-400">
                    {testimonial.role} • {testimonial.location}
                  </p>
                </div>
              </div>

              {testimonial.highlight && (
                <div className="mt-4 pt-4 border-t border-slate-700">
                  <span className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 text-xs font-medium">
                    <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                    {testimonial.highlight}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Social proof stats */}
        <div className="mt-16 pt-8 border-t border-slate-800">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <p className="text-3xl font-bold text-emerald-400 mb-2">500+</p>
              <p className="text-sm text-slate-300">Aktívnych investorov</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-emerald-400 mb-2">2,500+</p>
              <p className="text-sm text-slate-300">Sledovaných nehnuteľností</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-emerald-400 mb-2">4.9/5</p>
              <p className="text-sm text-slate-300">Priemerné hodnotenie</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-emerald-400 mb-2">€1.2M</p>
              <p className="text-sm text-slate-300">Spravovaný kapitál</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
