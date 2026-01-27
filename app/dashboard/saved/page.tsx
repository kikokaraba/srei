"use client";

import { useState } from "react";
import { SavedProperties } from "@/components/dashboard/SavedProperties";
import { PropertyTimeline } from "@/components/dashboard/PropertyTimeline";
import { Bookmark, Sparkles, Clock, TrendingDown } from "lucide-react";

export default function SavedPropertiesPage() {
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-900 via-zinc-900 to-rose-950/30 p-6 lg:p-8">
        {/* Ambient glow */}
        <div className="absolute -top-24 -right-24 w-48 h-48 rounded-full blur-3xl opacity-20 bg-rose-500" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 rounded-full blur-3xl opacity-10 bg-pink-500" />
        
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-500 to-pink-500 flex items-center justify-center shadow-lg shadow-rose-500/20 shrink-0">
              <Bookmark className="w-7 h-7 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-2xl lg:text-3xl font-bold text-white">
                  Sledované nehnuteľnosti
                </h1>
                <Sparkles className="w-5 h-5 text-rose-400" />
              </div>
              <p className="text-zinc-400 text-sm lg:text-base">
                Sledujte cenové zmeny a históriu vašich obľúbených nehnuteľností
              </p>
            </div>
          </div>
          
          {/* Features */}
          <div className="flex gap-3">
            <div className="px-4 py-2 rounded-xl bg-zinc-800/50 border border-zinc-700/50 flex items-center gap-2">
              <Clock className="w-4 h-4 text-rose-400" />
              <span className="text-sm text-white font-medium">História</span>
            </div>
            <div className="px-4 py-2 rounded-xl bg-zinc-800/50 border border-zinc-700/50 flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-emerald-400" />
              <span className="text-sm text-white font-medium">Cenové alerty</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Saved Properties List */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800">
          <SavedProperties onSelectProperty={setSelectedPropertyId} />
        </div>

        {/* Property Timeline */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800">
          {selectedPropertyId ? (
            <PropertyTimeline
              propertyId={selectedPropertyId}
              onClose={() => setSelectedPropertyId(null)}
            />
          ) : (
            <div className="p-6 h-full min-h-[400px] flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-zinc-800/50 flex items-center justify-center">
                  <Bookmark className="w-8 h-8 text-zinc-600" />
                </div>
                <p className="text-zinc-400 font-medium">Vyberte nehnuteľnosť</p>
                <p className="text-sm text-zinc-500 mt-1">Pre zobrazenie cenovej histórie</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
