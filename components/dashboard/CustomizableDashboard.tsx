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

const WIDGET_REGISTRY = {
  "scraper-control": {
    id: "scraper-control",
    title: "Scraper Control",
    component: "ScraperControl",
    description: "Manuálne spustenie scrapera",
  },
  "hot-deals": {
    id: "hot-deals",
    title: "Hot Deals",
    component: "HotDeals",
    description: "Nehnuteľnosti 15%+ pod trhovou cenou",
  },
  "system-health": {
    id: "system-health",
    title: "System Health",
    component: "SystemHealth",
    description: "Stav scrapera a dátových zdrojov",
  },
  "economic-indicators": {
    id: "economic-indicators",
    title: "Ekonomické ukazovatele",
    component: "EconomicIndicators",
    description: "HDP, inflácia, hypotéky z NBS",
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
  "market-gaps": {
    id: "market-gaps",
    title: "Index skrytého potenciálu",
    component: "MarketGaps",
    description: "Detekcia podhodnotených nehnuteľností",
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
  "urban-development": {
    id: "urban-development",
    title: "Urban Development",
    component: "UrbanDevelopment",
    description: "Plánovaná infraštruktúra",
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

  useEffect(() => {
    if (layout) {
      setLocalWidgets(layout.widgets);
      setLocalHiddenWidgets(layout.hiddenWidgets);
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
    setLocalWidgets((widgets) => {
      if (widgets.includes(widgetId)) {
        // Odstrániť widget
        return widgets.filter((id) => id !== widgetId);
      } else {
        // Pridať widget
        return [...widgets, widgetId];
      }
    });
  }, []);

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
        <div className="text-slate-400">Načítavam dashboard...</div>
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
    <div className="space-y-4 lg:space-y-6">
      {/* Header s edit mode toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-100 mb-1 sm:mb-2">
            Investičný Dashboard
          </h1>
          <p className="text-sm lg:text-base text-slate-400">
            Real-time trhová inteligencia pre slovenské nehnuteľnosti
          </p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          {isEditMode && (
            <>
              <button
                onClick={handleReset}
                className="px-3 py-1.5 sm:px-4 sm:py-2 text-sm text-slate-300 hover:text-slate-100 transition-colors"
              >
                Zrušiť
              </button>
              <button
                onClick={handleSave}
                disabled={saveMutation.isPending}
                className="px-3 py-1.5 sm:px-4 sm:py-2 text-sm bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
              >
                {saveMutation.isPending ? "Ukladám..." : "Uložiť"}
              </button>
            </>
          )}
          <button
            onClick={() => setIsEditMode(!isEditMode)}
            className={`px-3 py-1.5 sm:px-4 sm:py-2 text-sm rounded-lg transition-colors flex items-center gap-2 ${
              isEditMode
                ? "bg-slate-700 text-slate-100"
                : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            }`}
          >
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline">{isEditMode ? "Ukončiť úpravy" : "Prispôsobiť"}</span>
          </button>
        </div>
      </div>

      {/* Edit mode - Widget selector */}
      {isEditMode && (
        <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4 lg:p-6">
          <h3 className="text-base lg:text-lg font-semibold text-slate-100 mb-3 lg:mb-4">
            Dostupné widgety
          </h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
            {availableWidgets.map((widgetId) => {
              const widget = WIDGET_REGISTRY[widgetId];
              const isVisible = localWidgets.includes(widgetId);
              return (
                <button
                  key={widgetId}
                  onClick={() => handleToggleWidget(widgetId)}
                  className={`p-3 lg:p-4 rounded-lg border transition-all text-left ${
                    isVisible
                      ? "bg-emerald-500/10 border-emerald-500/30 text-slate-100"
                      : "bg-slate-900/50 border-slate-700 text-slate-400 hover:border-slate-600"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1 sm:mb-2">
                    <span className="text-xs sm:text-sm font-semibold line-clamp-1">{widget.title}</span>
                    {isVisible ? (
                      <div className="w-2 h-2 bg-emerald-400 rounded-full shrink-0" />
                    ) : (
                      <X className="w-3 h-3 sm:w-4 sm:h-4 shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-slate-500 line-clamp-2 hidden sm:block">{widget.description}</p>
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
          <div className="space-y-6">
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
        <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-12 text-center">
          <p className="text-slate-400 mb-4">
            Žiadne widgety nie sú zobrazené
          </p>
          {isEditMode && (
            <p className="text-sm text-slate-500">
              Vyberte widgety vyššie, ktoré chcete zobraziť
            </p>
          )}
        </div>
      )}
    </div>
  );
}
