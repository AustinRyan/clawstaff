# TOOLS.md — Scout's Environment & Tool Configuration

## VPS Environment

- **OS:** Ubuntu 22.04 LTS
- **Runtime:** OpenClaw Gateway (single process, multi-route)
- **Scout workspace path:** /home/clawstaff/workspaces/scout/
- **Memory path:** /home/clawstaff/workspaces/scout/memory/
- **Node.js:** v20 LTS
- **Python:** 3.11+ (for any scraping utilities)

## Required API Keys

The following API keys must be configured in Scout's openclaw.json before deployment:

| Key | Purpose | Where to Get It |
|-----|---------|-----------------|
| `ANTHROPIC_API_KEY` | LLM calls (Claude Opus for reasoning) | console.anthropic.com |
| `TAVILY_API_KEY` | Web search for prospect research | tavily.com |
| `GOOGLE_API_KEY` | Google Maps / Places API for discovery | console.cloud.google.com |
| `GMAIL_CREDENTIALS` | Sending outreach emails via GOG skill | Google OAuth2 setup |
| `WHATSAPP_SESSION` | Sending alerts/summaries to Austin | OpenClaw WhatsApp channel config |

## Installed Skills

Scout's skill stack (install via `clawhub install <slug>`):

1. **agent-browser** — Headless browser for Google Maps scraping, website research, social media checks, reading reviews
2. **tavily** — Web search API for deep prospect research (finding owner names, contact info, business details)
3. **gog** — Gmail + Google Sheets integration. Gmail for sending outreach emails. Sheets for pipeline tracking spreadsheet (optional, memory system is primary)
4. **whatsapp** — Sending daily summaries and hot lead alerts to Austin
5. **cron** — Scheduling the daily discovery, qualification, outreach, and follow-up cadence
6. **summarize** — Condensing research into concise prospect dossiers
7. **memory-search** — Vector + SQLite FTS5 hybrid search across all stored prospect data

## Outreach Channel Configuration

### Email (Primary)
- Send from: a ClawStaff business email (e.g., scout@clawstaff.ai or austin@clawstaff.ai)
- Include CAN-SPAM compliant footer in every email
- Rate limit: max 10 emails per day, max 3 per hour
- Track: delivery, opens (if available), replies

### Instagram DM (Secondary)
- Use agent-browser to send DMs from the ClawStaff Instagram account
- Only DM accounts with <10K followers (owner likely manages it)
- Keep messages short — Instagram DMs that look like essays get ignored
- Rate limit: max 5 DMs per day

### Facebook Page Message (Tertiary)
- Use agent-browser to message business Facebook pages
- Only message pages that appear actively managed (posted in last 30 days)
- Rate limit: max 5 messages per day

### Contact Form (Last Resort)
- Use agent-browser to fill out website contact forms
- Only use when no other channel is available
- Keep message concise — contact forms often have character limits

## File Structure

```
workspaces/scout/
  SOUL.md                          # This identity file
  HEARTBEAT.md                     # Proactive task schedule
  USER.md                          # Austin's info
  TOOLS.md                         # This file
  AGENTS.md                        # Startup procedures
  openclaw.json                    # Runtime config (API keys, channels)
  prospect-scoring-rubric.md       # Qualification framework
  outreach-templates/              # Message frameworks per vertical
  memory/
    MEMORY.md                      # Long-term curated memory
    SESSION-STATE.md               # Active pipeline and hot context
    RECENT_CONTEXT.md              # Auto-updated highlights
    YYYY-MM-DD.md                  # Daily logs
```

