# TODO: Client Google OAuth Flow

**Priority:** Before first paying client onboard
**Blocked by:** Google OAuth consent screen verification

## Problem

Currently all agents use Austin's personal Google account (`Austinr451@gmail.com`) via `gog auth`. In production, each client's agent needs to use the **client's own** Google account so:
- Maya (restaurant) reads the restaurant owner's Gmail, not Austin's
- Cole (realtor) checks the realtor's calendar, not Austin's
- Sophia (medical) sends appointment emails from the clinic's account

## What Needs to Happen

### 1. Google OAuth Consent Screen Verification
- Submit ClawStaff app for Google verification review
- Requires: privacy policy, terms of service, real domain, homepage
- Takes days/weeks for Google to approve
- After verification, any Google user can authorize (not just test users)

### 2. Dashboard OAuth Flow
- Add "Connect Google Account" button to `/dashboard/settings`
- Client clicks it, goes through Google OAuth consent
- Token stored per-agent (not globally)
- Refresh token handling for long-lived sessions

### 3. Per-Agent Token Storage
- Currently: `gog` stores one token in `~/Library/Application Support/gogcli/`
- Production: each agent needs its own token
- Options:
  - `gog auth add client@biz.com --client <agent-id>` (gog supports named clients)
  - Store tokens in agent workspace: `~/clawstaff/agents/{id}/.gog-token`
  - Or use Google OAuth directly without gog CLI

### 4. Onboarding Script Update
- `scripts/generate-workspace.ts` should prompt for client Google account
- Or defer — client connects via dashboard after agent is deployed

## Current State (Dev/Testing)
- Using `Austinr451@gmail.com` for all 6 test agents
- This is fine for development and demos
- Must be changed before any real client data flows through

## When to Build
- After first client signs up and pays
- Before giving them a live agent with Google access
- Estimate: 2-3 day feature (OAuth flow + dashboard UI + per-agent tokens)
