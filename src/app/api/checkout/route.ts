import { NextRequest, NextResponse } from "next/server";
import {
  createExpansionCheckoutSession,
  isStripeConfigured,
} from "@/lib/server/stripe";
import { getSupabaseAdmin, isValidPlayerId } from "@/lib/server/entitlements";

/** Starts a Stripe Checkout for the one-time Expansion. */
export async function POST(request: NextRequest) {
  if (!isStripeConfigured() || !getSupabaseAdmin()) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }
  const body = await request.json().catch(() => ({}));
  if (!isValidPlayerId(body.playerId)) {
    return NextResponse.json({ error: "invalid_player" }, { status: 400 });
  }
  const origin = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
  try {
    const session = await createExpansionCheckoutSession({
      playerId: body.playerId,
      origin,
    });
    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("[checkout]", err);
    return NextResponse.json({ error: "checkout_failed" }, { status: 502 });
  }
}
