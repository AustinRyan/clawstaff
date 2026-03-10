# System Architecture Deep Dive

This document explains how ClawStaff works under the hood -- from the OpenClaw runtime that powers the agents, to the dashboard that displays their work.

## High-Level Architecture

```
                         +-------------------+
                         |    End Customer    |
                         |  (WhatsApp, SMS,   |
                         |   Slack, Email)    |
                         +---------+---------+
                                   |
                          messaging channels
                                   |
                         +---------v---------+
                         |   OpenClaw Gateway |
                         | ws://127.0.0.1:    |
                         |       18789        |
                         +---------+---------+
                                   |
                    WebSocket routing by agent ID
                                   |
              +--------------------+--------------------+
              |                    |                    |
     +--------v-------+  +--------v-------+  +--------v-------+
     |  Agent Runtime  |  |  Agent Runtime  |  |  Agent Runtime  |
     |   (testmaya)    |  |   (testcole)    |  |   (testalex)    |
     +--------+-------+  +--------+-------+  +--------+-------+
              |                    |                    |
     +--------v-------+  +--------v-------+  +--------v-------+
     | Workspace Files |  | Workspace Files |  | Workspace Files |
     |  SOUL.md        |  |  SOUL.md        |  |  SOUL.md        |
     |  USER.md        |  |  USER.md        |  |  USER.md        |
     |  HEARTBEAT.md   |  |  HEARTBEAT.md   |  |  HEARTBEAT.md   |
     |  memory/        |  |  memory/        |  |  memory/        |
     |  sessions/      |  |  sessions/      |  |  sessions/      |
     +----------------+  +----------------+  +----------------+
              |                    |                    |
              +--------------------+--------------------+
                                   |
                          filesystem reads
                                   |
                         +---------v---------+
                         |  ClawStaff Data   |
                         |     Layer         |
                         |   (parser.ts)     |
                         +---------+---------+
                                   |
                            API routes
                                   |
                         +---------v---------+
                         |  Next.js Dashboard |
                         |  (React + Hooks)   |
                         +-------------------+
```

## OpenClaw Gateway

The Gateway is the central message router. It runs as a WebSocket server on `ws://127.0.0.1:18789` and handles:

- **Inbound message routing:** When a message arrives from a customer on WhatsApp, Slack, SMS, or email, the Gateway determines which agent should receive it based on the channel configuration and forwards the message to the correct agent runtime.
- **Outbound message delivery:** When an agent composes a response, the Gateway routes it back through the appropriate channel.
- **Agent lifecycle management:** Starting, stopping, and health-checking individual agent processes.
- **Session management:** Each conversation gets a unique session, tracked via JSONL files.

On macOS (development), the Gateway runs as a LaunchAgent. On production VPS, it runs as a systemd service.

**Key CLI commands:**

```bash
openclaw gateway start      # Start the Gateway
openclaw gateway restart    # Restart the Gateway
openclaw agents list        # List registered agents
openclaw agents add         # Register a new agent
openclaw agent --agent <id> --message "..."  # Send a test message
```

## Agent Runtime

Each agent runs as an independent process managed by the Gateway. The runtime follows the **ReAct pattern** (Reason, Act, Observe, Repeat):

1. **Reason:** The agent receives a message and thinks about what to do, informed by its SOUL.md identity, the conversation context, and its available tools.
2. **Act:** The agent takes an action -- responding to the message, calling a tool (search calendar, check reviews, look up a record), or writing to memory.
3. **Observe:** The agent observes the result of the action (tool output, confirmation, error).
4. **Repeat:** The agent decides if more actions are needed or if the task is complete.

The runtime is model-agnostic. Currently, all agents use `anthropic/claude-sonnet-4-5`, but the model can be swapped per agent in the OpenClaw configuration.

## Identity System

Each agent's identity and behavior is defined by a set of markdown files in its workspace directory.

### SOUL.md -- Core Identity

The most important file. Read first every time the agent wakes. Defines:

- **Name and Role:** Who the agent is and what they do (e.g., "Maya, Review & Reservation Manager for Mama Rosa's")
- **Communication Style:** How the agent writes -- warm, professional, casual, or direct
- **Operational Rules:** Detailed instructions for handling every type of interaction
- **Escalation Framework:** What triggers an immediate owner alert vs. what goes in the daily summary
- **Business Knowledge:** FAQs, hours, services, and other domain-specific information
- **Privacy Rules:** What the agent must never share or discuss
- **Boundaries:** What the agent handles vs. what gets escalated

See `docs/soul-md-reference.md` for a complete writing guide.

### USER.md -- Owner Information

Contains information about the business owner: name, contact preferences, business details. Referenced by the agent when it needs to escalate or send reports.

### AGENTS.md -- Startup Instructions

Read when the agent first starts. Contains initial setup tasks, tool verification steps, and any one-time configuration the agent needs to perform.

### HEARTBEAT.md -- Proactive Task Schedule

Defines the agent's proactive task cycle. The heartbeat runs approximately every 30 minutes and includes tasks like:

- Checking for new reviews
- Following up on leads
- Sending appointment confirmations
- Running re-engagement campaigns
- Generating daily briefings for the owner

Each vertical template defines a set of heartbeat tasks appropriate to that business type.

## Memory System

The memory system is entirely file-based, using markdown for human readability and debuggability.

### Daily Memory Files (`memory/YYYY-MM-DD.md`)

Each day gets its own memory file. Entries are formatted as sections with timestamps:

```markdown
## 14:30 -- New Lead: Silver Spring 3BR Search

Marcus Chen reached out about 3BR properties in Silver Spring area.
Budget: $450K-$550K, pre-approved. Timeline: 3 months.
Scheduled showing for Thursday at 2 PM.
Added to pipeline as hot lead.
```

The parser (`parser.ts`) reads these files and extracts structured `MemoryEntry` objects with timestamps, titles, and body text.

### Long-Term Memory (`MEMORY.md`)

Persistent memory that carries across days. Contains learned patterns, important client preferences, and accumulated knowledge. The agent writes to this when it discovers something worth remembering long-term.

### Session State (`SESSION-STATE.md`)

Tracks the current state of active conversations and ongoing tasks. Updated frequently during active work periods.

### Recent Context (`RECENT_CONTEXT.md`)

A rolling window of recent activity, optimized for the agent to quickly catch up on what happened recently when it wakes from idle.

### Memory Search Tool (`memory_search`)

For agents with large memory histories, OpenClaw provides a memory search tool that combines vector similarity search with FTS5 full-text search. This allows agents to recall specific interactions, patterns, or facts from weeks or months ago without reading every memory file.

## Skills System

Skills are modular capabilities that can be installed per agent. Each skill is defined by a `SKILL.md` file that tells the agent how and when to use it.

Skills are installed from the ClawhHub registry:

```bash
clawhub install <slug>
```

Common skills used across verticals:

| Skill | Description |
|-------|-------------|
| Google Reviews API monitoring | Watch for new reviews on Google Business |
| Yelp monitoring | Watch for new reviews on Yelp |
| WhatsApp messaging | Send and receive WhatsApp messages |
| GOG (Google Calendar + Gmail) | Calendar management, email reading/sending |
| Tavily | Web research and information gathering |
| Summarize | Generate concise summaries of conversations or data |
| Agent Browser | Browse web pages and extract information |
| Cron scheduling | Schedule recurring tasks |
| Shopify integration | Access order data, cart information, product details |
| CRM-style memory tracking | Structured lead and contact management |

Each vertical template pre-configures the appropriate skills for that business type.

## Dashboard Data Flow

The dashboard reads agent data through a multi-layer pipeline:

```
Filesystem (SOUL.md, sessions/*.jsonl, memory/*.md)
    |
    v
parser.ts  -- Server-side Node.js file reader
    |         - parseIdentity(): reads SOUL.md, extracts name/role/vertical
    |         - getAllSessions(): reads JSONL session files, extracts messages
    |         - parseMemoryFiles(): reads memory/*.md, extracts entries
    |         - classifyMessage(): assigns messages to vertical-specific task buckets
    |         - buildAgentStats(): assembles the complete AgentStats object
    |         - buildConversations(): assembles paginated conversation list
    |
    v
index.ts  -- Entry point with fallback logic
    |         - getAgentStats(): tries real data, falls back to mock
    |         - getAgentMessages(): tries real data, falls back to mock
    |         - listAgents(): scans directory for agent workspaces
    |
    v
API Routes  (/api/agent/[agentId]/stats, /api/agent/[agentId]/messages)
    |
    v
hooks.ts  -- Client-side React hooks
    |         - useAgentStats(pollMs): fetches stats, optional polling
    |         - useAgentMessages(opts): fetches paginated messages
    |
    v
React UI  -- Dashboard pages render the data
```

### Data Path Configuration

The `AGENT_DATA_PATH` environment variable controls where the data layer looks for agent workspaces:

| Environment | Default Path | Notes |
|-------------|-------------|-------|
| Local dev | `~/clawstaff/agents` | Agent workspaces on your machine |
| Production VPS | `/opt/clawstaff/agents` | Set via `AGENT_DATA_PATH=/opt/clawstaff/agents` |

Session JSONL files are read from a separate path: `~/.openclaw/agents/{agentId}/sessions/*.jsonl` (the standard OpenClaw sessions directory).

### Vertical Detection

The parser detects an agent's vertical (restaurant, realtor, fitness, medical, home-services, ecommerce) by reading the `**Role:**` line in SOUL.md and matching it against regex patterns:

```
/restaurant|reservation/i     -> restaurant
/real\s*estate|realtor|realty/i -> realtor
/fitness|gym|studio/i          -> fitness
/medical|dental|health/i       -> medical
/hvac|plumbing|home\s*service/i -> home-services
/e-?commerce|shopify|shop/i    -> ecommerce
```

If the Role line does not match, the parser scans the entire SOUL.md content as a fallback. If nothing matches, it defaults to "restaurant."

### Task Classification

Assistant messages are classified into vertical-specific task buckets using keyword matching. Each vertical defines classification rules in `parser.ts`:

```
restaurant:
  /reserv/i             -> reservationsManaged
  /summar/i             -> summariesSent
  /question|faq|hours/i -> questionsAnswered
  (default)             -> inquiriesHandled

realtor:
  /lead|follow/i        -> leadsFollowedUp
  /show|tour|visit/i    -> showingsScheduled
  /pipeline|status/i    -> pipelineUpdates
  /brief|summar/i       -> briefingsSent
```

The task buckets for each vertical are defined in the `VERTICAL_TASKS` constant in `types.ts`, which specifies the key, display label, and chart color for each bucket.

## Multi-Agent Support

Each agent operates in complete isolation:

- **Separate workspace directory:** Each agent has its own SOUL.md, USER.md, HEARTBEAT.md, memory files, and configuration.
- **Separate session files:** Each agent's conversations are stored in its own sessions directory under `~/.openclaw/agents/{agentId}/sessions/`.
- **Shared Gateway:** All agents connect through the same Gateway instance, which handles routing. The Gateway ensures messages reach the correct agent.
- **Independent runtimes:** Each agent is its own process with its own model context. Agents do not share memory or state directly.

This architecture means you can run 1 agent or 20 agents on the same server, each serving a different business, with zero cross-contamination of data or behavior.

## Mock Data Fallback

When the data layer cannot find real agent data (no workspace directory, no session files, or empty sessions), it falls back to mock data from `mock-data.ts`. The mock data includes the flag `isDemo: true`, which triggers a "Showing demo data" banner in the dashboard UI.

This fallback ensures the dashboard always renders something useful, whether for development, sales demos, or first-time setup before any real agents are deployed.

## Key Source Files

| File | Purpose |
|------|---------|
| `src/lib/agent-data/index.ts` | Data layer entry point with fallback logic |
| `src/lib/agent-data/parser.ts` | Filesystem parser for SOUL.md, sessions, memory |
| `src/lib/agent-data/types.ts` | All TypeScript types and VERTICAL_TASKS constant |
| `src/lib/agent-data/mock-data.ts` | Mock fallback data (isDemo: true) |
| `src/lib/agent-data/hooks.ts` | Client-side React hooks (useAgentStats, useAgentMessages) |
| `scripts/generate-workspace.ts` | Workspace generator (vertical templates + client config) |
| `src/lib/moltbook/client.ts` | Moltbook API client |
| `src/lib/moltbook/heartbeat.ts` | Moltbook heartbeat integration |
