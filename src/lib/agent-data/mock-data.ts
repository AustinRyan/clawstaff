// ---------------------------------------------------------------------------
// ClawStaff — Mock data fallback
// ---------------------------------------------------------------------------
// Used when AGENT_DATA_PATH is not set or the agent directory is empty.
// Mirrors the shape of real data so dashboard pages work identically.
// ---------------------------------------------------------------------------

import {
  AgentStats,
  ActivityItem,
  Conversation,
  ConversationMessage,
  DailyStats,
  MessagesResponse,
  TaskBucket,
} from "./types";

// ---- Daily stats (30 days) ------------------------------------------------

function generateDailyStats(): DailyStats[] {
  const base = [
    14, 18, 16, 21, 24, 12, 10, 19, 22, 20, 26, 28, 15, 13, 24, 27, 25, 31,
    33, 18, 16, 29, 32, 35, 38, 36, 22, 20, 34, 23,
  ];
  const rtBase = [
    3.8, 3.5, 3.6, 3.2, 3.0, 2.8, 3.1, 2.7, 2.5, 2.6, 2.3, 2.4, 2.2, 2.0,
    2.1, 1.9, 1.8, 2.0, 1.7, 1.6, 1.8, 1.5, 1.4, 1.3, 1.4, 1.2, 1.3, 1.1,
    1.2, 1.0,
  ];

  const now = new Date();
  return base.map((msgs, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - (29 - i));
    const dateKey = d.toISOString().slice(0, 10);
    return {
      date: dateKey,
      messages: msgs,
      avgResponseTimeSec: Math.round(rtBase[i] * 60),
      tasks: {
        inquiriesHandled: Math.round(msgs * 0.4),
        reservationsManaged: Math.round(msgs * 0.27),
        summariesSent: Math.round(msgs * 0.13),
        questionsAnswered: Math.round(msgs * 0.2),
      },
    };
  });
}

// ---- Task breakdown -------------------------------------------------------

function generateTaskBreakdown(): TaskBucket[] {
  return [
    {
      key: "inquiriesHandled",
      label: "Inquiries Handled",
      color: "#ff6b35",
      value: 186,
    },
    {
      key: "reservationsManaged",
      label: "Reservations Managed",
      color: "#f7c948",
      value: 124,
    },
    {
      key: "summariesSent",
      label: "Summaries Sent",
      color: "#22c55e",
      value: 62,
    },
    {
      key: "questionsAnswered",
      label: "Questions Answered",
      color: "#3b82f6",
      value: 89,
    },
  ];
}

// ---- Recent activity ------------------------------------------------------

function generateRecentActivity(): ActivityItem[] {
  const now = new Date();
  const items: {
    minutesAgo: number;
    text: string;
    type: ActivityItem["type"];
  }[] = [
    {
      minutesAgo: 2,
      text: "Responded to 3-star Google review from Mike T.",
      type: "task",
    },
    {
      minutesAgo: 18,
      text: "Sent follow-up message to lead: Jennifer R.",
      type: "message",
    },
    {
      minutesAgo: 34,
      text: "Scheduled showing for 4pm tomorrow on Sarah's calendar",
      type: "task",
    },
    {
      minutesAgo: 60,
      text: "Responded to 5-star Google review from Angela W.",
      type: "task",
    },
    {
      minutesAgo: 90,
      text: "Sent nightly summary to owner via WhatsApp",
      type: "task",
    },
    {
      minutesAgo: 120,
      text: "Flagged 1-star review from anonymous user for owner review",
      type: "escalation",
    },
    {
      minutesAgo: 180,
      text: "Qualified new lead from Zillow: David M., budget $450K",
      type: "message",
    },
    {
      minutesAgo: 210,
      text: "Sent appointment reminder to 3 clients for tomorrow",
      type: "task",
    },
    {
      minutesAgo: 240,
      text: "Handled reservation inquiry -- party of 6, Friday 7pm",
      type: "message",
    },
    {
      minutesAgo: 300,
      text: "Sent re-engagement message to 4 inactive members",
      type: "message",
    },
  ];

  return items.map((item) => ({
    time: new Date(now.getTime() - item.minutesAgo * 60_000).toISOString(),
    text: item.text,
    type: item.type,
  }));
}

// ---- Mock conversations ---------------------------------------------------

function ts(daysAgo: number, hour: number, minute: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

function convo(
  id: number,
  channel: string,
  contact: string,
  date: string,
  msgs: ConversationMessage[]
): Conversation {
  return {
    id: String(id),
    channel,
    contact,
    preview:
      msgs[0].content.length > 120
        ? msgs[0].content.slice(0, 120) + "..."
        : msgs[0].content,
    date,
    messages: msgs,
  };
}

function generateConversations(): Conversation[] {
  return [
    convo(1, "Google", "Mike T.", ts(0, 14, 14), [
      {
        role: "user",
        content:
          "Food was decent but we waited 45 minutes for our entrees. Server seemed overwhelmed and never checked back on us. The bruschetta was good though. Might give it another shot on a less busy night.",
        timestamp: ts(0, 14, 14),
      },
      {
        role: "assistant",
        content:
          "Hi Mike, thank you for your honest feedback. We sincerely apologize for the long wait -- that's not the experience we aim for. We had an unusually high volume that evening, but that's no excuse. We'd love the chance to make it right. Please reach out to us directly and your next appetizer is on us. We hope to see you again soon!",
        timestamp: ts(0, 14, 16),
      },
    ]),
    convo(2, "WhatsApp", "Jennifer R.", ts(0, 13, 42), [
      {
        role: "user",
        content:
          "Hi! Do you have availability for a party of 8 this Saturday around 7pm?",
        timestamp: ts(0, 13, 42),
      },
      {
        role: "assistant",
        content:
          "Hi Jennifer! Thanks for reaching out. Let me check on that for you. We do have a large table available this Saturday at 7:15 PM -- would that work for your group?",
        timestamp: ts(0, 13, 43),
      },
      {
        role: "user",
        content: "7:15 works perfectly! Can we get the patio section?",
        timestamp: ts(0, 13, 45),
      },
      {
        role: "assistant",
        content:
          "Great news -- the patio is available! I've reserved the corner table for your party of 8 at 7:15 PM this Saturday. You'll get a confirmation text 24 hours before. Is there anything else I can help with?",
        timestamp: ts(0, 13, 46),
      },
      {
        role: "user",
        content: "That's perfect, thank you so much!",
        timestamp: ts(0, 13, 47),
      },
    ]),
    convo(3, "Google", "Angela W.", ts(0, 12, 31), [
      {
        role: "user",
        content:
          "Absolutely incredible dining experience! The seafood risotto was the best I've ever had. Our server Maria was attentive without being overbearing. The ambiance is perfect for date night. Will definitely be back!",
        timestamp: ts(0, 12, 31),
      },
      {
        role: "assistant",
        content:
          "Angela, thank you so much for this wonderful review! We're thrilled you enjoyed the seafood risotto -- it's one of Chef Antonio's favorites too. We'll pass your kind words along to Maria, she'll be so happy to hear this. We look forward to welcoming you back for another date night soon!",
        timestamp: ts(0, 12, 33),
      },
    ]),
    convo(4, "Yelp", "Carlos M.", ts(0, 11, 15), [
      {
        role: "user",
        content:
          "Great food, especially the lamb chops. Only knock is the parking situation -- we circled the block three times before finding a spot. Would be 5 stars if parking was easier.",
        timestamp: ts(0, 11, 15),
      },
      {
        role: "assistant",
        content:
          "Thanks for the kind words about our lamb chops, Carlos! We totally understand the parking frustration. Quick tip: there's a free lot behind the building on Oak Street, just a 1-minute walk to our entrance. We should do a better job communicating that -- we'll add it to our website. Hope to see you again soon!",
        timestamp: ts(0, 11, 18),
      },
    ]),
    convo(5, "WhatsApp", "Owner (Nightly Summary)", ts(1, 22, 2), [
      {
        role: "assistant",
        content:
          "Good evening! Here's your nightly summary for today:\n\n- 23 messages handled today\n- 4 reviews responded to (3 Google, 1 Yelp)\n- 2 reservation inquiries confirmed\n- 1 flagged review (1-star, sent to your attention)\n- Average response time: 1.4 minutes\n\nNothing urgent requiring your attention. Have a great night!",
        timestamp: ts(1, 22, 2),
      },
    ]),
    convo(6, "Google", "Anonymous", ts(1, 20, 47), [
      {
        role: "user",
        content:
          "Worst experience ever. Found a hair in my pasta and the manager didn't even comp the meal. Just offered a free dessert like that fixes it. Never coming back.",
        timestamp: ts(1, 20, 47),
      },
      {
        role: "assistant",
        content:
          "We are truly sorry about your experience. This falls well below our standards and we take food quality and hygiene extremely seriously. We'd like to make this right -- please contact us directly at the number on our website so we can discuss this personally. Your feedback helps us improve, and we sincerely apologize for the disappointment.",
        timestamp: ts(1, 20, 49),
      },
    ]),
    convo(7, "Email", "Sarah K.", ts(1, 18, 20), [
      {
        role: "user",
        content:
          "Hi there! I'm interested in hosting a birthday dinner for about 25 guests in your private dining room on March 22nd. Do you offer set menus for private events? What's the pricing like?",
        timestamp: ts(1, 18, 20),
      },
      {
        role: "assistant",
        content:
          "Hi Sarah! Thank you for considering us for your birthday celebration. Our private dining room accommodates up to 30 guests and we do offer curated set menus starting at $65/person, which includes a 3-course meal. I'll have our events coordinator reach out to you within 24 hours with full details and availability for March 22nd. Is this email the best way to reach you?",
        timestamp: ts(1, 18, 22),
      },
      {
        role: "user",
        content:
          "That sounds great! Yes, email works. Looking forward to hearing from them.",
        timestamp: ts(1, 18, 30),
      },
    ]),
    convo(8, "Yelp", "David L.", ts(1, 15, 55), [
      {
        role: "user",
        content:
          "Hidden gem! Been coming here for 3 months and it's consistently amazing. The truffle pasta is unreal and the wine list is curated perfectly. Staff always remembers my name. This is what dining should be.",
        timestamp: ts(1, 15, 55),
      },
      {
        role: "assistant",
        content:
          "David, this means the world to us! It's regulars like you who make what we do so rewarding. We'll let the team know -- they'll be thrilled you mentioned the truffle pasta and the wine selection. See you next time, and thank you for being part of our family!",
        timestamp: ts(1, 15, 58),
      },
    ]),
    convo(9, "WhatsApp", "Marcus J.", ts(1, 14, 10), [
      {
        role: "user",
        content:
          "Hey, can we move our Friday reservation from 6pm to 8pm? Same party size.",
        timestamp: ts(1, 14, 10),
      },
      {
        role: "assistant",
        content:
          "Hi Marcus! No problem at all. I've updated your reservation to 8 PM this Friday for a party of 4. You'll receive an updated confirmation shortly. See you then!",
        timestamp: ts(1, 14, 11),
      },
    ]),
    convo(10, "Google", "Rachel P.", ts(1, 11, 40), [
      {
        role: "user",
        content:
          "Really enjoyed the tasting menu. Pacing was a little rushed between courses but the flavors were outstanding. The deconstructed tiramisu was a highlight. Would love to see a longer version of the tasting menu.",
        timestamp: ts(1, 11, 40),
      },
      {
        role: "assistant",
        content:
          "Rachel, thanks so much for trying our tasting menu! Great feedback on the pacing -- we're actually working on an extended 7-course version that allows more time between dishes. We'll keep you posted! So glad the tiramisu was a hit. Chef will love hearing that.",
        timestamp: ts(1, 11, 43),
      },
    ]),
    convo(11, "WhatsApp", "Lisa and Tom D.", ts(2, 19, 15), [
      {
        role: "user",
        content:
          "We're celebrating our 10th anniversary next week. Can you set up something special? Maybe a window table with flowers?",
        timestamp: ts(2, 19, 15),
      },
      {
        role: "assistant",
        content:
          "Congratulations on 10 years, Lisa and Tom! We'd love to help make it memorable. I've reserved our best window table for you and we'll have a small floral arrangement ready. What day and time works best for you?",
        timestamp: ts(2, 19, 17),
      },
      {
        role: "user",
        content: "Thursday at 7:30pm would be ideal!",
        timestamp: ts(2, 19, 20),
      },
      {
        role: "assistant",
        content:
          "Done! Thursday at 7:30 PM, window table with flowers. I'll also let our sommelier know -- he may have a special wine recommendation for the occasion. Happy anniversary!",
        timestamp: ts(2, 19, 21),
      },
    ]),
    convo(12, "Email", "Food Blogger -- Eats Weekly", ts(2, 16, 30), [
      {
        role: "user",
        content:
          "Hi! I'm a local food blogger for Eats Weekly and would love to feature your restaurant in our column. We have about 45K monthly readers. Would the chef be available for a brief interview and a tasting visit next week?",
        timestamp: ts(2, 16, 30),
      },
      {
        role: "assistant",
        content:
          "Thank you for your interest! We'd be honored to be featured in Eats Weekly. I've flagged this for the owner, and someone from our team will reach out within 24 hours to coordinate a visit and interview with Chef Antonio. Is this email the best way to reach you?",
        timestamp: ts(2, 16, 32),
      },
    ]),
    convo(13, "Yelp", "Samantha R.", ts(2, 14, 5), [
      {
        role: "user",
        content:
          "Came for brunch and was disappointed. Eggs Benedict was cold and the hollandaise tasted like it came from a packet. For the price point, I expected much better. Service was fine though.",
        timestamp: ts(2, 14, 5),
      },
      {
        role: "assistant",
        content:
          "Samantha, we appreciate you sharing this feedback. Cold eggs Benedict is not our standard -- our hollandaise is made fresh daily, so something went wrong in the kitchen that morning. We take this seriously and have addressed it with our brunch team. We'd love a chance to redeem ourselves -- please reach out directly and we'll take care of your next brunch visit.",
        timestamp: ts(2, 14, 8),
      },
    ]),
    convo(14, "WhatsApp", "Diego F.", ts(2, 12, 50), [
      {
        role: "user",
        content:
          "Does your mushroom risotto contain any tree nuts? My wife has a severe allergy.",
        timestamp: ts(2, 12, 50),
      },
      {
        role: "assistant",
        content:
          "Hi Diego! Our mushroom risotto does not contain tree nuts in the standard recipe. However, for severe allergies, I always recommend informing your server when you arrive so the kitchen can take extra precautions against cross-contamination. We take allergies very seriously and our chef is happy to accommodate. Would you like me to add an allergy note to a reservation?",
        timestamp: ts(2, 12, 51),
      },
      {
        role: "user",
        content:
          "Yes please! Reservation under Diego F., Saturday at 6:30pm.",
        timestamp: ts(2, 12, 53),
      },
      {
        role: "assistant",
        content:
          "Done -- I've added a tree nut allergy alert to your reservation for Saturday at 6:30 PM. The kitchen will be fully prepped. Enjoy your evening!",
        timestamp: ts(2, 12, 54),
      },
    ]),
    convo(15, "Google", "Brian H.", ts(2, 10, 20), [
      {
        role: "user",
        content:
          "Best Italian in the city, hands down. The osso buco melts in your mouth. Brought my parents here for their visit from out of town and they were blown away. Already planning our next visit.",
        timestamp: ts(2, 10, 20),
      },
      {
        role: "assistant",
        content:
          "Brian, thank you! Making a great impression on visiting family is the highest compliment we can receive. The osso buco is Chef Antonio's signature -- he'll be thrilled to hear this. We hope your parents had an amazing trip, and we can't wait to welcome your whole family back!",
        timestamp: ts(2, 10, 22),
      },
    ]),
    convo(16, "WhatsApp", "Owner (Morning Briefing)", ts(2, 6, 0), [
      {
        role: "assistant",
        content:
          "Good morning! Here's your briefing for today:\n\n- 3 reservations on the books for tonight\n- 2 new Google reviews overnight (both 5-star, responded)\n- 1 pending email from a food blogger (flagged for your review)\n- No urgent items\n\nHave a great day!",
        timestamp: ts(2, 6, 0),
      },
    ]),
    convo(17, "Email", "Corporate -- TechCorp Inc.", ts(3, 15, 15), [
      {
        role: "user",
        content:
          "Hello, I'm the executive assistant at TechCorp Inc. We'd like to book a corporate dinner for 40 people on April 5th. Is a full or partial buyout possible? We'd need AV equipment for a brief presentation. Budget is flexible.",
        timestamp: ts(3, 15, 15),
      },
      {
        role: "assistant",
        content:
          "Thank you for considering us for your corporate event! We can absolutely accommodate a party of 40 -- our full restaurant buyout is available on April 5th. We have a projector and screen setup for presentations. I've flagged this for our events team and they'll reach out within 24 hours with a detailed proposal and pricing. Could you share a contact number for the quickest follow-up?",
        timestamp: ts(3, 15, 18),
      },
    ]),
    convo(18, "Google", "Nina S.", ts(3, 13, 22), [
      {
        role: "user",
        content:
          "Nice atmosphere and cocktails were great, but food was just okay. Nothing really stood out compared to other Italian places in the area. Portion sizes could be bigger for the price.",
        timestamp: ts(3, 13, 22),
      },
      {
        role: "assistant",
        content:
          "Nina, thanks for sharing your thoughts! We're glad you enjoyed the atmosphere and cocktails. We'd love to know which dishes you tried -- some of our standouts like the osso buco and truffle pasta tend to be the ones guests rave about. We're always refining our menu and your feedback is valued. Hope you'll give us another chance to wow you!",
        timestamp: ts(3, 13, 25),
      },
    ]),
    convo(19, "Yelp", "James & Co.", ts(3, 10, 45), [
      {
        role: "user",
        content:
          "Brought a group of 12 for a birthday and they handled everything perfectly. The staff went above and beyond -- they even brought out a dessert with a candle without us asking. The family-style portions were generous and every dish was a hit. Can't recommend this place enough!",
        timestamp: ts(3, 10, 45),
      },
      {
        role: "assistant",
        content:
          "James, what an amazing review! Large parties are something we love hosting, and we're so glad everything came together for the birthday celebration. Our team takes pride in those little surprise moments. Thank you for trusting us with the occasion -- we hope to host many more celebrations for your group!",
        timestamp: ts(3, 10, 48),
      },
    ]),
    convo(20, "WhatsApp", "Patricia O.", ts(3, 9, 30), [
      {
        role: "user",
        content:
          "Do you have any vegan options on the dinner menu? My daughter is vegan and we're coming Thursday.",
        timestamp: ts(3, 9, 30),
      },
      {
        role: "assistant",
        content:
          "Hi Patricia! Yes, we have several vegan options: our roasted vegetable primavera, the wild mushroom bruschetta (made with our house-baked bread), and a seasonal root vegetable risotto made with vegetable stock. Our chef can also modify several other dishes to be fully vegan. Just let your server know when you arrive!",
        timestamp: ts(3, 9, 32),
      },
    ]),
  ];
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Returns a complete mock AgentStats matching the dashboard's existing data.
 * `isDemo` is always true.
 */
export function getMockStats(): AgentStats {
  const now = new Date();
  const activeSince = new Date(now);
  activeSince.setDate(activeSince.getDate() - 30);

  return {
    identity: {
      agentId: "maya-demo",
      agentName: "Maya",
      businessName: "Bella Cucina",
      ownerName: "Marco Bellini",
      vertical: "restaurant",
      role: "Restaurant Review & Reservation Manager",
      communicationStyle: "Professional and warm",
      status: "online",
      activeSince: activeSince.toISOString(),
    },
    todayMessages: 23,
    weekMessages: 189,
    totalMessages: 595,
    avgResponseTimeSec: 72, // 1.2 minutes
    taskBreakdown: generateTaskBreakdown(),
    dailyStats: generateDailyStats(),
    recentActivity: generateRecentActivity(),
    isDemo: true,
  };
}

/**
 * Returns a paginated mock MessagesResponse.
 * Supports page, pageSize, and search options.
 */
export function getMockMessages(
  opts: { page?: number; pageSize?: number; search?: string } = {}
): MessagesResponse {
  const { page = 1, pageSize = 20, search = "" } = opts;
  const all = generateConversations();

  const filtered = search
    ? all.filter((c) => {
        const q = search.toLowerCase();
        return (
          c.contact.toLowerCase().includes(q) ||
          c.preview.toLowerCase().includes(q) ||
          c.messages.some((m) => m.content.toLowerCase().includes(q))
        );
      })
    : all;

  const total = filtered.length;
  const startIdx = (page - 1) * pageSize;
  const paged = filtered.slice(startIdx, startIdx + pageSize);

  return { conversations: paged, total, page, pageSize };
}
