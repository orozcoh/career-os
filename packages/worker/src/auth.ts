import type { Env } from "./types";

/**
 * Validates the dashboard key. The Worker secret ANALYTICS_KEY must be
 * passed in the X-Analytics-Key header — lightweight protection for a
 * personal dashboard, no login system.
 */
export function validateKey(request: Request, env: Env): boolean {
  const key = request.headers.get("X-Analytics-Key");
  return typeof key === "string" && key.length > 0 && key === env.ANALYTICS_KEY;
}
