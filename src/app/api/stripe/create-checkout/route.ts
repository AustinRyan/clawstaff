import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripe, PLANS, type PlanKey } from "@/lib/stripe";

export async function POST(req: NextRequest) {
  try {
    const { plan, customerId } = (await req.json()) as {
      plan: PlanKey;
      customerId?: string;
    };

    if (!plan || !PLANS[plan]) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const params: Stripe.Checkout.SessionCreateParams = {
      mode: "subscription",
      line_items: [
        {
          price: PLANS[plan].priceId(),
          quantity: 1,
        },
      ],
      success_url: `${appUrl}/dashboard/settings?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/pricing`,
      metadata: {
        plan,
      },
    };

    if (customerId) {
      params.customer = customerId;
    }

    const session = await getStripe().checkout.sessions.create(params);

    return NextResponse.json({ url: session.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
