/**
 * Anonymous play tracking for tester rounds (PostHog, free tier).
 * Off unless NEXT_PUBLIC_POSTHOG_KEY is set. No names, emails or IPs:
 * each device gets a random id, and events carry only game facts.
 */
const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY ?? "";
const HOST = (process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com").replace(/\/$/, "");
const DEVICE_ID_KEY = "ost_device_id_v1";

/** Link testers open from ☰ → Send feedback (e.g. a Google Form) */
export const FEEDBACK_URL = process.env.NEXT_PUBLIC_FEEDBACK_URL ?? "";

export const analyticsEnabled = KEY.length > 0;

function deviceId(): string {
  try {
    let id = window.localStorage.getItem(DEVICE_ID_KEY);
    if (!id) {
      id = `d-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
      window.localStorage.setItem(DEVICE_ID_KEY, id);
    }
    return id;
  } catch {
    return "d-anonymous";
  }
}

export type TrackEvent =
  | "app_open"
  | "walkthrough_start"
  | "walkthrough_skip"
  | "walkthrough_done"
  | "line_drawn"
  | "bed_cleared"
  | "shop_buy"
  | "shop_prune"
  | "run_over"
  | "feedback_open";

export function track(event: TrackEvent, props: Record<string, string | number | boolean | null> = {}): void {
  if (!analyticsEnabled || typeof window === "undefined") return;
  try {
    void fetch(`${HOST}/capture/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      body: JSON.stringify({
        api_key: KEY,
        event,
        distinct_id: deviceId(),
        properties: {
          ...props,
          $process_person_profile: false,
          $ip: null,
          screen_w: window.innerWidth,
          screen_h: window.innerHeight,
        },
        timestamp: new Date().toISOString(),
      }),
    }).catch(() => undefined);
  } catch {
    // Tracking must never break the game
  }
}
