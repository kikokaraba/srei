"use client";

import { Home, Key } from "lucide-react";
import { useListingMode } from "@/lib/hooks/useListingMode";

interface ListingModeToggleProps {
  className?: string;
  compact?: boolean;
}

export function ListingModeToggle({ className = "", compact = false }: ListingModeToggleProps) {
  const { mode, setMode, isBuying, isRenting } = useListingMode();

  if (compact) {
    return (
      <div className={`inline-flex rounded-lg bg-zinc-900 border border-zinc-800 p-0.5 ${className}`}>
        <button
          onClick={() => setMode("PREDAJ")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
            isBuying
              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
              : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          <Home className="w-3.5 h-3.5" />
          Kupujem
        </button>
        <button
          onClick={() => setMode("PRENAJOM")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
            isRenting
              ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
              : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          <Key className="w-3.5 h-3.5" />
          Prenajímam
        </button>
      </div>
    );
  }

  return (
    <div className={`premium-card p-1 inline-flex gap-1 ${className}`}>
      <button
        onClick={() => setMode("PREDAJ")}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
          isBuying
            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-lg shadow-emerald-500/10"
            : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50"
        }`}
      >
        <Home className="w-4 h-4" />
        <span>Kupujem</span>
        {isBuying && (
          <span className="ml-1 px-1.5 py-0.5 bg-emerald-500/30 rounded text-[10px] font-bold">
            + YIELD
          </span>
        )}
      </button>
      <button
        onClick={() => setMode("PRENAJOM")}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
          isRenting
            ? "bg-blue-500/20 text-blue-400 border border-blue-500/30 shadow-lg shadow-blue-500/10"
            : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50"
        }`}
      >
        <Key className="w-4 h-4" />
        <span>Prenajímam</span>
        {isRenting && (
          <span className="ml-1 px-1.5 py-0.5 bg-blue-500/30 rounded text-[10px] font-bold">
            €/MES
          </span>
        )}
      </button>
    </div>
  );
}
