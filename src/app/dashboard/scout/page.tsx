"use client";

import { useState, useMemo, Fragment } from "react";
import {
  Target,
  Send,
  MessageCircle,
  TrendingUp,
  Calendar,
  Phone,
  ArrowRight,
  Zap,
  DollarSign,
  Star,
  MapPin,
  ShieldCheck,
  ChevronDown,
  ChevronRight,
  Flame,
  Users,
  BarChart3,
  Eye,
  Award,
  Filter,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { isDemoMode } from "@/lib/demo-mode";
import { MotionSection, CountUp } from "@/components/demo";

const DEMO = isDemoMode();

// ============================================================
// Types
// ============================================================

type Vertical = "restaurant" | "medical";
type ProspectStage =
  | "discovered"
  | "qualified"
  | "outreach_queued"
  | "contacted"
  | "follow_up_1"
  | "follow_up_2"
  | "follow_up_3"
  | "responded"
  | "cold"
  | "client";
type ResponseCategory =
  | "interested"
  | "not_interested"
  | "pricing_question"
  | "question"
  | "unsubscribe"
  | "out_of_office"
  | null;
type OutreachChannel = "email" | "instagram_dm" | "facebook_msg" | "contact_form";

interface ScoreBreakdown {
  pain: number;
  revenue: number;
  reachability: number;
  competition: number;
}

interface OutreachHistoryEntry {
  date: string;
  type: "outreach" | "follow_up" | "response_sent" | "response_received";
  channel: OutreachChannel | "inbound";
  preview: string;
}

interface Prospect {
  id: string;
  name: string;
  vertical: Vertical;
  score: number;
  stage: ProspectStage;
  geography: string;
  lastAction: string;
  lastActionDate: string;
  daysSinceContact: number;
  channel: OutreachChannel;
  ownerName: string | null;
  painPoints: string[];
  scoreBreakdown: ScoreBreakdown;
  outreachHistory: OutreachHistoryEntry[];
  response: { text: string; category: ResponseCategory } | null;
}

interface LogEntry {
  id: string;
  date: string;
  time: string;
  business: string;
  vertical: Vertical;
  channel: OutreachChannel;
  preview: string;
  gotResponse: boolean;
  responseCategory: ResponseCategory;
}

// ============================================================
// Constants
// ============================================================

const ADMIN_ACCENT = "#10b981";
const ADMIN_ACCENT_LIGHT = "#34d399";
const ADMIN_ACCENT_DIM = "#059669";

const stageConfig: Record<
  ProspectStage,
  { label: string; bg: string; text: string; order: number }
> = {
  discovered: { label: "Discovered", bg: "bg-slate-500/10", text: "text-slate-400", order: 0 },
  qualified: { label: "Qualified", bg: "bg-amber-500/10", text: "text-amber-400", order: 1 },
  outreach_queued: { label: "Queued", bg: "bg-blue-500/10", text: "text-blue-400", order: 2 },
  contacted: { label: "Contacted", bg: "bg-cyan-500/10", text: "text-cyan-400", order: 3 },
  follow_up_1: { label: "Follow-up 1", bg: "bg-orange-500/10", text: "text-orange-400", order: 4 },
  follow_up_2: { label: "Follow-up 2", bg: "bg-orange-500/10", text: "text-orange-400", order: 5 },
  follow_up_3: { label: "Follow-up 3", bg: "bg-orange-500/15", text: "text-orange-300", order: 6 },
  responded: { label: "Responded", bg: "bg-emerald-500/10", text: "text-emerald-400", order: 7 },
  cold: { label: "Cold", bg: "bg-red-500/10", text: "text-red-400", order: 8 },
  client: { label: "Converted", bg: "bg-emerald-500/20", text: "text-emerald-300", order: 9 },
};

const channelLabels: Record<OutreachChannel, { label: string; color: string; bg: string }> = {
  email: { label: "EMAIL", color: "text-blue-400", bg: "bg-blue-500/10" },
  instagram_dm: { label: "IG DM", color: "text-pink-400", bg: "bg-pink-500/10" },
  facebook_msg: { label: "FB MSG", color: "text-sky-400", bg: "bg-sky-500/10" },
  contact_form: { label: "FORM", color: "text-violet-400", bg: "bg-violet-500/10" },
};

const responseCategoryConfig: Record<string, { label: string; color: string; bg: string }> = {
  interested: { label: "Interested", color: "text-emerald-400", bg: "bg-emerald-500/10" },
  not_interested: { label: "Not Interested", color: "text-red-400", bg: "bg-red-500/10" },
  pricing_question: { label: "Pricing Q", color: "text-amber-400", bg: "bg-amber-500/10" },
  question: { label: "Question", color: "text-blue-400", bg: "bg-blue-500/10" },
  unsubscribe: { label: "Unsubscribed", color: "text-red-400", bg: "bg-red-500/10" },
  out_of_office: { label: "OOO", color: "text-slate-400", bg: "bg-slate-500/10" },
};

// ============================================================
// Mock Data — Pipeline Funnel
// ============================================================

const funnelStages = [
  { label: "Discovered", count: 247, pct: "100%" },
  { label: "Qualified", count: 89, pct: "36%" },
  { label: "Outreach", count: 52, pct: "58%" },
  { label: "Responded", count: 14, pct: "27%" },
  { label: "Interested", count: 4, pct: "29%" },
  { label: "Converted", count: 1, pct: "25%" },
];

// ============================================================
// Mock Data — 30-Day Trend
// ============================================================

const trendData = [
  { day: "Feb 4", discovered: 5, outreach: 0, responses: 0 },
  { day: "Feb 5", discovered: 7, outreach: 0, responses: 0 },
  { day: "Feb 6", discovered: 6, outreach: 2, responses: 0 },
  { day: "Feb 7", discovered: 8, outreach: 3, responses: 0 },
  { day: "Feb 8", discovered: 9, outreach: 2, responses: 0 },
  { day: "Feb 9", discovered: 4, outreach: 1, responses: 0 },
  { day: "Feb 10", discovered: 3, outreach: 2, responses: 1 },
  { day: "Feb 11", discovered: 7, outreach: 2, responses: 0 },
  { day: "Feb 12", discovered: 8, outreach: 3, responses: 0 },
  { day: "Feb 13", discovered: 9, outreach: 2, responses: 1 },
  { day: "Feb 14", discovered: 10, outreach: 2, responses: 0 },
  { day: "Feb 15", discovered: 8, outreach: 3, responses: 0 },
  { day: "Feb 16", discovered: 5, outreach: 1, responses: 0 },
  { day: "Feb 17", discovered: 4, outreach: 2, responses: 1 },
  { day: "Feb 18", discovered: 9, outreach: 2, responses: 0 },
  { day: "Feb 19", discovered: 10, outreach: 3, responses: 1 },
  { day: "Feb 20", discovered: 8, outreach: 2, responses: 1 },
  { day: "Feb 21", discovered: 11, outreach: 2, responses: 0 },
  { day: "Feb 22", discovered: 9, outreach: 3, responses: 1 },
  { day: "Feb 23", discovered: 6, outreach: 1, responses: 0 },
  { day: "Feb 24", discovered: 5, outreach: 2, responses: 1 },
  { day: "Feb 25", discovered: 10, outreach: 2, responses: 1 },
  { day: "Feb 26", discovered: 9, outreach: 3, responses: 0 },
  { day: "Feb 27", discovered: 11, outreach: 2, responses: 1 },
  { day: "Feb 28", discovered: 8, outreach: 2, responses: 0 },
  { day: "Mar 1", discovered: 7, outreach: 3, responses: 2 },
  { day: "Mar 2", discovered: 6, outreach: 1, responses: 0 },
  { day: "Mar 3", discovered: 5, outreach: 2, responses: 1 },
  { day: "Mar 4", discovered: 10, outreach: 2, responses: 1 },
  { day: "Mar 5", discovered: 8, outreach: 2, responses: 2 },
];

// ============================================================
// Mock Data — Today's Activity
// ============================================================

const todayDiscovered = [
  { name: "Riverside Grill", vertical: "restaurant" as Vertical, score: 63, qualified: true },
  { name: "Lakeline Dental", vertical: "medical" as Vertical, score: 79, qualified: true },
  { name: "South Austin Sushi", vertical: "restaurant" as Vertical, score: 55, qualified: false },
  { name: "Cedar Park Pizza Co", vertical: "restaurant" as Vertical, score: 44, qualified: false },
  { name: "Round Rock Family Dental", vertical: "medical" as Vertical, score: 72, qualified: true },
  { name: "Bee Cave Bistro", vertical: "restaurant" as Vertical, score: 58, qualified: false },
  { name: "Lakeway Orthodontics", vertical: "medical" as Vertical, score: 81, qualified: true },
  { name: "Buda BBQ Shack", vertical: "restaurant" as Vertical, score: 47, qualified: false },
];

const todayOutreach = [
  { business: "Golden Dragon", channel: "email" as OutreachChannel, preview: "Hi — I was browsing Golden Dragon on Google and noticed your last 11 reviews don't have responses, including a 1-star from last Friday..." },
  { business: "Smile Design Studio", channel: "instagram_dm" as OutreachChannel, preview: "Hi Dr. Chen — I noticed Smile Design Studio doesn't have online booking and your Google listing shows 9 unresponded patient reviews..." },
];

const todayResponses = [
  { business: "Chez Mimi", category: "interested" as ResponseCategory, preview: "I'd love to learn more about this. Can you send more info?" },
  { business: "Magnolia Cafe South", category: "pricing_question" as ResponseCategory, preview: "Interesting. How much does it cost?" },
];

const todayFollowUps = [
  { business: "Sakura Ramen House", stage: "Day-3 follow-up", channel: "email" as OutreachChannel },
  { business: "Downtown Dental Group", stage: "Day-7 follow-up", channel: "email" as OutreachChannel },
];

// ============================================================
// Mock Data — Prospects
// ============================================================

const prospects: Prospect[] = [
  {
    id: "p-1",
    name: "Chez Mimi",
    vertical: "restaurant",
    score: 85,
    stage: "responded",
    geography: "Austin, TX",
    lastAction: "Response: interested",
    lastActionDate: "Mar 5",
    daysSinceContact: 0,
    channel: "email",
    ownerName: "Mimi Tran",
    painPoints: ["22 unresponded Google reviews", "2-star review from last week sits unanswered", "No review response pattern — ever"],
    scoreBreakdown: { pain: 36, revenue: 22, reachability: 18, competition: 9 },
    outreachHistory: [
      { date: "Mar 4", type: "outreach", channel: "email", preview: "Hi Mimi — I was browsing Chez Mimi on Google and noticed your last 22 reviews don't have any owner responses, including a 2-star from last week..." },
      { date: "Mar 5", type: "response_received", channel: "inbound", preview: "I'd love to learn more about this. Can you send more info?" },
    ],
    response: { text: "I'd love to learn more about this. Can you send more info?", category: "interested" },
  },
  {
    id: "p-2",
    name: "Bright Smile Dental",
    vertical: "medical",
    score: 82,
    stage: "responded",
    geography: "Austin, TX",
    lastAction: "Response: interested",
    lastActionDate: "Feb 24",
    daysSinceContact: 9,
    channel: "email",
    ownerName: "Dr. Sarah Patel",
    painPoints: ["No online appointment booking", "15 unresponded reviews", "Patients mention 'hard to reach' in reviews"],
    scoreBreakdown: { pain: 35, revenue: 22, reachability: 15, competition: 10 },
    outreachHistory: [
      { date: "Feb 19", type: "outreach", channel: "email", preview: "Hi Dr. Patel — I noticed Bright Smile Dental doesn't have online booking and your Google listing shows 15 unanswered patient reviews..." },
      { date: "Feb 24", type: "response_received", channel: "inbound", preview: "How does this work exactly? We've been looking for something like this." },
    ],
    response: { text: "How does this work exactly? We've been looking for something like this.", category: "interested" },
  },
  {
    id: "p-3",
    name: "Tony's Pizzeria",
    vertical: "restaurant",
    score: 78,
    stage: "client",
    geography: "Round Rock, TX",
    lastAction: "Converted to client",
    lastActionDate: "Mar 3",
    daysSinceContact: 2,
    channel: "email",
    ownerName: "Tony Russo",
    painPoints: ["14 unresponded Google reviews", "2-star review from last Tuesday", "No owner response pattern"],
    scoreBreakdown: { pain: 32, revenue: 20, reachability: 16, competition: 10 },
    outreachHistory: [
      { date: "Feb 22", type: "outreach", channel: "email", preview: "Hi Tony — I was browsing Tony's Pizzeria on Google and noticed your last 14 reviews don't have responses, including a 2-star from last Tuesday..." },
      { date: "Feb 25", type: "response_received", channel: "inbound", preview: "This sounds interesting, can you tell me more about pricing?" },
      { date: "Feb 27", type: "response_sent", channel: "email", preview: "Great question, happy to break it down. We have three tiers — Starter at $299/mo for 1 agent and 1 channel..." },
      { date: "Mar 1", type: "response_received", channel: "inbound", preview: "Let's set up a call to discuss." },
    ],
    response: { text: "Let's set up a call to discuss.", category: "interested" },
  },
  {
    id: "p-4",
    name: "Magnolia Cafe South",
    vertical: "restaurant",
    score: 71,
    stage: "responded",
    geography: "Austin, TX",
    lastAction: "Response: pricing question",
    lastActionDate: "Mar 5",
    daysSinceContact: 0,
    channel: "instagram_dm",
    ownerName: null,
    painPoints: ["8 unresponded Google reviews", "Reviews mention long wait times", "No reservation system apparent"],
    scoreBreakdown: { pain: 28, revenue: 18, reachability: 15, competition: 10 },
    outreachHistory: [
      { date: "Mar 3", type: "outreach", channel: "instagram_dm", preview: "Hey — love Magnolia Cafe! Noticed your last 8 Google reviews don't have responses. Every potential customer sees those unanswered..." },
      { date: "Mar 5", type: "response_received", channel: "inbound", preview: "Interesting. How much does it cost?" },
    ],
    response: { text: "Interesting. How much does it cost?", category: "pricing_question" },
  },
  {
    id: "p-5",
    name: "Austin Family Dental",
    vertical: "medical",
    score: 80,
    stage: "outreach_queued",
    geography: "Austin, TX",
    lastAction: "Queued for outreach",
    lastActionDate: "Mar 4",
    daysSinceContact: 0,
    channel: "email",
    ownerName: "Dr. James Lee",
    painPoints: ["No online booking system", "12 unresponded reviews", "Patients complain about scheduling difficulty"],
    scoreBreakdown: { pain: 34, revenue: 21, reachability: 16, competition: 9 },
    outreachHistory: [],
    response: null,
  },
  {
    id: "p-6",
    name: "Smile Design Studio",
    vertical: "medical",
    score: 77,
    stage: "contacted",
    geography: "Cedar Park, TX",
    lastAction: "Initial outreach sent",
    lastActionDate: "Mar 3",
    daysSinceContact: 2,
    channel: "instagram_dm",
    ownerName: "Dr. Lisa Chen",
    painPoints: ["No online booking", "Active IG but no patient engagement", "6 unresponded Google reviews"],
    scoreBreakdown: { pain: 30, revenue: 20, reachability: 17, competition: 10 },
    outreachHistory: [
      { date: "Mar 3", type: "outreach", channel: "instagram_dm", preview: "Hi Dr. Chen — I noticed Smile Design Studio doesn't have online booking and your Google listing shows patient reviews going unanswered..." },
    ],
    response: null,
  },
  {
    id: "p-7",
    name: "Downtown Dental Group",
    vertical: "medical",
    score: 76,
    stage: "follow_up_2",
    geography: "Austin, TX",
    lastAction: "Day-7 follow-up sent",
    lastActionDate: "Mar 5",
    daysSinceContact: 0,
    channel: "email",
    ownerName: "Dr. Rivera",
    painPoints: ["No online booking", "12 unresponded reviews", "3 recent 3-star reviews about wait times"],
    scoreBreakdown: { pain: 32, revenue: 19, reachability: 15, competition: 10 },
    outreachHistory: [
      { date: "Feb 25", type: "outreach", channel: "email", preview: "Hi Dr. Rivera — I noticed Downtown Dental doesn't have online booking and your Google listing shows 12 unresponded patient reviews..." },
      { date: "Feb 28", type: "follow_up", channel: "email", preview: "Hi Dr. Rivera — just bumping my last message in case it got buried. I noticed another unresponded review came in this week..." },
      { date: "Mar 5", type: "follow_up", channel: "email", preview: "Hi Dr. Rivera — wanted to follow up one more time. I work with a dental office that reduced no-shows by 35% in the first month..." },
    ],
    response: null,
  },
  {
    id: "p-8",
    name: "Golden Dragon",
    vertical: "restaurant",
    score: 74,
    stage: "contacted",
    geography: "Austin, TX",
    lastAction: "Initial outreach sent",
    lastActionDate: "Mar 5",
    daysSinceContact: 0,
    channel: "email",
    ownerName: "Wei Zhang",
    painPoints: ["11 unresponded Google reviews", "1-star review from last Friday", "No social media presence"],
    scoreBreakdown: { pain: 30, revenue: 18, reachability: 16, competition: 10 },
    outreachHistory: [
      { date: "Mar 5", type: "outreach", channel: "email", preview: "Hi Wei — I was browsing Golden Dragon on Google and noticed your last 11 reviews don't have responses, including a 1-star from last Friday..." },
    ],
    response: null,
  },
  {
    id: "p-9",
    name: "Sakura Ramen House",
    vertical: "restaurant",
    score: 72,
    stage: "follow_up_1",
    geography: "Austin, TX",
    lastAction: "Day-3 follow-up sent",
    lastActionDate: "Mar 5",
    daysSinceContact: 0,
    channel: "email",
    ownerName: null,
    painPoints: ["9 unresponded reviews", "Negative reviews about slow service go unanswered", "No reservation system"],
    scoreBreakdown: { pain: 28, revenue: 18, reachability: 16, competition: 10 },
    outreachHistory: [
      { date: "Feb 28", type: "outreach", channel: "email", preview: "Hi — I was checking out Sakura Ramen on Google and noticed 9 reviews without any owner response..." },
      { date: "Mar 5", type: "follow_up", channel: "email", preview: "Hi — just bumping this in case it got buried. Saw another unresponded review came in for Sakura Ramen this week..." },
    ],
    response: null,
  },
  {
    id: "p-10",
    name: "Bella Vista Trattoria",
    vertical: "restaurant",
    score: 69,
    stage: "qualified",
    geography: "Pflugerville, TX",
    lastAction: "Qualified — score 69",
    lastActionDate: "Mar 4",
    daysSinceContact: 0,
    channel: "email",
    ownerName: "Marco Bellini",
    painPoints: ["7 unresponded reviews", "Inconsistent review response pattern"],
    scoreBreakdown: { pain: 27, revenue: 17, reachability: 15, competition: 10 },
    outreachHistory: [],
    response: null,
  },
  {
    id: "p-11",
    name: "The Noodle House",
    vertical: "restaurant",
    score: 66,
    stage: "qualified",
    geography: "Georgetown, TX",
    lastAction: "Qualified — score 66",
    lastActionDate: "Mar 3",
    daysSinceContact: 0,
    channel: "contact_form",
    ownerName: null,
    painPoints: ["6 unresponded reviews", "No email or social media found"],
    scoreBreakdown: { pain: 25, revenue: 16, reachability: 15, competition: 10 },
    outreachHistory: [],
    response: null,
  },
  {
    id: "p-12",
    name: "Hill Country BBQ",
    vertical: "restaurant",
    score: 61,
    stage: "outreach_queued",
    geography: "Dripping Springs, TX",
    lastAction: "Queued for outreach",
    lastActionDate: "Mar 2",
    daysSinceContact: 0,
    channel: "email",
    ownerName: "Buck Henderson",
    painPoints: ["5 unresponded reviews", "Small town — less competition but lower revenue signal"],
    scoreBreakdown: { pain: 22, revenue: 16, reachability: 14, competition: 9 },
    outreachHistory: [],
    response: null,
  },
  {
    id: "p-13",
    name: "Riverside Grill",
    vertical: "restaurant",
    score: 63,
    stage: "discovered",
    geography: "Austin, TX",
    lastAction: "Discovered today",
    lastActionDate: "Mar 5",
    daysSinceContact: 0,
    channel: "email",
    ownerName: null,
    painPoints: ["6 unresponded reviews", "1 recent negative review about cold food"],
    scoreBreakdown: { pain: 24, revenue: 15, reachability: 14, competition: 10 },
    outreachHistory: [],
    response: null,
  },
  {
    id: "p-14",
    name: "El Rancho Grande",
    vertical: "restaurant",
    score: 65,
    stage: "cold",
    geography: "Austin, TX",
    lastAction: "Response: not interested",
    lastActionDate: "Feb 21",
    daysSinceContact: 12,
    channel: "email",
    ownerName: null,
    painPoints: ["10 unresponded reviews", "Multiple 2-star reviews about service"],
    scoreBreakdown: { pain: 26, revenue: 16, reachability: 13, competition: 10 },
    outreachHistory: [
      { date: "Feb 20", type: "outreach", channel: "email", preview: "Hi — I came across El Rancho Grande on Google and noticed 10 reviews without responses, including several 2-stars..." },
      { date: "Feb 21", type: "response_received", channel: "inbound", preview: "Not interested, we handle things ourselves." },
    ],
    response: { text: "Not interested, we handle things ourselves.", category: "not_interested" },
  },
  {
    id: "p-15",
    name: "Pho King Delicious",
    vertical: "restaurant",
    score: 68,
    stage: "cold",
    geography: "Austin, TX",
    lastAction: "Unsubscribed",
    lastActionDate: "Feb 25",
    daysSinceContact: 8,
    channel: "email",
    ownerName: null,
    painPoints: ["7 unresponded reviews", "No website found"],
    scoreBreakdown: { pain: 26, revenue: 17, reachability: 15, competition: 10 },
    outreachHistory: [
      { date: "Feb 24", type: "outreach", channel: "email", preview: "Hi — I was browsing Pho King Delicious on Google and noticed several reviews without owner responses..." },
      { date: "Feb 25", type: "response_received", channel: "inbound", preview: "unsubscribe" },
    ],
    response: { text: "unsubscribe", category: "unsubscribe" },
  },
];

// ============================================================
// Mock Data — Message Log
// ============================================================

const messageLog: LogEntry[] = [
  { id: "m-1", date: "Mar 5", time: "10:14am", business: "Golden Dragon", vertical: "restaurant", channel: "email", preview: "Hi Wei — I was browsing Golden Dragon on Google and noticed your last 11 reviews don't have responses...", gotResponse: false, responseCategory: null },
  { id: "m-2", date: "Mar 5", time: "10:32am", business: "Smile Design Studio", vertical: "medical", channel: "instagram_dm", preview: "Hi Dr. Chen — I noticed Smile Design Studio doesn't have online booking and your Google listing shows...", gotResponse: false, responseCategory: null },
  { id: "m-3", date: "Mar 5", time: "9:00am", business: "Sakura Ramen House", vertical: "restaurant", channel: "email", preview: "Hi — just bumping this in case it got buried. Saw another unresponded review came in this week...", gotResponse: false, responseCategory: null },
  { id: "m-4", date: "Mar 5", time: "9:15am", business: "Downtown Dental Group", vertical: "medical", channel: "email", preview: "Hi Dr. Rivera — wanted to follow up one more time. I work with a dental office that reduced...", gotResponse: false, responseCategory: null },
  { id: "m-5", date: "Mar 4", time: "10:18am", business: "Chez Mimi", vertical: "restaurant", channel: "email", preview: "Hi Mimi — I was browsing Chez Mimi on Google and noticed your last 22 reviews don't have any...", gotResponse: true, responseCategory: "interested" },
  { id: "m-6", date: "Mar 3", time: "10:45am", business: "Magnolia Cafe South", vertical: "restaurant", channel: "instagram_dm", preview: "Hey — love Magnolia Cafe! Noticed your last 8 Google reviews don't have responses...", gotResponse: true, responseCategory: "pricing_question" },
  { id: "m-7", date: "Mar 3", time: "11:20am", business: "Smile Design Studio", vertical: "medical", channel: "instagram_dm", preview: "Hi Dr. Chen — I noticed Smile Design Studio doesn't have online booking...", gotResponse: false, responseCategory: null },
  { id: "m-8", date: "Feb 28", time: "10:30am", business: "Sakura Ramen House", vertical: "restaurant", channel: "email", preview: "Hi — I was checking out Sakura Ramen on Google and noticed 9 reviews without any owner response...", gotResponse: false, responseCategory: null },
  { id: "m-9", date: "Feb 28", time: "11:05am", business: "Downtown Dental Group", vertical: "medical", channel: "email", preview: "Hi Dr. Rivera — just bumping my last message. I noticed another unresponded review came in...", gotResponse: false, responseCategory: null },
  { id: "m-10", date: "Feb 27", time: "10:18am", business: "Tony's Pizzeria", vertical: "restaurant", channel: "email", preview: "Great question, happy to break it down. We have three tiers — Starter at $299/mo...", gotResponse: true, responseCategory: "interested" },
  { id: "m-11", date: "Feb 25", time: "10:40am", business: "Downtown Dental Group", vertical: "medical", channel: "email", preview: "Hi Dr. Rivera — I noticed Downtown Dental doesn't have online booking and your Google listing...", gotResponse: false, responseCategory: null },
  { id: "m-12", date: "Feb 24", time: "11:12am", business: "Pho King Delicious", vertical: "restaurant", channel: "email", preview: "Hi — I was browsing Pho King Delicious on Google and noticed several reviews without responses...", gotResponse: true, responseCategory: "unsubscribe" },
  { id: "m-13", date: "Feb 22", time: "10:55am", business: "Tony's Pizzeria", vertical: "restaurant", channel: "email", preview: "Hi Tony — I was browsing Tony's Pizzeria on Google and noticed your last 14 reviews don't have...", gotResponse: true, responseCategory: "pricing_question" },
  { id: "m-14", date: "Feb 20", time: "10:30am", business: "El Rancho Grande", vertical: "restaurant", channel: "email", preview: "Hi — I came across El Rancho Grande on Google and noticed 10 reviews without responses...", gotResponse: true, responseCategory: "not_interested" },
  { id: "m-15", date: "Feb 19", time: "11:00am", business: "Bright Smile Dental", vertical: "medical", channel: "email", preview: "Hi Dr. Patel — I noticed Bright Smile Dental doesn't have online booking and your Google listing...", gotResponse: true, responseCategory: "interested" },
];

// ============================================================
// Mock Data — Performance Metrics
// ============================================================

const scoutMetrics = [
  { label: "Discovery Rate", value: "8.2", unit: "/day", icon: Target, change: "+14%", description: "Businesses found per day" },
  { label: "Qualification Rate", value: "36", unit: "%", icon: Filter, change: "+3%", description: "Score 60+ of discovered" },
  { label: "Response Rate", value: "27", unit: "%", icon: MessageCircle, change: "+5%", description: "Outreach that gets a reply" },
  { label: "Conversion Rate", value: "1.9", unit: "%", icon: TrendingUp, change: "first!", description: "Outreach to conversion" },
  { label: "Best Vertical", value: "Restaurant", unit: "", icon: Award, change: "68%", description: "Of total pipeline" },
  { label: "Best Angle", value: "Reviews", unit: "", icon: Star, change: "42%", description: "Response rate on review-focused msgs" },
  { label: "Cost Per Lead", value: "$2.40", unit: "", icon: DollarSign, change: "-12%", description: "API tokens per qualified prospect" },
];

// ============================================================
// Helper Components
// ============================================================

function ScoutTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; name: string; color?: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1a1a2e] border border-emerald-500/20 rounded-lg px-3 py-2 shadow-xl">
      <p className="text-[#6b6b7b] text-xs font-mono mb-1">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-[#e8e6e3] text-xs font-mono">
            {p.value} {p.name}
          </span>
        </div>
      ))}
    </div>
  );
}

function StageBadge({ stage }: { stage: ProspectStage }) {
  const config = stageConfig[stage];
  return (
    <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-mono ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
}

function ChannelBadge({ channel }: { channel: OutreachChannel }) {
  const config = channelLabels[channel];
  return (
    <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-mono ${config.bg} ${config.color}`}>
      {config.label}
    </span>
  );
}

function ResponseBadge({ category }: { category: string }) {
  const config = responseCategoryConfig[category];
  if (!config) return null;
  return (
    <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-mono ${config.bg} ${config.color}`}>
      {config.label}
    </span>
  );
}

function ScoreBar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = (value / max) * 100;
  return (
    <div>
      <div className="flex justify-between text-[11px] mb-1">
        <span className="text-text-muted">{label}</span>
        <span className="font-mono text-text">{value}/{max}</span>
      </div>
      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: pct >= 75 ? ADMIN_ACCENT : pct >= 50 ? ADMIN_ACCENT_DIM : "#6b6b7b" }}
        />
      </div>
    </div>
  );
}

// ============================================================
// Main Component
// ============================================================

export default function ScoutDashboardPage() {
  // TODO: Replace with real admin authentication
  // This page is internal-only — not visible to clients

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [verticalFilter, setVerticalFilter] = useState<string>("all");
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [scoreFilter, setScoreFilter] = useState<string>("all");
  const [logVerticalFilter, setLogVerticalFilter] = useState<string>("all");
  const [logChannelFilter, setLogChannelFilter] = useState<string>("all");

  const filteredProspects = useMemo(() => {
    return prospects
      .filter((p) => {
        if (verticalFilter !== "all" && p.vertical !== verticalFilter) return false;
        if (stageFilter !== "all" && p.stage !== stageFilter) return false;
        if (scoreFilter === "80+" && p.score < 80) return false;
        if (scoreFilter === "70-79" && (p.score < 70 || p.score > 79)) return false;
        if (scoreFilter === "60-69" && (p.score < 60 || p.score > 69)) return false;
        return true;
      })
      .sort((a, b) => b.score - a.score);
  }, [verticalFilter, stageFilter, scoreFilter]);

  const filteredLog = useMemo(() => {
    return messageLog.filter((m) => {
      if (logVerticalFilter !== "all" && m.vertical !== logVerticalFilter) return false;
      if (logChannelFilter !== "all" && m.channel !== logChannelFilter) return false;
      return true;
    });
  }, [logVerticalFilter, logChannelFilter]);

  const hotLeads = prospects.filter(
    (p) => p.response && (p.response.category === "interested" || p.response.category === "pricing_question") && p.stage !== "client" && p.stage !== "cold"
  );

  const axisStyle = {
    fill: "#6b6b7b",
    fontSize: 10,
    fontFamily: "var(--font-space-mono)",
  };

  const Section = DEMO ? MotionSection : ({ children, className }: { children: React.ReactNode; index?: number; className?: string }) => <div className={className}>{children}</div>;

  return (
    <div className="space-y-6">
      {/* ============================================================ */}
      {/* Admin Banner */}
      {/* ============================================================ */}
      <Section index={0} className="relative overflow-hidden bg-card border border-emerald-500/20 rounded-2xl p-6">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 via-transparent to-teal-500/5" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/3 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center">
              <Target size={22} className="text-emerald-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-text tracking-tight">Scout</h1>
              <p className="text-sm text-text-muted">Find businesses that need an AI agent</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
              <ShieldCheck size={14} className="text-emerald-400" />
              <span className="text-[11px] font-mono text-emerald-400 uppercase tracking-wider">Draft Mode</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-card border border-border rounded-lg">
              <Calendar size={14} className="text-text-muted" />
              <span className="text-xs font-mono text-text-muted">Feb 4 — Mar 5, 2026</span>
            </div>
          </div>
        </div>
      </Section>

      {/* ============================================================ */}
      {/* Section 1: Pipeline Funnel + Trend Chart */}
      {/* ============================================================ */}
      <div className="space-y-4">
        {/* Funnel */}
        <div className="bg-card border border-border rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <Users size={14} className="text-emerald-400" />
            </div>
            <h2 className="text-sm font-semibold text-text">Pipeline Funnel</h2>
            <span className="text-xs text-text-muted">30-day cumulative</span>
          </div>

          <div className="flex items-center gap-1">
            {funnelStages.map((stage, i) => {
              const opacity = 0.08 + (i * 0.04);
              const borderOpacity = 0.15 + (i * 0.05);
              const isLast = i === funnelStages.length - 1;
              return (
                <Fragment key={stage.label}>
                  <div
                    className="flex-1 rounded-xl p-4 text-center transition-colors hover:brightness-110"
                    style={{
                      backgroundColor: `rgba(16, 185, 129, ${opacity})`,
                      border: `1px solid rgba(16, 185, 129, ${borderOpacity})`,
                    }}
                  >
                    <p className="text-[10px] font-mono text-text-muted uppercase tracking-wider mb-1">
                      {stage.label}
                    </p>
                    <p className="text-2xl font-bold font-mono text-text">
                      {DEMO ? <CountUp end={stage.count} delay={0.3 + i * 0.15} /> : stage.count}
                    </p>
                  </div>
                  {!isLast && (
                    <div className="flex flex-col items-center px-1 shrink-0">
                      <ArrowRight size={12} className="text-emerald-500/40" />
                      <span className="text-[9px] font-mono text-emerald-400/70 mt-0.5">{funnelStages[i + 1].pct}</span>
                    </div>
                  )}
                </Fragment>
              );
            })}
          </div>
        </div>

        {/* Trend Chart */}
        <div className="bg-card border border-border rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <TrendingUp size={14} className="text-emerald-400" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-text">Daily Activity</h2>
                <p className="text-xs text-text-muted">Last 30 days</p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-[11px] font-mono">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-400/50" /> Discovered</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Outreach</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-teal-300" /> Responses</span>
            </div>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="discGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={ADMIN_ACCENT_LIGHT} stopOpacity={0.15} />
                    <stop offset="100%" stopColor={ADMIN_ACCENT_LIGHT} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="outGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={ADMIN_ACCENT} stopOpacity={0.2} />
                    <stop offset="100%" stopColor={ADMIN_ACCENT} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="respGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#5eead4" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#5eead4" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1a1a2e" vertical={false} />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={axisStyle} dy={8} interval={4} />
                <YAxis axisLine={false} tickLine={false} tick={axisStyle} />
                <Tooltip content={<ScoutTooltip />} cursor={{ stroke: ADMIN_ACCENT, strokeOpacity: 0.15 }} />
                <Area type="monotone" dataKey="discovered" name="discovered" stroke={ADMIN_ACCENT_LIGHT} strokeWidth={1.5} fill="url(#discGrad)" dot={false} activeDot={{ r: 3, fill: ADMIN_ACCENT_LIGHT, stroke: "#12121e", strokeWidth: 2 }} isAnimationActive={DEMO} animationDuration={2000} />
                <Area type="monotone" dataKey="outreach" name="outreach" stroke={ADMIN_ACCENT} strokeWidth={2} fill="url(#outGrad)" dot={false} activeDot={{ r: 3, fill: ADMIN_ACCENT, stroke: "#12121e", strokeWidth: 2 }} isAnimationActive={DEMO} animationDuration={2000} />
                <Area type="monotone" dataKey="responses" name="responses" stroke="#5eead4" strokeWidth={2} fill="url(#respGrad)" dot={false} activeDot={{ r: 3, fill: "#5eead4", stroke: "#12121e", strokeWidth: 2 }} isAnimationActive={DEMO} animationDuration={2000} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* Section 2: Today's Activity */}
      {/* ============================================================ */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center">
            <Zap size={14} className="text-emerald-400" />
          </div>
          <h2 className="text-sm font-semibold text-text">Today&apos;s Activity</h2>
          <span className="text-xs text-text-muted">Mar 5, 2026</span>
        </div>

        <div className="grid grid-cols-4 gap-4">
          {/* Discovered Today */}
          <div className="bg-card border border-border rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-mono text-text-muted uppercase tracking-wider">Discovered</p>
              <span className="text-lg font-bold font-mono text-text">{todayDiscovered.length}</span>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {todayDiscovered.map((b) => (
                <div key={b.name} className="flex items-center justify-between gap-2 py-1.5 border-b border-border/50 last:border-0">
                  <div className="min-w-0">
                    <p className="text-xs text-text truncate">{b.name}</p>
                    <p className="text-[10px] text-text-muted capitalize">{b.vertical}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={`text-xs font-mono ${b.qualified ? "text-emerald-400" : "text-red-400"}`}>
                      {b.score}
                    </span>
                    <span className={`text-[9px] ${b.qualified ? "text-emerald-400" : "text-red-400"}`}>
                      {b.qualified ? "PASS" : "FAIL"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Outreach Sent */}
          <div className="bg-card border border-border rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-mono text-text-muted uppercase tracking-wider">Outreach Sent</p>
              <span className="text-lg font-bold font-mono text-text">{todayOutreach.length}</span>
            </div>
            <div className="space-y-3">
              {todayOutreach.map((o) => (
                <div key={o.business} className="py-1.5 border-b border-border/50 last:border-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-medium text-text">{o.business}</p>
                    <ChannelBadge channel={o.channel} />
                  </div>
                  <p className="text-[11px] text-text-muted line-clamp-2 leading-relaxed">{o.preview}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Responses */}
          <div className="bg-card border border-border rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-mono text-text-muted uppercase tracking-wider">Responses</p>
              <span className="text-lg font-bold font-mono text-text">{todayResponses.length}</span>
            </div>
            <div className="space-y-3">
              {todayResponses.map((r) => (
                <div key={r.business} className="py-1.5 border-b border-border/50 last:border-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-medium text-text">{r.business}</p>
                    {r.category && <ResponseBadge category={r.category} />}
                  </div>
                  <p className="text-[11px] text-text-muted italic leading-relaxed">&quot;{r.preview}&quot;</p>
                </div>
              ))}
            </div>
          </div>

          {/* Follow-ups */}
          <div className="bg-card border border-border rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-mono text-text-muted uppercase tracking-wider">Follow-ups</p>
              <span className="text-lg font-bold font-mono text-text">{todayFollowUps.length}</span>
            </div>
            <div className="space-y-3">
              {todayFollowUps.map((f) => (
                <div key={f.business} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
                  <div>
                    <p className="text-xs font-medium text-text">{f.business}</p>
                    <p className="text-[10px] text-orange-400 font-mono">{f.stage}</p>
                  </div>
                  <ChannelBadge channel={f.channel} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* Section 3: Prospect Pipeline Table */}
      {/* ============================================================ */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <BarChart3 size={14} className="text-emerald-400" />
            </div>
            <h2 className="text-sm font-semibold text-text">Prospect Pipeline</h2>
            <span className="text-xs font-mono text-text-muted">{filteredProspects.length} prospects</span>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2">
            <select
              value={verticalFilter}
              onChange={(e) => setVerticalFilter(e.target.value)}
              className="bg-background border border-border rounded-lg px-3 py-1.5 text-xs text-text font-mono focus:border-emerald-500/50 focus:outline-none appearance-none cursor-pointer"
            >
              <option value="all">All Verticals</option>
              <option value="restaurant">Restaurant</option>
              <option value="medical">Medical / Dental</option>
            </select>
            <select
              value={scoreFilter}
              onChange={(e) => setScoreFilter(e.target.value)}
              className="bg-background border border-border rounded-lg px-3 py-1.5 text-xs text-text font-mono focus:border-emerald-500/50 focus:outline-none appearance-none cursor-pointer"
            >
              <option value="all">All Scores</option>
              <option value="80+">80+ Excellent</option>
              <option value="70-79">70-79 Good</option>
              <option value="60-69">60-69 Threshold</option>
            </select>
            <select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
              className="bg-background border border-border rounded-lg px-3 py-1.5 text-xs text-text font-mono focus:border-emerald-500/50 focus:outline-none appearance-none cursor-pointer"
            >
              <option value="all">All Stages</option>
              <option value="discovered">Discovered</option>
              <option value="qualified">Qualified</option>
              <option value="outreach_queued">Queued</option>
              <option value="contacted">Contacted</option>
              <option value="follow_up_1">Follow-up 1</option>
              <option value="follow_up_2">Follow-up 2</option>
              <option value="responded">Responded</option>
              <option value="cold">Cold</option>
              <option value="client">Client</option>
            </select>
          </div>
        </div>

        {/* Table Header */}
        <div className="grid grid-cols-[1fr_90px_60px_100px_1fr_70px_80px_30px] gap-4 px-4 py-2.5 text-[10px] font-mono text-text-muted uppercase tracking-wider border-b border-border">
          <span>Business</span>
          <span>Vertical</span>
          <span>Score</span>
          <span>Stage</span>
          <span>Last Action</span>
          <span>Days</span>
          <span>Channel</span>
          <span></span>
        </div>

        {/* Table Rows */}
        <div className="divide-y divide-border/50">
          {filteredProspects.map((p) => {
            const isExpanded = expandedId === p.id;
            return (
              <div key={p.id}>
                {/* Row */}
                <div
                  className={`grid grid-cols-[1fr_90px_60px_100px_1fr_70px_80px_30px] gap-4 px-4 py-3 items-center cursor-pointer transition-colors ${
                    isExpanded ? "bg-emerald-500/5" : "hover:bg-white/[0.02]"
                  }`}
                  onClick={() => setExpandedId(isExpanded ? null : p.id)}
                >
                  <div className="min-w-0">
                    <p className="text-sm text-text truncate">{p.name}</p>
                    <p className="text-[10px] text-text-muted flex items-center gap-1">
                      <MapPin size={9} /> {p.geography}
                    </p>
                  </div>
                  <span className="text-xs text-text-muted capitalize">{p.vertical}</span>
                  <span className={`text-sm font-mono font-bold ${
                    p.score >= 80 ? "text-emerald-400" : p.score >= 70 ? "text-emerald-500/80" : "text-amber-400"
                  }`}>
                    {p.score}
                  </span>
                  <StageBadge stage={p.stage} />
                  <p className="text-xs text-text-muted truncate">{p.lastAction}</p>
                  <span className="text-xs font-mono text-text-muted">
                    {p.daysSinceContact > 0 ? `${p.daysSinceContact}d ago` : "today"}
                  </span>
                  <ChannelBadge channel={p.channel} />
                  <div className="flex justify-center">
                    {isExpanded ? (
                      <ChevronDown size={14} className="text-emerald-400" />
                    ) : (
                      <ChevronRight size={14} className="text-text-muted" />
                    )}
                  </div>
                </div>

                {/* Expanded Dossier */}
                {isExpanded && (
                  <div className="px-4 pb-5 pt-1 bg-emerald-500/[0.03] border-t border-emerald-500/10">
                    <div className="grid grid-cols-3 gap-6">
                      {/* Score Breakdown */}
                      <div>
                        <p className="text-[10px] font-mono text-text-muted uppercase tracking-wider mb-3">Score Breakdown</p>
                        <div className="space-y-2.5">
                          <ScoreBar label="Pain Signal" value={p.scoreBreakdown.pain} max={40} />
                          <ScoreBar label="Revenue Fit" value={p.scoreBreakdown.revenue} max={25} />
                          <ScoreBar label="Reachability" value={p.scoreBreakdown.reachability} max={20} />
                          <ScoreBar label="Competition" value={p.scoreBreakdown.competition} max={15} />
                        </div>
                        <div className="mt-3 pt-3 border-t border-border/50">
                          <p className="text-[10px] font-mono text-text-muted uppercase tracking-wider mb-2">Pain Points</p>
                          <ul className="space-y-1">
                            {p.painPoints.map((pp, i) => (
                              <li key={i} className="text-[11px] text-text-muted flex items-start gap-1.5">
                                <span className="text-emerald-400 mt-0.5 shrink-0">-</span>
                                {pp}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      {/* Outreach History */}
                      <div className="col-span-2">
                        <p className="text-[10px] font-mono text-text-muted uppercase tracking-wider mb-3">
                          Outreach History {p.ownerName && <span className="normal-case text-text">({p.ownerName})</span>}
                        </p>
                        {p.outreachHistory.length === 0 ? (
                          <p className="text-xs text-text-muted italic">No outreach sent yet</p>
                        ) : (
                          <div className="space-y-3">
                            {p.outreachHistory.map((h, i) => (
                              <div key={i} className="flex gap-3">
                                <div className="flex flex-col items-center">
                                  <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                                    h.type === "response_received" ? "bg-emerald-400" :
                                    h.type === "follow_up" ? "bg-orange-400" :
                                    h.type === "response_sent" ? "bg-blue-400" :
                                    "bg-cyan-400"
                                  }`} />
                                  {i < p.outreachHistory.length - 1 && <div className="w-px flex-1 bg-border/50 mt-1" />}
                                </div>
                                <div className="min-w-0 pb-2">
                                  <div className="flex items-center gap-2 mb-0.5">
                                    <span className="text-[10px] font-mono text-text-muted">{h.date}</span>
                                    <span className={`text-[10px] font-mono ${
                                      h.type === "response_received" ? "text-emerald-400" :
                                      h.type === "follow_up" ? "text-orange-400" :
                                      h.type === "response_sent" ? "text-blue-400" :
                                      "text-cyan-400"
                                    }`}>
                                      {h.type === "outreach" ? "INITIAL" :
                                       h.type === "follow_up" ? "FOLLOW-UP" :
                                       h.type === "response_sent" ? "REPLIED" :
                                       "RESPONSE"}
                                    </span>
                                    {h.channel !== "inbound" && <ChannelBadge channel={h.channel as OutreachChannel} />}
                                  </div>
                                  <p className={`text-[11px] leading-relaxed ${
                                    h.type === "response_received" ? "text-text italic" : "text-text-muted"
                                  }`}>
                                    {h.type === "response_received" ? `"${h.preview}"` : h.preview}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ============================================================ */}
      {/* Section 4: Hot Leads Panel */}
      {/* ============================================================ */}
      {hotLeads.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <Flame size={14} className="text-emerald-400" />
            </div>
            <h2 className="text-sm font-semibold text-text">Hot Leads</h2>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {hotLeads.length} active
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {hotLeads.map((lead) => (
              <div
                key={lead.id}
                className={`bg-card border border-emerald-500/20 rounded-2xl p-5 relative overflow-hidden ${DEMO ? "animate-pulse-glow" : ""}`}
                style={{ boxShadow: DEMO ? "0 0 30px rgba(255, 107, 53, 0.08)" : "0 0 20px rgba(16, 185, 129, 0.06)" }}
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/4" />
                <div className="relative">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-base font-semibold text-text">{lead.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-text-muted capitalize">{lead.vertical}</span>
                        <span className="text-text-muted">-</span>
                        <span className="text-xs text-text-muted flex items-center gap-1"><MapPin size={9} /> {lead.geography}</span>
                        {lead.ownerName && (
                          <>
                            <span className="text-text-muted">-</span>
                            <span className="text-xs text-text">{lead.ownerName}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-bold font-mono text-emerald-400">{lead.score}</span>
                      {lead.response && <ResponseBadge category={lead.response.category!} />}
                    </div>
                  </div>

                  {/* Pain Points */}
                  <div className="mb-4">
                    <p className="text-[10px] font-mono text-text-muted uppercase tracking-wider mb-1.5">Pain Points</p>
                    <div className="flex flex-wrap gap-1.5">
                      {lead.painPoints.map((pp, i) => (
                        <span key={i} className="px-2 py-1 bg-white/5 rounded text-[10px] text-text-muted">{pp}</span>
                      ))}
                    </div>
                  </div>

                  {/* Their Response */}
                  {lead.response && (
                    <div className="mb-4 p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-lg">
                      <p className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider mb-1">Their Response</p>
                      <p className="text-sm text-text italic">&quot;{lead.response.text}&quot;</p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-3">
                    <button className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg text-xs font-medium hover:bg-emerald-600 transition-colors">
                      <Phone size={13} />
                      Schedule Call
                    </button>
                    <button
                      className="flex items-center gap-2 px-4 py-2 bg-white/5 text-text-muted rounded-lg text-xs font-medium hover:bg-white/10 hover:text-text transition-colors"
                      onClick={() => setExpandedId(lead.id)}
                    >
                      <Eye size={13} />
                      Full Dossier
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* Section 5: Scout Performance Metrics */}
      {/* ============================================================ */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center">
            <BarChart3 size={14} className="text-emerald-400" />
          </div>
          <h2 className="text-sm font-semibold text-text">Scout Performance</h2>
          <span className="text-xs text-text-muted">30-day metrics</span>
        </div>

        <div className="grid grid-cols-7 gap-3">
          {scoutMetrics.map((metric) => {
            const Icon = metric.icon;
            return (
              <div key={metric.label} className="bg-card border border-border rounded-2xl p-4 group hover:border-emerald-500/20 transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[9px] font-mono text-text-muted uppercase tracking-wider leading-tight">{metric.label}</p>
                  <div className="w-6 h-6 rounded-md bg-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
                    <Icon size={12} className="text-emerald-400" />
                  </div>
                </div>
                <p className="text-xl font-bold font-mono text-text">
                  {metric.value}<span className="text-sm text-text-muted font-normal">{metric.unit}</span>
                </p>
                <p className="text-[10px] font-mono text-emerald-400 mt-1">{metric.change}</p>
                <p className="text-[10px] text-text-muted mt-0.5">{metric.description}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ============================================================ */}
      {/* Section 6: Outreach Message Log */}
      {/* ============================================================ */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <Send size={14} className="text-emerald-400" />
            </div>
            <h2 className="text-sm font-semibold text-text">Outreach Message Log</h2>
            <span className="text-xs font-mono text-text-muted">{filteredLog.length} messages</span>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={logVerticalFilter}
              onChange={(e) => setLogVerticalFilter(e.target.value)}
              className="bg-background border border-border rounded-lg px-3 py-1.5 text-xs text-text font-mono focus:border-emerald-500/50 focus:outline-none appearance-none cursor-pointer"
            >
              <option value="all">All Verticals</option>
              <option value="restaurant">Restaurant</option>
              <option value="medical">Medical</option>
            </select>
            <select
              value={logChannelFilter}
              onChange={(e) => setLogChannelFilter(e.target.value)}
              className="bg-background border border-border rounded-lg px-3 py-1.5 text-xs text-text font-mono focus:border-emerald-500/50 focus:outline-none appearance-none cursor-pointer"
            >
              <option value="all">All Channels</option>
              <option value="email">Email</option>
              <option value="instagram_dm">Instagram DM</option>
            </select>
          </div>
        </div>

        {/* Log Header */}
        <div className="grid grid-cols-[70px_40px_1fr_90px_70px_1fr_90px] gap-3 px-3 py-2 text-[10px] font-mono text-text-muted uppercase tracking-wider border-b border-border">
          <span>Date</span>
          <span>Time</span>
          <span>Business</span>
          <span>Vertical</span>
          <span>Channel</span>
          <span>Message</span>
          <span>Response</span>
        </div>

        {/* Log Rows */}
        <div className="divide-y divide-border/30 max-h-[400px] overflow-y-auto">
          {filteredLog.map((entry) => (
            <div
              key={entry.id}
              className={`grid grid-cols-[70px_40px_1fr_90px_70px_1fr_90px] gap-3 px-3 py-2.5 items-center transition-colors hover:bg-white/[0.02] ${
                entry.gotResponse ? "bg-emerald-500/[0.02]" : ""
              }`}
            >
              <span className="text-xs font-mono text-text-muted">{entry.date}</span>
              <span className="text-[10px] font-mono text-text-muted">{entry.time}</span>
              <span className="text-xs text-text truncate">{entry.business}</span>
              <span className="text-[10px] text-text-muted capitalize">{entry.vertical}</span>
              <ChannelBadge channel={entry.channel} />
              <p className="text-[11px] text-text-muted truncate">{entry.preview}</p>
              <div>
                {entry.gotResponse && entry.responseCategory ? (
                  <ResponseBadge category={entry.responseCategory} />
                ) : (
                  <span className="text-[10px] font-mono text-text-muted/50">—</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
