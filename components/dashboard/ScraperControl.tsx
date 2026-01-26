"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { 
  Play, 
  Loader2, 
  CheckCircle, 
  XCircle, 
  Globe,
  Database,
  Clock,
  Zap,
  AlertTriangle,
} from "lucide-react";

interface PortalResult {
  success: boolean;
  portal: string;
  found: number;
  new: number;
  updated: number;
  errors: number;
  totalInDatabase: number;
  duration: number;
  error?: string;
}

export default function ScraperControl() {
  const [lastRun, setLastRun] = useState<{ portal: string; time: Date } | null>(null);

  // Mutation pre Bazoš
  const bazosMutation = useMutation({
    mutationFn: async (): Promise<PortalResult> => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5 * 60 * 1000);
      
      try {
        const res = await fetch("/api/cron/scrape-bazos", {
          method: "GET",
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        
        if (!res.ok) {
          const errorText = await res.text().catch(() => res.statusText);
          throw new Error(`HTTP ${res.status}: ${errorText.substring(0, 200)}`);
        }
        return res.json();
      } catch (error) {
        clearTimeout(timeoutId);
        if (error instanceof Error && error.name === "AbortError") {
          throw new Error("Scraping trvá príliš dlho (>5 min)");
        }
        throw error;
      }
    },
    onSuccess: () => {
      setLastRun({ portal: "Bazoš", time: new Date() });
    },
  });

  // Mutation pre Nehnutelnosti.sk
  const nehnutelnostiMutation = useMutation({
    mutationFn: async (): Promise<PortalResult> => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5 * 60 * 1000);
      
      try {
        const res = await fetch("/api/cron/scrape-nehnutelnosti", {
          method: "GET",
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        
        if (!res.ok) {
          const errorText = await res.text().catch(() => res.statusText);
          throw new Error(`HTTP ${res.status}: ${errorText.substring(0, 200)}`);
        }
        return res.json();
      } catch (error) {
        clearTimeout(timeoutId);
        if (error instanceof Error && error.name === "AbortError") {
          throw new Error("Scraping trvá príliš dlho (>5 min)");
        }
        throw error;
      }
    },
    onSuccess: () => {
      setLastRun({ portal: "Nehnutelnosti.sk", time: new Date() });
    },
  });

  // Spustí oba scrapers s 5s pauzou medzi
  const runBoth = async () => {
    await bazosMutation.mutateAsync();
    await new Promise(r => setTimeout(r, 5000));
    await nehnutelnostiMutation.mutateAsync();
  };

  const bothMutation = useMutation({
    mutationFn: runBoth,
    onSuccess: () => {
      setLastRun({ portal: "Všetko", time: new Date() });
    },
  });

  const isAnyRunning = bazosMutation.isPending || nehnutelnostiMutation.isPending || bothMutation.isPending;

  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 flex items-center justify-center">
            <Globe className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Scraper Control</h2>
            <p className="text-sm text-slate-400">
              Manuálne spustenie scrapera
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${isAnyRunning ? "bg-amber-400 animate-pulse" : "bg-emerald-400"}`} />
          <span className="text-sm text-slate-400">
            {isAnyRunning ? "Beží..." : "Pripravený"}
          </span>
        </div>
      </div>

      {/* Portal Buttons - 2 samostatné tlačidlá */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* Bazoš Button */}
        <button
          onClick={() => bazosMutation.mutate()}
          disabled={isAnyRunning}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-yellow-500/80 to-amber-500/80 hover:from-yellow-600 hover:to-amber-600 disabled:from-slate-600 disabled:to-slate-600 text-white font-bold rounded-xl transition-all disabled:cursor-not-allowed"
        >
          {bazosMutation.isPending ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Scrapujem Bazoš...
            </>
          ) : (
            <>
              <Play className="w-5 h-5" />
              Spustiť Bazoš
            </>
          )}
        </button>

        {/* Nehnutelnosti.sk Button */}
        <button
          onClick={() => nehnutelnostiMutation.mutate()}
          disabled={isAnyRunning}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-500/80 to-cyan-500/80 hover:from-blue-600 hover:to-cyan-600 disabled:from-slate-600 disabled:to-slate-600 text-white font-bold rounded-xl transition-all disabled:cursor-not-allowed"
        >
          {nehnutelnostiMutation.isPending ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Scrapujem Nehnutelnosti...
            </>
          ) : (
            <>
              <Play className="w-5 h-5" />
              Spustiť Nehnutelnosti.sk
            </>
          )}
        </button>
      </div>

      {/* Run Both Button */}
      <button
        onClick={() => bothMutation.mutate()}
        disabled={isAnyRunning}
        className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 disabled:from-slate-600 disabled:to-slate-600 text-white font-bold text-lg rounded-xl transition-all disabled:cursor-not-allowed shadow-lg shadow-emerald-500/25"
      >
        {bothMutation.isPending ? (
          <>
            <Loader2 className="w-6 h-6 animate-spin" />
            Scrapujem všetko... (3-5 minút)
          </>
        ) : (
          <>
            <Zap className="w-6 h-6" />
            Spustiť Obidva Portály
          </>
        )}
      </button>

      {/* Info */}
      <p className="text-xs text-slate-500 mt-3 text-center">
        Bazoš: Byty, Domy, Pozemky | Nehnutelnosti.sk: Byty, Domy
      </p>

      {/* Bazoš Result */}
      {bazosMutation.data && (
        <ResultCard result={bazosMutation.data} color="yellow" />
      )}

      {/* Nehnutelnosti Result */}
      {nehnutelnostiMutation.data && (
        <ResultCard result={nehnutelnostiMutation.data} color="blue" />
      )}

      {/* Errors */}
      {bazosMutation.error && (
        <ErrorCard error={bazosMutation.error} portal="Bazoš" />
      )}
      {nehnutelnostiMutation.error && (
        <ErrorCard error={nehnutelnostiMutation.error} portal="Nehnutelnosti.sk" />
      )}

      {/* Info footer */}
      <div className="mt-6 flex items-center justify-between text-xs text-slate-500">
        <span>
          Automatický scraping: 6:00, 10:00, 14:00, 18:00, 22:00
        </span>
        {lastRun && (
          <span>
            Posledné: {lastRun.portal} o {lastRun.time.toLocaleTimeString("sk-SK")}
          </span>
        )}
      </div>
    </div>
  );
}

function ResultCard({ result, color }: { result: PortalResult; color: "yellow" | "blue" }) {
  const colorClass = color === "yellow" 
    ? "bg-amber-500/10 border-amber-500/30" 
    : "bg-blue-500/10 border-blue-500/30";
  const textColor = color === "yellow" ? "text-amber-300" : "text-blue-300";
  
  return (
    <div className={`mt-4 p-4 rounded-xl border ${colorClass}`}>
      <div className="flex items-center gap-2 mb-3">
        {result.success ? (
          <CheckCircle className={`w-5 h-5 ${textColor}`} />
        ) : (
          <AlertTriangle className="w-5 h-5 text-amber-400" />
        )}
        <span className={`font-bold ${textColor}`}>
          {result.portal}
        </span>
        <span className="text-slate-400 text-sm">
          ({Math.round(result.duration / 1000)}s)
        </span>
      </div>

      <div className="grid grid-cols-4 gap-3 text-center">
        <div>
          <div className="text-xl font-bold text-white">{result.found}</div>
          <div className="text-xs text-slate-400">Nájdených</div>
        </div>
        <div>
          <div className="text-xl font-bold text-emerald-400">+{result.new}</div>
          <div className="text-xs text-slate-400">Nových</div>
        </div>
        <div>
          <div className="text-xl font-bold text-blue-400">{result.updated}</div>
          <div className="text-xs text-slate-400">Aktualizovaných</div>
        </div>
        <div>
          <div className="text-xl font-bold text-slate-300 flex items-center justify-center gap-1">
            <Database className="w-4 h-4" />
            {result.totalInDatabase}
          </div>
          <div className="text-xs text-slate-400">V databáze</div>
        </div>
      </div>
    </div>
  );
}

function ErrorCard({ error, portal }: { error: Error | unknown; portal: string }) {
  return (
    <div className="mt-4 p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl">
      <div className="flex items-center gap-2 mb-2">
        <XCircle className="w-5 h-5 text-rose-400" />
        <span className="font-semibold text-rose-300">Chyba: {portal}</span>
      </div>
      <p className="text-sm text-rose-400">
        {error instanceof Error ? error.message : "Neznáma chyba"}
      </p>
    </div>
  );
}
