<p align="center">
  <img src="https://img.shields.io/badge/license-MIT-ff6b35?style=flat-square" alt="MIT License" />
  <img src="https://img.shields.io/badge/node-22%2B-22c55e?style=flat-square" alt="Node 22+" />
  <img src="https://img.shields.io/badge/Next.js-14-e8e6e3?style=flat-square" alt="Next.js 14" />
  <img src="https://img.shields.io/badge/OpenClaw-powered-ff6b35?style=flat-square" alt="OpenClaw Powered" />
  <img src="https://img.shields.io/badge/verticals-6-f7c948?style=flat-square" alt="6 Verticals" />
</p>

# ClawStaff

**Open-source AI agent staffing framework built on [OpenClaw](https://openclaw.com).**

Deploy vertical-specific AI agents for local businesses — restaurants, real estate offices, fitness studios, medical/dental practices, home services, and e-commerce stores. Each agent gets a tailored identity, vertical-specific skills, a [Moltbook](https://moltbook.com) reputation profile, and a dark-themed monitoring dashboard.

From clone to talking to your first agent in under 5 minutes.

---

## Architecture

```
┌──────────────────────────────────────────────────────┐
│               Your Machine / VPS                     │
│                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │
│  │ Agent: Maya   │  │ Agent: Cole   │  │ Agent: N   │ │
│  │ (Restaurant)  │  │ (Realtor)     │  │ (Fitness)  │ │
│  │               │  │               │  │            │ │
│  │ SOUL.md       │  │ SOUL.md       │  │ SOUL.md    │ │
│  │ USER.md       │  │ USER.md       │  │ USER.md    │ │
│  │ HEARTBEAT.md  │  │ HEARTBEAT.md  │  │ HEARTBEAT  │ │
│  │ Skills/       │  │ Skills/       │  │ Skills/    │ │
│  │ Memory/       │  │ Memory/       │  │ Memory/    │ │
│  └───────┬───────┘  └───────┬───────┘  └──────┬─────┘ │
│          │                  │                  │       │
│  ┌───────┴──────────────────┴──────────────────┴─────┐ │
│  │               OpenClaw Gateway                     │ │
│  │          (Single process, multi-route)             │ │
│  └──────────────────────┬────────────────────────────┘ │
│                         │                              │
└─────────────────────────┼──────────────────────────────┘
                          │
           ┌──────────────┼──────────────┐
           │              │              │
      WhatsApp         Slack         Telegram
```

Each agent lives in its own workspace directory with a `SOUL.md` (identity and personality), `USER.md` (client context), `HEARTBEAT.md` (daily operational briefing), a `Skills/` folder (vertical-specific capabilities), and a `Memory/` folder (persistent learning). The OpenClaw Gateway routes messages from 20+ channels to the correct agent.

---

## Features

- **6 Industry Verticals** -- Restaurant, Real Estate, Fitness, Medical/Dental, Home Services, E-Commerce. Each comes with pre-built skills, task classifications, and communication templates.
- **Real-Time Dashboard** -- Monitor all your agents from a single dark-themed UI. Stats cards, activity feeds, area charts, 60-second live polling.
- **Message Logs** -- Browse every conversation with filters, search, and expandable message threads. See exactly what your agents are saying.
- **Performance Analytics** -- Line charts, bar charts, area charts, donut breakdowns, and monthly summaries. All powered by real session data.
- **Agent Profiles** -- View each agent's identity, vertical-aware skill breakdown, communication style, and operational status.
- **Moltbook Integration** -- Agents build public, verifiable reputation on the AI social network. Score rings, community posts, knowledge graphs.
- **Scout Prospect Discovery** -- Find businesses in any area that could benefit from an AI agent. Powered by Google Places and web research.
- **Vertical-Aware Template Engine** -- 80% template + 20% customization. Generate a fully configured agent workspace in seconds.
- **Interactive Onboarding CLI** -- `npm run onboard` walks you through creating a new agent step by step.
- **Demo Mode** -- Cinematic dashboard with animations, count-up numbers, live activity feeds, and toast notifications. Perfect for screenshots and promo videos.
- **20+ Messaging Channels** -- WhatsApp, Slack, Telegram, SMS, WebChat, and more via the OpenClaw Gateway.

---

## Quick Start

```bash
git clone https://github.com/AustinRyan/clawstaff.git
cd clawstaff
npm run setup
```

The setup script handles everything:

1. Checks that you have Node.js 22+ installed
2. Installs all dependencies
3. Walks you through API key configuration (Anthropic, optional Moltbook)
4. Installs the OpenClaw CLI and starts the Gateway
5. Creates the `~/clawstaff/agents` directory structure
6. Deploys a sample restaurant agent (Maya)
7. Opens WebChat so you can start talking to your agent immediately

After setup, start the dashboard:

```bash
npm run dev
# Open http://localhost:3000/dashboard
```

---

## Detailed Setup

### Prerequisites

| Requirement | Version | Notes |
|---|---|---|
| Node.js | 22+ | `node --version` to check |
| npm | 10+ | Comes with Node.js 22 |
| Git | Any | For cloning the repo |

### API Keys

| Key | Required | Where to get it |
|---|---|---|
| Anthropic API Key | Yes | [console.anthropic.com](https://console.anthropic.com) |
| Moltbook API Key | No | [moltbook.com/developers](https://moltbook.com) |
| Google Places API Key | No | [Google Cloud Console](https://console.cloud.google.com) (for Scout) |
| Tavily API Key | No | [tavily.com](https://tavily.com) (for Scout web research) |

### Manual Setup

If you prefer not to use the interactive `npm run setup`:

```bash
# 1. Clone and install
git clone https://github.com/AustinRyan/clawstaff.git
cd clawstaff
npm install

# 2. Configure environment
cp .env.example .env.local
# Edit .env.local with your API keys

# 3. Install OpenClaw
npm install -g openclaw

# 4. Start the Gateway
openclaw gateway start

# 5. Create the agent data directory
mkdir -p ~/clawstaff/agents

# 6. Generate your first agent workspace
npm run onboard

# 7. Start the dashboard
npm run dev
```

---

## Dashboard Overview

The dashboard is a Next.js 14 App Router application with a persistent sidebar and dark theme (`#0a0a0f` background, `#ff6b35` accent).

| Route | What It Shows |
|---|---|
| `/dashboard` | **Overview** -- Stats cards (today/week/total messages, avg response time), area chart of daily volume, live activity feed. Polls every 60 seconds. |
| `/dashboard/messages` | **Message Log** -- All conversations with channel filters, date filters, search, and expandable message threads. |
| `/dashboard/performance` | **Analytics** -- Line charts, bar charts, area charts, donut task breakdowns, and a monthly performance summary. |
| `/dashboard/agent` | **Agent Profile** -- SOUL.md-derived identity, vertical-aware skills, communication style, status indicator. |
| `/dashboard/moltbook` | **Moltbook** -- Reputation score ring, community posts, knowledge network visualization. |
| `/dashboard/scout` | **Scout** -- Search for local businesses, view enriched profiles, generate outreach suggestions. |
| `/dashboard/settings` | **Settings** -- Business info, connected channels, notification preferences. |

---

## Creating Agents

### Interactive CLI (Recommended)

```bash
npm run onboard
```

The onboarding CLI prompts you for:

- **Agent name** -- e.g., Maya, Cole, or any name you choose
- **Business name** -- e.g., "Sakura Sushi & Ramen"
- **Owner name** -- the business owner's name
- **Vertical** -- restaurant, realtor, fitness, medical, home-services, ecommerce
- **Communication style** -- warm, professional, casual, energetic

It then generates a complete workspace under `~/clawstaff/agents/<agentName>/` and registers the agent with the OpenClaw Gateway.

### Workspace Generator (Scripted)

For automated or batch deployments:

```bash
npm run generate -- --name Maya --vertical restaurant --business "Sakura Sushi" --owner "Kenji Tanaka"
```

### Manual Creation

Create a directory under your `AGENT_DATA_PATH` with the following structure:

```
~/clawstaff/agents/Maya/
├── SOUL.md          # Agent identity, personality, rules
├── USER.md          # Client/business context
├── HEARTBEAT.md     # Daily operational briefing
├── Skills/          # Vertical-specific skill files
│   ├── handle-inquiry.md
│   ├── manage-reservation.md
│   └── ...
└── Memory/          # Persistent memory (auto-generated)
    └── 2026-03-10.md
```

Then register with OpenClaw:

```bash
openclaw agents add --agent maya --workspace ~/clawstaff/agents/Maya
```

---

## Vertical Templates

ClawStaff ships with 6 production-ready vertical templates. Each includes a tailored SOUL.md, vertical-specific skills, and task classification rules.

| Vertical | Default Agent | Key Capabilities |
|---|---|---|
| **Restaurant** | Maya | Inquiries handled, reservations managed, daily summaries, menu Q&A |
| **Real Estate** | Cole | Lead follow-up, showing scheduling, pipeline management, market briefings |
| **Fitness Studio** | Alex | Membership inquiries, class booking, member re-engagement, reminders |
| **Medical / Dental** | Sophia | Appointment confirmations, no-show recovery, patient rebooking, inquiries |
| **Home Services** | Jake | Lead response, estimate follow-ups, review management, seasonal reminders |
| **E-Commerce** | Zoe | Support tickets, cart recovery, review collection, escalation handling |

Each vertical defines its own task buckets with branded colors, so the dashboard's performance charts and donut breakdowns automatically reflect the right categories for that industry.

> For creating custom verticals, see `docs/creating-verticals.md`.

---

## Customizing SOUL.md

The `SOUL.md` file is the heart of every agent. It defines who the agent is, how it communicates, and what rules it follows. A typical SOUL.md includes:

```markdown
# Agent Identity

**Name:** Maya
**Role:** Restaurant Front-of-House AI Assistant
**Business:** Sakura Sushi & Ramen

## Personality
- Warm, welcoming, knowledgeable about the menu
- Uses the owner's first name when referencing policies
- Never makes up information — defers to the owner when unsure

## Rules
- Always confirm reservation details before finalizing
- Escalate complaints about food safety immediately
- Keep responses concise — under 3 sentences for simple questions
```

The dashboard parses the `**Role:**` line to detect the agent's vertical and apply the correct task classifications automatically. This means you can change an agent's vertical simply by updating its SOUL.md.

> For a complete SOUL.md reference with all supported fields, see `docs/soul-md-reference.md`.

---

## Moltbook Integration

[Moltbook](https://moltbook.com) is a social reputation network for AI agents. When connected, your agents can:

- **Build a public reputation score** based on their work history and community engagement
- **Post to community submolts** -- general, agents, builds, todayilearned, introductions
- **Subscribe to feeds** and interact with other agents in the network
- **Display their reputation** ring, post history, and knowledge graph in the dashboard

### Connecting Moltbook

1. Get an API key from [moltbook.com](https://moltbook.com) (prefix: `moltbook_sk_`)
2. Add it to your `.env.local`:
   ```
   MOLTBOOK_API_KEY=moltbook_sk_your_key_here
   ```
3. Register your agent via the onboarding CLI or the scripts in `scripts/moltbook/`
4. Claim your agent's profile to enable posting (read-only access works without claiming)

Without a Moltbook API key, the dashboard gracefully falls back to mock data for the Moltbook page. No errors, no broken UI.

> For a full integration guide, see `docs/moltbook-guide.md`.

---

## Scout Prospect Discovery

Scout helps you find local businesses that could benefit from an AI agent. It combines Google Places data with web research to generate enriched business profiles and outreach suggestions.

### How It Works

1. **Search** -- Find businesses by type and location (e.g., "restaurants in Silver Spring, MD")
2. **Enrich** -- Scout pulls online presence data, review sentiment, and contact info for each result
3. **Discover** -- View enriched profiles and AI-generated outreach suggestions in the dashboard at `/dashboard/scout`

### Configuration

Scout uses two optional API keys:

```bash
GOOGLE_PLACES_API_KEY=your_key_here    # Business discovery via Google Places
TAVILY_API_KEY=your_key_here           # Web research enrichment
```

Both are optional. Without them, Scout operates in a limited mode with manual data entry.

> For more details, see `docs/scout-guide.md`.

---

## VPS Deployment

ClawStaff is designed to run on a single VPS alongside the OpenClaw Gateway. Recommended minimum specs: Ubuntu 22.04+, 2GB RAM, 1 vCPU.

```bash
# Production build
npm run build
npm start

# Or with a process manager
npx pm2 start npm --name clawstaff -- start
```

Key deployment considerations:

- Set `AGENT_DATA_PATH=/opt/clawstaff/agents` for a standard server layout
- Run the OpenClaw Gateway as a systemd service for reliability
- Place the Next.js dashboard behind a reverse proxy (nginx or Caddy) for HTTPS
- Use environment variables (not `.env.local`) in production

> For a complete deployment walkthrough with systemd configs and nginx examples, see `docs/deployment.md`.

---

## Demo Mode

Demo mode activates cinematic enhancements for screenshots, promo videos, and live demos. It uses pre-configured demo data with polished animations and visual effects.

### Activation

Set the environment variable before starting the dev server:

```bash
NEXT_PUBLIC_DEMO_MODE=true npm run dev
```

Or add it to your `.env.local`:

```
NEXT_PUBLIC_DEMO_MODE=true
```

### What It Enables

| Effect | Description |
|---|---|
| Stagger animations | Cards and list items animate in with Framer Motion |
| CountUp numbers | Stats count up from zero on page load |
| Live activity feed | Simulated real-time agent activity events |
| Toast notifications | Pop-up notifications for agent actions |
| Cursor glow trail | Glowing trail follows cursor movement |
| Gradient mesh | Animated gradient background effect |
| Reputation ring | Animated Moltbook score ring on the Moltbook page |

Demo mode is completely isolated. All demo components live in `src/components/demo/` and are conditionally imported. The production code path is never affected when demo mode is off.

---

## Environment Variables

Create a `.env.local` file from the provided template:

```bash
cp .env.example .env.local
```

| Variable | Required | Default | Description |
|---|---|---|---|
| `AGENT_DATA_PATH` | No | `~/clawstaff/agents` | Root directory where agent workspaces are stored |
| `OPENCLAW_GATEWAY_URL` | No | `ws://127.0.0.1:18789` | WebSocket URL for the OpenClaw Gateway |
| `MOLTBOOK_API_KEY` | No | -- | Moltbook API key for reputation integration (`moltbook_sk_...`) |
| `GOOGLE_PLACES_API_KEY` | No | -- | Google Places API key for Scout prospect discovery |
| `TAVILY_API_KEY` | No | -- | Tavily API key for Scout web research enrichment |
| `NEXT_PUBLIC_DEMO_MODE` | No | `false` | Set to `"true"` to activate cinematic demo mode |
| `NEXT_PUBLIC_APP_URL` | No | `http://localhost:3000` | Public URL of the dashboard application |

---

## Project Structure

```
clawstaff/
├── src/
│   ├── app/
│   │   ├── page.tsx                    # Landing page
│   │   ├── layout.tsx                  # Root layout (fonts, theme)
│   │   ├── dashboard/
│   │   │   ├── layout.tsx              # Dashboard shell (sidebar)
│   │   │   ├── page.tsx                # Overview with live polling
│   │   │   ├── messages/page.tsx       # Conversation log
│   │   │   ├── performance/page.tsx    # Analytics charts
│   │   │   ├── agent/page.tsx          # Agent identity & skills
│   │   │   ├── moltbook/page.tsx       # Moltbook reputation
│   │   │   ├── scout/page.tsx          # Prospect discovery
│   │   │   └── settings/page.tsx       # Configuration
│   │   └── api/
│   │       ├── agent/[agentId]/
│   │       │   ├── stats/route.ts      # Agent stats endpoint
│   │       │   └── messages/route.ts   # Paginated messages endpoint
│   │       └── moltbook/route.ts       # Moltbook API proxy
│   ├── components/
│   │   ├── sidebar.tsx                 # Dashboard sidebar navigation
│   │   ├── demo-banner.tsx             # "Showing demo data" indicator
│   │   └── demo/                       # Demo mode components (isolated)
│   │       ├── motion-card.tsx         # Animated card wrapper
│   │       ├── count-up.tsx            # Number count-up animation
│   │       ├── cursor-trail.tsx        # Cursor glow effect
│   │       ├── gradient-mesh.tsx       # Background gradient
│   │       ├── live-activity-feed.tsx  # Simulated activity stream
│   │       ├── toast-notifications.tsx # Pop-up notifications
│   │       ├── animated-reputation-ring.tsx
│   │       ├── demo-wrapper.tsx        # Global demo effects wrapper
│   │       ├── demo-data.ts           # Pre-configured demo dataset
│   │       └── index.ts               # Barrel export
│   └── lib/
│       ├── agent-data/
│       │   ├── index.ts                # Data layer entry point
│       │   ├── parser.ts               # Filesystem parser (SOUL.md, JSONL)
│       │   ├── types.ts                # Types + VERTICAL_TASKS definitions
│       │   ├── hooks.ts                # useAgentStats, useAgentMessages
│       │   └── mock-data.ts            # Fallback data for demo/empty state
│       ├── moltbook/
│       │   ├── client.ts               # Moltbook API client
│       │   ├── heartbeat.ts            # Heartbeat posting
│       │   ├── reputation.ts           # Score calculations
│       │   ├── knowledge.ts            # Knowledge graph
│       │   └── content.ts              # Content generation
│       ├── scout/
│       │   ├── discovery.ts            # Google Places integration
│       │   └── outreach.ts             # Outreach template generation
│       └── demo-mode.ts                # isDemoMode() utility
├── scripts/
│   ├── onboard.ts                      # Interactive agent creation CLI
│   ├── generate-workspace.ts           # Programmatic workspace generator
│   ├── local/                          # Local development helpers
│   ├── moltbook/                       # Moltbook management scripts
│   └── deploy/                         # Deployment automation
├── workspaces/                         # Generated agent workspace templates
├── docs/                               # Guides and references
│   ├── TROUBLESHOOTING.md
│   ├── moltbook-api-notes.md
│   └── ...
├── tailwind.config.ts                  # Custom theme (colors, fonts)
├── .env.example                        # Environment variable template
└── package.json
```

---

## Contributing

Contributions are welcome. Whether it is a new vertical template, a dashboard feature, a bug fix, or documentation improvement -- every contribution helps make AI agents more accessible to local businesses.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Make your changes
4. Run `npm run build` to verify everything compiles cleanly
5. Commit with a clear, descriptive message
6. Open a Pull Request

Some areas where contributions are especially valuable:

- **New verticals** -- Legal, accounting, education, hospitality, and more
- **Channel integrations** -- New messaging platform connectors
- **Dashboard visualizations** -- Charts, graphs, and data views
- **Internationalization** -- Multi-language support for agent templates
- **Testing** -- Unit tests, integration tests, E2E tests

> For detailed contribution guidelines, see `CONTRIBUTING.md`.

---

## License

[MIT License](LICENSE)

You are free to use, modify, and distribute ClawStaff for any purpose. See the LICENSE file for full terms.

---

<p align="center">
  Built with <a href="https://openclaw.com">OpenClaw</a>&ensp;&middot;&ensp;Dashboard powered by <a href="https://nextjs.org">Next.js 14</a>&ensp;&middot;&ensp;Reputation via <a href="https://moltbook.com">Moltbook</a>
</p>
