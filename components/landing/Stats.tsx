"use client";

import { AnimatedCounter } from "./AnimatedCounter";
import { Shield, Lock, Award, CheckCircle2 } from "lucide-react";

const stats = [
  {
    value: "500",
    suffix: "+",
    label: "Aktívnych investorov",
    change: "+127 tento mesiac",
    trend: "up",
  },
  {
    value: "2500",
    suffix: "+",
    label: "Sledovaných nehnuteľností",
    change: "+12% rast",
    trend: "up",
  },
  {
    value: "5.2",
    suffix: "%",
    label: "Priemerný výnos",
    change: "+0.4% vs. trh",
    trend: "up",
  },
  {
    value: "1.2",
    suffix: "M+",
    prefix: "€",
    label: "Spravovaný kapitál",
    change: "+28% rast",
    trend: "up",
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
    <section className="py-20 bg-slate-900 border-y border-slate-800">
      <div className="container mx-auto px-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
          {stats.map((stat, index) => (
            <div
              key={index}
              className="text-center p-6 rounded-xl bg-slate-800/50 border border-slate-700/50 hover:border-emerald-500/30 transition-all duration-200"
            >
              <div className="text-3xl lg:text-4xl font-bold text-emerald-400 mb-2">
                <AnimatedCounter
                  value={stat.value}
                  suffix={stat.suffix}
                  prefix={stat.prefix}
                />
              </div>
              <div className="text-sm text-slate-300 mb-2">{stat.label}</div>
              <div
                className={`text-xs font-medium ${
                  stat.trend === "up"
                    ? "text-emerald-400"
                    : "text-slate-500"
                }`}
              >
                {stat.change}
              </div>
            </div>
          ))}
        </div>

        {/* Trust Badges */}
        <div className="pt-8 border-t border-slate-800">
          <p className="text-center text-sm text-slate-300 mb-6">
            Dôverujú nám stovky investorov
          </p>
          <div className="flex flex-wrap justify-center items-center gap-6">
            {trustBadges.map((badge, index) => {
              const Icon = badge.icon;
              const colorClasses = {
                emerald: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
                gold: "text-gold-400 bg-gold-500/10 border-gold-500/20",
                slate: "text-slate-400 bg-slate-800 border-slate-700",
              };
              const colors = colorClasses[badge.color as keyof typeof colorClasses];

              return (
                <div
                  key={index}
                  className="flex items-center gap-3 px-4 py-2 rounded-lg bg-slate-800/30 border border-slate-700/50"
                >
                  <div className={`w-8 h-8 rounded-lg ${colors} border flex items-center justify-center`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-medium text-slate-300">
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
