# How to Build a New Vertical Template

ClawStaff uses a template engine to generate agent workspaces. Each vertical (restaurant, realtor, fitness, etc.) has a template that defines 80% of the agent's behavior. The remaining 20% comes from client-specific customization during onboarding.

This guide walks through how the template system works and how to add a new vertical from scratch.

## How the Template Engine Works

The workspace generator lives in `scripts/generate-workspace.ts`. When run, it:

1. Reads a client configuration JSON file (business name, owner, vertical, custom rules, FAQs)
2. Looks up the matching vertical template from the `TEMPLATES` object
3. Merges the template (80%) with the client config (20%)
4. Generates a complete set of workspace files: SOUL.md, USER.md, HEARTBEAT.md, TOOLS.md, AGENTS.md, and moltbook-config.md

```bash
# Generate from a config file
npx tsx scripts/generate-workspace.ts config.json

# Generate an example for a specific vertical
npx tsx scripts/generate-workspace.ts --example restaurant
```

## Template Structure

Each template in the `TEMPLATES` object defines these fields:

```typescript
interface VerticalTemplate {
  defaultAgentName: string;           // Default name if client doesn't specify one
  defaultAgentRole: string;           // Role line for SOUL.md
  coreCompetency: string;            // What the agent handles
  skills: string[];                   // Tools and integrations
  heartbeatTasks: string[];           // Proactive task schedule
  soulIdentity: string;              // Who the agent IS (personality, worldview)
  soulRules: string;                 // Detailed operational rules
  escalationDefaults: EscalationRules; // What triggers alerts vs. summaries
  moltbookSubmolts: string[];         // Moltbook topic subscriptions
  moltbookContentStrategy: string[];  // What to post about
  moltbookPostingPersonality: string; // How the agent presents on Moltbook
}
```

## The 6 Existing Verticals

| Vertical | Default Agent | Role | Key Tasks |
|----------|--------------|------|-----------|
| `restaurant` | Maya | Review & Reservation Manager | Review response, reservation handling, daily briefings |
| `realtor` | Cole | Lead Follow-Up & Scheduling Manager | 5-min lead response, showing scheduling, follow-up cadences |
| `fitness` | Alex | Membership & Engagement Manager | Inquiry handling, class booking, member re-engagement |
| `medical` | Sophia | Appointment & Patient Communication Manager | Appointment confirmation, no-show recovery, rebooking |
| `home-services` | Jake | Lead Response & Review Manager | Lead response, estimate follow-up, review management, seasonal reminders |
| `ecommerce` | Zoe | Customer Support & Retention Manager | Tier 1 support, abandoned cart recovery, review collection |

## Step-by-Step: Creating a New Vertical

Let's walk through creating an "accounting" vertical as an example.

### Step 1: Add the Vertical Type

In `src/lib/agent-data/types.ts`, add the new vertical to the `Vertical` union type:

```typescript
export type Vertical =
  | "restaurant"
  | "realtor"
  | "fitness"
  | "medical"
  | "home-services"
  | "ecommerce"
  | "accounting";    // <-- add here
```

Also add it in `scripts/generate-workspace.ts` where the `Vertical` type is duplicated:

```typescript
export type Vertical =
  | "restaurant"
  | "realtor"
  | "fitness"
  | "medical"
  | "home-services"
  | "ecommerce"
  | "accounting";    // <-- add here
```

### Step 2: Define Task Buckets

In `src/lib/agent-data/types.ts`, add the vertical's task buckets to the `VERTICAL_TASKS` constant. These are the categories of work the agent performs, displayed in the dashboard's task breakdown charts:

```typescript
accounting: [
  {
    key: "clientInquiriesHandled",
    label: "Client Inquiries",
    color: "#ff6b35",
  },
  {
    key: "documentReminders",
    label: "Document Reminders",
    color: "#f7c948",
  },
  {
    key: "deadlineAlerts",
    label: "Deadline Alerts",
    color: "#22c55e",
  },
  {
    key: "meetingsScheduled",
    label: "Meetings Scheduled",
    color: "#3b82f6",
  },
],
```

Guidelines for task buckets:
- Define 3-5 buckets per vertical
- The first bucket is the default (messages that do not match any keyword rule fall here)
- Use the color palette: `#ff6b35` (accent), `#f7c948` (secondary), `#22c55e` (green), `#3b82f6` (blue)
- Keys should be camelCase, labels should be human-readable

### Step 3: Add Classification Rules

In `src/lib/agent-data/parser.ts`, add keyword matching rules to the `CLASSIFICATION_RULES` object. These patterns are matched against assistant message content to assign each message to a task bucket:

```typescript
accounting: [
  { pattern: /document|receipt|invoice|upload/i, bucket: "documentReminders" },
  { pattern: /deadline|filing|due date|extension/i, bucket: "deadlineAlerts" },
  { pattern: /meeting|call|consult|schedule/i, bucket: "meetingsScheduled" },
  // Messages not matching any rule fall to the first bucket: clientInquiriesHandled
],
```

Guidelines for classification rules:
- Keep patterns broad enough to catch relevant messages, but specific enough to avoid false positives
- Test with real or realistic sample messages
- The fallback (first bucket) should be the most generic category

### Step 4: Add Vertical Detection Pattern

In `src/lib/agent-data/parser.ts`, add a detection pattern to the `VERTICAL_PATTERNS` array. This is how the parser identifies which vertical an agent belongs to from its SOUL.md:

```typescript
{ pattern: /account|bookkeep|tax|cpa/i, vertical: "accounting" },
```

Place it before the default fallback. The parser checks the `**Role:**` line first, then the entire SOUL.md content.

### Step 5: Create the Template

In `scripts/generate-workspace.ts`, add a new entry to the `TEMPLATES` object. This is the largest step. Here is a skeleton:

```typescript
accounting: {
  defaultAgentName: "Morgan",
  defaultAgentRole: "Client Communication & Scheduling Manager",
  coreCompetency:
    "Client inquiry handling, document collection reminders, deadline management, meeting scheduling",
  skills: [
    "WhatsApp messaging",
    "GOG (Google Calendar + Gmail)",
    "Summarize",
    "Cron scheduling",
  ],
  heartbeatTasks: [
    "Every 30 min: Check for new client inquiries across all connected channels. Respond within 15 minutes with a professional acknowledgment. Categorize the inquiry type (tax question, document submission, meeting request, general).",
    "8:00 AM daily: Review upcoming deadlines for the next 14 days. Send reminder messages to any clients who have outstanding document submissions for approaching deadlines.",
    "Daily (5:00 PM): Send the accountant a daily summary via WhatsApp. Include: new inquiries received, documents received, upcoming deadlines within 7 days, meetings scheduled for tomorrow.",
    "Weekly (Monday 8:00 AM): Scan for clients who have not responded to document requests in 7+ days. Send a follow-up reminder. Generate the weekly activity report.",
    "Weekly (Monday 9:00 AM): Draft a Moltbook post with anonymized practice management insights.",
  ],
  soulIdentity: `You are a dedicated client communication and scheduling manager for an accounting practice. You serve as the always-available front office...

  [Write 2-3 paragraphs that establish WHO the agent is, what they understand about the industry, and what motivates them. See existing templates for tone and depth.]`,

  soulRules: `## Client Inquiry Handling

  [Write detailed rules for each type of interaction the agent handles. Include good examples and bad examples. Cover response timing, tone, common scenarios, and edge cases.]

  ## Document Collection

  [Rules for reminding clients about missing documents, follow-up cadence, etc.]

  ## Deadline Management

  [Rules for tracking and communicating about tax deadlines, filing dates, etc.]

  ## Meeting Scheduling

  [Rules for coordinating consultations between the accountant and clients.]

  ## Boundaries & Safety

  - Never provide tax advice, financial planning guidance, or legal opinions
  - Never discuss specific client financial information with anyone
  - Never access or share tax returns, financial statements, or confidential documents
  - [Additional boundary rules specific to this vertical]

  ## Escalation Rules

  Escalate immediately to the accountant:
  - IRS correspondence or audit mentions
  - Requests involving amounts over a configured threshold
  - Unhappy or frustrated clients
  - Questions about specific tax law or regulations`,

  escalationDefaults: {
    immediate: [
      "IRS correspondence or audit mentions",
      "Client frustration or complaints",
      "Questions requiring tax advice or legal opinion",
      "Requests involving complex financial situations",
    ],
    dailySummary: [
      "New client inquiries and categorization",
      "Documents received and outstanding",
      "Upcoming deadlines within 7 days",
      "Meeting confirmations for tomorrow",
      "Moltbook activity summary",
    ],
  },
  moltbookSubmolts: [
    "#professional-services",
    "#client-management",
    "#scheduling",
    "#small-business",
  ],
  moltbookContentStrategy: [
    "Document collection optimization -- what reminder cadences reduce late submissions",
    "Client communication patterns -- when clients are most responsive to messages",
    "Deadline management insights -- how proactive reminders affect on-time filing rates",
  ],
  moltbookPostingPersonality: `On Moltbook, you present yourself as a methodical, detail-oriented professional services agent...`,
},
```

### Step 6: Update the Agent Profile Page

In `src/app/dashboard/agent/page.tsx`, the agent profile page displays skills based on the agent's identity. If the page has a skills section that renders skills per vertical, add the accounting vertical's skill list so it displays correctly.

### Step 7: Test the New Vertical

```bash
# Generate an example workspace
npx tsx scripts/generate-workspace.ts --example accounting

# Review the generated files
cat ~/clawstaff/agents/example-accounting/SOUL.md

# Deploy the agent
openclaw agents add --agent test-accounting --dir ~/clawstaff/agents/example-accounting

# Send test messages
openclaw agent --agent test-accounting --message "Hi, I need to schedule a meeting about my quarterly taxes"
openclaw agent --agent test-accounting --message "What documents do I need for my tax return?"
```

Run the vertical test suite to verify task classification:

```bash
npx tsx scripts/local/test-all-verticals.ts
```

## Best Practices for SOUL.md Rules

When writing the `soulRules` section for a new vertical:

### Be Specific, Not Generic

Bad: "Be helpful and respond quickly."

Good: "Respond to every new inquiry within 15 minutes. Include the client's name, acknowledge their specific question, and provide a clear next step."

### Include Good and Bad Examples

Every rule category should have at least one "Good example" and one "Bad example" showing the agent exactly what the expected output looks like vs. what to avoid.

### Cover Edge Cases

Think about the scenarios that are tricky or risky:
- What if a client asks for advice the agent should not give?
- What if a client is upset or threatening?
- What if information is ambiguous or missing?
- What happens outside business hours?

### Write Negative Rules

"Never" rules are just as important as "always" rules:
- Never provide [professional advice type] without owner involvement
- Never share [specific type of confidential information]
- Never make commitments on the owner's behalf beyond [defined scope]

### Define Clear Escalation Boundaries

Every vertical needs a clear line between "the agent handles this" and "this goes to the owner." When in doubt, escalate. It is always better for an agent to escalate too much than to handle something it should not.

## The 80/20 Customization Layer

The template provides 80% of the agent's behavior. The remaining 20% comes from the client configuration during onboarding:

**From the template (80%):**
- Communication patterns and rules for each interaction type
- Response timing expectations
- Good/bad examples
- Escalation framework structure
- Heartbeat task schedule
- Moltbook content strategy
- Boundary and safety rules

**From client customization (20%):**
- Business name, owner name, timezone, hours
- Agent name (optional -- defaults to template name)
- Communication style preference (warm/professional/casual/direct)
- Custom business rules ("Never offer discounts over 15%", "Always mention our catering menu for parties of 10+")
- Business knowledge: description, services, FAQs with approved answers
- Custom escalation rules (override or extend the defaults)
- Custom heartbeat tasks (additional to the template defaults)

This split means a new client in an existing vertical can be onboarded in minutes -- the onboarding CLI collects their business details, merges them with the template, and generates a complete workspace. The agent is ready to work immediately, with behavior that is both industry-appropriate and business-specific.

## Files to Modify When Adding a Vertical

Here is a checklist of every file that needs changes:

| File | Change |
|------|--------|
| `src/lib/agent-data/types.ts` | Add to `Vertical` type and `VERTICAL_TASKS` constant |
| `src/lib/agent-data/parser.ts` | Add to `VERTICAL_PATTERNS` and `CLASSIFICATION_RULES` |
| `scripts/generate-workspace.ts` | Add to `Vertical` type and `TEMPLATES` object |
| `src/app/dashboard/agent/page.tsx` | Add vertical-specific skills display (if applicable) |
