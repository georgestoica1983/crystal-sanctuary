import { NextRequest, NextResponse } from "next/server";
import { isStripeConfigured, retrieveCheckoutSession } from "@/lib/server/stripe";
import {
  findEntitlementForPlayer,
  getSupabaseAdmin,
  getVerifiedEmail,
  isValidPlayerId,
  recordPurchase,
  restoreByEmail,
} from "@/lib/server/entitlements";

/**
 * Returns whether this device owns the Expansion.
 * - `sessionId`: after returning from Checkout, confirm the payment with Stripe
 *   directly so the unlock doesn't wait for the webhook.
 * - `Authorization: Bearer <supabase access token>` + `restore: true`: link this
 *   device to a purchase made with the signed-in (email-verified) address.
 */
export async function POST(request: NextRequest) {
  if (!getSupabaseAdmin()) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }
  const body = await request.json().catch(() => ({}));
  const playerId = body.playerId;
  if (!isValidPlayerId(playerId)) {
    return NextResponse.json({ error: "invalid_player" }, { status: 400 });
  }

  if (typeof body.sessionId === "string" && isStripeConfigured()) {
    try {
      const session = await retrieveCheckoutSession(body.sessionId);
      if (
        session.payment_status === "paid" &&
        session.client_reference_id === playerId &&
        session.metadata?.product === "expansion"
      ) {
        await recordPurchase({
          playerId,
          email: session.customer_details?.email ?? null,
          stripeSessionId: session.id,
        });
      }
    } catch (err) {
      console.error("[entitlement] session check", err);
    }
  }

  let restored = false;
  if (body.restore === true) {
    const token = request.headers
      .get("authorization")
      ?.replace(/^Bearer\s+/i, "");
    const email = token ? await getVerifiedEmail(token) : null;
    if (!email) {
      return NextResponse.json({ error: "not_signed_in" }, { status: 401 });
    }
    restored = await restoreByEmail(email, playerId);
  }

  const entitlement = await findEntitlementForPlayer(playerId);
  return NextResponse.json({ expansion: Boolean(entitlement), restored });
}
