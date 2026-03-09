import { NextResponse } from "next/server";
import { getAgentStats } from "@/lib/agent-data";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const { agentId } = await params;

  try {
    const stats = await getAgentStats(agentId);
    return NextResponse.json(stats);
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch agent stats" },
      { status: 500 }
    );
  }
}
