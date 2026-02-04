"use client";

import { FileQuestion, Home, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="premium-card p-8 text-center">
          {/* 404 Icon */}
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-zinc-800 flex items-center justify-center">
            <FileQuestion className="w-8 h-8 text-zinc-400" />
          </div>

          {/* Error Code */}
          <div className="text-6xl font-bold text-zinc-700 mb-4">404</div>

          {/* Error Message */}
          <h1 className="text-2xl font-semibold text-white mb-2">
            Stránka nenájdená
          </h1>
          <p className="text-zinc-400 mb-8">
            Stránka, ktorú hľadáte, neexistuje alebo bola presunutá.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors"
            >
              <Home className="w-4 h-4" />
              Domov
            </Link>
            <button
              onClick={() => typeof window !== "undefined" && window.history.back()}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Späť
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
