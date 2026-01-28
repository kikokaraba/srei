"use client";

import { useEffect, useState, useCallback } from "react";
import {
  BarChart3,
  TrendingUp,
  Zap,
  Users,
  Loader2,
  DollarSign,
  Target,
  Gift,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
} from "recharts";

interface ReportData {
  alpha: {
    avgMarketPrice: number;
    avgHunterPrice: number;
    totalPotentialAlpha: number;
    hunterCount: number;
    marketCount: number;
    opportunitiesToday: number;
  };
  hunter: {
    alertsDaily: { date: string; count: number }[];
    totalAlerts: number;
    avgDiscoveryMin: number | null;
  };
  ai: {
    efficiencyPct: number;
    withAi: number;
    total: number;
  };
  referral: {
    leaderboard: {
      code: string;
      partner: string;
      referred: number;
      converted: number;
      commission: number;
      commissionPct?: number;
    }[];
    pendingPayout: number;
  };
  liveVsNbs: {
    ourAvgPricePerM2: number;
    nbsAvgPricePerM2: number;
    differencePercent: number;
    source: string;
    nbsPeriod: string;
  } | null;
}

const formatEur = (n: number) =>
  new Intl.NumberFormat("sk-SK", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

export default function InvestorReportPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [credits, setCredits] = useState(5);
  const [creditBlastLoading, setCreditBlastLoading] = useState(false);
  const [creditBlastDone, setCreditBlastDone] = useState<string | null>(null);
  const [partnerName, setPartnerName] = useState("");
  const [commissionPct, setCommissionPct] = useState(10);
  const [referralLoading, setReferralLoading] = useState(false);
  const [newCode, setNewCode] = useState<{ code: string; partner: string } | null>(null);

  const fetchReport = useCallback(() => {
    setLoading(true);
    fetch("/api/v1/admin/report")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setData(d.data);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const onCreditBlast = () => {
    setCreditBlastLoading(true);
    setCreditBlastDone(null);
    fetch("/api/v1/admin/report/credit-blast", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ credits }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setCreditBlastDone(d.data?.message ?? "Hotovo.");
          fetchReport();
        } else {
          setCreditBlastDone(d.error ?? "Chyba");
        }
      })
      .finally(() => setCreditBlastLoading(false));
  };

  const onGenerateReferral = () => {
    setReferralLoading(true);
    setNewCode(null);
    fetch("/api/v1/admin/report/referral", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        partnerName: partnerName.trim() || "Partner",
        commissionPct,
      }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.data) {
          setNewCode({ code: d.data.code, partner: d.data.partnerName });
          fetchReport();
        }
      })
      .finally(() => setReferralLoading(false));
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-10 h-10 text-emerald-400 animate-spin" />
      </div>
    );
  }

  const alphaChartData = data
    ? [
        { name: "Priem. trhová cena", value: data.alpha.avgMarketPrice, fill: "#3b82f6" },
        { name: "Priem. Hunter ponuky", value: data.alpha.avgHunterPrice, fill: "#10b981" },
      ]
    : [];
  const liveVsNbsChartData = data?.liveVsNbs
    ? [
        { name: "SRIA (live)", value: data.liveVsNbs.ourAvgPricePerM2, fill: "#10b981" },
        { name: "NBS " + (data.liveVsNbs.nbsPeriod ?? ""), value: data.liveVsNbs.nbsAvgPricePerM2, fill: "#6366f1" },
      ]
    : [];

  return (
    <div className="space-y-10">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-zinc-100 mb-2 flex items-center gap-3">
          <BarChart3 className="w-9 h-9 text-emerald-400" />
          Investor Report
        </h1>
        <p className="text-zinc-400">
          „The Money View“ — trhový alpha, výkon Huntera, AI a referral
        </p>
        <button
          onClick={() => fetchReport()}
          className="mt-3 text-sm text-zinc-500 hover:text-emerald-400 transition-colors flex items-center gap-1.5"
        >
          Obnoviť dáta
        </button>
      </div>

      {/* 1. Alpha Opportunity */}
      <section className="rounded-2xl border border-zinc-800/60 bg-gradient-to-br from-zinc-900/80 to-zinc-900/40 p-6 lg:p-8">
        <h2 className="text-xl font-bold text-zinc-100 mb-1 flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-emerald-400" />
          Market Arbitrage
        </h2>
        <p className="text-sm text-zinc-500 mb-6">
          Priemerná cena trhu vs. Hunter ponuky (Gap &gt; 10 %). Koľko peňazí sme „našli na ulici“.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-[256px] min-h-[200px]">
            {data && alphaChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%" minHeight={200}>
                <BarChart data={alphaChartData} margin={{ top: 12, right: 12, left: 12, bottom: 12 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="name" tick={{ fill: "#a1a1aa", fontSize: 12 }} />
                  <YAxis tick={{ fill: "#a1a1aa", fontSize: 12 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 8 }}
                    labelStyle={{ color: "#fafafa" }}
                    formatter={(value: number | undefined) => [value != null ? formatEur(value) : "—", "Cena"]}
                  />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full min-h-[200px] flex items-center justify-center text-zinc-500 text-sm">Žiadne dáta</div>
            )}
          </div>
          <div className="flex flex-col justify-center rounded-xl bg-gradient-to-br from-emerald-500/15 to-emerald-500/5 border border-emerald-500/30 p-6">
            <div className="text-xs font-medium text-emerald-400/80 uppercase tracking-wider mb-1">
              Celkový identifikovaný investičný potenciál (30 d)
            </div>
            <div className="text-3xl lg:text-4xl font-bold text-emerald-400 font-mono">
              {data ? formatEur(data.alpha.totalPotentialAlpha) : "—"}
            </div>
            <p className="text-sm text-zinc-500 mt-2">
              {data?.alpha.hunterCount ?? 0} Hunter ponúk · {data?.alpha.marketCount ?? 0} inzerátov v dátach
            </p>
            <div className="mt-4 pt-4 border-t border-emerald-500/20">
              <div className="text-xs font-medium text-amber-400/80 uppercase tracking-wider mb-0.5">
                Dnešné Alpha príležitosti
              </div>
              <div className="text-2xl font-bold text-amber-400 font-mono">
                {data?.alpha.opportunitiesToday ?? 0}
              </div>
              <p className="text-xs text-zinc-500">Gap &gt; 10 % a zľava &gt; 5 %</p>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Hunter Performance */}
      <section className="rounded-2xl border border-zinc-800/60 bg-gradient-to-br from-zinc-900/80 to-zinc-900/40 p-6 lg:p-8">
        <h2 className="text-xl font-bold text-zinc-100 mb-1 flex items-center gap-2">
          <Zap className="w-5 h-5 text-amber-400" />
          Bot Performance
        </h2>
        <p className="text-sm text-zinc-500 mb-6">
          Hunter alerty cez Telegram a rýchlosť spracovania.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-[224px] min-h-[180px]">
            {data && (data?.hunter?.alertsDaily?.length ?? 0) > 0 ? (
              <ResponsiveContainer width="100%" height="100%" minHeight={180}>
                <LineChart
                  data={data?.hunter?.alertsDaily ?? []}
                  margin={{ top: 8, right: 8, left: 8, bottom: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="date" tick={{ fill: "#a1a1aa", fontSize: 11 }} />
                  <YAxis tick={{ fill: "#a1a1aa", fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 8 }}
                    labelStyle={{ color: "#fafafa" }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="count"
                    name="Hunter alertov"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    dot={{ fill: "#f59e0b", r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full min-h-[180px] flex items-center justify-center text-zinc-500 text-sm">Žiadne dáta</div>
            )}
          </div>
          <div className="flex flex-col justify-center rounded-xl bg-gradient-to-br from-amber-500/15 to-amber-500/5 border border-amber-500/30 p-6">
            <div className="text-xs font-medium text-amber-400/80 uppercase tracking-wider mb-1">
              Average Discovery Speed
            </div>
            <div className="text-2xl lg:text-3xl font-bold text-amber-400 font-mono">
              {data?.hunter.avgDiscoveryMin != null
                ? `~${data.hunter.avgDiscoveryMin} min`
                : "—"}
            </div>
            <p className="text-sm text-zinc-500 mt-2">
              Celkom alertov (30 d): <span className="text-zinc-300">{data?.hunter.totalAlerts ?? 0}</span>
            </p>
          </div>
        </div>
      </section>

      {/* 3. AI Efficiency */}
      <section className="rounded-2xl border border-zinc-800/60 bg-gradient-to-br from-violet-500/10 to-violet-500/5 p-6 lg:p-8">
        <h2 className="text-xl font-bold text-zinc-100 mb-1 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-violet-400" />
          AI Efficiency
        </h2>
        <p className="text-sm text-zinc-500 mb-6">
          Úspešnosť Claude analýzy — % inzerátov obohatených o AI verdikt.
        </p>
        <div className="flex flex-wrap items-center gap-6">
          <div className="rounded-xl bg-zinc-800/50 border border-zinc-700/50 px-6 py-4">
            <div className="text-4xl font-bold text-violet-400 font-mono">{data?.ai.efficiencyPct ?? 0} %</div>
            <div className="text-sm text-zinc-500">úspešne obohatených</div>
          </div>
          <div className="text-sm text-zinc-400">
            {data?.ai.withAi ?? 0} / {data?.ai.total ?? 0} inzerátov (30 d) s investmentSummary
          </div>
        </div>
      </section>

      {/* 4. Live vs NBS */}
      {liveVsNbsChartData.length > 0 && (
        <section className="rounded-2xl border border-zinc-800/60 bg-gradient-to-br from-zinc-900/80 to-zinc-900/40 p-6 lg:p-8">
          <h2 className="text-xl font-bold text-zinc-100 mb-1 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-violet-400" />
            Live Market vs NBS
          </h2>
          <p className="text-sm text-zinc-500 mb-6">
            Naša priemerná cena za m² vs. NBS. Veríme našim dátam; NBS je kontext.
          </p>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 h-[192px] min-h-[160px]">
              {data && liveVsNbsChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%" minHeight={160}>
                  <BarChart data={liveVsNbsChartData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis dataKey="name" tick={{ fill: "#a1a1aa", fontSize: 12 }} />
                    <YAxis tick={{ fill: "#a1a1aa", fontSize: 12 }} tickFormatter={(v) => `${(v / 1000).toFixed(1)}k`} />
                    <Tooltip
                      contentStyle={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 8 }}
                      formatter={(value: number | undefined) => [value != null ? `${value.toLocaleString()} €/m²` : "—", "€/m²"]}
                    />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full min-h-[160px] flex items-center justify-center text-zinc-500 text-sm">Žiadne dáta</div>
              )}
            </div>
            <div className="flex flex-col justify-center rounded-xl bg-zinc-800/30 border border-zinc-700/50 p-5">
              <div className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1">Rozdiel</div>
              <div className={`text-2xl font-bold font-mono ${(data?.liveVsNbs?.differencePercent ?? 0) >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {(data?.liveVsNbs?.differencePercent ?? 0) >= 0 ? "+" : ""}
                {data?.liveVsNbs?.differencePercent?.toFixed(1) ?? "—"} %
              </div>
              <p className="text-xs text-zinc-500 mt-1">
                SRIA vs. NBS {data?.liveVsNbs?.nbsPeriod ?? ""}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* 5. Referral ROI */}
      <section className="rounded-2xl border border-zinc-800/60 bg-gradient-to-br from-zinc-900/80 to-zinc-900/40 p-6 lg:p-8">
        <h2 className="text-xl font-bold text-zinc-100 mb-1 flex items-center gap-2">
          <Users className="w-5 h-5 text-blue-400" />
          Conversion & Referral
        </h2>
        <p className="text-sm text-zinc-500 mb-6">
          Výkonnosť referral kódov. Na výplatu partnerom: suma provízií so stavom PENDING.
        </p>
        <div className="mb-6 flex flex-wrap items-center gap-4">
          <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 px-5 py-3">
            <span className="text-xs text-amber-400/80 uppercase tracking-wider">Na výplatu</span>
            <div className="text-xl font-bold text-amber-400 font-mono">{formatEur(data?.referral.pendingPayout ?? 0)}</div>
          </div>
        </div>
        <div className="overflow-x-auto rounded-xl border border-zinc-800/60">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-400 text-left">
                <th className="p-3 font-medium">Kód</th>
                <th className="p-3 font-medium">Partner</th>
                <th className="p-3 font-medium">Privedení</th>
                <th className="p-3 font-medium">Konverzia</th>
                <th className="p-3 font-medium">Provízia</th>
              </tr>
            </thead>
            <tbody>
              {(data?.referral.leaderboard ?? []).length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-zinc-500">
                    Zatiaľ žiadne referral kódy. Vygeneruj prvý nižšie.
                  </td>
                </tr>
              ) : (
                data?.referral.leaderboard.map((r) => (
                  <tr key={r.code} className="border-b border-zinc-800/60 hover:bg-zinc-800/30">
                    <td className="p-3 font-mono text-emerald-400">{r.code}</td>
                    <td className="p-3 text-zinc-300">{r.partner}</td>
                    <td className="p-3 text-zinc-300">{r.referred}</td>
                    <td className="p-3 text-zinc-300">{r.converted}</td>
                    <td className="p-3 text-zinc-300">{formatEur(r.commission)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* 5. Admin Magic */}
      <section className="rounded-2xl border border-zinc-800/60 bg-gradient-to-br from-rose-500/10 to-rose-500/5 p-6 lg:p-8">
        <h2 className="text-xl font-bold text-zinc-100 mb-1 flex items-center gap-2">
          <Target className="w-5 h-5 text-rose-400" />
          Admin Magic
        </h2>
        <p className="text-sm text-zinc-500 mb-6">
          Referral kód pre partnera · Global Credit Blast pre promo.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Generate Referral */}
          <div className="rounded-xl bg-zinc-800/30 border border-zinc-700/50 p-5">
            <h3 className="font-semibold text-zinc-200 mb-4 flex items-center gap-2">
              <Gift className="w-4 h-4 text-rose-400" />
              Nový referral kód
            </h3>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Meno partnera"
                value={partnerName}
                onChange={(e) => setPartnerName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg bg-zinc-900/60 border border-zinc-700 text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-rose-500/50"
              />
              <div className="flex gap-2">
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={commissionPct}
                  onChange={(e) => setCommissionPct(Number(e.target.value) || 0)}
                  className="w-24 px-4 py-2.5 rounded-lg bg-zinc-900/60 border border-zinc-700 text-zinc-200 focus:outline-none focus:ring-2 focus:ring-rose-500/50"
                />
                <span className="flex items-center text-zinc-500 text-sm">% provízia</span>
              </div>
              <button
                onClick={onGenerateReferral}
                disabled={referralLoading}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-400 hover:bg-rose-500/30 transition-colors disabled:opacity-50"
              >
                {referralLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                Vygenerovať
              </button>
              {newCode && (
                <p className="text-sm text-emerald-400 pt-2">
                  Kód: <code className="bg-zinc-800 px-1.5 py-0.5 rounded">{newCode.code}</code> ({newCode.partner})
                </p>
              )}
            </div>
          </div>

          {/* Credit Blast */}
          <div className="rounded-xl bg-zinc-800/30 border border-zinc-700/50 p-5">
            <h3 className="font-semibold text-zinc-200 mb-4 flex items-center gap-2">
              <Gift className="w-4 h-4 text-emerald-400" />
              Global Credit Blast
            </h3>
            <p className="text-sm text-zinc-500 mb-4">
              Pridaj kredity všetkým registrovaným používateľom (promo akcia).
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <input
                type="number"
                min={1}
                max={100}
                value={credits}
                onChange={(e) => setCredits(Math.max(1, Math.min(100, Number(e.target.value) || 1)))}
                className="w-20 px-4 py-2.5 rounded-lg bg-zinc-900/60 border border-zinc-700 text-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
              <span className="text-zinc-500 text-sm">kreditov každému</span>
              <button
                onClick={onCreditBlast}
                disabled={creditBlastLoading}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/30 transition-colors disabled:opacity-50"
              >
                {creditBlastLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                {creditBlastLoading ? "Spúšťam…" : "Spustiť"}
              </button>
            </div>
            {creditBlastDone && (
              <p className={`text-sm mt-3 ${creditBlastDone.startsWith("Pridané") ? "text-emerald-400" : "text-amber-400"}`}>
                {creditBlastDone}
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
