# ClawStaff Deployment Scripts

Scripts for provisioning, managing, and removing OpenClaw agents on the VPS.

## Prerequisites

On the VPS (Ubuntu):

- **Node.js 22+** — agent runtime requirement
- **OpenClaw** installed and configured (`openclaw` binary in PATH)
- **clawhub CLI** — for installing skill packs (`clawhub install <slug>`)
- **python3** — used for safe JSON manipulation in scripts
- **curl** — used for Gateway health checks
- **systemd** — Gateway runs as `openclaw-gateway` service
- **`openclaw` user** — dedicated system user for file ownership isolation

### VPS Directory Structure

```
/opt/clawstaff/
  agents/           # Each agent gets an isolated subdirectory
    maya/           # Agent workspace (SOUL.md, memory/, openclaw.json, etc.)
    cole/
  gateway/
    openclaw.json   # Master Gateway config with routes array
  backups/          # Timestamped .tar.gz archives per agent
    maya/
    cole/
  logs/
    provisioning.log
```

## Workflow

### 1. Generate the workspace locally

Run the onboarding CLI on your local machine to generate workspace files:

```bash
npx tsx scripts/onboard.ts
```

This creates a workspace at `workspaces/{agent_name}/` with SOUL.md, USER.md, HEARTBEAT.md, etc.

### 2. Copy workspace to VPS

```bash
scp -r workspaces/maya user@vps:/tmp/maya-workspace
```

### 3. Provision the agent on the VPS

SSH into the VPS and run:

```bash
sudo ./scripts/deploy/provision-agent.sh maya /tmp/maya-workspace client_abc123
```

This will:
- Create `/opt/clawstaff/agents/maya/`
- Copy workspace files
- Initialize the memory directory
- Generate `openclaw.json` for the agent
- Install the vertical-specific skill stack via clawhub
- Register the route in the Gateway config
- Reload the Gateway
- Run a health check

### 4. Add channel credentials

Edit the agent's config to add WhatsApp/Slack/etc. credentials:

```bash
nano /opt/clawstaff/agents/maya/openclaw.json
```

Then reload the Gateway:

```bash
sudo systemctl reload openclaw-gateway
```

### 5. Verify

```bash
./scripts/deploy/health-check.sh maya    # single agent
./scripts/deploy/health-check.sh         # all agents
```

## Scripts

| Script | Purpose |
|--------|---------|
| `provision-agent.sh` | Deploy a new agent from a generated workspace |
| `teardown-agent.sh` | Archive and remove an agent |
| `health-check.sh` | Check agent status (single or all) |
| `backup-agent.sh` | Create a timestamped backup of an agent |

### provision-agent.sh

```bash
sudo ./provision-agent.sh <agent_name> <workspace_path> <client_id>
```

### teardown-agent.sh

```bash
sudo ./teardown-agent.sh <agent_name>              # backup + remove
sudo ./teardown-agent.sh <agent_name> --no-backup   # remove without backup
```

### health-check.sh

```bash
./health-check.sh <agent_name>   # check one agent
./health-check.sh                # check all agents
```

Checks: directory exists, SOUL.md present, openclaw.json present, Gateway route responding.

### backup-agent.sh

```bash
sudo ./backup-agent.sh <agent_name>
```

Creates a `.tar.gz` at `/opt/clawstaff/backups/{agent_name}/`. Automatically prunes backups older than the 10 most recent.

## Cron: Automated Backups

Add to root's crontab to back up all agents nightly:

```cron
0 3 * * * for agent in /opt/clawstaff/agents/*/; do /opt/clawstaff/scripts/deploy/backup-agent.sh "$(basename "$agent")"; done
```

## Troubleshooting

**Gateway not responding after provision:**
```bash
sudo systemctl status openclaw-gateway
sudo journalctl -u openclaw-gateway --since "5 minutes ago"
```

**Skills failed to install:**
```bash
clawhub install <slug> --workspace /opt/clawstaff/agents/<name>
```

**Agent route not registered:**
Check the Gateway config directly:
```bash
python3 -c "import json; print(json.dumps(json.load(open('/opt/clawstaff/gateway/openclaw.json'))['routes'], indent=2))"
```
