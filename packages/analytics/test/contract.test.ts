import { describe, expect, it } from "vitest";
import { noopProvider, noopSink } from "../src/providers/noop";
import { createAnalytics } from "../src/registry";
import { clientSignalSchema, trackedEventSchema } from "../src/schema";
import type { AnalyticsProvider, ClientSignal, EventSink } from "../src/types";

const SESSION = "11111111-2222-3333-4444-555555555555";

const ALL_SIGNALS: ClientSignal[] = [
  { type: "page_view", path: "/", language: "en", session_id: SESSION },
  { type: "resume_open", resume: "frontend", language: "en", session_id: SESSION },
  { type: "resume_view", resume: "frontend", language: "en", session_id: SESSION },
  { type: "resume_download", resume: "frontend", format: "pdf", language: "en", session_id: SESSION },
  { type: "resume_download", resume: "frontend", format: "docx", language: "es", session_id: SESSION },
  { type: "outbound_click", target: "github", resume: null, language: "en", session_id: SESSION },
  { type: "outbound_click", target: "linkedin", resume: "frontend", language: "en", session_id: SESSION },
];

describe("no-op provider contract", () => {
  it("satisfies the AnalyticsProvider interface", () => {
    const provider: AnalyticsProvider = noopProvider;
    expect(provider.name).toBe("noop");
  });

  it("accepts and discards every v1 client signal", async () => {
    for (const signal of ALL_SIGNALS) {
      await expect(Promise.resolve(noopProvider.track(signal))).resolves.toBeUndefined();
    }
  });

  it("noopSink satisfies the EventSink interface and persists nothing", async () => {
    const sink: EventSink = noopSink;
    expect(sink.name).toBe("noop");
    await expect(
      sink.write({
        type: "resume_view",
        resume: "frontend",
        timestamp: new Date().toISOString(),
        session_id: SESSION,
        language: "en",
        country: null,
        city: null,
        region: null,
        continent: null,
        referrer: null,
        user_agent: null,
        version: "0.0.0-test",
      }),
    ).resolves.toBeUndefined();
  });

  it("the registry fans signals out to all providers", async () => {
    const seen: ClientSignal[] = [];
    const spy: AnalyticsProvider = { name: "spy", track: (s) => void seen.push(s) };
    const analytics = createAnalytics([noopProvider, spy]);
    for (const signal of ALL_SIGNALS) await analytics.track(signal);
    expect(seen).toEqual(ALL_SIGNALS);
  });
});

describe("client signal schema", () => {
  it("accepts every v1 signal shape", () => {
    for (const signal of ALL_SIGNALS) {
      expect(clientSignalSchema.safeParse(signal).success).toBe(true);
    }
  });

  it("rejects signals carrying extra (potentially identifying) fields", () => {
    const result = clientSignalSchema.safeParse({
      type: "resume_view",
      resume: "frontend",
      sessionId: "abc123",
    });
    expect(result.success).toBe(false);
  });
});

describe("tracked event schema (privacy contract enforcement)", () => {
  const base = {
    timestamp: "2026-07-31T20:15:10.000Z",
    session_id: SESSION,
    language: "en" as const,
    country: "Colombia",
    city: "Bogotá",
    region: "Bogotá D.C.",
    continent: "South America",
    referrer: "linkedin.com",
    user_agent: "Chrome",
    version: "1.0.2",
  };

  it("accepts a well-formed event for each type", () => {
    const events = [
      { ...base, type: "page_view", path: "/", resume: null },
      { ...base, type: "resume_open", resume: "frontend" },
      { ...base, type: "resume_view", resume: "frontend" },
      { ...base, type: "resume_download", resume: "frontend", format: "pdf" },
      { ...base, type: "outbound_click", target: "github", resume: null },
    ];
    for (const event of events) {
      expect(trackedEventSchema.safeParse(event).success).toBe(true);
    }
  });

  it("REJECTS events containing an IP address field", () => {
    const result = trackedEventSchema.safeParse({
      ...base,
      type: "resume_view",
      resume: "frontend",
      ip: "192.168.1.1",
    });
    expect(result.success).toBe(false);
  });

  it("REJECTS events containing coordinates or other precise geo", () => {
    for (const extra of [
      { latitude: "4.71", longitude: "-74.07" },
      { postalCode: "110111" },
      { asn: 14061 },
    ]) {
      const result = trackedEventSchema.safeParse({
        ...base,
        type: "resume_view",
        resume: "frontend",
        ...extra,
      });
      expect(result.success).toBe(false);
    }
  });

  it("rejects non-UTC timestamps", () => {
    const result = trackedEventSchema.safeParse({
      ...base,
      type: "resume_view",
      resume: "frontend",
      timestamp: "2026-07-31 20:15:10",
    });
    expect(result.success).toBe(false);
  });
});
