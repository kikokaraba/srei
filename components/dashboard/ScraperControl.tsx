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

interface ScrapeStats {
  portal: string;
  propertiesFound: number;
  newProperties: number;
  updatedProperties: number;
  errors: string[];
  duration: string;
}

interface ScrapeResult {
  success: boolean;
  summary: {
    totalFound: number;
    totalNew: number;
    totalUpdated: number;
    hotDealsFound: number;
    totalInDatabase: number;
    notificationsSent: number;
    duration: string;
  };
  details: ScrapeStats[];
}

export default function ScraperControl() {
  const [lastRun, setLastRun] = useState<Date | null>(null);

  // Run full scrape - all portals, all categories
  const runMutation = useMutation({
    mutationFn: async (): Promise<ScrapeResult> => {
      // Use AbortController for timeout (5 minutes max)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5 * 60 * 1000);
      
      try {
        const res = await fetch("/api/cron/scrape-all", {
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
          throw new Error("Scraping trvá príliš dlho (>5 min). Skontroluj logy na Verceli.");
        }
        throw error;
      }
    },
    onSuccess: () => {
      setLastRun(new Date());
    },
  });

  const portals = ["NEHNUTELNOSTI"];

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
              Manuálne spustenie scrapera pre všetky portály
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${runMutation.isPending ? "bg-amber-400 animate-pulse" : "bg-emerald-400"}`} />
          <span className="text-sm text-slate-400">
            {runMutation.isPending ? "Beží..." : "Pripravený"}
          </span>
        </div>
      </div>

      {/* Portals info */}
      <div className="mb-6 p-4 bg-slate-900/50 rounded-lg border border-slate-700/50">
        <p className="text-sm text-slate-400 mb-3">Bude scrapovať tieto portály:</p>
        <div className="flex flex-wrap gap-2">
          {portals.map((portal) => (
            <span 
              key={portal}
              className="px-3 py-1.5 text-sm bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-lg"
            >
              {portal}
            </span>
          ))}
        </div>
        <p className="text-xs text-slate-500 mt-3">
          Portál: Nehnutelnosti.sk | ~100 nehnuteľností za jedno spustenie
        </p>
      </div>

      {/* Run Button - ONE CLICK */}
      <button
        onClick={() => runMutation.mutate()}
        disabled={runMutation.isPending}
        className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 disabled:from-slate-600 disabled:to-slate-600 text-white font-bold text-lg rounded-xl transition-all disabled:cursor-not-allowed shadow-lg shadow-emerald-500/25"
      >
        {runMutation.isPending ? (
          <>
            <Loader2 className="w-6 h-6 animate-spin" />
            Scrapujem všetky portály... (2-5 minút)
          </>
        ) : (
          <>
            <Zap className="w-6 h-6" />
            Spustiť Scraping - Všetko
          </>
        )}
      </button>

      {/* Results */}
      {runMutation.data && (
        <div className={`mt-6 p-5 rounded-xl border ${
          runMutation.data.success 
            ? "bg-emerald-500/10 border-emerald-500/30" 
            : "bg-rose-500/10 border-rose-500/30"
        }`}>
          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            {runMutation.data.success ? (
              <CheckCircle className="w-6 h-6 text-emerald-400" />
            ) : (
              <XCircle className="w-6 h-6 text-rose-400" />
            )}
            <span className={`text-lg font-bold ${runMutation.data.success ? "text-emerald-300" : "text-rose-300"}`}>
              Scraping dokončený!
            </span>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-slate-800/50 rounded-lg p-3">
              <div className="text-2xl font-bold text-white">
                {runMutation.data.summary.totalFound.toLocaleString()}
              </div>
              <div className="text-xs text-slate-400">Nájdených inzerátov</div>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-3">
              <div className="text-2xl font-bold text-emerald-400">
                +{runMutation.data.summary.totalNew.toLocaleString()}
              </div>
              <div className="text-xs text-slate-400">Nových nehnuteľností</div>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-3">
              <div className="text-2xl font-bold text-blue-400">
                {runMutation.data.summary.totalUpdated.toLocaleString()}
              </div>
              <div className="text-xs text-slate-400">Aktualizovaných</div>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-3">
              <div className="text-2xl font-bold text-red-400">
                🔥 {runMutation.data.summary.hotDealsFound}
              </div>
              <div className="text-xs text-slate-400">Hot Deals</div>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-3">
              <div className="text-2xl font-bold text-slate-300">
                <Database className="w-5 h-5 inline mr-1" />
                {runMutation.data.summary.totalInDatabase.toLocaleString()}
              </div>
              <div className="text-xs text-slate-400">Celkom v databáze</div>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-3">
              <div className="text-2xl font-bold text-slate-300">
                <Clock className="w-5 h-5 inline mr-1" />
                {runMutation.data.summary.duration}
              </div>
              <div className="text-xs text-slate-400">Trvanie</div>
            </div>
          </div>

          {/* Per-portal breakdown */}
          <div className="border-t border-slate-700 pt-4">
            <p className="text-sm font-medium text-slate-300 mb-3">Rozdelenie podľa portálu:</p>
            <div className="space-y-2">
              {runMutation.data.details.map((detail) => (
                <div 
                  key={detail.portal}
                  className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-white">{detail.portal}</span>
                    {detail.errors.length > 0 && (
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-slate-400">
                      {detail.propertiesFound} nájdených
                    </span>
                    <span className="text-emerald-400 font-medium">
                      +{detail.newProperties} nových
                    </span>
                    <span className="text-slate-500">
                      {detail.duration}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Notifications */}
          {runMutation.data.summary.notificationsSent > 0 && (
            <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <p className="text-sm text-blue-300">
                📱 Odoslaných {runMutation.data.summary.notificationsSent} Telegram notifikácií
              </p>
            </div>
          )}
        </div>
      )}

      {/* Error display */}
      {runMutation.error && (
        <div className="mt-6 p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <XCircle className="w-5 h-5 text-rose-400" />
            <span className="font-semibold text-rose-300">Chyba pri scrapingu</span>
          </div>
          <p className="text-sm text-rose-400">
            {runMutation.error instanceof Error ? runMutation.error.message : "Neznáma chyba"}
          </p>
        </div>
      )}

      {/* Info footer */}
      <div className="mt-6 flex items-center justify-between text-xs text-slate-500">
        <span>
          Automatický scraping: 7:00, 15:00, 23:00 (CET)
        </span>
        {lastRun && (
          <span>
            Posledné spustenie: {lastRun.toLocaleTimeString("sk-SK")}
          </span>
        )}
      </div>
    </div>
  );
}
