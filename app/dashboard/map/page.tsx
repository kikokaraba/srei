"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

// Dynamic import to avoid SSR issues with Leaflet
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
  return (
    <div className="h-[calc(100vh-4rem)] w-full">
      <UnifiedMap />
    </div>
  );
}
