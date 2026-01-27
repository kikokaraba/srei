"use client";

import React from "react";
import Link from "next/link";
import { Eye, ArrowRight, Bell } from "lucide-react";

/**
 * HotDeals widget - now redirects to Watchdog (Strážny pes)
 * 
 * Používatelia si teraz môžu nastaviť vlastné kritériá
 * cez Strážny pes (/dashboard/watchdog)
 */
export default function HotDeals() {
  return (
    <div className="premium-card p-5">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center">
            <Eye className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-zinc-100">Strážny pes</h3>
            <p className="text-xs text-zinc-500">Vlastné kritériá pre výhodné ponuky</p>
          </div>
        </div>
      </div>

      <div className="bg-zinc-900/50 rounded-xl p-6 text-center border border-zinc-800/50">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center mx-auto mb-4">
          <Bell className="w-6 h-6 text-amber-400" />
        </div>
        <h4 className="text-base font-medium text-zinc-100 mb-2">
          Nastav si vlastné kritériá
        </h4>
        <p className="text-zinc-500 text-sm mb-5 max-w-sm mx-auto">
          Urči si, čo je pre teba výhodná ponuka. Upozorníme ťa, keď sa objaví niečo zaujímavé.
        </p>
        
        <Link
          href="/dashboard/watchdog"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-zinc-100 hover:bg-white text-zinc-900 text-sm font-medium rounded-lg transition-colors"
        >
          Nastaviť strážneho psa
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
