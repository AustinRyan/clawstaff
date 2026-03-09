// ---------------------------------------------------------------------------
// ClawStaff — Shared types for the agent data layer
// ---------------------------------------------------------------------------

export type Vertical =
  | "restaurant"
  | "realtor"
  | "fitness"
  | "medical"
  | "home-services"
  | "ecommerce";

// ---- Identity -------------------------------------------------------------

export interface AgentIdentity {
  agentId: string;
  agentName: string;
  businessName: string;
  ownerName: string;
  vertical: Vertical;
  role: string;
  communicationStyle: string;
  status: "online" | "offline" | "error";
  /** ISO date string of the first recorded session */
  activeSince: string;
}

// ---- Task buckets ---------------------------------------------------------

export interface TaskBucket {
  key: string;
  label: string;
  color: string;
  value: number;
}

// ---- Daily stats ----------------------------------------------------------

export interface DailyStats {
  /** YYYY-MM-DD */
  date: string;
  messages: number;
  avgResponseTimeSec: number;
  tasks: Record<string, number>;
}

// ---- Conversations --------------------------------------------------------

export interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
  /** ISO timestamp */
  timestamp: string;
}

export interface Conversation {
  id: string;
  channel: string;
  contact: string;
  preview: string;
  date: string;
  messages: ConversationMessage[];
}

// ---- Activity feed --------------------------------------------------------

export interface ActivityItem {
  /** ISO timestamp */
  time: string;
  text: string;
  type: "message" | "escalation" | "task" | "memory";
}

// ---- Aggregate stats ------------------------------------------------------

export interface AgentStats {
  identity: AgentIdentity;
  todayMessages: number;
  weekMessages: number;
  totalMessages: number;
  avgResponseTimeSec: number;
  taskBreakdown: TaskBucket[];
  dailyStats: DailyStats[];
  recentActivity: ActivityItem[];
  /** true when data comes from the mock fallback */
  isDemo: boolean;
}

// ---- Messages response (paginated) ----------------------------------------

export interface MessagesResponse {
  conversations: Conversation[];
  total: number;
  page: number;
  pageSize: number;
}

// ---- Memory entries (parsed from markdown) --------------------------------

export interface MemoryEntry {
  /** ISO timestamp (date + time from header) */
  timestamp: string;
  /** The section heading text (e.g. "New Lead: Silver Spring 3BR Search") */
  title: string;
  /** Full markdown body of the section */
  body: string;
}

// ---- Vertical-specific task definitions -----------------------------------

export const VERTICAL_TASKS: Record<
  Vertical,
  { key: string; label: string; color: string }[]
> = {
  restaurant: [
    { key: "inquiriesHandled", label: "Inquiries Handled", color: "#ff6b35" },
    {
      key: "reservationsManaged",
      label: "Reservations Managed",
      color: "#f7c948",
    },
    { key: "summariesSent", label: "Summaries Sent", color: "#22c55e" },
    {
      key: "questionsAnswered",
      label: "Questions Answered",
      color: "#3b82f6",
    },
  ],
  realtor: [
    {
      key: "leadsFollowedUp",
      label: "Leads Followed Up",
      color: "#ff6b35",
    },
    {
      key: "showingsScheduled",
      label: "Showings Scheduled",
      color: "#f7c948",
    },
    {
      key: "pipelineUpdates",
      label: "Pipeline Updates",
      color: "#22c55e",
    },
    { key: "briefingsSent", label: "Briefings Sent", color: "#3b82f6" },
  ],
  fitness: [
    { key: "inquiriesHandled", label: "Inquiries Handled", color: "#ff6b35" },
    { key: "classesBooked", label: "Classes Booked", color: "#f7c948" },
    {
      key: "membersReengaged",
      label: "Members Re-engaged",
      color: "#22c55e",
    },
    { key: "remindersSent", label: "Reminders Sent", color: "#3b82f6" },
  ],
  medical: [
    {
      key: "appointmentsConfirmed",
      label: "Appointments Confirmed",
      color: "#ff6b35",
    },
    {
      key: "noShowsRecovered",
      label: "No-Shows Recovered",
      color: "#f7c948",
    },
    {
      key: "patientsRebooked",
      label: "Patients Rebooked",
      color: "#22c55e",
    },
    { key: "inquiriesHandled", label: "Inquiries Handled", color: "#3b82f6" },
  ],
  "home-services": [
    { key: "leadsResponded", label: "Leads Responded", color: "#ff6b35" },
    {
      key: "estimateFollowUps",
      label: "Estimate Follow-ups",
      color: "#f7c948",
    },
    {
      key: "seasonalRemindersSent",
      label: "Seasonal Reminders",
      color: "#22c55e",
    },
    { key: "inquiriesHandled", label: "Inquiries Handled", color: "#3b82f6" },
  ],
  ecommerce: [
    {
      key: "supportTicketsHandled",
      label: "Support Tickets",
      color: "#ff6b35",
    },
    { key: "cartsRecovered", label: "Carts Recovered", color: "#f7c948" },
    {
      key: "reviewsCollected",
      label: "Reviews Collected",
      color: "#22c55e",
    },
    { key: "escalations", label: "Escalations", color: "#3b82f6" },
  ],
};
