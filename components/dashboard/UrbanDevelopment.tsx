"use client";

import { useEffect, useState, useCallback } from "react";
import { MapPin, Calendar, TrendingUp, AlertCircle, RefreshCw } from "lucide-react";

interface UrbanDevelopment {
  id: string;
  name: string;
  type: string;
  city: string;
  district: string;
  status: string;
  planned_completion: string | null;
  expected_impact: number | null;
  description: string | null;
  _count: {
    propertyImpacts: number;
  };
}

const TYPE_LABELS: Record<string, string> = {
  METRO_STATION: "Stanica metra",
  TRAM_STATION: "Stanica električky",
  HIGHWAY: "Diaľničný obchvat",
  SHOPPING_CENTER: "Nákupné centrum",
  SCHOOL: "Škola",
  HOSPITAL: "Nemocnica",
  PARK: "Park",
  BUSINESS_DISTRICT: "Obchodná zóna",
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  planned: { label: "Plánované", color: "text-blue-400" },
  in_progress: { label: "V výstavbe", color: "text-amber-400" },
  completed: { label: "Dokončené", color: "text-emerald-400" },
};

export function UrbanDevelopment() {
  const [developments, setDevelopments] = useState<UrbanDevelopment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDevelopments = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/v1/urban-development");
      
      if (!response.ok) {
        throw new Error("Failed to fetch urban development data");
      }
      
      const data = await response.json();
      setDevelopments(data.data || []);
      setError(null);
    } catch (err) {
      console.error("Error fetching urban development:", err);
      setError("Nepodarilo sa načítať dáta o urbanistickom rozvoji");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDevelopments();
  }, [fetchDevelopments]);

  const formatDate = useCallback((dateString: string | null): string => {
    if (!dateString) return "Neuvedené";
    return new Date(dateString).toLocaleDateString("sk-SK", {
      year: "numeric",
      month: "long",
    });
  }, []);

  if (loading) {
    return (
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-slate-800 rounded w-1/3"></div>
          <div className="h-32 bg-slate-800 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
        <div className="text-red-400 flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  if (developments.length === 0) {
    return (
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-purple-500/10 rounded-lg">
            <MapPin className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-100">Urbanistický rozvoj</h3>
            <p className="text-sm text-slate-400">Plánovaná infraštruktúra a jej vplyv na ceny</p>
          </div>
        </div>
        <div className="text-center py-8">
          <p className="text-slate-400">Momentálne nie sú k dispozícii žiadne dáta.</p>
          <p className="text-sm text-slate-500 mt-2">
            Systém automaticky sleduje plánovanú infraštruktúru a jej vplyv na nehnuteľnosti.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-500/10 rounded-lg">
            <MapPin className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-100">Urbanistický rozvoj</h3>
            <p className="text-sm text-slate-400">
              {developments.length} {developments.length === 1 ? "projekt" : "projektov"} v databáze
            </p>
          </div>
        </div>
        <button
          onClick={fetchDevelopments}
          className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
          title="Obnoviť dáta"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      <div className="space-y-4">
        {developments.map((dev) => (
          <div
            key={dev.id}
            className="bg-slate-800/50 rounded-lg border border-slate-700 p-5 hover:border-purple-500/40 transition-all"
          >
            <div className="flex items-start justify-between gap-4 mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-1 bg-purple-500/20 rounded text-xs font-semibold text-purple-400">
                    {TYPE_LABELS[dev.type] || dev.type}
                  </span>
                  <span className={`text-xs font-medium ${
                    STATUS_LABELS[dev.status]?.color || "text-slate-400"
                  }`}>
                    {STATUS_LABELS[dev.status]?.label || dev.status}
                  </span>
                </div>
                <h4 className="text-lg font-bold text-slate-100 mb-1">
                  {dev.name}
                </h4>
                <div className="flex items-center gap-2 text-sm text-slate-400 mb-3">
                  <MapPin className="w-4 h-4" />
                  <span>{dev.district}, {dev.city}</span>
                </div>
              </div>
            </div>

            {dev.expected_impact && (
              <div className="flex items-center gap-2 mb-3 p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
                <div>
                  <p className="text-sm text-slate-400">Očakávaný vplyv na ceny</p>
                  <p className="text-lg font-bold text-emerald-400">
                    +{dev.expected_impact.toFixed(1)}% zhodnotenie
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 mb-3">
              <div>
                <p className="text-xs text-slate-500 mb-1">Plánované dokončenie</p>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <p className="text-sm font-medium text-slate-300">
                    {formatDate(dev.planned_completion)}
                  </p>
                </div>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Ovplyvnené nehnuteľnosti</p>
                <p className="text-sm font-medium text-slate-300">
                  {dev._count.propertyImpacts} nehnuteľností
                </p>
              </div>
            </div>

            {dev.description && (
              <div className="mt-3 pt-3 border-t border-slate-700">
                <p className="text-sm text-slate-400">{dev.description}</p>
              </div>
            )}

            {/* Príklad použitia */}
            {dev.expected_impact && (
              <div className="mt-4 pt-4 border-t border-slate-700">
                <p className="text-xs text-slate-500 mb-2">
                  Príklad: Nehnuteľnosť v okruhu 300m od tejto infraštruktúry
                </p>
                <p className="text-sm text-slate-300">
                  <span className="font-semibold">Predpokladané zhodnotenie o 5 rokov:</span>{" "}
                  <span className="text-emerald-400 font-bold">
                    +{dev.expected_impact.toFixed(0)}%
                  </span>
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
