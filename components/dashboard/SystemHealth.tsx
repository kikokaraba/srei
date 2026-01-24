"use client";

import { useQuery } from "@tanstack/react-query";
import { 
  Activity, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Clock,
  Database,
  Wifi,
  Server,
  RefreshCw
} from "lucide-react";

interface ScraperStatus {
  source: string;
  lastRun?: string;
  status: "success" | "partial" | "blocked" | "error" | "never";
  recordsCount?: number;
  duration?: string;
  error?: string;
}

interface SystemHealthData {
  scrapers: ScraperStatus[];
  database: {
    connected: boolean;
    totalProperties: number;
    totalHotDeals: number;
  };
  lastUpdate: string;
}

async function fetchSystemHealth(): Promise<SystemHealthData> {
  const response = await fetch("/api/v1/system/health");
  if (!response.ok) {
    // Fallback data
    return {
      scrapers: [],
      database: { connected: true, totalProperties: 0, totalHotDeals: 0 },
      lastUpdate: new Date().toISOString(),
    };
  }
  return response.json();
}

function getStatusIcon(status: ScraperStatus["status"]) {
  switch (status) {
    case "success":
      return <CheckCircle className="w-4 h-4 text-emerald-400" />;
    case "partial":
      return <AlertTriangle className="w-4 h-4 text-amber-400" />;
    case "blocked":
      return <XCircle className="w-4 h-4 text-red-400" />;
    case "error":
      return <XCircle className="w-4 h-4 text-red-400" />;
    default:
      return <Clock className="w-4 h-4 text-slate-400" />;
  }
}

function getStatusColor(status: ScraperStatus["status"]) {
  switch (status) {
    case "success":
      return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
    case "partial":
      return "bg-amber-500/20 text-amber-400 border-amber-500/30";
    case "blocked":
    case "error":
      return "bg-red-500/20 text-red-400 border-red-500/30";
    default:
      return "bg-slate-500/20 text-slate-400 border-slate-500/30";
  }
}

function formatTimeAgo(dateString?: string): string {
  if (!dateString) return "nikdy";
  
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffMins < 60) return `pred ${diffMins} min`;
  if (diffHours < 24) return `pred ${diffHours} hod`;
  return `pred ${diffDays} dňami`;
}

export default function SystemHealth() {
  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ["system-health"],
    queryFn: fetchSystemHealth,
    refetchInterval: 60 * 1000, // Refresh každú minútu
  });
  
  // Mock data pre demo
  const mockData: SystemHealthData = {
    scrapers: [
      {
        source: "Bazoš Stealth",
        lastRun: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        status: "success",
        recordsCount: 127,
        duration: "45s",
      },
      {
        source: "NBS Data",
        lastRun: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        status: "success",
        recordsCount: 8,
        duration: "2s",
      },
    ],
    database: {
      connected: true,
      totalProperties: 1247,
      totalHotDeals: 23,
    },
    lastUpdate: new Date().toISOString(),
  };
  
  const displayData = data || mockData;
  
  return (
    <div className="glass-card p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500/20 to-cyan-500/20">
            <Activity className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">System Health</h3>
            <p className="text-sm text-slate-400">
              Monitoring dátových zdrojov
            </p>
          </div>
        </div>
        
        <button
          onClick={() => refetch()}
          disabled={isRefetching}
          className="p-2 rounded-lg bg-slate-700/50 hover:bg-slate-700 text-slate-300 
                     hover:text-white transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isRefetching ? "animate-spin" : ""}`} />
        </button>
      </div>
      
      {/* Database Status */}
      <div className="mb-4 p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-slate-400" />
            <span className="text-sm text-slate-300">PostgreSQL</span>
          </div>
          <div className="flex items-center gap-2">
            {displayData.database.connected ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs text-emerald-400">Connected</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-red-400" />
                <span className="text-xs text-red-400">Disconnected</span>
              </>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
          <span>{displayData.database.totalProperties.toLocaleString()} nehnuteľností</span>
          <span>•</span>
          <span>{displayData.database.totalHotDeals} hot deals</span>
        </div>
      </div>
      
      {/* Scrapers Status */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-slate-400 mb-3">Scrapery</h4>
        
        {displayData.scrapers.map((scraper) => (
          <div
            key={scraper.source}
            className={`p-3 rounded-lg border ${getStatusColor(scraper.status)}`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getStatusIcon(scraper.status)}
                <span className="text-sm font-medium">{scraper.source}</span>
              </div>
              <span className="text-xs opacity-70">
                {formatTimeAgo(scraper.lastRun)}
              </span>
            </div>
            
            {scraper.status !== "never" && (
              <div className="flex items-center gap-3 mt-1 text-xs opacity-70">
                {scraper.recordsCount !== undefined && (
                  <span>{scraper.recordsCount} záznamov</span>
                )}
                {scraper.duration && (
                  <>
                    <span>•</span>
                    <span>{scraper.duration}</span>
                  </>
                )}
              </div>
            )}
            
            {scraper.error && (
              <div className="mt-2 text-xs text-red-300 truncate">
                {scraper.error}
              </div>
            )}
          </div>
        ))}
        
        {displayData.scrapers.length === 0 && (
          <div className="text-center py-4 text-slate-500 text-sm">
            Zatiaľ neboli spustené žiadne scrapery
          </div>
        )}
      </div>
      
      {/* Quick Actions */}
      <div className="mt-4 pt-4 border-t border-slate-700/50">
        <div className="flex items-center gap-2">
          <button
            className="flex-1 py-2 px-3 rounded-lg bg-emerald-500/20 text-emerald-400 
                       hover:bg-emerald-500/30 transition-colors text-sm font-medium"
          >
            Spustiť Scraper
          </button>
          <button
            className="flex-1 py-2 px-3 rounded-lg bg-slate-700/50 text-slate-300 
                       hover:bg-slate-700 transition-colors text-sm"
          >
            Zobraziť logy
          </button>
        </div>
      </div>
    </div>
  );
}
