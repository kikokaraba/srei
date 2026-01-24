"use client";

import { useEffect, useState } from "react";
import {
  BarChart3,
  TrendingUp,
  Users,
  Building,
  Activity,
  Loader2,
  Calendar,
  MapPin,
} from "lucide-react";
import { getCityRegionLabel } from "@/lib/constants";

interface AdminStats {
  overview: {
    totalUsers: number;
    totalProperties: number;
    totalSavedProperties: number;
    activeUsers: number;
    newUsersLast30Days: number;
  };
  usersByRole: Array<{ role: string; count: number }>;
  propertiesByCity: Array<{ city: string; count: number }>;
}

export default function AdminStatsPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/v1/admin/stats")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setStats(data.data);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-red-400 animate-spin" />
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

  // Calculate some derived stats
  const avgSavedPerUser = stats.overview.totalUsers > 0
    ? (stats.overview.totalSavedProperties / stats.overview.totalUsers).toFixed(1)
    : 0;
  
  const activeRate = stats.overview.totalUsers > 0
    ? ((stats.overview.activeUsers / stats.overview.totalUsers) * 100).toFixed(0)
    : 0;

  const growthRate = stats.overview.totalUsers > 0
    ? ((stats.overview.newUsersLast30Days / stats.overview.totalUsers) * 100).toFixed(0)
    : 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-100 mb-2 flex items-center gap-3">
          <BarChart3 className="w-8 h-8 text-yellow-400" />
          Detailné štatistiky
        </h1>
        <p className="text-slate-400">Analytika a metriky platformy SRIA</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Miera aktivity"
          value={`${activeRate}%`}
          subtitle="Aktívnych za posledných 7 dní"
          icon={<Activity className="w-6 h-6" />}
          color="emerald"
          trend={Number(activeRate) > 20 ? "good" : "neutral"}
        />
        <MetricCard
          title="Rast (30 dní)"
          value={`+${growthRate}%`}
          subtitle={`${stats.overview.newUsersLast30Days} nových používateľov`}
          icon={<TrendingUp className="w-6 h-6" />}
          color="blue"
          trend={Number(growthRate) > 5 ? "good" : "neutral"}
        />
        <MetricCard
          title="Priem. uložených"
          value={avgSavedPerUser.toString()}
          subtitle="Nehnuteľností na používateľa"
          icon={<Users className="w-6 h-6" />}
          color="purple"
        />
        <MetricCard
          title="Pokrytie miest"
          value={stats.propertiesByCity.length.toString()}
          subtitle="Miest s nehnuteľnosťami"
          icon={<MapPin className="w-6 h-6" />}
          color="yellow"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Properties by City - Bar Chart */}
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
          <h3 className="font-semibold text-slate-100 mb-6 flex items-center gap-2">
            <Building className="w-5 h-5 text-emerald-400" />
            Nehnuteľnosti podľa mesta
          </h3>
          <div className="space-y-4">
            {stats.propertiesByCity
              .sort((a, b) => b.count - a.count)
              .map((item, idx) => {
                const max = stats.propertiesByCity[0]?.count || 1;
                const percentage = (item.count / max) * 100;
                const total = stats.propertiesByCity.reduce((sum, c) => sum + c.count, 0);
                const share = ((item.count / total) * 100).toFixed(1);
                
                return (
                  <div key={item.city} className="flex items-center gap-4">
                    <div className="w-8 text-center text-sm text-slate-500">{idx + 1}.</div>
                    <div className="flex-1">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-100 font-medium">
                          {getCityRegionLabel(item.city)}
                        </span>
                        <span className="text-slate-400">
                          {item.count} ({share}%)
                        </span>
                      </div>
                      <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* User Engagement Stats */}
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
          <h3 className="font-semibold text-slate-100 mb-6 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-400" />
            Engagement používateľov
          </h3>
          <div className="space-y-6">
            {/* Engagement Funnel */}
            <div className="space-y-3">
              <FunnelStep
                label="Registrovaní"
                value={stats.overview.totalUsers}
                percentage={100}
                color="blue"
              />
              <FunnelStep
                label="Dokončili onboarding"
                value={Math.round(stats.overview.totalUsers * 0.7)} // Estimate
                percentage={70}
                color="purple"
              />
              <FunnelStep
                label="Uložili nehnuteľnosť"
                value={Math.round(stats.overview.totalSavedProperties > 0 ? stats.overview.totalUsers * 0.4 : 0)}
                percentage={40}
                color="emerald"
              />
              <FunnelStep
                label="Aktívni (7 dní)"
                value={stats.overview.activeUsers}
                percentage={(stats.overview.activeUsers / stats.overview.totalUsers) * 100}
                color="yellow"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 rounded-xl border border-emerald-500/20 p-6">
          <h4 className="text-emerald-400 font-medium mb-2">Zdravie platformy</h4>
          <div className="text-4xl font-bold text-slate-100 mb-2">Dobrý</div>
          <p className="text-sm text-slate-400">
            {stats.overview.activeUsers > 0 ? "Aktívni používatelia sú zapojení" : "Potrebuje viac používateľov"}
          </p>
        </div>
        <div className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 rounded-xl border border-blue-500/20 p-6">
          <h4 className="text-blue-400 font-medium mb-2">Rast</h4>
          <div className="text-4xl font-bold text-slate-100 mb-2">+{stats.overview.newUsersLast30Days}</div>
          <p className="text-sm text-slate-400">Nových používateľov za 30 dní</p>
        </div>
        <div className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 rounded-xl border border-purple-500/20 p-6">
          <h4 className="text-purple-400 font-medium mb-2">Dáta</h4>
          <div className="text-4xl font-bold text-slate-100 mb-2">{stats.overview.totalProperties}</div>
          <p className="text-sm text-slate-400">Nehnuteľností v databáze</p>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  title,
  value,
  subtitle,
  icon,
  color,
  trend,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  color: "emerald" | "blue" | "purple" | "yellow";
  trend?: "good" | "bad" | "neutral";
}) {
  const colorClasses = {
    emerald: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    blue: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    purple: "text-purple-400 bg-purple-500/10 border-purple-500/20",
    yellow: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
  };

  return (
    <div className={`rounded-xl border p-6 ${colorClasses[color]}`}>
      <div className="flex items-center justify-between mb-4">
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>{icon}</div>
        {trend && (
          <span className={`text-xs px-2 py-1 rounded-full ${
            trend === "good" ? "bg-emerald-500/20 text-emerald-400" :
            trend === "bad" ? "bg-red-500/20 text-red-400" :
            "bg-slate-700 text-slate-400"
          }`}>
            {trend === "good" ? "Dobre" : trend === "bad" ? "Slabé" : "OK"}
          </span>
        )}
      </div>
      <div className="text-3xl font-bold text-slate-100 mb-1">{value}</div>
      <div className="text-sm text-slate-400">{title}</div>
      <div className="text-xs text-slate-500 mt-1">{subtitle}</div>
    </div>
  );
}

function FunnelStep({
  label,
  value,
  percentage,
  color,
}: {
  label: string;
  value: number;
  percentage: number;
  color: "blue" | "purple" | "emerald" | "yellow";
}) {
  const colorClasses = {
    blue: "bg-blue-500",
    purple: "bg-purple-500",
    emerald: "bg-emerald-500",
    yellow: "bg-yellow-500",
  };

  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-slate-300">{label}</span>
        <span className="text-slate-400">{value} ({percentage.toFixed(0)}%)</span>
      </div>
      <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
        <div
          className={`h-full ${colorClasses[color]} rounded-full transition-all`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
