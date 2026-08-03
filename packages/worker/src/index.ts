import { validateKey } from "./auth";
import { handleIngest } from "./ingest";
import {
  getCities,
  getCountries,
  getFunnel,
  getLanguages,
  getLive,
  getResumes,
  getSummary,
  runQuery,
} from "./query";
import type { Env } from "./types";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

async function handleAdmin(request: Request, env: Env): Promise<Response> {
  if (!validateKey(request, env)) {
    return json({ error: "unauthorized" }, 401);
  }
  const url = new URL(request.url);
  const route = url.pathname.replace(/^\/api\/admin\/analytics/, "") || "/summary";

  try {
    switch (route) {
      case "/summary":
        return json(await getSummary(env));
      case "/resumes":
        return json(await getResumes(env));
      case "/countries":
        return json(await getCountries(env));
      case "/cities":
        return json(await getCities(env));
      case "/languages":
        return json(await getLanguages(env));
      case "/funnel":
        return json(await getFunnel(env));
      case "/live":
        return json(await getLive(env));
      case "/ping":
        // Read-only connectivity probe for the dashboard.
        await runQuery(env, "SELECT 1 AS ok");
        return json({ ok: true });
      default:
        return json({ error: "not_found" }, 404);
    }
  } catch (error) {
    return json({ error: "query_failed", message: error instanceof Error ? error.message : "unknown" }, 500);
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Public: event ingestion from the browser.
    if (request.method === "POST" && url.pathname === "/api/analytics") {
      return handleIngest(request, env);
    }

    // Private: read-only dashboard API, key-protected.
    if (request.method === "GET" && url.pathname.startsWith("/api/admin/analytics")) {
      return handleAdmin(request, env);
    }

    return json({ error: "not_found" }, 404);
  },
};
