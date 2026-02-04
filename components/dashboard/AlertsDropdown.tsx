"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Bell, TrendingDown, Sparkles, ChevronRight } from "lucide-react";

interface AIAlert {
  id: string;
  type: string;
  propertyId: string;
  metadata: { oldPrice?: number; newPrice?: number; percentChange?: number; investmentScore?: number };
  readAt: string | null;
  createdAt: string;
  property?: {
    id: string;
    title: string;
    price: number;
    price_per_m2: number;
    city: string;
    district: string;
  };
}

export function AlertsDropdown() {
  const [alerts, setAlerts] = useState<AIAlert[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/ai/alerts?limit=10&unreadOnly=true");
      const data = await res.json();
      if (data.success) {
        setAlerts(data.data.alerts);
        setUnreadCount(data.data.unreadCount);
      }
    } catch {
      setAlerts([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const handleMarkRead = async (alertIds: string[]) => {
    try {
      await fetch("/api/v1/ai/alerts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alertIds }),
      });
      fetchAlerts();
    } catch {
      // ignore
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await fetch("/api/v1/ai/alerts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllRead: true }),
      });
      setOpen(false);
      fetchAlerts();
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  const formatPrice = (n: number) => new Intl.NumberFormat("sk-SK", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
  const formatDate = (d: string) => {
    const date = new Date(d);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    if (diff < 60 * 60 * 1000) return "Pred " + Math.floor(diff / 60000) + " min";
    if (diff < 24 * 60 * 60 * 1000) return "Pred " + Math.floor(diff / 3600000) + " h";
    return date.toLocaleDateString("sk-SK", { day: "numeric", month: "short" });
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50 transition-colors"
        aria-label="Notifikácie"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center bg-violet-500 text-white text-xs font-bold rounded-full">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-2 w-80 max-h-[400px] bg-zinc-900 border border-zinc-700 rounded-xl shadow-xl z-50 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-700">
            <h3 className="font-semibold text-zinc-100">AI Notifikácie</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs text-violet-400 hover:text-violet-300"
              >
                Označiť všetko ako prečítané
              </button>
            )}
          </div>
          <div className="overflow-y-auto flex-1">
            {loading ? (
              <div className="p-6 text-center text-zinc-500 text-sm">Načítavam...</div>
            ) : alerts.length === 0 ? (
              <div className="p-6 text-center text-zinc-500 text-sm">
                Žiadne nové notifikácie
              </div>
            ) : (
              <div className="divide-y divide-zinc-800">
                {alerts.map((alert) => (
                  <Link
                    key={alert.id}
                    href={`/dashboard/property/${alert.propertyId}`}
                    onClick={() => {
                      handleMarkRead([alert.id]);
                      setOpen(false);
                    }}
                    className="block px-4 py-3 hover:bg-zinc-800/50 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 p-1.5 rounded-lg ${
                        alert.type === "PRICE_DROP" ? "bg-emerald-500/20" : "bg-violet-500/20"
                      }`}>
                        {alert.type === "PRICE_DROP" ? (
                          <TrendingDown className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Sparkles className="w-4 h-4 text-violet-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-zinc-100 truncate">
                          {alert.property?.title || "Nehnuteľnosť"}
                        </p>
                        <p className="text-xs text-zinc-500 mt-0.5">
                          {alert.type === "PRICE_DROP" && alert.metadata.percentChange != null && (
                            <>Cena klesla o {alert.metadata.percentChange.toFixed(1)}%</>
                          )}
                          {alert.type === "BETTER_MATCH" && (
                            <>Lepší match pre tvoje kritériá (skóre {alert.metadata.investmentScore}/100)</>
                          )}
                        </p>
                        {alert.property && (
                          <p className="text-xs text-zinc-400 mt-0.5">
                            {formatPrice(alert.property.price)} · {alert.property.city}
                          </p>
                        )}
                        <p className="text-[10px] text-zinc-600 mt-1">{formatDate(alert.createdAt)}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-zinc-500 shrink-0" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
