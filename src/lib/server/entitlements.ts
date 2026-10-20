// Server-only: purchase records and AI Crafter quota, stored in Supabase with
// the service-role key (tables have RLS on and no public policies).
import { createClient, SupabaseClient } from "@supabase/supabase-js";

export const CRAFTER_DAILY_LIMIT = 3;

let adminClient: SupabaseClient | null | undefined;

export function getSupabaseAdmin(): SupabaseClient | null {
  if (adminClient !== undefined) return adminClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  adminClient =
    url && serviceKey
      ? createClient(url, serviceKey, { auth: { persistSession: false } })
      : null;
  return adminClient;
}

const PLAYER_ID_RE = /^[a-zA-Z0-9-]{8,64}$/;
export function isValidPlayerId(value: unknown): value is string {
  return typeof value === "string" && PLAYER_ID_RE.test(value);
}

export interface EntitlementRow {
  id: string;
  player_id: string;
  email: string | null;
  stripe_session_id: string;
  product: string;
  created_at: string;
}

/** Records a paid checkout. Idempotent on stripe_session_id. */
export async function recordPurchase(params: {
  playerId: string;
  email: string | null;
  stripeSessionId: string;
}): Promise<void> {
  const db = getSupabaseAdmin();
  if (!db) throw new Error("Supabase admin client is not configured");
  const { error } = await db.from("entitlements").upsert(
    {
      player_id: params.playerId,
      email: params.email?.toLowerCase() ?? null,
      stripe_session_id: params.stripeSessionId,
      product: "expansion",
    },
    { onConflict: "stripe_session_id", ignoreDuplicates: true }
  );
  if (error) throw new Error(error.message);
}

/** The purchase that grants this player the Expansion, if any. */
export async function findEntitlementForPlayer(
  playerId: string
): Promise<EntitlementRow | null> {
  const db = getSupabaseAdmin();
  if (!db) return null;
  const { data: direct } = await db
    .from("entitlements")
    .select("*")
    .eq("player_id", playerId)
    .eq("product", "expansion")
    .limit(1)
    .maybeSingle();
  if (direct) return direct as EntitlementRow;

  // Devices linked through "restore purchase"
  const { data: link } = await db
    .from("entitlement_devices")
    .select("entitlement_id")
    .eq("player_id", playerId)
    .limit(1)
    .maybeSingle();
  if (!link) return null;
  const { data: linked } = await db
    .from("entitlements")
    .select("*")
    .eq("id", link.entitlement_id)
    .maybeSingle();
  return (linked as EntitlementRow) ?? null;
}

/** Links a new device to an existing purchase found by the buyer's email. */
export async function restoreByEmail(
  email: string,
  playerId: string
): Promise<boolean> {
  const db = getSupabaseAdmin();
  if (!db) return false;
  const { data: purchase } = await db
    .from("entitlements")
    .select("id")
    .eq("email", email.toLowerCase())
    .eq("product", "expansion")
    .limit(1)
    .maybeSingle();
  if (!purchase) return false;
  const { error } = await db
    .from("entitlement_devices")
    .upsert(
      { entitlement_id: purchase.id, player_id: playerId },
      { onConflict: "player_id", ignoreDuplicates: false }
    );
  return !error;
}

/** Email of the signed-in Supabase user behind an access token, if valid. */
export async function getVerifiedEmail(
  accessToken: string
): Promise<string | null> {
  const db = getSupabaseAdmin();
  if (!db) return null;
  const { data, error } = await db.auth.getUser(accessToken);
  if (error || !data.user?.email || !data.user.email_confirmed_at) return null;
  return data.user.email;
}

/**
 * Reserves one AI Crafter use for today against the purchase (not the device),
 * so linking extra devices doesn't raise the limit. Each use claims a slot
 * 1..CRAFTER_DAILY_LIMIT under a unique (entitlement_id, date_key, slot)
 * constraint, so concurrent requests can't exceed the limit. Returns remaining
 * uses, or null when today's limit is reached.
 */
export async function consumeCrafterUse(
  entitlementId: string,
  dateKey: string
): Promise<number | null> {
  const db = getSupabaseAdmin();
  if (!db) return null;
  for (let slot = 1; slot <= CRAFTER_DAILY_LIMIT; slot++) {
    const { error } = await db
      .from("crafter_usage")
      .insert({ entitlement_id: entitlementId, date_key: dateKey, slot });
    if (!error) return CRAFTER_DAILY_LIMIT - slot;
    // 23505 = unique_violation: slot already taken, try the next one
    if (error.code !== "23505") return null;
  }
  return null;
}
