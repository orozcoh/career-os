import type { Env, QueryResult, QueryRow } from "./types";

/**
 * Analytics Engine has no in-Worker query binding: reads go through the
 * SQL API with an Account Analytics Read token. Only the Worker depends on
 * this storage detail — the browser only ever POSTs to the ingest endpoint.
 */

const DATASET = "cv-analytics";

const TABLE = (): string => "`" + DATASET + "`";

const EVENT_COLUMN = "blob1";
const RESUME_COLUMN = "blob2";
const LANGUAGE_COLUMN = "blob3";
const COUNTRY_COLUMN = "blob5";
const CITY_COLUMN = "blob6";
const VERSION_COLUMN = "blob9";

const ENGAGEMENT_EVENTS = "('resume_open', 'resume_view', 'resume_download')";

export const INTERVALS = {
  all: "",
  today: "WHERE timestamp >= NOW() - INTERVAL '1' DAY",
  week: "WHERE timestamp >= NOW() - INTERVAL '7' DAY",
} as const;

export async function runQuery(env: Env, sql: string): Promise<QueryResult> {
  const api = `https://api.cloudflare.com/client/v4/accounts/${env.ACCOUNT_ID}/analytics_engine/sql`;
  const response = await fetch(api, {
    method: "POST",
    headers: { Authorization: `Bearer ${env.ANALYTICS_API_TOKEN}` },
    body: sql,
  });
  if (!response.ok) {
    throw new Error(`Analytics Engine query failed (${response.status})`);
  }
  const body = (await response.json()) as { data?: QueryResult };
  return body.data ?? [];
}

function number(row: QueryRow | undefined, key: string): number {
  if (!row) return 0;
  const value = row[key];
  const n = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function string(row: QueryRow | undefined, key: string): string {
  if (!row) return "";
  const value = row[key];
  return value === null || value === undefined ? "" : String(value);
}

async function eventCounts(env: Env, where: string): Promise<Record<string, number>> {
  const rows = await runQuery(
    env,
    `SELECT ${EVENT_COLUMN} AS event, SUM(_sample_interval) AS count
     FROM ${TABLE()}
     ${where}
     GROUP BY ${EVENT_COLUMN}`,
  );
  const counts: Record<string, number> = {};
  for (const row of rows) {
    counts[string(row, "event")] = number(row, "count");
  }
  return counts;
}

export interface EventTotals {
  pageViews: number;
  opens: number;
  views: number;
  downloads: number;
  outboundClicks: number;
}

function shape(counts: Record<string, number>): EventTotals {
  return {
    pageViews: counts["page_view"] ?? 0,
    opens: counts["resume_open"] ?? 0,
    views: counts["resume_view"] ?? 0,
    downloads: counts["resume_download"] ?? 0,
    outboundClicks: counts["outbound_click"] ?? 0,
  };
}

export async function getSummary(env: Env) {
  const [all, today, week] = await Promise.all([
    eventCounts(env, INTERVALS.all),
    eventCounts(env, INTERVALS.today),
    eventCounts(env, INTERVALS.week),
  ]);
  return { totals: shape(all), today: shape(today), week: shape(week) };
}

async function groupedCounts(env: Env, groupColumn: string): Promise<Map<string, EventTotals>> {
  const rows = await runQuery(
    env,
    `SELECT ${groupColumn} AS name, ${EVENT_COLUMN} AS event, SUM(_sample_interval) AS count
     FROM ${TABLE()}
     WHERE ${EVENT_COLUMN} IN ${ENGAGEMENT_EVENTS}
     GROUP BY ${groupColumn}, ${EVENT_COLUMN}`,
  );
  const byName = new Map<string, EventTotals>();
  for (const row of rows) {
    const name = string(row, "name");
    if (!name) continue;
    const entry = byName.get(name) ?? { pageViews: 0, opens: 0, views: 0, downloads: 0, outboundClicks: 0 };
    const count = number(row, "count");
    if (row["event"] === "resume_open") entry.opens += count;
    else if (row["event"] === "resume_view") entry.views += count;
    else if (row["event"] === "resume_download") entry.downloads += count;
    byName.set(name, entry);
  }
  return byName;
}

export async function getResumes(env: Env) {
  const byResume = await groupedCounts(env, RESUME_COLUMN);
  return [...byResume.entries()]
    .map(([resume, counts]) => ({ resume, opens: counts.opens, views: counts.views, downloads: counts.downloads }))
    .sort((a, b) => b.downloads - a.downloads);
}

async function getLocations(env: Env, column: string): Promise<Array<{ name: string; opens: number; views: number; downloads: number }>> {
  const byName = await groupedCounts(env, column);
  return [...byName.entries()]
    .map(([name, counts]) => ({ name, opens: counts.opens, views: counts.views, downloads: counts.downloads }))
    .sort((a, b) => b.downloads - a.downloads)
    .slice(0, 10);
}

export function getCountries(env: Env) {
  return getLocations(env, COUNTRY_COLUMN);
}

export function getCities(env: Env) {
  return getLocations(env, CITY_COLUMN);
}

export async function getLanguages(env: Env) {
  const rows = await runQuery(
    env,
    `SELECT ${LANGUAGE_COLUMN} AS language, ${EVENT_COLUMN} AS event, SUM(_sample_interval) AS count
     FROM ${TABLE()}
     WHERE ${EVENT_COLUMN} IN ${ENGAGEMENT_EVENTS}
     GROUP BY ${LANGUAGE_COLUMN}, ${EVENT_COLUMN}`,
  );
  const byLang = new Map<string, { views: number; downloads: number }>();
  for (const row of rows) {
    const language = string(row, "language");
    if (!language) continue;
    const entry = byLang.get(language) ?? { views: 0, downloads: 0 };
    const count = number(row, "count");
    if (row["event"] === "resume_view") entry.views += count;
    else if (row["event"] === "resume_download") entry.downloads += count;
    byLang.set(language, entry);
  }
  return [...byLang.entries()].map(([language, counts]) => ({ language, ...counts }));
}

export async function getFunnel(env: Env) {
  const counts = await eventCounts(env, INTERVALS.all);
  return {
    opens: counts["resume_open"] ?? 0,
    views: counts["resume_view"] ?? 0,
    downloads: counts["resume_download"] ?? 0,
  };
}

export interface LiveEvent {
  timestamp: string;
  event: string;
  resume: string;
  language: string;
  format: string;
  country: string;
  city: string;
  version: string;
}

export async function getLive(env: Env): Promise<LiveEvent[]> {
  const rows = await runQuery(
    env,
    `SELECT timestamp, ${EVENT_COLUMN} AS event, ${RESUME_COLUMN} AS resume,
            ${LANGUAGE_COLUMN} AS language, blob4 AS format,
            ${COUNTRY_COLUMN} AS country, ${CITY_COLUMN} AS city,
            ${VERSION_COLUMN} AS version
     FROM ${TABLE()}
     WHERE timestamp >= NOW() - INTERVAL '1' DAY
     ORDER BY timestamp DESC
     LIMIT 50`,
  );
  return rows.map((row) => ({
    timestamp: string(row, "timestamp"),
    event: string(row, "event"),
    resume: string(row, "resume"),
    language: string(row, "language"),
    format: string(row, "format"),
    country: string(row, "country"),
    city: string(row, "city"),
    version: string(row, "version"),
  }));
}
