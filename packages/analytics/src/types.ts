/**
 * Analytics boundary — types only. This package intentionally has ZERO
 * dependencies on the rest of the monorepo: the domain never leaks into
 * analytics, and analytics never leaks into the domain.
 *
 * Two sides of the contract:
 *
 *   ClientSignal   — what the browser may signal (small, non-identifying)
 *   TrackedEvent   — what may be persisted (server-enriched, privacy-reduced)
 *
 * PRIVACY CONTRACT (enforced by schema + buildEvent, see README):
 *   - No IP storage.   Geo comes from edge metadata only.
 *   - No fingerprinting. No client IDs, no storage APIs, no correlation keys —
 *     events can never be linked to each other (aggregate counts only).
 *   - No cookies.      Nothing in this pipeline may set or read cookies.
 *   - Data minimization. referrer → hostname; user agent → browser family;
 *     no coordinates, postal codes, ASNs, or raw headers.
 */

// ─── Client side ────────────────────────────────────────────────────────────

export type EventType = "page_view" | "resume_view" | "resume_download" | "outbound_click";

export type ClientSignal =
  | { type: "page_view"; path: string }
  | { type: "resume_view"; resume: string }
  | { type: "resume_download"; resume: string; format: "pdf" | "docx" }
  /** target is a coarse label ("github", "linkedin"), never a raw URL. */
  | { type: "outbound_click"; target: string; resume: string | null };

/**
 * A client-side provider receives signals from the browser.
 * Script-based providers (Plausible, Umami) implement init() to inject
 * their snippet; beacon-based providers implement track() to POST signals.
 */
export interface AnalyticsProvider {
  readonly name: string;
  init?(): void | Promise<void>;
  track(signal: ClientSignal): void | Promise<void>;
}

// ─── Server side ────────────────────────────────────────────────────────────

interface TrackedBase {
  /** ISO 8601 UTC, set by the sink at write time — never by the client. */
  timestamp: string;
  /** Full country name ("Colombia"), derived from edge metadata. */
  country: string | null;
  /** City name ("Bogotá"), derived from edge metadata. */
  city: string | null;
  /** Hostname only ("linkedin.com") — path and query are stripped. */
  referrer: string | null;
  /** Browser family only ("Chrome") — the raw UA string is discarded. */
  user_agent: string | null;
  /** Resume release version (root package.json version), stamped at build. */
  version: string;
}

export type TrackedEvent = TrackedBase &
  (
    | { type: "page_view"; path: string; resume: null }
    | { type: "resume_view"; resume: string }
    | { type: "resume_download"; resume: string; format: "pdf" | "docx" }
    | { type: "outbound_click"; target: string; resume: string | null }
  );

/**
 * A server-side sink persists enriched events.
 * Future implementations: Cloudflare Workers Analytics Engine, D1, …
 */
export interface EventSink {
  readonly name: string;
  write(event: TrackedEvent): Promise<void>;
}

/**
 * Platform-agnostic view of an incoming edge request — everything
 * buildEvent needs, nothing more. A Cloudflare adapter fills this from
 * request.cf + request.headers; tests fill it literally.
 */
export interface EdgeRequestInfo {
  path: string;
  /** ISO 3166-1 alpha-2 country code from edge metadata, e.g. "CO". */
  cfCountry?: string | null;
  /** City name from edge metadata, e.g. "Bogotá". */
  cfCity?: string | null;
  /** Raw Referer header value (reduced to hostname by buildEvent). */
  refererHeader?: string | null;
  /** Raw User-Agent header value (reduced to family by buildEvent). */
  uaHeader?: string | null;
  /** Injectable clock for deterministic tests. Defaults to now. */
  now?: Date;
}
