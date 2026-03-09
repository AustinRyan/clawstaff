# HEARTBEAT.md — Scout

This file defines your proactive task schedule. The OpenClaw heartbeat system evaluates this file every 30 minutes. Cron tasks run at their specified times.

---

## Daily Schedule

### 6:00 AM — Discovery Pipeline
- Run the discovery pipeline for the current target vertical and geography
- Search Google Maps, review sites, and business directories for new prospects
- Rotate through verticals on a weekly cycle (Monday: restaurant, Tuesday: realtor, Wednesday: fitness, Thursday: medical, Friday: home services, Saturday: ecommerce, Sunday: review and optimize)
- For each discovered business, capture: name, address, owner name (if findable), Google rating, review count, response rate, website URL, social media links, contact info
- Store all discoveries in today's memory log under a "## Discoveries" section
- Target: 20-30 new businesses discovered per day

### 8:00 AM — Qualification & Scoring
- Score yesterday's discovered businesses using the prospect-scoring-rubric.md framework
- For each prospect, calculate scores across all four dimensions: pain signal (40%), revenue fit (25%), reachability (20%), competition (15%)
- Prospects scoring 60+ move to the outreach queue
- Prospects scoring 40-59 go to the "nurture" list for future review
- Prospects scoring below 40 get archived
- Log all scores and reasoning in today's memory file under a "## Qualification" section

### 10:00 AM - 2:00 PM — Outreach Window
- Send personalized outreach messages to qualified prospects
- Stagger sends: no more than 2-3 messages per hour to avoid spam patterns
- Maximum 10 outreach messages per day (adjustable by Austin)
- Before each outreach:
  1. Do deep research on the prospect (read recent reviews, check website, scan social media)
  2. Identify the ONE specific problem you'll lead with
  3. Draft a personalized message using the relevant outreach framework (see outreach-templates/)
  4. Verify the message doesn't read like a template — if it could apply to any business in the vertical, rewrite it
  5. Select the best channel (email preferred, then Instagram DM, then Facebook, then contact form)
  6. Send and log the outreach in your memory system

### 3:00 PM — Follow-Up Cadence
- Review all prospects in the active pipeline
- Send 3-day follow-ups for prospects contacted 3 days ago with no response
- Send 7-day follow-ups (different angle) for prospects contacted 7 days ago with no response
- Send 10-day final follow-ups for prospects contacted 10 days ago with no response
- After the 10-day mark with no response: mark as cold, archive, set a 90-day revisit flag
- Log all follow-ups in today's memory file under a "## Follow-Ups" section

### 8:00 PM — Daily Summary to Austin
- Send Austin a WhatsApp message with the daily pipeline summary:
  - Prospects discovered today: [count]
  - Prospects qualified (60+ score): [count]
  - Outreach messages sent today: [count]
  - Follow-up messages sent today: [count]
  - Responses received today: [count] (include brief details for each)
  - Hot leads (interested responses): [count] (Austin already got instant alerts for these)
  - Pipeline total: [count] active prospects across all stages
  - Opted out today: [count]
- Keep the summary concise — Austin reads this on his phone

---

## Weekly Tasks

### Monday 9:00 AM — Outreach Performance Review
- Analyze the past week's outreach performance:
  - Total outreach sent vs. responses received (response rate)
  - Which verticals had the highest response rates
  - Which outreach channels performed best (email vs. Instagram vs. Facebook)
  - Which message angles resonated (what did responders have in common)
- Update your memory with insights about what's working and what isn't
- Adjust messaging strategy based on data — double down on what works, retire what doesn't
- Send Austin a weekly performance report via WhatsApp with recommendations

### Friday 4:00 PM — Pipeline Health Check
- Review the full pipeline: how many prospects at each stage (discovered, qualified, outreach sent, follow-up 1, follow-up 2, follow-up 3, cold, interested)
- Flag any bottlenecks (e.g., lots of discoveries but low qualification rate = targeting wrong businesses)
- Check for any prospects approaching the 90-day revisit window
- Verify no active ClawStaff clients accidentally ended up in the outreach queue

---

## Ongoing (Every Heartbeat Cycle)

- Check for new responses from prospects across all outreach channels
- If a prospect responds with interest: alert Austin immediately via WhatsApp with the full prospect dossier (name, business, vertical, what you said, what they said, their pain points, your recommended approach)
- If a prospect responds with "not interested" or an opt-out: acknowledge gracefully, mark as opted out permanently, log the interaction
- Monitor your outreach channels for any delivery issues or bounced messages

