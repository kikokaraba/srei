"use client";

import { LucideIcon } from "lucide-react";

interface FeatureTag {
  icon: LucideIcon;
  label: string;
}

interface PageHeaderProps {
  title: string;
  description: string;
  icon: LucideIcon;
  color?: "emerald" | "blue" | "violet" | "amber" | "cyan";
  features?: FeatureTag[];
  showSparkle?: boolean;
  children?: React.ReactNode;
}

const COLOR_CLASSES = {
  emerald: {
    iconColor: "text-emerald-400",
    accent: "text-emerald-400",
  },
  blue: {
    iconColor: "text-blue-400",
    accent: "text-blue-400",
  },
  violet: {
    iconColor: "text-violet-400",
    accent: "text-violet-400",
  },
  amber: {
    iconColor: "text-amber-400",
    accent: "text-amber-400",
  },
  cyan: {
    iconColor: "text-cyan-400",
    accent: "text-cyan-400",
  },
};

export function PageHeader({
  title,
  description,
  icon: Icon,
  color = "emerald",
  features,
  children,
}: PageHeaderProps) {
  const colors = COLOR_CLASSES[color];

  return (
    <div className="premium-card p-5 lg:p-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className={`${colors.iconColor}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-zinc-600 uppercase tracking-widest font-medium mb-0.5">
              {description}
            </p>
            <h1 className="text-lg font-semibold text-zinc-100 tracking-tight">
              {title}
            </h1>
          </div>
        </div>
        
        {/* Features or custom children */}
        {features && features.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {features.map((feature, i) => (
              <div 
                key={i}
                className="px-3 py-1.5 rounded-lg bg-zinc-900/50 border border-zinc-800/50 flex items-center gap-1.5"
              >
                <feature.icon className={`w-3.5 h-3.5 ${colors.accent}`} />
                <span className="text-xs text-zinc-300 font-medium">{feature.label}</span>
              </div>
            ))}
          </div>
        )}
        
        {children}
      </div>
    </div>
  );
}
