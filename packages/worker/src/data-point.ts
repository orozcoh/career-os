import type { TrackedEvent } from "@career/analytics";
import type { AnalyticsEngineDataPoint } from "./types";

/**
 * Column layout (positional, declared once — keep in sync with queries):
 *
 *   blob1  = event        (page_view | resume_open | resume_view | resume_download | outbound_click)
 *   blob2  = resume       (slug, "" for page_view)
 *   blob3  = language     (en | es)
 *   blob4  = format       (pdf | pdf-2col | docx, "" otherwise)
 *   blob5  = country      (full name, "" if unknown)
 *   blob6  = city         ("" if unknown)
 *   blob7  = region       ("" if unknown)
 *   blob8  = continent    ("" if unknown)
 *   blob9  = version      (resume release version)
 *   blob10 = session_id   (anonymous UUID)
 *   blob11 = path         (page_view only)
 *   blob12 = target       (outbound_click only)
 *   blob13 = referrer     (hostname only)
 *   blob14 = user_agent   (browser family only)
 *
 * index1 = session_id     (sampling key — events of one session sample together)
 */

const NO_VALUE = "";

export function toDataPoint(event: TrackedEvent): AnalyticsEngineDataPoint {
  const resume =
    event.type === "page_view" ? NO_VALUE : (event.resume ?? NO_VALUE);
  const format = event.type === "resume_download" ? event.format : NO_VALUE;
  const path = event.type === "page_view" ? event.path : NO_VALUE;
  const target = event.type === "outbound_click" ? event.target : NO_VALUE;

  return {
    blobs: [
      event.type,
      resume,
      event.language,
      format,
      event.country ?? NO_VALUE,
      event.city ?? NO_VALUE,
      event.region ?? NO_VALUE,
      event.continent ?? NO_VALUE,
      event.version,
      event.session_id,
      path,
      target,
      event.referrer ?? NO_VALUE,
      event.user_agent ?? NO_VALUE,
    ],
    doubles: [],
    indexes: [event.session_id],
  };
}
