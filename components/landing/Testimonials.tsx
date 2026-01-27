"use client";

import { Star, Quote, TrendingUp } from "lucide-react";

const testimonials = [
  {
    name: "Peter Novák",
    role: "Investor do nehnuteľností",
    location: "Bratislava",
    initials: "PN",
    content: "SRIA mi ušetrila desiatky hodín manuálnej analýzy. Index skrytého potenciálu mi už našiel 3 skvelé príležitosti, ktoré by som inak prehliadol.",
    rating: 5,
    highlight: "3x vyšší výnos",
    color: "emerald",
  },
  {
    name: "Mária Kováčová",
    role: "Realitná kancelária",
    location: "Košice",
    initials: "MK",
    content: "Pre našu kanceláriu je SRIA nepostrádateľná. AI predikcie sú presné a klienti oceňujú profesionálne reporty. ROI sa nám vrátil za 2 mesiace.",
    rating: 5,
    highlight: "ROI za 2 mesiace",
    color: "gold",
  },
  {
    name: "Ján Horváth",
    role: "Portfolio investor",
    location: "Nitra",
    initials: "JH",
    content: "Liquidity tracker a scenario simulator sú game-changer. Viem presne, kedy vyjednávať a aké scenáre očakávať. Investoval som už do 8 nehnuteľností cez SRIA.",
    rating: 5,
    highlight: "8 úspešných investícií",
    color: "emerald",
  },
];

export function Testimonials() {
  return (
    <section id="testimonials" className="py-24 sm:py-32 bg-zinc-900 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-grid-slate-800/[0.08] bg-[size:40px_40px]" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-zinc-700 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-zinc-700 to-transparent" />
      
      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        <div className="text-center mb-16 sm:mb-20">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-gold-500/20 text-gold-400 text-sm font-medium mb-6">
            <Star className="w-4 h-4 fill-gold-400" />
            <span>4.9/5 priemerné hodnotenie</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-6xl font-bold text-white mb-6">
            Čo hovoria naši{" "}
            <span className="text-emerald-400">používatelia</span>
          </h2>
          <p className="text-lg sm:text-xl text-zinc-400 max-w-2xl mx-auto">
            Pripojte sa k stovkám investorov, ktorí už maximalizujú svoje výnosy
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto">
          {testimonials.map((testimonial, index) => {
            const colorClasses = {
              emerald: {
                avatar: "bg-emerald-500",
                border: "hover:border-emerald-500/30",
                glow: "hover:glow-emerald-soft",
              },
              gold: {
                avatar: "bg-amber-500",
                border: "hover:border-gold-500/30",
                glow: "hover:glow-gold-soft",
              },
            };
            const colors = colorClasses[testimonial.color as keyof typeof colorClasses];
            
            return (
              <div
                key={index}
                className={`relative glass-card rounded-2xl p-6 sm:p-8 transition-all duration-300 ${colors.border} ${colors.glow} shine-effect`}
              >
                <Quote className="w-10 h-10 text-emerald-500/10 absolute top-6 right-6" />
                
                <div className="flex items-center gap-1 mb-5">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star
                      key={i}
                      className="w-4 h-4 fill-gold-400 text-gold-400"
                    />
                  ))}
                </div>

                <p className="text-zinc-300 mb-6 leading-relaxed relative z-10 text-base sm:text-lg">
                  "{testimonial.content}"
                </p>

                <div className="flex items-center gap-4 pt-5 border-t border-zinc-700/50">
                  <div className={`w-12 h-12 rounded-xl ${colors.avatar} flex items-center justify-center text-white font-bold text-sm `}>
                    {testimonial.initials}
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-semibold">
                      {testimonial.name}
                    </p>
                    <p className="text-sm text-zinc-400">
                      {testimonial.role} • {testimonial.location}
                    </p>
                  </div>
                </div>

                {testimonial.highlight && (
                  <div className="mt-5 pt-5 border-t border-zinc-700/50">
                    <span className="inline-flex items-center gap-2 px-4 py-2 glass border border-emerald-500/20 rounded-lg text-emerald-400 text-sm font-medium">
                      <TrendingUp className="w-4 h-4" />
                      {testimonial.highlight}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Social proof stats */}
        <div className="mt-20 sm:mt-24">
          <div className="glass-card rounded-2xl p-8 sm:p-10 max-w-4xl mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 text-center">
              <div>
                <p className="text-3xl sm:text-4xl font-bold text-emerald-400 mb-2">500+</p>
                <p className="text-sm text-zinc-400">Aktívnych investorov</p>
              </div>
              <div>
                <p className="text-3xl sm:text-4xl font-bold text-gold-400 mb-2">2,500+</p>
                <p className="text-sm text-zinc-400">Sledovaných nehnuteľností</p>
              </div>
              <div>
                <p className="text-3xl sm:text-4xl font-bold text-emerald-400 mb-2">4.9/5</p>
                <p className="text-sm text-zinc-400">Priemerné hodnotenie</p>
              </div>
              <div>
                <p className="text-3xl sm:text-4xl font-bold text-gold-400 mb-2">€1.2M</p>
                <p className="text-sm text-zinc-400">Spravovaný kapitál</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
