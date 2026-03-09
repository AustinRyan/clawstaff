import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import Stripe from "stripe";
import {
  createClient,
  getClientByStripeCustomer,
  updateClientBySubscription,
  updateClientByStripeCustomer,
} from "@/lib/clients";

function tierFromPriceId(priceId: string): "founding" | "starter" | "pro" | "enterprise" {
  const map: Record<string, "founding" | "starter" | "pro" | "enterprise"> = {
    [process.env.STRIPE_PRICE_FOUNDING!]: "founding",
    [process.env.STRIPE_PRICE_STARTER!]: "starter",
    [process.env.STRIPE_PRICE_PRO!]: "pro",
    [process.env.STRIPE_PRICE_ENTERPRISE!]: "enterprise",
  };
  return map[priceId] || "starter";
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = getStripe().webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Webhook signature verification failed";
    console.error(`Webhook signature error: ${message}`);
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const customerId = (session.customer as string) || "";
        const subscriptionId = (session.subscription as string) || "";
        const plan = (session.metadata?.plan || "starter") as "founding" | "starter" | "pro" | "enterprise";

        console.log(`[webhook] checkout.session.completed: customer=${customerId}, plan=${plan}`);

        if (!customerId) {
          console.log(`[webhook] No customer ID in session — skipping client record`);
          break;
        }

        // Don't create duplicate records
        const existing = getClientByStripeCustomer(customerId);
        if (existing) {
          console.log(`[webhook] Client already exists for ${customerId}, updating subscription`);
          updateClientByStripeCustomer(customerId, {
            subscriptionId,
            tier: plan,
            status: "active",
          });
        } else {
          // Fetch customer email from Stripe
          let email = session.customer_email || "";
          try {
            const customer = await getStripe().customers.retrieve(customerId);
            email = (customer as Stripe.Customer).email || email;
          } catch {
            // Customer may not exist in test mode triggers
          }

          createClient({
            businessName: session.metadata?.businessName || "",
            ownerName: session.metadata?.ownerName || "",
            email,
            vertical: session.metadata?.vertical || "",
            agentName: session.metadata?.agentName || "",
            stripeCustomerId: customerId,
            subscriptionId,
            tier: plan,
            status: "active",
          });
          console.log(`[webhook] Created client record for ${customerId}`);
        }
        break;
      }

      case "customer.subscription.created": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        const priceId = subscription.items.data[0]?.price?.id;
        const tier = priceId ? tierFromPriceId(priceId) : "starter";

        console.log(`[webhook] subscription.created: ${subscription.id}, customer=${customerId}, tier=${tier}`);

        if (!customerId) break;

        const existingSub = getClientByStripeCustomer(customerId);
        if (existingSub) {
          updateClientByStripeCustomer(customerId, {
            subscriptionId: subscription.id,
            tier,
            status: "active",
          });
        } else {
          // Fetch customer details from Stripe
          let email = "";
          let name = "";
          try {
            const customer = await getStripe().customers.retrieve(customerId);
            const cust = customer as Stripe.Customer;
            email = cust.email || "";
            name = cust.name || "";
          } catch {
            // ok
          }

          createClient({
            businessName: (subscription.metadata?.businessName as string) || "",
            ownerName: (subscription.metadata?.ownerName as string) || name,
            email,
            vertical: (subscription.metadata?.vertical as string) || "",
            agentName: (subscription.metadata?.agentName as string) || "",
            stripeCustomerId: customerId,
            subscriptionId: subscription.id,
            tier,
            status: "active",
          });
          console.log(`[webhook] Created client record for ${customerId}`);
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const priceId = subscription.items.data[0]?.price?.id;
        const newTier = priceId ? tierFromPriceId(priceId) : undefined;

        console.log(`[webhook] subscription.updated: ${subscription.id}, status=${subscription.status}, tier=${newTier}`);

        const updates: Record<string, unknown> = {
          status: subscription.status === "active" ? "active" : "past_due",
        };
        if (newTier) updates.tier = newTier;

        updateClientBySubscription(subscription.id, updates);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        console.log(`[webhook] subscription.deleted: ${subscription.id}`);

        updateClientBySubscription(subscription.id, {
          status: "churned",
        });
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        console.log(`[webhook] invoice.payment_failed: customer=${customerId}, invoice=${invoice.id}`);

        updateClientByStripeCustomer(customerId, {
          status: "past_due",
        });
        // TODO: Send notification to owner about failed payment
        break;
      }

      default:
        console.log(`[webhook] Unhandled event: ${event.type}`);
    }
  } catch (err) {
    console.error(`[webhook] Handler error: ${err}`);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({ received: true });
}
