import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getApifyRunStatus } from "@/lib/scraper/apify-service";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const runId = searchParams.get("runId");

    if (!runId) {
      return NextResponse.json({ success: false, error: "Missing runId" }, { status: 400 });
    }

    const status = await getApifyRunStatus(runId);

    return NextResponse.json({
      success: true,
      runId,
      status: status.status,
      datasetId: status.datasetId,
      finishedAt: status.finishedAt
    });

  } catch (error) {
    console.error("Error fetching Apify status:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}
