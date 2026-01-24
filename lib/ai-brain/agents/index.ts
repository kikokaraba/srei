/**
 * SRIA AI Brain - Agents Index
 * 
 * Export všetkých AI agentov
 */

export { marketPulseAgent, runMarketPulseAnalysis } from "./market-pulse";
export { dataQualityAgent, runDataQualityAnalysis } from "./data-quality";
export { featureSuggesterAgent, runFeatureSuggesterAnalysis } from "./feature-suggester";

// All agents array for easy iteration
import { marketPulseAgent } from "./market-pulse";
import { dataQualityAgent } from "./data-quality";
import { featureSuggesterAgent } from "./feature-suggester";

export const allAgents = [
  marketPulseAgent,
  dataQualityAgent,
  featureSuggesterAgent,
];

// Run all agents
export async function runAllAgents() {
  const results = [];
  
  for (const agent of allAgents) {
    console.log(`[AI Brain] Running agent: ${agent.name}`);
    try {
      const insights = await agent.run();
      results.push({
        agent: agent.name,
        success: true,
        insightsCount: insights.length,
        insights,
      });
    } catch (error) {
      console.error(`[AI Brain] Agent ${agent.name} failed:`, error);
      results.push({
        agent: agent.name,
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
  
  return results;
}
