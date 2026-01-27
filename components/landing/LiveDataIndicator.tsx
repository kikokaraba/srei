"use client";

import { useState, useEffect } from "react";
import { Radio } from "lucide-react";

const defaultUpdates = [
  "Monitorujeme nehnuteľnosti z Nehnutelnosti.sk",
  "Automatická aktualizácia každých 10 minút",
  "Sledujeme byty a domy z celého Slovenska",
  "Výpočet investičných metrík v reálnom čase",
];

export function LiveDataIndicator() {
  const [currentUpdate, setCurrentUpdate] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [updates, setUpdates] = useState(defaultUpdates);

  useEffect(() => {
    // Fetch real stats
    fetch("/api/public/stats")
      .then(res => res.json())
      .then(data => {
        if (data.success && data.stats.totalProperties > 0) {
          setUpdates([
            `${data.stats.totalProperties.toLocaleString()} nehnuteľností v databáze`,
            data.stats.hotDeals > 0 ? `${data.stats.hotDeals} výhodných ponúk detekovaných` : "Vyhľadávame výhodné ponuky",
            `Priemerný výnos: ${data.stats.avgYield}% ročne`,
            "Aktualizácia každých 10 minút",
          ]);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsVisible(false);
      setTimeout(() => {
        setCurrentUpdate((prev) => (prev + 1) % updates.length);
        setIsVisible(true);
      }, 300);
    }, 5000);

    return () => clearInterval(interval);
  }, [updates.length]);

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 hidden md:block">
      <div className="bg-zinc-900/95 backdrop-blur-lg border border-emerald-500/20 rounded-full px-6 py-3  flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Radio className="w-4 h-4 text-emerald-400" />
            <span className="absolute top-0 left-0 w-2 h-2 bg-emerald-400 rounded-full animate-ping" />
          </div>
          <span className="text-xs text-zinc-400 font-medium">LIVE</span>
        </div>
        <div className="h-4 w-px bg-zinc-700" />
        <p
          className={`text-sm text-zinc-200 transition-opacity duration-300 ${
            isVisible ? "opacity-100" : "opacity-0"
          }`}
        >
          {updates[currentUpdate]}
        </p>
      </div>
    </div>
  );
}
