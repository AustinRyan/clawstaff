// ─────────────────────────────────────────────
// Scout Discovery & Qualification Pipeline
//
// Daily pipeline: discover businesses → score them → queue for outreach.
// Google Maps scraping is mocked (interface-ready for Agent Browser).
// ─────────────────────────────────────────────

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export type Vertical =
  | "restaurant"
  | "realtor"
  | "fitness"
  | "medical"
  | "home-services"
  | "ecommerce";

export type ProspectState =
  | "discovered"
  | "qualified"
  | "outreach_queued"
  | "contacted"
  | "follow_up_1"
  | "follow_up_2"
  | "follow_up_3"
  | "responded"
  | "cold"
  | "archived";

export interface Geography {
  city: string;
  state: string;
  zipRadius?: number; // miles
}

export interface SocialLinks {
  instagram?: string;
  instagramFollowers?: number;
  facebook?: string;
  facebookActive?: boolean; // posted in last 30 days
  yelp?: string;
  twitter?: string;
}

export interface ReviewSnapshot {
  totalReviews: number;
  averageRating: number;
  recentReviews30d: number;
  ownerRespondedCount: number;
  responseRate: number; // 0-1
  unrespondedNegative: number; // 1-2 star reviews with no owner reply
  painKeywordsInReviews: string[]; // e.g. "couldn't reach anyone", "no one called back"
}

export interface DiscoveredBusiness {
  id: string;
  name: string;
  vertical: Vertical;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  websiteUrl: string | null;
  ownerName: string | null;
  ownerEmail: string | null;
  reviews: ReviewSnapshot;
  hasOnlineBooking: boolean;
  socialLinks: SocialLinks;
  hoursOfOperation: string;
  photoCount: number;
  yearsEstablished: number | null;
  hasWebsiteChatWidget: boolean;
  hasAutomatedReviewResponses: boolean;
  contactFormUrl: string | null;
  discoveredAt: string; // ISO 8601
  discoveredFrom: string; // "google_maps" | "yelp" | "zillow" etc.
}

export interface ScoreBreakdown {
  painSignal: number; // 0-40
  revenueFit: number; // 0-25
  reachability: number; // 0-20
  competition: number; // 0-15
  total: number; // 0-100
  painReasoning: string;
  revenueReasoning: string;
  reachabilityReasoning: string;
  competitionReasoning: string;
}

export interface ScoredProspect {
  business: DiscoveredBusiness;
  score: ScoreBreakdown;
  recommendation: "outreach_queue" | "nurture" | "archive";
  scoredAt: string;
}

export interface StoredProspect {
  id: string;
  business: DiscoveredBusiness;
  score: ScoreBreakdown | null;
  state: ProspectState;
  stateHistory: Array<{ state: ProspectState; at: string }>;
  outreachChannel: string | null;
  outreachMessages: Array<{ sentAt: string; channel: string; messagePreview: string }>;
  lastContactedAt: string | null;
  optedOut: boolean;
  notes: string[];
}

export interface DailyReport {
  date: string;
  geography: Geography;
  vertical: Vertical;
  totalDiscovered: number;
  totalQualified: number;
  totalNurture: number;
  totalArchived: number;
  topProspects: Array<{ name: string; score: number; vertical: Vertical }>;
  pipelineTotal: number;
}

// ─────────────────────────────────────────────
// Google Maps Scraper Interface (mock-ready)
// ─────────────────────────────────────────────

export interface GoogleMapsResult {
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  websiteUrl: string | null;
  googleRating: number;
  reviewCount: number;
  photoCount: number;
  placeId: string;
  businessType: string;
  hoursOfOperation: string;
}

export interface GoogleMapsScraperOptions {
  query: string;
  location: string; // "city, state" or zip
  radius?: number; // miles
  maxResults?: number;
}

export interface IGoogleMapsScraper {
  search(options: GoogleMapsScraperOptions): Promise<GoogleMapsResult[]>;
  getBusinessDetails(placeId: string): Promise<DiscoveredBusiness | null>;
}

// ─────────────────────────────────────────────
// Mock Google Maps Scraper
// ─────────────────────────────────────────────

const MOCK_RESTAURANTS: DiscoveredBusiness[] = [
  {
    id: "rest-001",
    name: "Tony's Pizzeria",
    vertical: "restaurant",
    address: "412 Congress Ave",
    city: "Austin",
    state: "TX",
    zip: "78701",
    phone: "(512) 555-0101",
    websiteUrl: "https://tonyspizzeria-atx.com",
    ownerName: "Tony Moretti",
    ownerEmail: null,
    reviews: {
      totalReviews: 67,
      averageRating: 4.2,
      recentReviews30d: 8,
      ownerRespondedCount: 4,
      responseRate: 0.06,
      unrespondedNegative: 3,
      painKeywordsInReviews: ["called to ask about a private event, no one picked up"],
    },
    hasOnlineBooking: false,
    socialLinks: {
      instagram: "@tonyspizzeria_atx",
      instagramFollowers: 800,
      facebook: "facebook.com/tonyspizzeriaatx",
      facebookActive: true,
    },
    hoursOfOperation: "Tue-Sun 11am-10pm",
    photoCount: 45,
    yearsEstablished: 8,
    hasWebsiteChatWidget: false,
    hasAutomatedReviewResponses: false,
    contactFormUrl: null,
    discoveredAt: new Date().toISOString(),
    discoveredFrom: "google_maps",
  },
  {
    id: "rest-002",
    name: "Sakura Ramen House",
    vertical: "restaurant",
    address: "1823 S Lamar Blvd",
    city: "Austin",
    state: "TX",
    zip: "78704",
    phone: "(512) 555-0102",
    websiteUrl: "https://sakuraramen.com",
    ownerName: "Kenji Yamamoto",
    ownerEmail: "kenji@sakuraramen.com",
    reviews: {
      totalReviews: 234,
      averageRating: 4.5,
      recentReviews30d: 22,
      ownerRespondedCount: 12,
      responseRate: 0.05,
      unrespondedNegative: 7,
      painKeywordsInReviews: [
        "waited 20 minutes on hold for a reservation",
        "no one responded to my Google question",
      ],
    },
    hasOnlineBooking: false,
    socialLinks: {
      instagram: "@sakuraramenatx",
      instagramFollowers: 4200,
      facebook: "facebook.com/sakuraramenatx",
      facebookActive: true,
    },
    hoursOfOperation: "Mon-Sun 11am-11pm",
    photoCount: 180,
    yearsEstablished: 5,
    hasWebsiteChatWidget: false,
    hasAutomatedReviewResponses: false,
    contactFormUrl: "https://sakuraramen.com/contact",
    discoveredAt: new Date().toISOString(),
    discoveredFrom: "google_maps",
  },
  {
    id: "rest-003",
    name: "El Rancho Grande",
    vertical: "restaurant",
    address: "5509 N Lamar Blvd",
    city: "Austin",
    state: "TX",
    zip: "78751",
    phone: "(512) 555-0103",
    websiteUrl: null,
    ownerName: "Maria Gonzalez",
    ownerEmail: null,
    reviews: {
      totalReviews: 142,
      averageRating: 4.0,
      recentReviews30d: 11,
      ownerRespondedCount: 0,
      responseRate: 0,
      unrespondedNegative: 9,
      painKeywordsInReviews: [
        "called three times about catering, no answer",
        "left a message, never heard back",
      ],
    },
    hasOnlineBooking: false,
    socialLinks: {
      facebook: "facebook.com/elranchogrande",
      facebookActive: false,
    },
    hoursOfOperation: "Mon-Sat 10am-9pm",
    photoCount: 60,
    yearsEstablished: 12,
    hasWebsiteChatWidget: false,
    hasAutomatedReviewResponses: false,
    contactFormUrl: null,
    discoveredAt: new Date().toISOString(),
    discoveredFrom: "google_maps",
  },
  {
    id: "rest-004",
    name: "The Copper Pot",
    vertical: "restaurant",
    address: "2100 South 1st St",
    city: "Austin",
    state: "TX",
    zip: "78704",
    phone: "(512) 555-0104",
    websiteUrl: "https://thecopperpot.com",
    ownerName: "Sarah Chen",
    ownerEmail: "sarah@thecopperpot.com",
    reviews: {
      totalReviews: 89,
      averageRating: 4.6,
      recentReviews30d: 6,
      ownerRespondedCount: 82,
      responseRate: 0.92,
      unrespondedNegative: 0,
      painKeywordsInReviews: [],
    },
    hasOnlineBooking: true,
    socialLinks: {
      instagram: "@thecopperpot_atx",
      instagramFollowers: 6800,
      facebook: "facebook.com/thecopperpot",
      facebookActive: true,
    },
    hoursOfOperation: "Tue-Sun 5pm-10pm",
    photoCount: 120,
    yearsEstablished: 3,
    hasWebsiteChatWidget: true,
    hasAutomatedReviewResponses: false,
    contactFormUrl: "https://thecopperpot.com/contact",
    discoveredAt: new Date().toISOString(),
    discoveredFrom: "google_maps",
  },
  {
    id: "rest-005",
    name: "Pho King Delicious",
    vertical: "restaurant",
    address: "8650 Spicewood Springs Rd",
    city: "Austin",
    state: "TX",
    zip: "78759",
    phone: "(512) 555-0105",
    websiteUrl: "https://phokingdelicious.com",
    ownerName: null,
    ownerEmail: null,
    reviews: {
      totalReviews: 312,
      averageRating: 4.3,
      recentReviews30d: 28,
      ownerRespondedCount: 15,
      responseRate: 0.05,
      unrespondedNegative: 12,
      painKeywordsInReviews: [
        "couldn't reach anyone about our order",
        "no one responded to my complaint",
      ],
    },
    hasOnlineBooking: false,
    socialLinks: {
      instagram: "@phokingdelicious",
      instagramFollowers: 9200,
      facebook: "facebook.com/phokingdelicious",
      facebookActive: true,
    },
    hoursOfOperation: "Mon-Sun 10am-9pm",
    photoCount: 210,
    yearsEstablished: 6,
    hasWebsiteChatWidget: false,
    hasAutomatedReviewResponses: false,
    contactFormUrl: "https://phokingdelicious.com/contact",
    discoveredAt: new Date().toISOString(),
    discoveredFrom: "google_maps",
  },
  {
    id: "rest-006",
    name: "Magnolia Cafe South",
    vertical: "restaurant",
    address: "1920 S Congress Ave",
    city: "Austin",
    state: "TX",
    zip: "78704",
    phone: "(512) 555-0106",
    websiteUrl: "https://magnoliacafe.com",
    ownerName: "Dave Porter",
    ownerEmail: "dave@magnoliacafe.com",
    reviews: {
      totalReviews: 520,
      averageRating: 4.1,
      recentReviews30d: 35,
      ownerRespondedCount: 40,
      responseRate: 0.08,
      unrespondedNegative: 18,
      painKeywordsInReviews: [
        "no response to my negative review from 2 weeks ago",
        "tried to call about an event, couldn't get through",
      ],
    },
    hasOnlineBooking: false,
    socialLinks: {
      instagram: "@magnoliacafe_atx",
      instagramFollowers: 15000,
      facebook: "facebook.com/magnoliacafe",
      facebookActive: true,
    },
    hoursOfOperation: "Mon-Sun 7am-12am",
    photoCount: 400,
    yearsEstablished: 15,
    hasWebsiteChatWidget: false,
    hasAutomatedReviewResponses: false,
    contactFormUrl: "https://magnoliacafe.com/contact",
    discoveredAt: new Date().toISOString(),
    discoveredFrom: "google_maps",
  },
  {
    id: "rest-007",
    name: "Tiny's No. 5",
    vertical: "restaurant",
    address: "2 W 5th St",
    city: "Austin",
    state: "TX",
    zip: "78703",
    phone: "(512) 555-0107",
    websiteUrl: "https://tinys5.com",
    ownerName: "Jenna Hayes",
    ownerEmail: "jenna@tinys5.com",
    reviews: {
      totalReviews: 45,
      averageRating: 4.7,
      recentReviews30d: 4,
      ownerRespondedCount: 38,
      responseRate: 0.84,
      unrespondedNegative: 1,
      painKeywordsInReviews: [],
    },
    hasOnlineBooking: true,
    socialLinks: {
      instagram: "@tinysno5",
      instagramFollowers: 3200,
      facebook: "facebook.com/tinysno5",
      facebookActive: true,
    },
    hoursOfOperation: "Wed-Sun 5pm-11pm",
    photoCount: 85,
    yearsEstablished: 2,
    hasWebsiteChatWidget: false,
    hasAutomatedReviewResponses: false,
    contactFormUrl: "https://tinys5.com/contact",
    discoveredAt: new Date().toISOString(),
    discoveredFrom: "google_maps",
  },
  {
    id: "rest-008",
    name: "Brisket Boss BBQ",
    vertical: "restaurant",
    address: "6701 Burnet Rd",
    city: "Austin",
    state: "TX",
    zip: "78757",
    phone: "(512) 555-0108",
    websiteUrl: "https://brisketboss.com",
    ownerName: "Marcus Williams",
    ownerEmail: null,
    reviews: {
      totalReviews: 189,
      averageRating: 4.4,
      recentReviews30d: 15,
      ownerRespondedCount: 22,
      responseRate: 0.12,
      unrespondedNegative: 6,
      painKeywordsInReviews: [
        "tried to order catering, no one answered the phone",
      ],
    },
    hasOnlineBooking: false,
    socialLinks: {
      instagram: "@brisketboss_atx",
      instagramFollowers: 5600,
      facebook: "facebook.com/brisketboss",
      facebookActive: true,
    },
    hoursOfOperation: "Thu-Sun 11am-sold out",
    photoCount: 150,
    yearsEstablished: 4,
    hasWebsiteChatWidget: false,
    hasAutomatedReviewResponses: false,
    contactFormUrl: null,
    discoveredAt: new Date().toISOString(),
    discoveredFrom: "google_maps",
  },
  {
    id: "rest-009",
    name: "Lucky Lotus Thai",
    vertical: "restaurant",
    address: "3105 E 12th St",
    city: "Austin",
    state: "TX",
    zip: "78702",
    phone: "(512) 555-0109",
    websiteUrl: null,
    ownerName: "Priya Suthep",
    ownerEmail: null,
    reviews: {
      totalReviews: 28,
      averageRating: 4.0,
      recentReviews30d: 3,
      ownerRespondedCount: 0,
      responseRate: 0,
      unrespondedNegative: 4,
      painKeywordsInReviews: ["left a voicemail, never heard back"],
    },
    hasOnlineBooking: false,
    socialLinks: {},
    hoursOfOperation: "Mon-Sat 11am-8pm",
    photoCount: 12,
    yearsEstablished: 1,
    hasWebsiteChatWidget: false,
    hasAutomatedReviewResponses: false,
    contactFormUrl: null,
    discoveredAt: new Date().toISOString(),
    discoveredFrom: "google_maps",
  },
  {
    id: "rest-010",
    name: "Chez Mimi",
    vertical: "restaurant",
    address: "1100 S Lamar Blvd",
    city: "Austin",
    state: "TX",
    zip: "78704",
    phone: "(512) 555-0110",
    websiteUrl: "https://chezmimi.com",
    ownerName: "Mimi Dupont",
    ownerEmail: "mimi@chezmimi.com",
    reviews: {
      totalReviews: 156,
      averageRating: 4.3,
      recentReviews30d: 14,
      ownerRespondedCount: 18,
      responseRate: 0.12,
      unrespondedNegative: 5,
      painKeywordsInReviews: [
        "asked about private dining, no response on Instagram",
        "no one answered the phone at 6pm on a Tuesday",
      ],
    },
    hasOnlineBooking: false,
    socialLinks: {
      instagram: "@chezmimi_atx",
      instagramFollowers: 3400,
      facebook: "facebook.com/chezmimiatx",
      facebookActive: true,
    },
    hoursOfOperation: "Tue-Sat 5pm-10pm",
    photoCount: 95,
    yearsEstablished: 7,
    hasWebsiteChatWidget: false,
    hasAutomatedReviewResponses: false,
    contactFormUrl: "https://chezmimi.com/contact",
    discoveredAt: new Date().toISOString(),
    discoveredFrom: "google_maps",
  },
];

const MOCK_DENTAL: DiscoveredBusiness[] = [
  {
    id: "med-001",
    name: "Bright Smile Dental",
    vertical: "medical",
    address: "4500 Medical Pkwy",
    city: "Austin",
    state: "TX",
    zip: "78756",
    phone: "(512) 555-0201",
    websiteUrl: "https://brightsmileaustin.com",
    ownerName: "Dr. Amanda Reyes",
    ownerEmail: "office@brightsmileaustin.com",
    reviews: {
      totalReviews: 178,
      averageRating: 4.3,
      recentReviews30d: 9,
      ownerRespondedCount: 12,
      responseRate: 0.07,
      unrespondedNegative: 8,
      painKeywordsInReviews: [
        "had to call multiple times to reschedule",
        "never got a confirmation call before my appointment",
      ],
    },
    hasOnlineBooking: false,
    socialLinks: {
      instagram: "@brightsmileaustin",
      instagramFollowers: 1200,
      facebook: "facebook.com/brightsmileaustin",
      facebookActive: true,
    },
    hoursOfOperation: "Mon-Fri 8am-5pm",
    photoCount: 40,
    yearsEstablished: 11,
    hasWebsiteChatWidget: false,
    hasAutomatedReviewResponses: false,
    contactFormUrl: "https://brightsmileaustin.com/contact",
    discoveredAt: new Date().toISOString(),
    discoveredFrom: "google_maps",
  },
  {
    id: "med-002",
    name: "Hill Country Family Dentistry",
    vertical: "medical",
    address: "12300 Bee Cave Rd",
    city: "Austin",
    state: "TX",
    zip: "78738",
    phone: "(512) 555-0202",
    websiteUrl: "https://hillcountryfamilydentistry.com",
    ownerName: "Dr. Robert Kim",
    ownerEmail: "drkim@hcfd.com",
    reviews: {
      totalReviews: 245,
      averageRating: 4.6,
      recentReviews30d: 12,
      ownerRespondedCount: 230,
      responseRate: 0.94,
      unrespondedNegative: 0,
      painKeywordsInReviews: [],
    },
    hasOnlineBooking: true,
    socialLinks: {
      instagram: "@hcfamilydentistry",
      instagramFollowers: 2800,
      facebook: "facebook.com/hillcountryfamilydentistry",
      facebookActive: true,
    },
    hoursOfOperation: "Mon-Thu 7am-6pm, Fri 8am-3pm",
    photoCount: 65,
    yearsEstablished: 18,
    hasWebsiteChatWidget: true,
    hasAutomatedReviewResponses: false,
    contactFormUrl: "https://hillcountryfamilydentistry.com/new-patient",
    discoveredAt: new Date().toISOString(),
    discoveredFrom: "google_maps",
  },
  {
    id: "med-003",
    name: "South Austin Smiles",
    vertical: "medical",
    address: "2901 S Capital of TX Hwy",
    city: "Austin",
    state: "TX",
    zip: "78746",
    phone: "(512) 555-0203",
    websiteUrl: "https://southaustinsmiles.com",
    ownerName: "Dr. Lisa Park",
    ownerEmail: null,
    reviews: {
      totalReviews: 92,
      averageRating: 3.9,
      recentReviews30d: 5,
      ownerRespondedCount: 8,
      responseRate: 0.09,
      unrespondedNegative: 11,
      painKeywordsInReviews: [
        "called to reschedule and no one picked up",
        "no-show fee charged even though I tried to cancel and couldn't reach them",
        "never got a call back about my appointment",
      ],
    },
    hasOnlineBooking: false,
    socialLinks: {
      facebook: "facebook.com/southaustinsmiles",
      facebookActive: false,
    },
    hoursOfOperation: "Mon-Fri 9am-5pm",
    photoCount: 25,
    yearsEstablished: 9,
    hasWebsiteChatWidget: false,
    hasAutomatedReviewResponses: false,
    contactFormUrl: "https://southaustinsmiles.com/contact",
    discoveredAt: new Date().toISOString(),
    discoveredFrom: "google_maps",
  },
  {
    id: "med-004",
    name: "Radiance Med Spa & Dental",
    vertical: "medical",
    address: "3500 Jefferson St",
    city: "Austin",
    state: "TX",
    zip: "78731",
    phone: "(512) 555-0204",
    websiteUrl: "https://radiancemedspa.com",
    ownerName: "Dr. Natasha Petrova",
    ownerEmail: "natasha@radiancemedspa.com",
    reviews: {
      totalReviews: 134,
      averageRating: 4.4,
      recentReviews30d: 10,
      ownerRespondedCount: 20,
      responseRate: 0.15,
      unrespondedNegative: 4,
      painKeywordsInReviews: [
        "hard to book an appointment, kept getting voicemail",
      ],
    },
    hasOnlineBooking: false,
    socialLinks: {
      instagram: "@radiancemedspa_atx",
      instagramFollowers: 5800,
      facebook: "facebook.com/radiancemedspaustin",
      facebookActive: true,
    },
    hoursOfOperation: "Mon-Sat 9am-6pm",
    photoCount: 110,
    yearsEstablished: 6,
    hasWebsiteChatWidget: false,
    hasAutomatedReviewResponses: false,
    contactFormUrl: "https://radiancemedspa.com/book",
    discoveredAt: new Date().toISOString(),
    discoveredFrom: "google_maps",
  },
  {
    id: "med-005",
    name: "Downtown Dental Group",
    vertical: "medical",
    address: "800 W 6th St",
    city: "Austin",
    state: "TX",
    zip: "78703",
    phone: "(512) 555-0205",
    websiteUrl: "https://downtowndentalgroup.com",
    ownerName: "Dr. James Walker",
    ownerEmail: "info@downtowndentalgroup.com",
    reviews: {
      totalReviews: 310,
      averageRating: 4.1,
      recentReviews30d: 18,
      ownerRespondedCount: 50,
      responseRate: 0.16,
      unrespondedNegative: 14,
      painKeywordsInReviews: [
        "missed my appointment because I never got a reminder",
        "had to call three times to get an appointment",
        "no online booking, have to call during business hours only",
      ],
    },
    hasOnlineBooking: false,
    socialLinks: {
      instagram: "@downtowndentalatx",
      instagramFollowers: 900,
      facebook: "facebook.com/downtowndentalgroup",
      facebookActive: true,
    },
    hoursOfOperation: "Mon-Fri 8am-5pm",
    photoCount: 55,
    yearsEstablished: 14,
    hasWebsiteChatWidget: false,
    hasAutomatedReviewResponses: false,
    contactFormUrl: "https://downtowndentalgroup.com/contact",
    discoveredAt: new Date().toISOString(),
    discoveredFrom: "google_maps",
  },
];

// ─────────────────────────────────────────────
// Mock Scraper (implements IGoogleMapsScraper)
// ─────────────────────────────────────────────

export class MockGoogleMapsScraper implements IGoogleMapsScraper {
  private mockData: Map<Vertical, DiscoveredBusiness[]> = new Map([
    ["restaurant", MOCK_RESTAURANTS],
    ["medical", MOCK_DENTAL],
  ]);

  async search(options: GoogleMapsScraperOptions): Promise<GoogleMapsResult[]> {
    const vertical = this.inferVertical(options.query);
    if (!vertical) return [];
    const businesses = this.mockData.get(vertical) ?? [];
    const limit = options.maxResults ?? businesses.length;

    return businesses.slice(0, limit).map((b) => ({
      name: b.name,
      address: b.address,
      city: b.city,
      state: b.state,
      zip: b.zip,
      phone: b.phone,
      websiteUrl: b.websiteUrl,
      googleRating: b.reviews.averageRating,
      reviewCount: b.reviews.totalReviews,
      photoCount: b.photoCount,
      placeId: b.id,
      businessType: b.vertical,
      hoursOfOperation: b.hoursOfOperation,
    }));
  }

  async getBusinessDetails(placeId: string): Promise<DiscoveredBusiness | null> {
    const entries = Array.from(this.mockData.values());
    for (const businesses of entries) {
      const found = businesses.find((b) => b.id === placeId);
      if (found) return found;
    }
    return null;
  }

  private inferVertical(query: string): Vertical | null {
    const q = query.toLowerCase();
    if (q.includes("restaurant") || q.includes("food") || q.includes("pizza") || q.includes("cafe")) return "restaurant";
    if (q.includes("dental") || q.includes("dentist") || q.includes("medical") || q.includes("doctor") || q.includes("med spa") || q.includes("chiropract")) return "medical";
    if (q.includes("realtor") || q.includes("real estate")) return "realtor";
    if (q.includes("fitness") || q.includes("gym") || q.includes("crossfit") || q.includes("yoga") || q.includes("pilates")) return "fitness";
    if (q.includes("plumb") || q.includes("hvac") || q.includes("landscap") || q.includes("roofing") || q.includes("auto repair")) return "home-services";
    if (q.includes("shopify") || q.includes("ecommerce") || q.includes("store")) return "ecommerce";
    return null;
  }
}

// ─────────────────────────────────────────────
// Discovery Engine
// ─────────────────────────────────────────────

const VERTICAL_QUERIES: Record<Vertical, string[]> = {
  restaurant: ["restaurants", "cafes", "food establishments"],
  realtor: ["real estate agents", "realtors"],
  fitness: ["fitness studios", "crossfit gyms", "yoga studios", "pilates"],
  medical: ["dental offices", "dentists", "med spas", "chiropractors"],
  "home-services": ["plumbing", "hvac", "landscaping", "auto repair"],
  ecommerce: ["shopify stores", "ecommerce brands"],
};

export class DiscoveryEngine {
  constructor(private scraper: IGoogleMapsScraper) {}

  async discover(
    vertical: Vertical,
    geography: Geography
  ): Promise<DiscoveredBusiness[]> {
    const queries = VERTICAL_QUERIES[vertical];
    const location = geography.zipRadius
      ? `${geography.city}, ${geography.state} ${geography.zipRadius}mi`
      : `${geography.city}, ${geography.state}`;

    const allResults: GoogleMapsResult[] = [];

    for (const query of queries) {
      const results = await this.scraper.search({
        query,
        location,
        radius: geography.zipRadius,
        maxResults: 30,
      });
      allResults.push(...results);
    }

    // Deduplicate by placeId
    const seen = new Set<string>();
    const unique = allResults.filter((r) => {
      if (seen.has(r.placeId)) return false;
      seen.add(r.placeId);
      return true;
    });

    // Fetch full details for each
    const businesses: DiscoveredBusiness[] = [];
    for (const result of unique) {
      const details = await this.scraper.getBusinessDetails(result.placeId);
      if (details) {
        businesses.push({
          ...details,
          vertical,
          discoveredAt: new Date().toISOString(),
        });
      }
    }

    return businesses;
  }

  formatDiscoveryLog(
    businesses: DiscoveredBusiness[],
    date: string,
    vertical: Vertical,
    geography: Geography
  ): string {
    const lines: string[] = [
      `# Discovery Log — ${date}`,
      "",
      `**Vertical:** ${vertical}`,
      `**Geography:** ${geography.city}, ${geography.state}`,
      `**Businesses Found:** ${businesses.length}`,
      "",
      "---",
      "",
    ];

    for (const b of businesses) {
      lines.push(`## ${b.name}`);
      lines.push(`- **Address:** ${b.address}, ${b.city}, ${b.state} ${b.zip}`);
      lines.push(`- **Phone:** ${b.phone}`);
      lines.push(`- **Website:** ${b.websiteUrl ?? "none"}`);
      lines.push(`- **Owner:** ${b.ownerName ?? "unknown"}`);
      lines.push(`- **Google Rating:** ${b.reviews.averageRating} (${b.reviews.totalReviews} reviews)`);
      lines.push(`- **Review Response Rate:** ${(b.reviews.responseRate * 100).toFixed(0)}%`);
      lines.push(`- **Unresponded Negative Reviews:** ${b.reviews.unrespondedNegative}`);
      lines.push(`- **Online Booking:** ${b.hasOnlineBooking ? "yes" : "no"}`);
      lines.push(`- **Social:** ${formatSocial(b.socialLinks)}`);
      lines.push(`- **Chat Widget:** ${b.hasWebsiteChatWidget ? "yes" : "no"}`);
      lines.push("");
    }

    return lines.join("\n");
  }
}

function formatSocial(links: SocialLinks): string {
  const parts: string[] = [];
  if (links.instagram) parts.push(`IG: ${links.instagram} (${links.instagramFollowers ?? "?"} followers)`);
  if (links.facebook) parts.push(`FB: ${links.facebook}${links.facebookActive ? " (active)" : " (inactive)"}`);
  if (links.yelp) parts.push(`Yelp: ${links.yelp}`);
  return parts.length > 0 ? parts.join(", ") : "none found";
}

// ─────────────────────────────────────────────
// Qualification Scorer
// ─────────────────────────────────────────────

export class QualificationScorer {
  score(business: DiscoveredBusiness): ScoredProspect {
    const painSignal = this.scorePainSignal(business);
    const revenueFit = this.scoreRevenueFit(business);
    const reachability = this.scoreReachability(business);
    const competition = this.scoreCompetition(business);

    const total = painSignal.points + revenueFit.points + reachability.points + competition.points;

    let recommendation: ScoredProspect["recommendation"];
    if (total >= 60) recommendation = "outreach_queue";
    else if (total >= 40) recommendation = "nurture";
    else recommendation = "archive";

    return {
      business,
      score: {
        painSignal: painSignal.points,
        revenueFit: revenueFit.points,
        reachability: reachability.points,
        competition: competition.points,
        total,
        painReasoning: painSignal.reasoning,
        revenueReasoning: revenueFit.reasoning,
        reachabilityReasoning: reachability.reasoning,
        competitionReasoning: competition.reasoning,
      },
      recommendation,
      scoredAt: new Date().toISOString(),
    };
  }

  // ── Pain Signal (0-40) ──

  private scorePainSignal(b: DiscoveredBusiness): { points: number; reasoning: string } {
    let points = 0;
    const reasons: string[] = [];

    switch (b.vertical) {
      case "restaurant":
        points += this.scoreRestaurantPain(b, reasons);
        break;
      case "realtor":
        points += this.scoreRealtorPain(b, reasons);
        break;
      case "fitness":
        points += this.scoreFitnessPain(b, reasons);
        break;
      case "medical":
        points += this.scoreMedicalPain(b, reasons);
        break;
      case "home-services":
        points += this.scoreHomeServicesPain(b, reasons);
        break;
      case "ecommerce":
        points += this.scoreEcommercePain(b, reasons);
        break;
    }

    return { points: clamp(points, 0, 40), reasoning: reasons.join(". ") + "." };
  }

  private scoreRestaurantPain(b: DiscoveredBusiness, reasons: string[]): number {
    let pts = 0;

    // Review response rate
    if (b.reviews.responseRate < 0.1) {
      pts += 15;
      reasons.push(`Very low review response rate (${(b.reviews.responseRate * 100).toFixed(0)}%)`);
    } else if (b.reviews.responseRate < 0.3) {
      pts += 10;
      reasons.push(`Low review response rate (${(b.reviews.responseRate * 100).toFixed(0)}%)`);
    } else if (b.reviews.responseRate < 0.5) {
      pts += 5;
      reasons.push(`Below-average review response rate (${(b.reviews.responseRate * 100).toFixed(0)}%)`);
    }

    // Unresponded negative reviews
    if (b.reviews.unrespondedNegative >= 5) {
      pts += 12;
      reasons.push(`${b.reviews.unrespondedNegative} unresponded negative reviews — visible to every potential customer`);
    } else if (b.reviews.unrespondedNegative >= 2) {
      pts += 7;
      reasons.push(`${b.reviews.unrespondedNegative} unresponded negative reviews`);
    }

    // Pain keywords in reviews
    if (b.reviews.painKeywordsInReviews.length > 0) {
      pts += Math.min(b.reviews.painKeywordsInReviews.length * 4, 10);
      reasons.push(`Reviews mention: "${b.reviews.painKeywordsInReviews[0]}"`);
    }

    // No online booking
    if (!b.hasOnlineBooking && b.reviews.totalReviews >= 50) {
      pts += 3;
      reasons.push("No online reservation system despite high volume");
    }

    return pts;
  }

  private scoreRealtorPain(b: DiscoveredBusiness, reasons: string[]): number {
    let pts = 0;

    if (b.reviews.painKeywordsInReviews.length > 0) {
      pts += 15;
      reasons.push(`Reviews mention response issues: "${b.reviews.painKeywordsInReviews[0]}"`);
    }

    if (!b.socialLinks.instagram && !b.socialLinks.facebook) {
      pts += 8;
      reasons.push("No social media presence for lead generation");
    } else if (b.socialLinks.facebookActive === false) {
      pts += 5;
      reasons.push("Social media presence is inactive");
    }

    if (b.reviews.responseRate < 0.3) {
      pts += 10;
      reasons.push(`Low review response rate (${(b.reviews.responseRate * 100).toFixed(0)}%)`);
    }

    if (!b.hasWebsiteChatWidget) {
      pts += 5;
      reasons.push("No instant response system on website");
    }

    return pts;
  }

  private scoreFitnessPain(b: DiscoveredBusiness, reasons: string[]): number {
    let pts = 0;

    if (b.reviews.painKeywordsInReviews.length > 0) {
      pts += 15;
      reasons.push(`Reviews mention: "${b.reviews.painKeywordsInReviews[0]}"`);
    }

    if (!b.hasOnlineBooking) {
      pts += 8;
      reasons.push("No online class booking system");
    }

    if (b.reviews.responseRate < 0.3) {
      pts += 10;
      reasons.push(`Low review response rate (${(b.reviews.responseRate * 100).toFixed(0)}%)`);
    }

    if (b.socialLinks.facebookActive === false || (!b.socialLinks.instagram && !b.socialLinks.facebook)) {
      pts += 7;
      reasons.push("Inactive or absent social media");
    }

    return pts;
  }

  private scoreMedicalPain(b: DiscoveredBusiness, reasons: string[]): number {
    let pts = 0;

    // No online booking is a major pain signal for medical
    if (!b.hasOnlineBooking) {
      pts += 12;
      reasons.push("No online appointment booking — patients must call during business hours");
    }

    // Unresponded reviews
    if (b.reviews.unrespondedNegative >= 8) {
      pts += 12;
      reasons.push(`${b.reviews.unrespondedNegative} unresponded negative reviews`);
    } else if (b.reviews.unrespondedNegative >= 3) {
      pts += 7;
      reasons.push(`${b.reviews.unrespondedNegative} unresponded negative reviews`);
    }

    // Pain keywords
    if (b.reviews.painKeywordsInReviews.length >= 2) {
      pts += 12;
      reasons.push(`Multiple reviews mention reachability issues: "${b.reviews.painKeywordsInReviews[0]}"`);
    } else if (b.reviews.painKeywordsInReviews.length === 1) {
      pts += 6;
      reasons.push(`Review mentions: "${b.reviews.painKeywordsInReviews[0]}"`);
    }

    // Low response rate
    if (b.reviews.responseRate < 0.1) {
      pts += 6;
      reasons.push(`Very low review response rate (${(b.reviews.responseRate * 100).toFixed(0)}%)`);
    }

    return pts;
  }

  private scoreHomeServicesPain(b: DiscoveredBusiness, reasons: string[]): number {
    let pts = 0;

    // Unresponded reviews with good rating = care about rep but can't keep up
    if (b.reviews.averageRating >= 4.0 && b.reviews.responseRate < 0.3) {
      pts += 12;
      reasons.push(`${b.reviews.averageRating}-star rating but only ${(b.reviews.responseRate * 100).toFixed(0)}% review response rate — cares about reputation but can't keep up`);
    }

    if (b.reviews.painKeywordsInReviews.length > 0) {
      pts += 10;
      reasons.push(`Reviews mention: "${b.reviews.painKeywordsInReviews[0]}"`);
    }

    if (!b.websiteUrl) {
      pts += 8;
      reasons.push("No website — missing online presence entirely");
    } else if (!b.contactFormUrl) {
      pts += 4;
      reasons.push("Website but no contact form for estimate requests");
    }

    if (b.reviews.unrespondedNegative >= 3) {
      pts += 8;
      reasons.push(`${b.reviews.unrespondedNegative} negative reviews sitting unanswered`);
    }

    return pts;
  }

  private scoreEcommercePain(b: DiscoveredBusiness, reasons: string[]): number {
    let pts = 0;

    if (b.reviews.painKeywordsInReviews.length > 0) {
      pts += 15;
      reasons.push(`Support complaints in reviews: "${b.reviews.painKeywordsInReviews[0]}"`);
    }

    if (!b.hasWebsiteChatWidget) {
      pts += 8;
      reasons.push("No live chat on website");
    }

    if (b.reviews.responseRate < 0.3) {
      pts += 10;
      reasons.push(`Low review response rate (${(b.reviews.responseRate * 100).toFixed(0)}%)`);
    }

    // Social media DMs going unanswered as a proxy
    if (b.socialLinks.facebookActive === false) {
      pts += 5;
      reasons.push("Inactive social media — DMs likely going unanswered");
    }

    return pts;
  }

  // ── Revenue Fit (0-25) ──

  private scoreRevenueFit(b: DiscoveredBusiness): { points: number; reasoning: string } {
    let points = 0;
    const reasons: string[] = [];

    // Review volume as primary revenue proxy
    if (b.reviews.totalReviews >= 200) {
      points += 10;
      reasons.push(`High review volume (${b.reviews.totalReviews}) suggests strong customer traffic`);
    } else if (b.reviews.totalReviews >= 50) {
      points += 7;
      reasons.push(`Moderate review volume (${b.reviews.totalReviews}) suggests established business`);
    } else if (b.reviews.totalReviews >= 20) {
      points += 3;
      reasons.push(`Low review volume (${b.reviews.totalReviews}) — may be too small`);
    } else {
      reasons.push(`Very low review volume (${b.reviews.totalReviews}) — likely too early stage`);
    }

    // Years established
    if (b.yearsEstablished !== null) {
      if (b.yearsEstablished >= 5) {
        points += 5;
        reasons.push(`Established ${b.yearsEstablished} years`);
      } else if (b.yearsEstablished >= 2) {
        points += 3;
        reasons.push(`Operating ${b.yearsEstablished} years — past survival phase`);
      } else {
        points += 1;
        reasons.push(`Only ${b.yearsEstablished} year(s) old — may be too early`);
      }
    }

    // Photo count as engagement/investment proxy
    if (b.photoCount >= 100) {
      points += 4;
      reasons.push("High photo count indicates investment in online presence");
    } else if (b.photoCount >= 30) {
      points += 2;
      reasons.push("Moderate photo count");
    }

    // Recent review velocity
    if (b.reviews.recentReviews30d >= 15) {
      points += 4;
      reasons.push(`${b.reviews.recentReviews30d} reviews in last 30 days — busy location`);
    } else if (b.reviews.recentReviews30d >= 5) {
      points += 2;
      reasons.push(`${b.reviews.recentReviews30d} reviews in last 30 days — steady traffic`);
    }

    // Vertical-specific adjustments
    if (b.vertical === "medical" && b.reviews.totalReviews >= 100) {
      points += 2;
      reasons.push("100+ reviews for medical practice suggests multi-provider office");
    }

    return { points: clamp(points, 0, 25), reasoning: reasons.join(". ") + "." };
  }

  // ── Reachability (0-20) ──

  private scoreReachability(b: DiscoveredBusiness): { points: number; reasoning: string } {
    let points = 0;
    const reasons: string[] = [];

    // Owner email found
    if (b.ownerEmail) {
      points += 10;
      reasons.push(`Owner/business email found (${b.ownerEmail})`);
    }

    // Instagram with low follower count (owner likely manages)
    if (b.socialLinks.instagram) {
      if ((b.socialLinks.instagramFollowers ?? 0) < 10000) {
        points += 6;
        reasons.push(`Active Instagram (${b.socialLinks.instagramFollowers} followers) — owner likely manages`);
      } else {
        points += 3;
        reasons.push(`Instagram found but ${b.socialLinks.instagramFollowers}+ followers — may have a manager`);
      }
    }

    // Facebook
    if (b.socialLinks.facebook && b.socialLinks.facebookActive) {
      points += 3;
      reasons.push("Active Facebook business page");
    } else if (b.socialLinks.facebook) {
      points += 1;
      reasons.push("Facebook page exists but appears inactive");
    }

    // Contact form as fallback
    if (b.contactFormUrl && points < 15) {
      points += 2;
      reasons.push("Website contact form available as fallback");
    }

    // No contact channels at all
    if (points === 0) {
      reasons.push("No email, social media, or contact form found — unreachable");
    }

    return { points: clamp(points, 0, 20), reasoning: reasons.join(". ") + "." };
  }

  // ── Competition (0-15) ──

  private scoreCompetition(b: DiscoveredBusiness): { points: number; reasoning: string } {
    let points = 15; // Start high, deduct for competition signals
    const reasons: string[] = [];

    if (b.hasWebsiteChatWidget) {
      points -= 5;
      reasons.push("Has a website chat widget — some automation already in place");
    }

    if (b.hasAutomatedReviewResponses) {
      points -= 7;
      reasons.push("Appears to use automated review responses — direct competitor territory");
    }

    if (b.hasOnlineBooking) {
      points -= 3;
      reasons.push("Has online booking — shows willingness to adopt tools");
    }

    if (reasons.length === 0) {
      reasons.push("No automation or competing services detected — everything appears manual");
    }

    return { points: clamp(points, 0, 15), reasoning: reasons.join(". ") + "." };
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// ─────────────────────────────────────────────
// Prospect Store
// ─────────────────────────────────────────────

export class ProspectStore {
  private prospects: Map<string, StoredProspect> = new Map();

  addProspect(scored: ScoredProspect): StoredProspect {
    const existing = this.prospects.get(scored.business.id);
    if (existing) return existing;

    const initialState: ProspectState =
      scored.recommendation === "outreach_queue" ? "outreach_queued" :
      scored.recommendation === "nurture" ? "qualified" :
      "archived";

    const stored: StoredProspect = {
      id: scored.business.id,
      business: scored.business,
      score: scored.score,
      state: initialState,
      stateHistory: [
        { state: "discovered", at: scored.business.discoveredAt },
        { state: "qualified", at: scored.scoredAt },
        ...(initialState !== "qualified" ? [{ state: initialState, at: scored.scoredAt }] : []),
      ],
      outreachChannel: null,
      outreachMessages: [],
      lastContactedAt: null,
      optedOut: false,
      notes: [],
    };

    this.prospects.set(stored.id, stored);
    return stored;
  }

  updateState(id: string, newState: ProspectState): StoredProspect | null {
    const prospect = this.prospects.get(id);
    if (!prospect) return null;

    prospect.state = newState;
    prospect.stateHistory.push({ state: newState, at: new Date().toISOString() });

    return prospect;
  }

  getById(id: string): StoredProspect | null {
    return this.prospects.get(id) ?? null;
  }

  getByState(state: ProspectState): StoredProspect[] {
    return Array.from(this.prospects.values()).filter((p) => p.state === state);
  }

  getByVertical(vertical: Vertical): StoredProspect[] {
    return Array.from(this.prospects.values()).filter((p) => p.business.vertical === vertical);
  }

  getAll(): StoredProspect[] {
    return Array.from(this.prospects.values());
  }

  getStats(): {
    total: number;
    byState: Record<string, number>;
    byVertical: Record<string, number>;
    avgScore: number;
    outreachReady: number;
  } {
    const all = this.getAll();
    const byState: Record<string, number> = {};
    const byVertical: Record<string, number> = {};
    let totalScore = 0;
    let scoredCount = 0;

    for (const p of all) {
      byState[p.state] = (byState[p.state] ?? 0) + 1;
      byVertical[p.business.vertical] = (byVertical[p.business.vertical] ?? 0) + 1;
      if (p.score) {
        totalScore += p.score.total;
        scoredCount++;
      }
    }

    return {
      total: all.length,
      byState,
      byVertical,
      avgScore: scoredCount > 0 ? Math.round(totalScore / scoredCount) : 0,
      outreachReady: this.getByState("outreach_queued").length,
    };
  }

  formatProspectDossier(p: StoredProspect): string {
    const b = p.business;
    const s = p.score;
    const lines: string[] = [
      `# ${b.name}`,
      "",
      `**State:** ${p.state}`,
      `**Vertical:** ${b.vertical}`,
      `**Score:** ${s ? `${s.total}/100` : "unscored"}`,
      "",
      "## Business Info",
      `- **Address:** ${b.address}, ${b.city}, ${b.state} ${b.zip}`,
      `- **Phone:** ${b.phone}`,
      `- **Website:** ${b.websiteUrl ?? "none"}`,
      `- **Owner:** ${b.ownerName ?? "unknown"}`,
      `- **Email:** ${b.ownerEmail ?? "not found"}`,
      `- **Hours:** ${b.hoursOfOperation}`,
      `- **Years Established:** ${b.yearsEstablished ?? "unknown"}`,
      "",
      "## Reviews",
      `- **Total:** ${b.reviews.totalReviews} (${b.reviews.averageRating} avg)`,
      `- **Last 30 Days:** ${b.reviews.recentReviews30d}`,
      `- **Response Rate:** ${(b.reviews.responseRate * 100).toFixed(0)}%`,
      `- **Unresponded Negative:** ${b.reviews.unrespondedNegative}`,
    ];

    if (b.reviews.painKeywordsInReviews.length > 0) {
      lines.push(`- **Pain Keywords:** ${b.reviews.painKeywordsInReviews.map((k) => `"${k}"`).join(", ")}`);
    }

    lines.push("");
    lines.push("## Online Presence");
    lines.push(`- **Online Booking:** ${b.hasOnlineBooking ? "yes" : "no"}`);
    lines.push(`- **Chat Widget:** ${b.hasWebsiteChatWidget ? "yes" : "no"}`);
    lines.push(`- **Social:** ${formatSocial(b.socialLinks)}`);

    if (s) {
      lines.push("");
      lines.push("## Score Breakdown");
      lines.push(`- **Pain Signal:** ${s.painSignal}/40 — ${s.painReasoning}`);
      lines.push(`- **Revenue Fit:** ${s.revenueFit}/25 — ${s.revenueReasoning}`);
      lines.push(`- **Reachability:** ${s.reachability}/20 — ${s.reachabilityReasoning}`);
      lines.push(`- **Competition:** ${s.competition}/15 — ${s.competitionReasoning}`);
      lines.push(`- **TOTAL: ${s.total}/100**`);
    }

    if (p.stateHistory.length > 0) {
      lines.push("");
      lines.push("## State History");
      for (const entry of p.stateHistory) {
        lines.push(`- ${entry.state} — ${entry.at}`);
      }
    }

    if (p.notes.length > 0) {
      lines.push("");
      lines.push("## Notes");
      for (const note of p.notes) {
        lines.push(`- ${note}`);
      }
    }

    return lines.join("\n") + "\n";
  }
}

// ─────────────────────────────────────────────
// Daily Discovery Report
// ─────────────────────────────────────────────

export class DailyDiscoveryReport {
  generate(
    date: string,
    vertical: Vertical,
    geography: Geography,
    scored: ScoredProspect[],
    store: ProspectStore
  ): DailyReport {
    const qualified = scored.filter((s) => s.recommendation === "outreach_queue");
    const nurture = scored.filter((s) => s.recommendation === "nurture");
    const archived = scored.filter((s) => s.recommendation === "archive");

    const topProspects = [...scored]
      .sort((a, b) => b.score.total - a.score.total)
      .slice(0, 5)
      .map((s) => ({
        name: s.business.name,
        score: s.score.total,
        vertical: s.business.vertical,
      }));

    const stats = store.getStats();

    return {
      date,
      geography,
      vertical,
      totalDiscovered: scored.length,
      totalQualified: qualified.length,
      totalNurture: nurture.length,
      totalArchived: archived.length,
      topProspects,
      pipelineTotal: stats.total,
    };
  }

  formatReport(report: DailyReport): string {
    const lines: string[] = [
      `# Daily Discovery Report — ${report.date}`,
      "",
      `**Vertical:** ${report.vertical}`,
      `**Geography:** ${report.geography.city}, ${report.geography.state}`,
      "",
      "## Summary",
      "",
      `| Metric | Count |`,
      `|--------|-------|`,
      `| Discovered | ${report.totalDiscovered} |`,
      `| Qualified (60+) | ${report.totalQualified} |`,
      `| Nurture (40-59) | ${report.totalNurture} |`,
      `| Archived (<40) | ${report.totalArchived} |`,
      `| Pipeline Total | ${report.pipelineTotal} |`,
      "",
    ];

    if (report.topProspects.length > 0) {
      lines.push("## Top Prospects");
      lines.push("");
      lines.push("| Business | Score | Vertical |");
      lines.push("|----------|-------|----------|");
      for (const p of report.topProspects) {
        lines.push(`| ${p.name} | ${p.score}/100 | ${p.vertical} |`);
      }
      lines.push("");
    }

    return lines.join("\n") + "\n";
  }
}

// ─────────────────────────────────────────────
// Pipeline Runner (orchestrates a full daily run)
// ─────────────────────────────────────────────

export async function runDailyPipeline(
  vertical: Vertical,
  geography: Geography,
  scraper?: IGoogleMapsScraper
): Promise<{
  businesses: DiscoveredBusiness[];
  scored: ScoredProspect[];
  report: DailyReport;
  store: ProspectStore;
  discoveryLog: string;
  reportMarkdown: string;
  prospectDossiers: string[];
}> {
  const engine = new DiscoveryEngine(scraper ?? new MockGoogleMapsScraper());
  const scorer = new QualificationScorer();
  const store = new ProspectStore();
  const reporter = new DailyDiscoveryReport();

  const today = new Date().toISOString().split("T")[0];

  // Step 1: Discovery
  const businesses = await engine.discover(vertical, geography);

  // Step 2: Qualification
  const scored = businesses.map((b) => scorer.score(b));

  // Step 3: Store
  for (const s of scored) {
    store.addProspect(s);
  }

  // Step 4: Report
  const report = reporter.generate(today, vertical, geography, scored, store);

  // Format outputs
  const discoveryLog = engine.formatDiscoveryLog(businesses, today, vertical, geography);
  const reportMarkdown = reporter.formatReport(report);
  const prospectDossiers = store.getAll().map((p) => store.formatProspectDossier(p));

  return {
    businesses,
    scored,
    report,
    store,
    discoveryLog,
    reportMarkdown,
    prospectDossiers,
  };
}
