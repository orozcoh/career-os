import { describe, expect, it } from "vitest";
import { buildEvent, reduceReferrer, reduceUserAgent } from "../src/build-event";

const NOW = new Date("2026-07-31T20:15:10.000Z");

describe("buildEvent", () => {
  it("maps a signal + edge metadata into the stored payload shape", () => {
    const event = buildEvent(
      { type: "resume_download", resume: "software-engineer", format: "pdf" },
      {
        path: "/go/software-engineer.pdf",
        cfCountry: "CO",
        cfCity: "Bogotá",
        refererHeader: "https://www.linkedin.com/in/someone?utm_source=feed",
        uaHeader:
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
        now: NOW,
      },
      "1.0.2",
    );

    expect(event).toEqual({
      type: "resume_download",
      resume: "software-engineer",
      format: "pdf",
      timestamp: "2026-07-31T20:15:10.000Z",
      country: "Colombia", // full name, mapped from "CO"
      city: "Bogotá",
      referrer: "linkedin.com", // hostname only, www stripped, path/query dropped
      user_agent: "Chrome", // family only
      version: "1.0.2",
    });
  });

  it("forces resume: null on landing page views", () => {
    const event = buildEvent(
      { type: "page_view", path: "/" },
      { path: "/", now: NOW },
      "1.0.2",
    );
    expect(event).toMatchObject({ type: "page_view", resume: null });
  });

  it("nulls out every field that cannot be privacy-safely derived", () => {
    const event = buildEvent(
      { type: "resume_view", resume: "master" },
      {
        path: "/master",
        cfCountry: "XX", // invalid code
        cfCity: "  ", // blank
        refererHeader: "not a url",
        uaHeader: "SomeObscureBot/1.0",
        now: NOW,
      },
      "1.0.2",
    );
    expect(event).toMatchObject({
      country: null,
      city: null,
      referrer: null,
      user_agent: null,
    });
  });

  it("uses the injected clock, never client-supplied time", () => {
    const event = buildEvent(
      { type: "resume_view", resume: "master" },
      { path: "/master", now: NOW },
      "1.0.2",
    );
    expect(event.timestamp).toBe("2026-07-31T20:15:10.000Z");
  });
});

describe("reduceReferrer", () => {
  it.each([
    ["https://www.linkedin.com/in/x?trk=abc", "linkedin.com"],
    ["https://news.ycombinator.com/item?id=1", "news.ycombinator.com"],
    ["https://google.com/", "google.com"],
    ["mailto:x@y.z", null],
    ["garbage", null],
    [null, null],
    [undefined, null],
  ])("%s → %s", (input, expected) => {
    expect(reduceReferrer(input)).toBe(expected);
  });
});

describe("reduceUserAgent", () => {
  it.each([
    ["Mozilla/5.0 (Windows NT 10.0) Chrome/126.0.0.0 Safari/537.36", "Chrome"],
    ["Mozilla/5.0 (iPhone) CriOS/126.0.0.0 Mobile/15E148 Safari/604.1", "Chrome"],
    ["Mozilla/5.0 (Windows NT 10.0) Edg/126.0.0.0", "Edge"],
    ["Mozilla/5.0 (X11; Linux x86_64; rv:127.0) Gecko/20100101 Firefox/127.0", "Firefox"],
    ["Mozilla/5.0 (Macintosh) AppleWebKit/605.1.15 Version/17.5 Safari/605.1.15", "Safari"],
    ["Mozilla/5.0 Opera/9.80", "Opera"],
    ["curl/8.7.1", null],
    [null, null],
  ])("reduces %s → %s", (input, expected) => {
    expect(reduceUserAgent(input)).toBe(expected);
  });
});
