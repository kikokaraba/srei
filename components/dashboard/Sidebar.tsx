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
  Bookmark,
  Calculator,
  Shield,
  Briefcase,
  Menu,
  X,
  Brain,
  Sparkles,
} from "lucide-react";
import { signOut, useSession } from "next-auth/react";

// Zoskupená navigácia pre lepší prehľad
const navigationGroups = [
  {
    title: "Prehľad",
    items: [
      { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { name: "Portfólio", href: "/dashboard/portfolio", icon: Briefcase },
    ],
  },
  {
    title: "Nehnuteľnosti",
    items: [
      { name: "Vyhľadávanie", href: "/dashboard/properties", icon: Filter },
      { name: "Mapa", href: "/dashboard/map", icon: MapPin },
      { name: "Sledované", href: "/dashboard/saved", icon: Bookmark },
    ],
  },
  {
    title: "AI Nástroje",
    items: [
      { name: "AI Asistent", href: "/dashboard/ai", icon: Sparkles },
    ],
  },
  {
    title: "Nástroje",
    items: [
      { name: "Kalkulačky", href: "/dashboard/calculators", icon: Calculator },
      { name: "Analytika", href: "/dashboard/analytics", icon: BarChart3 },
    ],
  },
  {
    title: null, // No title for last section
    items: [
      { name: "Nastavenia", href: "/dashboard/settings", icon: Settings },
    ],
  },
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
      {/* Logo Section */}
      <div className="p-4 lg:p-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center">
            <span className="text-emerald-400 font-bold text-lg">S</span>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-zinc-100 tracking-tight">SRIA</h2>
            <p className="text-[10px] text-zinc-500 tracking-wide hidden sm:block">
              REAL ESTATE INTELLIGENCE
            </p>
          </div>
        </div>
        {/* Close button for mobile */}
        <button
          onClick={() => setMobileMenuOpen(false)}
          className="lg:hidden p-2 text-zinc-500 hover:text-zinc-100 rounded-lg hover:bg-zinc-800/50"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 lg:px-3 py-2 space-y-5 overflow-y-auto">
        {navigationGroups.map((group, groupIndex) => (
          <div key={groupIndex}>
            {group.title && (
              <p className="px-3 mb-2 text-[10px] font-medium text-zinc-600 uppercase tracking-widest">
                {group.title}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${
                      isActive
                        ? "bg-zinc-800/80 text-zinc-100"
                        : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200"
                    }`}
                  >
                    {/* Active indicator */}
                    {isActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-emerald-400 rounded-r" />
                    )}
                    <Icon className={`w-[18px] h-[18px] shrink-0 ${isActive ? "text-emerald-400" : ""}`} />
                    <span className="font-medium text-[13px] tracking-wide">{item.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}

        {/* Admin Link */}
        {isAdmin && (
          <div className="pt-3 mt-2 border-t border-zinc-800/50">
            <Link
              href="/admin"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-rose-400 hover:bg-rose-500/10"
            >
              <Shield className="w-[18px] h-[18px] shrink-0" />
              <span className="font-medium text-[13px] tracking-wide">Admin Panel</span>
            </Link>
          </div>
        )}
      </nav>

      {/* Logout */}
      <div className="p-3 lg:p-3 border-t border-zinc-800/30">
        <button
          onClick={() => signOut({ callbackUrl: "/auth/signin" })}
          className="flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-zinc-500 hover:bg-zinc-800/50 hover:text-zinc-300 transition-all duration-200"
        >
          <LogOut className="w-[18px] h-[18px] shrink-0" />
          <span className="font-medium text-[13px] tracking-wide">Odhlásiť sa</span>
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile Header - Premium */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 glass-premium px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center">
            <span className="text-emerald-400 font-bold text-sm">S</span>
          </div>
          <span className="text-base font-semibold text-zinc-100 tracking-tight">SRIA</span>
        </div>
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="p-2 text-zinc-400 hover:text-zinc-100 rounded-lg hover:bg-zinc-800/50"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Sidebar - Premium */}
      <aside
        className={`lg:hidden fixed top-0 left-0 bottom-0 z-50 w-64 bg-[#0a0a0a] border-r border-zinc-800/30 flex flex-col transform transition-transform duration-300 ease-in-out ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <SidebarContent />
      </aside>

      {/* Desktop Sidebar - Premium Glassmorphism */}
      <aside className="hidden lg:flex w-56 glass-sidebar flex-col shrink-0 sticky top-0 h-screen">
        <SidebarContent />
      </aside>
    </>
  );
}
