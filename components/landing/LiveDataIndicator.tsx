"use client";

import { useState, useEffect } from "react";
import { Radio } from "lucide-react";

const liveUpdates = [
  "Nový byt v Bratislave: €2,450/m² (+3.2%)",
  "Košice: Priemerný výnos stúpol na 5.8%",
  "Nitra: 12 nových príležitostí detekovaných",
  "Trnava: Index potenciálu +15% tento týždeň",
];

export function LiveDataIndicator() {
  const [currentUpdate, setCurrentUpdate] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsVisible(false);
      setTimeout(() => {
        setCurrentUpdate((prev) => (prev + 1) % liveUpdates.length);
        setIsVisible(true);
      }, 300);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 hidden md:block">
      <div className="bg-slate-900/95 backdrop-blur-lg border border-emerald-500/20 rounded-full px-6 py-3 shadow-2xl flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Radio className="w-4 h-4 text-emerald-400" />
            <span className="absolute top-0 left-0 w-2 h-2 bg-emerald-400 rounded-full animate-ping" />
          </div>
          <span className="text-xs text-slate-400 font-medium">LIVE</span>
        </div>
        <div className="h-4 w-px bg-slate-700" />
        <p
          className={`text-sm text-slate-200 transition-opacity duration-300 ${
            isVisible ? "opacity-100" : "opacity-0"
          }`}
        >
          {liveUpdates[currentUpdate]}
        </p>
      </div>
    </div>
  );
}
