"use client";

import { useState } from "react";
import { Play, Loader2, CheckCircle, XCircle, RefreshCw } from "lucide-react";

interface ScraperStats {
  pagesScraped: number;
  listingsFound: number;
  newListings: number;
  hotDeals: number;
  errors: number;
  duration: string;
  blocked: boolean;
}

const REGIONS = [
  { code: "BA", name: "Bratislavský", city: "Bratislava" },
  { code: "KE", name: "Košický", city: "Košice" },
  { code: "PO", name: "Prešovský", city: "Prešov" },
  { code: "ZA", name: "Žilinský", city: "Žilina" },
  { code: "BB", name: "Banskobystrický", city: "Banská Bystrica" },
  { code: "TT", name: "Trnavský", city: "Trnava" },
  { code: "TN", name: "Trenčiansky", city: "Trenčín" },
  { code: "NR", name: "Nitriansky", city: "Nitra" },
];

export default function ScraperControl() {
  const [isRunning, setIsRunning] = useState(false);
  const [lastResult, setLastResult] = useState<{
    success: boolean;
    stats?: ScraperStats;
    error?: string;
  } | null>(null);
  const [selectedRegions, setSelectedRegions] = useState<string[]>(["Bratislava"]);
  const [testMode, setTestMode] = useState(true);

  const toggleRegion = (city: string) => {
    setSelectedRegions(prev => 
      prev.includes(city) 
        ? prev.filter(c => c !== city)
        : [...prev, city]
    );
  };

  const runScraper = async () => {
    setIsRunning(true);
    setLastResult(null);

    try {
      const response = await fetch("/api/v1/scraper/stealth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          testMode,
          cities: selectedRegions,
        }),
      });

      const data = await response.json();
      setLastResult({
        success: data.success,
        stats: data.stats,
        error: data.error,
      });
    } catch (error) {
      setLastResult({
        success: false,
        error: error instanceof Error ? error.message : "Neznáma chyba",
      });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-100">Scraper Control</h2>
          <p className="text-sm text-slate-400">Manuálne spustenie scrapera</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${isRunning ? "bg-amber-400 animate-pulse" : "bg-emerald-400"}`} />
          <span className="text-sm text-slate-400">
            {isRunning ? "Beží..." : "Pripravený"}
          </span>
        </div>
      </div>

      {/* Výber regiónov */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-slate-300 mb-3">
          Vyber regióny na scraping:
        </label>
        <div className="flex flex-wrap gap-2">
          {REGIONS.map(region => (
            <button
              key={region.code}
              onClick={() => toggleRegion(region.city)}
              disabled={isRunning}
              className={`px-3 py-1.5 text-sm rounded-lg border transition-all ${
                selectedRegions.includes(region.city)
                  ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-300"
                  : "bg-slate-700/50 border-slate-600 text-slate-400 hover:border-slate-500"
              } disabled:opacity-50`}
            >
              {region.code}
            </button>
          ))}
        </div>
      </div>

      {/* Test mode toggle */}
      <div className="mb-6">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={testMode}
            onChange={(e) => setTestMode(e.target.checked)}
            disabled={isRunning}
            className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-emerald-500 focus:ring-emerald-500"
          />
          <div>
            <span className="text-sm font-medium text-slate-300">Test mód</span>
            <p className="text-xs text-slate-500">
              Stiahne len 1 stránku na kategóriu (rýchlejšie, bezpečnejšie)
            </p>
          </div>
        </label>
      </div>

      {/* Spustiť tlačidlo */}
      <button
        onClick={runScraper}
        disabled={isRunning || selectedRegions.length === 0}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-600 text-white font-semibold rounded-lg transition-colors disabled:cursor-not-allowed"
      >
        {isRunning ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Scrapujem... (môže trvať minútu)
          </>
        ) : (
          <>
            <Play className="w-5 h-5" />
            Spustiť Scraper
          </>
        )}
      </button>

      {/* Výsledky */}
      {lastResult && (
        <div className={`mt-6 p-4 rounded-lg border ${
          lastResult.success 
            ? "bg-emerald-500/10 border-emerald-500/30" 
            : "bg-rose-500/10 border-rose-500/30"
        }`}>
          <div className="flex items-center gap-2 mb-3">
            {lastResult.success ? (
              <CheckCircle className="w-5 h-5 text-emerald-400" />
            ) : (
              <XCircle className="w-5 h-5 text-rose-400" />
            )}
            <span className={`font-semibold ${lastResult.success ? "text-emerald-300" : "text-rose-300"}`}>
              {lastResult.success ? "Scraping dokončený" : "Chyba pri scrapingu"}
            </span>
          </div>

          {lastResult.stats && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
              <div>
                <span className="text-slate-500">Stránky:</span>
                <span className="ml-2 text-slate-200">{lastResult.stats.pagesScraped}</span>
              </div>
              <div>
                <span className="text-slate-500">Nájdené:</span>
                <span className="ml-2 text-slate-200">{lastResult.stats.listingsFound}</span>
              </div>
              <div>
                <span className="text-slate-500">Nové:</span>
                <span className="ml-2 text-emerald-400 font-semibold">{lastResult.stats.newListings}</span>
              </div>
              <div>
                <span className="text-slate-500">Hot Deals:</span>
                <span className="ml-2 text-amber-400 font-semibold">{lastResult.stats.hotDeals}</span>
              </div>
              <div>
                <span className="text-slate-500">Chyby:</span>
                <span className={`ml-2 ${lastResult.stats.errors > 0 ? "text-rose-400" : "text-slate-200"}`}>
                  {lastResult.stats.errors}
                </span>
              </div>
              <div>
                <span className="text-slate-500">Čas:</span>
                <span className="ml-2 text-slate-200">{lastResult.stats.duration}</span>
              </div>
            </div>
          )}

          {lastResult.error && (
            <p className="text-sm text-rose-400 mt-2">{lastResult.error}</p>
          )}
        </div>
      )}

      {/* Info */}
      <p className="mt-4 text-xs text-slate-500">
        Scraper beží automaticky 2x denne (3:00 a 14:00). Toto je manuálne spustenie.
      </p>
    </div>
  );
}
