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
    <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-500/10">
            <Eye className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-100">Strážny pes</h3>
            <p className="text-sm text-slate-400">Vlastné kritériá pre výhodné ponuky</p>
          </div>
        </div>
      </div>

      <div className="bg-slate-800/50 rounded-lg p-6 text-center">
        <Bell className="w-12 h-12 text-amber-400 mx-auto mb-4" />
        <h4 className="text-lg font-bold text-slate-100 mb-2">
          Nastav si vlastné kritériá
        </h4>
        <p className="text-slate-400 mb-6">
          Urči si, čo je pre teba výhodná ponuka - cenu, výnos, lokalitu a ďalšie parametre.
          Upozorníme ťa, keď sa objaví niečo zaujímavé.
        </p>
        
        <Link
          href="/dashboard/watchdog"
          className="inline-flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold rounded-xl transition-colors"
        >
          Nastaviť strážneho psa
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
