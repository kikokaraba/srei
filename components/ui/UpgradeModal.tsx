"use client";

import { useEffect } from "react";
import { X, Check, Sparkles, Zap, Shield, TrendingUp } from "lucide-react";
import { FeatureKey, getPremiumFeatures, FEATURE_DESCRIPTIONS } from "@/lib/access-control";

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  highlightFeature?: FeatureKey;
}

const PRICING = {
  monthly: 29,
  yearly: 290, // 10 mesiacov
  yearlyMonthly: 24.17,
};

/**
 * UpgradeModal - Modal s pricing info a CTA pre upgrade na Premium
 */
export default function UpgradeModal({
  isOpen,
  onClose,
  highlightFeature,
}: UpgradeModalProps) {
  const premiumFeatures = getPremiumFeatures();
  
  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed inset-0 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          <div className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-gray-900 border border-gray-800  relative">
                {/* Header */}
                <div className="relative bg-gradient-to-r from-amber-500/20 to-orange-500/20 p-6 border-b border-gray-800">
                  <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                  
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-amber-500 rounded-xl">
                      <Sparkles className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-base font-semibold text-white">
                        Upgradovať na Premium
                      </h2>
                      <p className="text-sm text-gray-400">
                        Odomknite plný potenciál investovania do nehnuteľností
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Content */}
                <div className="p-6">
                  {/* Highlighted feature */}
                  {highlightFeature && (
                    <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-amber-500/20 rounded-lg">
                          <Zap className="w-5 h-5 text-amber-500" />
                        </div>
                        <div>
                          <h4 className="font-medium text-white">
                            {FEATURE_DESCRIPTIONS[highlightFeature].name}
                          </h4>
                          <p className="text-sm text-gray-400 mt-1">
                            {FEATURE_DESCRIPTIONS[highlightFeature].description}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Pricing cards */}
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    {/* Monthly */}
                    <div className="p-4 bg-gray-800/50 border border-gray-700 rounded-xl">
                      <p className="text-sm text-gray-400 mb-1">Mesačne</p>
                      <p className="text-lg font-semibold text-white">
                        {PRICING.monthly}€
                        <span className="text-sm font-normal text-gray-400">/mes</span>
                      </p>
                      <button className="w-full mt-4 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm font-medium">
                        Vybrať
                      </button>
                    </div>
                    
                    {/* Yearly - recommended */}
                    <div className="relative p-4 bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/30 rounded-xl">
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-amber-500 rounded-full text-xs font-medium text-white">
                        Ušetrite 17%
                      </div>
                      <p className="text-sm text-gray-400 mb-1">Ročne</p>
                      <p className="text-lg font-semibold text-white">
                        {PRICING.yearly}€
                        <span className="text-sm font-normal text-gray-400">/rok</span>
                      </p>
                      <p className="text-xs text-amber-500 mt-1">
                        = {PRICING.yearlyMonthly.toFixed(2)}€/mesiac
                      </p>
                      <button className="w-full mt-3 px-4 py-2 bg-amber-500 text-white rounded-lg hover:from-amber-600 hover:to-orange-600 transition-colors text-sm font-medium">
                        Vybrať
                      </button>
                    </div>
                  </div>
                  
                  {/* Features list */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-gray-400 uppercase tracking-wide">
                      Čo získate s Premium
                    </h4>
                    
                    <div className="grid grid-cols-2 gap-2">
                      {premiumFeatures.map((feature) => (
                        <div
                          key={feature.key}
                          className={`flex items-center gap-2 p-2 rounded-lg ${
                            feature.key === highlightFeature
                              ? "bg-amber-500/10 border border-amber-500/20"
                              : ""
                          }`}
                        >
                          <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                          <span className="text-sm text-gray-300">{feature.name}</span>
                        </div>
                      ))}
                    </div>
                    
                    {/* Extra benefits */}
                    <div className="mt-4 pt-4 border-t border-gray-800 grid grid-cols-3 gap-4">
                      <div className="text-center">
                        <div className="w-10 h-10 mx-auto mb-2 bg-blue-500/20 rounded-lg flex items-center justify-center">
                          <Zap className="w-5 h-5 text-blue-500" />
                        </div>
                        <p className="text-xs text-gray-400">Real-time dáta</p>
                      </div>
                      <div className="text-center">
                        <div className="w-10 h-10 mx-auto mb-2 bg-green-500/20 rounded-lg flex items-center justify-center">
                          <TrendingUp className="w-5 h-5 text-green-500" />
                        </div>
                        <p className="text-xs text-gray-400">AI analýzy</p>
                      </div>
                      <div className="text-center">
                        <div className="w-10 h-10 mx-auto mb-2 bg-purple-500/20 rounded-lg flex items-center justify-center">
                          <Shield className="w-5 h-5 text-purple-500" />
                        </div>
                        <p className="text-xs text-gray-400">Prioritná podpora</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Footer */}
                <div className="p-4 bg-gray-800/30 border-t border-gray-800 text-center">
                  <p className="text-xs text-gray-500">
                    Zrušiť môžete kedykoľvek. Bez záväzkov.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
  );
}
