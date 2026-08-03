/**
 * Minimal bindings contract. Keep it dependency-light so the package
 * typechecks under the workspace root config (Node types) and under
 * @cloudflare/workers-types (editor).
 */

export interface AnalyticsEngineDataPoint {
  /** Strings — dimensions for grouping/filtering. Positional; see data-point.ts. */
  blobs?: string[];
  doubles?: number[];
  /** Exactly one string — the sampling key (per-session sampling). */
  indexes?: string[];
}

export interface AnalyticsEngineDataset {
  writeDataPoint(point: AnalyticsEngineDataPoint): void;
}

export interface Env {
  ANALYTICS: AnalyticsEngineDataset;
  /** Dashboard secret. Read via `wrangler secret put ANALYTICS_KEY`. */
  ANALYTICS_KEY: string;
  /** Cloudflare account ID (wrangler.toml [vars]). */
  ACCOUNT_ID: string;
  /** API token with Account Analytics Read. `wrangler secret put ANALYTICS_API_TOKEN`. */
  ANALYTICS_API_TOKEN: string;
}

export type QueryRow = Record<string, unknown>;

export type QueryResult = QueryRow[];
