"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, X } from "lucide-react";
import { AnalyticsCards } from "./AnalyticsCards";
import { LiquidityTracker } from "./LiquidityTracker";
import { ScenarioSimulator } from "./ScenarioSimulator";
import { TaxAssistant } from "./TaxAssistant";
import { MarketOverview } from "./MarketOverview";
import { RecentProperties } from "./RecentProperties";
import { EconomicIndicators } from "./EconomicIndicators";
import HotDeals from "./HotDeals";
import { PriceHistory } from "./PriceHistory";
import PremiumGate from "@/components/ui/PremiumGate";
import { FeatureKey } from "@/lib/access-control";

// Widgety s unikátnou hodnotou
// (Investor badges, duplicity, urban impact sú teraz automatické v PropertyList)
const WIDGET_COMPONENTS = {
  "hot-deals": HotDeals,
  "analytics-cards": AnalyticsCards,
  "market-overview": MarketOverview,
  "economic-indicators": EconomicIndicators,
  "liquidity-tracker": LiquidityTracker,
  "scenario-simulator": ScenarioSimulator,
  "price-history": PriceHistory,
  "tax-assistant": TaxAssistant,
  "recent-properties": RecentProperties,
} as const;

// Mapovanie widgetov na premium features
const PREMIUM_WIDGETS: Partial<Record<keyof typeof WIDGET_COMPONENTS, FeatureKey>> = {
  "scenario-simulator": "scenarioSimulator",
};

type WidgetId = keyof typeof WIDGET_COMPONENTS;

interface SortableWidgetProps {
  id: string; // Can be any string, we validate inside
  widget: {
    id: string;
    title: string;
    component: string;
    description: string;
  } | undefined;
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

  const Component = WIDGET_COMPONENTS[id as keyof typeof WIDGET_COMPONENTS];
  const premiumFeature = PREMIUM_WIDGETS[id as keyof typeof PREMIUM_WIDGETS];

  // Skip if component or widget config doesn't exist (removed widgets)
  if (!Component || !widget) {
    console.warn(`Widget "${id}" not found - skipping`);
    return null;
  }

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
        isEditMode ? "ring-1 ring-zinc-800 rounded-xl" : ""
      }`}
    >
      {isEditMode && (
        <div className="absolute -left-2 top-1/2 -translate-y-1/2 z-10 flex items-center gap-1.5">
          <button
            {...attributes}
            {...listeners}
            className="p-1.5 bg-zinc-900 border border-zinc-800 rounded-lg cursor-grab active:cursor-grabbing hover:bg-zinc-800 hover:border-zinc-700 transition-colors"
            aria-label="Presunúť widget"
          >
            <GripVertical className="w-3.5 h-3.5 text-zinc-500" />
          </button>
          <button
            onClick={onRemove}
            className="p-1.5 bg-zinc-900 border border-zinc-800 rounded-lg hover:bg-rose-500/10 hover:border-rose-500/30 transition-colors group/btn"
            aria-label="Odstrániť widget"
          >
            <X className="w-3.5 h-3.5 text-zinc-500 group-hover/btn:text-rose-400" />
          </button>
        </div>
      )}
      <div className={isEditMode ? "ml-10" : ""}>
        {renderContent()}
      </div>
    </div>
  );
}
