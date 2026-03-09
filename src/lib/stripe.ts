import Stripe from "stripe";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2026-02-25.clover",
      typescript: true,
    });
  }
  return _stripe;
}

export const PLANS = {
  founding: {
    name: "Founding Member",
    price: 99,
    priceId: () => process.env.STRIPE_PRICE_FOUNDING!,
    features: [
      "1 dedicated AI agent",
      "1 channel",
      "Full skill stack",
      "Early-access pricing locked in",
      "Email support",
    ],
  },
  starter: {
    name: "Starter",
    price: 299,
    priceId: () => process.env.STRIPE_PRICE_STARTER!,
    features: [
      "1 dedicated AI agent",
      "1 channel (WhatsApp or Slack)",
      "Basic skill stack",
      "Daily summaries",
      "Email support",
    ],
  },
  pro: {
    name: "Pro",
    price: 499,
    priceId: () => process.env.STRIPE_PRICE_PRO!,
    features: [
      "1 dedicated AI agent",
      "3 connected channels",
      "Full skill stack",
      "Custom SOUL.md tuning",
      "Priority support",
    ],
  },
  enterprise: {
    name: "Enterprise",
    price: 799,
    priceId: () => process.env.STRIPE_PRICE_ENTERPRISE!,
    features: [
      "Multiple AI agents",
      "All channels",
      "Custom skill development",
      "Dedicated account management",
      "SLA guarantee",
      "Custom integrations",
    ],
  },
} as const;

export type PlanKey = keyof typeof PLANS;
