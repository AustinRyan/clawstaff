/**
 * ClawStaff Client Database (JSON file MVP)
 *
 * Stores client records in ~/clawstaff/clients.json.
 * TODO: Migrate to Postgres when scaling past ~50 clients.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import { homedir } from "os";

export interface Client {
  clientId: string;
  businessName: string;
  ownerName: string;
  email: string;
  vertical: string;
  agentName: string;
  stripeCustomerId: string;
  subscriptionId: string;
  tier: "founding" | "starter" | "pro" | "enterprise";
  status: "active" | "past_due" | "canceled" | "churned";
  createdAt: string;
  updatedAt: string;
}

interface ClientsDB {
  clients: Client[];
}

const CLAWSTAFF_DIR = join(homedir(), "clawstaff");
const DB_PATH = join(CLAWSTAFF_DIR, "clients.json");

function ensureDir() {
  if (!existsSync(CLAWSTAFF_DIR)) {
    mkdirSync(CLAWSTAFF_DIR, { recursive: true });
  }
}

function readDB(): ClientsDB {
  ensureDir();
  if (!existsSync(DB_PATH)) {
    return { clients: [] };
  }
  const raw = readFileSync(DB_PATH, "utf-8");
  const parsed = JSON.parse(raw);
  // Handle legacy format that might have extra keys
  return { clients: Array.isArray(parsed.clients) ? parsed.clients : [] };
}

function writeDB(db: ClientsDB) {
  ensureDir();
  writeFileSync(DB_PATH, JSON.stringify(db, null, 2) + "\n");
}

function generateId(): string {
  return `cl_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

// ─── CRUD ──────────────────────────────────────────────────

export function createClient(
  data: Omit<Client, "clientId" | "createdAt" | "updatedAt">
): Client {
  const db = readDB();
  const now = new Date().toISOString();
  const client: Client = {
    clientId: generateId(),
    ...data,
    createdAt: now,
    updatedAt: now,
  };
  db.clients.push(client);
  writeDB(db);
  return client;
}

export function getClientByStripeCustomer(
  stripeCustomerId: string
): Client | undefined {
  const db = readDB();
  return db.clients.find((c) => c.stripeCustomerId === stripeCustomerId);
}

export function getClientBySubscription(
  subscriptionId: string
): Client | undefined {
  const db = readDB();
  return db.clients.find((c) => c.subscriptionId === subscriptionId);
}

export function getClient(clientId: string): Client | undefined {
  const db = readDB();
  return db.clients.find((c) => c.clientId === clientId);
}

export function updateClient(
  clientId: string,
  updates: Partial<Omit<Client, "clientId" | "createdAt">>
): Client | undefined {
  const db = readDB();
  const idx = db.clients.findIndex((c) => c.clientId === clientId);
  if (idx === -1) return undefined;
  db.clients[idx] = {
    ...db.clients[idx],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  writeDB(db);
  return db.clients[idx];
}

export function updateClientByStripeCustomer(
  stripeCustomerId: string,
  updates: Partial<Omit<Client, "clientId" | "createdAt">>
): Client | undefined {
  const db = readDB();
  const idx = db.clients.findIndex(
    (c) => c.stripeCustomerId === stripeCustomerId
  );
  if (idx === -1) return undefined;
  db.clients[idx] = {
    ...db.clients[idx],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  writeDB(db);
  return db.clients[idx];
}

export function updateClientBySubscription(
  subscriptionId: string,
  updates: Partial<Omit<Client, "clientId" | "createdAt">>
): Client | undefined {
  const db = readDB();
  const idx = db.clients.findIndex((c) => c.subscriptionId === subscriptionId);
  if (idx === -1) return undefined;
  db.clients[idx] = {
    ...db.clients[idx],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  writeDB(db);
  return db.clients[idx];
}

export function listClients(): Client[] {
  return readDB().clients;
}
