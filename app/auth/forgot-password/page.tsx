"use client";

import { useState } from "react";
import Link from "next/link";
import { Building2, ArrowRight, Mail } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Nastala chyba. Skúste to znova.");
        return;
      }

      setSuccess(true);
    } catch {
      setError("Nastala chyba. Skúste to znova.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-950">
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">SRIA</h1>
              <p className="text-xs text-zinc-500">Slovenská realitná investičná aplikácia</p>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-bold text-white mb-2">Zabudnuté heslo</h2>
            <p className="text-slate-400">
              Zadajte email vášho účtu a pošleme vám odkaz na obnovenie hesla.
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {success ? (
            <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <p className="text-emerald-400 text-sm">
                Ak existuje účet s týmto emailom, poslali sme naň odkaz na obnovenie hesla.
                Skontrolujte tiež priečinok spam.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-900 border border-slate-800 rounded-xl text-white
                               placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50
                               focus:border-emerald-500 transition-all"
                    placeholder="vas@email.sk"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold
                           rounded-xl transition-all hover:shadow-lg hover:shadow-emerald-500/25
                           disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? "Odosielam..." : <>Odoslať odkaz <ArrowRight className="w-5 h-5" /></>}
              </button>
            </form>
          )}

          <p className="mt-8 text-center text-slate-400">
            Späť na{" "}
            <Link
              href="/auth/signin"
              className="text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
            >
              prihlásenie
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
