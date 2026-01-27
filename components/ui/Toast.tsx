"use client";

import { useToastStore, type ToastType } from "@/lib/hooks/useToast";
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from "lucide-react";
import { useEffect, useState } from "react";

const ICONS: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle className="w-5 h-5" />,
  error: <AlertCircle className="w-5 h-5" />,
  warning: <AlertTriangle className="w-5 h-5" />,
  info: <Info className="w-5 h-5" />,
};

const COLORS: Record<ToastType, string> = {
  success: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400",
  error: "bg-red-500/10 border-red-500/30 text-red-400",
  warning: "bg-yellow-500/10 border-yellow-500/30 text-yellow-400",
  info: "bg-blue-500/10 border-blue-500/30 text-blue-400",
};

const ICON_COLORS: Record<ToastType, string> = {
  success: "text-emerald-400",
  error: "text-red-400",
  warning: "text-yellow-400",
  info: "text-blue-400",
};

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 z-[100] flex flex-col gap-2 sm:max-w-sm safe-area-inset-bottom">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`flex items-start gap-2 sm:gap-3 p-3 sm:p-4 rounded-lg border backdrop-blur-sm animate-in slide-in-from-right-5 fade-in duration-200 ${COLORS[toast.type]}`}
        >
          <div className={`shrink-0 ${ICON_COLORS[toast.type]}`}>{ICONS[toast.type]}</div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-zinc-100 text-sm sm:text-base">{toast.title}</p>
            {toast.message && (
              <p className="text-xs sm:text-sm text-zinc-400 mt-0.5 sm:mt-1">{toast.message}</p>
            )}
          </div>
          <button
            onClick={() => removeToast(toast.id)}
            className="text-zinc-400 hover:text-zinc-100 transition-colors shrink-0 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
