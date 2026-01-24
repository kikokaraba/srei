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
} from "lucide-react";

const adminNav = [
  { name: "Prehľad", href: "/admin", icon: LayoutDashboard },
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
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-emerald-400 animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Overujem prístup...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  const SidebarContent = () => (
    <>
      <div className="p-4 lg:p-6 border-b border-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 lg:w-6 lg:h-6 text-red-400" />
            <div>
              <h2 className="text-lg lg:text-xl font-bold text-red-400">Admin</h2>
              <p className="text-xs text-slate-500 hidden lg:block">SRIA Management</p>
            </div>
          </div>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="lg:hidden p-2 text-slate-400 hover:text-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <nav className="flex-1 p-3 lg:p-4 space-y-1">
        {adminNav.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-3 lg:px-4 py-2.5 lg:py-3 rounded-lg transition-colors ${
                isActive
                  ? "bg-red-500/10 text-red-400 border border-red-500/20"
                  : "text-slate-300 hover:bg-slate-800 hover:text-slate-100"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium text-sm lg:text-base">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-3 lg:p-4 border-t border-slate-800 space-y-2">
        <Link
          href="/dashboard"
          className="flex items-center gap-3 px-3 lg:px-4 py-2.5 lg:py-3 w-full rounded-lg text-slate-300 hover:bg-slate-800 hover:text-slate-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="font-medium text-sm lg:text-base">Späť do appky</span>
        </Link>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-red-400" />
          <h2 className="text-lg font-bold text-red-400">Admin</h2>
        </div>
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

      <div className="flex">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex w-64 bg-slate-900 border-r border-slate-800 flex-col shrink-0 fixed top-0 left-0 bottom-0">
          <SidebarContent />
        </aside>

        {/* Main Content */}
        <main className="flex-1 lg:ml-64 pt-14 lg:pt-0">
          <div className="p-4 lg:p-8 max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
