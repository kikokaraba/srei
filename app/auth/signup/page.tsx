"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Building2, Check, AlertCircle } from "lucide-react";

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

    // Validácia na klientovi
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
      
      // Presmeruj na prihlásenie po 2 sekundách
      setTimeout(() => {
        router.push("/auth/signin");
      }, 2000);
    } catch {
      setError("Nastala chyba. Skúste to znova.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
      <div className="w-full max-w-md">
        <div className="bg-slate-900 rounded-lg border border-slate-800 p-8">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-8 justify-center">
            <Building2 className="w-8 h-8 text-emerald-400" />
            <h1 className="text-2xl font-bold text-slate-100">SRIA</h1>
          </div>

          <h2 className="text-xl font-semibold text-slate-100 mb-2">
            Vytvorte si účet
          </h2>
          <p className="text-sm text-slate-400 mb-6">
            Zaregistrujte sa a získajte prístup k investičným nástrojom
          </p>

          {/* Success message */}
          {success && (
            <div className="mb-4 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
              <div className="flex items-center gap-2 text-emerald-400">
                <Check className="w-5 h-5" />
                <span className="font-medium">Účet bol vytvorený!</span>
              </div>
              <p className="text-sm text-emerald-400/70 mt-1">
                Presmerovávam na prihlásenie...
              </p>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <div className="flex items-center gap-2 text-red-400">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm">{error}</span>
              </div>
            </div>
          )}

          {!success && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Meno */}
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-slate-300 mb-2"
                >
                  Meno
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  minLength={2}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="Vaše meno"
                />
              </div>

              {/* Email */}
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-slate-300 mb-2"
                >
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="vas@email.sk"
                />
              </div>

              {/* Heslo */}
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-slate-300 mb-2"
                >
                  Heslo
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="Minimálne 8 znakov"
                />
              </div>

              {/* Potvrdenie hesla */}
              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-sm font-medium text-slate-300 mb-2"
                >
                  Potvrďte heslo
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="Zopakujte heslo"
                />
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Vytváram účet..." : "Zaregistrovať sa"}
              </button>
            </form>
          )}

          {/* FREE tier info */}
          <div className="mt-6 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
            <p className="text-sm text-slate-400 text-center mb-3">
              Čo získate s FREE účtom:
            </p>
            <ul className="space-y-2 text-sm text-slate-300">
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400" />
                Prehľad nehnuteľností
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400" />
                Uloženie až 10 nehnuteľností
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400" />
                Základné filtre a vyhľadávanie
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400" />
                Historický vývoj cien
              </li>
            </ul>
          </div>

          {/* Odkaz na prihlásenie */}
          <p className="mt-6 text-sm text-center text-slate-400">
            Už máte účet?{" "}
            <Link
              href="/auth/signin"
              className="text-emerald-400 hover:text-emerald-300 font-medium"
            >
              Prihláste sa
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
