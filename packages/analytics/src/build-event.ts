import type { ClientSignal, EdgeRequestInfo, TrackedEvent } from "./types";
import { trackedEventSchema } from "./schema";

/** ISO 3166-1 alpha-2 → full country name, via the platform Intl database. */
const regionNames = new Intl.DisplayNames(["en"], { type: "region" });

function countryName(code: string | null | undefined): string | null {
  if (!code) return null;
  if (!/^[A-Za-z]{2}$/.test(code)) return null;
  try {
    const name = regionNames.of(code.toUpperCase());
    // Intl returns the code itself when it doesn't know it — treat as unknown.
    return name && name !== code.toUpperCase() ? name : null;
  } catch {
    return null;
  }
}

/** "https://www.linkedin.com/in/x?utm_source=y" → "linkedin.com" */
export function reduceReferrer(referer: string | null | undefined): string | null {
  if (!referer) return null;
  try {
    const hostname = new URL(referer).hostname;
    if (!hostname) return null;
    return hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

/**
 * Reduces a raw User-Agent string to a browser family.
 * Order matters: Edge/Opera tokens contain "Chrome", Chrome contains "Safari".
 */
export function reduceUserAgent(ua: string | null | undefined): string | null {
  if (!ua) return null;
  if (/Edg(e|A|iOS)?\//.test(ua)) return "Edge";
  if (/(OPR|Opera)\//.test(ua)) return "Opera";
  if (/Firefox\/|FxiOS\//.test(ua)) return "Firefox";
  if (/(Chrome|CriOS)\//.test(ua)) return "Chrome";
  if (/Safari\//.test(ua) && /Version\//.test(ua)) return "Safari";
  return null;
}

/**
 * Purely maps a client signal + edge request metadata to a storable event.
 * No I/O, no globals (clock is injectable), fully unit-testable.
 * Output is validated against the privacy schema before it leaves here.
 */
export function buildEvent(
  signal: ClientSignal,
  edge: EdgeRequestInfo,
  version: string,
): TrackedEvent {
  const base = {
    timestamp: (edge.now ?? new Date()).toISOString(),
    country: countryName(edge.cfCountry),
    city: edge.cfCity?.trim() || null,
    referrer: reduceReferrer(edge.refererHeader),
    user_agent: reduceUserAgent(edge.uaHeader),
    version,
  };

  const event: TrackedEvent =
    signal.type === "page_view"
      ? { ...base, type: "page_view", path: signal.path, resume: null }
      : signal.type === "resume_view"
        ? { ...base, type: "resume_view", resume: signal.resume }
        : signal.type === "resume_download"
          ? { ...base, type: "resume_download", resume: signal.resume, format: signal.format }
          : { ...base, type: "outbound_click", target: signal.target, resume: signal.resume };

  // The schema is strict: any accidental extra field throws here,
  // at the boundary, instead of reaching storage.
  return trackedEventSchema.parse(event) as TrackedEvent;
}
