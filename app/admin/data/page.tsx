"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Database, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Calendar,
  ExternalLink,
  Bell,
  Download
} from "lucide-react";

interface DataStatus {
  source: string;
  lastFetch: string | null;
  recordsCount: number;
  status: "ok" | "stale" | "error";
  nextUpdate: string;
}

interface NBSDataEntry {
  region: string;
  apartment: number;
  house: number;
  changeQoQ: number;
}

export default function DataManagementPage() {
  const queryClient = useQueryClient();
  const [nbsData, setNbsData] = useState<NBSDataEntry[]>([
    { region: "Bratislavský kraj", apartment: 4150, house: 2850, changeQoQ: 2.2 },
    { region: "Trnavský kraj", apartment: 2750, house: 1980, changeQoQ: 1.9 },
    { region: "Trenčiansky kraj", apartment: 2180, house: 1620, changeQoQ: 3.2 },
    { region: "Nitriansky kraj", apartment: 1720, house: 1280, changeQoQ: 1.3 },
    { region: "Žilinský kraj", apartment: 2350, house: 1650, changeQoQ: 1.5 },
    { region: "Banskobystrický kraj", apartment: 1950, house: 1380, changeQoQ: -0.4 },
    { region: "Prešovský kraj", apartment: 2480, house: 1780, changeQoQ: 1.8 },
    { region: "Košický kraj", apartment: 2750, house: 1950, changeQoQ: -3.9 },
  ]);
  const [selectedQuarter, setSelectedQuarter] = useState("Q3");
  const [selectedYear, setSelectedYear] = useState("2025");
  
  // Fetch data status
  const { data: dataStatus, isLoading } = useQuery({
    queryKey: ["data-status"],
    queryFn: async () => {
      const res = await fetch("/api/v1/admin/data-status");
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    retry: false,
  });
  
  // Check for new NBS data
  const checkNBSMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/cron/check-nbs");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["data-status"] });
    },
  });
  
  // Sync all data
  const syncAllMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/cron/sync-data?type=all");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["data-status"] });
    },
  });
  
  const handleUpdateValue = (index: number, field: keyof NBSDataEntry, value: number) => {
    const updated = [...nbsData];
    updated[index] = { ...updated[index], [field]: value };
    setNbsData(updated);
  };
  
  const handleSaveNBSData = async () => {
    // Tu by sa uložili dáta do databázy
    alert("Dáta by sa uložili do databázy. Implementuj /api/v1/admin/nbs-data POST endpoint.");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Správa dát</h1>
          <p className="text-slate-400">Aktualizácia a monitoring dátových zdrojov</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => checkNBSMutation.mutate()}
            disabled={checkNBSMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            <Bell className="w-4 h-4" />
            {checkNBSMutation.isPending ? "Kontrolujem..." : "Skontrolovať NBS"}
          </button>
          <button
            onClick={() => syncAllMutation.mutate()}
            disabled={syncAllMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${syncAllMutation.isPending ? "animate-spin" : ""}`} />
            {syncAllMutation.isPending ? "Synchronizujem..." : "Sync všetko"}
          </button>
        </div>
      </div>

      {/* NBS Check Result */}
      {checkNBSMutation.data && (
        <div className={`p-4 rounded-xl border ${
          checkNBSMutation.data.newDataFound 
            ? "bg-emerald-500/10 border-emerald-500/30" 
            : "bg-slate-800/50 border-slate-700"
        }`}>
          <div className="flex items-center gap-3">
            {checkNBSMutation.data.newDataFound ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            ) : (
              <AlertCircle className="w-5 h-5 text-slate-400" />
            )}
            <div>
              <p className="font-medium text-white">{checkNBSMutation.data.message}</p>
              {checkNBSMutation.data.notificationSent && (
                <p className="text-sm text-emerald-400">Notifikácia odoslaná!</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Data Sources Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { name: "NBS Ceny", status: "ok", lastUpdate: "Nov 2025", next: "Feb 2026" },
          { name: "Ekonomické", status: "ok", lastUpdate: "Dec 2025", next: "Jan 2026" },
          { name: "Demografické", status: "stale", lastUpdate: "2024", next: "2025" },
          { name: "Trhové dáta", status: "ok", lastUpdate: "Dnes", next: "Zajtra" },
        ].map((source, index) => (
          <div key={index} className="glass-card rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="font-medium text-white">{source.name}</span>
              <span className={`w-2 h-2 rounded-full ${
                source.status === "ok" ? "bg-emerald-400" : 
                source.status === "stale" ? "bg-amber-400" : "bg-red-400"
              }`} />
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Posledná aktualizácia</span>
                <span className="text-slate-300">{source.lastUpdate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Ďalšia aktualizácia</span>
                <span className="text-slate-300">{source.next}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* NBS Data Editor */}
      <div className="glass-card rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <Database className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">NBS Ceny nehnuteľností</h2>
              <p className="text-sm text-slate-400">Manuálna aktualizácia dát z NBS reportu</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <select 
              value={selectedQuarter}
              onChange={(e) => setSelectedQuarter(e.target.value)}
              className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
            >
              <option value="Q1">Q1</option>
              <option value="Q2">Q2</option>
              <option value="Q3">Q3</option>
              <option value="Q4">Q4</option>
            </select>
            <select 
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
            >
              <option value="2024">2024</option>
              <option value="2025">2025</option>
              <option value="2026">2026</option>
            </select>
            <a 
              href="https://nbs.sk/statisticke-udaje/vybrane-makroekonomicke-ukazovatele/ceny-nehnutelnosti-na-byvanie/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2 text-emerald-400 hover:text-emerald-300"
            >
              <ExternalLink className="w-4 h-4" />
              Otvoriť NBS
            </a>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left py-3 px-4 text-slate-400 font-medium">Kraj</th>
                <th className="text-right py-3 px-4 text-slate-400 font-medium">Byty (€/m²)</th>
                <th className="text-right py-3 px-4 text-slate-400 font-medium">Domy (€/m²)</th>
                <th className="text-right py-3 px-4 text-slate-400 font-medium">Zmena QoQ (%)</th>
              </tr>
            </thead>
            <tbody>
              {nbsData.map((row, index) => (
                <tr key={index} className="border-b border-slate-800 hover:bg-slate-800/30">
                  <td className="py-3 px-4 text-white font-medium">{row.region}</td>
                  <td className="py-3 px-4">
                    <input
                      type="number"
                      value={row.apartment}
                      onChange={(e) => handleUpdateValue(index, "apartment", Number(e.target.value))}
                      className="w-24 px-2 py-1 bg-slate-800 border border-slate-700 rounded text-right text-white"
                    />
                  </td>
                  <td className="py-3 px-4">
                    <input
                      type="number"
                      value={row.house}
                      onChange={(e) => handleUpdateValue(index, "house", Number(e.target.value))}
                      className="w-24 px-2 py-1 bg-slate-800 border border-slate-700 rounded text-right text-white"
                    />
                  </td>
                  <td className="py-3 px-4">
                    <input
                      type="number"
                      step="0.1"
                      value={row.changeQoQ}
                      onChange={(e) => handleUpdateValue(index, "changeQoQ", Number(e.target.value))}
                      className={`w-20 px-2 py-1 bg-slate-800 border border-slate-700 rounded text-right ${
                        row.changeQoQ > 0 ? "text-emerald-400" : row.changeQoQ < 0 ? "text-red-400" : "text-white"
                      }`}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="flex justify-end mt-6 gap-3">
          <button className="px-4 py-2 text-slate-400 hover:text-white transition-colors">
            Zrušiť
          </button>
          <button 
            onClick={handleSaveNBSData}
            className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg transition-colors"
          >
            Uložiť {selectedQuarter} {selectedYear}
          </button>
        </div>
      </div>

      {/* Quick Links */}
      <div className="glass-card rounded-xl p-6">
        <h3 className="text-lg font-bold text-white mb-4">Užitočné odkazy</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <a 
            href="https://nbs.sk/statisticke-udaje/vybrane-makroekonomicke-ukazovatele/ceny-nehnutelnosti-na-byvanie/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-4 bg-slate-800/50 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <Download className="w-5 h-5 text-emerald-400" />
            <div>
              <p className="font-medium text-white">NBS - Ceny nehnuteľností</p>
              <p className="text-sm text-slate-400">Štvrťročné reporty</p>
            </div>
          </a>
          <a 
            href="https://data.statistics.sk/api/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-4 bg-slate-800/50 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <Download className="w-5 h-5 text-gold-400" />
            <div>
              <p className="font-medium text-white">ŠÚ SR - DATAcube</p>
              <p className="text-sm text-slate-400">API pre štatistiky</p>
            </div>
          </a>
          <a 
            href="https://cmn.sk/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-4 bg-slate-800/50 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <Download className="w-5 h-5 text-slate-400" />
            <div>
              <p className="font-medium text-white">Cenová mapa</p>
              <p className="text-sm text-slate-400">cmn.sk</p>
            </div>
          </a>
        </div>
      </div>
    </div>
  );
}
