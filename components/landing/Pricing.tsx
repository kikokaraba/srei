"use client";

import Link from "next/link";
import { Check, Zap, Crown, Building2, ArrowRight, Sparkles, TrendingUp } from "lucide-react";

const plans = [
  {
    name: "Free",
    price: "0",
    period: "navždy",
    description: "Perfektné pre začínajúcich investorov",
    icon: Zap,
    color: "slate",
    features: [
      "10 nehnuteľností/mesiac",
      "Základné analytics",
      "Market overview",
      "Email podpora",
      "Základné filtre",
    ],
    cta: "Začať zdarma",
    ctaLink: "/auth/signin",
    popular: false,
  },
  {
    name: "Premium",
    price: "29",
    period: "mesiac",
    description: "Pre serióznych investorov, ktorí chcú maximálny výnos",
    icon: Crown,
    color: "emerald",
    features: [
      "Neobmedzené nehnuteľnosti",
      "Pokročilé analytics & AI predikcie",
      "Index skrytého potenciálu",
      "Liquidity tracker",
      "Scenario simulator",
      "Urban development tracker",
      "Daňový asistent",
      "Priority email podpora",
      "API prístup",
      "Export dát (PDF, Excel)",
    ],
    cta: "Začať 14-dňovú skúšobnú verziu",
    ctaLink: "/auth/signin?plan=premium",
    popular: true,
    savings: "Ušetrite €348 ročne",
  },
  {
    name: "Enterprise",
    price: "99",
    period: "mesiac",
    description: "Pre realitné kancelárie a investičné fondy",
    icon: Building2,
    color: "gold",
    features: [
      "Všetko z Premium",
      "White-label riešenie",
      "Custom integrácie",
      "Dedicated account manager",
      "SLA garantie (99.9% uptime)",
      "Advanced API (vyššie limity)",
      "Team workspaces",
      "Custom reporty",
      "Onboarding & training",
      "24/7 telefonická podpora",
    ],
    cta: "Kontaktovať predaj",
    ctaLink: "/auth/signin?plan=enterprise",
    popular: false,
    custom: true,
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="py-24 bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-grid-slate-800/[0.1] bg-[size:40px_40px]" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-emerald-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-gold-500/5 rounded-full blur-3xl" />
      
      <div className="container mx-auto px-6 relative z-10">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4" />
            <span>Transparentné ceny, žiadne skryté poplatky</span>
          </div>
          
          <h2 className="text-4xl lg:text-6xl font-bold text-zinc-100 mb-6">
            Vyberte si{" "}
            <span className="text-emerald-400">
              svoj plán
            </span>
          </h2>
          
          <p className="text-xl text-zinc-300 max-w-2xl mx-auto mb-4">
            Začnite zdarma a upgradeujte, keď budete pripravení na viac
          </p>
          <p className="text-sm text-zinc-400">
            Všetky plány zahŕňajú 14-dňovú bezplatnú skúšobnú verziu • Zrušiteľné kedykoľvek
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 max-w-7xl mx-auto">
          {plans.map((plan) => {
            const Icon = plan.icon;
            const colorClasses = {
              slate: {
                card: "glass-card",
                border: "border-zinc-700/50 hover:border-zinc-600",
                icon: "text-zinc-400",
                iconBg: "bg-zinc-800/80",
                button: "bg-zinc-700 hover:bg-zinc-600 text-white",
                glow: "",
                priceColor: "text-white",
              },
              emerald: {
                card: "glass-card",
                border: "border-emerald-500/30 hover:border-emerald-500/50",
                icon: "text-emerald-400",
                iconBg: "bg-emerald-500/10",
                button: "bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white glow-emerald",
                glow: "glow-emerald-soft",
                priceColor: "text-emerald-400",
              },
              gold: {
                card: "glass-card",
                border: "border-gold-500/30 hover:border-gold-500/50",
                icon: "text-gold-400",
                iconBg: "bg-gold-500/10",
                button: "bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-400 hover:to-gold-500 text-zinc-900 font-bold",
                glow: "hover:glow-gold-soft",
                priceColor: "text-gold-400",
              },
            };

            const colors = colorClasses[plan.color as keyof typeof colorClasses];

            return (
              <div
                key={plan.name}
                className={`relative ${colors.card} rounded-2xl border ${colors.border} p-6 lg:p-8 transition-all duration-300 hover:scale-[1.02] ${plan.popular ? colors.glow : ""} shine-effect`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="px-5 py-1.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-xs font-bold rounded-full  flex items-center gap-2">
                      <Sparkles className="w-3 h-3" />
                      NAJOBĽÚBENEJŠIE
                    </span>
                  </div>
                )}

                <div className="mb-6">
                  <div className={`w-14 h-14 rounded-xl ${colors.iconBg} ${colors.icon} border border-current/20 flex items-center justify-center mb-4`}>
                    <Icon className="w-7 h-7" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">{plan.name}</h3>
                  <p className="text-zinc-400 text-sm mb-4">{plan.description}</p>
                  
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className={`text-5xl font-bold ${colors.priceColor}`}>
                      €{plan.price}
                    </span>
                    {plan.price !== "0" && (
                      <span className="text-zinc-500 text-lg">/{plan.period}</span>
                    )}
                  </div>
                  
                  {plan.savings && (
                    <p className="text-sm text-emerald-400 font-medium mb-4 flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      {plan.savings}
                    </p>
                  )}
                </div>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Check className="w-3 h-3 text-emerald-400" />
                      </div>
                      <span className="text-zinc-300 text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href={plan.ctaLink}
                  className={`block w-full text-center px-6 py-4 rounded-xl font-semibold transition-all duration-300 ${colors.button}  hover: hover:scale-[1.02]`}
                >
                  {plan.cta}
                </Link>

                {plan.custom && (
                  <p className="text-xs text-zinc-500 text-center mt-4">
                    Alebo <Link href="/contact" className="text-emerald-400 hover:text-emerald-300">kontaktujte nás</Link> pre custom riešenie
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {/* FAQ Section */}
        <div className="mt-24 max-w-3xl mx-auto">
          <h3 className="text-lg font-semibold text-zinc-100 mb-8 text-center">
            Často kladené otázky
          </h3>
          <div className="space-y-4">
            <details className="group bg-zinc-800/50 rounded-lg border border-zinc-700 p-6">
              <summary className="cursor-pointer text-zinc-100 font-semibold flex items-center justify-between">
                <span>Môžem zrušiť kedykoľvek?</span>
                <span className="text-emerald-400 group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <p className="text-zinc-300 mt-4">
                Áno, môžete zrušiť svoj plán kedykoľvek bez akýchkoľvek poplatkov. Váš prístup zostane aktívny do konca fakturačného obdobia.
              </p>
            </details>
            
            <details className="group bg-zinc-800/50 rounded-lg border border-zinc-700 p-6">
              <summary className="cursor-pointer text-zinc-100 font-semibold flex items-center justify-between">
                <span>Čo zahŕňa 14-dňová skúšobná verzia?</span>
                <span className="text-emerald-400 group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <p className="text-zinc-300 mt-4">
                Skúšobná verzia zahŕňa plný prístup ku všetkým funkciám vybraného plánu. Žiadna kreditná karta sa nevyžaduje. Môžete testovať všetko zdarma 14 dní.
              </p>
            </details>
            
            <details className="group bg-zinc-800/50 rounded-lg border border-zinc-700 p-6">
              <summary className="cursor-pointer text-zinc-100 font-semibold flex items-center justify-between">
                <span>Môžem upgradeovať alebo downgradeovať plán?</span>
                <span className="text-emerald-400 group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <p className="text-zinc-300 mt-4">
                Áno, môžete zmeniť plán kedykoľvek. Pri upgrade sa vám príde prorated kredit, pri downgrade sa zmena prejaví od ďalšieho fakturačného obdobia.
              </p>
            </details>
            
            <details className="group bg-zinc-800/50 rounded-lg border border-zinc-700 p-6">
              <summary className="cursor-pointer text-zinc-100 font-semibold flex items-center justify-between">
                <span>Aké platobné metódy akceptujete?</span>
                <span className="text-emerald-400 group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <p className="text-zinc-300 mt-4">
                Akceptujeme kreditné karty (Visa, Mastercard, Amex), bankové prevody a pre Enterprise zákazníkov aj faktúry.
              </p>
            </details>
          </div>
        </div>
      </div>
    </section>
  );
}
