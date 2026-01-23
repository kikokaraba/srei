"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Map,
  Filter,
  BarChart3,
  Settings,
  LogOut,
  TrendingUp,
} from "lucide-react";
import { signOut } from "next-auth/react";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Heatmapa", href: "/dashboard/heatmap", icon: Map },
  { name: "Nehnuteľnosti", href: "/dashboard/properties", icon: Filter },
  { name: "Analytika", href: "/dashboard/analytics", icon: BarChart3 },
  { name: "Porovnanie", href: "/dashboard/comparison", icon: TrendingUp },
  { name: "Nastavenia", href: "/dashboard/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col">
      <div className="p-6 border-b border-slate-800">
        <h2 className="text-xl font-bold text-emerald-400">SREI</h2>
        <p className="text-xs text-slate-500 mt-1">
          Slovenská Realitná Investičná Inteligencia
        </p>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  : "text-slate-300 hover:bg-slate-800 hover:text-slate-100"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <button
          onClick={() => signOut({ callbackUrl: "/auth/signin" })}
          className="flex items-center gap-3 px-4 py-3 w-full rounded-lg text-slate-300 hover:bg-slate-800 hover:text-slate-100 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Odhlásiť sa</span>
        </button>
      </div>
    </aside>
  );
}
