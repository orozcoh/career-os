import { afterEach, describe, expect, it, vi } from "vitest";
import worker from "../src/index";
import type { Env } from "../src/types";

function makeEnv(): Env {
  return {
    ANALYTICS_KEY: "secret",
    ACCOUNT_ID: "acct123",
    ANALYTICS_API_TOKEN: "token",
    ANALYTICS: { writeDataPoint: () => {} },
  } as Env;
}

function get(path: string): Request {
  return new Request(`https://cv.orozcoh.com${path}`, {
    headers: { "X-Analytics-Key": "secret" },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("admin routes", () => {
  it("rejects requests without the dashboard key", async () => {
    const response = await worker.fetch(
      new Request("https://cv.orozcoh.com/api/admin/analytics/funnel"),
      makeEnv(),
    );
    expect(response.status).toBe(401);
  });

  it("rejects an unknown funnel window", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("nope", { status: 401 })),
    );
    const response = await worker.fetch(get("/api/admin/analytics/funnel?window=year"), makeEnv());
    expect(response.status).toBe(400);
    const body = (await response.json()) as { valid?: string[] };
    expect(body.valid).toEqual(["all", "today", "week"]);
  });

  it("accepts a valid funnel window and forwards it as a WHERE clause", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ data: [{ event: "resume_open", count: 2 }] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await worker.fetch(get("/api/admin/analytics/funnel?window=week"), makeEnv());
    expect(response.status).toBe(200);

    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(init.body).toContain("WHERE timestamp >= NOW() - INTERVAL '7' DAY");
  });
});