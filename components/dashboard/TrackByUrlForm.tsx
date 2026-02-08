"use client";

import { useState } from "react";
import { Link2, Loader2, Check, AlertCircle } from "lucide-react";

export function TrackByUrlForm({ onSuccess }: { onSuccess?: () => void }) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    
    const trimmed = url.trim();
    if (!trimmed) {
      setError("Zadajte URL inzerátu");
      return;
    }
    
    setLoading(true);
    try {
      const res = await fetch("/api/v1/track-by-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmed }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        setError(data.error ?? "Nepodarilo sa pridať inzerát");
        return;
      }
      
      setSuccess(data.data?.message ?? "Nehnuteľnosť bola pridaná na sledovanie");
      setUrl("");
      onSuccess?.();
      
      setTimeout(() => setSuccess(null), 4000);
    } catch {
      setError("Chyba pri spracovaní");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mb-6">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Vložte link inzerátu (Bazoš, Nehnutelnosti.sk)"
            className="w-full pl-10 pr-4 py-2.5 bg-zinc-800/80 border border-zinc-700 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
            disabled={loading}
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <Link2 className="w-4 h-4" />
              Sledovať
            </>
          )}
        </button>
      </div>
      
      {error && (
        <div className="mt-3 flex items-center gap-2 text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
      
      {success && (
        <div className="mt-3 flex items-center gap-2 text-emerald-400 text-sm">
          <Check className="w-4 h-4 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}
      
      <p className="mt-2 text-xs text-zinc-500">
        Podporované: reality.bazos.sk, reality.sk
      </p>
    </form>
  );
}
