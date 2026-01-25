"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, X } from "lucide-react";
import { AnalyticsCards } from "./AnalyticsCards";
import { MarketGaps } from "./MarketGaps";
import { LiquidityTracker } from "./LiquidityTracker";
import { ScenarioSimulator } from "./ScenarioSimulator";
import { UrbanDevelopment } from "./UrbanDevelopment";
import { TaxAssistant } from "./TaxAssistant";
import { MarketOverview } from "./MarketOverview";
import { RecentProperties } from "./RecentProperties";
import { EconomicIndicators } from "./EconomicIndicators";
import HotDeals from "./HotDeals";
import PropertyMatches from "./PropertyMatches";
import { PriceHistory } from "./PriceHistory";
// Investor widgets
import { InvestorInsights } from "./InvestorInsights";
import { DuplicatesFinder } from "./DuplicatesFinder";
import { UrbanImpactMap } from "./UrbanImpactMap";
import PremiumGate from "@/components/ui/PremiumGate";
import { FeatureKey } from "@/lib/access-control";

const WIDGET_COMPONENTS = {
  // Investor priority
  "investor-insights": InvestorInsights,
  "duplicates-finder": DuplicatesFinder,
  "urban-impact": UrbanImpactMap,
  // Core widgets
  "hot-deals": HotDeals,
  "property-matches": PropertyMatches,
  "economic-indicators": EconomicIndicators,
  "analytics-cards": AnalyticsCards,
  "market-gaps": MarketGaps,
  "liquidity-tracker": LiquidityTracker,
  "scenario-simulator": ScenarioSimulator,
  "urban-development": UrbanDevelopment,
  "tax-assistant": TaxAssistant,
  "market-overview": MarketOverview,
  "recent-properties": RecentProperties,
  "price-history": PriceHistory,
} as const;

// Mapovanie widgetov na premium features
const PREMIUM_WIDGETS: Partial<Record<keyof typeof WIDGET_COMPONENTS, FeatureKey>> = {
  // Investor widgets - premium only
  "investor-insights": "aiPredictions",
  "duplicates-finder": "aiMatching",
  "urban-impact": "urbanDevelopment",
  // Existing
  "scenario-simulator": "scenarioSimulator",
  "urban-development": "urbanDevelopment",
  "property-matches": "aiMatching",
};

type WidgetId = keyof typeof WIDGET_COMPONENTS;

interface SortableWidgetProps {
  id: WidgetId;
  widget: {
    id: string;
    title: string;
    component: string;
    description: string;
  };
  isEditMode: boolean;
  onRemove: () => void;
}

export function SortableWidget({
  id,
  widget,
  isEditMode,
  onRemove,
}: SortableWidgetProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const Component = WIDGET_COMPONENTS[id];
  const premiumFeature = PREMIUM_WIDGETS[id];

  // Render widget content, wrapped in PremiumGate if needed
  const renderContent = () => {
    const widgetContent = <Component />;
    
    if (premiumFeature) {
      return (
        <PremiumGate 
          feature={premiumFeature} 
          minHeight="300px"
          fallback={widgetContent}
        >
          {widgetContent}
        </PremiumGate>
      );
    }
    
    return widgetContent;
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative group ${
        isEditMode ? "ring-2 ring-slate-700 rounded-xl" : ""
      }`}
    >
      {isEditMode && (
        <div className="absolute -left-2 top-1/2 -translate-y-1/2 z-10 flex items-center gap-2">
          <button
            {...attributes}
            {...listeners}
            className="p-2 bg-slate-800 border border-slate-700 rounded-lg cursor-grab active:cursor-grabbing hover:bg-slate-700 transition-colors"
            aria-label="Presunúť widget"
          >
            <GripVertical className="w-4 h-4 text-slate-400" />
          </button>
          <button
            onClick={onRemove}
            className="p-2 bg-rose-500/10 border border-rose-500/30 rounded-lg hover:bg-rose-500/20 transition-colors"
            aria-label="Odstrániť widget"
          >
            <X className="w-4 h-4 text-rose-400" />
          </button>
        </div>
      )}
      <div className={isEditMode ? "ml-12" : ""}>
        {renderContent()}
      </div>
    </div>
  );
}
