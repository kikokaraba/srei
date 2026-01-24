"use client";

import dynamic from "next/dynamic";
import { Loader2, MapPin } from "lucide-react";

// Dynamic import to avoid SSR issues with Leaflet
const InteractiveMap = dynamic(
  () => import("@/components/dashboard/InteractiveMap"),
  { 
    ssr: false,
    loading: () => (
      <div className="h-full w-full flex items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-xl animate-pulse" />
            <div className="relative w-16 h-16 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center">
              <MapPin className="w-8 h-8 text-emerald-400" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 text-emerald-500 animate-spin" />
            <span className="text-slate-400">Načítavam mapu...</span>
          </div>
        </div>
      </div>
    ),
  }
);

export default function MapPage() {
  return (
    <div className="h-[calc(100vh-4rem)] w-full">
      <InteractiveMap />
    </div>
  );
}
