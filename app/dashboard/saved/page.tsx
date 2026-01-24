"use client";

import { useState } from "react";
import { SavedProperties } from "@/components/dashboard/SavedProperties";
import { PropertyTimeline } from "@/components/dashboard/PropertyTimeline";
import { Bookmark } from "lucide-react";

export default function SavedPropertiesPage() {
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-slate-950 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Bookmark className="w-8 h-8 text-emerald-400" />
          <div>
            <h1 className="text-2xl font-bold text-slate-100">Sledované nehnuteľnosti</h1>
            <p className="text-slate-400">
              Sledujte cenové zmeny a históriu vašich obľúbených nehnuteľností
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Saved Properties List */}
          <div>
            <SavedProperties onSelectProperty={setSelectedPropertyId} />
          </div>

          {/* Property Timeline (if selected) */}
          <div>
            {selectedPropertyId ? (
              <PropertyTimeline
                propertyId={selectedPropertyId}
                onClose={() => setSelectedPropertyId(null)}
              />
            ) : (
              <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 h-full flex items-center justify-center">
                <div className="text-center text-slate-500">
                  <Bookmark className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Vyberte nehnuteľnosť pre zobrazenie histórie</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
