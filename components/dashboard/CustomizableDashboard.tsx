"use client";

import { useState, useEffect, useCallback } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { SortableWidget } from "./SortableWidget";
import { Settings, X } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// Widgety ktoré poskytujú unikátnu hodnotu
// (Investor badges, duplicity, urban impact sú teraz automatické v PropertyList)
const WIDGET_REGISTRY = {
  "hot-deals": {
    id: "hot-deals",
    title: "Hot Deals",
    component: "HotDeals",
    description: "Nehnuteľnosti 15%+ pod trhovou cenou",
  },
  "analytics-cards": {
    id: "analytics-cards",
    title: "Analytické karty",
    component: "AnalyticsCards",
    description: "KPI metriky a prehľad trhu",
  },
  "market-overview": {
    id: "market-overview",
    title: "Prehľad trhu",
    component: "MarketOverview",
    description: "Live dáta z NBS a ŠÚ SR",
  },
  "economic-indicators": {
    id: "economic-indicators",
    title: "Ekonomické ukazovatele",
    component: "EconomicIndicators",
    description: "HDP, inflácia, hypotéky z NBS",
  },
  "liquidity-tracker": {
    id: "liquidity-tracker",
    title: "Liquidity Tracker",
    component: "LiquidityTracker",
    description: "Čas na trhu a zmeny cien",
  },
  "scenario-simulator": {
    id: "scenario-simulator",
    title: "Scenario Simulator",
    component: "ScenarioSimulator",
    description: "What-if analýza investícií",
  },
  "price-history": {
    id: "price-history",
    title: "Vývoj cien",
    component: "PriceHistory",
    description: "Referenčný trend (NBS) vs. aktuálny trh (SRIA) – porovnanie pre investorov",
  },
  "tax-assistant": {
    id: "tax-assistant",
    title: "Daňový asistent",
    component: "TaxAssistant",
    description: "Daňové kalkulácie pre SK",
  },
  "recent-properties": {
    id: "recent-properties",
    title: "Nedávne nehnuteľnosti",
    component: "RecentProperties",
    description: "Najnovšie pridané nehnuteľnosti",
  },
} as const;

type WidgetId = keyof typeof WIDGET_REGISTRY;

interface DashboardLayout {
  widgets: WidgetId[];
  hiddenWidgets: WidgetId[];
}

async function fetchLayout(): Promise<DashboardLayout> {
  const response = await fetch("/api/v1/dashboard/layout");
  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error || "Failed to fetch layout");
  }
  return data.data;
}

async function saveLayout(layout: DashboardLayout): Promise<DashboardLayout> {
  const response = await fetch("/api/v1/dashboard/layout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(layout),
  });
  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error || "Failed to save layout");
  }
  return data.data;
}

export function CustomizableDashboard() {
  const [isEditMode, setIsEditMode] = useState(false);
  const queryClient = useQueryClient();

  const { data: layout, isLoading } = useQuery({
    queryKey: ["dashboard-layout"],
    queryFn: fetchLayout,
  });

  const saveMutation = useMutation({
    mutationFn: saveLayout,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard-layout"] });
    },
  });

  const [localWidgets, setLocalWidgets] = useState<WidgetId[]>([]);
  const [localHiddenWidgets, setLocalHiddenWidgets] = useState<WidgetId[]>([]);

  // Valid widget IDs (filter out removed widgets from saved layout)
  const validWidgetIds = Object.keys(WIDGET_REGISTRY) as WidgetId[];

  useEffect(() => {
    if (layout) {
      // Filter out any widgets that no longer exist
      const validWidgets = layout.widgets.filter(id => validWidgetIds.includes(id));
      const validHidden = layout.hiddenWidgets.filter(id => validWidgetIds.includes(id));
      setLocalWidgets(validWidgets);
      setLocalHiddenWidgets(validHidden);
    }
  }, [layout]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      if (over && active.id !== over.id) {
        setLocalWidgets((items) => {
          const oldIndex = items.indexOf(active.id as WidgetId);
          const newIndex = items.indexOf(over.id as WidgetId);
          return arrayMove(items, oldIndex, newIndex);
        });
      }
    },
    []
  );

  const handleToggleWidget = useCallback((widgetId: WidgetId) => {
    if (localWidgets.includes(widgetId)) {
      // Odstrániť widget - pridať do hidden
      setLocalWidgets((widgets) => widgets.filter((id) => id !== widgetId));
      setLocalHiddenWidgets((hidden) => [...hidden, widgetId]);
    } else {
      // Pridať widget - odstrániť z hidden
      setLocalWidgets((widgets) => [...widgets, widgetId]);
      setLocalHiddenWidgets((hidden) => hidden.filter((id) => id !== widgetId));
    }
  }, [localWidgets]);

  const handleSave = useCallback(() => {
    if (layout) {
      saveMutation.mutate({
        widgets: localWidgets,
        hiddenWidgets: localHiddenWidgets,
      });
      setIsEditMode(false);
    }
  }, [localWidgets, localHiddenWidgets, layout, saveMutation]);

  const handleReset = useCallback(() => {
    if (layout) {
      setLocalWidgets(layout.widgets);
      setLocalHiddenWidgets(layout.hiddenWidgets);
    }
  }, [layout]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-zinc-500 text-sm">Načítavam dashboard...</div>
      </div>
    );
  }

  if (!layout) {
    return null;
  }

  const availableWidgets = Object.keys(WIDGET_REGISTRY) as WidgetId[];
  const hiddenWidgets = availableWidgets.filter(
    (id) => !localWidgets.includes(id)
  );

  return (
    <div className="space-y-6">
      {/* Header - Premium Minimal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-[10px] text-zinc-600 uppercase tracking-widest font-medium mb-1">WIDGETY</p>
          <h2 className="text-lg font-medium text-zinc-200 tracking-tight">
            Analytické moduly
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {isEditMode && (
            <>
              <button
                onClick={handleReset}
                className="px-3 py-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                Zrušiť
              </button>
              <button
                onClick={handleSave}
                disabled={saveMutation.isPending}
                className="px-4 py-1.5 text-xs bg-zinc-100 hover:bg-white text-zinc-900 font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                {saveMutation.isPending ? "Ukladám..." : "Uložiť"}
              </button>
            </>
          )}
          <button
            onClick={() => setIsEditMode(!isEditMode)}
            className={`px-3 py-1.5 text-xs rounded-lg transition-all flex items-center gap-2 ${
              isEditMode
                ? "bg-zinc-800 text-zinc-100"
                : "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700"
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isEditMode ? "Hotovo" : "Upraviť"}</span>
          </button>
        </div>
      </div>

      {/* Edit mode - Widget selector - Premium */}
      {isEditMode && (
        <div className="premium-card p-4 lg:p-5">
          <p className="text-[10px] text-zinc-600 uppercase tracking-widest font-medium mb-3">
            Dostupné moduly
          </p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            {availableWidgets.map((widgetId) => {
              const widget = WIDGET_REGISTRY[widgetId];
              const isVisible = localWidgets.includes(widgetId);
              return (
                <button
                  key={widgetId}
                  onClick={() => handleToggleWidget(widgetId)}
                  className={`p-3 rounded-xl border transition-all text-left ${
                    isVisible
                      ? "bg-zinc-900 border-zinc-700 text-zinc-100"
                      : "bg-zinc-950/50 border-zinc-800/50 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium line-clamp-1">{widget.title}</span>
                    {isVisible ? (
                      <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full shrink-0" />
                    ) : (
                      <X className="w-3 h-3 shrink-0 opacity-50" />
                    )}
                  </div>
                  <p className="text-[10px] text-zinc-600 line-clamp-1 hidden sm:block">{widget.description}</p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Widgets grid */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={localWidgets}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-5">
            {localWidgets.map((widgetId) => (
              <SortableWidget
                key={widgetId}
                id={widgetId}
                widget={WIDGET_REGISTRY[widgetId]}
                isEditMode={isEditMode}
                onRemove={() => handleToggleWidget(widgetId)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {localWidgets.length === 0 && (
        <div className="premium-card p-12 text-center">
          <p className="text-zinc-500 text-sm mb-2">
            Žiadne widgety nie sú zobrazené
          </p>
          {isEditMode && (
            <p className="text-xs text-zinc-600">
              Vyberte moduly vyššie
            </p>
          )}
        </div>
      )}
    </div>
  );
}
