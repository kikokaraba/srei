"use client";

import { useEffect, useState } from "react";
import {
  Target,
  TrendingUp,
  Users,
  DollarSign,
  Rocket,
  Crown,
  Loader2,
  ArrowUp,
  Zap,
  PiggyBank,
  BarChart3,
  Calendar,
} from "lucide-react";

interface GrowthStats {
  subscribers: {
    total: number;
    free: number;
    basic: number;
    pro: number;
    premium: number;
  };
  revenue: {
    mrr: number;
    arr: number;
    arpu: number;
  };
  growth: {
    newThisWeek: number;
    newThisMonth: number;
    churnRate: number;
    conversionRate: number;
  };
  engagement: {
    dau: number;
    wau: number;
    mau: number;
  };
  milestones: {
    current: number;
    next: number;
    progress: number;
  };
}

// Pricing tiers
const PRICING = {
  free: 0,
  basic: 19,
  pro: 49,
  premium: 99,
};

export default function GrowthAnalyticsPage() {
  const [stats, setStats] = useState<GrowthStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch real stats from admin API
    fetch("/api/v1/admin/stats")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          // Calculate growth stats from user data
          const totalUsers = data.data.overview.totalUsers || 0;
          const activeUsers = data.data.overview.activeUsers || 0;
          const newUsers = data.data.overview.newUsersLast30Days || 0;
          
          // Estimate subscription distribution (in real app, get from DB)
          const premiumCount = data.data.usersByRole?.find((r: { role: string }) => r.role === "PREMIUM_INVESTOR")?.count || 0;
          const freeUsers = Math.max(0, totalUsers - premiumCount);
          
          // Estimate tier distribution from premium users
          const proUsers = Math.floor(premiumCount * 0.6);
          const basicUsers = Math.floor(premiumCount * 0.3);
          const premiumUsers = premiumCount - proUsers - basicUsers;
          
          // Calculate MRR
          const mrr = (basicUsers * PRICING.basic) + (proUsers * PRICING.pro) + (premiumUsers * PRICING.premium);
          const arr = mrr * 12;
          const payingUsers = basicUsers + proUsers + premiumUsers;
          const arpu = payingUsers > 0 ? mrr / payingUsers : 0;
          
          // Calculate milestone progress
          const GOAL = 1000;
          const milestones = [10, 50, 100, 250, 500, 1000];
          const currentMilestone = milestones.filter(m => payingUsers >= m).pop() || 0;
          const nextMilestone = milestones.find(m => m > payingUsers) || 1000;
          const progress = payingUsers > 0 
            ? ((payingUsers - currentMilestone) / (nextMilestone - currentMilestone)) * 100 
            : 0;
          
          setStats({
            subscribers: {
              total: payingUsers,
              free: freeUsers,
              basic: basicUsers,
              pro: proUsers,
              premium: premiumUsers,
            },
            revenue: {
              mrr,
              arr,
              arpu,
            },
            growth: {
              newThisWeek: Math.floor(newUsers / 4),
              newThisMonth: newUsers,
              churnRate: 2.5, // Estimate
              conversionRate: totalUsers > 0 ? (payingUsers / totalUsers) * 100 : 0,
            },
            engagement: {
              dau: Math.floor(activeUsers * 0.3),
              wau: activeUsers,
              mau: Math.floor(activeUsers * 2),
            },
            milestones: {
              current: currentMilestone,
              next: nextMilestone,
              progress: Math.min(100, Math.max(0, progress)),
            },
          });
        }
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-400">Nepodarilo sa načítať štatistiky</p>
      </div>
    );
  }

  // Calculate valuations
  const valuationConservative = stats.revenue.arr * 4;
  const valuationRealistic = stats.revenue.arr * 5.5;
  const valuationOptimistic = stats.revenue.arr * 8;
  
  // Goal progress
  const SUBSCRIBER_GOAL = 1000;
  const goalProgress = (stats.subscribers.total / SUBSCRIBER_GOAL) * 100;
  const monthsToGoal = stats.growth.newThisMonth > 0 
    ? Math.ceil((SUBSCRIBER_GOAL - stats.subscribers.total) / stats.growth.newThisMonth)
    : Infinity;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-100 mb-2 flex items-center gap-3">
          <Rocket className="w-8 h-8 text-emerald-400" />
          Cesta k prvému miliónu
        </h1>
        <p className="text-slate-400">
          Sleduj rast SRIA a valuáciu v reálnom čase
        </p>
      </div>

      {/* Main Goal Progress */}
      <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 rounded-2xl border border-emerald-500/20 p-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Target className="w-6 h-6 text-emerald-400" />
              <h2 className="text-xl font-bold text-white">Cieľ: 1000 predplatiteľov</h2>
            </div>
            <p className="text-slate-400 text-sm">
              Pri dosiahnutí = €420,000 ARR = €2M+ valuácia
            </p>
          </div>
          <div className="text-right">
            <div className="text-5xl font-bold text-white mb-1">
              {stats.subscribers.total}
              <span className="text-slate-500 text-2xl"> / 1000</span>
            </div>
            <p className="text-emerald-400 text-sm">
              {goalProgress.toFixed(1)}% cieľa • 
              {monthsToGoal !== Infinity ? ` ~${monthsToGoal} mesiacov do cieľa` : " Potrebuje viac dát"}
            </p>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="mt-6">
          <div className="h-4 bg-slate-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-1000 relative"
              style={{ width: `${Math.min(100, goalProgress)}%` }}
            >
              <div className="absolute inset-0 bg-white/20 animate-pulse" />
            </div>
          </div>
          {/* Milestones */}
          <div className="flex justify-between mt-2 text-xs text-slate-500">
            <span>0</span>
            <span className={stats.subscribers.total >= 100 ? "text-emerald-400" : ""}>100</span>
            <span className={stats.subscribers.total >= 250 ? "text-emerald-400" : ""}>250</span>
            <span className={stats.subscribers.total >= 500 ? "text-emerald-400" : ""}>500</span>
            <span className={stats.subscribers.total >= 1000 ? "text-emerald-400" : ""}>1000 🎯</span>
          </div>
        </div>
      </div>

      {/* Revenue Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <RevenueCard
          title="MRR"
          subtitle="Monthly Recurring Revenue"
          value={stats.revenue.mrr}
          icon={<DollarSign className="w-6 h-6" />}
          color="blue"
        />
        <RevenueCard
          title="ARR"
          subtitle="Annual Recurring Revenue"
          value={stats.revenue.arr}
          icon={<TrendingUp className="w-6 h-6" />}
          color="emerald"
          highlight
        />
        <RevenueCard
          title="ARPU"
          subtitle="Average Revenue Per User"
          value={stats.revenue.arpu}
          icon={<Users className="w-6 h-6" />}
          color="purple"
        />
      </div>

      {/* Valuation Estimates */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
        <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
          <PiggyBank className="w-5 h-5 text-yellow-400" />
          Odhad valuácie firmy
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <ValuationCard
            label="Konzervatívna"
            multiple="4x ARR"
            value={valuationConservative}
            color="slate"
          />
          <ValuationCard
            label="Realistická"
            multiple="5.5x ARR"
            value={valuationRealistic}
            color="emerald"
            highlight
          />
          <ValuationCard
            label="Optimistická"
            multiple="8x ARR"
            value={valuationOptimistic}
            color="blue"
          />
        </div>
        <p className="text-xs text-slate-500 mt-4 text-center">
          * Na základe Real Estate Tech SaaS násobkov v roku 2026
        </p>
      </div>

      {/* Subscription Tiers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
          <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
            <Crown className="w-5 h-5 text-yellow-400" />
            Rozloženie predplatiteľov
          </h3>
          <div className="space-y-4">
            <TierBar label="Free" count={stats.subscribers.free} price={0} color="slate" total={stats.subscribers.free + stats.subscribers.total} />
            <TierBar label="Basic" count={stats.subscribers.basic} price={PRICING.basic} color="blue" total={stats.subscribers.free + stats.subscribers.total} />
            <TierBar label="Pro" count={stats.subscribers.pro} price={PRICING.pro} color="purple" total={stats.subscribers.free + stats.subscribers.total} />
            <TierBar label="Premium" count={stats.subscribers.premium} price={PRICING.premium} color="yellow" total={stats.subscribers.free + stats.subscribers.total} />
          </div>
        </div>

        {/* Growth Metrics */}
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
          <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-emerald-400" />
            Metriky rastu
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <MetricBox
              label="Noví tento týždeň"
              value={`+${stats.growth.newThisWeek}`}
              icon={<ArrowUp className="w-4 h-4" />}
              color="emerald"
            />
            <MetricBox
              label="Noví tento mesiac"
              value={`+${stats.growth.newThisMonth}`}
              icon={<Calendar className="w-4 h-4" />}
              color="blue"
            />
            <MetricBox
              label="Churn Rate"
              value={`${stats.growth.churnRate}%`}
              icon={<Zap className="w-4 h-4" />}
              color={stats.growth.churnRate < 5 ? "emerald" : "red"}
            />
            <MetricBox
              label="Konverzia (Free→Paid)"
              value={`${stats.growth.conversionRate.toFixed(1)}%`}
              icon={<TrendingUp className="w-4 h-4" />}
              color={stats.growth.conversionRate > 5 ? "emerald" : "yellow"}
            />
          </div>
        </div>
      </div>

      {/* Engagement */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
        <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
          <Zap className="w-5 h-5 text-purple-400" />
          Engagement používateľov
        </h3>
        <div className="grid grid-cols-3 gap-6">
          <EngagementCard label="DAU" subtitle="Denní aktívni" value={stats.engagement.dau} />
          <EngagementCard label="WAU" subtitle="Týždenní aktívni" value={stats.engagement.wau} />
          <EngagementCard label="MAU" subtitle="Mesační aktívni" value={stats.engagement.mau} />
        </div>
      </div>

      {/* Next Steps */}
      <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl border border-blue-500/20 p-6">
        <h3 className="text-lg font-bold text-white mb-4">🚀 Ďalšie kroky k 1000 predplatiteľom</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <ActionCard
            title="Referral Program"
            description="Pozvi investora = mesiac PRO zadarmo"
            status={false}
          />
          <ActionCard
            title="B2B Partnerstvá"
            description="RE/MAX, Halo Reality integrácia"
            status={false}
          />
          <ActionCard
            title="Content Marketing"
            description="Blog, YouTube, LinkedIn"
            status={false}
          />
        </div>
      </div>
    </div>
  );
}

function RevenueCard({
  title,
  subtitle,
  value,
  icon,
  color,
  highlight,
}: {
  title: string;
  subtitle: string;
  value: number;
  icon: React.ReactNode;
  color: "blue" | "emerald" | "purple";
  highlight?: boolean;
}) {
  const colorClasses = {
    blue: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    emerald: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    purple: "text-purple-400 bg-purple-500/10 border-purple-500/20",
  };

  return (
    <div className={`rounded-xl border p-6 ${colorClasses[color]} ${highlight ? "ring-2 ring-emerald-500/30" : ""}`}>
      <div className="flex items-center gap-3 mb-4">
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>{icon}</div>
        <div>
          <div className="text-sm font-medium text-slate-300">{title}</div>
          <div className="text-xs text-slate-500">{subtitle}</div>
        </div>
      </div>
      <div className="text-3xl font-bold text-white">
        €{value.toLocaleString()}
        {title === "ARPU" && <span className="text-lg text-slate-500">/mes</span>}
      </div>
    </div>
  );
}

function ValuationCard({
  label,
  multiple,
  value,
  color,
  highlight,
}: {
  label: string;
  multiple: string;
  value: number;
  color: "slate" | "emerald" | "blue";
  highlight?: boolean;
}) {
  const colorClasses = {
    slate: "bg-slate-800 border-slate-700",
    emerald: "bg-emerald-500/10 border-emerald-500/30",
    blue: "bg-blue-500/10 border-blue-500/30",
  };

  return (
    <div className={`rounded-xl border p-4 text-center ${colorClasses[color]} ${highlight ? "ring-2 ring-emerald-500/50" : ""}`}>
      <div className="text-sm text-slate-400 mb-1">{label}</div>
      <div className="text-2xl font-bold text-white mb-1">
        €{value.toLocaleString()}
      </div>
      <div className="text-xs text-slate-500">{multiple}</div>
    </div>
  );
}

function TierBar({
  label,
  count,
  price,
  color,
  total,
}: {
  label: string;
  count: number;
  price: number;
  color: "slate" | "blue" | "purple" | "yellow";
  total: number;
}) {
  const percentage = total > 0 ? (count / total) * 100 : 0;
  const colorClasses = {
    slate: "bg-slate-600",
    blue: "bg-blue-500",
    purple: "bg-purple-500",
    yellow: "bg-yellow-500",
  };

  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-slate-300">
          {label} <span className="text-slate-500">€{price}/mes</span>
        </span>
        <span className="text-slate-400">{count} ({percentage.toFixed(0)}%)</span>
      </div>
      <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
        <div
          className={`h-full ${colorClasses[color]} rounded-full`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function MetricBox({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: "emerald" | "blue" | "yellow" | "red";
}) {
  const colorClasses = {
    emerald: "text-emerald-400 bg-emerald-500/10",
    blue: "text-blue-400 bg-blue-500/10",
    yellow: "text-yellow-400 bg-yellow-500/10",
    red: "text-red-400 bg-red-500/10",
  };

  return (
    <div className={`rounded-lg p-4 ${colorClasses[color]}`}>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-xs text-slate-400">{label}</span>
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
    </div>
  );
}

function EngagementCard({
  label,
  subtitle,
  value,
}: {
  label: string;
  subtitle: string;
  value: number;
}) {
  return (
    <div className="text-center p-4 bg-slate-800/50 rounded-xl">
      <div className="text-4xl font-bold text-white mb-1">{value}</div>
      <div className="text-sm text-slate-300">{label}</div>
      <div className="text-xs text-slate-500">{subtitle}</div>
    </div>
  );
}

function ActionCard({
  title,
  description,
  status,
}: {
  title: string;
  description: string;
  status: boolean;
}) {
  return (
    <div className={`p-4 rounded-lg border ${status ? "bg-emerald-500/10 border-emerald-500/30" : "bg-slate-800/50 border-slate-700"}`}>
      <div className="flex items-center gap-2 mb-1">
        <div className={`w-2 h-2 rounded-full ${status ? "bg-emerald-400" : "bg-slate-500"}`} />
        <span className="font-medium text-white">{title}</span>
      </div>
      <p className="text-xs text-slate-400">{description}</p>
    </div>
  );
}
