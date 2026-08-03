import { describe, expect, it } from "vitest";
import { toDataPoint } from "../src/data-point";
import type { TrackedEvent } from "@career/analytics";

const base = {
  timestamp: "2026-08-03T12:00:00.000Z",
  session_id: "11111111-2222-3333-4444-555555555555",
  language: "en" as const,
  country: "Colombia",
  city: "Medellín",
  region: "Antioquia",
  continent: "South America",
  referrer: "linkedin.com",
  user_agent: "Chrome",
  version: "0.2.0",
};

describe("toDataPoint", () => {
  it("maps a resume_download event positionally (14 blobs, 1 index)", () => {
    const event: TrackedEvent = {
      ...base,
      type: "resume_download",
      resume: "software-engineer",
      format: "pdf",
    };
    const point = toDataPoint(event);

    expect(point.blobs).toEqual([
      "resume_download", // blob1 event
      "software-engineer", // blob2 resume
      "en", // blob3 language
      "pdf", // blob4 format
      "Colombia", // blob5 country
      "Medellín", // blob6 city
      "Antioquia", // blob7 region
      "South America", // blob8 continent
      "0.2.0", // blob9 version
      "11111111-2222-3333-4444-555555555555", // blob10 session
      "", // blob11 path (absent)
      "", // blob12 target (absent)
      "linkedin.com", // blob13 referrer
      "Chrome", // blob14 user_agent
    ]);
    expect(point.indexes).toEqual(["11111111-2222-3333-4444-555555555555"]);
  });

  it("fills path for page_view and target for outbound_click", () => {
    const pageView = toDataPoint({ ...base, type: "page_view", path: "/en/", resume: null });
    expect(pageView.blobs?.[10]).toBe("/en/");
    expect(pageView.blobs?.[1]).toBe("");

    const outbound = toDataPoint({
      ...base,
      type: "outbound_click",
      target: "github",
      resume: "master",
    });
    expect(outbound.blobs?.[11]).toBe("github");
    expect(outbound.blobs?.[1]).toBe("master");
  });

  it("nulls out missing geo fields as empty strings", () => {
    const event: TrackedEvent = {
      ...base,
      country: null,
      city: null,
      region: null,
      continent: null,
      referrer: null,
      user_agent: null,
      type: "resume_view",
      resume: "frontend",
    };
    const point = toDataPoint(event);
    expect(point.blobs?.slice(4, 8)).toEqual(["", "", "", ""]);
    expect(point.blobs?.slice(12, 14)).toEqual(["", ""]);
  });
});
