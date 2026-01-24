"use client";

import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MapPin, TrendingUp, Bell, Save, Settings as SettingsIcon } from "lucide-react";
import { AdvancedFilters } from "@/components/dashboard/AdvancedFilters";

const SLOVAK_CITIES = [
  { value: "BRATISLAVA", label: "Bratislava" },
  { value: "KOSICE", label: "Košice" },
  { value: "PRESOV", label: "Prešov" },
  { value: "ZILINA", label: "Žilina" },
  { value: "BANSKA_BYSTRICA", label: "Banská Bystrica" },
  { value: "TRNAVA", label: "Trnava" },
  { value: "TRENCIN", label: "Trenčín" },
  { value: "NITRA", label: "Nitra" },
] as const;

const INVESTMENT_TYPES = [
  { id: "future-potential", label: "Investície s budúcim potenciálom" },
  { id: "high-yield", label: "Vysoký výnos" },
  { id: "stable-growth", label: "Stabilný rast" },
  { id: "flip", label: "Flip (kúpa a predaj)" },
  { id: "rental", label: "Dlhodobý nájom" },
] as const;

async function fetchPreferences() {
  try {
    const response = await fetch("/api/v1/user/preferences");
    if (!response.ok) {
      // Return null for non-OK responses (like 401) instead of throwing
      return null;
    }
    const data = await response.json();
    if (!data.success) {
      return null;
    }
    return data.data;
  } catch (error) {
    console.error("Error fetching preferences:", error);
    return null;
  }
}

async function savePreferences(preferences: any) {
  const response = await fetch("/api/v1/user/preferences", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(preferences),
  });
  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error || "Failed to save preferences");
  }
  return data.data;
}

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { data: preferences, isLoading, isError } = useQuery({
    queryKey: ["user-preferences"],
    queryFn: fetchPreferences,
    retry: 1,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const saveMutation = useMutation({
    mutationFn: savePreferences,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-preferences"] });
      alert("Preferencie boli uložené!");
    },
  });

  const [formData, setFormData] = useState({
    primaryCity: null as string | null,
    trackedCities: [] as string[],
    investmentType: null as string | null,
    minYield: null as number | null,
    maxPrice: null as number | null,
    notifyMarketGaps: true,
    notifyPriceDrops: true,
    notifyNewProperties: true,
    notifyUrbanDevelopment: true,
  });

  useEffect(() => {
    if (preferences) {
      setFormData({
        primaryCity: preferences.primaryCity || null,
        trackedCities: preferences.trackedCities
          ? JSON.parse(preferences.trackedCities)
          : [],
        investmentType: preferences.investmentType || null,
        minYield: preferences.minYield || null,
        maxPrice: preferences.maxPrice || null,
        notifyMarketGaps: preferences.notifyMarketGaps ?? true,
        notifyPriceDrops: preferences.notifyPriceDrops ?? true,
        notifyNewProperties: preferences.notifyNewProperties ?? true,
        notifyUrbanDevelopment: preferences.notifyUrbanDevelopment ?? true,
      });
    }
  }, [preferences]);

  const handleSave = useCallback(() => {
    saveMutation.mutate({
      ...formData,
      onboardingCompleted: true,
    });
  }, [formData, saveMutation]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-100 mb-2">Nastavenia</h1>
          <p className="text-slate-400">Načítavam preferencie...</p>
        </div>
        <div className="animate-pulse space-y-4">
          <div className="h-40 bg-slate-800 rounded-xl" />
          <div className="h-40 bg-slate-800 rounded-xl" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-100 mb-2">Nastavenia</h1>
          <p className="text-red-400">Nepodarilo sa načítať preferencie. Skúste obnoviť stránku.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-100 mb-2">Nastavenia</h1>
          <p className="text-slate-400">
            Spravujte svoje preferencie a filtre
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saveMutation.isPending}
          className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          {saveMutation.isPending ? "Ukladám..." : "Uložiť zmeny"}
        </button>
      </div>

      {/* Lokalita */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
        <div className="flex items-center gap-2 mb-6">
          <MapPin className="w-5 h-5 text-emerald-400" />
          <h2 className="text-xl font-bold text-slate-100">Lokalita</h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-slate-300 mb-2 font-medium">
              Hlavné mesto záujmu
            </label>
            <select
              value={formData.primaryCity || ""}
              onChange={(e) =>
                setFormData({ ...formData, primaryCity: e.target.value || null })
              }
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">Vyberte mesto</option>
              {SLOVAK_CITIES.map((city) => (
                <option key={city.value} value={city.value}>
                  {city.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-300 mb-2 font-medium">
              Sledované mestá
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {SLOVAK_CITIES.map((city) => (
                <label
                  key={city.value}
                  className="flex items-center gap-2 p-3 rounded-lg border border-slate-700 bg-slate-800 cursor-pointer hover:border-slate-600 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={formData.trackedCities.includes(city.value)}
                    onChange={(e) => {
                      const cities = e.target.checked
                        ? [...formData.trackedCities, city.value]
                        : formData.trackedCities.filter((c) => c !== city.value);
                      setFormData({ ...formData, trackedCities: cities });
                    }}
                    className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-emerald-500 focus:ring-emerald-500"
                  />
                  <span className="text-sm text-slate-300">{city.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Typ investície */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
        <div className="flex items-center gap-2 mb-6">
          <TrendingUp className="w-5 h-5 text-emerald-400" />
          <h2 className="text-xl font-bold text-slate-100">Typ investície</h2>
        </div>

        <div className="space-y-3">
          {INVESTMENT_TYPES.map((type) => (
            <label
              key={type.id}
              className="flex items-center gap-3 p-4 rounded-lg border border-slate-700 bg-slate-800 cursor-pointer hover:border-slate-600 transition-colors"
            >
              <input
                type="radio"
                name="investmentType"
                value={type.id}
                checked={formData.investmentType === type.id}
                onChange={(e) =>
                  setFormData({ ...formData, investmentType: e.target.value })
                }
                className="w-4 h-4 border-slate-600 bg-slate-700 text-emerald-500 focus:ring-emerald-500"
              />
              <span className="text-slate-300">{type.label}</span>
            </label>
          ))}
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-slate-300 mb-2 font-medium">
              Minimálny výnos (%)
            </label>
            <input
              type="number"
              value={formData.minYield || ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  minYield: e.target.value ? parseFloat(e.target.value) : null,
                })
              }
              placeholder="Napríklad 5.0"
              step="0.1"
              min="0"
              max="20"
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="block text-slate-300 mb-2 font-medium">
              Maximálna cena (€)
            </label>
            <input
              type="number"
              value={formData.maxPrice || ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  maxPrice: e.target.value ? parseFloat(e.target.value) : null,
                })
              }
              placeholder="Napríklad 200000"
              step="1000"
              min="0"
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>
      </div>

      {/* Pokročilé filtre */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
        <div className="flex items-center gap-2 mb-6">
          <SettingsIcon className="w-5 h-5 text-emerald-400" />
          <h2 className="text-xl font-bold text-slate-100">Pokročilé filtre</h2>
        </div>
        <p className="text-slate-400 mb-4 text-sm">
          Nastavte pokročilé filtre pre presné vyhľadávanie nehnuteľností
        </p>
        <AdvancedFilters />
      </div>

      {/* Notifikácie */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
        <div className="flex items-center gap-2 mb-6">
          <Bell className="w-5 h-5 text-emerald-400" />
          <h2 className="text-xl font-bold text-slate-100">Notifikácie</h2>
        </div>

        <div className="space-y-4">
          {[
            {
              id: "notifyMarketGaps",
              title: "Index skrytého potenciálu",
              description: "Upozornenia na podhodnotené nehnuteľnosti",
            },
            {
              id: "notifyPriceDrops",
              title: "Poklesy cien",
              description: "Keď cena nehnuteľnosti klesne",
            },
            {
              id: "notifyNewProperties",
              title: "Nové nehnuteľnosti",
              description: "Nové príležitosti vo vašich sledovaných mestách",
            },
            {
              id: "notifyUrbanDevelopment",
              title: "Urbanistický rozvoj",
              description: "Plánovaná infraštruktúra vo vašich lokalitách",
            },
          ].map((notif) => (
            <label
              key={notif.id}
              className="flex items-start gap-4 p-4 rounded-lg border border-slate-700 bg-slate-800 cursor-pointer hover:border-slate-600 transition-colors"
            >
              <input
                type="checkbox"
                checked={formData[notif.id as keyof typeof formData] as boolean}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    [notif.id]: e.target.checked,
                  } as any)
                }
                className="mt-1 w-5 h-5 rounded border-slate-600 bg-slate-700 text-emerald-500 focus:ring-emerald-500"
              />
              <div>
                <h3 className="font-semibold text-slate-100 mb-1">
                  {notif.title}
                </h3>
                <p className="text-sm text-slate-400">{notif.description}</p>
              </div>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
