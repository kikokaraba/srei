"use client";

import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { TrendingUp, Bell, Save, Settings as SettingsIcon, Check, Sparkles, Map } from "lucide-react";
import { AdvancedFilters } from "@/components/dashboard/AdvancedFilters";
import { LocationPicker } from "@/components/ui/LocationPicker";

const INVESTMENT_TYPES = [
  { id: "future-potential", label: "Investície s budúcim potenciálom", icon: "🚀" },
  { id: "high-yield", label: "Vysoký výnos", icon: "💰" },
  { id: "stable-growth", label: "Stabilný rast", icon: "📈" },
  { id: "flip", label: "Flip (kúpa a predaj)", icon: "🔄" },
  { id: "rental", label: "Dlhodobý nájom", icon: "🏠" },
] as const;

async function fetchPreferences() {
  try {
    const response = await fetch("/api/v1/user/preferences");
    if (!response.ok) return null;
    const data = await response.json();
    return data.success ? data.data : null;
  } catch {
    return null;
  }
}

async function savePreferences(preferences: Record<string, unknown>) {
  const response = await fetch("/api/v1/user/preferences", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(preferences),
  });
  const data = await response.json();
  if (!data.success) throw new Error(data.error);
  return data.data;
}

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { data: preferences, isLoading } = useQuery({
    queryKey: ["user-preferences"],
    queryFn: fetchPreferences,
    retry: 1,
    staleTime: 1000 * 60 * 5,
  });

  const saveMutation = useMutation({
    mutationFn: savePreferences,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-preferences"] });
    },
  });

  const [formData, setFormData] = useState({
    trackedRegions: [] as string[],
    trackedDistricts: [] as string[],
    trackedCities: [] as string[],
    investmentTypes: [] as string[],
    minYield: null as number | null,
    maxPrice: null as number | null,
    notifyMarketGaps: true,
    notifyPriceDrops: true,
    notifyNewProperties: true,
    notifyUrbanDevelopment: true,
  });

  const [saved, setSaved] = useState(false);

  // Helper function to safely parse JSON
  const safeJsonParse = (value: string | null | undefined, fallback: unknown[] = []): unknown[] => {
    if (!value || value === "" || value === "null") return fallback;
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : fallback;
    } catch {
      return fallback;
    }
  };

  useEffect(() => {
    if (preferences) {
      // Handle both old single investmentType and new investmentTypes array
      let investmentTypes: string[] = [];
      if (preferences.investmentTypes) {
        investmentTypes = safeJsonParse(preferences.investmentTypes, []) as string[];
      } else if (preferences.investmentType) {
        investmentTypes = [preferences.investmentType];
      }
      
      setFormData({
        trackedRegions: safeJsonParse(preferences.trackedRegions, []) as string[],
        trackedDistricts: safeJsonParse(preferences.trackedDistricts, []) as string[],
        trackedCities: safeJsonParse(preferences.trackedCities, []) as string[],
        investmentTypes,
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
      trackedRegions: formData.trackedRegions,
      trackedDistricts: formData.trackedDistricts,
      trackedCities: formData.trackedCities,
      investmentTypes: formData.investmentTypes,
      minYield: formData.minYield,
      maxPrice: formData.maxPrice,
      notifyMarketGaps: formData.notifyMarketGaps,
      notifyPriceDrops: formData.notifyPriceDrops,
      notifyNewProperties: formData.notifyNewProperties,
      notifyUrbanDevelopment: formData.notifyUrbanDevelopment,
      onboardingCompleted: true,
    }, {
      onSuccess: () => {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    });
  }, [formData, saveMutation]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 p-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-slate-800 rounded-lg w-1/3" />
            <div className="h-4 bg-slate-800 rounded w-1/2" />
          </div>
        </div>
        <div className="grid gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-48 bg-slate-900 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const notifications = [
    { id: "notifyMarketGaps", title: "Index skrytého potenciálu", desc: "Podhodnotené nehnuteľnosti", icon: "🎯" },
    { id: "notifyPriceDrops", title: "Poklesy cien", desc: "Keď cena nehnuteľnosti klesne", icon: "📉" },
    { id: "notifyNewProperties", title: "Nové nehnuteľnosti", desc: "Nové príležitosti", icon: "🆕" },
    { id: "notifyUrbanDevelopment", title: "Urbanistický rozvoj", desc: "Plánovaná infraštruktúra", icon: "🏗️" },
  ];

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 p-6 lg:p-8">
        <div className="absolute -top-24 -right-24 w-48 h-48 rounded-full blur-3xl opacity-10 bg-emerald-500" />
        
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-600 flex items-center justify-center shadow-lg shrink-0">
              <SettingsIcon className="w-7 h-7 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-2xl lg:text-3xl font-bold text-white">Nastavenia</h1>
                <Sparkles className="w-5 h-5 text-slate-400" />
              </div>
              <p className="text-slate-400 text-sm lg:text-base">
                Prispôsobte si dashboard a notifikácie
              </p>
            </div>
          </div>
          
          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={saveMutation.isPending}
            className={`px-6 py-3 font-semibold rounded-xl transition-all flex items-center gap-2 ${
              saved 
                ? "bg-emerald-500 text-white" 
                : "bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:shadow-lg hover:shadow-emerald-500/25"
            } disabled:opacity-50`}
          >
            {saved ? <Check className="w-5 h-5" /> : <Save className="w-5 h-5" />}
            {saveMutation.isPending ? "Ukladám..." : saved ? "Uložené!" : "Uložiť zmeny"}
          </button>
        </div>
      </div>

      {/* Lokalita - Full width */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950/20 p-6">
        <div className="absolute -top-24 -right-24 w-48 h-48 rounded-full blur-3xl opacity-10 bg-blue-500" />
        
        <div className="relative">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
              <Map className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Sledované lokality</h2>
              <p className="text-sm text-slate-400">Vyberte kraje, okresy alebo konkrétne mestá</p>
            </div>
          </div>

          <LocationPicker
            selectedRegions={formData.trackedRegions}
            selectedDistricts={formData.trackedDistricts}
            selectedCities={formData.trackedCities}
            onRegionsChange={(regions) => setFormData({ ...formData, trackedRegions: regions })}
            onDistrictsChange={(districts) => setFormData({ ...formData, trackedDistricts: districts })}
            onCitiesChange={(cities) => setFormData({ ...formData, trackedCities: cities })}
          />
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">

        {/* Typ investície */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/20 p-6">
          <div className="absolute -top-24 -right-24 w-48 h-48 rounded-full blur-3xl opacity-10 bg-amber-500" />
          
          <div className="relative">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-xl font-bold text-white">Typ investície</h2>
            </div>

            <p className="text-xs text-slate-500 mb-3">Môžete vybrať viac možností</p>
            <div className="space-y-2">
              {INVESTMENT_TYPES.map((type) => {
                const isSelected = formData.investmentTypes.includes(type.id);
                return (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => {
                      if (isSelected) {
                        setFormData({ 
                          ...formData, 
                          investmentTypes: formData.investmentTypes.filter(t => t !== type.id) 
                        });
                      } else {
                        setFormData({ 
                          ...formData, 
                          investmentTypes: [...formData.investmentTypes, type.id] 
                        });
                      }
                    }}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left ${
                      isSelected
                        ? "bg-amber-500/20 border border-amber-500/50"
                        : "bg-slate-800/30 border border-slate-700/50 hover:bg-slate-800/50"
                    }`}
                  >
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                      isSelected
                        ? "bg-amber-500 border-amber-500"
                        : "border-slate-600 hover:border-slate-500"
                    }`}>
                      {isSelected && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <span className="text-xl">{type.icon}</span>
                    <span className={isSelected ? "text-white font-medium" : "text-slate-300"}>
                      {type.label}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-2 gap-3 mt-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Min. výnos (%)</label>
                <input
                  type="number"
                  value={formData.minYield || ""}
                  onChange={(e) => setFormData({ ...formData, minYield: e.target.value ? parseFloat(e.target.value) : null })}
                  placeholder="5.0"
                  step="0.1"
                  className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white text-sm
                             focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Max. cena (€)</label>
                <input
                  type="number"
                  value={formData.maxPrice || ""}
                  onChange={(e) => setFormData({ ...formData, maxPrice: e.target.value ? parseFloat(e.target.value) : null })}
                  placeholder="200000"
                  step="1000"
                  className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white text-sm
                             focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Notifikácie */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-violet-950/20 p-6">
        <div className="absolute -top-24 -right-24 w-48 h-48 rounded-full blur-3xl opacity-10 bg-violet-500" />
        
        <div className="relative">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
              <Bell className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-bold text-white">Notifikácie</h2>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            {notifications.map((notif) => (
              <button
                key={notif.id}
                type="button"
                onClick={() => setFormData({ ...formData, [notif.id]: !formData[notif.id as keyof typeof formData] })}
                className={`flex items-center gap-3 p-4 rounded-xl transition-all text-left ${
                  formData[notif.id as keyof typeof formData]
                    ? "bg-violet-500/20 border border-violet-500/50"
                    : "bg-slate-800/30 border border-slate-700/50"
                }`}
              >
                <span className="text-2xl">{notif.icon}</span>
                <div className="flex-1">
                  <p className={`font-medium ${formData[notif.id as keyof typeof formData] ? "text-white" : "text-slate-400"}`}>
                    {notif.title}
                  </p>
                  <p className="text-xs text-slate-500">{notif.desc}</p>
                </div>
                <div className={`w-10 h-6 rounded-full transition-all ${
                  formData[notif.id as keyof typeof formData] ? "bg-violet-500" : "bg-slate-700"
                }`}>
                  <div className={`w-5 h-5 rounded-full bg-white shadow transition-all mt-0.5 ${
                    formData[notif.id as keyof typeof formData] ? "ml-4.5 translate-x-0.5" : "ml-0.5"
                  }`} />
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Pokročilé filtre */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 p-6">
        <div className="relative">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-600 to-slate-500 flex items-center justify-center">
              <SettingsIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Pokročilé filtre</h2>
              <p className="text-sm text-slate-400">Presné vyhľadávanie nehnuteľností</p>
            </div>
          </div>
          
          <AdvancedFilters />
        </div>
      </div>
    </div>
  );
}
