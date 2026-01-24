/**
 * SRIA AI Brain - Type Definitions
 * 
 * Centrálny typový systém pre všetky AI agenty
 */

// ============================================
// AGENT TYPES
// ============================================

export type AgentType = 
  | "market-pulse"      // Trhové analýzy a insights
  | "data-quality"      // Kvalita dát
  | "user-behavior"     // Správanie používateľov
  | "feature-suggester" // Návrhy funkcií
  | "system-health"     // Zdravie systému
  | "content-generator" // Generovanie obsahu
  | "optimizer";        // Optimalizácie

export type AgentPriority = "critical" | "high" | "medium" | "low";

export type InsightStatus = 
  | "new"           // Nový insight
  | "reviewed"      // Prezretý adminom
  | "approved"      // Schválený na implementáciu
  | "implemented"   // Implementovaný
  | "dismissed"     // Zamietnutý
  | "archived";     // Archivovaný

export type InsightCategory =
  | "market"        // Trhové príležitosti
  | "bug"           // Chyba/problém
  | "optimization"  // Optimalizácia
  | "feature"       // Nová funkcia
  | "content"       // Obsah
  | "ux"            // User experience
  | "data"          // Dátová kvalita
  | "performance"   // Výkon
  | "security";     // Bezpečnosť

// ============================================
// INSIGHT INTERFACE
// ============================================

export interface AIInsight {
  id: string;
  agentType: AgentType;
  category: InsightCategory;
  priority: AgentPriority;
  status: InsightStatus;
  
  // Content
  title: string;
  description: string;
  details?: string;
  
  // Metrics
  confidence: number;      // 0-100
  impact: number;          // 0-100
  effort?: number;         // 0-100 (effort to implement)
  
  // Context
  context?: Record<string, unknown>;
  affectedAreas?: string[];
  relatedInsights?: string[];
  
  // Action
  suggestedAction?: string;
  actionCode?: string;     // Generated code snippet
  actionUrl?: string;      // Link to affected area
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  reviewedBy?: string;
  reviewedAt?: Date;
  implementedAt?: Date;
  dismissedReason?: string;
}

// ============================================
// MARKET PULSE TYPES
// ============================================

export interface MarketPulseData {
  date: Date;
  
  // Price trends
  avgPriceChange: number;
  hotCities: Array<{
    city: string;
    priceChange: number;
    volume: number;
    sentiment: "bullish" | "bearish" | "neutral";
  }>;
  
  // Opportunities
  hotDealsCount: number;
  topOpportunities: Array<{
    propertyId: string;
    title: string;
    potentialProfit: number;
    score: number;
  }>;
  
  // Market sentiment
  overallSentiment: "bullish" | "bearish" | "neutral";
  sentimentScore: number; // -100 to 100
  
  // Key metrics
  totalListings: number;
  newListings24h: number;
  removedListings24h: number;
  avgDaysOnMarket: number;
  
  // AI-generated narrative
  narrative: string;
  keyInsights: string[];
  predictions: string[];
}

// ============================================
// DATA QUALITY TYPES
// ============================================

export interface DataQualityReport {
  date: Date;
  overallScore: number; // 0-100
  
  issues: Array<{
    type: "missing" | "invalid" | "duplicate" | "stale" | "anomaly";
    severity: "critical" | "warning" | "info";
    field: string;
    count: number;
    examples?: string[];
    suggestedFix?: string;
  }>;
  
  stats: {
    totalRecords: number;
    completeRecords: number;
    incompleteRecords: number;
    duplicates: number;
    staleRecords: number;
    anomalies: number;
  };
  
  recommendations: string[];
}

// ============================================
// USER BEHAVIOR TYPES
// ============================================

export interface UserBehaviorInsight {
  date: Date;
  
  // Engagement
  activeUsers24h: number;
  newUsers24h: number;
  returningUsers24h: number;
  
  // Feature usage
  topFeatures: Array<{
    feature: string;
    usage: number;
    trend: "up" | "down" | "stable";
  }>;
  
  // Pain points
  frictionPoints: Array<{
    page: string;
    dropOffRate: number;
    avgTimeSpent: number;
    issue?: string;
  }>;
  
  // Churn risk
  churnRiskUsers: number;
  churnFactors: string[];
  
  // Suggestions
  suggestions: Array<{
    type: "ux" | "feature" | "content";
    description: string;
    impact: number;
  }>;
}

// ============================================
// FEATURE SUGGESTION TYPES
// ============================================

export interface FeatureSuggestion {
  id: string;
  title: string;
  description: string;
  
  // Source
  source: "user-feedback" | "behavior-analysis" | "market-gap" | "ai-analysis";
  
  // Metrics
  demandScore: number;     // 0-100
  feasibilityScore: number; // 0-100
  impactScore: number;      // 0-100
  overallScore: number;     // Combined score
  
  // Details
  userRequests?: number;
  competitorHas?: boolean;
  estimatedEffort?: "small" | "medium" | "large";
  
  // Implementation hints
  technicalNotes?: string;
  suggestedImplementation?: string;
}

// ============================================
// SYSTEM HEALTH TYPES
// ============================================

export interface SystemHealthReport {
  timestamp: Date;
  overallHealth: "healthy" | "degraded" | "critical";
  score: number; // 0-100
  
  components: Array<{
    name: string;
    status: "healthy" | "degraded" | "down";
    latency?: number;
    errorRate?: number;
    lastCheck: Date;
  }>;
  
  alerts: Array<{
    severity: "critical" | "warning" | "info";
    component: string;
    message: string;
    timestamp: Date;
  }>;
  
  performance: {
    avgResponseTime: number;
    p95ResponseTime: number;
    errorRate: number;
    uptime: number;
  };
  
  recommendations: string[];
}

// ============================================
// AI BRAIN CONFIGURATION
// ============================================

export interface AIBrainConfig {
  enabled: boolean;
  agents: {
    marketPulse: { enabled: boolean; interval: number };
    dataQuality: { enabled: boolean; interval: number };
    userBehavior: { enabled: boolean; interval: number };
    featureSuggester: { enabled: boolean; interval: number };
    systemHealth: { enabled: boolean; interval: number };
  };
  notifications: {
    email: boolean;
    slack?: string;
    webhook?: string;
  };
  autoActions: {
    enabled: boolean;
    requireApproval: boolean;
    allowedActions: string[];
  };
}

// ============================================
// AGENT BASE CLASS INTERFACE
// ============================================

export interface AIAgent {
  type: AgentType;
  name: string;
  description: string;
  
  // Lifecycle
  initialize(): Promise<void>;
  run(): Promise<AIInsight[]>;
  cleanup(): Promise<void>;
  
  // Status
  isRunning(): boolean;
  lastRun(): Date | null;
  nextRun(): Date | null;
}
