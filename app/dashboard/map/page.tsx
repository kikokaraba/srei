"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

// Check if Mapbox token is available
const hasMapboxToken = !!process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

// Dynamic imports to avoid SSR issues
const MapboxPropertyMap = dynamic(
  () => import("@/components/dashboard/MapboxPropertyMap"),
  { 
    ssr: false,
    loading: () => (
      <div className="h-full w-full flex items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          <span className="text-slate-400">Načítavam mapu...</span>
        </div>
      </div>
    ),
  }
);

const UnifiedMap = dynamic(
  () => import("@/components/dashboard/UnifiedMap"),
  { 
    ssr: false,
    loading: () => (
      <div className="h-full w-full flex items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          <span className="text-slate-400">Načítavam mapu...</span>
        </div>
      </div>
    ),
  }
);

export default function MapPage() {
  // Use Mapbox if token is available, otherwise fallback to Leaflet
  const MapComponent = hasMapboxToken ? MapboxPropertyMap : UnifiedMap;
  
  return (
    <div className="h-[calc(100vh-4rem)] w-full">
      <MapComponent />
    </div>
  );
}
