"use client";

import { useState, useCallback, useEffect } from "react";
import { ArrowRight, ArrowLeft, MapPin, TrendingUp, Target, Bell, Home, Coins, Check } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

// Slovenské kraje
const SLOVAK_REGIONS = [
  { id: "BA", name: "Bratislavský kraj", shortName: "BA" },
  { id: "TT", name: "Trnavský kraj", shortName: "TT" },
  { id: "TN", name: "Trenčiansky kraj", shortName: "TN" },
  { id: "NR", name: "Nitriansky kraj", shortName: "NR" },
  { id: "ZA", name: "Žilinský kraj", shortName: "ZA" },
  { id: "BB", name: "Banskobystrický kraj", shortName: "BB" },
  { id: "PO", name: "Prešovský kraj", shortName: "PO" },
  { id: "KE", name: "Košický kraj", shortName: "KE" },
];

const INVESTMENT_TYPES = [
  {
    id: "future-potential",
    title: "Investície s budúcim potenciálom",
    description: "Hľadám nehnuteľnosti v oblastiach s plánovanou infraštruktúrou",
    icon: TrendingUp,
  },
  {
    id: "high-yield",
    title: "Vysoký výnos",
    description: "Zaujímajú ma nehnuteľnosti s najvyšším výnosom",
    icon: Target,
  },
  {
    id: "stable-growth",
    title: "Stabilný rast",
    description: "Hľadám bezpečné investície s predvídateľným rastom",
    icon: TrendingUp,
  },
  {
    id: "flip",
    title: "Flip (kúpa a predaj)",
    description: "Hľadám nehnuteľnosti na renováciu a rýchly predaj",
    icon: ArrowRight,
  },
  {
    id: "rental",
    title: "Dlhodobý nájom",
    description: "Hľadám nehnuteľnosti pre pasívny príjem z nájmu",
    icon: Bell,
  },
] as const;

interface OnboardingData {
  trackedRegions: string[];
  investmentTypes: string[];
  minYield: number | null;
  maxPrice: number | null;
  minPrice: number | null;
  minPricePerM2: number | null;
  maxPricePerM2: number | null;
  minArea: number | null;
  maxArea: number | null;
  minRooms: number | null;
  maxRooms: number | null;
  condition: string[];
  energyCertificates: string[];
  minGrossYield: number | null;
  minCashOnCash: number | null;
  maxDaysOnMarket: number | null;
  minGapPercentage: number | null;
  onlyDistressed: boolean;
  notifyMarketGaps: boolean;
  notifyPriceDrops: boolean;
  notifyNewProperties: boolean;
  notifyUrbanDevelopment: boolean;
}

export function OnboardingFlow() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [data, setData] = useState<OnboardingData>({
    trackedRegions: [],
    investmentTypes: [],
    minYield: null,
    maxPrice: null,
    minPrice: null,
    minPricePerM2: null,
    maxPricePerM2: null,
    minArea: null,
    maxArea: null,
    minRooms: null,
    maxRooms: null,
    condition: [],
    energyCertificates: [],
    minGrossYield: null,
    minCashOnCash: null,
    maxDaysOnMarket: null,
    minGapPercentage: null,
    onlyDistressed: false,
    notifyMarketGaps: true,
    notifyPriceDrops: true,
    notifyNewProperties: true,
    notifyUrbanDevelopment: true,
  });
  const [isSaving, setIsSaving] = useState(false);

  // Check if user is authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      console.log("User not authenticated, redirecting to sign in...");
      router.push("/auth/signin?callbackUrl=/onboarding");
    } else if (status === "authenticated") {
      console.log("User authenticated:", session?.user?.email, "User ID:", session?.user?.id);
    }
  }, [status, session, router]);

  // Show loading while checking authentication
  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950/20 flex items-center justify-center">
        <div className="text-slate-400">Načítavam...</div>
      </div>
    );
  }

  // Don't render if not authenticated (will redirect)
  if (status === "unauthenticated") {
    return null;
  }

  const handleNext = useCallback(() => {
    if (step < 5) {
      setStep(step + 1);
    }
  }, [step]);

  const handleBack = useCallback(() => {
    if (step > 1) {
      setStep(step - 1);
    }
  }, [step]);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      const response = await fetch("/api/v1/user/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // Ensure cookies are sent
        body: JSON.stringify({
          trackedRegions: data.trackedRegions,
          trackedCities: [],
          trackedDistricts: [],
          investmentType: data.investmentTypes[0] || null, // Hlavný typ
          minYield: data.minYield,
          maxYield: null,
          minPrice: data.minPrice,
          maxPrice: data.maxPrice,
          minPricePerM2: data.minPricePerM2,
          maxPricePerM2: data.maxPricePerM2,
          minArea: data.minArea,
          maxArea: data.maxArea,
          minRooms: data.minRooms,
          maxRooms: data.maxRooms,
          condition: data.condition,
          energyCertificates: data.energyCertificates,
          minGrossYield: data.minGrossYield,
          minCashOnCash: data.minCashOnCash,
          maxDaysOnMarket: data.maxDaysOnMarket,
          minGapPercentage: data.minGapPercentage,
          onlyDistressed: data.onlyDistressed,
          notifyMarketGaps: data.notifyMarketGaps,
          notifyPriceDrops: data.notifyPriceDrops,
          notifyNewProperties: data.notifyNewProperties,
          notifyUrbanDevelopment: data.notifyUrbanDevelopment,
          onboardingCompleted: true,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("Failed to save preferences:", response.status, errorData);
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to save preferences`);
      }

      const result = await response.json();
      console.log("Preferences saved successfully:", result);

      // Reload page to apply preferences
      window.location.href = "/dashboard";
    } catch (error) {
      console.error("Error saving preferences:", error);
      const errorMessage = error instanceof Error ? error.message : "Neznáma chyba";
      alert(`Chyba pri ukladaní preferencií: ${errorMessage}. Skúste to znova.`);
    } finally {
      setIsSaving(false);
    }
  }, [data]);

  const handleSkip = useCallback(async () => {
    setIsSaving(true);
    try {
      console.log("Skipping onboarding - sending request...");
      const response = await fetch("/api/v1/user/preferences", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
        },
        credentials: "include", // Ensure cookies are sent
        body: JSON.stringify({
          onboardingCompleted: true,
        }),
      });

      console.log("Skip onboarding response:", {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("Failed to skip onboarding:", response.status, errorData);
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to skip onboarding`);
      }

      const result = await response.json();
      console.log("Onboarding skipped successfully:", result);

      // Reload page to apply preferences
      window.location.href = "/dashboard";
    } catch (error) {
      console.error("Error skipping onboarding:", error);
      const errorMessage = error instanceof Error ? error.message : "Neznáma chyba";
      alert(`Chyba pri preskakovaní nastavení: ${errorMessage}. Skúste to znova.`);
    } finally {
      setIsSaving(false);
    }
  }, []);

  const updateData = useCallback((updates: Partial<OnboardingData>) => {
    setData((prev) => ({ ...prev, ...updates }));
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950/20 flex items-center justify-center p-4 md:p-6">
      <div className="max-w-2xl w-full mx-auto">
        {/* Header s možnosťou preskočiť */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-100 mb-1">
              Vitajte v SRIA
            </h1>
            <p className="text-sm text-slate-400">
              Nastavte si aplikáciu podľa svojich potrieb
            </p>
          </div>
          <button
            onClick={handleSkip}
            disabled={isSaving}
            className="px-4 py-2 text-sm text-slate-400 hover:text-slate-100 transition-colors disabled:opacity-50"
          >
            Preskočiť
          </button>
        </div>

        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-400">
              Krok {step} z 5
            </span>
            <span className="text-sm text-slate-400">
              {Math.round((step / 5) * 100)}%
            </span>
          </div>
          <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all duration-300"
              style={{ width: `${(step / 5) * 100}%` }}
            />
          </div>
        </div>

        {/* Step content */}
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 md:p-8 overflow-x-hidden">
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-3xl font-bold text-slate-100 mb-2">
                  Kde hľadáte investície?
                </h2>
                <p className="text-slate-400">
                  Vyberte kraje, ktoré vás zaujímajú (môžete vybrať viacero)
                </p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {SLOVAK_REGIONS.map((region) => {
                  const isSelected = data.trackedRegions.includes(region.id);
                  return (
                    <button
                      key={region.id}
                      onClick={() => {
                        const newRegions = isSelected
                          ? data.trackedRegions.filter(r => r !== region.id)
                          : [...data.trackedRegions, region.id];
                        updateData({ trackedRegions: newRegions });
                      }}
                      className={`relative p-4 rounded-xl border transition-all ${
                        isSelected
                          ? "bg-emerald-500/10 border-emerald-500"
                          : "bg-slate-800 border-slate-700 hover:border-slate-600"
                      }`}
                    >
                      {isSelected && (
                        <div className="absolute top-2 right-2 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      )}
                      <MapPin className={`w-6 h-6 mb-2 mx-auto ${isSelected ? "text-emerald-400" : "text-slate-400"}`} />
                      <div className={`text-sm font-semibold ${isSelected ? "text-emerald-400" : "text-slate-300"}`}>
                        {region.shortName}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        {region.name.replace(" kraj", "")}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Quick select */}
              <div className="flex flex-wrap gap-2 pt-4 border-t border-slate-800">
                <span className="text-xs text-slate-500">Rýchly výber:</span>
                <button
                  onClick={() => updateData({ trackedRegions: SLOVAK_REGIONS.map(r => r.id) })}
                  className="text-xs px-3 py-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors"
                >
                  Celé Slovensko
                </button>
                <button
                  onClick={() => updateData({ trackedRegions: ["BA", "TT", "NR"] })}
                  className="text-xs px-3 py-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors"
                >
                  Západ
                </button>
                <button
                  onClick={() => updateData({ trackedRegions: ["ZA", "BB", "TN"] })}
                  className="text-xs px-3 py-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors"
                >
                  Stred
                </button>
                <button
                  onClick={() => updateData({ trackedRegions: ["PO", "KE"] })}
                  className="text-xs px-3 py-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors"
                >
                  Východ
                </button>
              </div>

              {data.trackedRegions.length > 0 && (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                  <p className="text-sm text-emerald-400">
                    ✓ Vybrané: {data.trackedRegions.map(id => 
                      SLOVAK_REGIONS.find(r => r.id === id)?.name.replace(" kraj", "")
                    ).join(", ")}
                  </p>
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-3xl font-bold text-slate-100 mb-2">
                  Aký typ investícií vás zaujíma?
                </h2>
                <p className="text-slate-400">
                  Vyberte všetky stratégie, ktoré vás zaujímajú (môžete vybrať viacero)
                </p>
              </div>

              <div className="space-y-3">
                {INVESTMENT_TYPES.map((type) => {
                  const Icon = type.icon;
                  const isSelected = data.investmentTypes.includes(type.id);
                  return (
                    <button
                      key={type.id}
                      onClick={() => {
                        const newTypes = isSelected
                          ? data.investmentTypes.filter(t => t !== type.id)
                          : [...data.investmentTypes, type.id];
                        updateData({ investmentTypes: newTypes });
                      }}
                      className={`w-full p-4 rounded-xl border text-left transition-all ${
                        isSelected
                          ? "bg-emerald-500/10 border-emerald-500"
                          : "bg-slate-800 border-slate-700 hover:border-slate-600"
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div
                          className={`p-2 rounded-lg ${
                            isSelected
                              ? "bg-emerald-500/20 text-emerald-400"
                              : "bg-slate-700 text-slate-400"
                          }`}
                        >
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-slate-100 mb-1">
                            {type.title}
                          </h3>
                          <p className="text-sm text-slate-400">
                            {type.description}
                          </p>
                        </div>
                        {isSelected && (
                          <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center flex-shrink-0">
                            <Check className="w-4 h-4 text-white" />
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {data.investmentTypes.length > 0 && (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                  <p className="text-sm text-emerald-400">
                    ✓ Vybrané: {data.investmentTypes.length} {data.investmentTypes.length === 1 ? "stratégia" : data.investmentTypes.length < 5 ? "stratégie" : "stratégií"}
                  </p>
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-3xl font-bold text-slate-100 mb-2">
                  Základné kritériá
                </h2>
                <p className="text-slate-400">
                  Nastavte základné filtre pre vaše investície
                </p>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="min-w-0">
                    <label className="block text-slate-300 mb-2 font-medium">
                      Minimálny výnos (%)
                    </label>
                    <input
                      type="number"
                      value={data.minYield !== null && data.minYield !== undefined ? data.minYield : ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        updateData({ minYield: val === "" ? null : parseFloat(val) || null });
                      }}
                      placeholder="Napríklad 5.0"
                      step="0.1"
                      max="20"
                      className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="min-w-0">
                    <label className="block text-slate-300 mb-2 font-medium">
                      Maximálna cena (€)
                    </label>
                    <input
                      type="number"
                      value={data.maxPrice !== null && data.maxPrice !== undefined ? data.maxPrice : ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        updateData({ maxPrice: val === "" ? null : parseFloat(val) || null });
                      }}
                      placeholder="Napríklad 200000"
                      step="1000"
                      className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="min-w-0">
                    <label className="block text-slate-300 mb-2 font-medium">
                      Minimálna cena (€)
                    </label>
                    <input
                      type="number"
                      value={data.minPrice !== null && data.minPrice !== undefined ? data.minPrice : ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        updateData({ minPrice: val === "" ? null : parseFloat(val) || null });
                      }}
                      placeholder="Napríklad 50000"
                      step="1000"
                      className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="min-w-0">
                    <label className="block text-slate-300 mb-2 font-medium">
                      Počet izieb
                    </label>
                    <div className="flex gap-2 min-w-0">
                      <input
                        type="number"
                        value={data.minRooms !== null && data.minRooms !== undefined ? data.minRooms : ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          updateData({ minRooms: val === "" ? null : parseInt(val) || null });
                        }}
                        placeholder="Od"
                        className="flex-1 min-w-0 px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      <input
                        type="number"
                        value={data.maxRooms !== null && data.maxRooms !== undefined ? data.maxRooms : ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          updateData({ maxRooms: val === "" ? null : parseInt(val) || null });
                        }}
                        placeholder="Do"
                        className="flex-1 min-w-0 px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-3xl font-bold text-slate-100 mb-2">
                  Pokročilé kritériá
                </h2>
                <p className="text-slate-400">
                  Voliteľné: Nastavte pokročilé filtre pre ešte presnejšie výsledky
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="min-w-0">
                  <label className="block text-slate-300 mb-2 font-medium text-sm">
                    Cena za m² (€/m²)
                  </label>
                  <div className="flex gap-2 min-w-0">
                    <input
                      type="number"
                      value={data.minPricePerM2 !== null && data.minPricePerM2 !== undefined ? data.minPricePerM2 : ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        updateData({ minPricePerM2: val === "" ? null : parseFloat(val) || null });
                      }}
                      placeholder="Od"
                      className="flex-1 min-w-0 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <input
                      type="number"
                      value={data.maxPricePerM2 !== null && data.maxPricePerM2 !== undefined ? data.maxPricePerM2 : ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        updateData({ maxPricePerM2: val === "" ? null : parseFloat(val) || null });
                      }}
                      placeholder="Do"
                      className="flex-1 min-w-0 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div className="min-w-0">
                  <label className="block text-slate-300 mb-2 font-medium text-sm">
                    Plocha (m²)
                  </label>
                  <div className="flex gap-2 min-w-0">
                    <input
                      type="number"
                      value={data.minArea !== null && data.minArea !== undefined ? data.minArea : ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        updateData({ minArea: val === "" ? null : parseFloat(val) || null });
                      }}
                      placeholder="Od"
                      className="flex-1 min-w-0 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <input
                      type="number"
                      value={data.maxArea !== null && data.maxArea !== undefined ? data.maxArea : ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        updateData({ maxArea: val === "" ? null : parseFloat(val) || null });
                      }}
                      placeholder="Do"
                      className="flex-1 min-w-0 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div className="min-w-0">
                  <label className="block text-slate-300 mb-2 font-medium text-sm">
                    Min. zľava oproti priemeru (%)
                  </label>
                  <input
                    type="number"
                    value={data.minGapPercentage !== null && data.minGapPercentage !== undefined ? data.minGapPercentage : ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      updateData({ minGapPercentage: val === "" ? null : parseFloat(val) || null });
                    }}
                    placeholder="Napr. 10 = 10% pod priemerom"
                    step="1"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Zobraziť len nehnuteľnosti lacnejšie ako priemer v lokalite
                  </p>
                </div>

                <div className="min-w-0">
                  <label className="block text-slate-300 mb-2 font-medium text-sm">
                    Max. doba v ponuke (dní)
                  </label>
                  <input
                    type="number"
                    value={data.maxDaysOnMarket !== null && data.maxDaysOnMarket !== undefined ? data.maxDaysOnMarket : ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      updateData({ maxDaysOnMarket: val === "" ? null : parseInt(val) || null });
                    }}
                    placeholder="Napr. 90"
                    step="1"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Nehnuteľnosti dlhšie v ponuke = väčší priestor na vyjednávanie
                  </p>
                </div>
              </div>

              <label className="flex items-center gap-3 p-4 rounded-lg border border-slate-700 bg-slate-800 cursor-pointer hover:border-slate-600 transition-colors">
                <input
                  type="checkbox"
                  checked={data.onlyDistressed}
                  onChange={(e) => updateData({ onlyDistressed: e.target.checked })}
                  className="w-5 h-5 rounded border-slate-600 bg-slate-700 text-emerald-500 focus:ring-emerald-500"
                />
                <div>
                  <h3 className="font-semibold text-slate-100 mb-1">
                    Len nehnuteľnosti v núdzi
                  </h3>
                  <p className="text-sm text-slate-400">
                    Zobraziť len nehnuteľnosti, ktoré sú dlhšie v ponuke alebo majú zníženú cenu
                  </p>
                </div>
              </label>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-3xl font-bold text-slate-100 mb-2">
                  Notifikácie
                </h2>
                <p className="text-slate-400">
                  Vyberte, o čom chcete dostávať upozornenia
                </p>
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
                      checked={data[notif.id as keyof OnboardingData] as boolean}
                      onChange={(e) =>
                        updateData({ [notif.id]: e.target.checked } as Partial<OnboardingData>)
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
          )}

          {/* Navigation buttons */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-800">
            <button
              onClick={handleBack}
              disabled={step === 1}
              className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Späť
            </button>

            {step < 5 ? (
              <button
                onClick={handleNext}
                disabled={
                  (step === 1 && data.trackedRegions.length === 0) ||
                  (step === 2 && data.investmentTypes.length === 0)
                }
                className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                Ďalej
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? "Ukladám..." : "Dokončiť nastavenie"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
