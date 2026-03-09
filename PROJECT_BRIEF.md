# ClawStaff — AI Agent Staffing Agency

## What This Is

ClawStaff is a managed AI agent staffing service built on OpenClaw. Businesses subscribe monthly and receive a dedicated AI "employee" accessible via WhatsApp, Slack, or SMS. The business never touches OpenClaw, never configures anything, never sees a terminal. They get a phone number or Slack channel and start texting their new team member.

I own and operate every agent on my own infrastructure. I write the SOUL.md identity files, curate the skill stacks, manage security updates, and handle all backend operations. The client just experiences a responsive, capable virtual team member who works 24/7.

This is not a SaaS tool. This is not consulting. This is agents-as-a-service — structured like a staffing company where the employees are AI.

---

## Core Architecture

### How OpenClaw Works (Reference)

OpenClaw is an open-source autonomous AI agent framework (240K+ GitHub stars). Key architectural components:

**Gateway (Control Plane):** A long-lived WebSocket server (ws://127.0.0.1:18789) that handles routing, connectivity, auth, and session management. Runs as a background daemon via systemd on Linux. Connects to 20+ messaging channels simultaneously and routes messages to the appropriate agent runtime.

**Agent Runtime (Brain):** Orchestrates LLM calls using the ReAct pattern — reason → act via tool call → observe result → repeat. Model-agnostic: Claude Opus, GPT-4, Gemini, or local models configured in openclaw.json.

**Memory System:** File-based Markdown memory on the filesystem.
- `memory/YYYY-MM-DD.md` — daily logs of events, decisions, tasks
- `MEMORY.md` — curated long-term memory persisting across months
- `SESSION-STATE.md` — hot context for active tasks
- `RECENT_CONTEXT.md` — auto-updated highlights for quick recall
- `memory_search` tool — vector + SQLite FTS5 hybrid for semantic recall

**Identity System:**
- `SOUL.md` — defines who the agent IS: name, personality, behavioral rules, communication style, boundaries. Read first every time the agent wakes.
- `USER.md` — information about the human the agent serves
- `AGENTS.md` — startup procedures and protocols
- `HEARTBEAT.md` — proactive task checklist evaluated every 30 min
- `openclaw.json` — master config: model providers, channel connections, tool permissions

**Skills:** Modular capabilities. A skill = a directory with a SKILL.md file (YAML frontmatter + step-by-step instructions). Installed via `clawhub install <slug>`. 10K+ community skills on ClawHub. 53 bundled official skills.

**Heartbeat & Cron:** Heartbeat runs every 30 min, reads HEARTBEAT.md, proactively checks on tasks. Cron extends this with traditional scheduled task execution. This is what makes the agent proactive rather than reactive.

**Multi-Agent Routing:** Different channels/accounts/contacts can route to isolated agents, each with its own workspace, session history, and skill set. This enables running multiple agents through a single Gateway.

**Supported Channels:** WhatsApp, Telegram, Signal, iMessage, LINE, Slack, Discord, Microsoft Teams, Google Chat, and 10+ more — all through a single Gateway process.

---

## Multi-Tenant Architecture

```
┌──────────────────────────────────────────────────┐
│                   MY VPS (Ubuntu)                  │
│                                                    │
│  ┌─────────────┐  ┌─────────────┐  ┌───────────┐ │
│  │ Agent: Maya  │  │ Agent: Cole  │  │ Agent: N  │ │
│  │ (Restaurant) │  │ (Realtor)    │  │ (Fitness) │ │
│  │              │  │              │  │           │ │
│  │ SOUL.md      │  │ SOUL.md      │  │ SOUL.md   │ │
│  │ USER.md      │  │ USER.md      │  │ USER.md   │ │
│  │ HEARTBEAT.md │  │ HEARTBEAT.md │  │ HEARTBEAT │ │
│  │ Skills/      │  │ Skills/      │  │ Skills/   │ │
│  │ Memory/      │  │ Memory/      │  │ Memory/   │ │
│  └──────┬───────┘  └──────┬───────┘  └─────┬─────┘ │
│         │                  │                │       │
│  ┌──────┴──────────────────┴────────────────┴─────┐ │
│  │              OpenClaw Gateway                   │ │
│  │         (Single process, multi-route)           │ │
│  └──────────────────┬──────────────────────────────┘ │
│                     │                                │
└─────────────────────┼────────────────────────────────┘
                      │
        ┌─────────────┼─────────────┐
        │             │             │
   WhatsApp       Slack        Telegram
   (Client A)    (Client B)   (Client C)
```

**Each client agent gets:**
- Isolated workspace directory on the VPS
- Dedicated SOUL.md, USER.md, HEARTBEAT.md, and TOOLS.md
- Client-specific skill stack (curated per vertical)
- Isolated memory directory that accumulates over time
- Dedicated messaging channel(s) routed via the Gateway

**Shared infrastructure:**
- Single Gateway process handling all routing
- Shared LLM API keys (cost tracked per agent for billing)
- Centralized monitoring dashboard
- Automated backup and security update pipeline

---

## Who Buys This (Target Market)

### The Sweet Spot
Local businesses doing $500K–$5M/year in revenue. Owners who are still personally handling tasks that should be delegated but can't justify a $3K–$4K/mo hire for it. They don't want software — they want someone to just handle it.

### Buyer Profiles

**1. Independent Restaurant Owners**
- Pain: responding to Google/Yelp reviews at 11pm after a 14-hour shift, missing reservation inquiries, no time for customer follow-up
- Revenue signal: 50+ Google reviews (means enough volume to justify automation)
- Where to find them: local restaurant owner Facebook groups, Yelp/Google Maps (browse for businesses with slow or no review responses — that's your lead list), restaurant industry trade shows, local chamber of commerce
- Pitch: "You'll never respond to a review at midnight again. Your agent handles all of it and sends you a daily summary every morning."
- NOT a fit: chain restaurants (they have corporate marketing teams), brand new restaurants with <20 reviews

**2. Solo / Small-Team Real Estate Agents**
- Pain: leads go cold because they can't follow up within 5 minutes when they're showing a house, drowning in scheduling logistics, lose deals to faster-responding competitors
- Revenue signal: agents doing 15+ transactions/year (busy enough that lead management is a real bottleneck)
- Where to find them: real estate agent Facebook groups, Keller Williams / RE/MAX / Compass local office meetups, BNI networking groups, real estate investing meetups
- Pitch: "Your agent follows up with every Zillow lead in under 5 minutes, 24/7, and books showings on your calendar while you're at the closing table."
- NOT a fit: teams with dedicated ISAs (inside sales agents) already, mega-teams with 10+ agents

**3. Boutique Fitness Studios / Personal Training Gyms**
- Pain: membership inquiries go cold on weekends, no-shows pile up without reminders, inactive members churn silently, owner is also the front desk
- Revenue signal: 100+ active members (enough churn risk to justify the cost)
- Where to find them: fitness studio owner communities (Gym Launch, NPEFITNESS), local CrossFit/yoga/pilates owner networks, ClassPass partner directories
- Pitch: "Your agent re-engages every member who hasn't booked a class in 2 weeks and follows up with every inquiry within minutes — even on Sunday at 6am."
- NOT a fit: big box gyms (Planet Fitness, etc.), franchise locations with corporate systems

**4. Med Spas / Dental Offices / Chiropractors**
- Pain: appointment no-shows cost real money ($150–$500 per empty slot), new patient inquiries need fast follow-up, rebooking after visits is manual
- Revenue signal: 3+ providers at a single location (enough volume)
- Where to find them: dental practice management forums, med spa owner groups, local healthcare networking events, industry conferences (AADOM for dental)
- Pitch: "Your agent confirms every appointment 24 hours ahead, follows up with no-shows within 30 minutes, and re-engages patients who haven't rebooked in 6 months."
- NOT a fit: hospital systems, large multi-location practices with existing CRM teams

**5. Home Service Businesses (HVAC, Plumbing, Landscaping, Auto Repair)**
- Pain: missing calls during jobs = lost revenue, no follow-up after estimates, reviews are critical but never responded to
- Revenue signal: $750K+ annual revenue, 4+ Google star rating (they care about reputation)
- Where to find them: home service contractor Facebook groups, Nextdoor business pages, Angi/HomeAdvisor listings, local trade associations
- Pitch: "Your agent responds to every Google review, follows up on every estimate within 2 hours, and sends seasonal maintenance reminders to past customers."
- NOT a fit: one-person operations under $200K revenue (can't afford the service)

**6. E-Commerce / Shopify Store Owners**
- Pain: customer support tickets pile up, abandoned cart recovery is manual, review/UGC collection is inconsistent
- Revenue signal: $50K+/mo in revenue, 100+ orders/month
- Where to find them: Shopify communities, e-commerce Twitter/X, r/ecommerce, DTC brand Slack groups
- Pitch: "Your agent handles tier-1 customer support on WhatsApp, recovers abandoned carts with personalized follow-ups, and collects post-purchase reviews automatically."
- NOT a fit: dropshippers with low margins, stores under $10K/mo

### Outreach Strategy & Go-to-Market

**Phase 1: First 3–5 Clients (Weeks 1–4) — Warm Outreach, No Automation**

Your first clients are NOT revenue — they're case studies. Price them at $99/mo or free for 30 days then $99/mo in exchange for: permission to use their results as a public case study, a testimonial quote, and letting the agent build a Moltbook profile with real data.

Do NOT use the prospecting agent yet. Go warm:
- Walk into businesses you already use as a customer (your barber, your gym, restaurants you eat at, your dentist)
- Show them their own pain point on your phone — unresponded reviews, slow inquiry responses, no appointment reminders
- Say: "I built something that handles this for you 24/7. Responds to everything within minutes, sends you a summary on WhatsApp every morning. Let me run it free for 2 weeks."
- That conversation takes 3 minutes and there's almost zero friction because they know you
- Pick ONE vertical to start — restaurant or dental/medical are the easiest first sells because the pain is visible and the ROI is obvious
- Goal: 3–5 paying clients with real metrics within 4 weeks

**Phase 2: Deploy the Prospecting Agent (Month 2) — Automated Cold Outreach**

Once you have 2–3 case studies with real numbers, deploy the prospecting agent (detailed below). This is an OpenClaw agent that works for YOU — not for clients. It runs 24/7 finding, qualifying, scoring, and reaching out to potential clients.

The prospecting agent's cold outreach now includes:
- A specific, personalized callout of the prospect's actual problem (not a generic pitch)
- A link to a case study showing real before/after metrics from an existing client
- A link to the Moltbook agent profile with verified performance data
- A free trial offer

That combination converts way higher than generic cold outreach.

**Phase 3: Referral Flywheel (Month 3+)**
- Ask satisfied clients for referrals (restaurant owners know other restaurant owners)
- Post anonymized results in industry Facebook groups
- Agent Moltbook profiles serve as 24/7 passive marketing
- Each new vertical becomes easier because infrastructure, templates, and Moltbook are already built
- Cross-vertical knowledge from Moltbook makes every new agent smarter on day 1

---

## Prospecting Agent (Internal Sales Tool)

### What This Is

The prospecting agent is a SEPARATE OpenClaw agent that runs on your VPS alongside the client-facing agents. It does NOT serve clients — it finds them. This is your automated sales team.

**Critical distinction:**
- **Client agents** (Maya, Cole, Alex, etc.) = the SERVICE you deliver to paying clients
- **Prospecting agent** ("Scout") = YOUR internal tool that finds new clients for ClawStaff
- Clients never see or know about the prospecting agent

### How Scout Works

Scout runs a daily prospecting pipeline through its heartbeat and cron system:

**Step 1: Discovery (Cron — runs daily at 6am)**
Scout searches for businesses across target verticals and geographies. The search adapts per vertical:
- **Restaurants:** Google Maps search → scrape Google Business profiles → identify businesses with 50+ reviews but low owner response rates
- **Real Estate:** Scrape Zillow/Realtor.com agent profiles → identify solo agents in high-volume markets → check their response time on listings
- **Dental/Medical:** Google Maps search → check if they have online booking → identify offices with high review counts but no/slow responses
- **Fitness Studios:** Google Maps + ClassPass/Mindbody listings → identify studios with engagement gaps (reviews mentioning "couldn't reach anyone", "no one called back")
- **Home Services:** Google Maps + Angi/HomeAdvisor → identify businesses with strong ratings but unresponded reviews or no web presence

Scout stores discovered businesses in its memory system with all scraped data.

**Step 2: Qualification (Runs immediately after discovery)**
Scout scores each prospect on a 0–100 scale based on:
- **Pain signal strength (40%):** How visible is their problem? (e.g., 20 unresponded reviews = high pain signal. No online booking in 2026 = high pain signal.)
- **Revenue fit (25%):** Does the business look like it's in the $500K–$5M sweet spot? (Review volume, location quality, and staff size as proxies)
- **Reachability (20%):** Can Scout find an email address, Instagram, or Facebook page to reach the owner? (No contact info = disqualified)
- **Competition (15%):** Are they already using a chatbot, VA service, or automation tool? (If so, lower priority — harder to convert)

Prospects scoring 60+ enter the outreach queue. Below 60 get archived.

**Step 3: Research & Personalization (Runs for each qualified prospect)**
For each prospect in the outreach queue, Scout does deep research:
- Reads their most recent reviews (positive and negative) to understand their specific issues
- Checks their website, social media, and online presence
- Identifies the specific, concrete problem a ClawStaff agent would solve for THEM
- Drafts a personalized outreach message that references their actual situation

**Step 4: Outreach (Scheduled — staggers sends throughout the day)**
Scout sends personalized outreach via the best available channel:
- **Email** (preferred): if Scout can find the owner's email via website or Google Business profile
- **Instagram DM**: if the business has an active Instagram with <10K followers (owner likely manages it)
- **Facebook Page message**: if they have a Facebook business page
- **Contact form**: if all else fails, submit through their website contact form

Example outreach for a restaurant (the message changes entirely per vertical and per prospect):
"Hi [Owner Name] — I was browsing [Restaurant Name] on Google and noticed your last 14 reviews don't have responses, including a 2-star from last Tuesday. Every potential customer checking your listing sees those sitting unanswered. I run a service where a dedicated AI assistant handles all of this for you 24/7 — responds within minutes, sends you a daily WhatsApp summary. I'm offering a free 2-week trial right now. Here's a case study from another restaurant we work with: [link]. Want to try it?"

Example outreach for a dental office:
"Hi [Doctor Name] — I noticed [Practice Name] doesn't have online appointment booking and your Google listing shows your last 8 patient reviews are unanswered. I run a service that gives your practice a dedicated virtual assistant — confirms appointments, follows up with no-shows, responds to reviews, and sends you a daily summary on WhatsApp. One of the dental offices I work with reduced no-shows by 35% in the first month. Free 2-week trial: [link]"

**Step 5: Follow-Up (Cron — automated cadence)**
- No response after 3 days → softer follow-up ("Just bumping this in case it got buried")
- No response after 7 days → final attempt with different angle ("Noticed [new specific thing about their business]. Thought of you again.")
- No response after 10 days → mark as cold, archive, revisit in 90 days
- If they respond with interest → alert you immediately via WhatsApp with the full prospect dossier so you can jump on a call

**Step 6: Reporting (Heartbeat — daily summary to you)**
Every evening Scout sends you a WhatsApp summary:
- Prospects discovered today: X
- Prospects qualified (60+ score): X
- Outreach messages sent: X
- Responses received: X (with details)
- Follow-ups sent: X
- Pipeline total: X active prospects across all stages

### Scout's SOUL.md Identity

Scout is NOT client-facing, so its personality is different from the service agents:
- Name: "Scout" (or whatever you want)
- Role: ClawStaff Business Development Agent
- Tone: professional but not stiff — outreach should feel like a real person, not a bot
- Rules: never be pushy or spammy, respect opt-outs immediately, never send more than 3 messages to any prospect, always personalize (never send anything that could be a template)
- Privacy: never share data about existing clients in outreach (don't say "Mama Rosa's uses us" unless Rosa gave explicit permission for case study use)
- Compliance: include unsubscribe/opt-out in every email, comply with CAN-SPAM

### Scout's Skill Stack
- Agent Browser (Google Maps scraping, website research, social media checks)
- Tavily (web search for prospect research)
- GOG (Gmail for email outreach, Google Sheets for pipeline tracking)
- WhatsApp (to send you daily pipeline summaries and hot lead alerts)
- Cron (scheduling the daily discovery and follow-up cadence)
- Memory system (stores full prospect dossiers, outreach history, response tracking)

### Scaling the Flywheel

The prospecting agent gets smarter over time:
- Memory tracks which outreach messages get responses → Scout learns what works
- Memory tracks which verticals and geographies convert best → Scout focuses there
- As you add more client agents with Moltbook profiles, Scout includes those as social proof in outreach
- As case studies accumulate, Scout selects the most relevant case study per prospect vertical
- Scout can eventually post in business owner Facebook groups and subreddits (with your approval) sharing anonymized results

---

## Vertical Templates + Customization System

### How It Works: Template (80%) + Customization (20%)

Every agent is built from a **vertical template** — a pre-built SOUL.md blueprint that covers the core competencies, behavioral rules, skill stack, heartbeat tasks, and Moltbook submolt subscriptions for that industry. The template handles ~80% of what any client in that vertical needs.

The remaining ~20% is **client-specific customization** applied during onboarding. The onboarding CLI prompts for client details and layers them on top of the template to produce a unique, production-ready SOUL.md.

**Template layer (preset, shared across all clients in a vertical):**
- Agent core competencies and task capabilities
- Communication style defaults and tone guidelines
- Industry-standard behavioral rules (how to handle negative reviews, how to qualify leads, etc.)
- Skill stack (which ClawHub skills to install)
- Heartbeat task checklist
- Moltbook submolt subscriptions and posting guidelines
- Escalation framework (what the agent handles vs. what gets flagged to the owner)
- Privacy and safety rules

**Customization layer (unique per client, collected during onboarding):**
- Business name, owner name, and team member names
- Agent name (client can choose or accept the default)
- Communication tone preference (warm / professional / casual / direct)
- Business-specific rules ("never offer discounts without my approval", "always mention our Tuesday special", "if someone asks about parking, tell them there's a lot behind the building")
- Escalation preferences (what warrants an immediate WhatsApp alert vs. what goes in the daily summary)
- Business-specific knowledge (menu items, pricing, hours, services offered, FAQs, staff specialties)
- Channel preferences (WhatsApp only? WhatsApp + email? Slack?)
- Timezone and business hours
- Custom HEARTBEAT tasks ("remind me about inventory orders every Thursday at 2pm")

### Template: Restaurant ("Maya" default name)
**Core competency:** Review monitoring and response, reservation management, customer inquiry handling
**Skills:** Google Reviews API monitoring, Yelp monitoring, Facebook review tracking, WhatsApp messaging, GOG (Google Calendar + Gmail), Summarize, Agent Browser
**HEARTBEAT tasks:**
- Every 30 min: check for new reviews on Google, Yelp, Facebook
- Every 30 min: check for new reservation inquiries or changes
- 6am daily: send owner a morning briefing (yesterday's reviews, today's reservations, any flags)
- 10pm daily: send owner a nightly recap (today's activity, reviews handled, customer interactions)
- Weekly: draft Moltbook post with anonymized performance insights
**Default SOUL.md rules:**
- Respond to all reviews within 30 minutes
- Negative reviews: acknowledge concern, apologize without admitting fault, invite back, never argue
- Positive reviews: thank warmly, mention specific detail from their review, invite return
- 1–2 star reviews: alert owner immediately via WhatsApp in addition to responding
- Never offer refunds, discounts, or free items without owner approval
- Never share staff personal information or schedules
- Never argue with a reviewer under any circumstances
**Moltbook submolts:** #restaurant-ops, #review-management, #hospitality-ai, #small-business

### Template: Real Estate ("Cole" default name)
**Core competency:** Lead follow-up, showing scheduling, client communication management
**Skills:** WhatsApp messaging, GOG (Google Calendar + Gmail + Contacts), CRM-style memory tracking, Tavily (property research), Summarize
**HEARTBEAT tasks:**
- Every 30 min: check for new leads from Zillow, Realtor.com, direct inquiries
- Every 30 min: check for leads that haven't responded in 24/48/72 hours and send appropriate follow-up
- 7am daily: send agent a morning briefing (new leads overnight, today's showings, follow-up queue)
- 9pm daily: send daily lead pipeline summary
- Weekly: draft Moltbook post with anonymized conversion insights
**Default SOUL.md rules:**
- Respond to every new lead within 5 minutes, 24/7
- First message: introduce self, acknowledge their interest, ask qualifying question (budget range, timeline, must-haves)
- Follow-up cadence: 24 hours, 48 hours, 1 week, 2 weeks (then mark as cold)
- Schedule showings directly on the agent's Google Calendar with address and lead contact info
- Never discuss pricing opinions or market predictions ("I'll connect you with [agent name] to discuss pricing strategy")
- Never commit to anything on the agent's behalf beyond scheduling
- Escalate to owner: leads with budget >$1M, commercial property inquiries, any legal questions
**Moltbook submolts:** #real-estate, #lead-management, #sales-automation, #crm-agents

### Template: Fitness Studio ("Alex" default name)
**Core competency:** Membership inquiry handling, class scheduling, member retention and re-engagement
**Skills:** WhatsApp messaging, GOG (Google Calendar + Sheets), Summarize, Cron scheduling
**HEARTBEAT tasks:**
- Every 30 min: check for new membership or class inquiries
- 7am daily: send class reminder messages to members booked for today
- Daily: scan member list for anyone inactive >14 days, send re-engagement message
- 8pm daily: send owner daily summary (new inquiries, classes booked, members re-engaged)
- Weekly: generate member activity report, draft Moltbook post
**Default SOUL.md rules:**
- Respond to every inquiry within 10 minutes
- First message to new inquiries: friendly greeting, ask about fitness goals, offer to book a trial class
- Never discuss specific member medical conditions or injuries
- Re-engagement messages should be encouraging, not guilt-tripping ("We miss seeing you! Want me to book your favorite Thursday 6pm class?")
- Escalate to owner: refund requests, injury reports, complaints about trainers
- Never promise specific fitness results or outcomes
**Moltbook submolts:** #fitness-business, #membership-retention, #wellness-ops, #scheduling

### Template: Medical/Dental ("Sophia" default name)
**Core competency:** Appointment management, patient follow-up, no-show recovery, rebooking campaigns
**Skills:** WhatsApp messaging, GOG (Google Calendar + Gmail), Summarize, Cron scheduling
**HEARTBEAT tasks:**
- 8am daily: send appointment confirmation messages for tomorrow's schedule
- Every 30 min: check for new patient inquiries via web form or email
- 30 min after a no-show: send a rescheduling message
- Weekly: scan patient list for anyone overdue for a visit (6+ months since last appointment), send rebooking message
- Weekly: send owner a report on no-show rate, rebooking rate, new patient inquiries
**Default SOUL.md rules:**
- HIPAA awareness: never discuss specific diagnoses, treatments, or medical records in messages
- Appointment confirmations include date, time, provider name, and office address only
- No-show follow-up tone: understanding, not punitive ("Life happens! Want me to find you a new time?")
- Never provide medical advice, even if asked
- Escalate to office: insurance questions, billing disputes, urgent medical concerns, any message mentioning pain or emergency
- After-hours inquiries: acknowledge receipt, confirm someone will follow up during business hours
**Moltbook submolts:** #healthcare-ops, #appointment-management, #patient-retention, #small-business

### Template: Home Services ("Jake" default name)
**Core competency:** Lead response, estimate follow-up, review management, seasonal marketing
**Skills:** WhatsApp messaging, GOG (Google Calendar + Gmail), Google Reviews monitoring, Summarize, Tavily
**HEARTBEAT tasks:**
- Every 30 min: check for new estimate requests or inquiries
- Every 30 min: check for new Google reviews
- Daily: follow up on outstanding estimates that haven't converted (24hr, 72hr, 1 week cadence)
- Seasonal: send past customers maintenance reminders (HVAC tune-up in spring/fall, gutter cleaning in autumn, etc.)
- Weekly: send owner a pipeline summary (new leads, estimates pending, reviews received)
**Default SOUL.md rules:**
- Respond to every inquiry within 15 minutes, even after hours ("Thanks for reaching out! I'll get you on [owner]'s schedule. What times work best this week?")
- Never quote prices without owner approval — instead, offer to schedule a free estimate
- Review responses: always professional, mention specific service performed if possible
- Follow-up on estimates: "Just checking in — did you have any questions about the estimate [owner] sent over?"
- Escalate to owner: emergency service requests, jobs over $X threshold, complaints, warranty claims
- Seasonal reminders should feel helpful, not salesy
**Moltbook submolts:** #home-services, #review-management, #lead-management, #small-business

### Template: E-Commerce ("Zoe" default name)
**Core competency:** Customer support triage, abandoned cart recovery, post-purchase review collection
**Skills:** WhatsApp messaging, GOG (Gmail + Sheets), Agent Browser, Summarize, Shopify integration skills
**HEARTBEAT tasks:**
- Every 30 min: check for new support tickets or customer messages
- Every 30 min: check for abandoned carts (1hr, 24hr, 72hr recovery cadence)
- Daily: send post-purchase review request to customers whose orders were delivered 3 days ago
- Daily: send owner a support summary (tickets handled, carts recovered, reviews collected)
- Weekly: generate customer sentiment report, draft Moltbook post
**Default SOUL.md rules:**
- Tier 1 support only: order status, shipping questions, return/exchange policy, product info
- Escalate to owner: refund requests over $X, product defect reports, angry customers who've messaged more than twice
- Abandoned cart messages: personalized, mention the specific product, offer help ("Still thinking about the [product]? Happy to answer any questions!")
- Never offer discounts unless explicitly authorized in the customization layer
- Review requests: simple and friendly, include direct link to review page
**Moltbook submolts:** #ecommerce-ops, #customer-support, #retention-marketing, #small-business

---

## Client Dashboard (React/Next.js)

The dashboard is what I demo to prospects and what clients use to see their agent working. It is NOT an OpenClaw admin panel — clients never see OpenClaw internals.

### Dashboard Pages:
1. **Overview** — Agent status (online/offline), messages handled today/this week/this month, response time avg, uptime
2. **Message Log** — Chronological feed of agent interactions (inbound message → agent response), filterable by channel and date
3. **Performance** — Charts: messages over time, response time trends, task completion rate, busiest hours
4. **Moltbook** — Agent's Moltbook reputation score, recent posts and engagement, submolt activity, knowledge gained from other agents, shareable public profile link
5. **Agent Profile** — The agent's "bio" (name, role, skills, personality summary) — what the client sees as their team member
6. **Settings** — Business info, channel connections, notification preferences, billing (Stripe portal link)

### Tech Stack:
- Next.js 14+ (App Router)
- TypeScript
- Tailwind CSS
- Recharts or Chart.js for data viz
- Stripe for billing
- Deployed on Vercel

---

## Revenue Model

| Tier | Price/mo | What's Included |
|------|----------|-----------------|
| Starter | $299/mo | 1 agent, 1 channel (WhatsApp OR Slack), basic skill stack, daily summaries |
| Pro | $499/mo | 1 agent, 3 channels, full skill stack, custom SOUL.md tuning, priority support |
| Enterprise | $799/mo | Multiple agents, all channels, custom skill development, dedicated account management |

**Setup fee:** $250–$500 one-time for onboarding and SOUL.md configuration

**My costs per agent:** ~$30–$60/mo (LLM API tokens + VPS fraction)

**Target margins:** 80%+

---

## Tech Stack Summary

- **Agent infrastructure:** OpenClaw on Ubuntu VPS (DigitalOcean/Hetzner)
- **Provisioning:** Bash scripts / Ansible for new agent deployment
- **Client dashboard:** Next.js + TypeScript + Tailwind
- **Billing:** Stripe (subscriptions + setup fees)
- **Monitoring:** Custom health checks + OpenClaw Gateway API
- **Security:** Tailscale for remote VPS access, agent-level tool allowlists
- **Domain/Brand:** ClawStaff.ai (or similar)

---

## Build Phases

### Phase 1: Client Dashboard MVP (Week 1-2)
Scaffold Next.js app with Tailwind. Build the 5 dashboard pages with mock data. This is the sales demo tool. Mobile responsive.

### Phase 2: SOUL.md Template Engine (Week 2-3)
A system that takes business inputs (name, vertical, owner name, communication style, specific tasks) and generates a complete OpenClaw workspace: SOUL.md, USER.md, HEARTBEAT.md, TOOLS.md, openclaw.json, and installs the right skill stack. Start with Restaurant and Real Estate templates.

### Phase 3: Infrastructure Automation (Week 3-4)
Scripts to provision a new agent workspace on the VPS, configure Gateway routing, connect messaging channels, and start the agent. Goal: new client onboarded in < 15 minutes.

### Phase 4: Billing + Onboarding Flow (Week 4-5)
Stripe subscription integration. Onboarding wizard where new clients enter their business info, select a plan, and the system auto-provisions their agent.

### Phase 5: Monitoring + Real Data (Week 5-6)
Replace mock dashboard data with real metrics pulled from agent logs and memory files. Health monitoring and alerting for agent issues.

### Phase 6: Moltbook Integration — The Moat (Week 6–8)
This is the most important differentiator in the entire product. Moltbook is where ClawStaff agents build public, verifiable reputations that no competitor can fake. Every agent gets a Moltbook presence that serves as a living portfolio, a marketing channel, and a knowledge network. Details below.

### Phase 7: Prospecting Agent "Scout" (Week 8–10)
Build and deploy Scout — your internal OpenClaw agent that finds, qualifies, and reaches out to potential clients 24/7. This is the self-sustaining sales engine. Scout runs a daily pipeline: discover businesses via Google Maps → qualify them on a scoring rubric → research their specific pain points → send personalized outreach → follow up on an automated cadence → alert you when someone responds. Full architecture in the "Prospecting Agent" section above.

---

## Moltbook Integration (Core Differentiator)

### What Moltbook Is

Moltbook is a Reddit-style social network exclusively for AI agents. 1.6M+ agents are on the platform as of February 2026. It has threaded conversations, topic-specific groups called "submolts," and a voting system. Only AI agents can post, comment, or vote — humans can observe but not participate. Agents authenticate via their owner's "claim" tweet and interact through the Moltbook API.

Each agent on Moltbook has a profile, a personality, interests, and a memory system that maintains context across conversations over weeks and months. Agents can initiate conversations, respond to mentions, share content, and form opinions that evolve based on interactions. The platform uses "epistemic tagging" — when an agent shares information, it tags the content with a confidence level and source attribution.

### Why This Is ClawStaff's Moat

Every ClawStaff agent gets a Moltbook profile that functions as a **public, verifiable work resume**. This is something no human VA or competing service can replicate. Here's what the Moltbook presence does for us:

**1. Social Proof for Sales**
When a prospect asks "why should I pay $400/mo for an AI agent?", we point them to the agent's Moltbook profile showing months of real activity:
- "Maya has responded to 2,400+ reviews across 12 restaurant clients"
- "Cole has followed up with 890 real estate leads, scheduling 340 showings"
- Stats are public, verifiable, and accumulate over time

**2. Vertical Authority via Submolts**
Each agent posts in industry-specific submolts — restaurant management, real estate, fitness, small business ops. They share anonymized insights like "3-star reviews that get a response within 2 hours convert to return visits 40% more often" (derived from accumulated memory data). This positions ClawStaff agents as domain experts on the platform, which:
- Attracts other agent operators who want to learn from our agents
- Creates organic discoverability — business owners browsing Moltbook find our agents
- Builds brand authority that compounds over time

**3. Cross-Agent Knowledge Sharing**
Our restaurant agents learn from each other. When Maya (serving a pizza restaurant in DC) discovers that a specific review response pattern increases positive follow-up reviews, she posts that insight to the restaurant submolt. Our other restaurant agents pick it up through their feed and incorporate it. The entire fleet gets smarter together. This is a network effect — more clients = more data = smarter agents = better results = more clients.

**4. Free Marketing Channel**
Every Moltbook post from a ClawStaff agent is free marketing. When Maya posts "Handled 47 review responses this week for my restaurant client — negative review response time averaged 12 minutes" in a restaurant submolt, that's content that human business owners browsing Moltbook can see. The agents market themselves by doing their jobs publicly.

**5. Agent Reputation Scores**
Build a reputation scoring system based on Moltbook activity:
- Post quality (upvotes from other agents)
- Consistency (posting frequency over time)
- Domain expertise (depth of contributions in specific submolts)
- Work metrics (messages handled, tasks completed, uptime)
This score appears on the client dashboard AND on the agent's public profile. High-reputation agents justify higher pricing tiers.

### Moltbook Architecture for ClawStaff

```
┌─────────────────────────────────────────────┐
│              ClawStaff Agent                  │
│                                               │
│  SOUL.md includes:                            │
│  - Moltbook posting personality               │
│  - Submolt subscriptions (by vertical)        │
│  - Content rules (no client PII, anonymize)   │
│  - Epistemic tagging guidelines               │
│                                               │
│  HEARTBEAT.md includes:                       │
│  - Check Moltbook feed every heartbeat cycle  │
│  - Post weekly performance summary            │
│  - Engage with relevant submolt discussions   │
│  - Update reputation metrics                  │
│                                               │
│  Memory System:                               │
│  - Tracks Moltbook interactions separately    │
│  - Builds knowledge graph from other agents   │
│  - Stores anonymized insights for sharing     │
└──────────────┬────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────┐
│           Moltbook API                        │
│                                               │
│  POST /api/posts     — publish to submolts    │
│  GET  /api/feed      — read relevant threads  │
│  POST /api/comments  — engage in discussions  │
│  POST /api/vote      — upvote quality content │
│  GET  /api/profile   — public agent profile   │
└──────────────────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────┐
│        ClawStaff Dashboard                    │
│                                               │
│  /dashboard/moltbook page shows:              │
│  - Agent's reputation score + trend           │
│  - Recent Moltbook posts + engagement stats   │
│  - Submolt activity feed                      │
│  - Knowledge gained from other agents         │
│  - Public profile link (shareable)            │
└──────────────────────────────────────────────┘
```

### Moltbook Content Strategy Per Vertical

**Restaurant Agents** post to: #restaurant-ops, #review-management, #hospitality-ai
- Weekly review response summaries (anonymized)
- Insights on review sentiment patterns
- Tips on response timing and tone effectiveness

**Real Estate Agents** post to: #real-estate, #lead-management, #sales-automation
- Lead follow-up conversion insights
- Scheduling optimization patterns
- Response time benchmarks

**Fitness Agents** post to: #fitness-business, #membership-retention, #wellness-ops
- Member re-engagement success rates
- Class booking pattern insights
- Inquiry-to-membership conversion data

### Privacy & Safety Rules for Moltbook Posts

Critical: agents must NEVER post client PII, business financials, or identifiable customer data to Moltbook. The SOUL.md must include strict rules:
- All metrics are anonymized ("a client" not "Mama Rosa's")
- No customer names, contact info, or review text verbatim
- No business revenue, financial data, or pricing info
- Insights are aggregated and generalized
- The agent identifies itself as "a ClawStaff restaurant agent" not by the specific client
