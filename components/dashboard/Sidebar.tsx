"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  MapPin,
  Filter,
  BarChart3,
  Settings,
  LogOut,
  TrendingUp,
  Bookmark,
  Calculator,
  Shield,
  Briefcase,
  Brain,
  Menu,
  X,
  Scale,
  Sparkles,
  Banknote,
} from "lucide-react";
import { signOut, useSession } from "next-auth/react";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Portfólio", href: "/dashboard/portfolio", icon: Briefcase },
  { name: "Nehnuteľnosti", href: "/dashboard/properties", icon: Filter },
  { name: "Mapa", href: "/dashboard/map", icon: MapPin },
  { name: "Nacenenie", href: "/dashboard/valuation", icon: Sparkles },
  { name: "Hypokalkulačka", href: "/dashboard/mortgage", icon: Banknote },
  { name: "Porovnanie cien", href: "/dashboard/matches", icon: Scale },
  { name: "AI Predikcie", href: "/dashboard/predictions", icon: Brain },
  { name: "Sledované", href: "/dashboard/saved", icon: Bookmark },
  { name: "Analytika", href: "/dashboard/analytics", icon: BarChart3 },
  { name: "Kalkulačky", href: "/dashboard/calculators", icon: Calculator },
  { name: "Nastavenia", href: "/dashboard/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [isAdmin, setIsAdmin] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    // Check if user is admin
    if (session?.user?.id) {
      fetch("/api/v1/admin/stats")
        .then((res) => {
          if (res.ok) {
            setIsAdmin(true);
          }
        })
        .catch(() => {});
    }
  }, [session?.user?.id]);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const SidebarContent = () => (
    <>
      <div className="p-4 lg:p-6 border-b border-slate-800 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-emerald-400">SRIA</h2>
          <p className="text-xs text-slate-500 mt-1 hidden sm:block">
            Slovenská Realitná Investičná Aplikácia
          </p>
        </div>
        {/* Close button for mobile */}
        <button
          onClick={() => setMobileMenuOpen(false)}
          className="lg:hidden p-2 text-slate-400 hover:text-slate-100"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav className="flex-1 p-3 lg:p-4 space-y-1 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-3 lg:px-4 py-2.5 lg:py-3 rounded-lg transition-colors ${
                isActive
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  : "text-slate-300 hover:bg-slate-800 hover:text-slate-100"
              }`}
            >
              <Icon className="w-5 h-5 shrink-0" />
              <span className="font-medium text-sm lg:text-base">{item.name}</span>
            </Link>
          );
        })}

        {/* Admin Link */}
        {isAdmin && (
          <Link
            href="/admin"
            className="flex items-center gap-3 px-3 lg:px-4 py-2.5 lg:py-3 rounded-lg transition-colors mt-4 bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20"
          >
            <Shield className="w-5 h-5 shrink-0" />
            <span className="font-medium text-sm lg:text-base">Admin Panel</span>
          </Link>
        )}
      </nav>

      <div className="p-3 lg:p-4 border-t border-slate-800">
        <button
          onClick={() => signOut({ callbackUrl: "/auth/signin" })}
          className="flex items-center gap-3 px-3 lg:px-4 py-2.5 lg:py-3 w-full rounded-lg text-slate-300 hover:bg-slate-800 hover:text-slate-100 transition-colors"
        >
          <LogOut className="w-5 h-5 shrink-0" />
          <span className="font-medium text-sm lg:text-base">Odhlásiť sa</span>
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center justify-between">
        <h2 className="text-lg font-bold text-emerald-400">SRIA</h2>
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="p-2 text-slate-400 hover:text-slate-100 rounded-lg hover:bg-slate-800"
        >
          <Menu className="w-6 h-6" />
        </button>
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-black/50"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside
        className={`lg:hidden fixed top-0 left-0 bottom-0 z-50 w-72 bg-slate-900 border-r border-slate-800 flex flex-col transform transition-transform duration-300 ease-in-out ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <SidebarContent />
      </aside>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 bg-slate-900 border-r border-slate-800 flex-col shrink-0">
        <SidebarContent />
      </aside>
    </>
  );
}
