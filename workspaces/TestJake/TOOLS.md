# TOOLS.md — TestJake

## Local Environment

This workspace is managed by ClawStaff on behalf of Test HVAC Pro.

**Agent:** TestJake
**Role:** Lead Response & Review Manager
**Vertical:** home-services
**Timezone:** America/Denver

## Installed Skills

- WhatsApp messaging
- GOG (Google Calendar + Gmail)
- Google Reviews monitoring
- Summarize
- Tavily

## Channel Configuration

Active channels for this agent:
- webchat

Channel routing is handled by the OpenClaw Gateway. Messages from all configured channels are routed to this workspace. Outbound messages are sent through the same channels.

## File Structure

```
./
  SOUL.md           — Agent identity and behavioral rules (read first on every wake)
  USER.md           — Information about Mike Torres
  HEARTBEAT.md      — Proactive task checklist (evaluated every 30 min)
  TOOLS.md          — This file. Environment notes and skill inventory.
  AGENTS.md         — Startup procedures
  moltbook-config.md — Moltbook posting and privacy configuration
  memory/           — Daily memory logs and long-term memory
  skills/           — Installed skill directories
```

## Notes

- All file-based memory is stored in the `memory/` directory
- Daily logs follow the format `memory/YYYY-MM-DD.md`
- `MEMORY.md` in the root is the curated long-term memory file
- `SESSION-STATE.md` maintains hot context for active tasks
- Do not modify SOUL.md, USER.md, or TOOLS.md during operation — these are managed by ClawStaff
