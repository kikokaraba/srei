/**
 * SRIA AI Brain API
 * 
 * API endpoints pre správu AI Brain systému
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { 
  aiBrain, 
  runAllAgents,
  runMarketPulseAnalysis,
  runDataQualityAnalysis,
  runFeatureSuggesterAnalysis,
} from "@/lib/ai-brain";
import {
  getAvailableActions,
  executeAction,
  getAllActions,
} from "@/lib/ai-brain/auto-actions";

// GET - Získať insights a štatistiky
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (user?.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: "Forbidden - Admin access required" },
        { status: 403 }
      );
    }

    const url = new URL(request.url);
    const action = url.searchParams.get("action");

    // Initialize brain if not already
    await aiBrain.initialize();

    switch (action) {
      case "stats":
        const stats = await aiBrain.getStats();
        return NextResponse.json({ success: true, data: stats });

      case "insights":
        const agentType = url.searchParams.get("agentType") as any;
        const status = url.searchParams.get("status") as any;
        const priority = url.searchParams.get("priority") as any;
        const limit = parseInt(url.searchParams.get("limit") || "50");

        const insights = await aiBrain.getInsights({
          agentType: agentType || undefined,
          status: status || undefined,
          priority: priority || undefined,
          limit,
        });

        return NextResponse.json({ success: true, data: insights });

      case "actions":
        // Get all available auto-actions
        const allActions = getAllActions();
        return NextResponse.json({ 
          success: true, 
          data: allActions.map(a => ({
            id: a.id,
            type: a.type,
            name: a.name,
            description: a.description,
            risk: a.risk,
            estimatedDuration: a.estimatedDuration,
          })),
        });

      case "insight-actions":
        // Get actions for specific insight
        const insightId = url.searchParams.get("insightId");
        if (!insightId) {
          return NextResponse.json({ success: false, error: "Missing insightId" }, { status: 400 });
        }
        const targetInsights = await aiBrain.getInsights({ limit: 100 });
        const targetInsight = targetInsights.find(i => i.id === insightId);
        if (!targetInsight) {
          return NextResponse.json({ success: false, error: "Insight not found" }, { status: 404 });
        }
        const availableActions = getAvailableActions(targetInsight);
        return NextResponse.json({ 
          success: true, 
          data: availableActions.map(a => ({
            id: a.id,
            type: a.type,
            name: a.name,
            description: a.description,
            risk: a.risk,
            estimatedDuration: a.estimatedDuration,
          })),
        });

      default:
        // Return overview
        const overviewStats = await aiBrain.getStats();
        const recentInsights = await aiBrain.getInsights({ limit: 10 });
        
        return NextResponse.json({
          success: true,
          data: {
            stats: overviewStats,
            recentInsights,
            config: aiBrain.getConfig(),
            availableActions: getAllActions().map(a => ({
              id: a.id,
              name: a.name,
              risk: a.risk,
            })),
          },
        });
    }
  } catch (error) {
    console.error("AI Brain API Error:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: "Internal server error",
        details: error instanceof Error ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}

// POST - Spustiť agentov alebo akcie
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (user?.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: "Forbidden - Admin access required" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { action, insightId, reason, agentType, actionId, autoExecute } = body;

    // Initialize brain
    await aiBrain.initialize();

    switch (action) {
      case "run-all":
        const allResults = await runAllAgents();
        return NextResponse.json({ 
          success: true, 
          data: allResults,
          message: `Spustených ${allResults.length} agentov`,
        });

      case "run-agent":
        let agentResults;
        switch (agentType) {
          case "market-pulse":
            agentResults = await runMarketPulseAnalysis();
            break;
          case "data-quality":
            agentResults = await runDataQualityAnalysis();
            break;
          case "feature-suggester":
            agentResults = await runFeatureSuggesterAnalysis();
            break;
          default:
            return NextResponse.json(
              { success: false, error: "Unknown agent type" },
              { status: 400 }
            );
        }
        return NextResponse.json({ 
          success: true, 
          data: agentResults,
          message: `Agent ${agentType} vygeneroval ${agentResults.length} insights`,
        });

      case "approve":
        if (!insightId) {
          return NextResponse.json(
            { success: false, error: "Missing insightId" },
            { status: 400 }
          );
        }
        const approved = await aiBrain.approveInsight(insightId, session.user.id);
        
        // If auto-execute is enabled and actionId is provided, execute the action
        if (autoExecute && actionId && approved) {
          const actionResult = await executeAction(approved, actionId, session.user.id);
          return NextResponse.json({ 
            success: true, 
            data: approved,
            message: "Insight schválený a akcia vykonaná",
            actionResult,
          });
        }
        
        return NextResponse.json({ 
          success: true, 
          data: approved,
          message: "Insight schválený",
        });

      case "execute-action":
        if (!insightId || !actionId) {
          return NextResponse.json(
            { success: false, error: "Missing insightId or actionId" },
            { status: 400 }
          );
        }
        
        // Get the insight
        const allInsights = await aiBrain.getInsights({ limit: 100 });
        const insightToExecute = allInsights.find(i => i.id === insightId);
        
        if (!insightToExecute) {
          return NextResponse.json(
            { success: false, error: "Insight not found" },
            { status: 404 }
          );
        }
        
        // Execute the action
        const execResult = await executeAction(insightToExecute, actionId, session.user.id);
        
        return NextResponse.json({ 
          success: execResult.success, 
          data: execResult,
          message: execResult.message,
        });

      case "dismiss":
        if (!insightId) {
          return NextResponse.json(
            { success: false, error: "Missing insightId" },
            { status: 400 }
          );
        }
        const dismissed = await aiBrain.dismissInsight(
          insightId, 
          session.user.id, 
          reason || "Zamietnuté adminom"
        );
        return NextResponse.json({ 
          success: true, 
          data: dismissed,
          message: "Insight zamietnutý",
        });

      case "implement":
        if (!insightId) {
          return NextResponse.json(
            { success: false, error: "Missing insightId" },
            { status: 400 }
          );
        }
        const implemented = await aiBrain.implementInsight(insightId);
        return NextResponse.json({ 
          success: true, 
          data: implemented,
          message: "Insight označený ako implementovaný",
        });

      default:
        return NextResponse.json(
          { success: false, error: "Unknown action" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("AI Brain API Error:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: "Internal server error",
        details: error instanceof Error ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}
