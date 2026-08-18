import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getCities,
  getCountries,
  getFunnel,
  getLanguages,
  getLive,
  getResumes,
  getSummary,
  runQuery,
} from "../src/query";
import type { Env } from "../src/types";

function makeEnv(): Env {
  return {
    ANALYTICS_KEY: "secret",
    ACCOUNT_ID: "acct123",
    ANALYTICS_API_TOKEN: "token",
    ANALYTICS: { writeDataPoint: () => {} },
  } as Env;
}

function stubApi(data: Array<Record<string, unknown>>): void {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      new Response(JSON.stringify({ data }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    ),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("runQuery", () => {
  it("calls the SQL API with the account token and returns rows", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ data: [{ event: "resume_download", count: 3 }] }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const rows = await runQuery(makeEnv(), "SELECT 1 AS event");

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain("/accounts/acct123/analytics_engine/sql");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer token");
    expect(rows).toEqual([{ event: "resume_download", count: 3 }]);
  });

  it("throws when the SQL API fails", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("nope", { status: 401 })));
    await expect(runQuery(makeEnv(), "SELECT 1")).rejects.toThrow(/401/);
  });
});

describe("dashboard queries", () => {
  it("summary aggregates counts per window", async () => {
    stubApi([
      { event: "page_view", count: "10" },
      { event: "resume_download", count: "3" },
    ]);
    const summary = await getSummary(makeEnv());
    expect(summary.totals).toEqual({
      pageViews: 10,
      opens: 0,
      views: 0,
      downloads: 3,
      outboundClicks: 0,
    });
    expect(summary.today).toEqual(summary.totals);
    expect(summary.week).toEqual(summary.totals);
  });

  it("resumes groups opens/views/downloads per slug", async () => {
    stubApi([
      { name: "software-engineer", event: "resume_open", count: 5 },
      { name: "software-engineer", event: "resume_view", count: 8 },
      { name: "software-engineer", event: "resume_download", count: 4 },
      { name: "master", event: "resume_download", count: 2 },
    ]);
    const result = await getResumes(makeEnv());
    expect(result).toEqual([
      { resume: "software-engineer", opens: 5, views: 8, downloads: 4 },
      { resume: "master", opens: 0, views: 0, downloads: 2 },
    ]);
  });

  it("countries and cities sort by downloads, capped at 10", async () => {
    const rows = Array.from({ length: 12 }, (_, i) => ({
      name: `C${i}`,
      event: "resume_download",
      count: String(i + 1),
    }));
    stubApi(rows);
    const countries = await getCountries(makeEnv());
    expect(countries).toHaveLength(10);
    expect(countries[0]?.name).toBe("C11");
    expect(countries[9]?.name).toBe("C2");

    stubApi(rows);
    const cities = await getCities(makeEnv());
    expect(cities[0]?.name).toBe("C11");
  });

  it("languages reports views and downloads per locale", async () => {
    stubApi([
      { language: "en", event: "resume_view", count: 9 },
      { language: "en", event: "resume_download", count: 5 },
      { language: "es", event: "resume_view", count: 2 },
    ]);
    const result = await getLanguages(makeEnv());
    expect(result).toEqual([
      { language: "en", views: 9, downloads: 5 },
      { language: "es", views: 2, downloads: 0 },
    ]);
  });

  it("funnel returns raw open/view/download counts (all time by default)", async () => {
    stubApi([
      { event: "resume_open", count: 10 },
      { event: "resume_view", count: 6 },
      { event: "resume_download", count: 3 },
    ]);
    const funnel = await getFunnel(makeEnv());
    expect(funnel).toEqual({ opens: 10, views: 6, downloads: 3 });
  });

  it("funnel applies the requested time window to the query", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ data: [{ event: "resume_open", count: 2 }] }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await getFunnel(makeEnv(), "WHERE timestamp >= NOW() - INTERVAL '7' DAY");

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain("/analytics_engine/sql");
    expect(init.body).toContain("WHERE timestamp >= NOW() - INTERVAL '7' DAY");
  });

  it("live returns the last events with their dimensions", async () => {
    stubApi([
      {
        timestamp: "2026-08-03 12:00:00",
        event: "resume_download",
        resume: "frontend",
        language: "en",
        format: "pdf",
        country: "Colombia",
        city: "Medellín",
        version: "0.2.0",
      },
    ]);
    const live = await getLive(makeEnv());
    expect(live).toHaveLength(1);
    expect(live[0]).toMatchObject({
      event: "resume_download",
      resume: "frontend",
      format: "pdf",
      country: "Colombia",
    });
  });
});
