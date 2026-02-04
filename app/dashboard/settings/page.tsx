"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { TrendingUp, Bell, Save, Settings as SettingsIcon, Check, Sparkles, Map, Crosshair, Filter, Eye } from "lucide-react";
import { AdvancedFilters } from "@/components/dashboard/AdvancedFilters";
import { LocationPickerV2 } from "@/components/ui/LocationPickerV2";
import { TelegramSettings } from "@/components/dashboard/TelegramSettings";
import { useToast } from "@/lib/hooks/useToast";
import type { NormalizedSelection } from "@/lib/location-utils";
import { REGION_LABELS, INVESTMENT_TYPE_LABELS, CONDITION_OPTIONS, ENERGY_CERTIFICATE_OPTIONS } from "@/lib/constants/labels";
import { DISTRICTS } from "@/lib/constants/slovakia-locations";

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
  const { showSuccess } = useToast();
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
    investmentGoal: null as string | null,
    riskTolerance: null as string | null,
    budget: null as number | null,
    minYield: null as number | null,
    maxPrice: null as number | null,
    minGrossYield: null as number | null,
    onlyDistressed: false,
    minPriceDrop: null as number | null,
    minGapPercentage: null as number | null,
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

      const trackedRegions = safeJsonParse(preferences.trackedRegions, []) as string[];
      const trackedDistricts = safeJsonParse(preferences.trackedDistricts, []) as string[];
      const trackedCities = safeJsonParse(preferences.trackedCities, []) as string[];

      const prefsRecord = preferences as Record<string, unknown>;
      setFormData({
        trackedRegions,
        trackedDistricts,
        trackedCities,
        investmentTypes,
        investmentGoal: (prefsRecord.investmentGoal as string) ?? null,
        riskTolerance: (prefsRecord.riskTolerance as string) ?? null,
        budget: (prefsRecord.budget as number) ?? null,
        minYield: preferences.minYield ?? null,
        maxPrice: preferences.maxPrice ?? null,
        minGrossYield: preferences.minGrossYield ?? null,
        onlyDistressed: preferences.onlyDistressed ?? false,
        minPriceDrop: preferences.minPriceDrop ?? null,
        minGapPercentage: preferences.minGapPercentage ?? null,
        notifyMarketGaps: preferences.notifyMarketGaps ?? true,
        notifyPriceDrops: preferences.notifyPriceDrops ?? true,
        notifyNewProperties: preferences.notifyNewProperties ?? true,
        notifyUrbanDevelopment: preferences.notifyUrbanDevelopment ?? true,
      });
    }
  }, [preferences]);

  const handleSave = useCallback(() => {
    const dataToSave = {
      trackedRegions: formData.trackedRegions,
      trackedDistricts: formData.trackedDistricts,
      trackedCities: formData.trackedCities,
      investmentTypes: formData.investmentTypes,
      investmentGoal: formData.investmentGoal,
      riskTolerance: formData.riskTolerance,
      budget: formData.budget,
      minYield: formData.minYield,
      maxPrice: formData.maxPrice,
      minGrossYield: formData.minGrossYield,
      onlyDistressed: formData.onlyDistressed,
      minPriceDrop: formData.minPriceDrop,
      minGapPercentage: formData.minGapPercentage,
      notifyMarketGaps: formData.notifyMarketGaps,
      notifyPriceDrops: formData.notifyPriceDrops,
      notifyNewProperties: formData.notifyNewProperties,
      notifyUrbanDevelopment: formData.notifyUrbanDevelopment,
      onboardingCompleted: true,
    };

    saveMutation.mutate(dataToSave, {
      onSuccess: () => {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
        const yieldVal = formData.minYield ?? formData.minGrossYield;
        if (yieldVal != null && yieldVal > 0) {
          showSuccess(
            "Investičný profil bol aktualizovaný.",
            `Váš dashboard teraz prioritizuje ponuky s výnosom nad ${yieldVal}%.`
          );
        } else {
          showSuccess("Investičný profil bol aktualizovaný.", undefined);
        }
      },
      onError: (error) => {
        console.error("Save error:", error);
      },
    });
  }, [formData, saveMutation, showSuccess]);

  // Prehľad uložených filtrov – čo sa reálne používa pri vyhľadávaní a na dashboarde (hook pred akýmkoľvek return)
  const activeSummary = useMemo(() => {
    const items: { label: string; value: string; desc?: string }[] = [];
    if (!preferences) return items;

    const regions = safeJsonParse(preferences.trackedRegions, []) as string[];
    const districts = safeJsonParse(preferences.trackedDistricts, []) as string[];
    const cities = safeJsonParse(preferences.trackedCities, []) as string[];
    const investmentTypes = safeJsonParse(preferences.investmentTypes, []) as string[];
    if (preferences.investmentType && !investmentTypes.length) investmentTypes.push(preferences.investmentType as string);
    const condition = safeJsonParse(preferences.condition, []) as string[];
    const energyCertificates = safeJsonParse(preferences.energyCertificates, []) as string[];

    if (regions.length > 0) {
      const names = regions.map((id: string) => REGION_LABELS[id] || id).join(", ");
      items.push({ label: "Kraje", value: names, desc: "Nehnuteľnosti len z týchto krajov" });
    }
    if (districts.length > 0) {
      const names = districts.map((id: string) => DISTRICTS[id]?.name || id).join(", ");
      items.push({ label: "Okresy", value: names, desc: "Z týchto okresov" });
    }
    if (cities.length > 0) {
      items.push({ label: "Mestá / obce", value: cities.slice(0, 8).join(", ") + (cities.length > 8 ? "…" : ""), desc: "Konkrétne lokality" });
    }
    if (investmentTypes.length > 0) {
      const names = investmentTypes.map((id: string) => INVESTMENT_TYPE_LABELS[id as keyof typeof INVESTMENT_TYPE_LABELS] || id).join(", ");
      items.push({ label: "Typ investície", value: names, desc: "Váš investičný zameranie" });
    }
    if (preferences.minYield != null && preferences.minYield > 0) {
      items.push({ label: "Min. výnos", value: `${preferences.minYield}%`, desc: "Ponuky s výnosom od tohto %" });
    }
    if (preferences.maxPrice != null && preferences.maxPrice > 0) {
      items.push({ label: "Max. cena", value: `${Number(preferences.maxPrice).toLocaleString("sk-SK")} €`, desc: "Neprevyšujte túto sumu" });
    }
    if (preferences.minGrossYield != null && preferences.minGrossYield > 0) {
      items.push({ label: "Min. hrubý výnos", value: `${preferences.minGrossYield}%`, desc: "Pre notifikácie a Hunter" });
    }
    if (preferences.minPriceDrop != null && preferences.minPriceDrop > 0) {
      items.push({ label: "Min. pokles ceny", value: `${preferences.minPriceDrop}%`, desc: "Upozorniť pri poklese" });
    }
    if (preferences.minGapPercentage != null && preferences.minGapPercentage > 0) {
      items.push({ label: "Min. podhodnotenie (Market Gap)", value: `${preferences.minGapPercentage}%`, desc: "Index skrytého potenciálu" });
    }
    if (preferences.onlyDistressed) {
      items.push({ label: "Len v núdzi", value: "Áno", desc: "Exekúcie / problémové" });
    }
    if (preferences.minPrice != null || preferences.maxPrice != null) {
      const parts = [];
      if (preferences.minPrice != null) parts.push(`od ${Number(preferences.minPrice).toLocaleString("sk-SK")} €`);
      if (preferences.maxPrice != null) parts.push(`do ${Number(preferences.maxPrice).toLocaleString("sk-SK")} €`);
      items.push({ label: "Cena (pokročilé)", value: parts.join(" "), desc: "Rozsah cien" });
    }
    if (preferences.minArea != null || preferences.maxArea != null) {
      const parts = [];
      if (preferences.minArea != null) parts.push(`${preferences.minArea} m²`);
      if (preferences.maxArea != null) parts.push(`– ${preferences.maxArea} m²`);
      items.push({ label: "Plocha", value: parts.join(" "), desc: "Rozsah plochy" });
    }
    if (preferences.minRooms != null || preferences.maxRooms != null) {
      const parts = [];
      if (preferences.minRooms != null) parts.push(String(preferences.minRooms));
      if (preferences.maxRooms != null) parts.push(`– ${preferences.maxRooms}`);
      items.push({ label: "Počet izieb", value: parts.join(" "), desc: "Rozsah izieb" });
    }
    if (condition.length > 0) {
      const names = condition.map((c: string) => CONDITION_OPTIONS.find((x) => x.value === c)?.label ?? c).join(", ");
      items.push({ label: "Stav nehnuteľnosti", value: names, desc: "Povolené stavy" });
    }
    if (energyCertificates.length > 0) {
      const names = energyCertificates.map((c: string) => ENERGY_CERTIFICATE_OPTIONS.find((x) => x.value === c)?.label ?? c).join(", ");
      items.push({ label: "Energetická trieda", value: names, desc: "Povolené triedy" });
    }
    if (preferences.minFloor != null || preferences.maxFloor != null) {
      const parts = [];
      if (preferences.minFloor != null) parts.push(String(preferences.minFloor));
      if (preferences.maxFloor != null) parts.push(`– ${preferences.maxFloor}`);
      items.push({ label: "Poschodie", value: parts.join(" "), desc: "Rozsah poschodia" });
    }
    if (preferences.maxDaysOnMarket != null && preferences.maxDaysOnMarket > 0) {
      items.push({ label: "Max. dni v ponuke", value: String(preferences.maxDaysOnMarket), desc: "Čerstvosť ponuky" });
    }
    return items;
  }, [preferences]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800 p-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-zinc-800 rounded-lg w-1/3" />
            <div className="h-4 bg-zinc-800 rounded w-1/2" />
          </div>
        </div>
        <div className="grid gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-48 bg-zinc-900 rounded-2xl animate-pulse" />
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
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800 p-6 lg:p-8">
        <div className="absolute -top-24 -right-24 w-48 h-48 rounded-full blur-3xl opacity-10 bg-emerald-500" />
        
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-zinc-700 to-zinc-600 flex items-center justify-center shadow-lg shrink-0">
              <SettingsIcon className="w-7 h-7 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-2xl lg:text-3xl font-bold text-white">Nastavenia</h1>
                <Sparkles className="w-5 h-5 text-zinc-400" />
              </div>
              <p className="text-zinc-400 text-sm lg:text-base">
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

      {/* Váš investičný profil – prehľad aktívnych filtrov */}
      <div className="relative overflow-hidden rounded-2xl border-2 border-emerald-500/30 bg-gradient-to-br from-emerald-950/40 via-zinc-900 to-zinc-900 p-6">
        <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-2xl opacity-20 bg-emerald-500" />
        <div className="relative flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0">
            <Eye className="w-6 h-6 text-emerald-400" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-1">
              <Filter className="w-5 h-5 text-emerald-400" />
              Čo sa vám zobrazuje
            </h2>
            <p className="text-sm text-zinc-400 mb-4">
              Na základe týchto nastavení sa na dashboarde a pri vyhľadávaní zobrazujú len nehnuteľnosti, ktoré spĺňajú vaše kritériá. Nižšie môžete upraviť lokality, typ investície a pokročilé filtre.
            </p>
            {activeSummary.length > 0 ? (
              <div className="flex flex-wrap gap-3">
                {activeSummary.map((item, idx) => (
                  <div
                    key={idx}
                    className="inline-flex flex-col gap-0.5 px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-left"
                  >
                    <span className="text-[10px] uppercase tracking-wider text-emerald-400/90 font-semibold">{item.label}</span>
                    <span className="text-sm font-medium text-white">{item.value}</span>
                    {item.desc && <span className="text-[11px] text-zinc-500">{item.desc}</span>}
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl bg-zinc-800/50 border border-zinc-700/50 px-4 py-3 text-sm text-zinc-400">
                Nemáte nastavené žiadne filtre. Vyberte nižšie <strong className="text-zinc-300">sledované lokality</strong>, <strong className="text-zinc-300">typ investície</strong> a prípadne <strong className="text-zinc-300">pokročilé filtre</strong> – potom sa vám bude zobrazovať len to, čo hľadáte.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Lokalita - Full width */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-900 via-zinc-900 to-blue-950/20 p-6">
        <div className="absolute -top-24 -right-24 w-48 h-48 rounded-full blur-3xl opacity-10 bg-blue-500" />
        
        <div className="relative">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
              <Map className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Sledované lokality</h2>
              <p className="text-sm text-zinc-400">Vyberte kraje, okresy alebo konkrétne mestá</p>
            </div>
          </div>

          <LocationPickerV2
            selectedRegions={formData.trackedRegions}
            selectedDistricts={formData.trackedDistricts}
            selectedCities={formData.trackedCities}
            onChange={(selection: NormalizedSelection) => setFormData({ 
              ...formData, 
              trackedRegions: selection.regions,
              trackedDistricts: selection.districts,
              trackedCities: selection.cities,
            })}
          />
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">

        {/* Typ investície */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-900 via-zinc-900 to-amber-950/20 p-6">
          <div className="absolute -top-24 -right-24 w-48 h-48 rounded-full blur-3xl opacity-10 bg-amber-500" />
          
          <div className="relative">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-xl font-bold text-white">Typ investície</h2>
            </div>

            <p className="text-sm text-zinc-400 mb-3">
              Podľa zvoleného typu systém pri vyhľadávaní <strong className="text-zinc-300">uprednostní ponuky, ktoré vám sedia</strong>: pri „Vysoký výnos“ / „Dlhodobý nájom“ zoradí podľa výnosu, pri „Flip“ podľa čerstvosti ponuky (dni v ponuke). Odporúčame doplniť nižšie min. výnos a max. cenu.
            </p>
            <p className="text-xs text-zinc-500 mb-3">Môžete vybrať viac možností</p>
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
                        : "bg-zinc-800/30 border border-zinc-700/50 hover:bg-zinc-800/50"
                    }`}
                  >
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                      isSelected
                        ? "bg-amber-500 border-amber-500"
                        : "border-zinc-600 hover:border-zinc-500"
                    }`}>
                      {isSelected && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <span className="text-xl">{type.icon}</span>
                    <span className={isSelected ? "text-white font-medium" : "text-zinc-300"}>
                      {type.label}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-2 gap-3 mt-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Min. výnos (%)</label>
                <input
                  type="number"
                  value={formData.minYield || ""}
                  onChange={(e) => setFormData({ ...formData, minYield: e.target.value ? parseFloat(e.target.value) : null })}
                  placeholder="5.0"
                  step="0.1"
                  className="w-full px-3 py-2 bg-zinc-800/50 border border-zinc-700/50 rounded-lg text-white text-sm
                             focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Max. cena (€)</label>
                <input
                  type="number"
                  value={formData.maxPrice || ""}
                  onChange={(e) => setFormData({ ...formData, maxPrice: e.target.value ? parseFloat(e.target.value) : null })}
                  placeholder="200000"
                  step="1000"
                  className="w-full px-3 py-2 bg-zinc-800/50 border border-zinc-700/50 rounded-lg text-white text-sm
                             focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all"
                />
              </div>
            </div>
          </div>
        </div>

        {/* AI Profil - pre Investičného asistenta a Chat */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-900 via-zinc-900 to-violet-950/20 p-6">
          <div className="absolute -top-24 -right-24 w-48 h-48 rounded-full blur-3xl opacity-10 bg-violet-500" />
          <div className="relative">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">AI Profil</h2>
                <p className="text-sm text-zinc-400">Pre Investičného asistenta a AI Chat – personalizované odporúčania</p>
              </div>
            </div>
            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Investičný cieľ</label>
                <select
                  value={formData.investmentGoal ?? ""}
                  onChange={(e) => setFormData({ ...formData, investmentGoal: e.target.value || null })}
                  className="w-full px-3 py-2 bg-zinc-800/50 border border-zinc-700/50 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                >
                  <option value="">Nevybraté</option>
                  <option value="RENTAL_YIELD">Prenájom (výnos)</option>
                  <option value="CAPITAL_GROWTH">Rast hodnoty</option>
                  <option value="FLIP">Flip</option>
                  <option value="BALANCED">Vyvážená</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Tolerancia rizika</label>
                <select
                  value={formData.riskTolerance ?? ""}
                  onChange={(e) => setFormData({ ...formData, riskTolerance: e.target.value || null })}
                  className="w-full px-3 py-2 bg-zinc-800/50 border border-zinc-700/50 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                >
                  <option value="">Nevybraté</option>
                  <option value="LOW">Nízka</option>
                  <option value="MEDIUM">Stredná</option>
                  <option value="HIGH">Vysoká</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Rozpočet (€)</label>
                <input
                  type="number"
                  value={formData.budget ?? ""}
                  onChange={(e) => setFormData({ ...formData, budget: e.target.value ? parseFloat(e.target.value) : null })}
                  placeholder="150000"
                  step="10000"
                  className="w-full px-3 py-2 bg-zinc-800/50 border border-zinc-700/50 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Investment Hunter */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-900 via-zinc-900 to-rose-950/20 p-6">
        <div className="absolute -top-24 -right-24 w-48 h-48 rounded-full blur-3xl opacity-10 bg-rose-500" />
        <div className="relative">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-pink-500 flex items-center justify-center">
              <Crosshair className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Investment Hunter</h2>
              <p className="text-sm text-zinc-400">Upozornenia len na tie ponuky, ktoré spĺňajú vaše pravidlá</p>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Min. hrubý výnos (%)</label>
              <input
                type="number"
                value={formData.minGrossYield ?? ""}
                onChange={(e) => setFormData({ ...formData, minGrossYield: e.target.value ? parseFloat(e.target.value) : null })}
                placeholder="napr. 6"
                step="0.1"
                min={0}
                max={30}
                className="w-full px-3 py-2.5 bg-zinc-800/50 border border-zinc-700/50 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Min. pokles ceny (%)</label>
              <input
                type="number"
                value={formData.minPriceDrop ?? ""}
                onChange={(e) => setFormData({ ...formData, minPriceDrop: e.target.value ? parseFloat(e.target.value) : null })}
                placeholder="napr. 5"
                step="0.5"
                min={0}
                max={100}
                className="w-full px-3 py-2.5 bg-zinc-800/50 border border-zinc-700/50 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/50"
              />
              <p className="text-[10px] text-zinc-500 mt-1">Upozorniť len ak cena klesla o viac než X %</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Min. podhodnotenie (%)</label>
              <input
                type="number"
                value={formData.minGapPercentage ?? ""}
                onChange={(e) => setFormData({ ...formData, minGapPercentage: e.target.value ? parseFloat(e.target.value) : null })}
                placeholder="napr. 10"
                step="1"
                min={0}
                max={100}
                className="w-full px-3 py-2.5 bg-zinc-800/50 border border-zinc-700/50 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/50"
              />
              <p className="text-[10px] text-zinc-500 mt-1">Index skrytého potenciálu – podhodnotené o X %</p>
            </div>
            <div className="flex flex-col justify-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.onlyDistressed}
                  onChange={(e) => setFormData({ ...formData, onlyDistressed: e.target.checked })}
                  className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-rose-500 focus:ring-rose-500/50"
                />
                <span className="text-sm text-zinc-300">Len exekúcie / problémové</span>
              </label>
              <p className="text-[10px] text-zinc-500 mt-1">Upozorniť len na byty v núdzi</p>
            </div>
          </div>
        </div>
      </div>

      {/* Telegram Bot - Pro funkcia */}
      <TelegramSettings />

      {/* Notifikácie */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-900 via-zinc-900 to-violet-950/20 p-6">
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
                    : "bg-zinc-800/30 border border-zinc-700/50"
                }`}
              >
                <span className="text-2xl">{notif.icon}</span>
                <div className="flex-1">
                  <p className={`font-medium ${formData[notif.id as keyof typeof formData] ? "text-white" : "text-zinc-400"}`}>
                    {notif.title}
                  </p>
                  <p className="text-xs text-zinc-500">{notif.desc}</p>
                </div>
                <div className={`w-10 h-6 rounded-full transition-all ${
                  formData[notif.id as keyof typeof formData] ? "bg-violet-500" : "bg-zinc-700"
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
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800 p-6">
        <div className="relative">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-zinc-600 to-zinc-500 flex items-center justify-center">
              <SettingsIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Pokročilé filtre</h2>
              <p className="text-sm text-zinc-400">Presné vyhľadávanie nehnuteľností</p>
            </div>
          </div>
          
          <AdvancedFilters />
        </div>
      </div>
    </div>
  );
}
