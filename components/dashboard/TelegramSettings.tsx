"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Send,
  Check,
  X,
  ExternalLink,
  Bell,
  BellOff,
  Link2,
  Unlink,
  Crown,
  Zap,
  Loader2,
} from "lucide-react";

interface TelegramStatus {
  isPro: boolean;
  isConnected: boolean;
  telegramUsername?: string;
  telegramConnectedAt?: string;
  telegramEnabled: boolean;
  connectLink: string;
  notifications?: {
    marketGaps: boolean;
    priceDrops: boolean;
    newProperties: boolean;
    highYield: boolean;
    distressed: boolean;
    urbanDevelopment: boolean;
    frequency: string | null;
  };
  error?: string;
  upgradeUrl?: string;
}

async function fetchTelegramStatus(): Promise<TelegramStatus> {
  const response = await fetch("/api/v1/telegram/connect");
  return response.json();
}

async function updateTelegramSettings(body: {
  action: string;
  settings?: Record<string, unknown>;
}) {
  const response = await fetch("/api/v1/telegram/connect", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return response.json();
}

async function disconnectTelegram() {
  const response = await fetch("/api/v1/telegram/connect", {
    method: "DELETE",
  });
  return response.json();
}

export function TelegramSettings() {
  const queryClient = useQueryClient();
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);

  const { data: status, isLoading } = useQuery({
    queryKey: ["telegram-status"],
    queryFn: fetchTelegramStatus,
    retry: 1,
    staleTime: 1000 * 60,
  });

  const toggleMutation = useMutation({
    mutationFn: (enabled: boolean) =>
      updateTelegramSettings({ action: enabled ? "enable" : "disable" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["telegram-status"] });
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: disconnectTelegram,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["telegram-status"] });
    },
  });

  const notificationMutation = useMutation({
    mutationFn: (settings: Record<string, unknown>) =>
      updateTelegramSettings({ action: "update_notifications", settings }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["telegram-status"] });
    },
  });

  if (isLoading) {
    return (
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950/20 p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
        </div>
      </div>
    );
  }

  // Not Pro - show upgrade prompt
  if (!status?.isPro) {
    return (
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/20 p-6">
        <div className="absolute -top-24 -right-24 w-48 h-48 rounded-full blur-3xl opacity-10 bg-amber-500" />
        
        <div className="relative">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
              <Send className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                Telegram Bot
                <Crown className="w-5 h-5 text-amber-500" />
              </h2>
              <p className="text-sm text-slate-400">Real-time notifikácie pre investorov</p>
            </div>
          </div>

          <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shrink-0">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-white mb-2">
                  Pro funkcia
                </h3>
                <p className="text-slate-400 text-sm mb-4">
                  Telegram notifikácie sú dostupné pre Pro predplatiteľov.
                  Získaj real-time upozornenia o:
                </p>
                <ul className="space-y-2 text-sm text-slate-300 mb-6">
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-500">🎯</span>
                    Market Gaps - podhodnotené nehnuteľnosti
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-blue-500">📉</span>
                    Cenové poklesy nad 5%
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-orange-500">🔥</span>
                    Hot Deals - výhodné ponuky
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-500">💰</span>
                    Vysoké výnosy nad 8%
                  </li>
                </ul>
                <a
                  href="/pricing"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 
                             text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-amber-500/25 transition-all"
                >
                  <Crown className="w-5 h-5" />
                  Upgradovať na Pro
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Pro user - show Telegram settings
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950/20 p-6">
      <div className="absolute -top-24 -right-24 w-48 h-48 rounded-full blur-3xl opacity-10 bg-blue-500" />
      
      <div className="relative">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
            <Send className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              Telegram Bot
              <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs font-medium rounded-full">
                Pro
              </span>
            </h2>
            <p className="text-sm text-slate-400">Real-time notifikácie priamo do Telegramu</p>
          </div>
        </div>

        {/* Connection Status */}
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`w-3 h-3 rounded-full ${
                  status.isConnected && status.telegramEnabled
                    ? "bg-emerald-500 animate-pulse"
                    : status.isConnected
                    ? "bg-amber-500"
                    : "bg-slate-600"
                }`}
              />
              <div>
                <p className="font-medium text-white">
                  {status.isConnected
                    ? status.telegramEnabled
                      ? "Pripojené a aktívne"
                      : "Pripojené (pozastavené)"
                    : "Nepripojené"}
                </p>
                {status.telegramUsername && (
                  <p className="text-sm text-slate-400">@{status.telegramUsername}</p>
                )}
              </div>
            </div>

            {status.isConnected ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleMutation.mutate(!status.telegramEnabled)}
                  disabled={toggleMutation.isPending}
                  className={`p-2 rounded-lg transition-all ${
                    status.telegramEnabled
                      ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                      : "bg-slate-700 text-slate-400 hover:bg-slate-600"
                  }`}
                  title={status.telegramEnabled ? "Pozastaviť notifikácie" : "Zapnúť notifikácie"}
                >
                  {status.telegramEnabled ? (
                    <Bell className="w-5 h-5" />
                  ) : (
                    <BellOff className="w-5 h-5" />
                  )}
                </button>
                <button
                  onClick={() => {
                    if (confirm("Naozaj chcete odpojiť Telegram?")) {
                      disconnectMutation.mutate();
                    }
                  }}
                  disabled={disconnectMutation.isPending}
                  className="p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-all"
                  title="Odpojiť Telegram"
                >
                  <Unlink className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <a
                href={status.connectLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 
                           text-white font-medium rounded-lg hover:shadow-lg hover:shadow-blue-500/25 transition-all"
              >
                <Link2 className="w-4 h-4" />
                Pripojiť Telegram
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
          </div>
        </div>

        {/* Quick Info */}
        {!status.isConnected && (
          <div className="bg-blue-500/10 rounded-xl p-4 border border-blue-500/20 mb-4">
            <h4 className="font-medium text-blue-400 mb-2">Ako pripojiť Telegram?</h4>
            <ol className="text-sm text-slate-300 space-y-1 list-decimal list-inside">
              <li>Klikni na tlačidlo &quot;Pripojiť Telegram&quot;</li>
              <li>Otvorí sa Telegram s naším botom @SRIABot</li>
              <li>Stlač tlačidlo &quot;Spustiť&quot; / &quot;Start&quot;</li>
              <li>Hotovo! Budeš dostávať notifikácie.</li>
            </ol>
          </div>
        )}

        {/* Notification Settings */}
        {status.isConnected && (
          <>
            <button
              onClick={() => setShowNotificationSettings(!showNotificationSettings)}
              className="w-full flex items-center justify-between p-4 bg-slate-800/30 rounded-xl 
                         border border-slate-700/50 hover:bg-slate-800/50 transition-all mb-4"
            >
              <span className="font-medium text-white">Nastavenia notifikácií</span>
              <span className={`text-slate-400 transition-transform ${showNotificationSettings ? "rotate-180" : ""}`}>
                ▼
              </span>
            </button>

            {showNotificationSettings && status.notifications && (
              <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/50 space-y-3">
                {[
                  { key: "marketGaps", label: "Market Gaps", icon: "🎯", desc: "Podhodnotené nehnuteľnosti" },
                  { key: "priceDrops", label: "Cenové poklesy", icon: "📉", desc: "Pokles ceny > 5%" },
                  { key: "newProperties", label: "Nové nehnuteľnosti", icon: "🆕", desc: "V sledovaných lokalitách" },
                  { key: "highYield", label: "Vysoký výnos", icon: "💰", desc: "Výnos > 8%" },
                  { key: "distressed", label: "Distressed", icon: "⚠️", desc: "Nehnuteľnosti v núdzi" },
                  { key: "urbanDevelopment", label: "Urban Development", icon: "🏗️", desc: "Nové projekty" },
                ].map((item) => (
                  <button
                    key={item.key}
                    onClick={() =>
                      notificationMutation.mutate({
                        [item.key]: !status.notifications?.[item.key as keyof typeof status.notifications],
                      })
                    }
                    disabled={notificationMutation.isPending}
                    className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-slate-700/50 transition-all"
                  >
                    <span className="text-xl">{item.icon}</span>
                    <div className="flex-1 text-left">
                      <p className="font-medium text-white">{item.label}</p>
                      <p className="text-xs text-slate-500">{item.desc}</p>
                    </div>
                    <div
                      className={`w-10 h-6 rounded-full transition-all ${
                        status.notifications?.[item.key as keyof typeof status.notifications]
                          ? "bg-blue-500"
                          : "bg-slate-700"
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full bg-white shadow transition-all mt-0.5 ${
                          status.notifications?.[item.key as keyof typeof status.notifications]
                            ? "ml-4"
                            : "ml-0.5"
                        }`}
                      />
                    </div>
                  </button>
                ))}

                {/* Frequency */}
                <div className="pt-3 border-t border-slate-700/50">
                  <label className="block text-sm font-medium text-slate-400 mb-2">
                    Frekvencia notifikácií
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { id: "realtime", label: "Real-time" },
                      { id: "hourly", label: "Hodinovo" },
                      { id: "daily", label: "Denne" },
                      { id: "weekly", label: "Týždenne" },
                    ].map((freq) => (
                      <button
                        key={freq.id}
                        onClick={() =>
                          notificationMutation.mutate({ frequency: freq.id })
                        }
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                          status.notifications?.frequency === freq.id
                            ? "bg-blue-500 text-white"
                            : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                        }`}
                      >
                        {freq.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Example notification */}
        <div className="mt-4 p-4 bg-slate-800/30 rounded-xl border border-slate-700/50">
          <p className="text-xs text-slate-500 mb-2">Príklad notifikácie:</p>
          <div className="bg-slate-900 rounded-lg p-3 text-sm">
            <p className="text-white font-medium">🎯 Market Gap nájdený!</p>
            <p className="text-slate-400 mt-1">
              📍 <span className="text-white">Nitra</span> - Centrum
            </p>
            <p className="text-slate-400">
              🏠 3-izbový byt, 68m²
            </p>
            <p className="text-slate-400">
              💵 <span className="text-emerald-400 font-medium">89 000 €</span> (1 309 €/m²)
            </p>
            <p className="text-emerald-400 font-medium mt-1">
              🎯 Podhodnotenie: 18%
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
