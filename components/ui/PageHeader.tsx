"use client";

import { LucideIcon, Sparkles } from "lucide-react";

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
    gradient: "to-emerald-950/30",
    iconBg: "from-emerald-500 to-teal-500",
    iconShadow: "shadow-emerald-500/20",
    glow1: "bg-emerald-500",
    glow2: "bg-teal-500",
    accent: "text-emerald-400",
  },
  blue: {
    gradient: "to-blue-950/30",
    iconBg: "from-blue-500 to-indigo-500",
    iconShadow: "shadow-blue-500/20",
    glow1: "bg-blue-500",
    glow2: "bg-indigo-500",
    accent: "text-blue-400",
  },
  violet: {
    gradient: "to-violet-950/30",
    iconBg: "from-violet-500 to-purple-500",
    iconShadow: "shadow-violet-500/20",
    glow1: "bg-violet-500",
    glow2: "bg-purple-500",
    accent: "text-violet-400",
  },
  amber: {
    gradient: "to-amber-950/30",
    iconBg: "from-amber-500 to-orange-500",
    iconShadow: "shadow-amber-500/20",
    glow1: "bg-amber-500",
    glow2: "bg-orange-500",
    accent: "text-amber-400",
  },
  cyan: {
    gradient: "to-cyan-950/30",
    iconBg: "from-cyan-500 to-teal-500",
    iconShadow: "shadow-cyan-500/20",
    glow1: "bg-cyan-500",
    glow2: "bg-teal-500",
    accent: "text-cyan-400",
  },
};

export function PageHeader({
  title,
  description,
  icon: Icon,
  color = "emerald",
  features,
  showSparkle = true,
  children,
}: PageHeaderProps) {
  const colors = COLOR_CLASSES[color];

  return (
    <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-900 via-zinc-900 ${colors.gradient} p-6 lg:p-8`}>
      {/* Ambient glow */}
      <div className={`absolute -top-24 -right-24 w-48 h-48 rounded-full blur-3xl opacity-20 ${colors.glow1}`} />
      <div className={`absolute -bottom-24 -left-24 w-48 h-48 rounded-full blur-3xl opacity-10 ${colors.glow2}`} />
      
      <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${colors.iconBg} flex items-center justify-center shadow-lg ${colors.iconShadow} shrink-0`}>
            <Icon className="w-7 h-7 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl lg:text-xl font-semibold text-white">
                {title}
              </h1>
              {showSparkle && <Sparkles className={`w-5 h-5 ${colors.accent}`} />}
            </div>
            <p className="text-zinc-400 text-sm lg:text-base">
              {description}
            </p>
          </div>
        </div>
        
        {/* Features or custom children */}
        {features && features.length > 0 && (
          <div className="flex gap-3 flex-wrap">
            {features.map((feature, i) => (
              <div 
                key={i}
                className="px-4 py-2 rounded-xl bg-zinc-800/50 border border-zinc-700/50 flex items-center gap-2"
              >
                <feature.icon className={`w-4 h-4 ${colors.accent}`} />
                <span className="text-sm text-white font-medium">{feature.label}</span>
              </div>
            ))}
          </div>
        )}
        
        {children}
      </div>
    </div>
  );
}
