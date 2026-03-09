# ClawStaff Troubleshooting Guide

## Gateway Won't Start

### Port 18789 already in use

```bash
# Find what's using the port
lsof -i :18789

# Kill the process (replace PID)
kill <PID>

# Force start (kills existing listener automatically)
openclaw gateway --force
```

### Gateway service not installed

On macOS, the Gateway runs as a LaunchAgent:

```bash
# Install the service
openclaw gateway install

# Start it
openclaw gateway start

# Check status
openclaw gateway status
```

### Node.js version too old

OpenClaw requires Node.js 22+.

```bash
node -v

# Upgrade via nvm
nvm install 22
nvm use 22
nvm alias default 22
```

### "openclaw: command not found"

```bash
npm install -g openclaw

# If using nvm, ensure correct Node version first
nvm use 22
npm install -g openclaw
which openclaw
```

### Gateway starts then immediately exits

```bash
# Check service status
openclaw gateway status

# Check logs
openclaw logs

# Or directly
tail -50 ~/.openclaw/logs/gateway.log

# Validate config
python3 -m json.tool ~/.openclaw/openclaw.json

# Run diagnostics
openclaw doctor
```

### Config validation errors

If you see "Config invalid" errors:

```bash
# Auto-fix common issues
openclaw doctor --fix

# Or manually validate
python3 -m json.tool ~/.openclaw/openclaw.json
```

Common config issues:
- `models.providers.<name>` requires `baseUrl` (string) and `models` (array), even for Anthropic
- Missing required fields after manual JSON edits

---

## Agent Not Responding

### Agent not registered

```bash
# List registered agents
openclaw agents list

# Register an agent
openclaw agents add testmaya --workspace ~/clawstaff/agents/testmaya --non-interactive
```

### API key not configured

```bash
# Check model/auth status for an agent
openclaw models status --agent testmaya

# Anthropic API key goes in ~/.openclaw/openclaw.json under models.providers:
```

```json
{
  "models": {
    "providers": {
      "anthropic": {
        "baseUrl": "https://api.anthropic.com",
        "apiKey": "sk-ant-YOUR-KEY-HERE",
        "models": [{
          "id": "claude-sonnet-4-5",
          "name": "Claude Sonnet 4.5",
          "reasoning": false,
          "input": ["text"],
          "cost": {"input": 3, "output": 15, "cacheRead": 0.3, "cacheWrite": 3.75},
          "contextWindow": 200000,
          "maxTokens": 8192
        }]
      }
    }
  }
}
```

To test your API key directly:

```bash
curl -s https://api.anthropic.com/v1/messages \
  -H "x-api-key: YOUR_KEY_HERE" \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d '{"model":"claude-sonnet-4-5","max_tokens":10,"messages":[{"role":"user","content":"hi"}]}' \
  | python3 -m json.tool
```

### Session file locked

If you see "session file locked" errors, a previous agent run left a stale lock:

```bash
# Find and remove lock files
rm -f ~/.openclaw/agents/testmaya/sessions/*.lock

# Then retry
openclaw agent --agent testmaya --message "test"
```

### Model doesn't support tools

Some local models (e.g., gemma3) don't support tool/function calling, which OpenClaw's ReAct agent loop requires. Use a model that supports tools:

- **Anthropic:** claude-sonnet-4-5, claude-haiku-4-5 (recommended)
- **Ollama local:** llama3.1:8b (supports tools, but slow with large SOUL.md)
- **OpenAI:** gpt-4o, gpt-4o-mini

Set the model per-agent:

```bash
openclaw models set --agent testmaya "anthropic/claude-sonnet-4-5"
```

### Agent times out with local models

Local models (Ollama) can time out if the SOUL.md + agent context is too large for the model size. Solutions:

1. **Use Anthropic API** (recommended) — handles large context easily
2. **Use a larger local model** — qwen2.5:32b or llama3.3:70b
3. **Trim the SOUL.md** — remove Moltbook section for testing
4. **Increase timeout** — `openclaw agent --timeout 600 ...`

---

## High Token Costs

### Use a cheaper model for heartbeat

The heartbeat runs every 30 minutes. Use a cheaper model:

In `~/.openclaw/openclaw.json`, set per-agent heartbeat model:

```json
{
  "agents": {
    "list": [{
      "id": "testmaya",
      "heartbeat": {
        "model": { "primary": "anthropic/claude-haiku-4-5" }
      }
    }]
  }
}
```

### Disable heartbeat during testing

Set heartbeat target to "none" in the config:

```json
{
  "agents": {
    "defaults": {
      "heartbeat": {
        "target": "none"
      }
    }
  }
}
```

Or per-agent in your HEARTBEAT.md, remove the task list.

### Monitor token usage

```bash
# Check usage costs from session logs
openclaw gateway usage-cost
```

---

## Memory Files Not Being Written

### Check directory permissions

```bash
# Verify the memory directory exists and is writable
ls -la ~/clawstaff/agents/testmaya/memory/

# Test write access
touch ~/clawstaff/agents/testmaya/memory/test-write
rm ~/clawstaff/agents/testmaya/memory/test-write
```

### Workspace path mismatch

Verify the agent's registered workspace matches the actual directory:

```bash
# Check what workspace is configured
openclaw agents list

# Compare with actual files
ls ~/clawstaff/agents/testmaya/SOUL.md
```

---

## Checking Gateway Logs

```bash
# Stream logs in real time
openclaw logs

# Or read the log file directly
tail -f ~/.openclaw/logs/gateway.log

# Search for errors
grep -i "error\|fail" ~/.openclaw/logs/gateway.log | tail -20

# Search for a specific agent
grep "testmaya" ~/.openclaw/logs/gateway.log | tail -20
```

---

## Restarting the Gateway After Config Changes

Any time you modify `~/.openclaw/openclaw.json` or an agent's workspace, restart:

```bash
# Preferred: restart the service
openclaw gateway restart

# Check it came back
openclaw health

# If restart fails, try stop + start
openclaw gateway stop
sleep 2
openclaw gateway start

# Nuclear option: force kill + start
openclaw gateway --force
```

---

## Running Diagnostics

OpenClaw has a built-in doctor:

```bash
# Run health checks
openclaw doctor

# Auto-fix common issues
openclaw doctor --fix

# Check specific agent
openclaw models status --agent testmaya

# Full Gateway probe
openclaw gateway probe
```

---

## Common Errors Quick Reference

| Error | Cause | Fix |
|-------|-------|-----|
| `EADDRINUSE :18789` | Port taken | `openclaw gateway --force` |
| `session file locked` | Stale lock from crashed run | `rm ~/.openclaw/agents/*/sessions/*.lock` |
| `No API key found` | Auth not configured | Add apiKey to `models.providers` in config |
| `does not support tools` | Wrong model for agents | Use claude-sonnet-4-5 or llama3.1 |
| `This operation was aborted` | Timeout (model too slow) | Use faster model or increase `--timeout` |
| `Config invalid` | Bad JSON in config | `openclaw doctor --fix` |
| `Service not installed` | LaunchAgent missing | `openclaw gateway install` |
