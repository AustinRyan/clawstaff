// ---------------------------------------------------------------------------
// ClawStaff — Server-side parser for OpenClaw agent data on the filesystem
// ---------------------------------------------------------------------------
// This file uses Node `fs` and must only be imported from server components
// or API routes (never from client components).
// ---------------------------------------------------------------------------

import fs from "fs/promises";
import path from "path";
import os from "os";

import {
  AgentIdentity,
  AgentStats,
  ActivityItem,
  Conversation,
  ConversationMessage,
  DailyStats,
  MemoryEntry,
  MessagesResponse,
  TaskBucket,
  Vertical,
  VERTICAL_TASKS,
} from "./types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Expand `~` to the user's home directory. */
function expandHome(p: string): string {
  if (p.startsWith("~/") || p === "~") {
    return path.join(os.homedir(), p.slice(1));
  }
  return p;
}

/** Resolve the root directory where agent workspaces are stored. */
function getAgentDataPath(): string {
  const raw = process.env.AGENT_DATA_PATH ?? "~/clawstaff/agents";
  return expandHome(raw);
}

/** Resolve the OpenClaw sessions directory for a given agent ID. */
function getSessionsPath(agentId: string): string {
  return expandHome(`~/.openclaw/agents/${agentId}/sessions`);
}

/** Check whether a path exists on disk. */
async function exists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

/** Read a text file safely — returns empty string on any error. */
async function safeReadFile(filePath: string): Promise<string> {
  try {
    return await fs.readFile(filePath, "utf-8");
  } catch {
    return "";
  }
}

/** Parse an ISO timestamp without throwing. Returns null on failure. */
function safeParse(ts: string): Date | null {
  const d = new Date(ts);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Format a Date to YYYY-MM-DD. */
function toDateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Today in YYYY-MM-DD using local time. */
function todayKey(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Return the date N days ago as YYYY-MM-DD. */
function daysAgoKey(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return toDateKey(d);
}

// ---------------------------------------------------------------------------
// SOUL.md parsing — identity & vertical detection
// ---------------------------------------------------------------------------

const VERTICAL_PATTERNS: { pattern: RegExp; vertical: Vertical }[] = [
  { pattern: /restaurant|reservation/i, vertical: "restaurant" },
  { pattern: /real\s*estate|realtor|realty/i, vertical: "realtor" },
  { pattern: /fitness|gym|studio/i, vertical: "fitness" },
  { pattern: /medical|dental|health/i, vertical: "medical" },
  { pattern: /hvac|plumbing|home\s*service/i, vertical: "home-services" },
  { pattern: /e-?commerce|shopify|shop/i, vertical: "ecommerce" },
];

function detectVertical(soulContent: string): Vertical {
  // First try the **Role:** line which is the canonical location
  const roleMatch = soulContent.match(/\*\*Role:\*\*\s*(.+)/i);
  const roleLine = roleMatch ? roleMatch[1] : "";

  for (const { pattern, vertical } of VERTICAL_PATTERNS) {
    if (pattern.test(roleLine)) return vertical;
  }
  // Fallback: scan the entire SOUL.md
  for (const { pattern, vertical } of VERTICAL_PATTERNS) {
    if (pattern.test(soulContent)) return vertical;
  }
  // Default
  return "restaurant";
}

function extractField(content: string, field: string): string {
  const re = new RegExp(`\\*\\*${field}:\\*\\*\\s*(.+)`, "i");
  const m = content.match(re);
  return m ? m[1].trim() : "";
}

/**
 * Read SOUL.md (and optionally USER.md) from an agent workspace directory
 * and extract identity information.
 */
export async function parseIdentity(agentDir: string): Promise<AgentIdentity> {
  const soulContent = await safeReadFile(path.join(agentDir, "SOUL.md"));
  const userContent = await safeReadFile(path.join(agentDir, "USER.md"));

  const agentName =
    extractField(soulContent, "Name") ||
    extractField(soulContent, "Agent Name") ||
    path.basename(agentDir);

  const vertical = detectVertical(soulContent);

  const role =
    extractField(soulContent, "Role") ||
    extractField(soulContent, "Title") ||
    "AI Assistant";

  const communicationStyle =
    extractField(soulContent, "Communication Style") ||
    extractField(soulContent, "Tone") ||
    "Professional and friendly";

  const businessName =
    extractField(userContent, "Business") ||
    extractField(userContent, "Business Name") ||
    extractField(soulContent, "Business") ||
    extractField(soulContent, "Business Name") ||
    "";

  const ownerName =
    extractField(userContent, "Owner") ||
    extractField(userContent, "Owner Name") ||
    extractField(soulContent, "Owner") ||
    "";

  // The agentId is derived from the directory name
  const agentId = path.basename(agentDir);

  return {
    agentId,
    agentName,
    businessName,
    ownerName,
    vertical,
    role,
    communicationStyle,
    status: "online", // will be refined once heartbeat checking is added
    activeSince: "", // populated later from session data
  };
}

// ---------------------------------------------------------------------------
// Session JSONL parsing
// ---------------------------------------------------------------------------

interface JsonlSessionHeader {
  type: "session";
  id: string;
  timestamp: string;
}

interface JsonlMessage {
  type: "message";
  id: string;
  timestamp: string;
  message: {
    role: "user" | "assistant" | string;
    content: string | Array<{ type: string; text?: string }>;
  };
}

type JsonlLine = JsonlSessionHeader | JsonlMessage | { type: string };

function parseJsonlLine(raw: string): JsonlLine | null {
  try {
    return JSON.parse(raw) as JsonlLine;
  } catch {
    return null;
  }
}

/** Extract the plain-text content from a JSONL message entry. */
function extractTextContent(
  content: string | Array<{ type: string; text?: string }>
): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .filter((block) => block.type === "text" && typeof block.text === "string")
      .map((block) => block.text as string)
      .join("\n");
  }
  return "";
}

/**
 * Strip the OpenClaw timestamp prefix that appears in user messages.
 * Format: `[Thu 2026-03-05 21:43 EST] actual message`
 */
function stripTimestampPrefix(text: string): string {
  return text.replace(/^\[.+?\]\s*/, "");
}

/**
 * Parse a single session JSONL file and extract user/assistant messages.
 */
export async function parseSessionMessages(
  jsonlPath: string
): Promise<ConversationMessage[]> {
  const raw = await safeReadFile(jsonlPath);
  if (!raw) return [];

  const messages: ConversationMessage[] = [];

  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const parsed = parseJsonlLine(trimmed);
    if (!parsed || parsed.type !== "message") continue;

    const msg = parsed as JsonlMessage;
    const role = msg.message?.role;
    if (role !== "user" && role !== "assistant") continue;

    const rawText = extractTextContent(msg.message.content);
    const content = role === "user" ? stripTimestampPrefix(rawText) : rawText;

    if (!content.trim()) continue;

    messages.push({
      role,
      content,
      timestamp: msg.timestamp,
    });
  }

  return messages;
}

/**
 * Discover and read all session JSONL files for a given agent.
 * Returns the aggregated messages and the timestamp of the first session.
 */
export async function getAllSessions(
  agentId: string
): Promise<{ messages: ConversationMessage[]; firstTimestamp: string }> {
  const sessionsDir = getSessionsPath(agentId);

  if (!(await exists(sessionsDir))) {
    return { messages: [], firstTimestamp: "" };
  }

  // Try reading the sessions index first
  let jsonlFiles: string[] = [];

  const indexPath = path.join(sessionsDir, "sessions.json");
  const indexRaw = await safeReadFile(indexPath);

  if (indexRaw) {
    try {
      const index = JSON.parse(indexRaw) as Array<{ id: string; path?: string }>;
      for (const entry of index) {
        const filePath = entry.path
          ? path.resolve(sessionsDir, entry.path)
          : path.join(sessionsDir, `${entry.id}.jsonl`);
        if (await exists(filePath)) {
          jsonlFiles.push(filePath);
        }
      }
    } catch {
      // Fall through to directory listing
    }
  }

  // Fallback: list *.jsonl files directly
  if (jsonlFiles.length === 0) {
    try {
      const entries = await fs.readdir(sessionsDir);
      jsonlFiles = entries
        .filter((f) => f.endsWith(".jsonl"))
        .map((f) => path.join(sessionsDir, f));
    } catch {
      return { messages: [], firstTimestamp: "" };
    }
  }

  const allMessages: ConversationMessage[] = [];
  let firstTimestamp = "";

  for (const filePath of jsonlFiles) {
    // Peek at the session header to get the session start time
    const raw = await safeReadFile(filePath);
    if (!raw) continue;

    const firstLine = raw.split("\n")[0]?.trim();
    if (firstLine) {
      const header = parseJsonlLine(firstLine);
      if (header && header.type === "session" && "timestamp" in header) {
        const ts = (header as JsonlSessionHeader).timestamp;
        if (!firstTimestamp || ts < firstTimestamp) {
          firstTimestamp = ts;
        }
      }
    }

    const msgs = await parseSessionMessages(filePath);
    allMessages.push(...msgs);
  }

  // Sort by timestamp ascending
  allMessages.sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  return { messages: allMessages, firstTimestamp };
}

// ---------------------------------------------------------------------------
// Memory file parsing
// ---------------------------------------------------------------------------

/**
 * Parse memory markdown files from `{agentDir}/memory/YYYY-MM-DD.md`.
 * Each file may contain multiple sections headed by `## HH:MM — Title`.
 */
export async function parseMemoryFiles(
  agentDir: string
): Promise<{ entries: MemoryEntry[]; dates: string[] }> {
  const memoryDir = path.join(agentDir, "memory");

  if (!(await exists(memoryDir))) {
    return { entries: [], dates: [] };
  }

  let files: string[];
  try {
    const dirEntries = await fs.readdir(memoryDir);
    files = dirEntries
      .filter((f) => /^\d{4}-\d{2}-\d{2}\.md$/.test(f))
      .sort()
      .reverse(); // most recent first
  } catch {
    return { entries: [], dates: [] };
  }

  const entries: MemoryEntry[] = [];
  const dates: string[] = [];

  for (const file of files) {
    const dateStr = file.replace(".md", "");
    dates.push(dateStr);

    const content = await safeReadFile(path.join(memoryDir, file));
    if (!content) continue;

    // Split on section headers: ## HH:MM — Title
    const sectionRegex = /^## (\d{1,2}:\d{2})\s*[—–-]\s*(.+)$/gm;
    let match: RegExpExecArray | null;
    const sectionStarts: { index: number; time: string; title: string }[] = [];

    while ((match = sectionRegex.exec(content)) !== null) {
      sectionStarts.push({
        index: match.index,
        time: match[1],
        title: match[2].trim(),
      });
    }

    for (let i = 0; i < sectionStarts.length; i++) {
      const start = sectionStarts[i];
      const nextStart = sectionStarts[i + 1];
      const bodyStart = content.indexOf("\n", start.index);
      const bodyEnd = nextStart ? nextStart.index : content.length;
      const body = content.slice(bodyStart + 1, bodyEnd).trim();

      // Build a rough ISO timestamp: date + time
      const [hours, minutes] = start.time.split(":").map(Number);
      const ts = new Date(`${dateStr}T${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`);

      entries.push({
        timestamp: Number.isNaN(ts.getTime()) ? `${dateStr}T${start.time}:00` : ts.toISOString(),
        title: start.title,
        body,
      });
    }
  }

  return { entries, dates };
}

// ---------------------------------------------------------------------------
// Message classification (keyword-based task bucket assignment)
// ---------------------------------------------------------------------------

type ClassificationRule = { pattern: RegExp; bucket: string };

const CLASSIFICATION_RULES: Record<Vertical, ClassificationRule[]> = {
  restaurant: [
    { pattern: /reserv/i, bucket: "reservationsManaged" },
    { pattern: /summar/i, bucket: "summariesSent" },
    { pattern: /question|faq|parking|hours/i, bucket: "questionsAnswered" },
    // Default handled separately
  ],
  realtor: [
    { pattern: /lead|follow/i, bucket: "leadsFollowedUp" },
    { pattern: /show|tour|visit/i, bucket: "showingsScheduled" },
    { pattern: /pipeline|status/i, bucket: "pipelineUpdates" },
    { pattern: /brief|summar/i, bucket: "briefingsSent" },
  ],
  fitness: [
    { pattern: /class|book|schedule/i, bucket: "classesBooked" },
    { pattern: /re-engag|inactive|haven't been/i, bucket: "membersReengaged" },
    { pattern: /remind/i, bucket: "remindersSent" },
  ],
  medical: [
    { pattern: /appoint|confirm|schedule/i, bucket: "appointmentsConfirmed" },
    { pattern: /no-show|missed/i, bucket: "noShowsRecovered" },
    { pattern: /rebook/i, bucket: "patientsRebooked" },
  ],
  "home-services": [
    { pattern: /lead|inquiry/i, bucket: "leadsResponded" },
    { pattern: /estimate|quote|follow/i, bucket: "estimateFollowUps" },
    { pattern: /season|remind|maintenance/i, bucket: "seasonalRemindersSent" },
  ],
  ecommerce: [
    { pattern: /ticket|support|help/i, bucket: "supportTicketsHandled" },
    { pattern: /cart|abandon/i, bucket: "cartsRecovered" },
    { pattern: /review|feedback/i, bucket: "reviewsCollected" },
    { pattern: /escalat/i, bucket: "escalations" },
  ],
};

/**
 * Classify an assistant message into a vertical-specific task bucket.
 * Returns the bucket key, or null if it does not match any rule.
 * Falls back to the first bucket for the vertical (the "default" bucket).
 */
export function classifyMessage(
  content: string,
  vertical: Vertical
): string | null {
  const rules = CLASSIFICATION_RULES[vertical];
  if (!rules) return null;

  for (const { pattern, bucket } of rules) {
    if (pattern.test(content)) return bucket;
  }

  // Default bucket: the first task for this vertical
  const tasks = VERTICAL_TASKS[vertical];
  return tasks.length > 0 ? tasks[0].key : null;
}

// ---------------------------------------------------------------------------
// Response-time calculation
// ---------------------------------------------------------------------------

/**
 * Compute the average response time in seconds from an array of messages.
 * Looks at each (user → assistant) pair and computes the delta.
 */
function computeAvgResponseTimeSec(
  messages: ConversationMessage[]
): number {
  const deltas: number[] = [];

  for (let i = 0; i < messages.length - 1; i++) {
    if (messages[i].role === "user" && messages[i + 1].role === "assistant") {
      const userTs = safeParse(messages[i].timestamp);
      const assistantTs = safeParse(messages[i + 1].timestamp);
      if (userTs && assistantTs) {
        const delta = (assistantTs.getTime() - userTs.getTime()) / 1000;
        if (delta >= 0 && delta < 86400) {
          // Only count reasonable deltas (< 24h)
          deltas.push(delta);
        }
      }
    }
  }

  if (deltas.length === 0) return 0;
  return Math.round(deltas.reduce((a, b) => a + b, 0) / deltas.length);
}

// ---------------------------------------------------------------------------
// Build daily stats from messages
// ---------------------------------------------------------------------------

function buildDailyStatsFromMessages(
  messages: ConversationMessage[],
  vertical: Vertical
): DailyStats[] {
  const dayMap = new Map<
    string,
    {
      messages: number;
      responseDeltas: number[];
      tasks: Record<string, number>;
    }
  >();

  // Initialize task keys for this vertical
  const taskKeys = VERTICAL_TASKS[vertical].map((t) => t.key);

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    const d = safeParse(msg.timestamp);
    if (!d) continue;
    const key = toDateKey(d);

    if (!dayMap.has(key)) {
      const tasks: Record<string, number> = {};
      for (const tk of taskKeys) tasks[tk] = 0;
      dayMap.set(key, { messages: 0, responseDeltas: [], tasks });
    }

    const day = dayMap.get(key)!;
    day.messages += 1;

    // Compute response delta for user→assistant pairs
    if (msg.role === "user" && i + 1 < messages.length && messages[i + 1].role === "assistant") {
      const userTs = d;
      const assistantTs = safeParse(messages[i + 1].timestamp);
      if (assistantTs) {
        const delta = (assistantTs.getTime() - userTs.getTime()) / 1000;
        if (delta >= 0 && delta < 86400) {
          day.responseDeltas.push(delta);
        }
      }
    }

    // Classify assistant messages into task buckets
    if (msg.role === "assistant") {
      const bucket = classifyMessage(msg.content, vertical);
      if (bucket && bucket in day.tasks) {
        day.tasks[bucket] += 1;
      }
    }
  }

  // Convert map to sorted array
  const result: DailyStats[] = [];
  const sortedKeys = Array.from(dayMap.keys()).sort();

  for (const key of sortedKeys) {
    const day = dayMap.get(key)!;
    const avgRT =
      day.responseDeltas.length > 0
        ? Math.round(
            day.responseDeltas.reduce((a, b) => a + b, 0) /
              day.responseDeltas.length
          )
        : 0;
    result.push({
      date: key,
      messages: day.messages,
      avgResponseTimeSec: avgRT,
      tasks: day.tasks,
    });
  }

  return result;
}

// ---------------------------------------------------------------------------
// Build recent activity from memory entries and messages
// ---------------------------------------------------------------------------

function buildRecentActivity(
  memoryEntries: MemoryEntry[],
  messages: ConversationMessage[]
): ActivityItem[] {
  const items: ActivityItem[] = [];

  // Add memory entries as activity items
  for (const entry of memoryEntries.slice(0, 20)) {
    const isEscalation = /flag|escalat|urgent|alert/i.test(entry.title);
    items.push({
      time: entry.timestamp,
      text: entry.title,
      type: isEscalation ? "escalation" : "memory",
    });
  }

  // Add recent assistant messages as activity items
  const recentAssistant = messages
    .filter((m) => m.role === "assistant")
    .slice(-20);

  for (const msg of recentAssistant) {
    const preview =
      msg.content.length > 100
        ? msg.content.slice(0, 100) + "..."
        : msg.content;
    const isTask = /scheduled|confirmed|booked|sent|responded/i.test(
      msg.content
    );
    items.push({
      time: msg.timestamp,
      text: preview,
      type: isTask ? "task" : "message",
    });
  }

  // Sort newest first, limit to 20
  items.sort((a, b) => b.time.localeCompare(a.time));
  return items.slice(0, 20);
}

// ---------------------------------------------------------------------------
// Public API: Build full agent stats
// ---------------------------------------------------------------------------

/**
 * Build the complete AgentStats object for a given agent.
 * Reads the workspace directory and session files from the filesystem.
 */
export async function buildAgentStats(agentId: string): Promise<AgentStats | null> {
  const agentDir = path.join(getAgentDataPath(), agentId);

  if (!(await exists(agentDir))) {
    return null;
  }

  // Parse identity from SOUL.md
  const identity = await parseIdentity(agentDir);

  // Read all session messages
  const { messages, firstTimestamp } = await getAllSessions(agentId);
  identity.activeSince = firstTimestamp;

  // Check HEARTBEAT.md for status
  const heartbeatPath = path.join(agentDir, "HEARTBEAT.md");
  if (await exists(heartbeatPath)) {
    const heartbeat = await safeReadFile(heartbeatPath);
    if (/error|down|offline/i.test(heartbeat)) {
      identity.status = "error";
    } else if (/idle|paused/i.test(heartbeat)) {
      identity.status = "offline";
    } else {
      identity.status = "online";
    }
  } else {
    // If no heartbeat file and no sessions, mark offline
    identity.status = messages.length > 0 ? "online" : "offline";
  }

  // Parse memory files
  const { entries: memoryEntries } = await parseMemoryFiles(agentDir);

  // Build daily stats
  const dailyStats = buildDailyStatsFromMessages(messages, identity.vertical);

  // Calculate aggregate metrics
  const today = todayKey();
  const weekStart = daysAgoKey(7);

  const todayMessages = messages.filter((m) => {
    const d = safeParse(m.timestamp);
    return d && toDateKey(d) === today;
  }).length;

  const weekMessages = messages.filter((m) => {
    const d = safeParse(m.timestamp);
    return d && toDateKey(d) >= weekStart;
  }).length;

  const avgResponseTimeSec = computeAvgResponseTimeSec(messages);

  // Build task breakdown (total across all time)
  const taskTotals: Record<string, number> = {};
  const verticalTasks = VERTICAL_TASKS[identity.vertical];
  for (const t of verticalTasks) {
    taskTotals[t.key] = 0;
  }
  for (const day of dailyStats) {
    for (const [k, v] of Object.entries(day.tasks)) {
      if (k in taskTotals) {
        taskTotals[k] += v;
      }
    }
  }

  const taskBreakdown: TaskBucket[] = verticalTasks.map((t) => ({
    key: t.key,
    label: t.label,
    color: t.color,
    value: taskTotals[t.key] ?? 0,
  }));

  // Build recent activity
  const recentActivity = buildRecentActivity(memoryEntries, messages);

  return {
    identity,
    todayMessages,
    weekMessages,
    totalMessages: messages.length,
    avgResponseTimeSec,
    taskBreakdown,
    dailyStats,
    recentActivity,
    isDemo: false,
  };
}

// ---------------------------------------------------------------------------
// Public API: Build paginated conversations from sessions
// ---------------------------------------------------------------------------

/**
 * Build a paginated, searchable conversation list from session data.
 * Each session JSONL file maps to one conversation.
 */
export async function buildConversations(
  agentId: string,
  opts: { page?: number; pageSize?: number; search?: string } = {}
): Promise<MessagesResponse | null> {
  const { page = 1, pageSize = 20, search = "" } = opts;
  const sessionsDir = getSessionsPath(agentId);
  const agentDir = path.join(getAgentDataPath(), agentId);

  if (!(await exists(sessionsDir)) && !(await exists(agentDir))) {
    return null;
  }

  // Gather JSONL files
  let jsonlFiles: string[] = [];

  if (await exists(sessionsDir)) {
    const indexPath = path.join(sessionsDir, "sessions.json");
    const indexRaw = await safeReadFile(indexPath);

    if (indexRaw) {
      try {
        const index = JSON.parse(indexRaw) as Array<{
          id: string;
          path?: string;
        }>;
        for (const entry of index) {
          const filePath = entry.path
            ? path.resolve(sessionsDir, entry.path)
            : path.join(sessionsDir, `${entry.id}.jsonl`);
          if (await exists(filePath)) {
            jsonlFiles.push(filePath);
          }
        }
      } catch {
        // Fall through
      }
    }

    if (jsonlFiles.length === 0) {
      try {
        const entries = await fs.readdir(sessionsDir);
        jsonlFiles = entries
          .filter((f) => f.endsWith(".jsonl"))
          .map((f) => path.join(sessionsDir, f));
      } catch {
        // continue
      }
    }
  }

  // Parse each JSONL into a Conversation
  const conversations: Conversation[] = [];

  for (const filePath of jsonlFiles) {
    const raw = await safeReadFile(filePath);
    if (!raw) continue;

    const lines = raw.split("\n").filter((l) => l.trim());
    const messages: ConversationMessage[] = [];
    let sessionId = path.basename(filePath, ".jsonl");
    let sessionTimestamp = "";

    for (const line of lines) {
      const parsed = parseJsonlLine(line);
      if (!parsed) continue;

      if (parsed.type === "session" && "id" in parsed) {
        sessionId = (parsed as JsonlSessionHeader).id;
        sessionTimestamp = (parsed as JsonlSessionHeader).timestamp;
        continue;
      }

      if (parsed.type === "message") {
        const msg = parsed as JsonlMessage;
        const role = msg.message?.role;
        if (role !== "user" && role !== "assistant") continue;

        const rawText = extractTextContent(msg.message.content);
        const content =
          role === "user" ? stripTimestampPrefix(rawText) : rawText;
        if (!content.trim()) continue;

        messages.push({ role, content, timestamp: msg.timestamp });
      }
    }

    if (messages.length === 0) continue;

    // Derive contact name from the first user message (best effort)
    const firstUserMsg = messages.find((m) => m.role === "user");
    const contact = firstUserMsg
      ? deriveContactName(firstUserMsg.content)
      : "Unknown";

    // Derive channel — defaults to "WhatsApp" since that's the primary channel
    const channel = deriveChannel(messages);

    const preview =
      messages[0].content.length > 120
        ? messages[0].content.slice(0, 120) + "..."
        : messages[0].content;

    const date = sessionTimestamp || messages[0].timestamp;

    conversations.push({
      id: sessionId,
      channel,
      contact,
      preview,
      date,
      messages,
    });
  }

  // Sort conversations by date descending (newest first)
  conversations.sort((a, b) => b.date.localeCompare(a.date));

  // Apply search filter
  const filtered = search
    ? conversations.filter((c) => {
        const q = search.toLowerCase();
        return (
          c.contact.toLowerCase().includes(q) ||
          c.preview.toLowerCase().includes(q) ||
          c.messages.some((m) => m.content.toLowerCase().includes(q))
        );
      })
    : conversations;

  // Paginate
  const total = filtered.length;
  const startIdx = (page - 1) * pageSize;
  const paged = filtered.slice(startIdx, startIdx + pageSize);

  return { conversations: paged, total, page, pageSize };
}

// ---------------------------------------------------------------------------
// Conversation helpers
// ---------------------------------------------------------------------------

/** Best-effort extraction of a contact name from message content. */
function deriveContactName(content: string): string {
  // Look for "Name: ..." or "My name is ..." patterns
  const nameMatch = content.match(
    /(?:name(?:\s+is)?|i'm|this is)\s+([A-Z][a-z]+(?:\s+[A-Z]\.?)?)/i
  );
  if (nameMatch) return nameMatch[1];

  // Look for a greeting with a name: "Hi, I'm Sarah"
  const greetMatch = content.match(
    /(?:hi|hello|hey),?\s+(?:i'm|this is|my name is)\s+([A-Z][a-z]+)/i
  );
  if (greetMatch) return greetMatch[1];

  return "Customer";
}

/**
 * Derive the communication channel from message content.
 * Looks for channel indicators in the messages.
 */
function deriveChannel(messages: ConversationMessage[]): string {
  const allText = messages
    .map((m) => m.content)
    .join(" ")
    .toLowerCase();

  if (allText.includes("whatsapp")) return "WhatsApp";
  if (allText.includes("email") || allText.includes("@")) return "Email";
  if (allText.includes("sms") || allText.includes("text message")) return "SMS";
  if (allText.includes("slack")) return "Slack";
  if (allText.includes("google review")) return "Google";
  if (allText.includes("yelp")) return "Yelp";

  return "WhatsApp"; // default
}

// ---------------------------------------------------------------------------
// Public API: List available agents
// ---------------------------------------------------------------------------

/**
 * List all agent directory names found under AGENT_DATA_PATH.
 */
export async function listAgentDirs(): Promise<string[]> {
  const basePath = getAgentDataPath();

  if (!(await exists(basePath))) {
    return [];
  }

  try {
    const entries = await fs.readdir(basePath, { withFileTypes: true });
    return entries.filter((e) => e.isDirectory()).map((e) => e.name);
  } catch {
    return [];
  }
}
