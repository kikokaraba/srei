"use client";

import dynamic from "next/dynamic";

const LandingMap = dynamic(
  () => import("./LandingMap").then((mod) => ({ default: mod.LandingMap })),
  {
    ssr: false,
    loading: () => (
      <div className="py-24 bg-gradient-to-b from-zinc-950 to-zinc-900">
        <div className="container mx-auto px-6">
          <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-16 min-h-[400px] flex items-center justify-center">
            <div className="text-zinc-400">Načítavam mapu...</div>
          </div>
        </div>
      </div>
    ),
  }
);

export function LandingMapWrapper() {
  return <LandingMap />;
}
