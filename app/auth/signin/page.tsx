"use client";

import { signIn } from "next-auth/react";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Building2, ArrowRight, Lock, Mail, Sparkles } from "lucide-react";

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Neplatné prihlasovacie údaje");
      } else if (result?.ok) {
        router.push(callbackUrl);
        router.refresh();
      } else {
        setError("Nastala chyba pri prihlasovaní");
      }
    } catch {
      setError("Nastala chyba. Skúste to znova.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-950">
      {/* Left side - Form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-12">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">SRIA</h1>
              <p className="text-xs text-zinc-500">Slovenská realitná investičná aplikácia</p>
            </div>
          </div>

          {/* Header */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-white mb-2">
              Vitajte späť
            </h2>
            <p className="text-slate-400">
              Prihláste sa do vášho investičného dashboardu
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Email
              </label>
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

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Heslo
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
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
              {loading ? (
                "Prihlasujem..."
              ) : (
                <>
                  Prihlásiť sa
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          {/* Sign up link */}
          <p className="mt-8 text-center text-slate-400">
            Nemáte účet?{" "}
            <Link
              href="/auth/signup"
              className="text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
            >
              Zaregistrujte sa zadarmo
            </Link>
          </p>
        </div>
      </div>

      {/* Right side - Visual */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-600" />
        
        {/* Pattern overlay */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }} />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center p-12">
          <div className="max-w-md">
            <div className="flex items-center gap-2 mb-6">
              <Sparkles className="w-5 h-5 text-white/80" />
              <span className="text-white/80 text-sm font-medium">SRIA Platform</span>
            </div>
            
            <h2 className="text-4xl font-bold text-white mb-4">
              Investujte chytrejšie do nehnuteľností
            </h2>
            
            <p className="text-white/80 text-lg mb-8">
              Získajte prístup k real-time dátam, AI predikciam a nástrojom pre profesionálnych investorov.
            </p>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20">
                <p className="text-3xl font-bold text-white">2,847</p>
                <p className="text-white/70 text-sm">Aktívnych nehnuteľností</p>
              </div>
              <div className="p-4 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20">
                <p className="text-3xl font-bold text-white">5.2%</p>
                <p className="text-white/70 text-sm">Priemerný výnos</p>
              </div>
            </div>
          </div>
        </div>

        {/* Decorative circles */}
        <div className="absolute -bottom-32 -right-32 w-64 h-64 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-cyan-500/20 blur-3xl" />
      </div>
    </div>
  );
}

export default function SignInPage() {
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
      <SignInForm />
    </Suspense>
  );
}
