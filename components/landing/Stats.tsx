"use client";

import { AnimatedCounter } from "./AnimatedCounter";
import { Shield, Lock, Award, CheckCircle2, TrendingUp } from "lucide-react";

const stats = [
  {
    value: "500",
    suffix: "+",
    label: "Aktívnych investorov",
    change: "+127 tento mesiac",
    trend: "up",
    color: "emerald",
  },
  {
    value: "2500",
    suffix: "+",
    label: "Sledovaných nehnuteľností",
    change: "+12% rast",
    trend: "up",
    color: "gold",
  },
  {
    value: "5.2",
    suffix: "%",
    label: "Priemerný výnos",
    change: "+0.4% vs. trh",
    trend: "up",
    color: "emerald",
  },
  {
    value: "1.2",
    suffix: "M+",
    prefix: "€",
    label: "Spravovaný kapitál",
    change: "+28% rast",
    trend: "up",
    color: "gold",
  },
];

const trustBadges = [
  { icon: Shield, title: "GDPR Compliant", color: "emerald" },
  { icon: Lock, title: "Bank-Level Security", color: "slate" },
  { icon: Award, title: "ISO 27001", color: "gold" },
  { icon: CheckCircle2, title: "99.9% Uptime", color: "emerald" },
];

export function Stats() {
  return (
    <section className="py-20 sm:py-24 bg-slate-950 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-grid-slate-800/[0.1] bg-[size:40px_40px]" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold-500/30 to-transparent" />
      
      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-16">
          {stats.map((stat, index) => {
            const colorClasses = {
              emerald: {
                text: "text-emerald-400",
                glow: "group-hover:glow-emerald-soft",
                border: "group-hover:border-emerald-500/30",
                bg: "from-emerald-500/10 to-transparent",
              },
              gold: {
                text: "text-gold-400",
                glow: "group-hover:glow-gold-soft",
                border: "group-hover:border-gold-500/30",
                bg: "from-gold-500/10 to-transparent",
              },
            };
            const colors = colorClasses[stat.color as keyof typeof colorClasses];
            
            return (
              <div
                key={index}
                className={`group glass-card rounded-2xl text-center p-6 sm:p-8 transition-all duration-300 ${colors.glow} ${colors.border} shine-effect`}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${colors.bg} rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity`} />
                <div className={`relative text-3xl sm:text-4xl lg:text-5xl font-bold ${colors.text} mb-3`}>
                  <AnimatedCounter
                    value={stat.value}
                    suffix={stat.suffix}
                    prefix={stat.prefix}
                  />
                </div>
                <div className="relative text-sm sm:text-base text-white font-medium mb-2">{stat.label}</div>
                <div className="relative flex items-center justify-center gap-1.5">
                  <TrendingUp className="w-3 h-3 text-emerald-400" />
                  <span className="text-xs sm:text-sm font-medium text-emerald-400">
                    {stat.change}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Trust Badges */}
        <div className="pt-10 border-t border-slate-800/50">
          <p className="text-center text-sm text-slate-400 mb-8">
            Dôverujú nám stovky investorov
          </p>
          <div className="flex flex-wrap justify-center items-center gap-3 sm:gap-4">
            {trustBadges.map((badge, index) => {
              const Icon = badge.icon;
              const colorClasses = {
                emerald: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
                gold: "text-gold-400 bg-gold-500/10 border-gold-500/20",
                slate: "text-slate-400 bg-slate-800/50 border-slate-700",
              };
              const colors = colorClasses[badge.color as keyof typeof colorClasses];

              return (
                <div
                  key={index}
                  className="flex items-center gap-2 sm:gap-3 px-3 sm:px-5 py-2.5 sm:py-3 rounded-xl glass border border-slate-700/50 hover:border-slate-600 transition-all"
                >
                  <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg ${colors} border flex items-center justify-center`}>
                    <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <span className="text-xs sm:text-sm font-medium text-white">
                    {badge.title}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
