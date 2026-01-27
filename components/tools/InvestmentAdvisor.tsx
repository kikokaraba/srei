"use client";

import { useState } from "react";
import {
  Sparkles,
  TrendingUp,
  Shield,
  Target,
  Loader2,
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
  Zap,
  Home,
  MapPin,
  Euro,
} from "lucide-react";

interface Recommendation {
  id: string;
  title: string;
  price: number;
  pricePerM2: number;
  area: number;
  rooms: number | null;
  city: string;
  district: string;
  condition: string;
  sourceUrl: string | null;
  isDistressed: boolean;
  investmentScore: number;
  investmentFactors: string[];
  metrics: {
    gross_yield: number;
    net_yield: number;
    cash_on_cash: number;
  } | null;
}

interface AIAnalysis {
  topPick: {
    index: number;
    reason: string;
  };
  marketOverview: string;
  investmentStrategy: string;
  risks: string[];
  opportunities: string[];
}

interface AdvisorResult {
  recommendations: Recommendation[];
  analysis: AIAnalysis | null;
  totalMatches: number;
}

const INVESTMENT_TYPES = [
  { value: "RENTAL_YIELD", label: "Prenájom", icon: Home, description: "Stabilný mesačný príjem" },
  { value: "CAPITAL_GROWTH", label: "Rast hodnoty", icon: TrendingUp, description: "Dlhodobá investícia" },
  { value: "FLIP", label: "Flip", icon: Zap, description: "Kúp, zrekonštruuj, predaj" },
  { value: "BALANCED", label: "Vyvážená", icon: Target, description: "Mix príjmu a rastu" },
];

const RISK_LEVELS = [
  { value: "LOW", label: "Nízka", color: "emerald" },
  { value: "MEDIUM", label: "Stredná", color: "amber" },
  { value: "HIGH", label: "Vysoká", color: "red" },
];

const CITIES = [
  "BRATISLAVA", "KOSICE", "PRESOV", "ZILINA", 
  "BANSKA_BYSTRICA", "TRNAVA", "TRENCIN", "NITRA"
];

export function InvestmentAdvisor() {
  const [criteria, setCriteria] = useState({
    budget: 150000,
    investmentType: "RENTAL_YIELD",
    riskTolerance: "MEDIUM",
    preferredCities: [] as string[],
    minYield: 4,
  });

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AdvisorResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/v1/ai/investment-advisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(criteria),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error);
      }

      setResult(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nepodarilo sa načítať odporúčania");
    } finally {
      setLoading(false);
    }
  };

  const toggleCity = (city: string) => {
    setCriteria(prev => ({
      ...prev,
      preferredCities: prev.preferredCities.includes(city)
        ? prev.preferredCities.filter(c => c !== city)
        : [...prev.preferredCities, city],
    }));
  };

  const getScoreColor = (score: number) => {
    if (score >= 50) return "text-emerald-400";
    if (score >= 30) return "text-amber-400";
    return "text-zinc-400";
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/20 rounded-full mb-4">
          <Sparkles className="w-5 h-5 text-emerald-400" />
          <span className="text-emerald-400 font-medium">AI Investment Advisor</span>
        </div>
        <h2 className="text-2xl font-bold text-zinc-100">Investičný Asistent</h2>
        <p className="text-zinc-400 mt-2">
          AI analyzuje trh a nájde najlepšie investičné príležitosti pre váš profil
        </p>
      </div>

      {/* Criteria Form */}
      <div className="bg-zinc-800/50 rounded-xl border border-zinc-700 p-6">
        <h3 className="text-lg font-semibold text-zinc-100 mb-6">Vaše investičné kritériá</h3>

        {/* Budget */}
        <div className="mb-6">
          <label className="block text-sm text-zinc-300 mb-2">
            <Euro className="w-4 h-4 inline mr-2" />
            Rozpočet: €{criteria.budget.toLocaleString()}
          </label>
          <input
            type="range"
            min="50000"
            max="500000"
            step="10000"
            value={criteria.budget}
            onChange={(e) => setCriteria(prev => ({ ...prev, budget: parseInt(e.target.value) }))}
            className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
          />
          <div className="flex justify-between text-xs text-zinc-500 mt-1">
            <span>€50k</span>
            <span>€500k</span>
          </div>
        </div>

        {/* Investment Type */}
        <div className="mb-6">
          <label className="block text-sm text-zinc-300 mb-3">Investičný cieľ</label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {INVESTMENT_TYPES.map(type => (
              <button
                key={type.value}
                onClick={() => setCriteria(prev => ({ ...prev, investmentType: type.value }))}
                className={`p-4 rounded-xl border transition-all text-left ${
                  criteria.investmentType === type.value
                    ? "bg-emerald-500/20 border-emerald-500 text-emerald-400"
                    : "bg-zinc-900 border-zinc-700 text-zinc-300 hover:border-zinc-600"
                }`}
              >
                <type.icon className="w-6 h-6 mb-2" />
                <p className="font-medium">{type.label}</p>
                <p className="text-xs opacity-70">{type.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Risk Tolerance */}
        <div className="mb-6">
          <label className="block text-sm text-zinc-300 mb-3">
            <Shield className="w-4 h-4 inline mr-2" />
            Tolerancia rizika
          </label>
          <div className="flex gap-3">
            {RISK_LEVELS.map(risk => (
              <button
                key={risk.value}
                onClick={() => setCriteria(prev => ({ ...prev, riskTolerance: risk.value }))}
                className={`flex-1 py-3 rounded-lg border transition-all ${
                  criteria.riskTolerance === risk.value
                    ? `bg-${risk.color}-500/20 border-${risk.color}-500 text-${risk.color}-400`
                    : "bg-zinc-900 border-zinc-700 text-zinc-300 hover:border-zinc-600"
                }`}
              >
                {risk.label}
              </button>
            ))}
          </div>
        </div>

        {/* Preferred Cities */}
        <div className="mb-6">
          <label className="block text-sm text-zinc-300 mb-3">
            <MapPin className="w-4 h-4 inline mr-2" />
            Preferované mestá (voliteľné)
          </label>
          <div className="flex flex-wrap gap-2">
            {CITIES.map(city => (
              <button
                key={city}
                onClick={() => toggleCity(city)}
                className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                  criteria.preferredCities.includes(city)
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500"
                    : "bg-zinc-800 text-zinc-400 border border-zinc-700 hover:border-zinc-600"
                }`}
              >
                {city.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-3 disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              AI analyzuje trh...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              Nájsť investičné príležitosti
            </>
          )}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400" />
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-6">
          {/* AI Analysis */}
          {result.analysis && (
            <div className="bg-gradient-to-br from-emerald-900/30 to-teal-900/30 rounded-xl border border-emerald-500/30 p-6">
              <div className="flex items-center gap-3 mb-4">
                <Sparkles className="w-6 h-6 text-emerald-400" />
                <h3 className="text-lg font-semibold text-zinc-100">AI Analýza</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-zinc-300">{result.analysis.marketOverview}</p>
                </div>

                <div className="bg-zinc-800/50 rounded-lg p-4">
                  <p className="text-sm text-zinc-400 mb-2">Odporúčaná stratégia:</p>
                  <p className="text-zinc-200">{result.analysis.investmentStrategy}</p>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-emerald-500/10 rounded-lg p-4">
                    <p className="text-sm text-emerald-400 font-medium mb-2">Príležitosti</p>
                    <ul className="space-y-1">
                      {result.analysis.opportunities.map((opp, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-zinc-300">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                          {opp}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="bg-amber-500/10 rounded-lg p-4">
                    <p className="text-sm text-amber-400 font-medium mb-2">Riziká</p>
                    <ul className="space-y-1">
                      {result.analysis.risks.map((risk, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-zinc-300">
                          <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                          {risk}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Recommendations */}
          <div className="bg-zinc-800/50 rounded-xl border border-zinc-700 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-zinc-100">
                Top {result.recommendations.length} odporúčaní
              </h3>
              <span className="text-sm text-zinc-400">
                z {result.totalMatches} nehnuteľností
              </span>
            </div>

            <div className="space-y-4">
              {result.recommendations.map((rec, idx) => (
                <div
                  key={rec.id}
                  className={`p-4 rounded-xl border transition-all ${
                    idx === 0 && result.analysis?.topPick.index === 1
                      ? "bg-emerald-500/10 border-emerald-500/50"
                      : "bg-zinc-900 border-zinc-700 hover:border-zinc-600"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl font-bold text-zinc-500">#{idx + 1}</span>
                        <div>
                          <h4 className="font-semibold text-zinc-100">{rec.title}</h4>
                          <div className="flex items-center gap-2 text-sm text-zinc-400">
                            <MapPin className="w-3 h-3" />
                            {rec.district}, {rec.city}
                          </div>
                        </div>
                      </div>

                      {/* Factors */}
                      {rec.investmentFactors.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-3">
                          {rec.investmentFactors.map((factor, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs rounded-full"
                            >
                              {factor}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* AI Top Pick Reason */}
                      {idx === 0 && result.analysis?.topPick.index === 1 && (
                        <div className="bg-emerald-500/10 rounded-lg p-3 mb-3">
                          <p className="text-sm text-emerald-300">
                            <Sparkles className="w-4 h-4 inline mr-2" />
                            <strong>AI Top Pick:</strong> {result.analysis.topPick.reason}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="text-right">
                      <p className="text-xl font-bold text-zinc-100">
                        €{rec.price.toLocaleString()}
                      </p>
                      <p className="text-sm text-zinc-400">
                        €{rec.pricePerM2}/m² | {rec.area}m²
                      </p>
                      <div className="flex items-center justify-end gap-2 mt-2">
                        <span className={`text-lg font-bold ${getScoreColor(rec.investmentScore)}`}>
                          {rec.investmentScore}/100
                        </span>
                        {rec.sourceUrl && (
                          <a
                            href={rec.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
                          >
                            <ExternalLink className="w-4 h-4 text-zinc-400" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
