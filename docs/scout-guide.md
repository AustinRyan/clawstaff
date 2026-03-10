# Scout Prospect Discovery Guide

Scout is ClawStaff's prospect discovery system. It finds businesses that could benefit from an AI agent, qualifies them, researches their pain points, and drafts personalized outreach -- all without sending anything automatically.

If you are using ClawStaff as an open-source tool, Scout helps you find businesses to pitch your AI agent services to.

## How Scout Works

Scout operates in four stages:

```
Discovery  -->  Qualification  -->  Research  -->  Outreach Drafting
 (find)          (score)          (deep-dive)      (write messages)
```

### Stage 1: Discovery

Scout searches for businesses using the Google Places API, filtered by vertical and geography.

For example: "Find restaurants within 20 miles of Austin, TX" or "Find dental practices in the DC metro area."

The search returns business listings with name, address, phone, website, rating, review count, and category information.

### Stage 2: Qualification

Each discovered prospect is scored 0-100 based on four weighted signals:

| Signal | Weight | What It Measures |
|--------|--------|------------------|
| Pain Signals | 40% | Evidence that the business has problems an AI agent could solve |
| Revenue Fit | 25% | Is this business the right size and type to afford the service? |
| Reachability | 20% | Can we actually contact them? Do they have a website, email, social media? |
| Competition | 15% | Are they already using an AI agent or competing service? |

**Pain signals by vertical:**

| Vertical | Pain Signals Checked |
|----------|---------------------|
| Restaurant | Unresponded reviews (especially negative), no online reservation system, slow response to inquiries, inconsistent review response quality |
| Realtor | Slow lead response time, no follow-up system visible, leads falling through cracks (evidenced by reviews mentioning "never heard back") |
| Fitness | No online booking, members mentioning poor communication in reviews, no visible re-engagement efforts |
| Medical | High no-show mentions in reviews, no appointment confirmation system, patients mentioning difficulty scheduling |
| Home Services | Unresponded reviews, no visible estimate follow-up, "never called back" mentions in reviews, no seasonal marketing |
| E-commerce | Slow support responses, abandoned cart with no recovery, low review count relative to apparent sales volume |

### Stage 3: Research

For qualified prospects (score above the threshold), Scout performs a deep-dive:

- **Review analysis:** Reads recent Google reviews and Yelp reviews to identify specific pain points, recurring themes, and sentiment patterns
- **Website audit:** Checks the business website for booking capabilities, contact forms, chat widgets, response time claims
- **Social media scan:** Checks Instagram, Facebook, and other social presence for engagement levels and response patterns

This research produces a prospect profile with specific, concrete pain points that can be referenced in outreach.

### Stage 4: Outreach Drafting

Scout generates personalized outreach messages for each qualified prospect. Messages are drafted for multiple channels:

| Channel | Format | Notes |
|---------|--------|-------|
| Email | Subject line + body | Professional, leads with the pain point |
| Instagram DM | Short message | Casual, references their content |
| Facebook message | Short message | References their page or reviews |
| Contact form | Form-length message | Adapted for typical contact form fields |

Each draft is personalized with:

- The specific business name
- A concrete pain point identified during research
- The vertical-appropriate value proposition
- A soft call to action (never hard-sell)

**All outreach stays in draft mode by default.** Nothing is sent automatically. Every message must be reviewed and approved before sending.

## Follow-Up Cadence

Once a prospect has been contacted (manually, after approving the draft), Scout tracks the follow-up sequence:

| Day | Action |
|-----|--------|
| Day 0 | Initial outreach sent |
| Day 3 | First follow-up -- different angle, add value |
| Day 7 | Second follow-up -- reference a specific insight |
| Day 10 | Final follow-up -- leave the door open |
| After Day 10 | Mark as cold (no further contact) |

Prospects who respond are moved through the pipeline stages:

```
discovered -> qualified -> outreach_queued -> contacted -> follow_up_1 -> follow_up_2 -> follow_up_3 -> responded | cold
```

Response categories: `interested`, `not_interested`, `pricing_question`, `question`, `unsubscribe`, `out_of_office`.

## Dashboard: /dashboard/scout

The Scout page displays:

- **Pipeline View:** Prospects organized by stage with counts at each stage
- **Prospect Cards:** Each prospect shows name, location, vertical, qualification score, and score breakdown
- **Score Breakdown:** Visual breakdown of the four scoring signals (pain, revenue, reachability, competition)
- **Outreach History:** Timeline of contacts and follow-ups for each prospect
- **Discovery Stats:** How many prospects found, qualified, contacted this week
- **Cost Tracking:** Running total of API costs for the current day

## Cost Tracking

Scout has a hard daily limit of $5 on API calls. This covers:

- Google Places API searches
- Tavily web research API calls
- Any other external API usage

The cost tracker runs in real-time and stops making API calls when the daily limit is reached. This prevents runaway costs during broad discovery searches.

## Configuration

### Required Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GOOGLE_PLACES_API_KEY` | Yes | Google Places API key for business discovery |
| `TAVILY_API_KEY` | Yes | Tavily API key for web research and analysis |

### Optional Configuration

- **Vertical focus:** Which verticals to search for (defaults to all supported verticals)
- **Geography:** Target area for discovery searches (city, state, radius)
- **Score threshold:** Minimum qualification score to proceed to research (default: 50)
- **Daily API budget:** Maximum daily spend on API calls (default: $5)

## Pipeline Stages Explained

| Stage | Description |
|-------|-------------|
| `discovered` | Found via Google Places search, basic info collected |
| `qualified` | Scored and meets the threshold, ready for research |
| `outreach_queued` | Research complete, outreach drafts generated, waiting for review |
| `contacted` | Initial outreach approved and sent |
| `follow_up_1` | Day 3 follow-up |
| `follow_up_2` | Day 7 follow-up |
| `follow_up_3` | Day 10 final follow-up |
| `responded` | Prospect replied (categorized by response type) |
| `cold` | No response after full follow-up cadence |
| `client` | Converted to a paying client |

## Privacy and Ethics

Scout is designed with clear ethical boundaries:

- **No auto-sending.** Every outreach message is a draft that requires manual approval. The human operator decides what gets sent and when.
- **No deception.** Outreach messages do not pretend to be from a human or hide that the service involves AI. The value proposition is straightforward.
- **Unsubscribe compliance.** If a prospect responds asking to stop being contacted, they are immediately marked and excluded from all future outreach.
- **Data minimization.** Scout only collects publicly available information (Google reviews, public website data, social media profiles). No scraping of private data.

## Example Workflow

1. Configure Scout with your target vertical and geography
2. Scout discovers 150 restaurants within 25 miles of your city
3. Qualification scoring reduces this to 40 prospects with scores above 50
4. Deep research on the top 20 produces detailed pain point profiles
5. Scout generates personalized outreach drafts for each (email + Instagram DM)
6. You review each draft, adjust as needed, and send
7. Scout tracks follow-ups on Day 3, Day 7, and Day 10
8. Prospects who respond are flagged for direct engagement
9. Non-responders are marked cold after the full cadence

## Key Source Files

| File | Purpose |
|------|---------|
| `src/app/dashboard/scout/page.tsx` | Dashboard Scout page with pipeline view |
