# VPS Deployment Guide

This guide covers deploying ClawStaff and OpenClaw on a VPS for 24/7 operation. By the end, you will have agents running continuously, handling customer messages around the clock.

## Prerequisites

- Ubuntu 22.04 or 24.04 VPS (DigitalOcean or Hetzner recommended, $6-12/mo)
- Node.js 22 or later
- OpenClaw installed globally (`npm install -g openclaw`)
- SSH access to the VPS
- A domain name (optional but recommended for the dashboard)

## Step 1: Set Up the VPS

### Provision the Server

For a small deployment (1-6 agents), a basic VPS works well:

| Provider | Plan | RAM | Cost |
|----------|------|-----|------|
| DigitalOcean | Basic Droplet | 2 GB | $12/mo |
| Hetzner | CX22 | 4 GB | $6/mo |

After provisioning, update the system and install dependencies:

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git build-essential

# Install Node.js 22
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

# Verify
node --version   # v22.x.x
npm --version    # 10.x.x
```

### Create a Dedicated User

```bash
sudo adduser clawstaff --disabled-password
sudo usermod -aG sudo clawstaff
su - clawstaff
```

## Step 2: Install OpenClaw and the Gateway

```bash
npm install -g openclaw

# Verify installation
openclaw --version

# Initialize configuration
openclaw init
```

### Configure the Gateway as a systemd Service

Create the service file:

```bash
sudo tee /etc/systemd/system/openclaw-gateway.service > /dev/null << 'EOF'
[Unit]
Description=OpenClaw Gateway
After=network.target

[Service]
Type=simple
User=clawstaff
WorkingDirectory=/home/clawstaff
ExecStart=/usr/bin/openclaw gateway start --foreground
Restart=always
RestartSec=5
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF
```

Enable and start the service:

```bash
sudo systemctl daemon-reload
sudo systemctl enable openclaw-gateway
sudo systemctl start openclaw-gateway
sudo systemctl status openclaw-gateway
```

The Gateway will now start automatically on boot and restart if it crashes.

### Verify the Gateway

```bash
# Check it's running
openclaw gateway status

# Should show: ws://127.0.0.1:18789
```

## Step 3: Create the Agent Data Directory

```bash
sudo mkdir -p /opt/clawstaff/agents
sudo chown -R clawstaff:clawstaff /opt/clawstaff
```

This is where all agent workspaces will live in production. The directory structure:

```
/opt/clawstaff/
  agents/
    agent-001/
      SOUL.md
      USER.md
      HEARTBEAT.md
      TOOLS.md
      AGENTS.md
      moltbook-config.md
      memory/
        2026-03-09.md
        2026-03-10.md
        MEMORY.md
    agent-002/
      ...
```

## Step 4: Deploy Agent Workspaces

### Option A: Generate on the Server

Copy your client config JSON to the server and run the workspace generator:

```bash
cd /opt/clawstaff
npx tsx /path/to/scripts/generate-workspace.ts client-config.json
```

### Option B: Generate Locally, rsync to Server

Generate workspaces on your local machine, then sync:

```bash
# On your local machine
npx tsx scripts/generate-workspace.ts config.json

# Sync to VPS
rsync -avz ~/clawstaff/agents/agent-001/ clawstaff@your-vps:/opt/clawstaff/agents/agent-001/
```

## Step 5: Configure Gateway Routing

Register each agent with the Gateway:

```bash
openclaw agents add --agent agent-001 --dir /opt/clawstaff/agents/agent-001
openclaw agents add --agent agent-002 --dir /opt/clawstaff/agents/agent-002
```

Verify all agents are registered:

```bash
openclaw agents list
```

Test each agent with a sample message:

```bash
openclaw agent --agent agent-001 --message "Hi, I'd like to make a reservation for Friday at 7 PM"
```

## Step 6: Set Up Messaging Channels

Each agent needs at least one messaging channel configured. The specific setup depends on the channel:

### WhatsApp (via WhatsApp Business API)

1. Set up a WhatsApp Business API account
2. Configure the webhook URL to point to your Gateway
3. Map the WhatsApp number to the specific agent ID in the Gateway config

### Slack

1. Create a Slack app with the appropriate scopes
2. Configure the event subscription URL to point to your Gateway
3. Map the Slack channel/workspace to the agent ID

### SMS (via Twilio or similar)

1. Configure a Twilio number
2. Set the webhook URL for incoming messages to your Gateway
3. Map the phone number to the agent ID

### Email

1. Configure email forwarding or IMAP polling
2. Map the email address to the agent ID

Refer to the OpenClaw channel documentation for detailed setup instructions for each provider.

## Step 7: Deploy the Dashboard

### Option A: Deploy to Vercel (Recommended)

The dashboard is a standard Next.js app and deploys to Vercel with zero configuration:

```bash
# Install Vercel CLI
npm install -g vercel

# From the ClawStaff project root
vercel
```

Set the following environment variables in the Vercel dashboard:

```
AGENT_DATA_PATH=/opt/clawstaff/agents
OPENCLAW_GATEWAY_URL=ws://your-vps-ip:18789
ENVIRONMENT=production
```

Note: When the dashboard runs on Vercel but agent data lives on a VPS, you will need the Tailscale integration (see Security section) or a remote API layer to bridge the two.

### Option B: Self-Host on the Same VPS

```bash
cd /opt/clawstaff/dashboard
git clone https://github.com/your-repo/clawstaff.git .
npm install
npm run build

# Run with PM2
npm install -g pm2
pm2 start npm --name "clawstaff-dashboard" -- start
pm2 save
pm2 startup
```

## Environment Variables for Production

Create `/opt/clawstaff/.env.production`:

```bash
# Core
AGENT_DATA_PATH=/opt/clawstaff/agents
OPENCLAW_GATEWAY_URL=ws://localhost:18789
ENVIRONMENT=production

# Moltbook (optional)
MOLTBOOK_API_KEY=moltbook_sk_...

# Scout (optional)
GOOGLE_PLACES_API_KEY=...
TAVILY_API_KEY=...

# LLM API Keys (required -- the model provider for your agents)
ANTHROPIC_API_KEY=sk-ant-...
```

## Security

### Tailscale for Remote Access

Tailscale provides a zero-config VPN mesh that makes it safe to access your VPS without exposing ports to the internet:

```bash
# Install Tailscale on the VPS
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up

# Install Tailscale on your local machine
# Access the VPS via its Tailscale IP (e.g., 100.x.y.z)
```

With Tailscale, you can:

- SSH into the VPS without exposing port 22 to the internet
- Access the dashboard on the VPS via `http://100.x.y.z:3000` (Tailscale IP)
- Connect the Vercel-hosted dashboard to the VPS data layer securely

### Firewall Configuration

Lock down the VPS to only accept traffic from Tailscale:

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow Tailscale
sudo ufw allow in on tailscale0

# Allow SSH only from Tailscale (optional: also allow from your IP)
sudo ufw allow in on tailscale0 to any port 22

# Enable
sudo ufw enable
sudo ufw status
```

### fail2ban

Protect SSH from brute force attacks:

```bash
sudo apt install -y fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

The default configuration bans IPs after 5 failed SSH attempts for 10 minutes.

## Monitoring

### Health Checks

Create a health check script at `/opt/clawstaff/scripts/healthcheck.sh`:

```bash
#!/bin/bash
set -e

# Check Gateway
if ! openclaw gateway status > /dev/null 2>&1; then
  echo "ALERT: OpenClaw Gateway is down"
  sudo systemctl restart openclaw-gateway
fi

# Check each agent
for agent_dir in /opt/clawstaff/agents/*/; do
  agent_id=$(basename "$agent_dir")
  heartbeat="$agent_dir/HEARTBEAT.md"

  if [ -f "$heartbeat" ]; then
    last_modified=$(stat -c %Y "$heartbeat" 2>/dev/null || stat -f %m "$heartbeat")
    now=$(date +%s)
    age=$(( now - last_modified ))

    # Alert if heartbeat is older than 2 hours (7200 seconds)
    if [ $age -gt 7200 ]; then
      echo "WARNING: Agent $agent_id heartbeat is ${age}s old"
    fi
  fi
done

# Check disk space
usage=$(df /opt/clawstaff --output=pcent | tail -1 | tr -d ' %')
if [ "$usage" -gt 85 ]; then
  echo "WARNING: Disk usage at ${usage}%"
fi
```

Schedule it with cron:

```bash
chmod +x /opt/clawstaff/scripts/healthcheck.sh

# Run every 15 minutes
crontab -e
# Add: */15 * * * * /opt/clawstaff/scripts/healthcheck.sh >> /var/log/clawstaff-health.log 2>&1
```

### API Key Validation

Periodically validate that your LLM API keys and other external service keys are still working:

```bash
# Test Anthropic API key
curl -s -o /dev/null -w "%{http_code}" \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  https://api.anthropic.com/v1/models

# Test Moltbook API key
curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer $MOLTBOOK_API_KEY" \
  https://www.moltbook.com/api/v1/agents/me
```

## Backups

### Automated Daily Backups

Create a backup script at `/opt/clawstaff/scripts/backup.sh`:

```bash
#!/bin/bash
set -e

BACKUP_DIR="/opt/clawstaff/backups"
DATE=$(date +%Y-%m-%d)
RETENTION_DAYS=30

mkdir -p "$BACKUP_DIR"

# Backup agent workspaces and memory
tar -czf "$BACKUP_DIR/agents-$DATE.tar.gz" -C /opt/clawstaff agents/

# Backup OpenClaw sessions
tar -czf "$BACKUP_DIR/sessions-$DATE.tar.gz" -C /home/clawstaff/.openclaw agents/

# Backup OpenClaw config
cp /home/clawstaff/.openclaw/openclaw.json "$BACKUP_DIR/openclaw-config-$DATE.json"

# Clean up old backups
find "$BACKUP_DIR" -name "*.tar.gz" -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR" -name "*.json" -mtime +$RETENTION_DAYS -delete

echo "Backup complete: $DATE"
```

Schedule daily at 3 AM:

```bash
chmod +x /opt/clawstaff/scripts/backup.sh

crontab -e
# Add: 0 3 * * * /opt/clawstaff/scripts/backup.sh >> /var/log/clawstaff-backup.log 2>&1
```

### Off-Site Backups (Recommended)

For additional safety, sync backups to an off-site location:

```bash
# Sync to a remote server or S3-compatible storage
rsync -avz /opt/clawstaff/backups/ backup-server:/backups/clawstaff/

# Or use rclone for cloud storage
rclone sync /opt/clawstaff/backups/ remote:clawstaff-backups/
```

## Cost Estimate

Monthly operating costs per agent:

| Component | Cost |
|-----------|------|
| LLM API tokens (Anthropic Claude) | $15-40/mo depending on volume |
| VPS fraction (shared across agents) | $2-6/mo |
| WhatsApp Business API | $0-15/mo depending on message volume |
| Moltbook API | Free |
| Scout API costs | $0-5/mo (optional, capped at $5/day) |

**Estimated total: $20-60/mo per agent**, with the primary variable being LLM token usage. High-volume agents (restaurants, e-commerce) will be at the higher end. Lower-volume agents (medical, realtor) will be at the lower end.

Running multiple agents on the same VPS amortizes the server cost. A $12/mo VPS can comfortably run 6-10 agents.

## Troubleshooting

### Gateway Won't Start

```bash
# Check logs
sudo journalctl -u openclaw-gateway -f

# Common fix: clear stale lock files
rm ~/.openclaw/agents/*/sessions/*.lock

# Restart
sudo systemctl restart openclaw-gateway
```

### Agent Not Responding

```bash
# Check if the agent is registered
openclaw agents list

# Test with a direct message
openclaw agent --agent <id> --message "test"

# Check agent workspace exists
ls -la /opt/clawstaff/agents/<agent-id>/

# Check for SOUL.md
cat /opt/clawstaff/agents/<agent-id>/SOUL.md | head -20
```

### Disk Space Issues

Agent memory files and session JSONL files grow over time. Monitor disk usage and archive old data:

```bash
# Check disk usage by agent
du -sh /opt/clawstaff/agents/*/
du -sh ~/.openclaw/agents/*/sessions/

# Archive old sessions (keep last 30 days)
find ~/.openclaw/agents/*/sessions/ -name "*.jsonl" -mtime +30 -exec gzip {} \;
```

### High Memory Usage

If the VPS runs low on memory:

```bash
# Check memory per process
ps aux --sort=-%mem | head -20

# Add swap if not present
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

For additional troubleshooting guidance, see `docs/TROUBLESHOOTING.md`.
