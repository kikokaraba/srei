"use client";

import { Shield, Lock, Award, CheckCircle2 } from "lucide-react";

const badges = [
  {
    icon: Shield,
    title: "GDPR Compliant",
    description: "100% súlad s európskymi normami",
    color: "emerald",
  },
  {
    icon: Lock,
    title: "Bank-Level Security",
    description: "256-bit SSL šifrovanie",
    color: "slate",
  },
  {
    icon: Award,
    title: "ISO 27001 Certified",
    description: "Medzinárodný štandard bezpečnosti",
    color: "gold",
  },
  {
    icon: CheckCircle2,
    title: "99.9% Uptime",
    description: "SLA garantované pre Enterprise",
    color: "emerald",
  },
];

export function TrustBadges() {
  return (
    <section className="py-16 bg-slate-900 border-y border-slate-800">
      <div className="container mx-auto px-6">
        <div className="text-center mb-12">
          <p className="text-sm text-slate-400 mb-4">
            Dôverujú nám stovky investorov
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-5xl mx-auto">
          {badges.map((badge, index) => {
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
                className="flex flex-col items-center text-center p-6 rounded-xl bg-slate-800/30 border border-slate-700/50 hover:border-emerald-500/30 transition-all duration-200"
              >
                <div className={`w-12 h-12 rounded-lg ${colors} border flex items-center justify-center mb-3`}>
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-semibold text-slate-100 mb-1">
                  {badge.title}
                </h3>
                <p className="text-xs text-slate-400">
                  {badge.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
