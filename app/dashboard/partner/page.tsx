"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  DollarSign,
  TrendingUp,
  Loader2,
  Copy,
  Check,
  CreditCard,
  Link2,
  History,
} from "lucide-react";

interface PartnerStats {
  referralLink: string | null;
  partnerRef: string | null;
  iban: string | null;
  activeReferrals: number;
  todayEarnings: number;
  totalPending: number;
  history: Array<{
    id: string;
    amount: number;
    status: string;
    createdAt: string;
    payer: { email: string; name: string | null };
  }>;
}

const formatEur = (n: number) =>
  new Intl.NumberFormat("sk-SK", { style: "currency", currency: "EUR", maximumFractionDigits: 2 }).format(n);

export default function PartnerDashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<PartnerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [iban, setIban] = useState("");
  const [partnerRef, setPartnerRef] = useState("");
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchStats = useCallback(() => {
    setLoading(true);
    setForbidden(false);
    fetch("/api/v1/partner/stats")
      .then(async (r) => {
        const d = await r.json();
        if (!d.success) {
          if (d.error === "Forbidden" || r.status === 403) setForbidden(true);
          return;
        }
        setStats(d.data);
        setIban(d.data.iban ?? "");
        setPartnerRef(d.data.partnerRef ?? "");
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const savePayout = () => {
    setSaving(true);
    fetch("/api/v1/partner/payout-details", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ iban: iban.trim() || null, partnerRef: partnerRef.trim() || null }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          fetchStats();
        }
      })
      .finally(() => setSaving(false));
  };

  const copyLink = () => {
    if (!stats?.referralLink) return;
    void navigator.clipboard.writeText(stats.referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-10 h-10 text-emerald-400 animate-spin" />
      </div>
    );
  }

  if (forbidden || !stats) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-8 text-center">
        <p className="text-zinc-400">Prístup len pre partnerov.</p>
        <button
          onClick={() => router.push("/dashboard")}
          className="mt-4 text-sm text-emerald-400 hover:underline"
        >
          Späť na dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Partner Panel</h1>
        <p className="text-zinc-400 text-sm">Štatistiky, referral link a výplatné údaje</p>
      </div>

      {/* Referral link */}
      <div className="rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-900/80 to-zinc-900/40 p-6">
        <h2 className="text-lg font-semibold text-zinc-100 mb-2 flex items-center gap-2">
          <Link2 className="w-5 h-5 text-emerald-400" />
          Môj Referral link
        </h2>
        {stats.referralLink ? (
          <div className="flex flex-wrap items-center gap-2">
            <code className="flex-1 min-w-0 px-4 py-2.5 rounded-lg bg-zinc-800/60 text-emerald-400 text-sm truncate">
              {stats.referralLink}
            </code>
            <button
              onClick={copyLink}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/30 transition-colors"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? "Skopírované" : "Kopírovať"}
            </button>
          </div>
        ) : (
          <p className="text-zinc-500 text-sm">
            Vyplň „Ref kód“ v sekcii Výplatné údaje a ulož. Potom sa tu zobrazí tvoj odkaz.
          </p>
        )}
      </div>

      {/* Widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
          <div className="flex items-center gap-2 text-zinc-400 text-sm mb-1">
            <Users className="w-4 h-4" />
            Aktívni odberatelia
          </div>
          <div className="text-2xl font-bold text-zinc-100 font-mono">{stats.activeReferrals}</div>
          <p className="text-xs text-zinc-500 mt-1">platia mesačné predplatné</p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
          <div className="flex items-center gap-2 text-zinc-400 text-sm mb-1">
            <TrendingUp className="w-4 h-4" />
            Dnešný zárobok
          </div>
          <div className="text-2xl font-bold text-emerald-400 font-mono">{formatEur(stats.todayEarnings)}</div>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
          <div className="flex items-center gap-2 text-zinc-400 text-sm mb-1">
            <DollarSign className="w-4 h-4" />
            Na výplatu
          </div>
          <div className="text-2xl font-bold text-amber-400 font-mono">{formatEur(stats.totalPending)}</div>
          <p className="text-xs text-zinc-500 mt-1">súčet PENDING provízií</p>
        </div>
      </div>

      {/* Výplatné údaje */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
        <h2 className="text-lg font-semibold text-zinc-100 mb-4 flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-violet-400" />
          Výplatné údaje
        </h2>
        <p className="text-sm text-zinc-500 mb-4">
          IBAN pre výplatu provízií. Ref kód slúži pre referral link (napr. kamos10).
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">IBAN</label>
            <input
              type="text"
              value={iban}
              onChange={(e) => setIban(e.target.value)}
              placeholder="SK00 0000 0000 0000 0000 0000"
              className="w-full px-4 py-2.5 rounded-lg bg-zinc-800/60 border border-zinc-700 text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">Ref kód (pre /register?ref=)</label>
            <input
              type="text"
              value={partnerRef}
              onChange={(e) => setPartnerRef(e.target.value)}
              placeholder="kamos10"
              className="w-full px-4 py-2.5 rounded-lg bg-zinc-800/60 border border-zinc-700 text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
            />
          </div>
        </div>
        <button
          onClick={savePayout}
          disabled={saving}
          className="mt-4 px-4 py-2.5 rounded-lg bg-violet-500/20 border border-violet-500/40 text-violet-400 hover:bg-violet-500/30 transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          Uložiť
        </button>
      </div>

      {/* História provízií */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
        <h2 className="text-lg font-semibold text-zinc-100 mb-4 flex items-center gap-2">
          <History className="w-5 h-5 text-amber-400" />
          História provízií
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-400 text-left">
                <th className="pb-3 pr-4">Kedy</th>
                <th className="pb-3 pr-4">Odberateľ</th>
                <th className="pb-3 pr-4">Suma</th>
                <th className="pb-3">Stav</th>
              </tr>
            </thead>
            <tbody>
              {stats.history.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-zinc-500">
                    Zatiaľ žiadne provízie
                  </td>
                </tr>
              ) : (
                stats.history.map((h) => (
                  <tr key={h.id} className="border-b border-zinc-800/60">
                    <td className="py-3 pr-4 text-zinc-300">
                      {new Date(h.createdAt).toLocaleString("sk-SK")}
                    </td>
                    <td className="py-3 pr-4 text-zinc-300">
                      {h.payer.name || h.payer.email}
                    </td>
                    <td className="py-3 pr-4 font-mono text-emerald-400">{formatEur(h.amount)}</td>
                    <td className="py-3">
                      <span
                        className={
                          h.status === "PAID"
                            ? "text-emerald-400"
                            : "text-amber-400"
                        }
                      >
                        {h.status === "PAID" ? "Vyplatené" : "Čaká"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
