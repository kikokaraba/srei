"use client";

import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { 
  Database, 
  RefreshCw, 
  Clock,
  Zap,
  CheckCircle2,
  AlertCircle,
  Play,
  Loader2,
  Calendar,
  TrendingUp,
  Home
} from "lucide-react";

interface ScrapeStatus {
  success: boolean;
  progress: {
    category: string;
    currentPage: number;
    totalPages: number;
    percentComplete: number;
    totalScraped: number;
    totalNew: number;
    totalUpdated: number;
    totalErrors: number;
    isComplete: boolean;
    cycleCount: number;
    lastRunAt: string;
    startedAt: string;
    completedAt: string | null;
  } | null;
  database: {
    totalProperties: number;
    activeProperties: number;
    newToday: number;
  };
  eta: {
    runsRemaining: number;
    minutesRemaining: number;
    hoursRemaining: string;
  } | null;
  recentRuns: Array<{
    status: string;
    recordsCount: number;
    duration_ms: number;
    fetchedAt: string;
  }>;
}

export default function DataManagementPage() {
  const [status, setStatus] = useState<ScrapeStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // Fetch status
  const fetchStatus = async () => {
    try {
      const res = await fetch("/api/scrape-status");
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch (error) {
      console.error("Failed to fetch status:", error);
    } finally {
      setLoading(false);
      setLastRefresh(new Date());
    }
  };

  useEffect(() => {
    fetchStatus();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  // Manual scrape trigger
  const scrapeMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/cron/scrape-paginated", { method: "POST" });
      return res.json();
    },
    onSuccess: () => {
      fetchStatus();
    },
  });

  // Calculate next run time (every 10 minutes from last run)
  const getNextRunTime = () => {
    if (!status?.progress?.lastRunAt) return "—";
    const lastRun = new Date(status.progress.lastRunAt);
    const nextRun = new Date(lastRun.getTime() + 10 * 60 * 1000);
    
    // If next run is in the past, calculate from now
    if (nextRun < new Date()) {
      const now = new Date();
      const minutes = now.getMinutes();
      const nextMinute = Math.ceil(minutes / 10) * 10;
      const next = new Date(now);
      next.setMinutes(nextMinute, 0, 0);
      if (next <= now) next.setMinutes(next.getMinutes() + 10);
      return next.toLocaleTimeString("sk-SK", { hour: "2-digit", minute: "2-digit" });
    }
    
    return nextRun.toLocaleTimeString("sk-SK", { hour: "2-digit", minute: "2-digit" });
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return "Práve teraz";
    if (diffMins < 60) return `Pred ${diffMins} min`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `Pred ${diffHours} hod`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `Pred ${diffDays} dňami`;
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      "byty-predaj": "Byty na predaj",
      "domy-predaj": "Domy na predaj", 
      "byty-prenajom": "Byty na prenájom",
    };
    return labels[category] || category;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Scraper & Dáta</h1>
          <p className="text-slate-400">
            Automatický scraping beží každých 10 minút
          </p>
        </div>
        <button
          onClick={() => fetchStatus()}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Obnoviť
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
        </div>
      ) : (
        <>
          {/* Main Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Last Run */}
            <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-emerald-400" />
                </div>
                <span className="text-slate-400 text-sm">Posledný scraping</span>
              </div>
              <p className="text-2xl font-bold text-white">
                {status?.progress?.lastRunAt 
                  ? formatTimeAgo(status.progress.lastRunAt)
                  : "—"}
              </p>
              <p className="text-sm text-slate-500 mt-1">
                {status?.progress?.lastRunAt 
                  ? new Date(status.progress.lastRunAt).toLocaleString("sk-SK")
                  : ""}
              </p>
            </div>

            {/* Next Run */}
            <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-blue-400" />
                </div>
                <span className="text-slate-400 text-sm">Ďalší scraping</span>
              </div>
              <p className="text-2xl font-bold text-white">{getNextRunTime()}</p>
              <p className="text-sm text-slate-500 mt-1">Automaticky každých 10 min</p>
            </div>

            {/* Total Properties */}
            <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-violet-500/20 flex items-center justify-center">
                  <Home className="w-5 h-5 text-violet-400" />
                </div>
                <span className="text-slate-400 text-sm">Nehnuteľností v DB</span>
              </div>
              <p className="text-2xl font-bold text-white">
                {status?.database?.totalProperties?.toLocaleString() || "0"}
              </p>
              <p className="text-sm text-emerald-400 mt-1">
                +{status?.database?.newToday || 0} dnes
              </p>
            </div>

            {/* Progress */}
            <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-amber-400" />
                </div>
                <span className="text-slate-400 text-sm">Progres cyklu</span>
              </div>
              <p className="text-2xl font-bold text-white">
                {status?.progress?.percentComplete || 0}%
              </p>
              <p className="text-sm text-slate-500 mt-1">
                Cyklus #{status?.progress?.cycleCount || 0}
              </p>
            </div>
          </div>

          {/* Current Status */}
          <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 flex items-center justify-center">
                  <Database className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Stav Scrapera</h2>
                  <p className="text-sm text-slate-400">
                    {status?.progress 
                      ? getCategoryLabel(status.progress.category)
                      : "Čaká na spustenie"}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-sm text-slate-400">Aktívny</span>
                </div>
                
                <button
                  onClick={() => scrapeMutation.mutate()}
                  disabled={scrapeMutation.isPending}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-600 text-white rounded-lg transition-colors"
                >
                  {scrapeMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Beží...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      Spustiť teraz
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Progress Bar */}
            {status?.progress && (
              <div className="mb-6">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-slate-400">
                    Stránka {status.progress.currentPage} / {status.progress.totalPages}
                  </span>
                  <span className="text-slate-400">
                    {status.progress.percentComplete}%
                  </span>
                </div>
                <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500"
                    style={{ width: `${status.progress.percentComplete}%` }}
                  />
                </div>
              </div>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-900/50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-white">
                  {status?.progress?.totalScraped?.toLocaleString() || 0}
                </p>
                <p className="text-sm text-slate-400">Celkom nájdených</p>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-emerald-400">
                  +{status?.progress?.totalNew?.toLocaleString() || 0}
                </p>
                <p className="text-sm text-slate-400">Nových</p>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-blue-400">
                  {status?.progress?.totalUpdated?.toLocaleString() || 0}
                </p>
                <p className="text-sm text-slate-400">Aktualizovaných</p>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-red-400">
                  {status?.progress?.totalErrors || 0}
                </p>
                <p className="text-sm text-slate-400">Chýb</p>
              </div>
            </div>
          </div>

          {/* Recent Runs */}
          {status?.recentRuns && status.recentRuns.length > 0 && (
            <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
              <h3 className="text-lg font-bold text-white mb-4">Posledné behy</h3>
              <div className="space-y-3">
                {status.recentRuns.map((run, index) => (
                  <div 
                    key={index}
                    className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      {run.status === "success" ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-amber-400" />
                      )}
                      <div>
                        <p className="text-white font-medium">
                          {run.recordsCount} nehnuteľností
                        </p>
                        <p className="text-sm text-slate-400">
                          {new Date(run.fetchedAt).toLocaleString("sk-SK")}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-slate-300">
                        {Math.round(run.duration_ms / 1000)}s
                      </p>
                      <p className="text-xs text-slate-500">
                        {run.status}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Scrape Result */}
          {scrapeMutation.data && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-5 h-5 text-emerald-400" />
                <span className="font-bold text-emerald-300">Manuálny scraping dokončený</span>
              </div>
              <div className="grid grid-cols-4 gap-4 text-center">
                <div>
                  <p className="text-xl font-bold text-white">
                    {scrapeMutation.data.results?.propertiesFound || 0}
                  </p>
                  <p className="text-xs text-slate-400">Nájdených</p>
                </div>
                <div>
                  <p className="text-xl font-bold text-emerald-400">
                    +{scrapeMutation.data.results?.newProperties || 0}
                  </p>
                  <p className="text-xs text-slate-400">Nových</p>
                </div>
                <div>
                  <p className="text-xl font-bold text-blue-400">
                    {scrapeMutation.data.results?.updatedProperties || 0}
                  </p>
                  <p className="text-xs text-slate-400">Aktualizovaných</p>
                </div>
                <div>
                  <p className="text-xl font-bold text-slate-300">
                    {scrapeMutation.data.results?.pagesScraped || 0}
                  </p>
                  <p className="text-xs text-slate-400">Stránok</p>
                </div>
              </div>
            </div>
          )}

          {/* Info Footer */}
          <div className="text-center text-sm text-slate-500">
            Posledná aktualizácia: {lastRefresh.toLocaleTimeString("sk-SK")} • 
            Auto-refresh každých 30 sekúnd
          </div>
        </>
      )}
    </div>
  );
}
