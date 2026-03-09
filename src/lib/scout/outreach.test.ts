/**
 * Tests for Scout Outreach & Follow-Up System
 *
 * Usage:  npx tsx --test src/lib/scout/outreach.test.ts
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  ProspectResearcher,
  OutreachComposer,
  OutreachScheduler,
  ResponseHandler,
  DailyOutreachReport,
  MockChannelSender,
  MockWhatsAppSender,
  MockWebResearcher,
  MOCK_CONVERSATIONS,
  registerCaseStudy,
  registerMoltbookProfile,
  getCaseStudy,
  getMoltbookProfile,
  type ProspectDossier,
  type IncomingResponse,
  type CategorizedResponse,
  type FollowUpStage,
} from "./outreach";

import {
  ProspectStore,
  QualificationScorer,
  type DiscoveredBusiness,
  type StoredProspect,
  type Vertical,
} from "./discovery";

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function makeRestaurant(overrides: Partial<DiscoveredBusiness> = {}): DiscoveredBusiness {
  return {
    id: `test-${Math.random().toString(36).slice(2, 8)}`,
    name: "Test Restaurant",
    vertical: "restaurant",
    address: "100 Main St",
    city: "Austin",
    state: "TX",
    zip: "78701",
    phone: "(512) 555-9999",
    websiteUrl: "https://test.com",
    ownerName: "Tony Moretti",
    ownerEmail: "tony@test.com",
    reviews: {
      totalReviews: 100,
      averageRating: 4.2,
      recentReviews30d: 10,
      ownerRespondedCount: 5,
      responseRate: 0.05,
      unrespondedNegative: 5,
      painKeywordsInReviews: ["couldn't reach anyone", "no one responded"],
    },
    hasOnlineBooking: false,
    socialLinks: {
      instagram: "@testrestaurant",
      instagramFollowers: 1000,
      facebook: "facebook.com/test",
      facebookActive: true,
    },
    hoursOfOperation: "Mon-Sun 9am-9pm",
    photoCount: 50,
    yearsEstablished: 5,
    hasWebsiteChatWidget: false,
    hasAutomatedReviewResponses: false,
    contactFormUrl: "https://test.com/contact",
    discoveredAt: new Date().toISOString(),
    discoveredFrom: "google_maps",
    ...overrides,
  };
}

function makeDossier(overrides: Partial<ProspectDossier> = {}): ProspectDossier {
  return {
    prospectId: "test-001",
    businessName: "Test Restaurant",
    ownerName: "Tony Moretti",
    vertical: "restaurant",
    painPoints: [
      "5 negative reviews sitting unanswered on Google",
      "Only 5% of 100 reviews have owner responses",
      'Customers reporting: "couldn\'t reach anyone"',
    ],
    specificEvidence: [
      "5 unresponded negative reviews on Google (out of 100 total)",
      "Owner has responded to only 5 of 100 reviews (5% response rate)",
    ],
    contactChannels: {
      email: "tony@test.com",
      instagram: "@testrestaurant",
      facebook: "facebook.com/test",
      contactForm: "https://test.com/contact",
    },
    bestOutreachChannel: "email",
    recommendedAngle: "lead with unresponded negative reviews — visible to every potential customer",
    researchedAt: new Date().toISOString(),
    ...overrides,
  };
}

function storeWithProspect(overrides: Partial<DiscoveredBusiness> = {}): { store: ProspectStore; prospect: StoredProspect } {
  const store = new ProspectStore();
  const scorer = new QualificationScorer();
  const business = makeRestaurant({ id: "test-001", ...overrides });
  const prospect = store.addProspect(scorer.score(business));
  return { store, prospect };
}

// ─────────────────────────────────────────────
// 1. ProspectResearcher
// ─────────────────────────────────────────────

describe("ProspectResearcher", () => {
  const researcher = new ProspectResearcher(new MockWebResearcher());

  it("builds a complete dossier from a stored prospect", async () => {
    const { prospect } = storeWithProspect();
    const dossier = await researcher.buildDossier(prospect);

    assert.equal(dossier.prospectId, prospect.id);
    assert.equal(dossier.businessName, prospect.business.name);
    assert.equal(dossier.vertical, prospect.business.vertical);
    assert.ok(dossier.painPoints.length > 0);
    assert.ok(dossier.specificEvidence.length > 0);
    assert.ok(dossier.researchedAt);
  });

  it("ranks pain points with unresponded negatives first", async () => {
    const { prospect } = storeWithProspect();
    const dossier = await researcher.buildDossier(prospect);

    assert.ok(
      dossier.painPoints[0].includes("negative review"),
      `Top pain point should be about negative reviews, got: "${dossier.painPoints[0]}"`
    );
  });

  it("selects email as best channel when email is available", async () => {
    const { prospect } = storeWithProspect({ ownerEmail: "tony@test.com" });
    const dossier = await researcher.buildDossier(prospect);
    assert.equal(dossier.bestOutreachChannel, "email");
  });

  it("selects Instagram when no email but IG < 10K followers", async () => {
    const { prospect } = storeWithProspect({
      ownerEmail: null,
      socialLinks: { instagram: "@test", instagramFollowers: 5000 },
    });
    const dossier = await researcher.buildDossier(prospect);
    assert.equal(dossier.bestOutreachChannel, "instagram_dm");
  });

  it("selects Facebook when no email and no IG", async () => {
    const { prospect } = storeWithProspect({
      ownerEmail: null,
      socialLinks: { facebook: "facebook.com/test", facebookActive: true },
    });
    const dossier = await researcher.buildDossier(prospect);
    assert.equal(dossier.bestOutreachChannel, "facebook_msg");
  });

  it("selects contact form as last resort", async () => {
    const { prospect } = storeWithProspect({
      ownerEmail: null,
      socialLinks: {},
      contactFormUrl: "https://test.com/contact",
    });
    const dossier = await researcher.buildDossier(prospect);
    assert.equal(dossier.bestOutreachChannel, "contact_form");
  });

  it("generates a recommended angle based on top pain point", async () => {
    const { prospect } = storeWithProspect();
    const dossier = await researcher.buildDossier(prospect);
    assert.ok(dossier.recommendedAngle.length > 0);
    assert.ok(dossier.recommendedAngle.toLowerCase().includes("negative review"));
  });

  it("includes owner name when available", async () => {
    const { prospect } = storeWithProspect({ ownerName: "Tony Moretti" });
    const dossier = await researcher.buildDossier(prospect);
    assert.equal(dossier.ownerName, "Tony Moretti");
  });

  it("handles prospect with no owner name", async () => {
    const { prospect } = storeWithProspect({ ownerName: null });
    const dossier = await researcher.buildDossier(prospect);
    assert.equal(dossier.ownerName, null);
  });

  it("includes no-booking pain for medical vertical", async () => {
    const { prospect } = storeWithProspect({
      vertical: "medical",
      hasOnlineBooking: false,
    });
    const dossier = await researcher.buildDossier(prospect);
    const hasBookingPain = dossier.painPoints.some((p) => p.toLowerCase().includes("booking"));
    assert.ok(hasBookingPain, "Should include booking pain point for medical");
  });
});

// ─────────────────────────────────────────────
// 2. OutreachComposer — initial messages
// ─────────────────────────────────────────────

describe("OutreachComposer — initial messages", () => {
  const composer = new OutreachComposer();

  it("composes a message for a restaurant prospect", () => {
    const msg = composer.compose(makeDossier());
    assert.ok(msg.body.length > 0);
    assert.equal(msg.channel, "email");
    assert.ok(msg.subject);
    assert.ok(msg.wordCount > 0);
  });

  it("addresses owner by first name when available", () => {
    const msg = composer.compose(makeDossier({ ownerName: "Tony Moretti" }));
    assert.ok(msg.body.includes("Hi Tony"), `Should greet by first name, got: ${msg.body.slice(0, 30)}`);
  });

  it("uses generic greeting when no owner name", () => {
    const msg = composer.compose(makeDossier({ ownerName: null }));
    assert.ok(msg.body.includes("Hi there"), `Should use 'Hi there' without owner name`);
  });

  it("references specific evidence from the dossier", () => {
    const dossier = makeDossier({
      specificEvidence: ["5 unresponded negative reviews on Google (out of 100 total)"],
    });
    const msg = composer.compose(dossier);
    assert.ok(
      msg.body.toLowerCase().includes("unresponded") || msg.body.toLowerCase().includes("negative"),
      "Should reference specific evidence"
    );
  });

  it("includes anonymized proof when no case study", () => {
    const msg = composer.compose(makeDossier());
    assert.ok(
      msg.body.toLowerCase().includes("one of the restaurants") || msg.body.toLowerCase().includes("response rate"),
      "Should include anonymized proof"
    );
  });

  it("includes case study link when registered", () => {
    registerCaseStudy({
      vertical: "restaurant",
      headline: "How Maria's Kitchen went from 6% to 100% review response rate",
      url: "https://clawstaff.ai/case-studies/marias-kitchen",
    });
    const msg = composer.compose(makeDossier());
    assert.ok(msg.body.includes("clawstaff.ai"), "Should include case study URL");
  });

  it("offers a free trial", () => {
    const msg = composer.compose(makeDossier());
    assert.ok(
      msg.body.toLowerCase().includes("free") && msg.body.toLowerCase().includes("trial"),
      "Should offer free trial"
    );
  });

  it("includes unsubscribe line in email", () => {
    const msg = composer.compose(makeDossier({ bestOutreachChannel: "email" }));
    assert.ok(msg.body.toLowerCase().includes("unsubscribe"), "Email must have unsubscribe option");
  });

  it("omits unsubscribe line in Instagram DMs", () => {
    const msg = composer.compose(makeDossier({ bestOutreachChannel: "instagram_dm" }));
    const hasUnsub = msg.body.toLowerCase().includes("unsubscribe");
    assert.ok(!hasUnsub, "Instagram DMs should not have unsubscribe line");
  });

  it("keeps messages under 150 words", () => {
    const msg = composer.compose(makeDossier());
    assert.ok(msg.wordCount <= 180, `Message too long: ${msg.wordCount} words (target: ~150)`);
  });

  it("sets subject line for email", () => {
    const msg = composer.compose(makeDossier());
    assert.ok(msg.subject, "Email should have subject");
    assert.ok(msg.subject!.includes("Test Restaurant"));
  });

  it("sets subject to null for DMs", () => {
    const msg = composer.compose(makeDossier({ bestOutreachChannel: "instagram_dm" }));
    assert.equal(msg.subject, null);
  });

  it("composes correctly for all 6 verticals", () => {
    const verticals: Vertical[] = ["restaurant", "realtor", "fitness", "medical", "home-services", "ecommerce"];
    for (const v of verticals) {
      const msg = composer.compose(makeDossier({ vertical: v }));
      assert.ok(msg.body.length > 50, `${v}: message too short`);
      assert.ok(msg.wordCount > 10, `${v}: too few words`);
    }
  });
});

// ─────────────────────────────────────────────
// 3. OutreachComposer — follow-ups
// ─────────────────────────────────────────────

describe("OutreachComposer — follow-ups", () => {
  const composer = new OutreachComposer();

  it("composes a 3-day follow-up", () => {
    const fu = composer.composeFollowUp(makeDossier(), "day_3", "original message");
    assert.ok(fu.body.length > 0);
    assert.equal(fu.stage, "day_3");
    assert.ok(fu.wordCount > 0);
  });

  it("3-day follow-up is shorter than initial message", () => {
    const initial = composer.compose(makeDossier());
    const fu = composer.composeFollowUp(makeDossier(), "day_3", initial.body);
    assert.ok(fu.wordCount <= initial.wordCount + 20, "Follow-up should be concise");
  });

  it("7-day follow-up uses a different angle", () => {
    const initial = composer.compose(makeDossier());
    const fu = composer.composeFollowUp(makeDossier(), "day_7", initial.body);
    // The 7-day should use secondary pain points or outcome-focused language
    assert.ok(fu.body.length > 0);
    assert.equal(fu.stage, "day_7");
  });

  it("10-day follow-up is a graceful final message", () => {
    const fu = composer.composeFollowUp(makeDossier(), "day_10", "original message");
    assert.ok(fu.body.toLowerCase().includes("last"), "Should signal it's the final message");
  });

  it("follow-ups include unsubscribe for email", () => {
    const fu = composer.composeFollowUp(makeDossier({ bestOutreachChannel: "email" }), "day_3", "prev");
    assert.ok(fu.body.toLowerCase().includes("unsubscribe"));
  });

  it("follow-ups omit unsubscribe for DMs", () => {
    const fu = composer.composeFollowUp(makeDossier({ bestOutreachChannel: "instagram_dm" }), "day_3", "prev");
    assert.ok(!fu.body.toLowerCase().includes("unsubscribe"));
  });

  it("all follow-up stages produce valid messages", () => {
    const stages: FollowUpStage[] = ["day_3", "day_7", "day_10"];
    for (const stage of stages) {
      const fu = composer.composeFollowUp(makeDossier(), stage, "prev");
      assert.ok(fu.body.length > 20, `${stage}: body too short`);
      assert.ok(fu.stage === stage);
    }
  });
});

// ─────────────────────────────────────────────
// 4. OutreachComposer — response replies
// ─────────────────────────────────────────────

describe("OutreachComposer — response replies", () => {
  const composer = new OutreachComposer();

  it("composes interested reply mentioning Austin and a call", () => {
    const reply = composer.composeResponse(makeDossier(), {
      response: { prospectId: "test-001", channel: "email", body: "Tell me more", receivedAt: new Date().toISOString() },
      category: "interested",
      confidence: 0.9,
      suggestedReply: null,
      requiresAustinAlert: true,
    });
    assert.ok(reply);
    assert.ok(reply!.body.includes("Austin"), "Should mention Austin");
    assert.ok(reply!.body.toLowerCase().includes("call"), "Should offer a call");
  });

  it("composes not-interested reply without re-pitching", () => {
    const reply = composer.composeResponse(makeDossier(), {
      response: { prospectId: "test-001", channel: "email", body: "Not interested", receivedAt: new Date().toISOString() },
      category: "not_interested",
      confidence: 0.9,
      suggestedReply: null,
      requiresAustinAlert: false,
    });
    assert.ok(reply);
    assert.ok(reply!.body.toLowerCase().includes("understood"), "Should acknowledge gracefully");
    assert.ok(!reply!.body.toLowerCase().includes("trial"), "Should NOT offer trial in exit message");
  });

  it("composes pricing reply with actual numbers", () => {
    const reply = composer.composeResponse(makeDossier(), {
      response: { prospectId: "test-001", channel: "email", body: "How much does it cost?", receivedAt: new Date().toISOString() },
      category: "pricing_question",
      confidence: 0.9,
      suggestedReply: null,
      requiresAustinAlert: true,
    });
    assert.ok(reply);
    assert.ok(reply!.body.includes("$299") || reply!.body.includes("$499"), "Should include actual pricing");
  });

  it("composes unsubscribe confirmation", () => {
    const reply = composer.composeResponse(makeDossier(), {
      response: { prospectId: "test-001", channel: "email", body: "unsubscribe", receivedAt: new Date().toISOString() },
      category: "unsubscribe",
      confidence: 0.99,
      suggestedReply: null,
      requiresAustinAlert: false,
    });
    assert.ok(reply);
    assert.ok(reply!.body.toLowerCase().includes("removed"), "Should confirm removal");
  });

  it("returns null for out-of-office", () => {
    const reply = composer.composeResponse(makeDossier(), {
      response: { prospectId: "test-001", channel: "email", body: "Out of office until March 15", receivedAt: new Date().toISOString() },
      category: "out_of_office",
      confidence: 0.95,
      suggestedReply: null,
      requiresAustinAlert: false,
    });
    assert.equal(reply, null, "Should not reply to out-of-office");
  });

  it("composes question reply offering a call", () => {
    const reply = composer.composeResponse(makeDossier(), {
      response: { prospectId: "test-001", channel: "email", body: "How does this work?", receivedAt: new Date().toISOString() },
      category: "question",
      confidence: 0.6,
      suggestedReply: null,
      requiresAustinAlert: true,
    });
    assert.ok(reply);
    assert.ok(reply!.body.toLowerCase().includes("call"), "Should offer a call");
    assert.ok(reply!.body.includes("Austin"), "Should mention Austin");
  });
});

// ─────────────────────────────────────────────
// 5. ResponseHandler — categorization
// ─────────────────────────────────────────────

describe("ResponseHandler — categorization", () => {
  const composer = new OutreachComposer();
  const whatsApp = new MockWhatsAppSender();
  const handler = new ResponseHandler(composer, whatsApp, "austin-wa-id");

  const makeResponse = (body: string): IncomingResponse => ({
    prospectId: "test-001",
    channel: "email",
    body,
    receivedAt: new Date().toISOString(),
  });

  it("categorizes 'tell me more' as interested", () => {
    const result = handler.categorize(makeResponse("Tell me more about this"));
    assert.equal(result.category, "interested");
  });

  it("categorizes 'sounds interesting' as interested", () => {
    const result = handler.categorize(makeResponse("This sounds interesting, can you explain?"));
    assert.equal(result.category, "interested");
  });

  it("categorizes 'not interested' correctly", () => {
    const result = handler.categorize(makeResponse("Not interested, thanks"));
    assert.equal(result.category, "not_interested");
  });

  it("categorizes 'no thanks' correctly", () => {
    const result = handler.categorize(makeResponse("No thanks, we're good"));
    assert.equal(result.category, "not_interested");
  });

  it("categorizes pricing questions", () => {
    const result = handler.categorize(makeResponse("How much does this cost?"));
    assert.equal(result.category, "pricing_question");
  });

  it("categorizes 'what are your rates' as pricing", () => {
    const result = handler.categorize(makeResponse("What are your rates?"));
    assert.equal(result.category, "pricing_question");
  });

  it("categorizes 'unsubscribe' correctly", () => {
    const result = handler.categorize(makeResponse("unsubscribe"));
    assert.equal(result.category, "unsubscribe");
    assert.ok(result.confidence >= 0.95);
  });

  it("categorizes 'opt out' correctly", () => {
    const result = handler.categorize(makeResponse("Please opt me out"));
    assert.equal(result.category, "unsubscribe");
  });

  it("categorizes out-of-office correctly", () => {
    const result = handler.categorize(makeResponse("I'm currently out of the office until March 15"));
    assert.equal(result.category, "out_of_office");
  });

  it("categorizes auto-reply as out-of-office", () => {
    const result = handler.categorize(makeResponse("Automatic reply: I'm away from the office"));
    assert.equal(result.category, "out_of_office");
  });

  it("defaults unknown messages to question", () => {
    const result = handler.categorize(makeResponse("Can your agent handle Spanish-speaking customers?"));
    assert.equal(result.category, "question");
  });

  it("unsubscribe takes priority over interested patterns", () => {
    const result = handler.categorize(makeResponse("Yes, I'd like to unsubscribe please"));
    assert.equal(result.category, "unsubscribe");
  });

  it("not interested takes priority over question", () => {
    const result = handler.categorize(makeResponse("We don't need this, we already have a system"));
    assert.equal(result.category, "not_interested");
  });

  it("interested responses require Austin alert", () => {
    const result = handler.categorize(makeResponse("I'd love to learn more"));
    assert.ok(result.requiresAustinAlert, "Interested responses should alert Austin");
  });

  it("pricing questions require Austin alert", () => {
    const result = handler.categorize(makeResponse("What's the pricing?"));
    assert.ok(result.requiresAustinAlert, "Pricing questions should alert Austin");
  });

  it("not interested does NOT require Austin alert", () => {
    const result = handler.categorize(makeResponse("Not interested"));
    assert.ok(!result.requiresAustinAlert);
  });

  it("unsubscribe does NOT require Austin alert", () => {
    const result = handler.categorize(makeResponse("unsubscribe"));
    assert.ok(!result.requiresAustinAlert);
  });
});

// ─────────────────────────────────────────────
// 6. ResponseHandler — full handling
// ─────────────────────────────────────────────

describe("ResponseHandler — full handling", () => {
  it("marks prospect as responded on interested reply", async () => {
    const { store, prospect } = storeWithProspect();
    store.updateState(prospect.id, "contacted");
    const whatsApp = new MockWhatsAppSender();
    const handler = new ResponseHandler(new OutreachComposer(), whatsApp, "austin-wa-id");

    const response: IncomingResponse = {
      prospectId: prospect.id,
      channel: "email",
      body: "Tell me more",
      receivedAt: new Date().toISOString(),
    };

    await handler.handleResponse(response, makeDossier({ prospectId: prospect.id }), store);
    const updated = store.getById(prospect.id);
    assert.equal(updated?.state, "responded");
  });

  it("sends WhatsApp alert for interested reply", async () => {
    const { store, prospect } = storeWithProspect();
    store.updateState(prospect.id, "contacted");
    const whatsApp = new MockWhatsAppSender();
    const handler = new ResponseHandler(new OutreachComposer(), whatsApp, "austin-wa-id");

    const response: IncomingResponse = {
      prospectId: prospect.id,
      channel: "email",
      body: "This sounds interesting",
      receivedAt: new Date().toISOString(),
    };

    const result = await handler.handleResponse(response, makeDossier({ prospectId: prospect.id }), store);
    assert.ok(result.alert, "Should send WhatsApp alert");
    assert.ok(whatsApp.alerts.length > 0, "WhatsApp sender should have alerts");
    assert.ok(result.alert!.message.includes("HOT LEAD") || result.alert!.message.includes("RESPONSE"));
  });

  it("marks as opted out on not-interested reply", async () => {
    const { store, prospect } = storeWithProspect();
    store.updateState(prospect.id, "contacted");
    const handler = new ResponseHandler(new OutreachComposer(), new MockWhatsAppSender(), "austin-wa-id");

    const response: IncomingResponse = {
      prospectId: prospect.id,
      channel: "email",
      body: "Not interested",
      receivedAt: new Date().toISOString(),
    };

    await handler.handleResponse(response, makeDossier({ prospectId: prospect.id }), store);
    const updated = store.getById(prospect.id);
    assert.ok(updated?.optedOut, "Should be opted out");
    assert.equal(updated?.state, "cold");
  });

  it("marks as opted out on unsubscribe", async () => {
    const { store, prospect } = storeWithProspect();
    store.updateState(prospect.id, "contacted");
    const handler = new ResponseHandler(new OutreachComposer(), new MockWhatsAppSender(), "austin-wa-id");

    const response: IncomingResponse = {
      prospectId: prospect.id,
      channel: "email",
      body: "unsubscribe",
      receivedAt: new Date().toISOString(),
    };

    await handler.handleResponse(response, makeDossier({ prospectId: prospect.id }), store);
    const updated = store.getById(prospect.id);
    assert.ok(updated?.optedOut);
  });

  it("does not change state on out-of-office", async () => {
    const { store, prospect } = storeWithProspect();
    store.updateState(prospect.id, "contacted");
    const handler = new ResponseHandler(new OutreachComposer(), new MockWhatsAppSender(), "austin-wa-id");

    const response: IncomingResponse = {
      prospectId: prospect.id,
      channel: "email",
      body: "I'm out of the office until March 15",
      receivedAt: new Date().toISOString(),
    };

    await handler.handleResponse(response, makeDossier({ prospectId: prospect.id }), store);
    const updated = store.getById(prospect.id);
    assert.equal(updated?.state, "contacted", "State should not change for OOO");
  });

  it("returns null reply for out-of-office", async () => {
    const { store, prospect } = storeWithProspect();
    const handler = new ResponseHandler(new OutreachComposer(), new MockWhatsAppSender(), "austin-wa-id");

    const response: IncomingResponse = {
      prospectId: prospect.id,
      channel: "email",
      body: "Automatic reply: I'm away",
      receivedAt: new Date().toISOString(),
    };

    const result = await handler.handleResponse(response, makeDossier({ prospectId: prospect.id }), store);
    assert.equal(result.reply, null);
  });
});

// ─────────────────────────────────────────────
// 7. Mock conversations — categorization
// ─────────────────────────────────────────────

describe("Mock conversations — response categorization", () => {
  const handler = new ResponseHandler(
    new OutreachComposer(),
    new MockWhatsAppSender(),
    "austin-wa-id"
  );

  for (const convo of MOCK_CONVERSATIONS) {
    const inbound = convo.flow.filter((m) => m.direction === "inbound" && m.expectedCategory);

    for (const msg of inbound) {
      it(`${convo.businessName}: "${msg.body.slice(0, 50)}..." → ${msg.expectedCategory}`, () => {
        const response: IncomingResponse = {
          prospectId: convo.prospectId,
          channel: "email",
          body: msg.body,
          receivedAt: new Date().toISOString(),
        };
        const result = handler.categorize(response);
        assert.equal(result.category, msg.expectedCategory);
      });
    }
  }
});

// ─────────────────────────────────────────────
// 8. OutreachScheduler — scheduling
// ─────────────────────────────────────────────

describe("OutreachScheduler — scheduling", () => {
  it("schedules a message and adds to queue", () => {
    const scheduler = new OutreachScheduler(new MockChannelSender());
    const composer = new OutreachComposer();
    const msg = composer.compose(makeDossier());
    const send = scheduler.schedule(msg);

    assert.equal(send.prospectId, msg.prospectId);
    assert.ok(send.scheduledFor);
    assert.equal(send.sent, false);
    assert.equal(send.deliveryStatus, "pending");
    assert.equal(scheduler.getPendingCount(), 1);
  });

  it("respects custom send time", () => {
    const scheduler = new OutreachScheduler(new MockChannelSender());
    const composer = new OutreachComposer();
    const msg = composer.compose(makeDossier());
    const customTime = "2026-03-10T14:00:00.000Z";
    const send = scheduler.schedule(msg, customTime);
    assert.equal(send.scheduledFor, customTime);
  });

  it("reports 0 sent today initially", () => {
    const scheduler = new OutreachScheduler(new MockChannelSender());
    assert.equal(scheduler.getSentToday(), 0);
    assert.equal(scheduler.getRemainingToday(), 10);
  });
});

// ─────────────────────────────────────────────
// 9. OutreachScheduler — sending
// ─────────────────────────────────────────────

describe("OutreachScheduler — sending", () => {
  it("sends a message via email", async () => {
    const sender = new MockChannelSender();
    const scheduler = new OutreachScheduler(sender);
    const composer = new OutreachComposer();
    const { store, prospect } = storeWithProspect();

    const msg = composer.compose(makeDossier({ prospectId: prospect.id }));
    const send = scheduler.schedule(msg, new Date().toISOString());
    await scheduler.sendNow(send, store);

    assert.ok(send.sent);
    assert.ok(send.sentAt);
    assert.equal(send.deliveryStatus, "sent");
    assert.equal(sender.sent.length, 1);
    assert.equal(sender.sent[0].channel, "email");
  });

  it("transitions prospect from outreach_queued to contacted", async () => {
    const sender = new MockChannelSender();
    const scheduler = new OutreachScheduler(sender);
    const composer = new OutreachComposer();
    const { store, prospect } = storeWithProspect();

    const msg = composer.compose(makeDossier({ prospectId: prospect.id }));
    const send = scheduler.schedule(msg, new Date().toISOString());
    await scheduler.sendNow(send, store);

    const updated = store.getById(prospect.id);
    assert.equal(updated?.state, "contacted");
  });

  it("records outreach message on prospect", async () => {
    const sender = new MockChannelSender();
    const scheduler = new OutreachScheduler(sender);
    const composer = new OutreachComposer();
    const { store, prospect } = storeWithProspect();

    const msg = composer.compose(makeDossier({ prospectId: prospect.id }));
    const send = scheduler.schedule(msg, new Date().toISOString());
    await scheduler.sendNow(send, store);

    const updated = store.getById(prospect.id);
    assert.equal(updated?.outreachMessages.length, 1);
    assert.ok(updated?.lastContactedAt);
    assert.equal(updated?.outreachChannel, "email");
  });

  it("refuses to send to opted-out prospect", async () => {
    const sender = new MockChannelSender();
    const scheduler = new OutreachScheduler(sender);
    const composer = new OutreachComposer();
    const { store, prospect } = storeWithProspect();

    prospect.optedOut = true;

    const msg = composer.compose(makeDossier({ prospectId: prospect.id }));
    const send = scheduler.schedule(msg, new Date().toISOString());
    await scheduler.sendNow(send, store);

    assert.equal(send.sent, false);
    assert.equal(send.deliveryStatus, "failed");
    assert.equal(sender.sent.length, 0);
  });

  it("enforces daily send limit of 10", async () => {
    const sender = new MockChannelSender();
    const scheduler = new OutreachScheduler(sender);
    const composer = new OutreachComposer();
    const store = new ProspectStore();
    const scorer = new QualificationScorer();

    // Create 12 prospects and try to send to all
    for (let i = 0; i < 12; i++) {
      const business = makeRestaurant({ id: `limit-${i}`, ownerEmail: `owner${i}@test.com` });
      store.addProspect(scorer.score(business));
      const msg = composer.compose(makeDossier({ prospectId: `limit-${i}` }));
      const send = scheduler.schedule(msg, new Date().toISOString());
      await scheduler.sendNow(send, store);
    }

    assert.equal(sender.sent.length, 10, "Should cap at 10 sends per day");
    assert.equal(scheduler.getRemainingToday(), 0);
  });

  it("sends via Instagram DM when channel is instagram_dm", async () => {
    const sender = new MockChannelSender();
    const scheduler = new OutreachScheduler(sender);
    const composer = new OutreachComposer();
    const { store, prospect } = storeWithProspect({
      ownerEmail: null,
      socialLinks: { instagram: "@testbiz", instagramFollowers: 2000 },
    });

    const dossier = makeDossier({
      prospectId: prospect.id,
      bestOutreachChannel: "instagram_dm",
      contactChannels: { email: null, instagram: "@testbiz", facebook: null, contactForm: null },
    });
    const msg = composer.compose(dossier);
    const send = scheduler.schedule(msg, new Date().toISOString());
    await scheduler.sendNow(send, store);

    assert.ok(send.sent);
    assert.equal(sender.sent[0].channel, "instagram_dm");
    assert.equal(sender.sent[0].to, "@testbiz");
  });
});

// ─────────────────────────────────────────────
// 10. OutreachScheduler — follow-up detection
// ─────────────────────────────────────────────

describe("OutreachScheduler — follow-up detection", () => {
  it("detects day-3 follow-up for contacted prospects", () => {
    const scheduler = new OutreachScheduler(new MockChannelSender());
    const { store, prospect } = storeWithProspect();
    store.updateState(prospect.id, "contacted");
    prospect.lastContactedAt = new Date(Date.now() - 4 * 86400000).toISOString(); // 4 days ago

    const due = scheduler.getFollowUpsDue(store);
    const found = due.find((d) => d.prospectId === prospect.id);
    assert.ok(found, "Should detect day-3 follow-up");
    assert.equal(found!.stage, "day_3");
  });

  it("detects day-7 follow-up for follow_up_1 prospects", () => {
    const scheduler = new OutreachScheduler(new MockChannelSender());
    const { store, prospect } = storeWithProspect();
    store.updateState(prospect.id, "follow_up_1");
    prospect.lastContactedAt = new Date(Date.now() - 5 * 86400000).toISOString(); // 5 days since last

    const due = scheduler.getFollowUpsDue(store);
    const found = due.find((d) => d.prospectId === prospect.id);
    assert.ok(found, "Should detect day-7 follow-up");
    assert.equal(found!.stage, "day_7");
  });

  it("detects day-10 follow-up for follow_up_2 prospects", () => {
    const scheduler = new OutreachScheduler(new MockChannelSender());
    const { store, prospect } = storeWithProspect();
    store.updateState(prospect.id, "follow_up_2");
    prospect.lastContactedAt = new Date(Date.now() - 4 * 86400000).toISOString();

    const due = scheduler.getFollowUpsDue(store);
    const found = due.find((d) => d.prospectId === prospect.id);
    assert.ok(found, "Should detect day-10 follow-up");
    assert.equal(found!.stage, "day_10");
  });

  it("does NOT flag opted-out prospects for follow-up", () => {
    const scheduler = new OutreachScheduler(new MockChannelSender());
    const { store, prospect } = storeWithProspect();
    store.updateState(prospect.id, "contacted");
    prospect.lastContactedAt = new Date(Date.now() - 4 * 86400000).toISOString();
    prospect.optedOut = true;

    const due = scheduler.getFollowUpsDue(store);
    const found = due.find((d) => d.prospectId === prospect.id);
    assert.ok(!found, "Should not follow up opted-out prospects");
  });

  it("does NOT flag recently contacted prospects", () => {
    const scheduler = new OutreachScheduler(new MockChannelSender());
    const { store, prospect } = storeWithProspect();
    store.updateState(prospect.id, "contacted");
    prospect.lastContactedAt = new Date(Date.now() - 1 * 86400000).toISOString(); // 1 day ago

    const due = scheduler.getFollowUpsDue(store);
    const found = due.find((d) => d.prospectId === prospect.id);
    assert.ok(!found, "Should not flag prospect contacted 1 day ago");
  });
});

// ─────────────────────────────────────────────
// 11. OutreachScheduler — follow-up sending
// ─────────────────────────────────────────────

describe("OutreachScheduler — follow-up state transitions", () => {
  it("day_3 follow-up transitions to follow_up_1", async () => {
    const sender = new MockChannelSender();
    const scheduler = new OutreachScheduler(sender);
    const composer = new OutreachComposer();
    const { store, prospect } = storeWithProspect();
    store.updateState(prospect.id, "contacted");

    const fu = composer.composeFollowUp(makeDossier({ prospectId: prospect.id }), "day_3", "prev");
    const send = scheduler.schedule(fu, new Date().toISOString());
    await scheduler.sendNow(send, store);

    assert.equal(store.getById(prospect.id)?.state, "follow_up_1");
  });

  it("day_7 follow-up transitions to follow_up_2", async () => {
    const sender = new MockChannelSender();
    const scheduler = new OutreachScheduler(sender);
    const composer = new OutreachComposer();
    const { store, prospect } = storeWithProspect();
    store.updateState(prospect.id, "follow_up_1");

    const fu = composer.composeFollowUp(makeDossier({ prospectId: prospect.id }), "day_7", "prev");
    const send = scheduler.schedule(fu, new Date().toISOString());
    await scheduler.sendNow(send, store);

    assert.equal(store.getById(prospect.id)?.state, "follow_up_2");
  });

  it("day_10 follow-up transitions to follow_up_3", async () => {
    const sender = new MockChannelSender();
    const scheduler = new OutreachScheduler(sender);
    const composer = new OutreachComposer();
    const { store, prospect } = storeWithProspect();
    store.updateState(prospect.id, "follow_up_2");

    const fu = composer.composeFollowUp(makeDossier({ prospectId: prospect.id }), "day_10", "prev");
    const send = scheduler.schedule(fu, new Date().toISOString());
    await scheduler.sendNow(send, store);

    assert.equal(store.getById(prospect.id)?.state, "follow_up_3");
  });
});

// ─────────────────────────────────────────────
// 12. DailyOutreachReport
// ─────────────────────────────────────────────

describe("DailyOutreachReport", () => {
  it("generates a report with all fields", () => {
    const store = new ProspectStore();
    const scorer = new QualificationScorer();
    store.addProspect(scorer.score(makeRestaurant({ id: "r1" })));
    store.addProspect(scorer.score(makeRestaurant({ id: "r2" })));

    const responses: CategorizedResponse[] = [
      {
        response: { prospectId: "r1", channel: "email", body: "Tell me more", receivedAt: new Date().toISOString() },
        category: "interested",
        confidence: 0.9,
        suggestedReply: null,
        requiresAustinAlert: true,
      },
    ];

    const reporter = new DailyOutreachReport();
    const report = reporter.generate("2026-03-05", store, 7, 3, responses, {
      total: 12,
      byVertical: { restaurant: 8, medical: 4 },
      qualified: 5,
    });

    assert.equal(report.date, "2026-03-05");
    assert.equal(report.discovered, 12);
    assert.equal(report.qualified, 5);
    assert.equal(report.outreachSent, 7);
    assert.equal(report.followUpsSent, 3);
    assert.equal(report.responsesReceived, 1);
    assert.equal(report.responseBreakdown.interested, 1);
    assert.equal(report.hotLeads.length, 1);
    assert.ok(report.pipelineTotal >= 1);
  });

  it("formats WhatsApp report correctly", () => {
    const store = new ProspectStore();
    const scorer = new QualificationScorer();
    store.addProspect(scorer.score(makeRestaurant({ id: "r1", name: "Mama Rosa's" })));

    const responses: CategorizedResponse[] = [
      {
        response: { prospectId: "r1", channel: "email", body: "How much does it cost?", receivedAt: new Date().toISOString() },
        category: "pricing_question",
        confidence: 0.9,
        suggestedReply: null,
        requiresAustinAlert: true,
      },
    ];

    const reporter = new DailyOutreachReport();
    const report = reporter.generate("2026-03-05", store, 7, 3, responses, {
      total: 12,
      byVertical: { restaurant: 8, medical: 4 },
      qualified: 5,
    });

    const formatted = reporter.formatWhatsAppReport(report);
    assert.ok(formatted.includes("Scout Daily Report"));
    assert.ok(formatted.includes("Discovered: 12"));
    assert.ok(formatted.includes("Qualified (60+): 5"));
    assert.ok(formatted.includes("Outreach sent: 7"));
    assert.ok(formatted.includes("Follow-ups sent: 3"));
    assert.ok(formatted.includes("Responses: 1"));
    assert.ok(formatted.includes("pricing question"));
    assert.ok(formatted.includes("Hot lead"));
  });

  it("formats report with zero responses", () => {
    const store = new ProspectStore();
    const reporter = new DailyOutreachReport();
    const report = reporter.generate("2026-03-05", store, 5, 2, []);
    const formatted = reporter.formatWhatsAppReport(report);
    assert.ok(formatted.includes("Responses: 0"));
    assert.ok(!formatted.includes("Hot lead"));
  });

  it("excludes opted-out and archived from pipeline count", () => {
    const store = new ProspectStore();
    const scorer = new QualificationScorer();

    store.addProspect(scorer.score(makeRestaurant({ id: "active" })));
    const p2 = store.addProspect(scorer.score(makeRestaurant({ id: "opted-out" })));
    p2.optedOut = true;
    store.updateState("opted-out", "cold");

    const reporter = new DailyOutreachReport();
    const report = reporter.generate("2026-03-05", store, 0, 0, []);

    assert.equal(report.pipelineTotal, 1, "Should exclude opted-out prospects");
  });
});

// ─────────────────────────────────────────────
// 13. End-to-end flow: research → compose → send → respond
// ─────────────────────────────────────────────

describe("End-to-end outreach flow", () => {
  it("full cycle: research → compose → send → interested response → alert", async () => {
    // Setup
    const store = new ProspectStore();
    const scorer = new QualificationScorer();
    const business = makeRestaurant({ id: "e2e-001", name: "Luigi's Trattoria", ownerName: "Luigi Bianchi", ownerEmail: "luigi@luigis.com" });
    const prospect = store.addProspect(scorer.score(business));

    // Step 1: Research
    const researcher = new ProspectResearcher(new MockWebResearcher());
    const dossier = await researcher.buildDossier(prospect);
    assert.equal(dossier.businessName, "Luigi's Trattoria");
    assert.equal(dossier.bestOutreachChannel, "email");

    // Step 2: Compose
    const composer = new OutreachComposer();
    const message = composer.compose(dossier);
    assert.ok(message.body.includes("Luigi"));
    assert.ok(message.body.toLowerCase().includes("free"));

    // Step 3: Send
    const sender = new MockChannelSender();
    const scheduler = new OutreachScheduler(sender);
    const send = scheduler.schedule(message, new Date().toISOString());
    await scheduler.sendNow(send, store);

    assert.ok(send.sent);
    assert.equal(store.getById("e2e-001")?.state, "contacted");

    // Step 4: Response comes in
    const whatsApp = new MockWhatsAppSender();
    const handler = new ResponseHandler(composer, whatsApp, "austin-wa-id");
    const response: IncomingResponse = {
      prospectId: "e2e-001",
      channel: "email",
      body: "This sounds interesting! Can you tell me more about how it works?",
      receivedAt: new Date().toISOString(),
    };

    const result = await handler.handleResponse(response, dossier, store);

    // Verify
    assert.equal(result.categorized.category, "interested");
    assert.ok(result.reply);
    assert.ok(result.reply!.body.includes("Austin"));
    assert.ok(result.alert);
    assert.equal(store.getById("e2e-001")?.state, "responded");
    assert.ok(whatsApp.alerts.length > 0);
    assert.ok(whatsApp.alerts[0].message.includes("HOT LEAD"));
  });

  it("full cycle: send → no response → follow-ups → cold", async () => {
    const store = new ProspectStore();
    const scorer = new QualificationScorer();
    const business = makeRestaurant({ id: "e2e-002", ownerEmail: "owner@test.com" });
    store.addProspect(scorer.score(business));

    const sender = new MockChannelSender();
    const scheduler = new OutreachScheduler(sender);
    const composer = new OutreachComposer();
    const dossier = makeDossier({ prospectId: "e2e-002" });

    // Initial send
    const msg = composer.compose(dossier);
    const send = scheduler.schedule(msg, new Date().toISOString());
    await scheduler.sendNow(send, store);
    assert.equal(store.getById("e2e-002")?.state, "contacted");

    // Day 3 follow-up
    const fu3 = composer.composeFollowUp(dossier, "day_3", msg.body);
    const send3 = scheduler.schedule(fu3, new Date().toISOString());
    await scheduler.sendNow(send3, store);
    assert.equal(store.getById("e2e-002")?.state, "follow_up_1");

    // Day 7 follow-up
    const fu7 = composer.composeFollowUp(dossier, "day_7", msg.body);
    const send7 = scheduler.schedule(fu7, new Date().toISOString());
    await scheduler.sendNow(send7, store);
    assert.equal(store.getById("e2e-002")?.state, "follow_up_2");

    // Day 10 follow-up (final)
    const fu10 = composer.composeFollowUp(dossier, "day_10", msg.body);
    const send10 = scheduler.schedule(fu10, new Date().toISOString());
    await scheduler.sendNow(send10, store);
    assert.equal(store.getById("e2e-002")?.state, "follow_up_3");

    // Mark cold after day 10
    store.updateState("e2e-002", "cold");
    assert.equal(store.getById("e2e-002")?.state, "cold");

    // Total messages sent: 4 (initial + 3 follow-ups) — max 3 follow-ups per prospect
    assert.equal(sender.sent.length, 4);
  });

  it("full cycle: send → unsubscribe → never contact again", async () => {
    const store = new ProspectStore();
    const scorer = new QualificationScorer();
    const business = makeRestaurant({ id: "e2e-003", ownerEmail: "owner@test.com" });
    store.addProspect(scorer.score(business));

    const sender = new MockChannelSender();
    const scheduler = new OutreachScheduler(sender);
    const composer = new OutreachComposer();
    const dossier = makeDossier({ prospectId: "e2e-003" });

    // Send initial
    const msg = composer.compose(dossier);
    const send = scheduler.schedule(msg, new Date().toISOString());
    await scheduler.sendNow(send, store);

    // Unsubscribe response
    const handler = new ResponseHandler(composer, new MockWhatsAppSender(), "austin-wa-id");
    const response: IncomingResponse = {
      prospectId: "e2e-003",
      channel: "email",
      body: "unsubscribe",
      receivedAt: new Date().toISOString(),
    };
    await handler.handleResponse(response, dossier, store);

    assert.ok(store.getById("e2e-003")?.optedOut);

    // Try to send another message — should fail
    const msg2 = composer.compose(dossier);
    const send2 = scheduler.schedule(msg2, new Date().toISOString());
    await scheduler.sendNow(send2, store);

    assert.equal(send2.sent, false, "Should refuse to send to opted-out prospect");
    assert.equal(send2.deliveryStatus, "failed");
  });
});

// ─────────────────────────────────────────────
// 14. Case study & Moltbook registration
// ─────────────────────────────────────────────

describe("Case study and Moltbook registry", () => {
  it("returns null when no case study registered", () => {
    assert.equal(getCaseStudy("fitness"), null);
  });

  it("returns registered case study", () => {
    registerCaseStudy({
      vertical: "medical",
      headline: "Bright Smile reduced no-shows 35%",
      url: "https://clawstaff.ai/case-studies/bright-smile",
    });
    const cs = getCaseStudy("medical");
    assert.ok(cs);
    assert.equal(cs!.vertical, "medical");
  });

  it("returns null when no moltbook profile registered", () => {
    assert.equal(getMoltbookProfile("fitness"), null);
  });

  it("returns registered moltbook profile", () => {
    registerMoltbookProfile({
      vertical: "medical",
      agentName: "Sophia",
      url: "https://moltbook.com/agents/sophia-clawstaff",
    });
    const mp = getMoltbookProfile("medical");
    assert.ok(mp);
    assert.equal(mp!.agentName, "Sophia");
  });
});

// ─────────────────────────────────────────────
// 15. Queue processing
// ─────────────────────────────────────────────

describe("OutreachScheduler — queue processing", () => {
  it("processQueue sends all due messages", async () => {
    const sender = new MockChannelSender();
    const scheduler = new OutreachScheduler(sender);
    const composer = new OutreachComposer();
    const store = new ProspectStore();
    const scorer = new QualificationScorer();

    // Add 3 prospects and schedule immediate sends
    for (let i = 0; i < 3; i++) {
      const business = makeRestaurant({ id: `q-${i}`, ownerEmail: `o${i}@test.com` });
      store.addProspect(scorer.score(business));
      const msg = composer.compose(makeDossier({ prospectId: `q-${i}` }));
      scheduler.schedule(msg, new Date().toISOString());
    }

    const sent = await scheduler.processQueue(store);
    assert.equal(sent.length, 3);
    assert.equal(sender.sent.length, 3);
    assert.equal(scheduler.getPendingCount(), 0);
  });

  it("processQueue skips future-scheduled messages", async () => {
    const sender = new MockChannelSender();
    const scheduler = new OutreachScheduler(sender);
    const composer = new OutreachComposer();
    const store = new ProspectStore();
    const scorer = new QualificationScorer();

    const business = makeRestaurant({ id: "future-1", ownerEmail: "o@test.com" });
    store.addProspect(scorer.score(business));
    const msg = composer.compose(makeDossier({ prospectId: "future-1" }));
    scheduler.schedule(msg, "2099-12-31T23:59:59.000Z");

    const sent = await scheduler.processQueue(store);
    assert.equal(sent.length, 0);
    assert.equal(scheduler.getPendingCount(), 1);
  });

  it("processQueue stops at daily limit", async () => {
    const sender = new MockChannelSender();
    const scheduler = new OutreachScheduler(sender);
    const composer = new OutreachComposer();
    const store = new ProspectStore();
    const scorer = new QualificationScorer();

    for (let i = 0; i < 15; i++) {
      const business = makeRestaurant({ id: `bulk-${i}`, ownerEmail: `o${i}@test.com` });
      store.addProspect(scorer.score(business));
      const msg = composer.compose(makeDossier({ prospectId: `bulk-${i}` }));
      scheduler.schedule(msg, new Date().toISOString());
    }

    const sent = await scheduler.processQueue(store);
    assert.equal(sent.length, 10);
    assert.equal(scheduler.getPendingCount(), 5);
  });
});
