"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import {
  Eye,
  Bell,
  Euro,
  Home,
  MapPin,
  Save,
  Loader2,
  CheckCircle2,
  TrendingDown,
  Percent,
  Clock,
  BedDouble,
  Maximize2,
  AlertTriangle,
} from "lucide-react";

interface WatchdogConfig {
  // Cena
  minPrice: number | null;
  maxPrice: number | null;
  minPricePerM2: number | null;
  maxPricePerM2: number | null;
  
  // Plocha
  minArea: number | null;
  maxArea: number | null;
  
  // Izby
  minRooms: number | null;
  maxRooms: number | null;
  
  // Výnos
  minGrossYield: number | null;
  
  // Podmienky
  maxDaysOnMarket: number | null;
  minPriceDrop: number | null;
  
  // Lokality
  trackedCities: string[];
  
  // Notifikácie
  notifyNewProperties: boolean;
  notifyPriceDrops: boolean;
  telegramEnabled: boolean;
  telegramChatId: string | null;
}

const defaultConfig: WatchdogConfig = {
  minPrice: null,
  maxPrice: null,
  minPricePerM2: null,
  maxPricePerM2: null,
  minArea: null,
  maxArea: null,
  minRooms: null,
  maxRooms: null,
  minGrossYield: null,
  maxDaysOnMarket: null,
  minPriceDrop: null,
  trackedCities: [],
  notifyNewProperties: true,
  notifyPriceDrops: true,
  telegramEnabled: false,
  telegramChatId: null,
};

const CITIES = [
  "Bratislava", "Košice", "Prešov", "Žilina", "Banská Bystrica",
  "Nitra", "Trnava", "Trenčín", "Martin", "Poprad",
  "Zvolen", "Prievidza", "Michalovce", "Spišská Nová Ves", "Humenné",
];

export function WatchdogSettings() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [config, setConfig] = useState<WatchdogConfig>(defaultConfig);
  const [matchingCount, setMatchingCount] = useState<number | null>(null);

  // Load current settings
  const loadSettings = useCallback(async () => {
    if (!session?.user) return;
    
    try {
      setLoading(true);
      const response = await fetch("/api/v1/user/preferences");
      if (response.ok) {
        const data = await response.json();
        if (data.preferences) {
          setConfig({
            minPrice: data.preferences.minPrice,
            maxPrice: data.preferences.maxPrice,
            minPricePerM2: data.preferences.minPricePerM2,
            maxPricePerM2: data.preferences.maxPricePerM2,
            minArea: data.preferences.minArea,
            maxArea: data.preferences.maxArea,
            minRooms: data.preferences.minRooms,
            maxRooms: data.preferences.maxRooms,
            minGrossYield: data.preferences.minGrossYield,
            maxDaysOnMarket: data.preferences.maxDaysOnMarket,
            minPriceDrop: data.preferences.minPriceDrop,
            trackedCities: JSON.parse(data.preferences.trackedCities || "[]"),
            notifyNewProperties: data.preferences.notifyNewProperties ?? true,
            notifyPriceDrops: data.preferences.notifyPriceDrops ?? true,
            telegramEnabled: data.preferences.telegramEnabled ?? false,
            telegramChatId: data.preferences.telegramChatId,
          });
        }
      }
    } catch (error) {
      console.error("Failed to load settings:", error);
    } finally {
      setLoading(false);
    }
  }, [session]);

  // Count matching properties
  const countMatching = useCallback(async () => {
    try {
      const params = new URLSearchParams({ propertyType: "BYT", limit: "1" });
      
      if (config.minPrice) params.set("minPrice", config.minPrice.toString());
      if (config.maxPrice) params.set("maxPrice", config.maxPrice.toString());
      if (config.minPricePerM2) params.set("minPricePerM2", config.minPricePerM2.toString());
      if (config.maxPricePerM2) params.set("maxPricePerM2", config.maxPricePerM2.toString());
      if (config.minRooms) params.set("minRooms", config.minRooms.toString());
      if (config.maxRooms) params.set("maxRooms", config.maxRooms.toString());
      if (config.trackedCities.length > 0) params.set("cities", config.trackedCities.join(","));

      const response = await fetch(`/api/v1/properties/filtered?${params}`);
      if (response.ok) {
        const data = await response.json();
        setMatchingCount(data.pagination?.total || 0);
      }
    } catch {
      // Ignore
    }
  }, [config]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      countMatching();
    }, 500);
    return () => clearTimeout(timeout);
  }, [countMatching]);

  // Save settings
  const saveSettings = async () => {
    if (!session?.user) return;

    try {
      setSaving(true);
      setSaved(false);

      const response = await fetch("/api/v1/user/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          minPrice: config.minPrice,
          maxPrice: config.maxPrice,
          minPricePerM2: config.minPricePerM2,
          maxPricePerM2: config.maxPricePerM2,
          minArea: config.minArea,
          maxArea: config.maxArea,
          minRooms: config.minRooms,
          maxRooms: config.maxRooms,
          minGrossYield: config.minGrossYield,
          maxDaysOnMarket: config.maxDaysOnMarket,
          minPriceDrop: config.minPriceDrop,
          trackedCities: JSON.stringify(config.trackedCities),
          notifyNewProperties: config.notifyNewProperties,
          notifyPriceDrops: config.notifyPriceDrops,
          telegramEnabled: config.telegramEnabled,
          telegramChatId: config.telegramChatId,
        }),
      });

      if (response.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (error) {
      console.error("Failed to save settings:", error);
    } finally {
      setSaving(false);
    }
  };

  const updateConfig = (key: keyof WatchdogConfig, value: unknown) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  const toggleCity = (city: string) => {
    setConfig((prev) => ({
      ...prev,
      trackedCities: prev.trackedCities.includes(city)
        ? prev.trackedCities.filter((c) => c !== city)
        : [...prev.trackedCities, city],
    }));
  };

  if (!session?.user) {
    return (
      <div className="bg-amber-900/20 border border-amber-800 rounded-xl p-6 text-center">
        <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto mb-4" />
        <h3 className="text-base font-semibold text-zinc-100 mb-2">Prihlás sa</h3>
        <p className="text-zinc-400">
          Pre používanie strážneho psa sa musíš prihlásiť.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Matching Count */}
      {matchingCount !== null && (
        <div className="bg-amber-900/20 border border-amber-800 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Eye className="w-6 h-6 text-amber-400" />
            <div>
              <span className="text-zinc-100 font-medium">Aktuálne vyhovuje tvojim kritériám:</span>
              <span className="text-amber-400 font-bold text-xl ml-2">{matchingCount} nehnuteľností</span>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cena */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
          <div className="flex items-center gap-2 mb-6">
            <Euro className="w-5 h-5 text-amber-400" />
            <h3 className="text-lg font-bold text-zinc-100">Cenové kritériá</h3>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Min. cena (€)</label>
                <input
                  type="number"
                  value={config.minPrice || ""}
                  onChange={(e) => updateConfig("minPrice", e.target.value ? Number(e.target.value) : null)}
                  placeholder="0"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-100 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Max. cena (€)</label>
                <input
                  type="number"
                  value={config.maxPrice || ""}
                  onChange={(e) => updateConfig("maxPrice", e.target.value ? Number(e.target.value) : null)}
                  placeholder="500000"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-100 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Min. €/m²</label>
                <input
                  type="number"
                  value={config.minPricePerM2 || ""}
                  onChange={(e) => updateConfig("minPricePerM2", e.target.value ? Number(e.target.value) : null)}
                  placeholder="0"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-100 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Max. €/m²</label>
                <input
                  type="number"
                  value={config.maxPricePerM2 || ""}
                  onChange={(e) => updateConfig("maxPricePerM2", e.target.value ? Number(e.target.value) : null)}
                  placeholder="5000"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-100 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Nehnuteľnosť */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
          <div className="flex items-center gap-2 mb-6">
            <Home className="w-5 h-5 text-amber-400" />
            <h3 className="text-lg font-bold text-zinc-100">Parametre nehnuteľnosti</h3>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-zinc-400 mb-1 flex items-center gap-1">
                  <Maximize2 className="w-4 h-4" /> Min. plocha (m²)
                </label>
                <input
                  type="number"
                  value={config.minArea || ""}
                  onChange={(e) => updateConfig("minArea", e.target.value ? Number(e.target.value) : null)}
                  placeholder="30"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-100 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1 flex items-center gap-1">
                  <Maximize2 className="w-4 h-4" /> Max. plocha (m²)
                </label>
                <input
                  type="number"
                  value={config.maxArea || ""}
                  onChange={(e) => updateConfig("maxArea", e.target.value ? Number(e.target.value) : null)}
                  placeholder="200"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-100 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-zinc-400 mb-1 flex items-center gap-1">
                  <BedDouble className="w-4 h-4" /> Min. izby
                </label>
                <input
                  type="number"
                  value={config.minRooms || ""}
                  onChange={(e) => updateConfig("minRooms", e.target.value ? Number(e.target.value) : null)}
                  placeholder="1"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-100 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1 flex items-center gap-1">
                  <BedDouble className="w-4 h-4" /> Max. izby
                </label>
                <input
                  type="number"
                  value={config.maxRooms || ""}
                  onChange={(e) => updateConfig("maxRooms", e.target.value ? Number(e.target.value) : null)}
                  placeholder="5"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-100 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Výhodnosť */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
          <div className="flex items-center gap-2 mb-6">
            <TrendingDown className="w-5 h-5 text-amber-400" />
            <h3 className="text-lg font-bold text-zinc-100">Kritériá výhodnosti</h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-zinc-400 mb-1 flex items-center gap-1">
                <Percent className="w-4 h-4" /> Min. hrubý výnos (%)
              </label>
              <input
                type="number"
                step="0.1"
                value={config.minGrossYield || ""}
                onChange={(e) => updateConfig("minGrossYield", e.target.value ? Number(e.target.value) : null)}
                placeholder="5.0"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-100 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              />
              <p className="text-xs text-zinc-500 mt-1">Upozorním ťa na nehnuteľnosti s vyšším výnosom</p>
            </div>

            <div>
              <label className="block text-sm text-zinc-400 mb-1 flex items-center gap-1">
                <Clock className="w-4 h-4" /> Max. dní na trhu
              </label>
              <input
                type="number"
                value={config.maxDaysOnMarket || ""}
                onChange={(e) => updateConfig("maxDaysOnMarket", e.target.value ? Number(e.target.value) : null)}
                placeholder="30"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-100 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              />
              <p className="text-xs text-zinc-500 mt-1">Len čerstvé ponuky</p>
            </div>

            <div>
              <label className="block text-sm text-zinc-400 mb-1 flex items-center gap-1">
                <TrendingDown className="w-4 h-4" /> Min. pokles ceny (%)
              </label>
              <input
                type="number"
                step="1"
                value={config.minPriceDrop || ""}
                onChange={(e) => updateConfig("minPriceDrop", e.target.value ? Number(e.target.value) : null)}
                placeholder="10"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-100 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              />
              <p className="text-xs text-zinc-500 mt-1">Upozorním ťa na výrazné zľavy</p>
            </div>
          </div>
        </div>

        {/* Lokality */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
          <div className="flex items-center gap-2 mb-6">
            <MapPin className="w-5 h-5 text-amber-400" />
            <h3 className="text-lg font-bold text-zinc-100">Sledované mestá</h3>
          </div>

          <div className="flex flex-wrap gap-2">
            {CITIES.map((city) => (
              <button
                key={city}
                onClick={() => toggleCity(city)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  config.trackedCities.includes(city)
                    ? "bg-amber-500 text-zinc-900"
                    : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                }`}
              >
                {city}
              </button>
            ))}
          </div>
          
          {config.trackedCities.length === 0 && (
            <p className="text-zinc-500 text-sm mt-4">
              Ak nevyberieš žiadne mesto, budem sledovať všetky.
            </p>
          )}
        </div>
      </div>

      {/* Notifikácie */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
        <div className="flex items-center gap-2 mb-6">
          <Bell className="w-5 h-5 text-amber-400" />
          <h3 className="text-lg font-bold text-zinc-100">Notifikácie</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <label className="flex items-center gap-3 p-4 bg-zinc-800/50 rounded-lg cursor-pointer hover:bg-zinc-800">
            <input
              type="checkbox"
              checked={config.notifyNewProperties}
              onChange={(e) => updateConfig("notifyNewProperties", e.target.checked)}
              className="w-5 h-5 rounded border-zinc-600 bg-zinc-700 text-amber-500 focus:ring-amber-500"
            />
            <div>
              <span className="text-zinc-100 font-medium">Nové nehnuteľnosti</span>
              <p className="text-sm text-zinc-400">Upozornenie na nové ponuky</p>
            </div>
          </label>

          <label className="flex items-center gap-3 p-4 bg-zinc-800/50 rounded-lg cursor-pointer hover:bg-zinc-800">
            <input
              type="checkbox"
              checked={config.notifyPriceDrops}
              onChange={(e) => updateConfig("notifyPriceDrops", e.target.checked)}
              className="w-5 h-5 rounded border-zinc-600 bg-zinc-700 text-amber-500 focus:ring-amber-500"
            />
            <div>
              <span className="text-zinc-100 font-medium">Poklesy cien</span>
              <p className="text-sm text-zinc-400">Upozornenie na zľavy</p>
            </div>
          </label>

          <label className="flex items-center gap-3 p-4 bg-zinc-800/50 rounded-lg cursor-pointer hover:bg-zinc-800">
            <input
              type="checkbox"
              checked={config.telegramEnabled}
              onChange={(e) => updateConfig("telegramEnabled", e.target.checked)}
              className="w-5 h-5 rounded border-zinc-600 bg-zinc-700 text-amber-500 focus:ring-amber-500"
            />
            <div>
              <span className="text-zinc-100 font-medium">Telegram</span>
              <p className="text-sm text-zinc-400">Posielať na Telegram</p>
            </div>
          </label>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={saveSettings}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-500/50 text-zinc-900 font-bold rounded-xl transition-colors"
        >
          {saving ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : saved ? (
            <CheckCircle2 className="w-5 h-5" />
          ) : (
            <Save className="w-5 h-5" />
          )}
          {saving ? "Ukladám..." : saved ? "Uložené!" : "Uložiť nastavenia"}
        </button>
      </div>
    </div>
  );
}
