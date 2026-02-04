"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Building2, ArrowRight, Lock } from "lucide-react";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Heslá sa nezhodujú");
      return;
    }

    if (password.length < 8) {
      setError("Heslo musí mať aspoň 8 znakov");
      return;
    }

    if (!token) {
      setError("Neplatný odkaz. Požiadajte o nový odkaz na obnovenie hesla.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Nastala chyba. Skúste to znova.");
        return;
      }

      setSuccess(true);
      setTimeout(() => router.push("/auth/signin"), 2000);
    } catch {
      setError("Nastala chyba. Skúste to znova.");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex bg-slate-950">
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-md text-center">
            <div className="flex justify-center mb-8">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                <Building2 className="w-6 h-6 text-white" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Neplatný odkaz</h2>
            <p className="text-slate-400 mb-6">
              Odkaz na obnovenie hesla chýba alebo je neplatný. Požiadajte o nový na stránke
              zabudnuté heslo.
            </p>
            <Link
              href="/auth/forgot-password"
              className="text-emerald-400 hover:text-emerald-300 font-medium"
            >
              Zabudnuté heslo →
            </Link>
          </div>
        </div>
      </div>
    );
  }

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
            <h2 className="text-3xl font-bold text-white mb-2">Nové heslo</h2>
            <p className="text-slate-400">Zadajte nové heslo pre váš účet.</p>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {success ? (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <p className="text-emerald-400 text-sm">
                Heslo bolo zmenené. Presmerovávame na prihlásenie...
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Nové heslo
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-900 border border-slate-800 rounded-xl text-white
                               placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50
                               focus:border-emerald-500 transition-all"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Zopakovať heslo
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={8}
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-900 border border-slate-800 rounded-xl text-white
                               placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50
                               focus:border-emerald-500 transition-all"
                    placeholder="••••••••"
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
                {loading ? "Ukladám..." : <>Nastaviť heslo <ArrowRight className="w-5 h-5" /></>}
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

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-950">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center animate-pulse">
            <Building2 className="w-6 h-6 text-white" />
          </div>
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
