"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw, Home, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function AdminError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error("Admin error:", error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="premium-card p-8 text-center">
          {/* Error Icon */}
          <div className="w-14 h-14 mx-auto mb-5 rounded-full bg-red-500/10 flex items-center justify-center">
            <AlertTriangle className="w-7 h-7 text-red-500" />
          </div>

          {/* Error Message */}
          <h2 className="text-xl font-semibold text-white mb-2">
            Admin Panel Error
          </h2>
          <p className="text-zinc-400 mb-6 text-sm">
            Pri načítaní admin sekcie nastala chyba. Skúste to znova.
          </p>

          {/* Error Details (Development only) */}
          {process.env.NODE_ENV === "development" && (
            <div className="mb-6 p-3 bg-red-500/5 border border-red-500/20 rounded-lg text-left">
              <p className="text-xs font-mono text-red-400 break-all">
                {error.message}
              </p>
              {error.digest && (
                <p className="text-xs text-zinc-500 mt-1">
                  ID: {error.digest}
                </p>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <button
              onClick={reset}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm rounded-lg transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Skúsiť znova
            </button>
            <Link
              href="/admin"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white text-sm rounded-lg transition-colors"
            >
              <Home className="w-4 h-4" />
              Admin Home
            </Link>
            <button
              onClick={() => typeof window !== "undefined" && window.history.back()}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white text-sm rounded-lg transition-colors"
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
