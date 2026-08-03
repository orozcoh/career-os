import { describe, expect, it } from "vitest";
import { validateKey } from "../src/auth";
import type { Env } from "../src/types";

const env = { ANALYTICS_KEY: "secret-123" } as Env;

describe("validateKey", () => {
  it("accepts the correct key", () => {
    const request = new Request("https://cv.orozcoh.com/api/admin/analytics/summary", {
      headers: { "X-Analytics-Key": "secret-123" },
    });
    expect(validateKey(request, env)).toBe(true);
  });

  it("rejects a missing key", () => {
    const request = new Request("https://cv.orozcoh.com/api/admin/analytics/summary");
    expect(validateKey(request, env)).toBe(false);
  });

  it("rejects a wrong key", () => {
    const request = new Request("https://cv.orozcoh.com/api/admin/analytics/summary", {
      headers: { "X-Analytics-Key": "nope" },
    });
    expect(validateKey(request, env)).toBe(false);
  });
});
