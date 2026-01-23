"use client";

import { AnimatedCounter } from "./AnimatedCounter";

export function Stats() {
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

  return (
    <section className="py-16 bg-slate-900 border-y border-slate-800">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <div
              key={index}
              className="text-center p-6 rounded-lg bg-slate-800/50 border border-slate-700/50 hover:border-emerald-500/30 transition-all duration-200"
            >
              <div className="text-3xl lg:text-4xl font-bold text-emerald-400 mb-2">
                <AnimatedCounter
                  value={stat.value}
                  suffix={stat.suffix}
                  prefix={stat.prefix}
                />
              </div>
              <div className="text-sm text-slate-400 mb-2">{stat.label}</div>
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
      </div>
    </section>
  );
}
