/**
 * SRIA AI Brain - Main Export
 * 
 * Centrálny export pre celý AI Brain systém
 */

// Core
export { aiBrain, getAIBrain } from "./core";

// Types
export type {
  AIInsight,
  AIBrainConfig,
  AgentType,
  AgentPriority,
  InsightStatus,
  InsightCategory,
  MarketPulseData,
  DataQualityReport,
  UserBehaviorInsight,
  FeatureSuggestion,
  SystemHealthReport,
  AIAgent,
} from "./types";

// Agents
export {
  marketPulseAgent,
  dataQualityAgent,
  featureSuggesterAgent,
  allAgents,
  runAllAgents,
  runMarketPulseAnalysis,
  runDataQualityAnalysis,
  runFeatureSuggesterAnalysis,
} from "./agents";
