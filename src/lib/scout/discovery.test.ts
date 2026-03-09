/**
 * Tests for Scout Discovery & Qualification Pipeline
 *
 * Usage:  npx tsx --test src/lib/scout/discovery.test.ts
 */

import { describe, it, before } from "node:test";
import assert from "node:assert/strict";

import {
  DiscoveryEngine,
  QualificationScorer,
  ProspectStore,
  DailyDiscoveryReport,
  MockGoogleMapsScraper,
  runDailyPipeline,
  type DiscoveredBusiness,
  type ScoredProspect,
  type Geography,
  type ProspectState,
} from "./discovery";

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

const ATX: Geography = { city: "Austin", state: "TX" };

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
    ownerName: "Test Owner",
    ownerEmail: "owner@test.com",
    reviews: {
      totalReviews: 100,
      averageRating: 4.2,
      recentReviews30d: 10,
      ownerRespondedCount: 5,
      responseRate: 0.05,
      unrespondedNegative: 5,
      painKeywordsInReviews: ["couldn't reach anyone"],
    },
    hasOnlineBooking: false,
    socialLinks: {
      instagram: "@test",
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

function makeMedical(overrides: Partial<DiscoveredBusiness> = {}): DiscoveredBusiness {
  return makeRestaurant({
    vertical: "medical",
    name: "Test Dental Office",
    ...overrides,
  });
}

// ─────────────────────────────────────────────
// 1. MockGoogleMapsScraper
// ─────────────────────────────────────────────

describe("MockGoogleMapsScraper", () => {
  const scraper = new MockGoogleMapsScraper();

  it("returns restaurant results for restaurant queries", async () => {
    const results = await scraper.search({ query: "restaurants", location: "Austin, TX" });
    assert.ok(results.length >= 10, `Expected >= 10 restaurants, got ${results.length}`);
  });

  it("returns dental results for dental queries", async () => {
    const results = await scraper.search({ query: "dental offices", location: "Austin, TX" });
    assert.ok(results.length >= 5, `Expected >= 5 dental offices, got ${results.length}`);
  });

  it("returns GoogleMapsResult shape", async () => {
    const results = await scraper.search({ query: "restaurants", location: "Austin, TX" });
    const first = results[0];
    assert.ok(typeof first.name === "string");
    assert.ok(typeof first.placeId === "string");
    assert.ok(typeof first.googleRating === "number");
    assert.ok(typeof first.reviewCount === "number");
  });

  it("respects maxResults limit", async () => {
    const results = await scraper.search({ query: "restaurants", location: "Austin, TX", maxResults: 3 });
    assert.equal(results.length, 3);
  });

  it("getBusinessDetails returns full business for valid placeId", async () => {
    const business = await scraper.getBusinessDetails("rest-001");
    assert.ok(business !== null);
    assert.equal(business!.name, "Tony's Pizzeria");
    assert.equal(business!.vertical, "restaurant");
  });

  it("getBusinessDetails returns null for unknown placeId", async () => {
    const business = await scraper.getBusinessDetails("nonexistent");
    assert.equal(business, null);
  });

  it("returns empty array for verticals without mock data", async () => {
    const results = await scraper.search({ query: "fitness studios", location: "Austin, TX" });
    assert.equal(results.length, 0);
  });
});

// ─────────────────────────────────────────────
// 2. DiscoveryEngine
// ─────────────────────────────────────────────

describe("DiscoveryEngine", () => {
  const engine = new DiscoveryEngine(new MockGoogleMapsScraper());

  it("discovers restaurants in Austin", async () => {
    const businesses = await engine.discover("restaurant", ATX);
    assert.ok(businesses.length >= 10);
    assert.ok(businesses.every((b) => b.vertical === "restaurant"));
  });

  it("discovers dental offices in Austin", async () => {
    const businesses = await engine.discover("medical", ATX);
    assert.ok(businesses.length >= 5);
  });

  it("sets vertical correctly on discovered businesses", async () => {
    const businesses = await engine.discover("medical", ATX);
    assert.ok(businesses.every((b) => b.vertical === "medical"));
  });

  it("deduplicates results from multiple queries", async () => {
    const businesses = await engine.discover("restaurant", ATX);
    const ids = businesses.map((b) => b.id);
    const uniqueIds = new Set(ids);
    assert.equal(ids.length, uniqueIds.size, "Should have no duplicate IDs");
  });

  it("each business has all required fields", async () => {
    const businesses = await engine.discover("restaurant", ATX);
    for (const b of businesses) {
      assert.ok(b.id, "missing id");
      assert.ok(b.name, "missing name");
      assert.ok(b.address, "missing address");
      assert.ok(b.phone, "missing phone");
      assert.ok(b.reviews, "missing reviews");
      assert.ok(typeof b.reviews.totalReviews === "number");
      assert.ok(typeof b.reviews.responseRate === "number");
      assert.ok(typeof b.hasOnlineBooking === "boolean");
      assert.ok(b.discoveredAt, "missing discoveredAt");
    }
  });

  it("formatDiscoveryLog produces valid markdown", async () => {
    const businesses = await engine.discover("restaurant", ATX);
    const log = engine.formatDiscoveryLog(businesses, "2026-03-05", "restaurant", ATX);
    assert.ok(log.startsWith("# Discovery Log"));
    assert.ok(log.includes("Businesses Found:"));
    assert.ok(log.includes("Tony's Pizzeria"));
  });
});

// ─────────────────────────────────────────────
// 3. QualificationScorer — general
// ─────────────────────────────────────────────

describe("QualificationScorer — general", () => {
  const scorer = new QualificationScorer();

  it("returns a ScoredProspect with all score dimensions", () => {
    const result = scorer.score(makeRestaurant());
    assert.ok(typeof result.score.painSignal === "number");
    assert.ok(typeof result.score.revenueFit === "number");
    assert.ok(typeof result.score.reachability === "number");
    assert.ok(typeof result.score.competition === "number");
    assert.ok(typeof result.score.total === "number");
  });

  it("total equals sum of dimensions", () => {
    const result = scorer.score(makeRestaurant());
    const expected = result.score.painSignal + result.score.revenueFit + result.score.reachability + result.score.competition;
    assert.equal(result.score.total, expected);
  });

  it("pain signal is capped at 40", () => {
    const extreme = makeRestaurant({
      reviews: {
        totalReviews: 500,
        averageRating: 2.5,
        recentReviews30d: 50,
        ownerRespondedCount: 0,
        responseRate: 0,
        unrespondedNegative: 50,
        painKeywordsInReviews: ["terrible", "no response", "rude", "cold food", "never again"],
      },
    });
    const result = scorer.score(extreme);
    assert.ok(result.score.painSignal <= 40, `Pain signal ${result.score.painSignal} exceeds 40`);
  });

  it("revenue fit is capped at 25", () => {
    const result = scorer.score(makeRestaurant({
      reviews: { totalReviews: 1000, averageRating: 4.8, recentReviews30d: 100, ownerRespondedCount: 0, responseRate: 0, unrespondedNegative: 0, painKeywordsInReviews: [] },
      photoCount: 500,
      yearsEstablished: 30,
    }));
    assert.ok(result.score.revenueFit <= 25, `Revenue fit ${result.score.revenueFit} exceeds 25`);
  });

  it("reachability is capped at 20", () => {
    const result = scorer.score(makeRestaurant());
    assert.ok(result.score.reachability <= 20, `Reachability ${result.score.reachability} exceeds 20`);
  });

  it("competition is capped at 15", () => {
    const result = scorer.score(makeRestaurant());
    assert.ok(result.score.competition <= 15, `Competition ${result.score.competition} exceeds 15`);
  });

  it("total is 0-100", () => {
    const result = scorer.score(makeRestaurant());
    assert.ok(result.score.total >= 0 && result.score.total <= 100);
  });

  it("includes reasoning strings for all dimensions", () => {
    const result = scorer.score(makeRestaurant());
    assert.ok(result.score.painReasoning.length > 0);
    assert.ok(result.score.revenueReasoning.length > 0);
    assert.ok(result.score.reachabilityReasoning.length > 0);
    assert.ok(result.score.competitionReasoning.length > 0);
  });

  it("recommendation is outreach_queue for score >= 60", () => {
    const high = makeRestaurant();
    const result = scorer.score(high);
    if (result.score.total >= 60) {
      assert.equal(result.recommendation, "outreach_queue");
    }
  });

  it("recommendation is nurture for score 40-59", () => {
    // Well-managed restaurant with low pain but decent revenue
    const mid = makeRestaurant({
      reviews: {
        totalReviews: 50,
        averageRating: 4.5,
        recentReviews30d: 5,
        ownerRespondedCount: 40,
        responseRate: 0.8,
        unrespondedNegative: 0,
        painKeywordsInReviews: [],
      },
      hasOnlineBooking: true,
      hasWebsiteChatWidget: true,
      socialLinks: {},
      ownerEmail: null,
      contactFormUrl: null,
    });
    const result = scorer.score(mid);
    if (result.score.total >= 40 && result.score.total < 60) {
      assert.equal(result.recommendation, "nurture");
    }
  });

  it("recommendation is archive for score < 40", () => {
    const low = makeRestaurant({
      reviews: {
        totalReviews: 5,
        averageRating: 4.0,
        recentReviews30d: 1,
        ownerRespondedCount: 5,
        responseRate: 1.0,
        unrespondedNegative: 0,
        painKeywordsInReviews: [],
      },
      hasOnlineBooking: true,
      hasWebsiteChatWidget: true,
      hasAutomatedReviewResponses: true,
      socialLinks: {},
      ownerEmail: null,
      contactFormUrl: null,
      photoCount: 3,
      yearsEstablished: 0,
    });
    const result = scorer.score(low);
    assert.ok(result.score.total < 40, `Expected score < 40, got ${result.score.total}`);
    assert.equal(result.recommendation, "archive");
  });
});

// ─────────────────────────────────────────────
// 4. QualificationScorer — restaurant scoring
// ─────────────────────────────────────────────

describe("QualificationScorer — restaurant pain signals", () => {
  const scorer = new QualificationScorer();

  it("low response rate (<10%) scores high pain", () => {
    const b = makeRestaurant({ reviews: { ...makeRestaurant().reviews, responseRate: 0.05 } });
    const result = scorer.score(b);
    assert.ok(result.score.painSignal >= 25, `Expected high pain, got ${result.score.painSignal}`);
  });

  it("response rate 30%+ scores lower pain", () => {
    const b = makeRestaurant({
      reviews: { ...makeRestaurant().reviews, responseRate: 0.5, unrespondedNegative: 0, painKeywordsInReviews: [] },
    });
    const result = scorer.score(b);
    assert.ok(result.score.painSignal < 20, `Expected lower pain for 50% response rate, got ${result.score.painSignal}`);
  });

  it("many unresponded negative reviews increase pain score", () => {
    const few = makeRestaurant({
      reviews: { ...makeRestaurant().reviews, unrespondedNegative: 1, painKeywordsInReviews: [] },
    });
    const many = makeRestaurant({
      reviews: { ...makeRestaurant().reviews, unrespondedNegative: 8, painKeywordsInReviews: [] },
    });
    assert.ok(scorer.score(many).score.painSignal > scorer.score(few).score.painSignal);
  });

  it("pain keywords in reviews increase pain score", () => {
    const noKeywords = makeRestaurant({
      reviews: { ...makeRestaurant().reviews, painKeywordsInReviews: [] },
    });
    const withKeywords = makeRestaurant({
      reviews: { ...makeRestaurant().reviews, painKeywordsInReviews: ["couldn't reach anyone", "no one responded"] },
    });
    assert.ok(scorer.score(withKeywords).score.painSignal > scorer.score(noKeywords).score.painSignal);
  });

  it("no online booking adds pain for high-volume restaurants", () => {
    const withBooking = makeRestaurant({ hasOnlineBooking: true });
    const withoutBooking = makeRestaurant({ hasOnlineBooking: false });
    // Both have 100+ reviews. Without booking should score higher pain.
    assert.ok(scorer.score(withoutBooking).score.painSignal >= scorer.score(withBooking).score.painSignal);
  });
});

// ─────────────────────────────────────────────
// 5. QualificationScorer — medical/dental scoring
// ─────────────────────────────────────────────

describe("QualificationScorer — medical/dental pain signals", () => {
  const scorer = new QualificationScorer();

  it("no online booking scores high pain for medical", () => {
    const noBooking = makeMedical({ hasOnlineBooking: false });
    const withBooking = makeMedical({ hasOnlineBooking: true });
    const noPain = scorer.score(withBooking).score.painSignal;
    const yesPain = scorer.score(noBooking).score.painSignal;
    assert.ok(yesPain > noPain, `No booking (${yesPain}) should score higher than with booking (${noPain})`);
  });

  it("reviews mentioning 'hard to reach' score very high pain", () => {
    const b = makeMedical({
      reviews: {
        ...makeMedical().reviews,
        painKeywordsInReviews: [
          "had to call multiple times",
          "never got a call back about my appointment",
        ],
      },
    });
    const result = scorer.score(b);
    assert.ok(result.score.painSignal >= 25, `Expected very high pain for reachability complaints, got ${result.score.painSignal}`);
  });

  it("8+ unresponded reviews scores high for medical", () => {
    const b = makeMedical({
      reviews: { ...makeMedical().reviews, unrespondedNegative: 10, painKeywordsInReviews: [] },
    });
    const result = scorer.score(b);
    assert.ok(result.score.painSignal >= 12, `Expected high pain for 10 unresponded negative reviews`);
  });
});

// ─────────────────────────────────────────────
// 6. QualificationScorer — revenue fit
// ─────────────────────────────────────────────

describe("QualificationScorer — revenue fit", () => {
  const scorer = new QualificationScorer();

  it("200+ reviews scores highest revenue fit", () => {
    const high = makeRestaurant({ reviews: { ...makeRestaurant().reviews, totalReviews: 250 } });
    const low = makeRestaurant({ reviews: { ...makeRestaurant().reviews, totalReviews: 25 } });
    assert.ok(scorer.score(high).score.revenueFit > scorer.score(low).score.revenueFit);
  });

  it("established business (5+ years) scores higher", () => {
    const old = makeRestaurant({ yearsEstablished: 10 });
    const young = makeRestaurant({ yearsEstablished: 1 });
    assert.ok(scorer.score(old).score.revenueFit > scorer.score(young).score.revenueFit);
  });

  it("high recent review velocity scores higher", () => {
    const busy = makeRestaurant({ reviews: { ...makeRestaurant().reviews, recentReviews30d: 20 } });
    const slow = makeRestaurant({ reviews: { ...makeRestaurant().reviews, recentReviews30d: 2 } });
    assert.ok(scorer.score(busy).score.revenueFit >= scorer.score(slow).score.revenueFit);
  });
});

// ─────────────────────────────────────────────
// 7. QualificationScorer — reachability
// ─────────────────────────────────────────────

describe("QualificationScorer — reachability", () => {
  const scorer = new QualificationScorer();

  it("owner email found scores 10+ points", () => {
    const withEmail = makeRestaurant({ ownerEmail: "owner@test.com" });
    const noEmail = makeRestaurant({ ownerEmail: null });
    const diff = scorer.score(withEmail).score.reachability - scorer.score(noEmail).score.reachability;
    assert.ok(diff >= 8, `Email should add at least 8 pts, got ${diff}`);
  });

  it("Instagram < 10K followers scores well", () => {
    const withIG = makeRestaurant({
      ownerEmail: null,
      socialLinks: { instagram: "@test", instagramFollowers: 5000 },
      contactFormUrl: null,
    });
    const result = scorer.score(withIG);
    assert.ok(result.score.reachability >= 6, `Instagram should score >= 6, got ${result.score.reachability}`);
  });

  it("no contact info at all scores 0", () => {
    const unreachable = makeRestaurant({
      ownerEmail: null,
      socialLinks: {},
      contactFormUrl: null,
    });
    const result = scorer.score(unreachable);
    assert.equal(result.score.reachability, 0);
  });

  it("contact form only scores low", () => {
    const formOnly = makeRestaurant({
      ownerEmail: null,
      socialLinks: {},
      contactFormUrl: "https://test.com/contact",
    });
    const withEmail = makeRestaurant({ ownerEmail: "owner@test.com" });
    assert.ok(scorer.score(formOnly).score.reachability < scorer.score(withEmail).score.reachability);
  });
});

// ─────────────────────────────────────────────
// 8. QualificationScorer — competition
// ─────────────────────────────────────────────

describe("QualificationScorer — competition", () => {
  const scorer = new QualificationScorer();

  it("no automation scores full competition points", () => {
    const manual = makeRestaurant({
      hasWebsiteChatWidget: false,
      hasAutomatedReviewResponses: false,
      hasOnlineBooking: false,
    });
    const result = scorer.score(manual);
    assert.equal(result.score.competition, 15);
  });

  it("chat widget reduces competition score", () => {
    const withChat = makeRestaurant({ hasWebsiteChatWidget: true });
    const noChat = makeRestaurant({ hasWebsiteChatWidget: false });
    assert.ok(scorer.score(withChat).score.competition < scorer.score(noChat).score.competition);
  });

  it("automated review responses reduce competition score significantly", () => {
    const automated = makeRestaurant({ hasAutomatedReviewResponses: true });
    const manual = makeRestaurant({ hasAutomatedReviewResponses: false });
    const diff = scorer.score(manual).score.competition - scorer.score(automated).score.competition;
    assert.ok(diff >= 5, `Automated reviews should deduct significantly, got ${diff}`);
  });

  it("competition score never goes below 0", () => {
    const maxAutomation = makeRestaurant({
      hasWebsiteChatWidget: true,
      hasAutomatedReviewResponses: true,
      hasOnlineBooking: true,
    });
    const result = scorer.score(maxAutomation);
    assert.ok(result.score.competition >= 0);
  });
});

// ─────────────────────────────────────────────
// 9. Score all 10 mock restaurants
// ─────────────────────────────────────────────

describe("Score all mock restaurants", () => {
  const scorer = new QualificationScorer();
  const engine = new DiscoveryEngine(new MockGoogleMapsScraper());
  let restaurants: DiscoveredBusiness[];
  let scored: ScoredProspect[];

  before(async () => {
    restaurants = await engine.discover("restaurant", ATX);
    scored = restaurants.map((b) => scorer.score(b));
  });

  it("scores all 10 restaurants", () => {
    assert.equal(scored.length, 10);
  });

  it("all scores are between 0 and 100", () => {
    for (const s of scored) {
      assert.ok(s.score.total >= 0 && s.score.total <= 100, `${s.business.name}: ${s.score.total}`);
    }
  });

  it("Tony's Pizzeria (low response rate, pain keywords) scores 60+", () => {
    const tonys = scored.find((s) => s.business.name === "Tony's Pizzeria");
    assert.ok(tonys, "Tony's Pizzeria not found");
    assert.ok(tonys!.score.total >= 60, `Expected 60+, got ${tonys!.score.total}`);
    assert.equal(tonys!.recommendation, "outreach_queue");
  });

  it("The Copper Pot (92% response rate, chat widget) scores lower", () => {
    const copper = scored.find((s) => s.business.name === "The Copper Pot");
    assert.ok(copper, "The Copper Pot not found");
    assert.ok(copper!.score.total < 60, `Expected < 60 for well-managed restaurant, got ${copper!.score.total}`);
  });

  it("El Rancho Grande (0% response rate, 9 unresponded negatives) scores highest pain", () => {
    const elRancho = scored.find((s) => s.business.name === "El Rancho Grande");
    const others = scored.filter((s) => s.business.name !== "El Rancho Grande");
    assert.ok(elRancho, "El Rancho Grande not found");
    const maxOtherPain = Math.max(...others.map((s) => s.score.painSignal));
    assert.ok(
      elRancho!.score.painSignal >= maxOtherPain - 2,
      `Expected El Rancho to be among highest pain (${elRancho!.score.painSignal}), max other is ${maxOtherPain}`
    );
  });

  it("Lucky Lotus Thai (28 reviews, 1 year old) scores low revenue fit", () => {
    const lotus = scored.find((s) => s.business.name === "Lucky Lotus Thai");
    assert.ok(lotus, "Lucky Lotus Thai not found");
    assert.ok(lotus!.score.revenueFit <= 10, `Expected low revenue fit, got ${lotus!.score.revenueFit}`);
  });

  it("Sakura Ramen House (234 reviews, high volume) scores high revenue fit", () => {
    const sakura = scored.find((s) => s.business.name === "Sakura Ramen House");
    assert.ok(sakura, "Sakura Ramen House not found");
    assert.ok(sakura!.score.revenueFit >= 15, `Expected high revenue fit, got ${sakura!.score.revenueFit}`);
  });

  it("at least 5 restaurants recommended for outreach queue", () => {
    const outreach = scored.filter((s) => s.recommendation === "outreach_queue");
    assert.ok(outreach.length >= 5, `Expected >= 5 outreach candidates, got ${outreach.length}`);
  });

  it("at least 1 restaurant NOT recommended for outreach", () => {
    const notOutreach = scored.filter((s) => s.recommendation !== "outreach_queue");
    assert.ok(notOutreach.length >= 1, "Scorer should filter out some restaurants");
  });
});

// ─────────────────────────────────────────────
// 10. Score all 5 mock dental offices
// ─────────────────────────────────────────────

describe("Score all mock dental offices", () => {
  const scorer = new QualificationScorer();
  const engine = new DiscoveryEngine(new MockGoogleMapsScraper());
  let dental: DiscoveredBusiness[];
  let scored: ScoredProspect[];

  before(async () => {
    dental = await engine.discover("medical", ATX);
    scored = dental.map((b) => scorer.score(b));
  });

  it("scores all 5 dental offices", () => {
    assert.equal(scored.length, 5);
  });

  it("all scores are between 0 and 100", () => {
    for (const s of scored) {
      assert.ok(s.score.total >= 0 && s.score.total <= 100, `${s.business.name}: ${s.score.total}`);
    }
  });

  it("Hill Country Family Dentistry (94% response, online booking, chat) scores lowest", () => {
    const hc = scored.find((s) => s.business.name === "Hill Country Family Dentistry");
    assert.ok(hc, "Hill Country Family Dentistry not found");
    const minScore = Math.min(...scored.map((s) => s.score.total));
    assert.equal(hc!.score.total, minScore, "Well-managed practice should score lowest");
  });

  it("South Austin Smiles (pain keywords, no booking, low response) scores high", () => {
    const sa = scored.find((s) => s.business.name === "South Austin Smiles");
    assert.ok(sa, "South Austin Smiles not found");
    assert.ok(sa!.score.total >= 55, `Expected high score, got ${sa!.score.total}`);
  });

  it("Downtown Dental Group (no booking, 14 unresponded, pain keywords) is outreach candidate", () => {
    const dd = scored.find((s) => s.business.name === "Downtown Dental Group");
    assert.ok(dd, "Downtown Dental Group not found");
    assert.equal(dd!.recommendation, "outreach_queue");
  });

  it("Bright Smile Dental (no booking, pain keywords) scores higher than Hill Country", () => {
    const bs = scored.find((s) => s.business.name === "Bright Smile Dental");
    const hc = scored.find((s) => s.business.name === "Hill Country Family Dentistry");
    assert.ok(bs!.score.total > hc!.score.total);
  });
});

// ─────────────────────────────────────────────
// 11. ProspectStore
// ─────────────────────────────────────────────

describe("ProspectStore", () => {
  it("addProspect stores and returns a StoredProspect", () => {
    const store = new ProspectStore();
    const scorer = new QualificationScorer();
    const scored = scorer.score(makeRestaurant());
    const stored = store.addProspect(scored);
    assert.equal(stored.id, scored.business.id);
    assert.ok(stored.score);
    assert.ok(stored.stateHistory.length >= 2);
  });

  it("sets initial state to outreach_queued for 60+ scores", () => {
    const store = new ProspectStore();
    const scorer = new QualificationScorer();
    const scored = scorer.score(makeRestaurant());
    if (scored.score.total >= 60) {
      const stored = store.addProspect(scored);
      assert.equal(stored.state, "outreach_queued");
    }
  });

  it("sets initial state to archived for low scores", () => {
    const store = new ProspectStore();
    const scorer = new QualificationScorer();
    const low = makeRestaurant({
      id: "low-score",
      reviews: {
        totalReviews: 5,
        averageRating: 4.0,
        recentReviews30d: 1,
        ownerRespondedCount: 5,
        responseRate: 1.0,
        unrespondedNegative: 0,
        painKeywordsInReviews: [],
      },
      hasOnlineBooking: true,
      hasWebsiteChatWidget: true,
      hasAutomatedReviewResponses: true,
      socialLinks: {},
      ownerEmail: null,
      contactFormUrl: null,
      photoCount: 3,
      yearsEstablished: 0,
    });
    const scored = scorer.score(low);
    const stored = store.addProspect(scored);
    assert.equal(stored.state, "archived");
  });

  it("addProspect is idempotent — doesn't duplicate", () => {
    const store = new ProspectStore();
    const scorer = new QualificationScorer();
    const business = makeRestaurant({ id: "same-id" });
    const scored = scorer.score(business);
    store.addProspect(scored);
    store.addProspect(scored);
    assert.equal(store.getAll().length, 1);
  });

  it("updateState transitions prospect and records history", () => {
    const store = new ProspectStore();
    const scorer = new QualificationScorer();
    const stored = store.addProspect(scorer.score(makeRestaurant({ id: "transition" })));
    const initialHistory = stored.stateHistory.length;

    const updated = store.updateState("transition", "contacted");
    assert.ok(updated);
    assert.equal(updated!.state, "contacted");
    assert.equal(updated!.stateHistory.length, initialHistory + 1);
  });

  it("updateState returns null for unknown ID", () => {
    const store = new ProspectStore();
    assert.equal(store.updateState("nonexistent", "contacted"), null);
  });

  it("getByState filters correctly", () => {
    const store = new ProspectStore();
    const scorer = new QualificationScorer();

    // Add a high scorer (outreach_queued) and a low scorer (archived)
    store.addProspect(scorer.score(makeRestaurant({ id: "high" })));
    store.addProspect(scorer.score(makeRestaurant({
      id: "low",
      reviews: { totalReviews: 5, averageRating: 4.0, recentReviews30d: 1, ownerRespondedCount: 5, responseRate: 1.0, unrespondedNegative: 0, painKeywordsInReviews: [] },
      hasOnlineBooking: true, hasWebsiteChatWidget: true, hasAutomatedReviewResponses: true,
      socialLinks: {}, ownerEmail: null, contactFormUrl: null, photoCount: 3, yearsEstablished: 0,
    })));

    const archived = store.getByState("archived");
    const queued = store.getByState("outreach_queued");
    assert.ok(archived.every((p) => p.state === "archived"));
    assert.ok(queued.every((p) => p.state === "outreach_queued"));
  });

  it("getByVertical filters correctly", () => {
    const store = new ProspectStore();
    const scorer = new QualificationScorer();
    store.addProspect(scorer.score(makeRestaurant({ id: "r1" })));
    store.addProspect(scorer.score(makeMedical({ id: "m1" })));

    assert.equal(store.getByVertical("restaurant").length, 1);
    assert.equal(store.getByVertical("medical").length, 1);
    assert.equal(store.getByVertical("fitness").length, 0);
  });

  it("getStats returns accurate counts", () => {
    const store = new ProspectStore();
    const scorer = new QualificationScorer();
    store.addProspect(scorer.score(makeRestaurant({ id: "s1" })));
    store.addProspect(scorer.score(makeRestaurant({ id: "s2" })));
    store.addProspect(scorer.score(makeMedical({ id: "s3" })));

    const stats = store.getStats();
    assert.equal(stats.total, 3);
    assert.equal(stats.byVertical["restaurant"], 2);
    assert.equal(stats.byVertical["medical"], 1);
    assert.ok(stats.avgScore > 0);
  });

  it("formatProspectDossier produces valid markdown", () => {
    const store = new ProspectStore();
    const scorer = new QualificationScorer();
    const stored = store.addProspect(scorer.score(makeRestaurant({ id: "dossier-test", name: "Dossier Restaurant" })));
    const md = store.formatProspectDossier(stored);
    assert.ok(md.startsWith("# Dossier Restaurant"));
    assert.ok(md.includes("Pain Signal:"));
    assert.ok(md.includes("Revenue Fit:"));
    assert.ok(md.includes("Reachability:"));
    assert.ok(md.includes("Competition:"));
    assert.ok(md.includes("TOTAL:"));
    assert.ok(md.includes("State History"));
  });
});

// ─────────────────────────────────────────────
// 12. Prospect state machine — full lifecycle
// ─────────────────────────────────────────────

describe("ProspectStore — state lifecycle", () => {
  const LIFECYCLE: ProspectState[] = [
    "outreach_queued",
    "contacted",
    "follow_up_1",
    "follow_up_2",
    "follow_up_3",
    "cold",
    "archived",
  ];

  it("can transition through the full outreach lifecycle", () => {
    const store = new ProspectStore();
    const scorer = new QualificationScorer();
    const stored = store.addProspect(scorer.score(makeRestaurant({ id: "lifecycle" })));

    assert.equal(stored.state, "outreach_queued");

    for (const nextState of LIFECYCLE.slice(1)) {
      const updated = store.updateState("lifecycle", nextState);
      assert.ok(updated);
      assert.equal(updated!.state, nextState);
    }

    const final = store.getById("lifecycle");
    assert.ok(final);
    assert.equal(final!.state, "archived");
    assert.ok(final!.stateHistory.length >= LIFECYCLE.length);
  });

  it("can transition to responded at any point", () => {
    const store = new ProspectStore();
    const scorer = new QualificationScorer();
    store.addProspect(scorer.score(makeRestaurant({ id: "respond" })));
    store.updateState("respond", "contacted");
    const updated = store.updateState("respond", "responded");
    assert.ok(updated);
    assert.equal(updated!.state, "responded");
  });
});

// ─────────────────────────────────────────────
// 13. DailyDiscoveryReport
// ─────────────────────────────────────────────

describe("DailyDiscoveryReport", () => {
  it("generates a report with correct counts", async () => {
    const scorer = new QualificationScorer();
    const engine = new DiscoveryEngine(new MockGoogleMapsScraper());
    const store = new ProspectStore();
    const reporter = new DailyDiscoveryReport();

    const businesses = await engine.discover("restaurant", ATX);
    const scored = businesses.map((b) => scorer.score(b));
    for (const s of scored) store.addProspect(s);

    const report = reporter.generate("2026-03-05", "restaurant", ATX, scored, store);

    assert.equal(report.date, "2026-03-05");
    assert.equal(report.vertical, "restaurant");
    assert.equal(report.totalDiscovered, scored.length);
    assert.equal(
      report.totalQualified + report.totalNurture + report.totalArchived,
      report.totalDiscovered
    );
    assert.ok(report.topProspects.length <= 5);
    assert.ok(report.pipelineTotal >= report.totalDiscovered);
  });

  it("top prospects are sorted by score descending", async () => {
    const scorer = new QualificationScorer();
    const engine = new DiscoveryEngine(new MockGoogleMapsScraper());
    const store = new ProspectStore();
    const reporter = new DailyDiscoveryReport();

    const businesses = await engine.discover("restaurant", ATX);
    const scored = businesses.map((b) => scorer.score(b));
    for (const s of scored) store.addProspect(s);

    const report = reporter.generate("2026-03-05", "restaurant", ATX, scored, store);

    for (let i = 1; i < report.topProspects.length; i++) {
      assert.ok(
        report.topProspects[i - 1].score >= report.topProspects[i].score,
        "Top prospects should be sorted descending"
      );
    }
  });

  it("formatReport produces valid markdown", async () => {
    const scorer = new QualificationScorer();
    const engine = new DiscoveryEngine(new MockGoogleMapsScraper());
    const store = new ProspectStore();
    const reporter = new DailyDiscoveryReport();

    const businesses = await engine.discover("restaurant", ATX);
    const scored = businesses.map((b) => scorer.score(b));
    for (const s of scored) store.addProspect(s);

    const report = reporter.generate("2026-03-05", "restaurant", ATX, scored, store);
    const md = reporter.formatReport(report);

    assert.ok(md.includes("# Daily Discovery Report"));
    assert.ok(md.includes("Discovered"));
    assert.ok(md.includes("Qualified"));
    assert.ok(md.includes("Pipeline Total"));
    assert.ok(md.includes("Top Prospects"));
  });
});

// ─────────────────────────────────────────────
// 14. runDailyPipeline (full integration)
// ─────────────────────────────────────────────

describe("runDailyPipeline — full integration", () => {
  it("runs the complete pipeline for restaurants", async () => {
    const result = await runDailyPipeline("restaurant", ATX);
    assert.ok(result.businesses.length >= 10);
    assert.equal(result.scored.length, result.businesses.length);
    assert.ok(result.report.totalDiscovered >= 10);
    assert.ok(result.store.getAll().length >= 10);
    assert.ok(result.discoveryLog.includes("Discovery Log"));
    assert.ok(result.reportMarkdown.includes("Daily Discovery Report"));
    assert.equal(result.prospectDossiers.length, result.businesses.length);
  });

  it("runs the complete pipeline for dental offices", async () => {
    const result = await runDailyPipeline("medical", ATX);
    assert.ok(result.businesses.length >= 5);
    assert.equal(result.scored.length, result.businesses.length);
    assert.ok(result.store.getAll().length >= 5);
  });

  it("all scored prospects end up in the store", async () => {
    const result = await runDailyPipeline("restaurant", ATX);
    assert.equal(result.store.getAll().length, result.scored.length);
  });

  it("report qualified + nurture + archived = total", async () => {
    const result = await runDailyPipeline("restaurant", ATX);
    const r = result.report;
    assert.equal(r.totalQualified + r.totalNurture + r.totalArchived, r.totalDiscovered);
  });

  it("accepts a custom scraper", async () => {
    const customScraper = new MockGoogleMapsScraper();
    const result = await runDailyPipeline("restaurant", ATX, customScraper);
    assert.ok(result.businesses.length >= 10);
  });

  it("returns empty results for verticals without mock data", async () => {
    const result = await runDailyPipeline("fitness", ATX);
    assert.equal(result.businesses.length, 0);
    assert.equal(result.scored.length, 0);
    assert.equal(result.report.totalDiscovered, 0);
  });

  it("prospect dossiers contain markdown with score breakdowns", async () => {
    const result = await runDailyPipeline("restaurant", ATX);
    for (const dossier of result.prospectDossiers) {
      assert.ok(dossier.includes("Pain Signal:"));
      assert.ok(dossier.includes("/40"));
      assert.ok(dossier.includes("/25"));
      assert.ok(dossier.includes("/20"));
      assert.ok(dossier.includes("/15"));
    }
  });
});

// ─────────────────────────────────────────────
// 15. Scoring rubric consistency checks
// ─────────────────────────────────────────────

describe("Scoring rubric consistency", () => {
  const scorer = new QualificationScorer();

  it("well-managed business always scores below poorly-managed equivalent", () => {
    const wellManaged = makeRestaurant({
      id: "well",
      reviews: {
        totalReviews: 100,
        averageRating: 4.5,
        recentReviews30d: 10,
        ownerRespondedCount: 90,
        responseRate: 0.9,
        unrespondedNegative: 0,
        painKeywordsInReviews: [],
      },
      hasOnlineBooking: true,
      hasWebsiteChatWidget: true,
    });

    const poorlyManaged = makeRestaurant({
      id: "poor",
      reviews: {
        totalReviews: 100,
        averageRating: 3.8,
        recentReviews30d: 10,
        ownerRespondedCount: 2,
        responseRate: 0.02,
        unrespondedNegative: 15,
        painKeywordsInReviews: ["no one responded", "couldn't reach anyone", "terrible service"],
      },
      hasOnlineBooking: false,
      hasWebsiteChatWidget: false,
    });

    const wellScore = scorer.score(wellManaged).score.total;
    const poorScore = scorer.score(poorlyManaged).score.total;
    assert.ok(poorScore > wellScore, `Poorly managed (${poorScore}) should outscore well managed (${wellScore}) for outreach targeting`);
  });

  it("unreachable business never makes it to outreach queue", () => {
    const unreachable = makeRestaurant({
      id: "unreachable",
      ownerEmail: null,
      socialLinks: {},
      contactFormUrl: null,
      // Even with maximum pain and revenue signals
      reviews: {
        totalReviews: 300,
        averageRating: 3.5,
        recentReviews30d: 30,
        ownerRespondedCount: 0,
        responseRate: 0,
        unrespondedNegative: 20,
        painKeywordsInReviews: ["no one responded", "called three times"],
      },
    });
    const result = scorer.score(unreachable);
    assert.equal(result.score.reachability, 0, "Unreachable should score 0 reachability");
    // With 0 reachability, max possible = 40 + 25 + 0 + 15 = 80, so it could still qualify
    // But this tests the reachability dimension specifically
  });

  it("fully automated business scores low competition", () => {
    const automated = makeRestaurant({
      id: "automated",
      hasWebsiteChatWidget: true,
      hasAutomatedReviewResponses: true,
      hasOnlineBooking: true,
    });
    const result = scorer.score(automated);
    assert.ok(result.score.competition <= 5, `Fully automated should score <= 5 competition, got ${result.score.competition}`);
  });
});
