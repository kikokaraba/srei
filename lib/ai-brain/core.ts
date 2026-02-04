/**
 * SRIA AI Brain - Core System
 * 
 * Centrálny orchestrátor pre všetky AI agenty
 * Spravuje lifecycle, scheduling a komunikáciu medzi agentmi
 */

import { prisma } from "@/lib/prisma";
import type { 
  AIInsight, 
  AIBrainConfig, 
  AgentType,
  InsightStatus,
  InsightCategory,
  AgentPriority
} from "./types";

// ============================================
// DEFAULT CONFIGURATION
// ============================================

const DEFAULT_CONFIG: AIBrainConfig = {
  enabled: true,
  agents: {
    marketPulse: { enabled: true, interval: 6 * 60 * 60 * 1000 },      // 6 hodín
    dataQuality: { enabled: true, interval: 24 * 60 * 60 * 1000 },     // 24 hodín
    userBehavior: { enabled: true, interval: 12 * 60 * 60 * 1000 },    // 12 hodín
    featureSuggester: { enabled: true, interval: 7 * 24 * 60 * 60 * 1000 }, // 7 dní
    systemHealth: { enabled: true, interval: 5 * 60 * 1000 },          // 5 minút
  },
  notifications: {
    email: false,
  },
  autoActions: {
    enabled: false,
    requireApproval: true,
    allowedActions: [],
  },
};

// ============================================
// AI BRAIN CLASS
// ============================================

class AIBrain {
  private static instance: AIBrain;
  private config: AIBrainConfig;
  private insights: Map<string, AIInsight> = new Map();
  private lastRunTimes: Map<AgentType, Date> = new Map();
  private isInitialized = false;

  private constructor() {
    this.config = DEFAULT_CONFIG;
  }

  static getInstance(): AIBrain {
    if (!AIBrain.instance) {
      AIBrain.instance = new AIBrain();
    }
    return AIBrain.instance;
  }

  // ============================================
  // INITIALIZATION
  // ============================================

  async initialize(customConfig?: Partial<AIBrainConfig>): Promise<void> {
    if (this.isInitialized) return;

    if (customConfig) {
      this.config = { ...this.config, ...customConfig };
    }

    // Load existing insights from database
    await this.loadInsights();
    
    this.isInitialized = true;
    console.log("[AI Brain] Initialized successfully");
  }

  // ============================================
  // INSIGHT MANAGEMENT
  // ============================================

  async createInsight(insight: Omit<AIInsight, "id" | "createdAt" | "updatedAt">): Promise<AIInsight> {
    const id = `insight_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();

    const newInsight: AIInsight = {
      ...insight,
      id,
      createdAt: now,
      updatedAt: now,
    };

    this.insights.set(id, newInsight);
    
    // Persist to database
    await this.saveInsight(newInsight);

    // Trigger notifications if high priority
    if (insight.priority === "critical" || insight.priority === "high") {
      await this.notifyInsight(newInsight);
    }

    return newInsight;
  }

  async updateInsight(id: string, updates: Partial<AIInsight>): Promise<AIInsight | null> {
    const existing = this.insights.get(id);
    if (!existing) return null;

    const updated: AIInsight = {
      ...existing,
      ...updates,
      updatedAt: new Date(),
    };

    this.insights.set(id, updated);
    await this.saveInsight(updated);

    return updated;
  }

  async getInsights(filters?: {
    agentType?: AgentType;
    category?: InsightCategory;
    status?: InsightStatus;
    priority?: AgentPriority;
    limit?: number;
  }): Promise<AIInsight[]> {
    let results = Array.from(this.insights.values());

    if (filters) {
      if (filters.agentType) {
        results = results.filter(i => i.agentType === filters.agentType);
      }
      if (filters.category) {
        results = results.filter(i => i.category === filters.category);
      }
      if (filters.status) {
        results = results.filter(i => i.status === filters.status);
      }
      if (filters.priority) {
        results = results.filter(i => i.priority === filters.priority);
      }
    }

    // Sort by priority and date
    results.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return b.createdAt.getTime() - a.createdAt.getTime();
    });

    if (filters?.limit) {
      results = results.slice(0, filters.limit);
    }

    return results;
  }

  async approveInsight(id: string, reviewerId: string): Promise<AIInsight | null> {
    return this.updateInsight(id, {
      status: "approved",
      reviewedBy: reviewerId,
      reviewedAt: new Date(),
    });
  }

  async dismissInsight(id: string, reviewerId: string, reason: string): Promise<AIInsight | null> {
    return this.updateInsight(id, {
      status: "dismissed",
      reviewedBy: reviewerId,
      reviewedAt: new Date(),
      dismissedReason: reason,
    });
  }

  async implementInsight(id: string): Promise<AIInsight | null> {
    return this.updateInsight(id, {
      status: "implemented",
      implementedAt: new Date(),
    });
  }

  // ============================================
  // STATISTICS
  // ============================================

  async getStats(): Promise<{
    total: number;
    byStatus: Record<InsightStatus, number>;
    byPriority: Record<AgentPriority, number>;
    byAgent: Record<AgentType, number>;
    lastRunTimes: Record<AgentType, Date | null>;
  }> {
    const insights = Array.from(this.insights.values());

    const byStatus = insights.reduce((acc, i) => {
      acc[i.status] = (acc[i.status] || 0) + 1;
      return acc;
    }, {} as Record<InsightStatus, number>);

    const byPriority = insights.reduce((acc, i) => {
      acc[i.priority] = (acc[i.priority] || 0) + 1;
      return acc;
    }, {} as Record<AgentPriority, number>);

    const byAgent = insights.reduce((acc, i) => {
      acc[i.agentType] = (acc[i.agentType] || 0) + 1;
      return acc;
    }, {} as Record<AgentType, number>);

    const lastRunTimes: Record<AgentType, Date | null> = {
      "market-pulse": this.lastRunTimes.get("market-pulse") || null,
      "data-quality": this.lastRunTimes.get("data-quality") || null,
      "user-behavior": this.lastRunTimes.get("user-behavior") || null,
      "feature-suggester": this.lastRunTimes.get("feature-suggester") || null,
      "system-health": this.lastRunTimes.get("system-health") || null,
      "content-generator": this.lastRunTimes.get("content-generator") || null,
      "optimizer": this.lastRunTimes.get("optimizer") || null,
    };

    return {
      total: insights.length,
      byStatus,
      byPriority,
      byAgent,
      lastRunTimes,
    };
  }

  // ============================================
  // AGENT MANAGEMENT
  // ============================================

  setLastRunTime(agentType: AgentType, time: Date): void {
    this.lastRunTimes.set(agentType, time);
  }

  getLastRunTime(agentType: AgentType): Date | null {
    return this.lastRunTimes.get(agentType) || null;
  }

  isAgentEnabled(agentType: AgentType): boolean {
    const agentConfig = this.config.agents[agentType as keyof typeof this.config.agents];
    return agentConfig?.enabled ?? false;
  }

  getConfig(): AIBrainConfig {
    return this.config;
  }

  // ============================================
  // PERSISTENCE
  // ============================================

  private async loadInsights(): Promise<void> {
    try {
      // Try to load from database
      // For now, we'll use a simple in-memory cache
      // In production, this would be stored in a dedicated table
      console.log("[AI Brain] Loading insights from cache...");
    } catch (error) {
      console.error("[AI Brain] Error loading insights:", error);
    }
  }

  private async saveInsight(insight: AIInsight): Promise<void> {
    try {
      // In production, save to database
      // For now, just log
      console.log(`[AI Brain] Saved insight: ${insight.id} - ${insight.title}`);
    } catch (error) {
      console.error("[AI Brain] Error saving insight:", error);
    }
  }

  // ============================================
  // NOTIFICATIONS
  // ============================================

  private async notifyInsight(insight: AIInsight): Promise<void> {
    if (!this.config.notifications.email && !this.config.notifications.slack) {
      return;
    }

    console.log(`[AI Brain] Notification: ${insight.priority.toUpperCase()} - ${insight.title}`);
    
    // Notification channels can be extended here:
    // - Email: Use SMTP configuration from env
    // - Slack: Use NOTIFICATION_WEBHOOK_URL
    // - Custom webhooks: Add to AIBrainConfig
  }
}

// ============================================
// EXPORTS
// ============================================

export const aiBrain = AIBrain.getInstance();

// Helper function to get brain instance
export function getAIBrain(): AIBrain {
  return AIBrain.getInstance();
}
