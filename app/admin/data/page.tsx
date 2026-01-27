"use client";

import { useState, useEffect, useCallback } from "react";
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
  Home,
  Globe,
  MapPin,
  Timer,
  BarChart3
} from "lucide-react";

interface ScrapingRun {
  runId: string;
  status: "pending" | "running" | "succeeded" | "failed";
  portal: string;
  startedAt: string;
  stats?: {
    total: number;
    created: number;
    updated: number;
    skipped: number;
    errors: string[];
  };
}

interface DatabaseStats {
  totalProperties: number;
  activeProperties: number;
  byCity: Array<{ city: string; count: number }>;
  bySource: Array<{ source: string; count: number }>;
  newToday: number;
  newThisWeek: number;
}

export default function DataManagementPage() {
  const [dbStats, setDbStats] = useState<DatabaseStats | null>(null);
  const [currentRun, setCurrentRun] = useState<ScrapingRun | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // Pridaj log
  const addLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString("sk-SK");
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev].slice(0, 50));
  }, []);

  // Načítaj štatistiky z databázy
  const fetchDbStats = async () => {
    try {
      const res = await fetch("/api/v1/admin/scraping-stats");
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setDbStats(data.data);
        }
      }
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    }
    setLastRefresh(new Date());
  };

  useEffect(() => {
    fetchDbStats();
    const interval = setInterval(fetchDbStats, 60000); // Refresh každú minútu
    return () => clearInterval(interval);
  }, []);

  // Spusti scraping a automaticky spracuj výsledky
  const startFullScraping = async () => {
    setIsStarting(true);
    setCurrentRun(null);
    addLog("🚀 Spúšťam Apify scraping...");

    try {
      // 1. Spusti Apify run
      const startRes = await fetch("/api/cron/scrape-slovakia?portal=nehnutelnosti&limit=10", {
        method: "POST"
      });
      const startData = await startRes.json();

      if (!startData.success) {
        throw new Error(startData.error || "Nepodarilo sa spustiť scraping");
      }

      // API vracia runs ako array
      const runs = startData.runs || [];
      if (runs.length === 0) {
        throw new Error("Žiadne Apify runs neboli spustené");
      }

      const firstRun = runs[0];
      const runId = firstRun.runId;
      addLog(`✅ Apify run spustený: ${runId} (${firstRun.urlCount} URL)`);
      
      if (runs.length > 1) {
        addLog(`📋 Spustených ${runs.length} runov celkovo`);
      }
      
      setCurrentRun({
        runId,
        status: "running",
        portal: firstRun.portal || "nehnutelnosti",
        startedAt: new Date().toISOString()
      });

      setIsStarting(false);

      // 2. Počkaj a sleduj stav
      addLog("⏳ Čakám na dokončenie Apify...");
      await pollApifyStatus(runId);

    } catch (error) {
      addLog(`❌ Chyba: ${error instanceof Error ? error.message : "Neznáma chyba"}`);
      setIsStarting(false);
      setCurrentRun(null);
    }
  };

  // Sleduj stav Apify runu
  const pollApifyStatus = async (runId: string) => {
    let attempts = 0;
    const maxAttempts = 60; // Max 10 minút (každých 10s)

    const checkStatus = async (): Promise<boolean> => {
      try {
        const res = await fetch(`/api/v1/admin/apify-status?runId=${runId}`);
        const data = await res.json();

        if (data.status === "SUCCEEDED") {
          addLog("✅ Apify run dokončený!");
          return true;
        } else if (data.status === "FAILED" || data.status === "ABORTED") {
          addLog(`❌ Apify run zlyhal: ${data.status}`);
          setCurrentRun(prev => prev ? { ...prev, status: "failed" } : null);
          return true;
        }

        // Stále beží
        attempts++;
        if (attempts >= maxAttempts) {
          addLog("⚠️ Timeout - skúsim spracovať čo je dostupné");
          return true;
        }

        addLog(`⏳ Apify stále beží... (${attempts * 10}s)`);
        return false;
      } catch {
        return false;
      }
    };

    // Poll každých 10 sekúnd
    while (!(await checkStatus())) {
      await new Promise(r => setTimeout(r, 10000));
    }

    // 3. Spracuj výsledky
    await processResults(runId);
  };

  // Spracuj výsledky z Apify
  const processResults = async (runId: string) => {
    setIsProcessing(true);
    addLog("📥 Spracovávam výsledky...");

    try {
      const res = await fetch(`/api/cron/process-apify?runId=${runId}&portal=nehnutelnosti`, {
        method: "POST"
      });
      const data = await res.json();

      if (data.success) {
        addLog(`✅ Spracované! Vytvorených: ${data.stats.created}, Aktualizovaných: ${data.stats.updated}, Preskočených: ${data.stats.skipped}`);
        
        setCurrentRun(prev => prev ? {
          ...prev,
          status: "succeeded",
          stats: data.stats
        } : null);

        // Refresh štatistiky
        await fetchDbStats();
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      addLog(`❌ Chyba pri spracovaní: ${error instanceof Error ? error.message : "Neznáma chyba"}`);
      setCurrentRun(prev => prev ? { ...prev, status: "failed" } : null);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] text-zinc-600 uppercase tracking-widest font-medium mb-1">ADMIN</p>
          <h1 className="text-2xl font-semibold text-zinc-100 tracking-tight">Scraping & Dáta</h1>
        </div>
        <button
          onClick={fetchDbStats}
          className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors text-sm"
        >
          <RefreshCw className="w-4 h-4" />
          Obnoviť
        </button>
      </div>

      {/* Main Action Card */}
      <div className="premium-card p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <Globe className="w-7 h-7 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-zinc-100">Apify Scraper</h2>
              <p className="text-sm text-zinc-500">Nehnutelnosti.sk • Celé Slovensko</p>
            </div>
          </div>

          <button
            onClick={startFullScraping}
            disabled={isStarting || isProcessing || currentRun?.status === "running"}
            className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white rounded-xl transition-colors font-medium"
          >
            {isStarting || isProcessing || currentRun?.status === "running" ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {isStarting ? "Spúšťam..." : isProcessing ? "Spracovávam..." : "Beží..."}
              </>
            ) : (
              <>
                <Play className="w-5 h-5" />
                Spustiť Scraping
              </>
            )}
          </button>
        </div>

        {/* Current Run Status */}
        {currentRun && (
          <div className={`p-4 rounded-xl border ${
            currentRun.status === "succeeded" ? "bg-emerald-500/10 border-emerald-500/20" :
            currentRun.status === "failed" ? "bg-red-500/10 border-red-500/20" :
            "bg-blue-500/10 border-blue-500/20"
          }`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {currentRun.status === "succeeded" ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                ) : currentRun.status === "failed" ? (
                  <AlertCircle className="w-5 h-5 text-red-400" />
                ) : (
                  <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
                )}
                <span className="font-medium text-zinc-200">
                  {currentRun.status === "succeeded" ? "Dokončené" :
                   currentRun.status === "failed" ? "Zlyhalo" : "Beží..."}
                </span>
              </div>
              <span className="text-xs text-zinc-500 font-mono">{currentRun.runId}</span>
            </div>

            {currentRun.stats && (
              <div className="grid grid-cols-4 gap-4">
                <div className="text-center">
                  <p className="text-xl font-bold text-zinc-100">{currentRun.stats.total}</p>
                  <p className="text-xs text-zinc-500">Celkom</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold text-emerald-400">+{currentRun.stats.created}</p>
                  <p className="text-xs text-zinc-500">Nových</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold text-blue-400">{currentRun.stats.updated}</p>
                  <p className="text-xs text-zinc-500">Aktualizovaných</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold text-zinc-400">{currentRun.stats.skipped}</p>
                  <p className="text-xs text-zinc-500">Preskočených</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="premium-card p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <Home className="w-5 h-5 text-emerald-400" />
            </div>
            <span className="text-zinc-500 text-sm">V databáze</span>
          </div>
          <p className="text-2xl font-bold text-zinc-100">
            {dbStats?.totalProperties?.toLocaleString() || "—"}
          </p>
          <p className="text-xs text-zinc-600 mt-1">nehnuteľností</p>
        </div>

        <div className="premium-card p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-blue-400" />
            </div>
            <span className="text-zinc-500 text-sm">Nových dnes</span>
          </div>
          <p className="text-2xl font-bold text-emerald-400">
            +{dbStats?.newToday || 0}
          </p>
          <p className="text-xs text-zinc-600 mt-1">pridaných</p>
        </div>

        <div className="premium-card p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-purple-400" />
            </div>
            <span className="text-zinc-500 text-sm">Tento týždeň</span>
          </div>
          <p className="text-2xl font-bold text-zinc-100">
            +{dbStats?.newThisWeek || 0}
          </p>
          <p className="text-xs text-zinc-600 mt-1">nových</p>
        </div>

        <div className="premium-card p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <MapPin className="w-5 h-5 text-amber-400" />
            </div>
            <span className="text-zinc-500 text-sm">Mestá</span>
          </div>
          <p className="text-2xl font-bold text-zinc-100">
            {dbStats?.byCity?.length || 0}
          </p>
          <p className="text-xs text-zinc-600 mt-1">pokrytých</p>
        </div>
      </div>

      {/* By City & By Source */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* By City */}
        <div className="premium-card p-5">
          <h3 className="text-sm font-medium text-zinc-400 mb-4 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-emerald-400" />
            Podľa mesta
          </h3>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {dbStats?.byCity?.slice(0, 10).map((item, i) => {
              const max = dbStats.byCity[0]?.count || 1;
              const pct = (item.count / max) * 100;
              return (
                <div key={item.city}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-zinc-300">{item.city}</span>
                    <span className="text-zinc-500 font-mono">{item.count}</span>
                  </div>
                  <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
            {(!dbStats?.byCity || dbStats.byCity.length === 0) && (
              <p className="text-zinc-600 text-sm">Žiadne dáta</p>
            )}
          </div>
        </div>

        {/* By Source */}
        <div className="premium-card p-5">
          <h3 className="text-sm font-medium text-zinc-400 mb-4 flex items-center gap-2">
            <Globe className="w-4 h-4 text-blue-400" />
            Podľa zdroja
          </h3>
          <div className="space-y-3">
            {dbStats?.bySource?.map((item) => {
              const max = dbStats.bySource[0]?.count || 1;
              const pct = (item.count / max) * 100;
              const colors: Record<string, string> = {
                NEHNUTELNOSTI: "bg-emerald-500",
                BAZOS: "bg-amber-500",
                REALITY: "bg-blue-500",
                TOPREALITY: "bg-purple-500"
              };
              return (
                <div key={item.source}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-zinc-300">{item.source}</span>
                    <span className="text-zinc-500 font-mono">{item.count}</span>
                  </div>
                  <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div className={`h-full ${colors[item.source] || "bg-zinc-600"} rounded-full`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
            {(!dbStats?.bySource || dbStats.bySource.length === 0) && (
              <p className="text-zinc-600 text-sm">Žiadne dáta</p>
            )}
          </div>
        </div>
      </div>

      {/* Logs */}
      <div className="premium-card p-5">
        <h3 className="text-sm font-medium text-zinc-400 mb-4 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-zinc-500" />
          Log
        </h3>
        <div className="bg-zinc-900/50 rounded-lg p-4 max-h-48 overflow-y-auto font-mono text-xs">
          {logs.length > 0 ? (
            logs.map((log, i) => (
              <div key={i} className="text-zinc-400 py-0.5">{log}</div>
            ))
          ) : (
            <p className="text-zinc-600">Zatiaľ žiadne logy. Spusti scraping.</p>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-xs text-zinc-600">
        Posledná aktualizácia: {lastRefresh.toLocaleTimeString("sk-SK")}
      </div>
    </div>
  );
}
