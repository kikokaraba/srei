"use client";

export function Stats() {
  const stats = [
    {
      value: "2,500+",
      label: "Aktívnych nehnuteľností",
      change: "+12%",
      trend: "up",
    },
    {
      value: "8",
      label: "Slovenských miest",
      change: "Kompletný prehľad",
      trend: "neutral",
    },
    {
      value: "5.2%",
      label: "Priemerný výnos",
      change: "+0.4%",
      trend: "up",
    },
    {
      value: "€1.2M",
      label: "Spravovaný kapitál",
      change: "+28%",
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
              className="text-center p-6 rounded-lg bg-slate-800/50 border border-slate-700/50"
            >
              <div className="text-3xl lg:text-4xl font-bold text-emerald-400 mb-2">
                {stat.value}
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
