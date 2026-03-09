# Production Readiness TODO

> **For Claude:** Read this file at the start of every session. Check off completed items.
> **For Austin:** This is the master checklist for going from "works on my Mac" to "real clients pay and use it."

**Last updated:** 2026-03-08

---

## Current State

- 6 test agents deployed on local Mac Mini (OpenClaw v2026.3.2)
- All agents using Austin's personal Google account (Austinr451@gmail.com)
- All agents using Austin's API keys (Tavily, Twilio, Google Places)
- Stripe in test mode
- WhatsApp not connected (need prepaid SIM)
- Dashboard at localhost:3000
- 21/23 skills tests passing (Shopify token + Resy API key = optional)

---

## Phase 1: Google Verification & Client OAuth (MUST DO BEFORE FIRST CLIENT)

### 1.1 Google OAuth Consent Screen — Submit for Verification
- [ ] Create privacy policy page (host at clawstaff.com/privacy or Notion)
- [ ] Create terms of service page (host at clawstaff.com/terms)
- [ ] Get a real domain (clawstaff.com or similar) and deploy a landing page
- [ ] In Google Cloud Console > OAuth consent screen:
  - [ ] Switch from "Testing" to "Production"
  - [ ] Add privacy policy URL
  - [ ] Add terms of service URL
  - [ ] Add homepage URL
  - [ ] Add app logo
  - [ ] Submit for Google verification review
- [ ] Wait for approval (typically 3-7 business days, can take weeks)
- [ ] After approval: any Google user can authorize, not just test users

### 1.2 Per-Client Google OAuth Flow (Dashboard)
- [ ] Add "Connect Google Account" button to `/dashboard/settings`
- [ ] Build OAuth redirect flow:
  - Client clicks button → redirected to Google consent screen
  - Client approves → redirect back to dashboard with auth code
  - Backend exchanges code for access + refresh tokens
  - Tokens stored per-agent (NOT globally like current gog setup)
- [ ] Token storage options (pick one):
  - Option A: `gog auth add client@biz.com --client <agent-id>` (gog supports named clients)
  - Option B: Store tokens in agent workspace: `~/clawstaff/agents/{id}/.google-token.json`
  - Option C: Use Google OAuth libraries directly (googleapis npm package), skip gog CLI
- [ ] Implement refresh token rotation (tokens expire, need auto-refresh)
- [ ] Add "Disconnect Google Account" button
- [ ] Show connection status on settings page (connected as: client@business.com)
- [ ] Test: onboard a test client with a different Gmail → verify agent uses their account

### 1.3 Per-Client Google Scopes
Each vertical needs different Google permissions. Dashboard should request only what's needed:

| Vertical | Gmail | Calendar | Drive | Sheets | Contacts |
|----------|-------|----------|-------|--------|----------|
| Restaurant (Maya) | Read reviews/emails | Reservation calendar | Menu storage | Report exports | Customer contacts |
| Realtor (Cole) | Client emails | Showing schedule | Listing docs | Market data | Client CRM |
| Fitness (Alex) | Class confirmations | Class schedule | Waivers | Attendance | Members |
| Medical (Sophia) | Appointment confirmations | Patient schedule | Records | Reports | Patient contacts |
| Home Services (Jake) | Job notifications | Service schedule | Estimates/invoices | Job tracking | Customer contacts |
| E-commerce (Zoe) | Order notifications | Shipping calendar | Product images | Inventory | Customers |

### 1.4 Google Places API — Per-Client Configuration
- [ ] Current: one API key for all agents (Austin's)
- [ ] Production: still fine to use one API key (it's project-scoped, not user-scoped)
- [ ] BUT: monitor usage per agent to avoid hitting $200/mo free tier limit
- [ ] Add usage tracking or per-agent quotas if needed

---

## Phase 2: Third-Party Integrations — Client Account Connections

### 2.1 Shopify (Zoe — E-commerce Vertical)
- [ ] Client provides their Shopify store URL
- [ ] Create a Shopify App in Shopify Partners (one-time, for ClawStaff)
  - Go to partners.shopify.com → Create App
  - Set redirect URL to clawstaff.com/api/shopify/callback
  - Request scopes: read_orders, read_products, read_customers, read_inventory
- [ ] Build OAuth install flow:
  - Dashboard settings: "Connect Shopify Store" button
  - Client enters store URL → redirected to Shopify OAuth
  - Client approves → ClawStaff gets access token
  - Token stored per-agent
- [ ] Test with a dev store (free: create at partners.shopify.com)
- [ ] Zoe's agent uses client's Shopify token for real orders/inventory

### 2.2 Twilio SMS (Sophia — Medical, Alex — Fitness)
- [ ] Current: Austin's Twilio account, one messaging service
- [ ] Production options:
  - Option A: Keep using ClawStaff's Twilio account, provision per-client phone numbers
    - Each client's agent gets a dedicated Twilio number ($1/mo)
    - SMS costs billed to ClawStaff, passed through to client
    - Simpler — client doesn't need Twilio account
  - Option B: Client provides their own Twilio credentials
    - More complex onboarding
    - Client responsible for their own SMS costs
  - **Recommendation: Option A** — include SMS in the subscription fee
- [ ] Buy a Twilio phone number for each client agent
- [ ] Update agent config to use per-agent FROM number
- [ ] Add SMS opt-in/opt-out compliance (required by law)
- [ ] Set up Twilio webhook to receive SMS replies → route to agent

### 2.3 OpenTable (Maya — Restaurant Vertical, FUTURE)
- [ ] Apply for OpenTable Connect API partner access
  - Go to restaurant.opentable.com/integrations or developer.opentable.com
  - Application form: describe ClawStaff as AI staffing for restaurants
  - Expected use: sync reservations, check availability, manage waitlist
  - Business info: your company details
- [ ] Wait for approval (weeks)
- [ ] After approval: build OAuth flow for clients who use OpenTable
  - Dashboard: "Connect OpenTable" button
  - Client authorizes → agent can read/manage their reservations
- [ ] **NOT blocking for launch** — many restaurants use Toast, Square, or their own system

### 2.4 Resy (Maya — Restaurant Vertical, WAIT)
- [ ] Resy killed public API in 2022 (AmEx acquisition)
- [ ] They announced new third-party APIs coming in 2026 for Gen AI platforms
- [ ] **Action:** Monitor https://blog.resy.com for API launch announcement
- [ ] When available: apply for partner access
- [ ] Remove `resy-hunter` ClawHub skill if unofficial API stops working
- [ ] **NOT blocking for launch**

### 2.5 Tavily Web Search (Cole, Jake)
- [ ] Current: Austin's API key, shared across agents
- [ ] Production: keep shared — it's a backend service, not client-facing
- [ ] Monitor usage: free tier = 1,000 searches/month
- [ ] Upgrade to paid tier when needed ($50/mo for 10K searches)
- [ ] Per-agent usage tracking to bill appropriately

### 2.6 Google Reviews / Review Summarizer (Maya, Jake)
- [ ] Current: scraping-based, no API key needed
- [ ] Production: still works, but Google may rate-limit
- [ ] Future: consider Google Business Profile API for verified review access
  - Requires client to grant access to their Google Business Profile
  - Add "Connect Google Business" to dashboard settings
- [ ] **NOT blocking for launch** — scraping works fine at low volume

---

## Phase 3: Infrastructure for Production

### 3.1 Deploy to VPS / Cloud Server
- [ ] Choose hosting: VPS (Hetzner/DigitalOcean) or cloud (AWS/GCP)
- [ ] Set up OpenClaw Gateway as systemd service (not macOS LaunchAgent)
- [ ] Migrate agent workspaces to server: `/opt/clawstaff/agents/`
- [ ] Set up AGENT_DATA_PATH env var on server
- [ ] Configure firewall (only expose ports 443, 3000, 18789)
- [ ] Set up SSL/TLS for dashboard
- [ ] Set up domain: dashboard.clawstaff.com → Next.js app

### 3.2 Deploy Dashboard to Vercel
- [ ] Push to GitHub (private repo)
- [ ] Connect to Vercel
- [ ] Set all env vars in Vercel dashboard (Stripe, Moltbook, agent data path)
- [ ] Configure custom domain
- [ ] Set up Vercel environment variables for production Stripe keys

### 3.3 Secrets Management
- [ ] Move all API keys from .env.local / ~/.zshrc to proper secrets manager
  - Options: 1Password CLI (OpenClaw has built-in skill), AWS Secrets Manager, or Doppler
- [ ] Per-agent secrets stored securely (client tokens, API keys)
- [ ] Rotate Austin's personal tokens out of agent configs
- [ ] Never store client credentials in git or plain text files

### 3.4 WhatsApp Channel (Production)
- [ ] Get a prepaid SIM with a real phone number for ClawStaff agents
- [ ] Link to OpenClaw via `openclaw channels login --channel whatsapp`
- [ ] Test peer routing: client phone → their agent
- [ ] For scale: consider WhatsApp Business API (Meta Cloud API)
  - Requires Meta Business verification
  - Dedicated business phone number
  - Message template approval for outbound messages
  - Higher throughput than Baileys
- [ ] See `docs/setup-whatsapp.md` for full guide

### 3.5 Stripe Production Mode
- [ ] Create live Stripe products/prices (mirror test mode setup)
- [ ] Switch to live API keys in production env
- [ ] Set up production webhook endpoint: clawstaff.com/api/stripe/webhook
- [ ] Test full payment flow with a real card
- [ ] Set up Stripe Tax if needed
- [ ] Configure Stripe billing portal for client self-service

---

## Phase 4: Client Onboarding Flow (End-to-End)

### 4.1 Onboarding Script Updates
- [ ] Update `scripts/onboard.ts` to:
  1. Create agent workspace from template
  2. Deploy agent to OpenClaw
  3. Generate dashboard invite link
  4. Send welcome email with setup instructions
- [ ] Dashboard onboarding wizard:
  1. Client signs up → Stripe checkout
  2. Payment confirmed → agent workspace created
  3. Client redirected to dashboard settings
  4. "Connect Google Account" prompt
  5. "Connect WhatsApp" instructions (or skip)
  6. Vertical-specific connections (Shopify for e-commerce, etc.)
  7. Agent goes live

### 4.2 Per-Client Configuration Isolation
- [ ] Each client agent must ONLY access that client's data
- [ ] Verify: agent workspace is isolated (`~/clawstaff/agents/{id}/`)
- [ ] Verify: Google tokens are per-agent
- [ ] Verify: Shopify tokens are per-agent
- [ ] Verify: WhatsApp routing is per-phone-number
- [ ] Verify: Stripe subscription is linked to correct agent
- [ ] Add test: onboard 2 clients, verify no data leakage

### 4.3 Client Dashboard Features Needed
- [ ] Settings page: show which integrations are connected
- [ ] Settings page: connect/disconnect Google, Shopify, etc.
- [ ] Settings page: update business info (name, address, phone)
- [ ] Settings page: manage notification preferences
- [ ] Settings page: view/manage Stripe subscription

---

## Phase 5: Monitoring & Reliability

### 5.1 Agent Health Monitoring
- [ ] Set up heartbeat checks (OpenClaw has heartbeat config)
- [ ] Alert if agent stops responding (email/Slack to Austin)
- [ ] Dashboard status indicator: agent online/offline
- [ ] Auto-restart agents that crash

### 5.2 Usage & Cost Tracking
- [ ] Track per-agent API usage:
  - LLM tokens (Anthropic) — biggest cost
  - Tavily searches
  - Twilio SMS count
  - Google API calls
- [ ] Dashboard: show client their agent's activity metrics
- [ ] Internal: track cost-per-agent for pricing decisions

### 5.3 Logging & Debugging
- [ ] Centralized logging for all agents (not just local JSONL files)
- [ ] Error alerting (agent failures, API errors, rate limits)
- [ ] Session replay for debugging client issues

---

## Quick Reference: What Blocks What

| Blocker | Blocks |
|---------|--------|
| Google OAuth verification | Any client using Google (Gmail, Calendar, etc.) |
| Domain + landing page | Google OAuth verification |
| Privacy policy + ToS | Google OAuth verification |
| VPS deployment | Multiple concurrent clients |
| WhatsApp phone number | WhatsApp channel for any client |
| Stripe live mode | Real payments |
| Shopify Partners app | E-commerce client onboarding |
| OpenTable partner approval | Restaurant reservation sync (optional) |

## Priority Order

1. **Domain + landing page + privacy policy** (unblocks everything)
2. **Google OAuth verification** (unblocks all client Google integrations)
3. **VPS/cloud deployment** (unblocks multi-client)
4. **Stripe live mode** (unblocks payments)
5. **WhatsApp phone number** (unblocks messaging channel)
6. **Dashboard OAuth flows** (Google, Shopify connect buttons)
7. **OpenTable/Resy** (nice-to-have, not blocking)
