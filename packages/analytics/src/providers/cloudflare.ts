import type { AnalyticsProvider, ClientSignal, EventSink, TrackedEvent } from "../types";

/**
 * Cloudflare provider — the browser half of the analytics pipeline.
 *
 * The provider exposes the same track(signal) API as any other provider;
 * callers never see where events go. Events are POSTed to the Worker's
 * public ingest endpoint via navigator.sendBeacon (fire-and-forget, safe
 * during page unload). The Worker enriches and stores them in Analytics
 * Engine — storage is an implementation detail.
 *
 * This module is browser-safe by design (no Node, no zod) so the website
 * bundles it directly into the client.
 */

export const SESSION_STORAGE_KEY = "cv_sid";

export interface CloudflareProviderOptions {
  /** Same-origin ingest endpoint. Defaults to "/api/analytics". */
  endpoint?: string;
  /** Resume release version stamped on every event. */
  version: string;
  /** localStorage key holding the anonymous session id. */
  sessionKey?: string;
}

/**
 * Returns the anonymous session id, creating + persisting one if absent.
 * A random UUID used solely to distinguish repeat visits from unique
 * visitors in the same browser. Never identifying.
 */
export function getOrCreateSessionId(key: string = SESSION_STORAGE_KEY): string {
  try {
    const existing = localStorage.getItem(key);
    if (existing) return existing;
  } catch {
    /* storage unavailable — keep an ephemeral id */
  }
  const id = crypto.randomUUID();
  try {
    localStorage.setItem(key, id);
  } catch {
    /* ephemeral */
  }
  return id;
}

export function createCloudflareProvider(options: CloudflareProviderOptions): AnalyticsProvider {
  const endpoint = options.endpoint ?? "/api/analytics";
  const sessionKey = options.sessionKey ?? SESSION_STORAGE_KEY;

  return {
    name: "cloudflare",
    init(): void {
      getOrCreateSessionId(sessionKey);
    },
    track(signal: ClientSignal): void {
      const payload = {
        ...signal,
        session_id: getOrCreateSessionId(sessionKey),
        version: options.version,
        timestamp: new Date().toISOString(),
      };
      const body = JSON.stringify(payload);
      // sendBeacon survives page unload; fetch(keepalive) is the fallback.
      const beacon = (
        navigator as Navigator & {
          sendBeacon?: (url: string, data: string | Blob | ArrayBufferView | FormData | URLSearchParams) => boolean;
        }
      ).sendBeacon;
      if (typeof beacon === "function") {
        beacon(endpoint, body);
      } else {
        fetch(endpoint, { method: "POST", body, keepalive: true }).catch(() => {});
      }
    },
  };
}

export type DataPointWriter = (event: TrackedEvent) => void | Promise<void>;

/**
 * Server half: writes enriched TrackedEvents somewhere. The Worker injects
 * a writer backed by Analytics Engine; tests inject a spy.
 */
export function createCloudflareSink(write: DataPointWriter): EventSink {
  return {
    name: "cloudflare",
    write: async (event) => {
      await write(event);
    },
  };
}
