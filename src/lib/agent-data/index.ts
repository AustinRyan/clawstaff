// ---------------------------------------------------------------------------
// ClawStaff — Agent data layer entry point
// ---------------------------------------------------------------------------
// Reads real OpenClaw agent data from the filesystem when available.
// Falls back to mock data when AGENT_DATA_PATH is unset or the agent
// directory is empty / missing.
//
// All exports are async, server-side only (they use `fs` via parser.ts).
// ---------------------------------------------------------------------------

import { AgentStats, MessagesResponse } from "./types";
import { buildAgentStats, buildConversations, listAgentDirs } from "./parser";
import { getMockStats, getMockMessages } from "./mock-data";

// Re-export types so consumers can import everything from one place
export type {
  AgentStats,
  AgentIdentity,
  ActivityItem,
  Conversation,
  ConversationMessage,
  DailyStats,
  MessagesResponse,
  MemoryEntry,
  TaskBucket,
  Vertical,
} from "./types";

export { VERTICAL_TASKS } from "./types";

// ---------------------------------------------------------------------------
// Environment
// ---------------------------------------------------------------------------

/**
 * When ENVIRONMENT=production, the data layer would eventually call a
 * remote API via Tailscale. For now (local / unset), we read directly
 * from the filesystem.
 */
function isLocal(): boolean {
  const env = process.env.ENVIRONMENT ?? "local";
  return env !== "production";
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Fetch the full stats payload for a single agent.
 *
 * Resolution order:
 *   1. Read real data from AGENT_DATA_PATH + session files.
 *   2. If the path is missing or yields no data, return mock data.
 */
export async function getAgentStats(agentId: string): Promise<AgentStats> {
  if (isLocal()) {
    try {
      const stats = await buildAgentStats(agentId);
      if (stats && stats.totalMessages > 0) {
        return stats;
      }
    } catch {
      // Fall through to mock data
    }
  }

  // TODO: ENVIRONMENT=production — call remote API via Tailscale
  return getMockStats();
}

/**
 * Fetch a paginated list of conversations for a single agent.
 *
 * Resolution order mirrors `getAgentStats`.
 */
export async function getAgentMessages(
  agentId: string,
  opts: { page?: number; pageSize?: number; search?: string } = {}
): Promise<MessagesResponse> {
  if (isLocal()) {
    try {
      const result = await buildConversations(agentId, opts);
      if (result && result.total > 0) {
        return result;
      }
    } catch {
      // Fall through to mock data
    }
  }

  // TODO: ENVIRONMENT=production — call remote API via Tailscale
  return getMockMessages(opts);
}

/**
 * List all available agent IDs by scanning the AGENT_DATA_PATH directory.
 * Returns an empty array when the directory is missing or unreadable.
 * Does NOT fall back to mock data — an empty list means "no agents found."
 */
export async function listAgents(): Promise<string[]> {
  if (isLocal()) {
    try {
      return await listAgentDirs();
    } catch {
      return [];
    }
  }

  // TODO: ENVIRONMENT=production — call remote API via Tailscale
  return [];
}
