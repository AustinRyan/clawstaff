#!/usr/bin/env npx tsx
/**
 * ClawStaff — Stripe Test Mode Setup
 *
 * Creates products, prices, and Customer Portal config in Stripe test mode.
 * Outputs price IDs to .env.local so the app can use them immediately.
 *
 * Prerequisites:
 *   - STRIPE_SECRET_KEY set in .env.local (sk_test_...)
 *
 * Usage:
 *   npx tsx scripts/setup-stripe.ts
 */

import Stripe from "stripe";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve } from "path";

const ENV_PATH = resolve(__dirname, "../.env.local");

function loadEnv(): Record<string, string> {
  if (!existsSync(ENV_PATH)) return {};
  const lines = readFileSync(ENV_PATH, "utf-8").split("\n");
  const env: Record<string, string> = {};
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    env[trimmed.slice(0, eq)] = trimmed.slice(eq + 1);
  }
  return env;
}

function writeEnv(env: Record<string, string>) {
  const lines: string[] = [];
  for (const [key, value] of Object.entries(env)) {
    lines.push(`${key}=${value}`);
  }
  writeFileSync(ENV_PATH, lines.join("\n") + "\n");
}

const TIERS = [
  {
    key: "FOUNDING",
    name: "ClawStaff Founding Member",
    description: "Early-access tier. 1 agent, 1 channel, full skill stack.",
    price: 9900, // cents
    envKey: "STRIPE_PRICE_FOUNDING",
  },
  {
    key: "STARTER",
    name: "ClawStaff Starter",
    description: "1 agent, 1 channel (WhatsApp or Slack), basic skill stack, daily summaries.",
    price: 29900,
    envKey: "STRIPE_PRICE_STARTER",
  },
  {
    key: "PRO",
    name: "ClawStaff Pro",
    description: "1 agent, 3 channels, full skill stack, custom SOUL.md tuning, priority support.",
    price: 49900,
    envKey: "STRIPE_PRICE_PRO",
  },
  {
    key: "ENTERPRISE",
    name: "ClawStaff Enterprise",
    description: "Multiple agents, all channels, custom skill development, dedicated account management.",
    price: 79900,
    envKey: "STRIPE_PRICE_ENTERPRISE",
  },
];

async function main() {
  const env = loadEnv();

  const secretKey = env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY;
  if (!secretKey || !secretKey.startsWith("sk_test_")) {
    console.error("ERROR: STRIPE_SECRET_KEY must be set and start with sk_test_");
    console.error("Add it to .env.local first, then run this script again.");
    process.exit(1);
  }

  const stripe = new Stripe(secretKey, { apiVersion: "2026-02-25.clover" });

  console.log("\n--- ClawStaff Stripe Setup (Test Mode) ---\n");

  // Check for existing products to avoid duplicates
  const existingProducts = await stripe.products.list({ limit: 100, active: true });
  const existingByName = new Map(existingProducts.data.map((p) => [p.name, p]));

  for (const tier of TIERS) {
    let product: Stripe.Product;

    if (existingByName.has(tier.name)) {
      product = existingByName.get(tier.name)!;
      console.log(`Product exists: ${tier.name} (${product.id})`);
    } else {
      product = await stripe.products.create({
        name: tier.name,
        description: tier.description,
      });
      console.log(`Created product: ${tier.name} (${product.id})`);
    }

    // Check for existing price on this product
    const existingPrices = await stripe.prices.list({
      product: product.id,
      active: true,
      limit: 10,
    });

    const matchingPrice = existingPrices.data.find(
      (p) =>
        p.unit_amount === tier.price &&
        p.recurring?.interval === "month" &&
        p.currency === "usd"
    );

    let priceId: string;

    if (matchingPrice) {
      priceId = matchingPrice.id;
      console.log(`  Price exists: $${tier.price / 100}/mo (${priceId})`);
    } else {
      const price = await stripe.prices.create({
        product: product.id,
        unit_amount: tier.price,
        currency: "usd",
        recurring: { interval: "month" },
      });
      priceId = price.id;
      console.log(`  Created price: $${tier.price / 100}/mo (${priceId})`);
    }

    env[tier.envKey] = priceId;
  }

  // Resolve product IDs for portal config
  const allProducts = await stripe.products.list({ limit: 100, active: true });
  const productsByName = new Map(allProducts.data.map((p) => [p.name, p.id]));

  const portalProducts = TIERS
    .map((tier) => {
      const productId = productsByName.get(tier.name);
      if (!productId) return null;
      return { product: productId, prices: [env[tier.envKey]] };
    })
    .filter((p): p is { product: string; prices: string[] } => p !== null);

  // Customer Portal configuration
  console.log("\nConfiguring Customer Portal...");
  try {
    await stripe.billingPortal.configurations.create({
      business_profile: {
        headline: "ClawStaff — Manage Your Subscription",
      },
      features: {
        subscription_update: {
          enabled: true,
          default_allowed_updates: ["price"],
          products: portalProducts,
        },
        subscription_cancel: {
          enabled: true,
          mode: "at_period_end",
        },
        payment_method_update: {
          enabled: true,
        },
        invoice_history: {
          enabled: true,
        },
      },
    });
    console.log("  Customer Portal configured.");
  } catch (err) {
    console.log(`  Portal config note: ${err instanceof Error ? err.message : err}`);
  }

  // Write updated env
  writeEnv(env);
  console.log(`\nPrice IDs written to .env.local`);

  console.log("\n--- Summary ---\n");
  for (const tier of TIERS) {
    console.log(`  ${tier.name}: $${tier.price / 100}/mo → ${env[tier.envKey]}`);
  }

  console.log("\nNext steps:");
  console.log("  1. Start Stripe CLI webhook forwarding:");
  console.log("     stripe listen --forward-to localhost:3000/api/stripe/webhook");
  console.log("  2. Copy the webhook signing secret (whsec_...) to .env.local");
  console.log("  3. Test checkout: use card 4242 4242 4242 4242");
  console.log("");
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
