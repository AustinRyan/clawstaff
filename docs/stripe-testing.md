# Stripe Testing Guide

## Prerequisites

1. [Stripe account](https://dashboard.stripe.com) (test mode)
2. [Stripe CLI](https://stripe.com/docs/stripe-cli) installed
3. Test keys in `.env.local`:
   ```
   STRIPE_SECRET_KEY=sk_test_...
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
   ```

## Setup

### 1. Create Products & Prices

```bash
npx tsx scripts/setup-stripe.ts
```

This creates 4 products in Stripe test mode and writes price IDs to `.env.local`:
- Founding Member: $99/mo
- Starter: $299/mo
- Pro: $499/mo
- Enterprise: $799/mo

### 2. Start Webhook Forwarding

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Copy the `whsec_...` signing secret and add it to `.env.local`:
```
STRIPE_WEBHOOK_SECRET=whsec_...
```

### 3. Start the App

```bash
npm run dev
```

## Testing the Checkout Flow

### Via API (curl)

```bash
curl -X POST http://localhost:3000/api/stripe/create-checkout \
  -H "Content-Type: application/json" \
  -d '{"plan": "starter"}'
```

Open the returned `url` in your browser.

### Test Card Numbers

| Card | Result |
|------|--------|
| `4242 4242 4242 4242` | Success |
| `4000 0000 0000 3220` | 3D Secure required |
| `4000 0000 0000 0002` | Declined |
| `4000 0000 0000 9995` | Insufficient funds |

Use any future expiry date, any CVC, any ZIP.

### What Happens on Checkout

1. Stripe sends `checkout.session.completed` webhook
2. Webhook creates a client record in `~/clawstaff/clients.json`
3. Record includes: tier, Stripe customer ID, subscription ID, status

### Verify Client Record

```bash
cat ~/clawstaff/clients.json | python3 -m json.tool
```

## Testing Subscription Changes

### Upgrade/Downgrade

Use the Customer Portal:
```bash
curl -X POST http://localhost:3000/api/stripe/portal \
  -H "Content-Type: application/json" \
  -d '{"customerId": "cus_..."}'
```

Or trigger from Stripe Dashboard > Customers > select customer > edit subscription.

### Cancel Subscription

Via Stripe Dashboard or Customer Portal. Triggers `customer.subscription.deleted` webhook, which sets client status to `churned`.

### Failed Payment

Trigger via Stripe CLI:
```bash
stripe trigger invoice.payment_failed
```

Sets client status to `past_due`.

## Webhook Events Handled

| Event | Action |
|-------|--------|
| `checkout.session.completed` | Create client record |
| `customer.subscription.updated` | Update tier and status |
| `customer.subscription.deleted` | Mark as churned |
| `invoice.payment_failed` | Mark as past_due |

## Client Database

MVP uses a JSON file at `~/clawstaff/clients.json`. Schema:

```json
{
  "clientId": "cl_...",
  "businessName": "...",
  "ownerName": "...",
  "email": "...",
  "vertical": "restaurant",
  "agentName": "Maya",
  "stripeCustomerId": "cus_...",
  "subscriptionId": "sub_...",
  "tier": "starter",
  "status": "active",
  "createdAt": "2026-03-07T...",
  "updatedAt": "2026-03-07T..."
}
```

## File Reference

| File | Purpose |
|------|---------|
| `scripts/setup-stripe.ts` | Creates products/prices in Stripe |
| `src/lib/stripe.ts` | Stripe client + PLANS config |
| `src/lib/clients/index.ts` | Client record CRUD (JSON file) |
| `src/app/api/stripe/webhook/route.ts` | Webhook handler |
| `src/app/api/stripe/create-checkout/route.ts` | Creates checkout sessions |
| `src/app/api/stripe/portal/route.ts` | Creates portal sessions |
