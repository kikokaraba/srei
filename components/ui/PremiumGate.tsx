"use client";

import { ReactNode, useState } from "react";
import { useSession } from "next-auth/react";
import { Lock, Sparkles } from "lucide-react";
import { canAccess, FeatureKey, FEATURE_DESCRIPTIONS } from "@/lib/access-control";
import { UserRole } from "@/generated/prisma/client";
import UpgradeModal from "./UpgradeModal";

interface PremiumGateProps {
  feature: FeatureKey;
  children: ReactNode;
  // Voliteľný fallback obsah (napr. blurred preview)
  fallback?: ReactNode;
  // Či zobraziť zamknutý stav inline alebo overlay
  variant?: "overlay" | "inline" | "badge";
  // Výška pre overlay variant
  minHeight?: string;
}

/**
 * PremiumGate - wrapper komponent pre premium funkcie
 * 
 * Ak má používateľ prístup → renderuje children
 * Ak nemá prístup → renderuje blur overlay + upgrade CTA
 */
export default function PremiumGate({
  feature,
  children,
  fallback,
  variant = "overlay",
  minHeight = "200px",
}: PremiumGateProps) {
  const { data: session } = useSession();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  
  const userRole = session?.user?.role as UserRole | undefined;
  const hasAccess = canAccess(userRole, feature);
  
  // Ak má prístup, zobraz obsah
  if (hasAccess) {
    return <>{children}</>;
  }
  
  const featureInfo = FEATURE_DESCRIPTIONS[feature];
  
  // Inline variant - len malý badge
  if (variant === "badge") {
    return (
      <div className="relative">
        {fallback || children}
        <button
          onClick={() => setShowUpgradeModal(true)}
          className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 bg-amber-500/90 text-white text-xs font-medium rounded-full hover:bg-amber-600 transition-colors"
        >
          <Lock className="w-3 h-3" />
          Premium
        </button>
        <UpgradeModal
          isOpen={showUpgradeModal}
          onClose={() => setShowUpgradeModal(false)}
          highlightFeature={feature}
        />
      </div>
    );
  }
  
  // Inline variant - kompaktný
  if (variant === "inline") {
    return (
      <>
        <button
          onClick={() => setShowUpgradeModal(true)}
          className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-lg hover:border-amber-500/40 transition-colors group w-full"
        >
          <div className="p-2 bg-amber-500/20 rounded-lg">
            <Lock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-left flex-1">
            <p className="text-sm font-medium text-white">{featureInfo.name}</p>
            <p className="text-xs text-gray-400">Odomknúť s Premium</p>
          </div>
          <Sparkles className="w-4 h-4 text-amber-500 opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>
        <UpgradeModal
          isOpen={showUpgradeModal}
          onClose={() => setShowUpgradeModal(false)}
          highlightFeature={feature}
        />
      </>
    );
  }
  
  // Overlay variant - blur efekt s CTA uprostred
  return (
    <>
      <div className="relative" style={{ minHeight }}>
        {/* Blurred content behind */}
        <div className="absolute inset-0 overflow-hidden rounded-xl">
          {fallback ? (
            <div className="blur-sm opacity-50 pointer-events-none">
              {fallback}
            </div>
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-gray-800/50 to-gray-900/50" />
          )}
        </div>
        
        {/* Overlay */}
        <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-[2px] rounded-xl flex items-center justify-center">
          <div className="text-center p-6 max-w-sm">
            {/* Icon */}
            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-amber-500/20 to-orange-500/20 rounded-2xl flex items-center justify-center border border-amber-500/20">
              <Lock className="w-8 h-8 text-amber-500" />
            </div>
            
            {/* Text */}
            <h3 className="text-lg font-semibold text-white mb-2">
              {featureInfo.name}
            </h3>
            <p className="text-sm text-gray-400 mb-4">
              {featureInfo.description}
            </p>
            
            {/* CTA Button */}
            <button
              onClick={() => setShowUpgradeModal(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-amber-500 text-white font-medium rounded-lg hover:from-amber-600 hover:to-orange-600 transition-all "
            >
              <Sparkles className="w-4 h-4" />
              Upgradovať na Premium
            </button>
          </div>
        </div>
      </div>
      
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        highlightFeature={feature}
      />
    </>
  );
}

/**
 * Hook pre kontrolu prístupu v komponentoch
 */
export function usePremiumAccess(feature: FeatureKey): {
  hasAccess: boolean;
  userRole: UserRole | undefined;
} {
  const { data: session } = useSession();
  const userRole = session?.user?.role as UserRole | undefined;
  
  return {
    hasAccess: canAccess(userRole, feature),
    userRole,
  };
}
