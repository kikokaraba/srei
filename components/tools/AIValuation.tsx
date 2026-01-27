"use client";

import { useState } from "react";
import {
  Sparkles,
  MapPin,
  Home,
  Ruler,
  Layers,
  Building2,
  Car,
  Loader2,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertCircle,
  CheckCircle2,
  Info,
} from "lucide-react";

// Typy
interface ValuationResult {
  estimatedPrice: number;
  priceRange: { low: number; high: number };
  pricePerM2: number;
  confidence: "low" | "medium" | "high";
  comparables: {
    count: number;
    avgPrice: number;
    avgPricePerM2: number;
    priceRange: { min: number; max: number };
  };
  analysis: string;
  factors: { factor: string; impact: "positive" | "negative" | "neutral"; description: string }[];
  marketInsight: string;
}

interface FormData {
  city: string;
  district: string;
  area_m2: number;
  rooms: number;
  floor: number;
  condition: string;
  hasBalcony: boolean;
  hasParking: boolean;
  isNewBuilding: boolean;
  additionalInfo: string;
}

const CITIES = [
  { value: "BRATISLAVA", label: "Bratislava" },
  { value: "KOSICE", label: "Košice" },
  { value: "PRESOV", label: "Prešov" },
  { value: "ZILINA", label: "Žilina" },
  { value: "BANSKA_BYSTRICA", label: "Banská Bystrica" },
  { value: "TRNAVA", label: "Trnava" },
  { value: "TRENCIN", label: "Trenčín" },
  { value: "NITRA", label: "Nitra" },
];

const CONDITIONS = [
  { value: "POVODNY", label: "Pôvodný stav" },
  { value: "REKONSTRUKCIA", label: "Po rekonštrukcii" },
  { value: "NOVOSTAVBA", label: "Novostavba" },
];

const CONFIDENCE_STYLES = {
  high: { bg: "bg-emerald-500/20", text: "text-emerald-400", label: "Vysoká spoľahlivosť" },
  medium: { bg: "bg-amber-500/20", text: "text-amber-400", label: "Stredná spoľahlivosť" },
  low: { bg: "bg-red-500/20", text: "text-red-400", label: "Nízka spoľahlivosť" },
};

export function AIValuation() {
  const [formData, setFormData] = useState<FormData>({
    city: "BRATISLAVA",
    district: "",
    area_m2: 60,
    rooms: 2,
    floor: 3,
    condition: "REKONSTRUKCIA",
    hasBalcony: true,
    hasParking: false,
    isNewBuilding: false,
    additionalInfo: "",
  });

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ValuationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/v1/ai/valuation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Nepodarilo sa získať odhad");
      }

      setResult(data.data.valuation);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Neznáma chyba");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof FormData, value: string | number | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-violet-500/20 rounded-full mb-4">
          <Sparkles className="w-5 h-5 text-violet-400" />
          <span className="text-violet-400 font-medium">Powered by Claude AI</span>
        </div>
        <h2 className="text-lg font-semibold text-zinc-100">AI Ocenenie Nehnuteľnosti</h2>
        <p className="text-zinc-400 mt-2">
          Zadajte parametre a AI analyzuje podobné nehnuteľnosti v databáze
        </p>
      </div>

      {/* Form */}
      <div className="bg-zinc-800/50 rounded-xl border border-zinc-700 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Mesto */}
          <div>
            <label className="flex items-center gap-2 text-sm text-zinc-300 mb-2">
              <MapPin className="w-4 h-4" />
              Mesto
            </label>
            <select
              value={formData.city}
              onChange={(e) => handleChange("city", e.target.value)}
              className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:border-violet-500"
            >
              {CITIES.map(city => (
                <option key={city.value} value={city.value}>{city.label}</option>
              ))}
            </select>
          </div>

          {/* Okres */}
          <div>
            <label className="flex items-center gap-2 text-sm text-zinc-300 mb-2">
              <Building2 className="w-4 h-4" />
              Mestská časť / Okres
            </label>
            <input
              type="text"
              value={formData.district}
              onChange={(e) => handleChange("district", e.target.value)}
              placeholder="napr. Staré Mesto, Petržalka..."
              className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:border-violet-500"
            />
          </div>

          {/* Plocha */}
          <div>
            <label className="flex items-center gap-2 text-sm text-zinc-300 mb-2">
              <Ruler className="w-4 h-4" />
              Plocha (m²)
            </label>
            <input
              type="number"
              value={formData.area_m2}
              onChange={(e) => handleChange("area_m2", parseFloat(e.target.value) || 0)}
              min="10"
              max="500"
              className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:border-violet-500"
            />
          </div>

          {/* Počet izieb */}
          <div>
            <label className="flex items-center gap-2 text-sm text-zinc-300 mb-2">
              <Home className="w-4 h-4" />
              Počet izieb
            </label>
            <select
              value={formData.rooms}
              onChange={(e) => handleChange("rooms", parseInt(e.target.value))}
              className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:border-violet-500"
            >
              {[1, 2, 3, 4, 5, 6].map(n => (
                <option key={n} value={n}>{n} {n === 1 ? "izba" : n < 5 ? "izby" : "izieb"}</option>
              ))}
            </select>
          </div>

          {/* Poschodie */}
          <div>
            <label className="flex items-center gap-2 text-sm text-zinc-300 mb-2">
              <Layers className="w-4 h-4" />
              Poschodie
            </label>
            <select
              value={formData.floor}
              onChange={(e) => handleChange("floor", parseInt(e.target.value))}
              className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:border-violet-500"
            >
              <option value={0}>Prízemie</option>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(n => (
                <option key={n} value={n}>{n}. poschodie</option>
              ))}
              <option value={13}>13+ poschodie</option>
            </select>
          </div>

          {/* Stav */}
          <div>
            <label className="flex items-center gap-2 text-sm text-zinc-300 mb-2">
              <CheckCircle2 className="w-4 h-4" />
              Stav nehnuteľnosti
            </label>
            <select
              value={formData.condition}
              onChange={(e) => handleChange("condition", e.target.value)}
              className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:border-violet-500"
            >
              {CONDITIONS.map(cond => (
                <option key={cond.value} value={cond.value}>{cond.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Checkboxes */}
        <div className="flex flex-wrap gap-6 mt-6 pt-6 border-t border-zinc-700">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.hasBalcony}
              onChange={(e) => handleChange("hasBalcony", e.target.checked)}
              className="w-5 h-5 rounded border-zinc-600 bg-zinc-900 text-violet-500 focus:ring-violet-500"
            />
            <span className="text-zinc-300">Balkón / Terasa</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.hasParking}
              onChange={(e) => handleChange("hasParking", e.target.checked)}
              className="w-5 h-5 rounded border-zinc-600 bg-zinc-900 text-violet-500 focus:ring-violet-500"
            />
            <span className="text-zinc-300">Parkovanie</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.isNewBuilding}
              onChange={(e) => handleChange("isNewBuilding", e.target.checked)}
              className="w-5 h-5 rounded border-zinc-600 bg-zinc-900 text-violet-500 focus:ring-violet-500"
            />
            <span className="text-zinc-300">Novostavba</span>
          </label>
        </div>

        {/* Additional Info */}
        <div className="mt-6">
          <label className="flex items-center gap-2 text-sm text-zinc-300 mb-2">
            <Info className="w-4 h-4" />
            Ďalšie informácie (voliteľné)
          </label>
          <textarea
            value={formData.additionalInfo}
            onChange={(e) => handleChange("additionalInfo", e.target.value)}
            placeholder="napr. výhľad na Dunaj, tichá ulica, blízko metra..."
            rows={2}
            className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:border-violet-500 resize-none"
          />
        </div>

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full mt-6 px-6 py-4 bg-violet-500 hover:bg-violet-400 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-3 disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              AI analyzuje dáta...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              Získať AI odhad
            </>
          )}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="space-y-6">
          {/* Main Result */}
          <div className="bg-violet-500/10 rounded-xl border border-violet-500/30 p-8">
            <div className="text-center mb-6">
              <p className="text-zinc-400 mb-2">Odhadovaná trhová hodnota</p>
              <p className="text-5xl font-bold text-white">
                €{result.estimatedPrice.toLocaleString()}
              </p>
              <p className="text-zinc-400 mt-2">
                €{result.pricePerM2.toLocaleString()}/m²
              </p>
            </div>

            {/* Price Range */}
            <div className="flex items-center justify-center gap-8 mb-6">
              <div className="text-center">
                <p className="text-sm text-zinc-400">Dolná hranica</p>
                <p className="text-xl font-semibold text-zinc-200">€{result.priceRange.low.toLocaleString()}</p>
              </div>
              <div className="h-12 w-px bg-zinc-700" />
              <div className="text-center">
                <p className="text-sm text-zinc-400">Horná hranica</p>
                <p className="text-xl font-semibold text-zinc-200">€{result.priceRange.high.toLocaleString()}</p>
              </div>
            </div>

            {/* Confidence */}
            <div className="flex justify-center">
              <div className={`px-4 py-2 rounded-full ${CONFIDENCE_STYLES[result.confidence].bg}`}>
                <span className={CONFIDENCE_STYLES[result.confidence].text}>
                  {CONFIDENCE_STYLES[result.confidence].label}
                </span>
                {result.comparables.count > 0 && (
                  <span className="text-zinc-400 ml-2">
                    (na základe {result.comparables.count} podobných nehnuteľností)
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Analysis */}
          <div className="bg-zinc-800/50 rounded-xl border border-zinc-700 p-6">
            <h3 className="text-lg font-semibold text-zinc-100 mb-4">Analýza</h3>
            <p className="text-zinc-300 leading-relaxed">{result.analysis}</p>
            
            {result.marketInsight && (
              <div className="mt-4 pt-4 border-t border-zinc-700">
                <p className="text-sm text-zinc-400">{result.marketInsight}</p>
              </div>
            )}
          </div>

          {/* Factors */}
          {result.factors.length > 0 && (
            <div className="bg-zinc-800/50 rounded-xl border border-zinc-700 p-6">
              <h3 className="text-lg font-semibold text-zinc-100 mb-4">Faktory ovplyvňujúce cenu</h3>
              <div className="space-y-3">
                {result.factors.map((factor, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <div className={`p-1.5 rounded-full ${
                      factor.impact === "positive" ? "bg-emerald-500/20" :
                      factor.impact === "negative" ? "bg-red-500/20" : "bg-zinc-500/20"
                    }`}>
                      {factor.impact === "positive" ? (
                        <TrendingUp className="w-4 h-4 text-emerald-400" />
                      ) : factor.impact === "negative" ? (
                        <TrendingDown className="w-4 h-4 text-red-400" />
                      ) : (
                        <Minus className="w-4 h-4 text-zinc-400" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-zinc-200">{factor.factor}</p>
                      <p className="text-sm text-zinc-400">{factor.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Comparables */}
          {result.comparables.count > 0 && (
            <div className="bg-zinc-800/50 rounded-xl border border-zinc-700 p-6">
              <h3 className="text-lg font-semibold text-zinc-100 mb-4">Porovnateľné nehnuteľnosti</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-zinc-900/50 rounded-lg">
                  <p className="text-lg font-semibold text-zinc-100">{result.comparables.count}</p>
                  <p className="text-sm text-zinc-400">nehnuteľností</p>
                </div>
                <div className="text-center p-4 bg-zinc-900/50 rounded-lg">
                  <p className="text-lg font-semibold text-zinc-100">€{result.comparables.avgPricePerM2.toLocaleString()}</p>
                  <p className="text-sm text-zinc-400">priem. cena/m²</p>
                </div>
                <div className="text-center p-4 bg-zinc-900/50 rounded-lg">
                  <p className="text-lg font-semibold text-zinc-100">€{(result.comparables.priceRange.min / 1000).toFixed(0)}k</p>
                  <p className="text-sm text-zinc-400">min. cena</p>
                </div>
                <div className="text-center p-4 bg-zinc-900/50 rounded-lg">
                  <p className="text-lg font-semibold text-zinc-100">€{(result.comparables.priceRange.max / 1000).toFixed(0)}k</p>
                  <p className="text-sm text-zinc-400">max. cena</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
