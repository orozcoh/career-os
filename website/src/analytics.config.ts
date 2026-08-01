import { createAnalytics, noopProvider } from "@career/analytics";
import type { AnalyticsProvider } from "@career/analytics";

/**
 * Analytics composition root — the ONLY file that knows which providers
 * are active. Pages and components depend on the @career/analytics
 * interface, never on concrete providers.
 *
 * To activate a provider (Plausible, Umami, a Cloudflare Worker beacon):
 * implement AnalyticsProvider and add it to this array. No call site changes.
 */
export const providers: readonly AnalyticsProvider[] = [noopProvider];

export const analytics = createAnalytics(providers);
