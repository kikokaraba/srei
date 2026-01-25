"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Play, 
  Loader2, 
  CheckCircle, 
  XCircle, 
  RefreshCw,
  Globe,
  Clock,
  Database,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface SourceConfig {
  id: string;
  name: string;
  url: string;
  enabled: boolean;
  description: string;
  propertyCount: number;
  lastScrape: {
    timestamp: string;
    status: string;
    recordsCount: number;
    duration: number;
    error: string | null;
  } | null;
}

interface ScraperStats {
  pagesScraped: number;
  listingsFound: number;
  newListings: number;
  updatedListings: number;
  errors: number;
  duration: string;
}

interface ScraperResult {
  success: boolean;
  stats?: ScraperStats;
  breakdown?: Array<ScraperStats & { source: string }>;
  error?: string;
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

const CATEGORIES = [
  // Predaj
  { id: "byty-predaj", name: "Byty - Predaj", type: "PREDAJ" },
  { id: "domy-predaj", name: "Domy - Predaj", type: "PREDAJ" },
  { id: "pozemky-predaj", name: "Pozemky - Predaj", type: "PREDAJ" },
  { id: "chaty-predaj", name: "Chaty - Predaj", type: "PREDAJ" },
  { id: "komercne-predaj", name: "Komerčné - Predaj", type: "PREDAJ" },
  { id: "garaze-predaj", name: "Garáže - Predaj", type: "PREDAJ" },
  // Prenájom
  { id: "byty-prenajom", name: "Byty - Prenájom", type: "PRENAJOM" },
  { id: "domy-prenajom", name: "Domy - Prenájom", type: "PRENAJOM" },
  { id: "komercne-prenajom", name: "Komerčné - Prenájom", type: "PRENAJOM" },
  { id: "garaze-prenajom", name: "Garáže - Prenájom", type: "PRENAJOM" },
  // All
  { id: "all", name: "Všetky kategórie", type: "ALL" },
];

export default function ScraperControl() {
  const queryClient = useQueryClient();
  const [selectedSources, setSelectedSources] = useState<string[]>(["BAZOS"]);
  const [selectedCities, setSelectedCities] = useState<string[]>(["Bratislava"]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(["byty-predaj"]);
  const [testMode, setTestMode] = useState(true);
  const [maxPages, setMaxPages] = useState(1);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Fetch scraper config
  const { data: config, isLoading: isLoadingConfig } = useQuery({
    queryKey: ["scraper-config"],
    queryFn: async () => {
      const res = await fetch("/api/v1/admin/scraper");
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      return data.data;
    },
    staleTime: 30000,
  });

  // Run scraper mutation
  const runMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/v1/admin/scraper", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sources: selectedSources,
          cities: selectedCities,
          categories: selectedCategories,
          testMode,
          maxPages,
        }),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scraper-config"] });
    },
  });

  const toggleSource = (sourceId: string) => {
    setSelectedSources(prev =>
      prev.includes(sourceId)
        ? prev.filter(s => s !== sourceId)
        : [...prev, sourceId]
    );
  };

  const toggleCity = (city: string) => {
    setSelectedCities(prev =>
      prev.includes(city)
        ? prev.filter(c => c !== city)
        : [...prev, city]
    );
  };

  const toggleCategory = (categoryId: string) => {
    if (categoryId === "all") {
      setSelectedCategories(["all"]);
    } else {
      setSelectedCategories(prev => {
        const newCategories = prev.filter(c => c !== "all");
        if (newCategories.includes(categoryId)) {
          return newCategories.filter(c => c !== categoryId);
        }
        return [...newCategories, categoryId];
      });
    }
  };

  const sources: SourceConfig[] = config?.sources || [];

  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Globe className="w-5 h-5 text-emerald-400" />
            Scraper Control
          </h2>
          <p className="text-sm text-slate-400">Manuálne spustenie scrapera pre realitné portály</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${runMutation.isPending ? "bg-amber-400 animate-pulse" : "bg-emerald-400"}`} />
          <span className="text-sm text-slate-400">
            {runMutation.isPending ? "Beží..." : "Pripravený"}
          </span>
        </div>
      </div>

      {/* Source Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-slate-300 mb-3">
          Vyber zdroje na scraping:
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {isLoadingConfig ? (
            <div className="col-span-full flex items-center justify-center py-4">
              <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
            </div>
          ) : (
            sources.map((source) => (
              <button
                key={source.id}
                onClick={() => source.enabled && toggleSource(source.id)}
                disabled={!source.enabled || runMutation.isPending}
                className={`relative p-4 rounded-lg border text-left transition-all ${
                  selectedSources.includes(source.id)
                    ? "bg-emerald-500/20 border-emerald-500/50"
                    : source.enabled
                      ? "bg-slate-700/50 border-slate-600 hover:border-slate-500"
                      : "bg-slate-800/30 border-slate-700 opacity-50 cursor-not-allowed"
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <span className="font-medium text-white">{source.name}</span>
                    {!source.enabled && (
                      <span className="ml-2 text-xs text-amber-400">(čoskoro)</span>
                    )}
                  </div>
                  {selectedSources.includes(source.id) && (
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                  )}
                </div>
                <p className="text-xs text-slate-400 mb-2">{source.description}</p>
                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <Database className="w-3 h-3" />
                    {source.propertyCount.toLocaleString()}
                  </span>
                  {source.lastScrape && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(source.lastScrape.timestamp).toLocaleDateString("sk-SK")}
                    </span>
                  )}
                </div>
                {source.lastScrape?.error && (
                  <div className="mt-2 flex items-center gap-1 text-xs text-amber-400">
                    <AlertTriangle className="w-3 h-3" />
                    Posledný run mal chyby
                  </div>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Region Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-slate-300 mb-3">
          Vyber regióny:
        </label>
        <div className="flex flex-wrap gap-2">
          {REGIONS.map(region => (
            <button
              key={region.code}
              onClick={() => toggleCity(region.city)}
              disabled={runMutation.isPending}
              className={`px-3 py-1.5 text-sm rounded-lg border transition-all ${
                selectedCities.includes(region.city)
                  ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-300"
                  : "bg-slate-700/50 border-slate-600 text-slate-400 hover:border-slate-500"
              } disabled:opacity-50`}
            >
              {region.code}
            </button>
          ))}
          <button
            onClick={() => setSelectedCities(REGIONS.map(r => r.city))}
            disabled={runMutation.isPending}
            className="px-3 py-1.5 text-sm rounded-lg border bg-slate-700/50 border-slate-600 text-slate-400 hover:border-slate-500 disabled:opacity-50"
          >
            Všetky
          </button>
        </div>
      </div>

      {/* Category Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-slate-300 mb-3">
          Vyber kategórie:
        </label>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map(category => (
            <button
              key={category.id}
              onClick={() => toggleCategory(category.id)}
              disabled={runMutation.isPending}
              className={`px-3 py-1.5 text-sm rounded-lg border transition-all ${
                selectedCategories.includes(category.id)
                  ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-300"
                  : "bg-slate-700/50 border-slate-600 text-slate-400 hover:border-slate-500"
              } disabled:opacity-50`}
            >
              {category.name}
            </button>
          ))}
        </div>
      </div>

      {/* Advanced Settings */}
      <div className="mb-6">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-300"
        >
          {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          Pokročilé nastavenia
        </button>
        
        {showAdvanced && (
          <div className="mt-4 space-y-4 p-4 bg-slate-800/50 rounded-lg">
            {/* Test mode toggle */}
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={testMode}
                onChange={(e) => setTestMode(e.target.checked)}
                disabled={runMutation.isPending}
                className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-emerald-500 focus:ring-emerald-500"
              />
              <div>
                <span className="text-sm font-medium text-slate-300">Test mód</span>
                <p className="text-xs text-slate-500">
                  Stiahne len {maxPages} stránku na kategóriu (rýchlejšie, bezpečnejšie)
                </p>
              </div>
            </label>

            {/* Max pages */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Max stránok na kategóriu: {maxPages}
              </label>
              <input
                type="range"
                min={1}
                max={10}
                value={maxPages}
                onChange={(e) => setMaxPages(parseInt(e.target.value))}
                disabled={runMutation.isPending}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-slate-500 mt-1">
                <span>1</span>
                <span>5</span>
                <span>10</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Run Button */}
      <button
        onClick={() => runMutation.mutate()}
        disabled={runMutation.isPending || selectedSources.length === 0 || selectedCities.length === 0}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-600 text-white font-semibold rounded-lg transition-colors disabled:cursor-not-allowed"
      >
        {runMutation.isPending ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Scrapujem... (môže trvať minútu)
          </>
        ) : (
          <>
            <Play className="w-5 h-5" />
            Spustiť Scraper ({selectedSources.length} {selectedSources.length === 1 ? "zdroj" : "zdroje"})
          </>
        )}
      </button>

      {/* Results */}
      {runMutation.data && (
        <div className={`mt-6 p-4 rounded-lg border ${
          runMutation.data.success 
            ? "bg-emerald-500/10 border-emerald-500/30" 
            : "bg-rose-500/10 border-rose-500/30"
        }`}>
          <div className="flex items-center gap-2 mb-3">
            {runMutation.data.success ? (
              <CheckCircle className="w-5 h-5 text-emerald-400" />
            ) : (
              <XCircle className="w-5 h-5 text-rose-400" />
            )}
            <span className={`font-semibold ${runMutation.data.success ? "text-emerald-300" : "text-rose-300"}`}>
              {runMutation.data.success ? "Scraping dokončený" : "Scraping dokončený s chybami"}
            </span>
          </div>

          {runMutation.data.stats && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm mb-4">
              <div>
                <span className="text-slate-500">Stránky:</span>
                <span className="ml-2 text-slate-200">{runMutation.data.stats.pagesScraped}</span>
              </div>
              <div>
                <span className="text-slate-500">Nájdené:</span>
                <span className="ml-2 text-slate-200">{runMutation.data.stats.listingsFound}</span>
              </div>
              <div>
                <span className="text-slate-500">Nové:</span>
                <span className="ml-2 text-emerald-400 font-semibold">{runMutation.data.stats.newListings}</span>
              </div>
              <div>
                <span className="text-slate-500">Aktualizované:</span>
                <span className="ml-2 text-blue-400">{runMutation.data.stats.updatedListings}</span>
              </div>
              <div>
                <span className="text-slate-500">Chyby:</span>
                <span className={`ml-2 ${runMutation.data.stats.errors > 0 ? "text-rose-400" : "text-slate-200"}`}>
                  {runMutation.data.stats.errors}
                </span>
              </div>
              <div>
                <span className="text-slate-500">Čas:</span>
                <span className="ml-2 text-slate-200">{runMutation.data.stats.duration}</span>
              </div>
            </div>
          )}

          {/* Breakdown by source */}
          {runMutation.data.breakdown && runMutation.data.breakdown.length > 1 && (
            <div className="border-t border-slate-700 pt-3 mt-3">
              <p className="text-xs text-slate-400 mb-2">Rozdelenie podľa zdroja:</p>
              <div className="space-y-2">
                {runMutation.data.breakdown.map((item: ScraperStats & { source: string }) => (
                  <div key={item.source} className="flex items-center justify-between text-xs">
                    <span className="text-slate-300">{item.source}</span>
                    <span className="text-slate-400">
                      {item.listingsFound} nájdených, {item.pagesScraped} stránok, {item.duration}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {runMutation.data.error && (
            <p className="text-sm text-rose-400 mt-2">{runMutation.data.error}</p>
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
