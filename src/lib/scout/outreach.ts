// ─────────────────────────────────────────────
// Scout Outreach & Follow-Up System
//
// Pipeline: research prospect → compose message → schedule send →
//           follow up on cadence → handle responses → report to operator.
// Channel sending is mocked (interface-ready for GOG/Agent Browser).
// ─────────────────────────────────────────────

import type {
  DiscoveredBusiness,
  Vertical,
  StoredProspect,
  ProspectState,
} from "./discovery";
import { ProspectStore } from "./discovery";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export type OutreachChannel = "email" | "instagram_dm" | "facebook_msg" | "contact_form";

export type ResponseCategory =
  | "interested"
  | "not_interested"
  | "question"
  | "pricing_question"
  | "out_of_office"
  | "unsubscribe";

export type FollowUpStage = "day_3" | "day_7" | "day_10";

export interface ContactChannels {
  email: string | null;
  instagram: string | null;
  facebook: string | null;
  contactForm: string | null;
}

export interface ProspectDossier {
  prospectId: string;
  businessName: string;
  ownerName: string | null;
  vertical: Vertical;
  painPoints: string[];
  specificEvidence: string[];
  contactChannels: ContactChannels;
  bestOutreachChannel: OutreachChannel;
  recommendedAngle: string;
  researchedAt: string;
}

export interface ComposedMessage {
  prospectId: string;
  channel: OutreachChannel;
  subject: string | null; // only for email
  body: string;
  wordCount: number;
  composedAt: string;
}

export interface FollowUpMessage {
  prospectId: string;
  stage: FollowUpStage;
  channel: OutreachChannel;
  subject: string | null;
  body: string;
  wordCount: number;
  composedAt: string;
}

export interface ScheduledSend {
  prospectId: string;
  message: ComposedMessage | FollowUpMessage;
  scheduledFor: string; // ISO 8601
  sent: boolean;
  sentAt: string | null;
  deliveryStatus: "pending" | "sent" | "delivered" | "bounced" | "failed";
}

export interface IncomingResponse {
  prospectId: string;
  channel: OutreachChannel;
  body: string;
  receivedAt: string;
}

export interface CategorizedResponse {
  response: IncomingResponse;
  category: ResponseCategory;
  confidence: number; // 0-1
  suggestedReply: string | null;
  requiresOperatorAlert: boolean;
}

export interface WhatsAppAlert {
  recipientId: string; // operator's WhatsApp
  message: string;
  sentAt: string;
  alertType: "hot_lead" | "daily_report" | "opt_out" | "issue";
}

export interface OutreachReport {
  date: string;
  discovered: number;
  discoveredByVertical: Record<string, number>;
  qualified: number;
  outreachSent: number;
  followUpsSent: number;
  responsesReceived: number;
  responseBreakdown: Record<ResponseCategory, number>;
  hotLeads: Array<{
    businessName: string;
    ownerName: string | null;
    score: number;
    summary: string;
    responsePreview: string;
  }>;
  pipelineTotal: number;
}

// ─────────────────────────────────────────────
// Channel Sender Interface (mock-ready)
// ─────────────────────────────────────────────

export interface IChannelSender {
  sendEmail(to: string, subject: string, body: string): Promise<{ messageId: string; status: string }>;
  sendInstagramDM(handle: string, body: string): Promise<{ messageId: string; status: string }>;
  sendFacebookMessage(pageUrl: string, body: string): Promise<{ messageId: string; status: string }>;
  submitContactForm(formUrl: string, body: string, fromEmail: string): Promise<{ status: string }>;
}

export interface IWhatsAppSender {
  send(recipientId: string, message: string): Promise<{ messageId: string }>;
}

export interface IResponseMonitor {
  checkForResponses(): Promise<IncomingResponse[]>;
}

// ─────────────────────────────────────────────
// Case Studies & Moltbook Links Registry
// ─────────────────────────────────────────────

export interface CaseStudy {
  vertical: Vertical;
  headline: string;
  url: string;
}

export interface MoltbookProfile {
  vertical: Vertical;
  agentName: string;
  url: string;
}

const CASE_STUDIES: CaseStudy[] = [];
const MOLTBOOK_PROFILES: MoltbookProfile[] = [];

export function getCaseStudy(vertical: Vertical): CaseStudy | null {
  return CASE_STUDIES.find((cs) => cs.vertical === vertical) ?? null;
}

export function getMoltbookProfile(vertical: Vertical): MoltbookProfile | null {
  return MOLTBOOK_PROFILES.find((mp) => mp.vertical === vertical) ?? null;
}

export function registerCaseStudy(cs: CaseStudy): void {
  CASE_STUDIES.push(cs);
}

export function registerMoltbookProfile(mp: MoltbookProfile): void {
  MOLTBOOK_PROFILES.push(mp);
}

// ─────────────────────────────────────────────
// Prospect Researcher
// ─────────────────────────────────────────────

export interface IWebResearcher {
  fetchRecentReviews(businessId: string, count: number): Promise<Array<{ rating: number; text: string; date: string; ownerReplied: boolean }>>;
  scrapeWebsite(url: string): Promise<{ ownerName: string | null; aboutText: string | null; contactEmail: string | null }>;
  checkSocialActivity(handle: string, platform: "instagram" | "facebook"): Promise<{ isActive: boolean; followerCount: number; lastPostDate: string | null }>;
}

export class ProspectResearcher {
  constructor(private researcher: IWebResearcher) {}

  async buildDossier(prospect: StoredProspect): Promise<ProspectDossier> {
    const b = prospect.business;

    // Gather all contact channels
    const contactChannels: ContactChannels = {
      email: b.ownerEmail,
      instagram: b.socialLinks.instagram ?? null,
      facebook: b.socialLinks.facebook ?? null,
      contactForm: b.contactFormUrl,
    };

    // Rank pain points by severity
    const painPoints = this.rankPainPoints(b);

    // Build specific evidence list
    const specificEvidence = this.buildEvidence(b);

    // Determine best outreach channel
    const bestOutreachChannel = this.selectBestChannel(contactChannels, b);

    // Generate recommended angle
    const recommendedAngle = this.generateAngle(b, painPoints);

    return {
      prospectId: prospect.id,
      businessName: b.name,
      ownerName: b.ownerName,
      vertical: b.vertical,
      painPoints,
      specificEvidence,
      contactChannels,
      bestOutreachChannel,
      recommendedAngle,
      researchedAt: new Date().toISOString(),
    };
  }

  private rankPainPoints(b: DiscoveredBusiness): string[] {
    const points: Array<{ text: string; severity: number }> = [];

    // Unresponded negative reviews — always highest severity
    if (b.reviews.unrespondedNegative > 0) {
      points.push({
        text: `${b.reviews.unrespondedNegative} negative reviews sitting unanswered on Google`,
        severity: 90 + Math.min(b.reviews.unrespondedNegative, 10),
      });
    }

    // Low response rate
    if (b.reviews.responseRate < 0.1 && b.reviews.totalReviews >= 30) {
      points.push({
        text: `Only ${(b.reviews.responseRate * 100).toFixed(0)}% of ${b.reviews.totalReviews} reviews have owner responses`,
        severity: 85,
      });
    } else if (b.reviews.responseRate < 0.3 && b.reviews.totalReviews >= 30) {
      points.push({
        text: `Low review response rate (${(b.reviews.responseRate * 100).toFixed(0)}%)`,
        severity: 60,
      });
    }

    // Pain keywords from reviews
    for (const keyword of b.reviews.painKeywordsInReviews) {
      points.push({
        text: `Customers reporting: "${keyword}"`,
        severity: 75,
      });
    }

    // No online booking (vertical-dependent severity)
    if (!b.hasOnlineBooking) {
      const bookingSeverity = b.vertical === "medical" ? 70 : b.vertical === "fitness" ? 65 : 40;
      points.push({
        text: "No online booking system — customers must call during business hours",
        severity: bookingSeverity,
      });
    }

    // No website
    if (!b.websiteUrl) {
      points.push({
        text: "No website — missing basic online presence",
        severity: 50,
      });
    }

    return points
      .sort((a, b) => b.severity - a.severity)
      .map((p) => p.text);
  }

  private buildEvidence(b: DiscoveredBusiness): string[] {
    const evidence: string[] = [];

    if (b.reviews.unrespondedNegative > 0) {
      evidence.push(
        `${b.reviews.unrespondedNegative} unresponded negative reviews on Google (out of ${b.reviews.totalReviews} total)`
      );
    }

    if (b.reviews.responseRate < 0.3) {
      const responded = b.reviews.ownerRespondedCount;
      evidence.push(
        `Owner has responded to only ${responded} of ${b.reviews.totalReviews} reviews (${(b.reviews.responseRate * 100).toFixed(0)}% response rate)`
      );
    }

    if (b.reviews.recentReviews30d > 0 && b.reviews.responseRate < 0.2) {
      evidence.push(
        `${b.reviews.recentReviews30d} new reviews in the last 30 days, most without owner responses`
      );
    }

    for (const keyword of b.reviews.painKeywordsInReviews.slice(0, 3)) {
      evidence.push(`Customer review quote: "${keyword}"`);
    }

    if (!b.hasOnlineBooking && b.vertical === "medical") {
      evidence.push("No online appointment booking on website");
    }

    return evidence;
  }

  private selectBestChannel(channels: ContactChannels, b: DiscoveredBusiness): OutreachChannel {
    // Email is always preferred if available
    if (channels.email) return "email";

    // Instagram DM if <10K followers
    if (channels.instagram && (b.socialLinks.instagramFollowers ?? 0) < 10000) {
      return "instagram_dm";
    }

    // Facebook if active
    if (channels.facebook && b.socialLinks.facebookActive) return "facebook_msg";

    // Contact form as last resort
    if (channels.contactForm) return "contact_form";

    // Fallback — shouldn't happen for qualified prospects (reachability > 0)
    return "email";
  }

  private generateAngle(b: DiscoveredBusiness, painPoints: string[]): string {
    if (painPoints.length === 0) return "general value proposition";

    const top = painPoints[0].toLowerCase();

    if (top.includes("negative review") || top.includes("unanswered")) {
      return "lead with unresponded negative reviews — visible to every potential customer";
    }
    if (top.includes("response rate")) {
      return "lead with low review response rate — missing opportunities to win back unhappy customers";
    }
    if (top.includes("booking") || top.includes("appointment")) {
      return "lead with no online booking — patients/customers can't self-schedule";
    }
    if (top.includes("reporting") || top.includes("couldn't reach")) {
      return "lead with customer complaints about reachability";
    }

    return `lead with: ${painPoints[0]}`;
  }
}

// ─────────────────────────────────────────────
// Mock Web Researcher
// ─────────────────────────────────────────────

export class MockWebResearcher implements IWebResearcher {
  async fetchRecentReviews(businessId: string, count: number) {
    // Return realistic mock review data
    return Array.from({ length: Math.min(count, 10) }, (_, i) => ({
      rating: i < 3 ? 2 + i : 4 + (i % 2),
      text: i < 3
        ? ["Food was cold and no one cared", "Waited 45 minutes, terrible service", "Called twice, no answer"][i]
        : ["Great food!", "Love this place", "Amazing experience", "Will come back", "Best in town", "Solid choice", "Recommend!"][i - 3],
      date: new Date(Date.now() - i * 3 * 86400000).toISOString().split("T")[0],
      ownerReplied: i > 5,
    }));
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async scrapeWebsite(url: string) {
    return { ownerName: null, aboutText: "A local business serving the community.", contactEmail: null };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async checkSocialActivity(handle: string, platform: "instagram" | "facebook") {
    return { isActive: true, followerCount: 2000, lastPostDate: new Date(Date.now() - 7 * 86400000).toISOString() };
  }
}

// ─────────────────────────────────────────────
// Outreach Composer
// ─────────────────────────────────────────────

const VERTICAL_OUTCOME_LINES: Record<Vertical, string> = {
  restaurant: "I run a service that gives your restaurant a dedicated AI assistant to handle reviews, reservations, and customer messages 24/7.",
  realtor: "I run a service that gives agents a dedicated AI assistant that follows up with every lead in under 5 minutes and books showings on your calendar.",
  fitness: "I run a service that gives studios a dedicated AI assistant to handle inquiries, send class reminders, and re-engage inactive members automatically.",
  medical: "I run a service that gives practices a dedicated AI assistant to confirm appointments, follow up with no-shows, and handle patient inquiries 24/7.",
  "home-services": "I run a service that gives contractors a dedicated AI assistant to respond to every inquiry, follow up on estimates, and manage reviews.",
  ecommerce: "I run a service that gives stores a dedicated AI assistant to handle customer support, recover abandoned carts, and collect reviews.",
};

const ANONYMIZED_PROOF: Record<Vertical, string> = {
  restaurant: "One of the restaurants I work with went from a 6% review response rate to 100% in the first week.",
  realtor: "One of the agents I work with cut their average lead response time from 2 hours to under 3 minutes.",
  fitness: "One of the studios I work with re-engaged 23 inactive members in the first month — 14 came back to class.",
  medical: "One of the dental practices I work with reduced no-shows by 35% in the first month.",
  "home-services": "One of the HVAC companies I work with converted 8 additional estimates in the first month from follow-ups alone.",
  ecommerce: "One of the stores I work with recovered 22 abandoned carts in the first month — $4,800 in revenue that would have been lost.",
};

const UNSUBSCRIBE_LINE = "\n\nIf you'd rather not hear from me, just reply 'unsubscribe' and I'll remove you immediately.";

export class OutreachComposer {
  compose(dossier: ProspectDossier): ComposedMessage {
    const greeting = this.buildGreeting(dossier);
    const painHook = this.buildPainHook(dossier);
    const solution = VERTICAL_OUTCOME_LINES[dossier.vertical];
    const proof = this.buildProof(dossier.vertical);
    const cta = "Free 2-week trial if you want to see it in action — want to give it a try?";
    const signoff = "— ClawStaff";

    const bodyParts = [greeting, painHook, solution, proof, cta, signoff];
    const isEmail = dossier.bestOutreachChannel === "email";

    if (isEmail) {
      bodyParts.push(UNSUBSCRIBE_LINE.trim());
    }

    const body = bodyParts.join(" ").replace(/\s+/g, " ").trim();
    const wordCount = body.split(/\s+/).length;

    return {
      prospectId: dossier.prospectId,
      channel: dossier.bestOutreachChannel,
      subject: isEmail ? this.buildSubject(dossier) : null,
      body,
      wordCount,
      composedAt: new Date().toISOString(),
    };
  }

  composeFollowUp(
    dossier: ProspectDossier,
    stage: FollowUpStage,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    previousMessage: string
  ): FollowUpMessage {
    let body: string;
    const isEmail = dossier.bestOutreachChannel === "email";

    switch (stage) {
      case "day_3":
        body = this.compose3DayFollowUp(dossier);
        break;
      case "day_7":
        body = this.compose7DayFollowUp(dossier);
        break;
      case "day_10":
        body = this.compose10DayFollowUp(dossier);
        break;
    }

    if (isEmail) {
      body += UNSUBSCRIBE_LINE;
    }

    body = body.replace(/\n{3,}/g, "\n\n").trim();

    return {
      prospectId: dossier.prospectId,
      stage,
      channel: dossier.bestOutreachChannel,
      subject: isEmail ? this.buildFollowUpSubject(dossier, stage) : null,
      body,
      wordCount: body.split(/\s+/).length,
      composedAt: new Date().toISOString(),
    };
  }

  composeResponse(
    dossier: ProspectDossier,
    incoming: CategorizedResponse
  ): ComposedMessage | null {
    let body: string;

    switch (incoming.category) {
      case "interested":
        body = this.composeInterestedReply(dossier);
        break;
      case "not_interested":
        body = this.composeNotInterestedReply(dossier);
        break;
      case "question":
        body = this.composeQuestionReply(dossier, incoming.response.body);
        break;
      case "pricing_question":
        body = this.composePricingReply(dossier);
        break;
      case "unsubscribe":
        body = this.composeUnsubscribeReply(dossier);
        break;
      case "out_of_office":
        return null; // don't reply to OOO
    }

    const isEmail = dossier.bestOutreachChannel === "email";

    return {
      prospectId: dossier.prospectId,
      channel: dossier.bestOutreachChannel,
      subject: isEmail ? `Re: ${this.buildSubject(dossier)}` : null,
      body: body!,
      wordCount: body!.split(/\s+/).length,
      composedAt: new Date().toISOString(),
    };
  }

  // ── Private: Initial Message Parts ──

  private buildGreeting(dossier: ProspectDossier): string {
    if (dossier.ownerName) {
      return `Hi ${dossier.ownerName.split(" ")[0]} —`;
    }
    return `Hi there —`;
  }

  private buildPainHook(dossier: ProspectDossier): string {
    if (dossier.specificEvidence.length > 0) {
      return `I was looking at ${dossier.businessName} on Google and noticed ${dossier.specificEvidence[0].toLowerCase()}.`;
    }
    if (dossier.painPoints.length > 0) {
      return `I noticed ${dossier.painPoints[0].toLowerCase()}.`;
    }
    return `I came across ${dossier.businessName} online and thought you might be interested in this.`;
  }

  private buildProof(vertical: Vertical): string {
    const caseStudy = getCaseStudy(vertical);
    if (caseStudy) {
      return `${caseStudy.headline}: ${caseStudy.url}`;
    }
    return ANONYMIZED_PROOF[vertical];
  }

  private buildSubject(dossier: ProspectDossier): string {
    if (dossier.ownerName) {
      return `Quick idea for ${dossier.businessName}`;
    }
    return `Quick idea for ${dossier.businessName}`;
  }

  // ── Private: Follow-Ups ──

  private compose3DayFollowUp(dossier: ProspectDossier): string {
    const name = dossier.ownerName ? dossier.ownerName.split(" ")[0] : "there";
    const proof = ANONYMIZED_PROOF[dossier.vertical];
    return `Hi ${name} — I reached out a few days ago about ${dossier.businessName}. Just wanted to share a quick stat: ${proof.toLowerCase()} Happy to set up a free 2-week trial if you want to see it in action. No worries if the timing isn't right.`;
  }

  private compose7DayFollowUp(dossier: ProspectDossier): string {
    const name = dossier.ownerName ? dossier.ownerName.split(" ")[0] : "there";

    // Different angle — use a secondary pain point or social proof
    if (dossier.painPoints.length > 1) {
      return `Hi ${name} — I noticed something else about ${dossier.businessName}: ${dossier.painPoints[1].toLowerCase()}. I work with businesses like yours to handle exactly this — a dedicated AI assistant that takes care of it 24/7 so you don't have to. Free trial if you want to see how it works.`;
    }

    // Outcome-focused angle
    return `Hi ${name} — imagine opening WhatsApp tomorrow morning and seeing a summary of everything handled overnight for ${dossier.businessName} — every review responded to, every inquiry answered, with a note on anything that needs your attention. That's what the businesses I work with get. Free 2-week trial: happy to set it up.`;
  }

  private compose10DayFollowUp(dossier: ProspectDossier): string {
    const name = dossier.ownerName ? dossier.ownerName.split(" ")[0] : "there";
    return `Hi ${name} — last note from me. If having a dedicated AI assistant handle reviews and customer messages at ${dossier.businessName} isn't a fit right now, totally understand. If things change, I'm always here. Wishing you the best.`;
  }

  private buildFollowUpSubject(dossier: ProspectDossier, stage: FollowUpStage): string {
    switch (stage) {
      case "day_3":
        return `Re: Quick idea for ${dossier.businessName}`;
      case "day_7":
        return `Thought of ${dossier.businessName}`;
      case "day_10":
        return `Last note — ${dossier.businessName}`;
    }
  }

  // ── Private: Response Replies ──

  private composeInterestedReply(dossier: ProspectDossier): string {
    const name = dossier.ownerName ? dossier.ownerName.split(" ")[0] : "there";
    const outcome = VERTICAL_OUTCOME_LINES[dossier.vertical];
    const moltbook = getMoltbookProfile(dossier.vertical);
    const moltbookLine = moltbook ? ` You can see our agent in action here: ${moltbook.url}` : "";
    return `Thanks for getting back to me, ${name}! In short: ${outcome.replace("I run a service that gives ", "you'd get ")} It works through WhatsApp — no software to learn, no setup on your end. Our team can walk you through exactly how it would work for ${dossier.businessName}. We're available this week for a quick 15-minute call — what times work for you?${moltbookLine} We also offer a free trial so you can see it working before committing.`;
  }

  private composeNotInterestedReply(dossier: ProspectDossier): string {
    const name = dossier.ownerName ? dossier.ownerName.split(" ")[0] : "there";
    return `Totally understood — thanks for letting me know, ${name}. Wishing you the best at ${dossier.businessName}. If things ever change, I'm always here. All the best.`;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private composeQuestionReply(dossier: ProspectDossier, question: string): string {
    const name = dossier.ownerName ? dossier.ownerName.split(" ")[0] : "there";
    return `Great question, ${name}. The short answer: you'd get a dedicated AI assistant that handles ${this.getVerticalTasks(dossier.vertical)} for ${dossier.businessName} — available 24/7 through WhatsApp. It's fully managed, so there's nothing for you to set up or maintain. Our team can give you a much better walkthrough than I can over text. Would a quick 10-minute call this week work? We can answer all your questions and show you exactly how it would work for your business.`;
  }

  private composePricingReply(dossier: ProspectDossier): string {
    const name = dossier.ownerName ? dossier.ownerName.split(" ")[0] : "there";
    const anchor = this.getPriceAnchor(dossier.vertical);
    return `Great question, ${name} — happy to break it down. Pricing depends on the scope: number of channels, skill stack, and complexity of what you need. ${anchor} We offer a free trial so you can see the value before committing. Our team can walk you through exactly what your agent would do for ${dossier.businessName} — happy to set up a quick 15-minute call?`;
  }

  private composeUnsubscribeReply(dossier: ProspectDossier): string {
    const name = dossier.ownerName ? dossier.ownerName.split(" ")[0] : "there";
    return `Done — you've been removed, ${name}. Sorry for the interruption, and best of luck with ${dossier.businessName}.`;
  }

  private getVerticalTasks(vertical: Vertical): string {
    const tasks: Record<Vertical, string> = {
      restaurant: "reviews, reservations, and customer messages",
      realtor: "lead follow-up, showing scheduling, and client communication",
      fitness: "membership inquiries, class reminders, and member re-engagement",
      medical: "appointment confirmations, no-show follow-ups, and patient inquiries",
      "home-services": "inquiry responses, estimate follow-ups, and review management",
      ecommerce: "customer support, abandoned cart recovery, and review collection",
    };
    return tasks[vertical];
  }

  private getPriceAnchor(vertical: Vertical): string {
    const anchors: Record<Vertical, string> = {
      restaurant: "$299/mo is less than what one bad unresponded review costs you in lost customers.",
      realtor: "$499/mo pays for itself with a single additional closed deal per year.",
      fitness: "$299/mo is less than 2 churned memberships.",
      medical: "$299/mo is less than 2 no-show appointment slots per month.",
      "home-services": "$499/mo is one additional job closed from estimate follow-up.",
      ecommerce: "$299/mo is typically covered by recovered abandoned carts in the first week.",
    };
    return anchors[vertical];
  }
}

// ─────────────────────────────────────────────
// Outreach Scheduler
// ─────────────────────────────────────────────

export class OutreachScheduler {
  private queue: ScheduledSend[] = [];
  private dailySendCount = 0;
  private dailySendDate: string = "";
  readonly maxDailySends = 10;

  constructor(private sender: IChannelSender) {}

  schedule(message: ComposedMessage | FollowUpMessage, sendAt?: string): ScheduledSend {
    const scheduledFor = sendAt ?? this.nextSendSlot();

    const send: ScheduledSend = {
      prospectId: message.prospectId,
      message,
      scheduledFor,
      sent: false,
      sentAt: null,
      deliveryStatus: "pending",
    };

    this.queue.push(send);
    return send;
  }

  async sendNow(send: ScheduledSend, store: ProspectStore): Promise<ScheduledSend> {
    const today = new Date().toISOString().split("T")[0];
    if (this.dailySendDate !== today) {
      this.dailySendDate = today;
      this.dailySendCount = 0;
    }

    if (this.dailySendCount >= this.maxDailySends) {
      send.deliveryStatus = "failed";
      return send;
    }

    const prospect = store.getById(send.prospectId);
    if (!prospect) {
      send.deliveryStatus = "failed";
      return send;
    }

    if (prospect.optedOut) {
      send.deliveryStatus = "failed";
      return send;
    }

    try {
      const msg = send.message;
      const channel = msg.channel;

      switch (channel) {
        case "email": {
          const to = prospect.business.ownerEmail ?? "";
          const subject = msg.subject ?? `About ${prospect.business.name}`;
          await this.sender.sendEmail(to, subject, msg.body);
          break;
        }
        case "instagram_dm": {
          const handle = prospect.business.socialLinks.instagram ?? "";
          await this.sender.sendInstagramDM(handle, msg.body);
          break;
        }
        case "facebook_msg": {
          const page = prospect.business.socialLinks.facebook ?? "";
          await this.sender.sendFacebookMessage(page, msg.body);
          break;
        }
        case "contact_form": {
          const formUrl = prospect.business.contactFormUrl ?? "";
          await this.sender.submitContactForm(formUrl, msg.body, process.env.SCOUT_REPLY_EMAIL ?? "hello@example.com");
          break;
        }
      }

      send.sent = true;
      send.sentAt = new Date().toISOString();
      send.deliveryStatus = "sent";
      this.dailySendCount++;

      // Update prospect in store
      const preview = msg.body.slice(0, 80) + (msg.body.length > 80 ? "..." : "");
      prospect.outreachMessages.push({
        sentAt: send.sentAt,
        channel,
        messagePreview: preview,
      });
      prospect.outreachChannel = channel;
      prospect.lastContactedAt = send.sentAt;

      // Transition state based on message type
      if ("stage" in msg) {
        const stageMap: Record<FollowUpStage, ProspectState> = {
          day_3: "follow_up_1",
          day_7: "follow_up_2",
          day_10: "follow_up_3",
        };
        store.updateState(send.prospectId, stageMap[msg.stage]);
      } else if (prospect.state === "outreach_queued") {
        store.updateState(send.prospectId, "contacted");
      }
    } catch {
      send.deliveryStatus = "failed";
    }

    return send;
  }

  async processQueue(store: ProspectStore): Promise<ScheduledSend[]> {
    const now = new Date().toISOString();
    const ready = this.queue.filter(
      (s) => !s.sent && s.deliveryStatus === "pending" && s.scheduledFor <= now
    );

    const sent: ScheduledSend[] = [];
    for (const send of ready) {
      const result = await this.sendNow(send, store);
      if (result.sent) sent.push(result);
      if (this.dailySendCount >= this.maxDailySends) break;
    }

    return sent;
  }

  getQueue(): ScheduledSend[] {
    return [...this.queue];
  }

  getPendingCount(): number {
    return this.queue.filter((s) => !s.sent && s.deliveryStatus === "pending").length;
  }

  getSentToday(): number {
    const today = new Date().toISOString().split("T")[0];
    return this.dailySendDate === today ? this.dailySendCount : 0;
  }

  getRemainingToday(): number {
    return this.maxDailySends - this.getSentToday();
  }

  getFollowUpsDue(store: ProspectStore): Array<{ prospectId: string; stage: FollowUpStage }> {
    const now = Date.now();
    const due: Array<{ prospectId: string; stage: FollowUpStage }> = [];

    const contacted = [
      ...store.getByState("contacted"),
      ...store.getByState("follow_up_1"),
      ...store.getByState("follow_up_2"),
    ];

    for (const prospect of contacted) {
      if (prospect.optedOut) continue;
      if (!prospect.lastContactedAt) continue;

      const lastContact = new Date(prospect.lastContactedAt).getTime();
      const daysSince = (now - lastContact) / 86400000;

      if (prospect.state === "contacted" && daysSince >= 3) {
        due.push({ prospectId: prospect.id, stage: "day_3" });
      } else if (prospect.state === "follow_up_1" && daysSince >= 4) {
        // 3 + 4 = day 7
        due.push({ prospectId: prospect.id, stage: "day_7" });
      } else if (prospect.state === "follow_up_2" && daysSince >= 3) {
        // 7 + 3 = day 10
        due.push({ prospectId: prospect.id, stage: "day_10" });
      }
    }

    return due;
  }

  private nextSendSlot(): string {
    // Stagger sends between 10am-2pm
    const now = new Date();
    const hour = 10 + Math.floor(Math.random() * 4);
    const minute = Math.floor(Math.random() * 60);
    const slot = new Date(now);
    slot.setHours(hour, minute, 0, 0);

    // If slot is in the past, schedule for tomorrow
    if (slot.getTime() <= now.getTime()) {
      slot.setDate(slot.getDate() + 1);
    }

    return slot.toISOString();
  }
}

// ─────────────────────────────────────────────
// Response Handler
// ─────────────────────────────────────────────

const INTERESTED_PATTERNS = [
  /tell me more/i,
  /sounds? interesting/i,
  /i'?m interested/i,
  /how does (it|this) work/i,
  /let'?s (talk|chat|connect|discuss)/i,
  /can you (explain|tell|show)/i,
  /i'?d (like|love) to (learn|know|hear|try)/i,
  /sign me up/i,
  /free trial/i,
  /let'?s do it/i,
  /yes\b/i,
  /set (it )?up/i,
  /schedule a call/i,
];

const NOT_INTERESTED_PATTERNS = [
  /not interested/i,
  /no thanks?/i,
  /don'?t (need|want) (this|it)/i,
  /we'?re (good|fine|all set)/i,
  /pass\b/i,
  /not (for us|for me|a fit)/i,
  /already have/i,
  /don'?t contact/i,
  /stop (emailing|messaging|contacting)/i,
  /leave me alone/i,
  /take me off/i,
];

const PRICING_PATTERNS = [
  /how much/i,
  /what('?s| does| is) (the |it )?(cost|price|pricing)/i,
  /pricing/i,
  /rates?\b/i,
  /how much do you charge/i,
  /what are your fees/i,
  /budget/i,
];

const UNSUBSCRIBE_PATTERNS = [
  /^unsubscribe$/i,
  /\bunsubscribe\b/i,
  /remove (me|my email)/i,
  /opt\b.*\bout/i,
];

const OOO_PATTERNS = [
  /out of (the )?office/i,
  /on vacation/i,
  /auto.?reply/i,
  /automatic reply/i,
  /away from/i,
  /limited access to email/i,
  /i'?m (currently )?(away|out|traveling)/i,
];

export class ResponseHandler {
  constructor(
    private composer: OutreachComposer,
    private whatsApp: IWhatsAppSender,
    private austinWhatsAppId: string
  ) {}

  categorize(response: IncomingResponse): CategorizedResponse {
    const body = response.body.trim();

    // Check patterns in priority order (unsubscribe first — must always be respected)
    if (this.matchesAny(body, UNSUBSCRIBE_PATTERNS)) {
      return {
        response,
        category: "unsubscribe",
        confidence: 0.99,
        suggestedReply: null,
        requiresOperatorAlert: false,
      };
    }

    if (this.matchesAny(body, OOO_PATTERNS)) {
      return {
        response,
        category: "out_of_office",
        confidence: 0.95,
        suggestedReply: null,
        requiresOperatorAlert: false,
      };
    }

    if (this.matchesAny(body, NOT_INTERESTED_PATTERNS)) {
      return {
        response,
        category: "not_interested",
        confidence: 0.9,
        suggestedReply: null,
        requiresOperatorAlert: false,
      };
    }

    if (this.matchesAny(body, PRICING_PATTERNS)) {
      return {
        response,
        category: "pricing_question",
        confidence: 0.9,
        suggestedReply: null,
        requiresOperatorAlert: true,
      };
    }

    if (this.matchesAny(body, INTERESTED_PATTERNS)) {
      return {
        response,
        category: "interested",
        confidence: 0.85,
        suggestedReply: null,
        requiresOperatorAlert: true,
      };
    }

    // Default: treat as a question
    return {
      response,
      category: "question",
      confidence: 0.6,
      suggestedReply: null,
      requiresOperatorAlert: true,
    };
  }

  async handleResponse(
    response: IncomingResponse,
    dossier: ProspectDossier,
    store: ProspectStore
  ): Promise<{
    categorized: CategorizedResponse;
    reply: ComposedMessage | null;
    alert: WhatsAppAlert | null;
  }> {
    const categorized = this.categorize(response);
    const prospect = store.getById(response.prospectId);

    // Handle state transitions
    if (prospect) {
      switch (categorized.category) {
        case "interested":
        case "question":
        case "pricing_question":
          store.updateState(response.prospectId, "responded");
          break;
        case "not_interested":
        case "unsubscribe":
          prospect.optedOut = true;
          store.updateState(response.prospectId, "cold");
          break;
        case "out_of_office":
          // Don't change state — they're just away
          break;
      }
    }

    // Compose reply
    const reply = this.composer.composeResponse(dossier, categorized);

    // Send WhatsApp alert to operator if needed
    let alert: WhatsAppAlert | null = null;
    if (categorized.requiresOperatorAlert) {
      alert = await this.alertOperator(categorized, dossier, prospect);
    }

    return { categorized, reply, alert };
  }

  private async alertOperator(
    categorized: CategorizedResponse,
    dossier: ProspectDossier,
    prospect: StoredProspect | null
  ): Promise<WhatsAppAlert> {
    const score = prospect?.score?.total ?? 0;
    const label = categorized.category === "interested"
      ? "HOT LEAD"
      : categorized.category === "pricing_question"
        ? "PRICING QUESTION"
        : "NEW RESPONSE";

    const lines: string[] = [
      `${label}: ${dossier.businessName}`,
      `Owner: ${dossier.ownerName ?? "unknown"}`,
      `Vertical: ${dossier.vertical}`,
      `Score: ${score}/100`,
      `Pain: ${dossier.painPoints[0] ?? "n/a"}`,
      "",
      `They said: "${categorized.response.body}"`,
      "",
    ];

    if (categorized.category === "interested") {
      lines.push("Action: Call them ASAP");
    } else if (categorized.category === "pricing_question") {
      lines.push("Action: Pricing reply sent automatically. Follow up with a call.");
    } else {
      lines.push("Action: Review and respond personally if needed.");
    }

    const message = lines.join("\n");
    await this.whatsApp.send(this.austinWhatsAppId, message);

    return {
      recipientId: this.austinWhatsAppId,
      message,
      sentAt: new Date().toISOString(),
      alertType: categorized.category === "interested" ? "hot_lead" : "daily_report",
    };
  }

  private matchesAny(text: string, patterns: RegExp[]): boolean {
    return patterns.some((p) => p.test(text));
  }
}

// ─────────────────────────────────────────────
// Daily Outreach Report
// ─────────────────────────────────────────────

export class DailyOutreachReport {
  generate(
    date: string,
    store: ProspectStore,
    outreachSentToday: number,
    followUpsSentToday: number,
    responsesToday: CategorizedResponse[],
    discoveredToday?: { total: number; byVertical: Record<string, number>; qualified: number }
  ): OutreachReport {
    const responseBreakdown: Record<ResponseCategory, number> = {
      interested: 0,
      not_interested: 0,
      question: 0,
      pricing_question: 0,
      out_of_office: 0,
      unsubscribe: 0,
    };

    const hotLeads: OutreachReport["hotLeads"] = [];

    for (const r of responsesToday) {
      responseBreakdown[r.category]++;

      if (r.category === "interested" || r.category === "pricing_question") {
        const prospect = store.getById(r.response.prospectId);
        hotLeads.push({
          businessName: prospect?.business.name ?? "Unknown",
          ownerName: prospect?.business.ownerName ?? null,
          score: prospect?.score?.total ?? 0,
          summary: prospect?.score?.painReasoning?.slice(0, 100) ?? "",
          responsePreview: r.response.body.slice(0, 120),
        });
      }
    }

    return {
      date,
      discovered: discoveredToday?.total ?? 0,
      discoveredByVertical: discoveredToday?.byVertical ?? {},
      qualified: discoveredToday?.qualified ?? 0,
      outreachSent: outreachSentToday,
      followUpsSent: followUpsSentToday,
      responsesReceived: responsesToday.length,
      responseBreakdown,
      hotLeads,
      pipelineTotal: store.getAll().filter((p) => !p.optedOut && p.state !== "archived" && p.state !== "cold").length,
    };
  }

  formatWhatsAppReport(report: OutreachReport): string {
    const lines: string[] = [
      `Scout Daily Report — ${report.date}`,
      "",
    ];

    if (report.discovered > 0) {
      const verticals = Object.entries(report.discoveredByVertical)
        .map(([v, c]) => `${c} ${v}`)
        .join(", ");
      lines.push(`Discovered: ${report.discovered} businesses (${verticals})`);
      lines.push(`Qualified (60+): ${report.qualified}`);
    }

    lines.push(`Outreach sent: ${report.outreachSent}`);
    lines.push(`Follow-ups sent: ${report.followUpsSent}`);

    if (report.responsesReceived > 0) {
      const parts: string[] = [];
      if (report.responseBreakdown.interested > 0) parts.push(`${report.responseBreakdown.interested} interested`);
      if (report.responseBreakdown.pricing_question > 0) parts.push(`${report.responseBreakdown.pricing_question} pricing question`);
      if (report.responseBreakdown.question > 0) parts.push(`${report.responseBreakdown.question} question`);
      if (report.responseBreakdown.not_interested > 0) parts.push(`${report.responseBreakdown.not_interested} not interested`);
      if (report.responseBreakdown.unsubscribe > 0) parts.push(`${report.responseBreakdown.unsubscribe} unsubscribe`);
      lines.push(`Responses: ${report.responsesReceived} (${parts.join(", ")})`);
    } else {
      lines.push("Responses: 0");
    }

    lines.push(`Pipeline: ${report.pipelineTotal} active prospects`);

    if (report.hotLeads.length > 0) {
      lines.push("");
      for (const lead of report.hotLeads) {
        lines.push(`Hot lead: ${lead.ownerName ?? lead.businessName}, ${lead.businessName}`);
        lines.push(`Score: ${lead.score} | ${lead.summary}`);
        lines.push(`They replied: "${lead.responsePreview}"`);
        lines.push("");
      }
    }

    return lines.join("\n").trim();
  }
}

// ─────────────────────────────────────────────
// Mock Channel Sender
// ─────────────────────────────────────────────

export class MockChannelSender implements IChannelSender {
  sent: Array<{ channel: string; to: string; subject?: string; body: string; at: string }> = [];

  async sendEmail(to: string, subject: string, body: string) {
    const id = `email-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    this.sent.push({ channel: "email", to, subject, body, at: new Date().toISOString() });
    return { messageId: id, status: "sent" };
  }

  async sendInstagramDM(handle: string, body: string) {
    const id = `ig-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    this.sent.push({ channel: "instagram_dm", to: handle, body, at: new Date().toISOString() });
    return { messageId: id, status: "sent" };
  }

  async sendFacebookMessage(pageUrl: string, body: string) {
    const id = `fb-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    this.sent.push({ channel: "facebook_msg", to: pageUrl, body, at: new Date().toISOString() });
    return { messageId: id, status: "sent" };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async submitContactForm(formUrl: string, body: string, fromEmail: string) {
    this.sent.push({ channel: "contact_form", to: formUrl, body, at: new Date().toISOString() });
    return { status: "submitted" };
  }
}

export class MockWhatsAppSender implements IWhatsAppSender {
  alerts: Array<{ recipientId: string; message: string; at: string }> = [];

  async send(recipientId: string, message: string) {
    const id = `wa-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    this.alerts.push({ recipientId, message, at: new Date().toISOString() });
    return { messageId: id };
  }
}

// ─────────────────────────────────────────────
// Mock Conversation Flows (for testing)
// ─────────────────────────────────────────────

export interface MockConversation {
  prospectId: string;
  businessName: string;
  vertical: Vertical;
  flow: Array<{
    direction: "outbound" | "inbound";
    body: string;
    expectedCategory?: ResponseCategory;
  }>;
}

export const MOCK_CONVERSATIONS: MockConversation[] = [
  {
    prospectId: "rest-001",
    businessName: "Tony's Pizzeria",
    vertical: "restaurant",
    flow: [
      {
        direction: "outbound",
        body: "Hi Tony — I was looking at Tony's Pizzeria on Google and noticed 3 negative reviews sitting unanswered. I run a service where a dedicated AI assistant handles all your reviews 24/7. One of the restaurants I work with went from 6% to 100% response rate in a week. Free 2-week trial — want to give it a try?",
      },
      {
        direction: "inbound",
        body: "This sounds interesting, can you tell me more about pricing?",
        expectedCategory: "pricing_question",
      },
      {
        direction: "outbound",
        body: "Great question, Tony — happy to break it down. Most restaurants start with our Pro plan at $499/mo...",
      },
      {
        direction: "inbound",
        body: "Let's set up a call to discuss",
        expectedCategory: "interested",
      },
    ],
  },
  {
    prospectId: "rest-003",
    businessName: "El Rancho Grande",
    vertical: "restaurant",
    flow: [
      {
        direction: "outbound",
        body: "Hi Maria — I noticed El Rancho Grande has 9 negative reviews without owner responses...",
      },
      {
        direction: "inbound",
        body: "Not interested, we handle things ourselves",
        expectedCategory: "not_interested",
      },
      {
        direction: "outbound",
        body: "Totally understood — thanks for letting me know, Maria. Wishing you the best at El Rancho Grande.",
      },
    ],
  },
  {
    prospectId: "med-001",
    businessName: "Bright Smile Dental",
    vertical: "medical",
    flow: [
      {
        direction: "outbound",
        body: "Hi Dr. Reyes — I noticed Bright Smile Dental doesn't have online appointment booking...",
      },
      {
        direction: "inbound",
        body: "How does this work exactly?",
        expectedCategory: "interested",
      },
      {
        direction: "outbound",
        body: "Thanks for getting back to me! In short: you'd get a dedicated AI assistant...",
      },
    ],
  },
  {
    prospectId: "rest-005",
    businessName: "Pho King Delicious",
    vertical: "restaurant",
    flow: [
      {
        direction: "outbound",
        body: "Hi there — I was looking at Pho King Delicious on Google...",
      },
      {
        direction: "inbound",
        body: "unsubscribe",
        expectedCategory: "unsubscribe",
      },
      {
        direction: "outbound",
        body: "Done — you've been removed. Sorry for the interruption.",
      },
    ],
  },
  {
    prospectId: "med-005",
    businessName: "Downtown Dental Group",
    vertical: "medical",
    flow: [
      {
        direction: "outbound",
        body: "Hi Dr. Walker — I noticed Downtown Dental Group has 14 unresponded negative reviews...",
      },
      {
        direction: "inbound",
        body: "I'm currently out of the office until March 15. I'll respond to your email when I return.",
        expectedCategory: "out_of_office",
      },
    ],
  },
  {
    prospectId: "rest-002",
    businessName: "Sakura Ramen House",
    vertical: "restaurant",
    flow: [
      {
        direction: "outbound",
        body: "Hi Kenji — I was browsing Sakura Ramen House on Google...",
      },
      {
        direction: "inbound",
        body: "We already have someone handling our social media, thanks",
        expectedCategory: "not_interested",
      },
    ],
  },
  {
    prospectId: "rest-006",
    businessName: "Magnolia Cafe South",
    vertical: "restaurant",
    flow: [
      {
        direction: "outbound",
        body: "Hi Dave — I noticed Magnolia Cafe South has 18 unresponded negative reviews...",
      },
      {
        direction: "inbound",
        body: "Interesting. How much does it cost?",
        expectedCategory: "pricing_question",
      },
    ],
  },
  {
    prospectId: "rest-010",
    businessName: "Chez Mimi",
    vertical: "restaurant",
    flow: [
      {
        direction: "outbound",
        body: "Hi Mimi — I noticed something about Chez Mimi's Google presence...",
      },
      {
        direction: "inbound",
        body: "I'd love to learn more about this. Can you send more details?",
        expectedCategory: "interested",
      },
    ],
  },
];
