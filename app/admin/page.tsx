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

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Admin",
  PREMIUM_INVESTOR: "Premium",
  FREE_USER: "Free",
};

const CITY_LABELS: Record<string, string> = {
  BRATISLAVA: "Bratislava",
  KOSICE: "Košice",
  PRESOV: "Prešov",
  ZILINA: "Žilina",
  BANSKA_BYSTRICA: "B. Bystrica",
  TRNAVA: "Trnava",
  TRENCIN: "Trenčín",
  NITRA: "Nitra",
};

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

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-100 mb-2">Admin Dashboard</h1>
        <p className="text-slate-400">Prehľad a správa SRIA platformy</p>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Users by Role */}
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
          <h3 className="font-semibold text-slate-100 mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-red-400" />
            Používatelia podľa role
          </h3>
          <div className="space-y-3">
            {stats.usersByRole.map((item) => {
              const total = stats.overview.totalUsers;
              const percentage = (item.count / total) * 100;
              
              return (
                <div key={item.role}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-300">{ROLE_LABELS[item.role] || item.role}</span>
                    <span className="text-slate-400">{item.count} ({percentage.toFixed(0)}%)</span>
                  </div>
                  <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        item.role === "ADMIN" ? "bg-red-500" :
                        item.role === "PREMIUM_INVESTOR" ? "bg-yellow-500" :
                        "bg-slate-600"
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
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
          <h3 className="font-semibold text-slate-100 mb-4 flex items-center gap-2">
            <Building className="w-5 h-5 text-emerald-400" />
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
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-300">{CITY_LABELS[item.city] || item.city}</span>
                      <span className="text-slate-400">{item.count}</span>
                    </div>
                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
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
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
          <h3 className="font-semibold text-slate-100 mb-4">Rýchle akcie</h3>
          <div className="space-y-3">
            <Link
              href="/admin/users"
              className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-blue-400" />
                <span className="text-slate-100">Spravovať používateľov</span>
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-400" />
            </Link>
            <Link
              href="/admin/properties"
              className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Building className="w-5 h-5 text-emerald-400" />
                <span className="text-slate-100">Spravovať nehnuteľnosti</span>
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-400" />
            </Link>
            <Link
              href="/admin/stats"
              className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <div className="flex items-center gap-3">
                <TrendingUp className="w-5 h-5 text-yellow-400" />
                <span className="text-slate-100">Detailné štatistiky</span>
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-400" />
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Users */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <h3 className="font-semibold text-slate-100 flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-blue-400" />
            Najnovší používatelia
          </h3>
          <Link href="/admin/users" className="text-sm text-emerald-400 hover:underline">
            Zobraziť všetkých →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-800/50">
              <tr>
                <th className="text-left py-3 px-6 text-sm font-medium text-slate-400">Email</th>
                <th className="text-left py-3 px-6 text-sm font-medium text-slate-400">Meno</th>
                <th className="text-left py-3 px-6 text-sm font-medium text-slate-400">Rola</th>
                <th className="text-left py-3 px-6 text-sm font-medium text-slate-400">Uložené</th>
                <th className="text-left py-3 px-6 text-sm font-medium text-slate-400">Registrácia</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {stats.recentUsers.map((user) => (
                <tr key={user.id} className="hover:bg-slate-800/30">
                  <td className="py-3 px-6 text-slate-100">{user.email}</td>
                  <td className="py-3 px-6 text-slate-300">{user.name || "—"}</td>
                  <td className="py-3 px-6">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      user.role === "ADMIN" ? "bg-red-500/20 text-red-400" :
                      user.role === "PREMIUM_INVESTOR" ? "bg-yellow-500/20 text-yellow-400" :
                      "bg-slate-700 text-slate-300"
                    }`}>
                      {ROLE_LABELS[user.role] || user.role}
                    </span>
                  </td>
                  <td className="py-3 px-6 text-slate-400">{user._count.savedProperties}</td>
                  <td className="py-3 px-6 text-slate-400">
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
  const colorClasses = {
    blue: "text-blue-400 bg-blue-500/10",
    emerald: "text-emerald-400 bg-emerald-500/10",
    purple: "text-purple-400 bg-purple-500/10",
    yellow: "text-yellow-400 bg-yellow-500/10",
    red: "text-red-400 bg-red-500/10",
  };

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 p-5">
      <div className="flex items-center justify-between mb-3">
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          {icon}
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-xs ${
            trend === "up" ? "text-emerald-400" : "text-red-400"
          }`}>
            {trend === "up" ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          </div>
        )}
      </div>
      <div className="text-3xl font-bold text-slate-100 mb-1">{value}</div>
      <div className="text-sm text-slate-400">{label}</div>
    </div>
  );
}
