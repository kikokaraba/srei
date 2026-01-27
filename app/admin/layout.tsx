"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Building,
  ArrowLeft,
  Shield,
  Loader2,
  BarChart3,
  Menu,
  X,
  Database,
  Brain,
  Rocket,
} from "lucide-react";

const adminNav = [
  { name: "Prehľad", href: "/admin", icon: LayoutDashboard },
  { name: "Growth Analytics", href: "/admin/growth", icon: Rocket, highlight: true },
  { name: "AI Brain", href: "/admin/ai-brain", icon: Brain },
  { name: "Používatelia", href: "/admin/users", icon: Users },
  { name: "Nehnuteľnosti", href: "/admin/properties", icon: Building },
  { name: "Dáta & Scraper", href: "/admin/data", icon: Database },
  { name: "Štatistiky", href: "/admin/stats", icon: BarChart3 },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    // Check if user is admin
    fetch("/api/v1/admin/stats")
      .then((res) => {
        if (res.status === 403 || res.status === 401) {
          router.push("/dashboard");
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data?.success) {
          setIsAdmin(true);
        }
      })
      .catch(() => {
        router.push("/dashboard");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [router]);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-10 h-10 mx-auto mb-4">
            <div className="w-10 h-10 border-2 border-zinc-800 rounded-full"></div>
            <div className="absolute top-0 left-0 w-10 h-10 border-2 border-rose-500 rounded-full animate-spin border-t-transparent"></div>
          </div>
          <p className="text-zinc-500 text-sm">Overujem prístup...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className="p-4 lg:p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-500/10 flex items-center justify-center">
              <Shield className="w-4 h-4 text-rose-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-zinc-100 tracking-tight">Admin</h2>
              <p className="text-[10px] text-zinc-600 tracking-wide hidden lg:block">MANAGEMENT</p>
            </div>
          </div>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="lg:hidden p-2 text-zinc-500 hover:text-zinc-200 rounded-lg hover:bg-zinc-800/50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2 space-y-0.5">
        {adminNav.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          const isHighlight = 'highlight' in item && item.highlight;

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
                <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r ${isHighlight ? "bg-emerald-400" : "bg-rose-400"}`} />
              )}
              <Icon className={`w-[18px] h-[18px] ${isActive ? (isHighlight ? "text-emerald-400" : "text-rose-400") : ""}`} />
              <span className="font-medium text-[13px] tracking-wide">{item.name}</span>
              {isHighlight && !isActive && (
                <span className="ml-auto text-[9px] px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 rounded font-medium">NEW</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-zinc-800/30">
        <Link
          href="/dashboard"
          className="flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-zinc-500 hover:bg-zinc-800/50 hover:text-zinc-300 transition-all duration-200"
        >
          <ArrowLeft className="w-[18px] h-[18px]" />
          <span className="font-medium text-[13px] tracking-wide">Späť do appky</span>
        </Link>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-[#050505]">
      {/* Mobile Header - Premium */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 glass-premium px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-rose-500/10 flex items-center justify-center">
            <Shield className="w-3.5 h-3.5 text-rose-400" />
          </div>
          <span className="text-sm font-semibold text-zinc-100">Admin</span>
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

      {/* Mobile Sidebar */}
      <aside
        className={`lg:hidden fixed top-0 left-0 bottom-0 z-50 w-64 bg-[#0a0a0a] border-r border-zinc-800/30 flex flex-col transform transition-transform duration-300 ease-in-out ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <SidebarContent />
      </aside>

      <div className="flex">
        {/* Desktop Sidebar - Premium Glassmorphism */}
        <aside className="hidden lg:flex w-56 glass-sidebar flex-col shrink-0 fixed top-0 left-0 bottom-0">
          <SidebarContent />
        </aside>

        {/* Main Content */}
        <main className="flex-1 lg:ml-56 pt-14 lg:pt-0">
          <div className="p-4 lg:p-8 max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
