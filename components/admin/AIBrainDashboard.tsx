"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Brain,
  Sparkles,
  TrendingUp,
  Database,
  Lightbulb,
  Play,
  Check,
  X,
  Clock,
  AlertTriangle,
  ChevronRight,
  RefreshCw,
  Zap,
  Activity,
  BarChart3,
  Shield,
  Eye,
  ThumbsUp,
  ThumbsDown,
  Loader2,
} from "lucide-react";
import type { AIInsight, AgentType, InsightStatus, AgentPriority } from "@/lib/ai-brain/types";

// ============================================
// API FUNCTIONS
// ============================================

async function fetchAIBrainData() {
  const response = await fetch("/api/v1/admin/ai-brain");
  const data = await response.json();
  if (!data.success) throw new Error(data.error);
  return data.data;
}

async function fetchInsights(filters?: { agentType?: string; status?: string }) {
  const params = new URLSearchParams({ action: "insights" });
  if (filters?.agentType) params.set("agentType", filters.agentType);
  if (filters?.status) params.set("status", filters.status);
  
  const response = await fetch(`/api/v1/admin/ai-brain?${params}`);
  const data = await response.json();
  if (!data.success) throw new Error(data.error);
  return data.data;
}

async function runAgent(agentType?: string) {
  const response = await fetch("/api/v1/admin/ai-brain", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: agentType ? "run-agent" : "run-all",
      agentType,
    }),
  });
  const data = await response.json();
  if (!data.success) throw new Error(data.error);
  return data;
}

async function updateInsight(insightId: string, action: "approve" | "dismiss" | "implement", reason?: string) {
  const response = await fetch("/api/v1/admin/ai-brain", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, insightId, reason }),
  });
  const data = await response.json();
  if (!data.success) throw new Error(data.error);
  return data;
}

async function fetchInsightActions(insightId: string) {
  const response = await fetch(`/api/v1/admin/ai-brain?action=insight-actions&insightId=${insightId}`);
  const data = await response.json();
  if (!data.success) throw new Error(data.error);
  return data.data;
}

async function executeInsightAction(insightId: string, actionId: string, autoApprove = false) {
  const response = await fetch("/api/v1/admin/ai-brain", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ 
      action: autoApprove ? "approve" : "execute-action", 
      insightId, 
      actionId,
      autoExecute: autoApprove,
    }),
  });
  const data = await response.json();
  return data;
}

interface AutoAction {
  id: string;
  type: string;
  name: string;
  description: string;
  risk: "safe" | "moderate" | "high";
  estimatedDuration: string;
}

// ============================================
// COMPONENT
// ============================================

export function AIBrainDashboard() {
  const queryClient = useQueryClient();
  const [selectedAgent, setSelectedAgent] = useState<AgentType | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<InsightStatus | null>(null);
  const [expandedInsight, setExpandedInsight] = useState<string | null>(null);

  // Fetch main data
  const { data: brainData, isLoading: isLoadingBrain } = useQuery({
    queryKey: ["ai-brain"],
    queryFn: fetchAIBrainData,
    refetchInterval: 30000, // Refresh every 30s
  });

  // Fetch insights with filters
  const { data: insights, isLoading: isLoadingInsights, refetch: refetchInsights } = useQuery({
    queryKey: ["ai-brain-insights", selectedAgent, selectedStatus],
    queryFn: () => fetchInsights({
      agentType: selectedAgent || undefined,
      status: selectedStatus || undefined,
    }),
  });

  // Run agent mutation
  const runMutation = useMutation({
    mutationFn: runAgent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-brain"] });
      queryClient.invalidateQueries({ queryKey: ["ai-brain-insights"] });
    },
  });

  // Update insight mutation
  const updateMutation = useMutation({
    mutationFn: ({ insightId, action, reason }: { insightId: string; action: "approve" | "dismiss" | "implement"; reason?: string }) =>
      updateInsight(insightId, action, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-brain-insights"] });
    },
  });

  // Agent cards data
  const agents = [
    {
      type: "market-pulse" as AgentType,
      name: "Market Pulse",
      description: "Trhové analýzy a predikcie",
      icon: TrendingUp,
      color: "emerald",
    },
    {
      type: "data-quality" as AgentType,
      name: "Data Quality",
      description: "Monitoring kvality dát",
      icon: Database,
      color: "blue",
    },
    {
      type: "feature-suggester" as AgentType,
      name: "Feature Suggester",
      description: "Návrhy nových funkcií",
      icon: Lightbulb,
      color: "amber",
    },
  ];

  const getPriorityColor = (priority: AgentPriority) => {
    switch (priority) {
      case "critical": return "text-red-400 bg-red-500/10 border-red-500/30";
      case "high": return "text-orange-400 bg-orange-500/10 border-orange-500/30";
      case "medium": return "text-yellow-400 bg-yellow-500/10 border-yellow-500/30";
      case "low": return "text-zinc-400 bg-zinc-500/10 border-zinc-500/30";
    }
  };

  const getStatusIcon = (status: InsightStatus) => {
    switch (status) {
      case "new": return <Sparkles className="w-4 h-4 text-emerald-400" />;
      case "reviewed": return <Eye className="w-4 h-4 text-blue-400" />;
      case "approved": return <ThumbsUp className="w-4 h-4 text-green-400" />;
      case "implemented": return <Check className="w-4 h-4 text-emerald-400" />;
      case "dismissed": return <X className="w-4 h-4 text-red-400" />;
      default: return <Clock className="w-4 h-4 text-zinc-400" />;
    }
  };

  if (isLoadingBrain) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-900 via-purple-950/20 to-zinc-900 p-6 lg:p-8">
        <div className="absolute -top-24 -right-24 w-48 h-48 rounded-full blur-3xl opacity-20 bg-purple-500" />
        
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-violet-500 flex items-center justify-center shadow-lg">
              <Brain className="w-7 h-7 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-2xl lg:text-xl font-semibold text-white">AI Brain</h1>
                <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs">
                  <Activity className="w-3 h-3" />
                  Active
                </div>
              </div>
              <p className="text-zinc-400">
                Centrálny AI systém pre automatické vylepšenia a insights
              </p>
            </div>
          </div>
          
          <button
            onClick={() => runMutation.mutate(undefined)}
            disabled={runMutation.isPending}
            className="px-6 py-3 bg-violet-500 text-white font-semibold rounded-xl
                       hover:shadow-lg hover:shadow-purple-500/25 transition-all flex items-center gap-2
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {runMutation.isPending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Play className="w-5 h-5" />
            )}
            Spustiť všetky agenty
          </button>
        </div>

        {/* Stats */}
        {brainData?.stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="bg-zinc-800/50 rounded-xl p-4">
              <p className="text-lg font-semibold text-white">{brainData.stats.total || 0}</p>
              <p className="text-sm text-zinc-400">Celkom insights</p>
            </div>
            <div className="bg-zinc-800/50 rounded-xl p-4">
              <p className="text-lg font-semibold text-emerald-400">{brainData.stats.byStatus?.new || 0}</p>
              <p className="text-sm text-zinc-400">Nové</p>
            </div>
            <div className="bg-zinc-800/50 rounded-xl p-4">
              <p className="text-lg font-semibold text-orange-400">{brainData.stats.byPriority?.high || 0}</p>
              <p className="text-sm text-zinc-400">Vysoká priorita</p>
            </div>
            <div className="bg-zinc-800/50 rounded-xl p-4">
              <p className="text-lg font-semibold text-red-400">{brainData.stats.byPriority?.critical || 0}</p>
              <p className="text-sm text-zinc-400">Kritické</p>
            </div>
          </div>
        )}
      </div>

      {/* Agents */}
      <div className="grid md:grid-cols-3 gap-4">
        {agents.map((agent) => {
          const Icon = agent.icon;
          const isSelected = selectedAgent === agent.type;
          const lastRun = brainData?.stats?.lastRunTimes?.[agent.type];
          
          return (
            <button
              key={agent.type}
              onClick={() => setSelectedAgent(isSelected ? null : agent.type)}
              className={`relative overflow-hidden rounded-xl p-5 text-left transition-all ${
                isSelected 
                  ? `bg-${agent.color}-500/20 border border-${agent.color}-500/50`
                  : "bg-zinc-900 border border-zinc-800 hover:border-zinc-700"
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`w-10 h-10 rounded-lg bg-${agent.color}-500/20 flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 text-${agent.color}-400`} />
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    runMutation.mutate(agent.type);
                  }}
                  disabled={runMutation.isPending}
                  className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors"
                  title="Spustiť agenta"
                >
                  {runMutation.isPending ? (
                    <Loader2 className="w-4 h-4 text-zinc-400 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4 text-zinc-400" />
                  )}
                </button>
              </div>
              
              <h3 className="font-semibold text-white mb-1">{agent.name}</h3>
              <p className="text-sm text-zinc-400 mb-3">{agent.description}</p>
              
              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <Clock className="w-3 h-3" />
                {lastRun ? `Posledné: ${new Date(lastRun).toLocaleString("sk-SK")}` : "Nikdy nespustený"}
              </div>
            </button>
          );
        })}
      </div>

      {/* Status Filters */}
      <div className="flex flex-wrap gap-2">
        <span className="text-sm text-zinc-400 py-2">Filter:</span>
        {(["new", "approved", "implemented", "dismissed"] as InsightStatus[]).map((status) => (
          <button
            key={status}
            onClick={() => setSelectedStatus(selectedStatus === status ? null : status)}
            className={`px-3 py-1.5 rounded-lg text-sm transition-all flex items-center gap-2 ${
              selectedStatus === status
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                : "bg-zinc-800 text-zinc-400 border border-zinc-700 hover:border-zinc-600"
            }`}
          >
            {getStatusIcon(status)}
            {status === "new" ? "Nové" : 
             status === "approved" ? "Schválené" : 
             status === "implemented" ? "Implementované" : 
             "Zamietnuté"}
          </button>
        ))}
        <button
          onClick={() => refetchInsights()}
          className="px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-400 border border-zinc-700 hover:border-zinc-600 transition-all"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Insights List */}
      <div className="space-y-3">
        {isLoadingInsights ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
          </div>
        ) : insights?.length === 0 ? (
          <div className="text-center py-12 text-zinc-400">
            <Brain className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Žiadne insights. Spustite agentov pre generovanie.</p>
          </div>
        ) : (
          insights?.map((insight: AIInsight) => (
            <div
              key={insight.id}
              className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden"
            >
              {/* Insight Header */}
              <button
                onClick={() => setExpandedInsight(expandedInsight === insight.id ? null : insight.id)}
                className="w-full p-4 flex items-start gap-4 text-left hover:bg-zinc-800/50 transition-colors"
              >
                <div className={`px-2 py-1 rounded text-xs font-medium border ${getPriorityColor(insight.priority)}`}>
                  {insight.priority.toUpperCase()}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {getStatusIcon(insight.status)}
                    <h3 className="font-medium text-white truncate">{insight.title}</h3>
                  </div>
                  <p className="text-sm text-zinc-400 line-clamp-2">{insight.description}</p>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-sm text-zinc-400">{insight.agentType}</p>
                    <p className="text-xs text-zinc-500">
                      {new Date(insight.createdAt).toLocaleDateString("sk-SK")}
                    </p>
                  </div>
                  <ChevronRight className={`w-5 h-5 text-zinc-400 transition-transform ${
                    expandedInsight === insight.id ? "rotate-90" : ""
                  }`} />
                </div>
              </button>

              {/* Expanded Content */}
              {expandedInsight === insight.id && (
                <div className="px-4 pb-4 border-t border-zinc-800">
                  <div className="pt-4 space-y-4">
                    {/* Details */}
                    {insight.details && (
                      <div className="bg-zinc-800/50 rounded-lg p-4">
                        <pre className="text-sm text-zinc-300 whitespace-pre-wrap font-sans">
                          {insight.details}
                        </pre>
                      </div>
                    )}

                    {/* Metrics */}
                    <div className="flex flex-wrap gap-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-zinc-400">Confidence:</span>
                        <span className="text-sm font-medium text-white">{insight.confidence}%</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-zinc-400">Impact:</span>
                        <span className="text-sm font-medium text-white">{insight.impact}%</span>
                      </div>
                      {insight.effort && (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-zinc-400">Effort:</span>
                          <span className="text-sm font-medium text-white">{insight.effort}%</span>
                        </div>
                      )}
                    </div>

                    {/* Suggested Action */}
                    {insight.suggestedAction && (
                      <div className="flex items-center gap-2 text-sm">
                        <Zap className="w-4 h-4 text-amber-400" />
                        <span className="text-zinc-400">Odporúčaná akcia:</span>
                        <span className="text-white">{insight.suggestedAction}</span>
                      </div>
                    )}

                    {/* Actions */}
                    {insight.status === "new" && (
                      <InsightActions 
                        insight={insight} 
                        onApprove={(actionId) => {
                          if (actionId) {
                            executeInsightAction(insight.id, actionId, true).then(() => {
                              queryClient.invalidateQueries({ queryKey: ["ai-brain-insights"] });
                            });
                          } else {
                            updateMutation.mutate({ insightId: insight.id, action: "approve" });
                          }
                        }}
                        onDismiss={() => updateMutation.mutate({ insightId: insight.id, action: "dismiss" })}
                        isPending={updateMutation.isPending}
                      />
                    )}

                    {insight.status === "approved" && (
                      <ApprovedInsightActions 
                        insight={insight}
                        onExecute={(actionId) => {
                          executeInsightAction(insight.id, actionId).then(() => {
                            queryClient.invalidateQueries({ queryKey: ["ai-brain-insights"] });
                          });
                        }}
                        onMarkImplemented={() => updateMutation.mutate({ insightId: insight.id, action: "implement" })}
                        isPending={updateMutation.isPending}
                      />
                    )}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ============================================
// INSIGHT ACTIONS COMPONENT
// ============================================

function InsightActions({ 
  insight, 
  onApprove, 
  onDismiss, 
  isPending 
}: { 
  insight: AIInsight;
  onApprove: (actionId?: string) => void;
  onDismiss: () => void;
  isPending: boolean;
}) {
  const [showActions, setShowActions] = useState(false);
  const [actions, setActions] = useState<AutoAction[]>([]);
  const [loadingActions, setLoadingActions] = useState(false);
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [executing, setExecuting] = useState(false);

  const loadActions = async () => {
    setLoadingActions(true);
    try {
      const data = await fetchInsightActions(insight.id);
      setActions(data);
      setShowActions(true);
    } catch (error) {
      console.error("Failed to load actions:", error);
    } finally {
      setLoadingActions(false);
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case "safe": return "text-emerald-400 bg-emerald-500/10 border-emerald-500/30";
      case "moderate": return "text-amber-400 bg-amber-500/10 border-amber-500/30";
      case "high": return "text-red-400 bg-red-500/10 border-red-500/30";
      default: return "text-zinc-400 bg-zinc-500/10 border-zinc-500/30";
    }
  };

  if (showActions && actions.length > 0) {
    return (
      <div className="space-y-3 pt-2">
        <div className="flex items-center gap-2 text-sm text-zinc-400">
          <Zap className="w-4 h-4 text-amber-400" />
          Dostupné automatické akcie:
        </div>
        
        <div className="space-y-2">
          {actions.map((action) => (
            <button
              key={action.id}
              onClick={() => setSelectedAction(selectedAction === action.id ? null : action.id)}
              className={`w-full p-3 rounded-lg border text-left transition-all ${
                selectedAction === action.id 
                  ? "bg-violet-500/10 border-violet-500/30" 
                  : "bg-zinc-800/30 border-zinc-700 hover:border-zinc-600"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-white">{action.name}</span>
                    <span className={`px-2 py-0.5 rounded text-xs border ${getRiskColor(action.risk)}`}>
                      {action.risk === "safe" ? "Bezpečné" : action.risk === "moderate" ? "Stredné riziko" : "Vysoké riziko"}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400">{action.description}</p>
                  <p className="text-xs text-zinc-500 mt-1">Trvanie: {action.estimatedDuration}</p>
                </div>
                {selectedAction === action.id && (
                  <Check className="w-5 h-5 text-violet-400" />
                )}
              </div>
            </button>
          ))}
        </div>

        <div className="flex gap-2 pt-2">
          <button
            onClick={() => {
              setExecuting(true);
              onApprove(selectedAction || undefined);
            }}
            disabled={isPending || executing}
            className="flex-1 px-4 py-2.5 bg-emerald-500 text-white rounded-lg
                       hover:shadow-lg hover:shadow-emerald-500/25 transition-all flex items-center justify-center gap-2
                       disabled:opacity-50"
          >
            {executing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Zap className="w-4 h-4" />
            )}
            {selectedAction ? "Schváliť a Vykonať" : "Schváliť"}
          </button>
          <button
            onClick={onDismiss}
            disabled={isPending || executing}
            className="px-4 py-2.5 bg-zinc-700 text-zinc-300 rounded-lg hover:bg-zinc-600 transition-colors"
          >
            Zamietnuť
          </button>
          <button
            onClick={() => setShowActions(false)}
            className="px-4 py-2.5 bg-zinc-800 text-zinc-400 rounded-lg hover:bg-zinc-700 transition-colors"
          >
            Späť
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2 pt-2">
      <button
        onClick={() => onApprove()}
        disabled={isPending}
        className="flex-1 px-4 py-2 bg-emerald-500/20 text-emerald-400 rounded-lg
                   hover:bg-emerald-500/30 transition-colors flex items-center justify-center gap-2"
      >
        <ThumbsUp className="w-4 h-4" />
        Schváliť
      </button>
      <button
        onClick={loadActions}
        disabled={isPending || loadingActions}
        className="px-4 py-2 bg-violet-500/20 text-violet-400 rounded-lg
                   hover:bg-violet-500/30 transition-colors flex items-center justify-center gap-2"
        title="Zobraziť automatické akcie"
      >
        {loadingActions ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Zap className="w-4 h-4" />
        )}
        Auto-fix
      </button>
      <button
        onClick={onDismiss}
        disabled={isPending}
        className="flex-1 px-4 py-2 bg-red-500/20 text-red-400 rounded-lg
                   hover:bg-red-500/30 transition-colors flex items-center justify-center gap-2"
      >
        <ThumbsDown className="w-4 h-4" />
        Zamietnuť
      </button>
    </div>
  );
}

// ============================================
// APPROVED INSIGHT ACTIONS COMPONENT
// ============================================

function ApprovedInsightActions({ 
  insight, 
  onExecute, 
  onMarkImplemented,
  isPending 
}: { 
  insight: AIInsight;
  onExecute: (actionId: string) => void;
  onMarkImplemented: () => void;
  isPending: boolean;
}) {
  const [actions, setActions] = useState<AutoAction[]>([]);
  const [loadingActions, setLoadingActions] = useState(false);
  const [executing, setExecuting] = useState<string | null>(null);

  useEffect(() => {
    fetchInsightActions(insight.id).then(setActions).catch(console.error);
  }, [insight.id]);

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case "safe": return "text-emerald-400 bg-emerald-500/10 border-emerald-500/30";
      case "moderate": return "text-amber-400 bg-amber-500/10 border-amber-500/30";
      case "high": return "text-red-400 bg-red-500/10 border-red-500/30";
      default: return "text-zinc-400 bg-zinc-500/10 border-zinc-500/30";
    }
  };

  const handleExecute = async (actionId: string) => {
    setExecuting(actionId);
    try {
      await onExecute(actionId);
    } finally {
      setExecuting(null);
    }
  };

  return (
    <div className="space-y-3 pt-2">
      {actions.length > 0 && (
        <>
          <div className="flex items-center gap-2 text-sm text-zinc-400">
            <Zap className="w-4 h-4 text-amber-400" />
            Vykonať automatickú akciu:
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {actions.map((action) => (
              <button
                key={action.id}
                onClick={() => handleExecute(action.id)}
                disabled={isPending || executing !== null}
                className={`p-3 rounded-lg border text-left transition-all hover:border-violet-500/50 ${
                  executing === action.id 
                    ? "bg-violet-500/10 border-violet-500/30" 
                    : "bg-zinc-800/30 border-zinc-700"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-white text-sm">{action.name}</span>
                  {executing === action.id ? (
                    <Loader2 className="w-4 h-4 text-violet-400 animate-spin" />
                  ) : (
                    <span className={`px-2 py-0.5 rounded text-xs border ${getRiskColor(action.risk)}`}>
                      {action.risk}
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-500">{action.estimatedDuration}</p>
              </button>
            ))}
          </div>
        </>
      )}

      <button
        onClick={onMarkImplemented}
        disabled={isPending}
        className="w-full px-4 py-2 bg-blue-500/20 text-blue-400 rounded-lg
                   hover:bg-blue-500/30 transition-colors flex items-center justify-center gap-2"
      >
        <Check className="w-4 h-4" />
        Označiť ako implementované (manuálne)
      </button>
    </div>
  );
}
