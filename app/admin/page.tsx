"use client";

import { useEffect, useState } from "react";
import {
  Users,
  Building,
  Bookmark,
  TrendingUp,
  Activity,
  UserPlus,
  Shield,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import Link from "next/link";
import { getCityRegionLabel, ROLE_LABELS } from "@/lib/constants";

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
  recentUsers: Array<{
    id: string;
    email: string;
    name: string | null;
    role: string;
    createdAt: string;
    _count: { savedProperties: number };
  }>;
}

export default function AdminDashboard() {
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
        <div className="relative w-8 h-8">
          <div className="w-8 h-8 border-2 border-zinc-800 rounded-full"></div>
          <div className="absolute top-0 left-0 w-8 h-8 border-2 border-rose-500 rounded-full animate-spin border-t-transparent"></div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-12">
        <p className="text-zinc-500 text-sm">Nepodarilo sa načítať štatistiky</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header - Premium */}
      <div>
        <p className="text-[10px] text-zinc-600 uppercase tracking-widest font-medium mb-1">ADMIN</p>
        <h1 className="text-2xl font-semibold text-zinc-100 tracking-tight">Dashboard</h1>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          icon={<Users className="w-6 h-6" />}
          label="Celkom používateľov"
          value={stats.overview.totalUsers}
          color="blue"
        />
        <StatCard
          icon={<Building className="w-6 h-6" />}
          label="Nehnuteľností"
          value={stats.overview.totalProperties}
          color="emerald"
        />
        <StatCard
          icon={<Bookmark className="w-6 h-6" />}
          label="Uložených"
          value={stats.overview.totalSavedProperties}
          color="purple"
        />
        <StatCard
          icon={<Activity className="w-6 h-6" />}
          label="Aktívnych (7 dní)"
          value={stats.overview.activeUsers}
          color="yellow"
        />
        <StatCard
          icon={<UserPlus className="w-6 h-6" />}
          label="Noví (30 dní)"
          value={stats.overview.newUsersLast30Days}
          color="red"
          trend={stats.overview.newUsersLast30Days > 0 ? "up" : undefined}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Users by Role */}
        <div className="premium-card p-5">
          <h3 className="text-xs font-medium text-zinc-400 mb-4 flex items-center gap-2">
            <Shield className="w-4 h-4 text-rose-400" />
            Používatelia podľa role
          </h3>
          <div className="space-y-3">
            {stats.usersByRole.map((item) => {
              const total = stats.overview.totalUsers;
              const percentage = (item.count / total) * 100;
              
              return (
                <div key={item.role}>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-zinc-300">{ROLE_LABELS[item.role] || item.role}</span>
                    <span className="text-zinc-500 font-mono">{item.count}</span>
                  </div>
                  <div className="h-1.5 bg-zinc-900 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        item.role === "ADMIN" ? "bg-rose-500" :
                        item.role === "PREMIUM_INVESTOR" ? "bg-amber-500" :
                        "bg-zinc-700"
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Properties by City */}
        <div className="premium-card p-5">
          <h3 className="text-xs font-medium text-zinc-400 mb-4 flex items-center gap-2">
            <Building className="w-4 h-4 text-emerald-400" />
            Nehnuteľnosti podľa mesta
          </h3>
          <div className="space-y-3">
            {stats.propertiesByCity
              .sort((a, b) => b.count - a.count)
              .slice(0, 5)
              .map((item) => {
                const max = stats.propertiesByCity[0]?.count || 1;
                const percentage = (item.count / max) * 100;
                
                return (
                  <div key={item.city}>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-zinc-300">{getCityRegionLabel(item.city)}</span>
                      <span className="text-zinc-500 font-mono">{item.count}</span>
                    </div>
                    <div className="h-1.5 bg-zinc-900 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="premium-card p-5">
          <h3 className="text-xs font-medium text-zinc-400 mb-4">Rýchle akcie</h3>
          <div className="space-y-2">
            <Link
              href="/admin/users"
              className="flex items-center justify-between p-3 bg-zinc-900/50 rounded-xl hover:bg-zinc-800/80 transition-colors border border-zinc-800/30"
            >
              <div className="flex items-center gap-3">
                <Users className="w-4 h-4 text-blue-400" />
                <span className="text-zinc-200 text-sm">Používatelia</span>
              </div>
              <ArrowUpRight className="w-3.5 h-3.5 text-zinc-600" />
            </Link>
            <Link
              href="/admin/properties"
              className="flex items-center justify-between p-3 bg-zinc-900/50 rounded-xl hover:bg-zinc-800/80 transition-colors border border-zinc-800/30"
            >
              <div className="flex items-center gap-3">
                <Building className="w-4 h-4 text-emerald-400" />
                <span className="text-zinc-200 text-sm">Nehnuteľnosti</span>
              </div>
              <ArrowUpRight className="w-3.5 h-3.5 text-zinc-600" />
            </Link>
            <Link
              href="/admin/stats"
              className="flex items-center justify-between p-3 bg-zinc-900/50 rounded-xl hover:bg-zinc-800/80 transition-colors border border-zinc-800/30"
            >
              <div className="flex items-center gap-3">
                <TrendingUp className="w-4 h-4 text-amber-400" />
                <span className="text-zinc-200 text-sm">Štatistiky</span>
              </div>
              <ArrowUpRight className="w-3.5 h-3.5 text-zinc-600" />
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Users */}
      <div className="premium-card overflow-hidden">
        <div className="p-5 border-b border-zinc-800/30 flex items-center justify-between">
          <h3 className="text-xs font-medium text-zinc-400 flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-blue-400" />
            Najnovší používatelia
          </h3>
          <Link href="/admin/users" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
            Zobraziť všetkých →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-zinc-900/50">
              <tr>
                <th className="text-left py-3 px-5 text-[10px] font-medium text-zinc-600 uppercase tracking-widest">Email</th>
                <th className="text-left py-3 px-5 text-[10px] font-medium text-zinc-600 uppercase tracking-widest">Meno</th>
                <th className="text-left py-3 px-5 text-[10px] font-medium text-zinc-600 uppercase tracking-widest">Rola</th>
                <th className="text-left py-3 px-5 text-[10px] font-medium text-zinc-600 uppercase tracking-widest">Uložené</th>
                <th className="text-left py-3 px-5 text-[10px] font-medium text-zinc-600 uppercase tracking-widest">Registrácia</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/30">
              {stats.recentUsers.map((user) => (
                <tr key={user.id} className="hover:bg-zinc-800/30 transition-colors">
                  <td className="py-3 px-5 text-zinc-200 text-sm">{user.email}</td>
                  <td className="py-3 px-5 text-zinc-400 text-sm">{user.name || "—"}</td>
                  <td className="py-3 px-5">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                      user.role === "ADMIN" ? "bg-rose-500/10 text-rose-400" :
                      user.role === "PREMIUM_INVESTOR" ? "bg-amber-500/10 text-amber-400" :
                      "bg-zinc-800 text-zinc-400"
                    }`}>
                      {ROLE_LABELS[user.role] || user.role}
                    </span>
                  </td>
                  <td className="py-3 px-5 text-zinc-500 text-sm font-mono">{user._count.savedProperties}</td>
                  <td className="py-3 px-5 text-zinc-500 text-sm font-mono">
                    {new Date(user.createdAt).toLocaleDateString("sk-SK")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
  trend,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: "blue" | "emerald" | "purple" | "yellow" | "red";
  trend?: "up" | "down";
}) {
  const iconColorClasses = {
    blue: "text-blue-400",
    emerald: "text-emerald-400",
    purple: "text-purple-400",
    yellow: "text-amber-400",
    red: "text-rose-400",
  };

  return (
    <div className="premium-card p-4 hover:border-zinc-700 transition-all">
      <div className="flex items-center justify-between mb-3">
        <div className={`${iconColorClasses[color]}`}>
          {icon}
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-[10px] font-mono ${
            trend === "up" ? "text-emerald-400" : "text-rose-400"
          }`}>
            {trend === "up" ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          </div>
        )}
      </div>
      <div className="text-2xl font-semibold text-zinc-100 font-mono tracking-tight mb-0.5">{value.toLocaleString()}</div>
      <div className="text-[10px] text-zinc-600 uppercase tracking-widest">{label}</div>
    </div>
  );
}
