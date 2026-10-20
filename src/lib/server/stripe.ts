// Server-only: talks to the Stripe REST API with fetch (no SDK dependency).
import crypto from "node:crypto";

const STRIPE_API = "https://api.stripe.com/v1";

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_ID);
}

async function stripeRequest<T>(
  method: "GET" | "POST",
  path: string,
  params?: Record<string, string>
): Promise<T> {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) throw new Error("STRIPE_SECRET_KEY is not set");

  const body = params ? new URLSearchParams(params).toString() : undefined;
  const res = await fetch(`${STRIPE_API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${secretKey}`,
      ...(body ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
    },
    body,
    cache: "no-store",
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json?.error?.message ?? `Stripe ${path} failed (${res.status})`);
  }
  return json as T;
}

export interface StripeCheckoutSession {
  id: string;
  url: string | null;
  payment_status: "paid" | "unpaid" | "no_payment_required";
  client_reference_id: string | null;
  customer_details?: { email?: string | null } | null;
  metadata?: Record<string, string> | null;
}

export function createExpansionCheckoutSession(params: {
  playerId: string;
  origin: string;
}): Promise<StripeCheckoutSession> {
  return stripeRequest<StripeCheckoutSession>("POST", "/checkout/sessions", {
    mode: "payment",
    "line_items[0][price]": process.env.STRIPE_PRICE_ID as string,
    "line_items[0][quantity]": "1",
    client_reference_id: params.playerId,
    "metadata[product]": "expansion",
    "metadata[player_id]": params.playerId,
    success_url: `${params.origin}/?purchase=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${params.origin}/?purchase=cancelled`,
  });
}

export function retrieveCheckoutSession(
  sessionId: string
): Promise<StripeCheckoutSession> {
  return stripeRequest<StripeCheckoutSession>(
    "GET",
    `/checkout/sessions/${encodeURIComponent(sessionId)}`
  );
}

/**
 * Verifies a `Stripe-Signature` header (v1 scheme: HMAC-SHA256 of
 * `${timestamp}.${rawBody}`), rejecting events older than `toleranceSec`.
 */
export function verifyStripeSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string,
  toleranceSec = 300,
  nowSec = Math.floor(Date.now() / 1000)
): boolean {
  if (!signatureHeader) return false;
  const parts = signatureHeader.split(",").map((p) => p.trim().split("="));
  const timestamp = parts.find(([k]) => k === "t")?.[1];
  const signatures = parts.filter(([k]) => k === "v1").map(([, v]) => v);
  if (!timestamp || signatures.length === 0) return false;
  if (Math.abs(nowSec - Number(timestamp)) > toleranceSec) return false;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`, "utf8")
    .digest("hex");
  const expectedBuf = Buffer.from(expected, "hex");
  return signatures.some((sig) => {
    const sigBuf = Buffer.from(sig, "hex");
    return (
      sigBuf.length === expectedBuf.length &&
      crypto.timingSafeEqual(sigBuf, expectedBuf)
    );
  });
}
