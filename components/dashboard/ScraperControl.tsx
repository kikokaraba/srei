"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Play,
  Loader2,
  CheckCircle,
  XCircle,
  Globe,
  Zap,
  AlertTriangle,
} from "lucide-react";

interface ScrapeSlovakiaResult {
  success: boolean;
  message?: string;
  portal?: string;
  targetsCount?: number;
  runs?: Array<{ portal: string; runId: string; urlCount: number }>;
  errors?: string[];
  error?: string;
}

export default function ScraperControl() {
  const [lastRun, setLastRun] = useState<{ portal: string; time: Date } | null>(null);

  const scrapeMutation = useMutation({
    mutationFn: async (portal: "bazos" | "all"): Promise<ScrapeSlovakiaResult> => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60 * 1000);

      try {
        const res = await fetch(
          `/api/cron/scrape-slovakia?portal=${portal}&limit=20`,
          { method: "POST", signal: controller.signal }
        );
        clearTimeout(timeoutId);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.error || `HTTP ${res.status}`);
        }
        return data;
      } catch (error) {
        clearTimeout(timeoutId);
        if (error instanceof Error && error.name === "AbortError") {
          throw new Error("Požiadavka trvala príliš dlho (>1 min)");
        }
        throw error;
      }
    },
    onSuccess: (_, portal) => {
      setLastRun({ portal: portal === "all" ? "Bazoš (všetko)" : "Bazoš", time: new Date() });
    },
  });

  const isRunning = scrapeMutation.isPending;

  return (
    <div className="bg-zinc-800/50 rounded-xl border border-zinc-700 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
            <Globe className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">Scraper Control</h2>
            <p className="text-sm text-zinc-400">Spustenie Apify scrapingu (Bazoš)</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${isRunning ? "bg-amber-400 animate-pulse" : "bg-emerald-400"}`}
          />
          <span className="text-sm text-zinc-400">{isRunning ? "Beží..." : "Pripravený"}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <button
          onClick={() => scrapeMutation.mutate("bazos")}
          disabled={isRunning}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-amber-500 hover:bg-amber-600 disabled:bg-zinc-600 text-white font-bold rounded-xl transition-all disabled:cursor-not-allowed"
        >
          {scrapeMutation.isPending ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Spúšťam Bazoš...
            </>
          ) : (
            <>
              <Play className="w-5 h-5" />
              Spustiť Bazoš
            </>
          )}
        </button>
        <button
          onClick={() => scrapeMutation.mutate("all")}
          disabled={isRunning}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-zinc-600 text-white font-bold rounded-xl transition-all disabled:cursor-not-allowed"
        >
          {scrapeMutation.isPending ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Spúšťam...
            </>
          ) : (
            <>
              <Zap className="w-5 h-5" />
              Spustiť (všetky targety)
            </>
          )}
        </button>
      </div>

      <p className="text-xs text-zinc-500 mt-3 text-center">
        Bazoš: byty predaj a prenájom, celé Slovensko + kraje. Výsledky prídu cez webhook.
      </p>

      {scrapeMutation.data && (
        <div className="mt-4 p-4 rounded-xl border bg-emerald-500/10 border-emerald-500/30">
          <div className="flex items-center gap-2 mb-2">
            {scrapeMutation.data.success ? (
              <CheckCircle className="w-5 h-5 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-400" />
            )}
            <span className="font-bold text-emerald-300">
              {scrapeMutation.data.success ? "Spustené" : "Chyba"}
            </span>
          </div>
          <p className="text-sm text-zinc-300">{scrapeMutation.data.message}</p>
          {scrapeMutation.data.runs?.length ? (
            <ul className="mt-2 text-xs text-zinc-400">
              {scrapeMutation.data.runs.map((r) => (
                <li key={r.runId}>
                  {r.portal}: {r.urlCount} URL, runId: {r.runId.slice(0, 8)}…
                </li>
              ))}
            </ul>
          ) : null}
          {scrapeMutation.data.errors?.length ? (
            <p className="mt-2 text-xs text-rose-400">{scrapeMutation.data.errors.join("; ")}</p>
          ) : null}
        </div>
      )}

      {scrapeMutation.error && (
        <div className="mt-4 p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <XCircle className="w-5 h-5 text-rose-400" />
            <span className="font-semibold text-rose-300">Chyba</span>
          </div>
          <p className="text-sm text-rose-400">
            {scrapeMutation.error instanceof Error
              ? scrapeMutation.error.message
              : "Neznáma chyba"}
          </p>
        </div>
      )}

      <div className="mt-6 flex items-center justify-between text-xs text-zinc-500">
        <span>Automatický scraping: 6:00, 10:00, 14:00, 18:00, 22:00</span>
        {lastRun && (
          <span>
            Posledné: {lastRun.portal} o {lastRun.time.toLocaleTimeString("sk-SK")}
          </span>
        )}
      </div>
    </div>
  );
}
