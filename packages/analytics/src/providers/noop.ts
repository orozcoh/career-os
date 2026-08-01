import type { AnalyticsProvider, EventSink } from "../types";

/**
 * The default provider: accepts every signal and does nothing.
 * This is what the application ships with — zero network, zero JS emitted,
 * zero storage — until a real provider is registered in analytics.config.ts.
 */
export const noopProvider: AnalyticsProvider = {
  name: "noop",
  track: () => {},
};

/** The default sink: accepts every event and persists nothing. */
export const noopSink: EventSink = {
  name: "noop",
  write: async () => {},
};
