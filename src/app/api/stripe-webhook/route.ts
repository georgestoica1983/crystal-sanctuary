import { NextRequest, NextResponse } from "next/server";
import {
  StripeCheckoutSession,
  verifyStripeSignature,
} from "@/lib/server/stripe";
import { isValidPlayerId, recordPurchase } from "@/lib/server/entitlements";

/**
 * Stripe webhook: records the Expansion purchase when a Checkout completes.
 * Configure the endpoint in Stripe for `checkout.session.completed` and
 * `checkout.session.async_payment_succeeded`.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }
  const rawBody = await request.text();
  if (
    !verifyStripeSignature(rawBody, request.headers.get("stripe-signature"), secret)
  ) {
    return NextResponse.json({ error: "bad_signature" }, { status: 400 });
  }

  const event = JSON.parse(rawBody) as {
    type: string;
    data: { object: StripeCheckoutSession };
  };
  if (
    event.type === "checkout.session.completed" ||
    event.type === "checkout.session.async_payment_succeeded"
  ) {
    const session = event.data.object;
    const playerId = session.client_reference_id;
    if (
      session.payment_status === "paid" &&
      session.metadata?.product === "expansion" &&
      isValidPlayerId(playerId)
    ) {
      try {
        await recordPurchase({
          playerId,
          email: session.customer_details?.email ?? null,
          stripeSessionId: session.id,
        });
      } catch (err) {
        console.error("[stripe-webhook]", err);
        // Non-2xx makes Stripe retry the delivery
        return NextResponse.json({ error: "store_failed" }, { status: 500 });
      }
    }
  }
  return NextResponse.json({ received: true });
}
