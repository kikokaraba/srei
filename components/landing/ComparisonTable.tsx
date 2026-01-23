"use client";

import { Check, X } from "lucide-react";

const features = [
  {
    name: "Real-time analýzy",
    sria: true,
    competitor1: true,
    competitor2: false,
  },
  {
    name: "AI predikcie výnosov",
    sria: true,
    competitor1: false,
    competitor2: false,
  },
  {
    name: "Index skrytého potenciálu",
    sria: true,
    competitor1: false,
    competitor2: false,
  },
  {
    name: "Liquidity tracker",
    sria: true,
    competitor1: false,
    competitor2: false,
  },
  {
    name: "Scenario simulator",
    sria: true,
    competitor1: false,
    competitor2: true,
  },
  {
    name: "Urban development tracker",
    sria: true,
    competitor1: false,
    competitor2: false,
  },
  {
    name: "Daňový asistent (SK)",
    sria: true,
    competitor1: false,
    competitor2: false,
  },
  {
    name: "PostGIS geografické analýzy",
    sria: true,
    competitor1: false,
    competitor2: false,
  },
  {
    name: "API prístup",
    sria: true,
    competitor1: true,
    competitor2: true,
  },
  {
    name: "Export dát (PDF, Excel)",
    sria: true,
    competitor1: true,
    competitor2: true,
  },
];

export function ComparisonTable() {
  return (
    <section className="py-24 bg-slate-900">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl lg:text-5xl font-bold text-slate-100 mb-4">
            Porovnajte{" "}
            <span className="text-emerald-400">SRIA s konkurenciou</span>
          </h2>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            Zistite, prečo si investori vyberajú SRIA namiesto iných platforiem
          </p>
        </div>

        <div className="max-w-5xl mx-auto overflow-x-auto">
          <div className="bg-slate-800/50 rounded-2xl border border-slate-700 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left p-6 text-slate-300 font-semibold">
                    Funkcia
                  </th>
                  <th className="text-center p-6">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                      <span className="text-emerald-400 font-bold">SRIA</span>
                    </div>
                  </th>
                  <th className="text-center p-6 text-slate-400 font-medium">
                    Konkurent 1
                  </th>
                  <th className="text-center p-6 text-slate-400 font-medium">
                    Konkurent 2
                  </th>
                </tr>
              </thead>
              <tbody>
                {features.map((feature, index) => (
                  <tr
                    key={index}
                    className="border-b border-slate-700/50 hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="p-6 text-slate-300 font-medium">
                      {feature.name}
                    </td>
                    <td className="p-6 text-center">
                      {feature.sria ? (
                        <div className="flex justify-center">
                          <Check className="w-6 h-6 text-emerald-400" />
                        </div>
                      ) : (
                        <div className="flex justify-center">
                          <X className="w-6 h-6 text-slate-600" />
                        </div>
                      )}
                    </td>
                    <td className="p-6 text-center">
                      {feature.competitor1 ? (
                        <div className="flex justify-center">
                          <Check className="w-6 h-6 text-slate-500" />
                        </div>
                      ) : (
                        <div className="flex justify-center">
                          <X className="w-6 h-6 text-slate-600" />
                        </div>
                      )}
                    </td>
                    <td className="p-6 text-center">
                      {feature.competitor2 ? (
                        <div className="flex justify-center">
                          <Check className="w-6 h-6 text-slate-500" />
                        </div>
                      ) : (
                        <div className="flex justify-center">
                          <X className="w-6 h-6 text-slate-600" />
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-8 text-center">
            <p className="text-sm text-slate-400 mb-4">
              * Porovnanie založené na verejne dostupných informáciách k januáru 2026
            </p>
            <div className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
              <span className="text-emerald-400 font-semibold">
                SRIA je jediná platforma s kompletnou sadou AI-powered nástrojov pre slovenský trh
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
