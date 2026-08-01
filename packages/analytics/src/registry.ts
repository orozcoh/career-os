import type { AnalyticsProvider, ClientSignal } from "./types";

export interface Analytics {
  init(): Promise<void>;
  track(signal: ClientSignal): Promise<void>;
}

/**
 * Composition root. The application holds an `Analytics` and never sees
 * concrete providers. Registering a new provider means editing exactly
 * one file (the app's analytics.config.ts) — never call sites.
 */
export function createAnalytics(providers: readonly AnalyticsProvider[]): Analytics {
  return {
    async init() {
      for (const provider of providers) {
        await provider.init?.();
      }
    },
    async track(signal) {
      await Promise.all(providers.map((provider) => provider.track(signal)));
    },
  };
}
