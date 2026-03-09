# WhatsApp Channel Setup

## How It Works

OpenClaw has a built-in WhatsApp channel powered by Baileys (whatsapp-web.js). You scan a QR code once, and the Gateway maintains the connection. No separate Baileys install needed.

**Local testing (what we use now):** QR code pairing via `openclaw channels login`. Free, instant, uses your personal WhatsApp number. The Mac Mini keeps the Gateway running 24/7 so the session stays alive.

**Production later:** WhatsApp Business API via Meta Cloud API. Requires Meta Business verification, a dedicated business phone number, and message template approval. Supports higher throughput and official business features. Not needed until you have paying clients.

## Prerequisites

- OpenClaw Gateway installed and running (`openclaw gateway status`)
- At least one agent deployed (`openclaw agents list`)
- A phone with WhatsApp installed (for QR scanning)

## Step 1: Link WhatsApp

If WhatsApp is not yet linked:

```bash
openclaw channels login --channel whatsapp --verbose
```

A QR code appears in terminal. Scan it with WhatsApp:
- Open WhatsApp on your phone
- Settings > Linked Devices > Link a Device
- Point camera at the terminal QR code

The Gateway now owns the WhatsApp socket and handles reconnection automatically.

Verify the link:

```bash
openclaw channels status --probe
# Should show: WhatsApp default: enabled, configured, linked, running, connected
```

Check your connected identity:

```bash
openclaw directory self --channel whatsapp
```

## Step 2: Configure Access Control

WhatsApp DM policy controls who can message your agents. In `~/.openclaw/openclaw.json`:

```json5
{
  "channels": {
    "whatsapp": {
      "enabled": true,
      "dmPolicy": "pairing",     // "pairing" | "allowlist" | "open" | "disabled"
      "allowFrom": ["+14107397341"],
      "groupPolicy": "allowlist",
      "mediaMaxMb": 50
    }
  }
}
```

**DM Policies:**

| Policy | Behavior |
|--------|----------|
| `pairing` (default) | Unknown senders get a pairing code prompt. You approve via `openclaw pairing approve whatsapp <CODE>`. Pairings persist. |
| `allowlist` | Only numbers in `allowFrom` can message. Silent drop for everyone else. |
| `open` | Anyone can message (requires `"*"` in `allowFrom`). Not recommended. |
| `disabled` | All DMs blocked. |

For local testing, `pairing` is ideal — you approve yourself once and it persists.

## Step 3: Route Messages to an Agent

By default, all WhatsApp messages go to the `main` agent. To route a specific phone number to a specific agent, add a peer binding:

```bash
# Route your phone to testmaya
./scripts/local/connect-whatsapp.sh testmaya +14107397341
```

Or manually in `~/.openclaw/openclaw.json`:

```json5
{
  "bindings": [
    // Peer-specific binding (highest priority — evaluated first)
    {
      "agentId": "testmaya",
      "match": {
        "channel": "whatsapp",
        "peer": { "kind": "direct", "id": "+14107397341" }
      }
    },
    // Fallback for all other WhatsApp messages
    {
      "agentId": "main",
      "match": {
        "channel": "whatsapp",
        "accountId": "default"
      }
    }
  ]
}
```

**Binding priority (most-specific wins):**
1. `peer` match (exact phone number) — highest
2. `accountId` match
3. Channel-level match
4. Default agent — lowest

After editing config, restart the Gateway:

```bash
openclaw gateway restart
```

## Step 4: Test the Connection

Send a WhatsApp message from your phone to yourself (yes, to your own number). The Gateway intercepts it and routes to the bound agent.

Or send a test message from CLI:

```bash
openclaw message send --channel whatsapp --target +14107397341 -m "Test from CLI"
```

Check that messages appear in the dashboard:

```bash
curl -s http://localhost:3000/api/agent/testmaya/messages | python3 -m json.tool | head -20
```

## Multi-Client Routing (Production)

For real clients, each gets a peer binding routing their phone number to their dedicated agent:

```json5
{
  "bindings": [
    {
      "agentId": "maya-restaurant",
      "match": {
        "channel": "whatsapp",
        "peer": { "kind": "direct", "id": "+15551230001" }
      }
    },
    {
      "agentId": "cole-realty",
      "match": {
        "channel": "whatsapp",
        "peer": { "kind": "direct", "id": "+15551230002" }
      }
    },
    // Fallback
    {
      "agentId": "main",
      "match": { "channel": "whatsapp" }
    }
  ]
}
```

**Note:** All replies come from the same WhatsApp number (the one you linked). There's no per-agent sender identity with Baileys. For true per-client phone numbers, you'd need the WhatsApp Business API with multiple numbers.

## Troubleshooting

**QR code expired:** Re-run `openclaw channels login --channel whatsapp`.

**Session disconnected:** The Gateway auto-reconnects. If persistent, re-link:
```bash
openclaw channels logout --channel whatsapp
openclaw channels login --channel whatsapp
```

**Messages not routing:** Check bindings and allowFrom:
```bash
openclaw agents bindings --json
openclaw channels status --probe
```

**Pairing needed:** If using `dmPolicy: "pairing"`:
```bash
openclaw pairing list --channel whatsapp
openclaw pairing approve --channel whatsapp <CODE>
```

**Gateway not running (Mac Mini):** The LaunchAgent should auto-start. If not:
```bash
openclaw gateway start
```

## WhatsApp Business API (Future)

When you're ready for production with dedicated business numbers:

1. Create a Meta Business account at business.facebook.com
2. Set up a WhatsApp Business Platform app
3. Complete Meta Business Verification (requires business docs)
4. Get a dedicated phone number for WhatsApp Business
5. Configure message templates for proactive outreach
6. Update OpenClaw config to use the Business API credentials

This is only needed when you have paying clients who need a professional business number. For development and demos, the Baileys QR link works perfectly.
