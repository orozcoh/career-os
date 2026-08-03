import { createAnalytics } from "@career/analytics";
import { createCloudflareProvider } from "@career/analytics/providers/cloudflare";
import type { AnalyticsProvider } from "@career/analytics";
import { RELEASE_VERSION } from "./lib/version";

/**
 * Analytics composition root — the ONLY file that knows which providers
 * are active. Pages and components depend on the @career/analytics
 * interface, never on concrete providers.
 *
 * The Cloudflare provider POSTs signals to the Worker's public ingest
 * endpoint (/api/analytics); the Worker enriches and stores them in
 * Analytics Engine. Storage is an implementation detail the app never sees.
 */
export const providers: readonly AnalyticsProvider[] = [
  createCloudflareProvider({ version: RELEASE_VERSION }),
];

export const analytics = createAnalytics(providers);
