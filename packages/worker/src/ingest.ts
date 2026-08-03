import {
  buildEvent,
  clientSignalSchema,
  createCloudflareSink,
} from "@career/analytics";
import type { EdgeRequestInfo } from "@career/analytics";
import { toDataPoint } from "./data-point";
import type { Env } from "./types";

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

/**
 * Maps a Worker Request to the platform-agnostic edge metadata the
 * analytics boundary understands. request.cf is Cloudflare-specific —
 * the boundary itself never touches it.
 */
function fromRequest(request: Request): EdgeRequestInfo {
  const url = new URL(request.url);
  const cf = (request as Request & { cf?: Record<string, unknown> }).cf;
  return {
    path: url.pathname,
    cfCountry: typeof cf?.country === "string" ? cf.country : null,
    cfCity: typeof cf?.city === "string" ? cf.city : null,
    cfRegion: typeof cf?.region === "string" ? cf.region : null,
    cfContinent: typeof cf?.continent === "string" ? cf.continent : null,
    refererHeader: request.headers.get("Referer"),
    uaHeader: request.headers.get("User-Agent"),
  };
}

/**
 * Public ingest endpoint (POST /api/analytics).
 *
 * The browser sends a ClientSignal plus `version` (and a best-effort
 * `timestamp`, which is discarded — the server stamps time). Any field
 * outside the client contract fails the strict schema and the event is
 * rejected before it can reach storage.
 */
export async function handleIngest(request: Request, env: Env): Promise<Response> {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }
  if (typeof payload !== "object" || payload === null) {
    return json({ error: "invalid_payload" }, 400);
  }

  const record = payload as Record<string, unknown>;
  const { version: clientVersion, timestamp: _ignored, ...signalFields } = record;

  const signalResult = clientSignalSchema.safeParse(signalFields);
  if (!signalResult.success) {
    return json({ error: "invalid_signal" }, 400);
  }

  const version =
    typeof clientVersion === "string" && clientVersion.length > 0
      ? clientVersion
      : "unknown";

  const event = buildEvent(signalResult.data, fromRequest(request), version);
  const sink = createCloudflareSink((e) => {
    env.ANALYTICS.writeDataPoint(toDataPoint(e));
  });
  await sink.write(event);

  return json({ ok: true }, 202);
}
