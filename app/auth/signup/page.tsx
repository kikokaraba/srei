"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Building2, Check, AlertCircle, ArrowRight, User, Mail, Lock, Sparkles, TrendingUp, Shield, BarChart3 } from "lucide-react";

export default function SignUpPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (password !== confirmPassword) {
      setError("Heslá sa nezhodujú");
      return;
    }

    if (password.length < 8) {
      setError("Heslo musí mať aspoň 8 znakov");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.error || "Nastala chyba pri registrácii");
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

  const benefits = [
    { icon: BarChart3, text: "Prehľad nehnuteľností" },
    { icon: TrendingUp, text: "Historický vývoj cien" },
    { icon: Shield, text: "Uloženie 10 nehnuteľností" },
  ];

  return (
    <div className="min-h-screen flex bg-slate-950">
      {/* Left side - Visual */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600" />
        
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
              <span className="text-white/80 text-sm font-medium">Zadarmo navždy</span>
            </div>
            
            <h2 className="text-4xl font-bold text-white mb-4">
              Začnite investovať ešte dnes
            </h2>
            
            <p className="text-white/80 text-lg mb-8">
              Vytvorte si bezplatný účet a získajte prístup k najlepším investičným príležitostiam na Slovensku.
            </p>

            {/* Benefits */}
            <div className="space-y-4">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex items-center gap-3 p-4 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20">
                  <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                    <benefit.icon className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-white font-medium">{benefit.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Decorative circles */}
        <div className="absolute -bottom-32 -left-32 w-64 h-64 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-fuchsia-500/20 blur-3xl" />
      </div>

      {/* Right side - Form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-12">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center shadow-lg shadow-violet-500/20">
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
              Vytvorte si účet
            </h2>
            <p className="text-slate-400">
              Zaregistrujte sa a začnite investovať
            </p>
          </div>

          {/* Success */}
          {success && (
            <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <div className="flex items-center gap-2 text-emerald-400">
                <Check className="w-5 h-5" />
                <span className="font-medium">Účet bol vytvorený!</span>
              </div>
              <p className="text-sm text-emerald-400/70 mt-1">
                Presmerovávam na prihlásenie...
              </p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
              <div className="flex items-center gap-2 text-red-400">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm">{error}</span>
              </div>
            </div>
          )}

          {!success && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Meno
                </label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    minLength={2}
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-900 border border-slate-800 rounded-xl text-white 
                               placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500/50 
                               focus:border-violet-500 transition-all"
                    placeholder="Vaše meno"
                  />
                </div>
              </div>

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
                               placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500/50 
                               focus:border-violet-500 transition-all"
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
                    minLength={8}
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-900 border border-slate-800 rounded-xl text-white 
                               placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500/50 
                               focus:border-violet-500 transition-all"
                    placeholder="Minimálne 8 znakov"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Potvrďte heslo
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
                               placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500/50 
                               focus:border-violet-500 transition-all"
                    placeholder="Zopakujte heslo"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-gradient-to-r from-violet-500 to-purple-500 text-white font-semibold 
                           rounded-xl transition-all hover:shadow-lg hover:shadow-violet-500/25 
                           disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-6"
              >
                {loading ? (
                  "Vytváram účet..."
                ) : (
                  <>
                    Zaregistrovať sa
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Sign in link */}
          <p className="mt-8 text-center text-slate-400">
            Už máte účet?{" "}
            <Link
              href="/auth/signin"
              className="text-violet-400 hover:text-violet-300 font-medium transition-colors"
            >
              Prihláste sa
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
