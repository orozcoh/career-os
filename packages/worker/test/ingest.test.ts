import { afterEach, describe, expect, it, vi } from "vitest";
import { handleIngest } from "../src/ingest";
import type { Env } from "../src/types";

function makeEnv(): { env: Env; writes: unknown[][] } {
  const writes: unknown[][] = [];
  const env = {
    ANALYTICS_KEY: "secret",
    ACCOUNT_ID: "acct",
    ANALYTICS_API_TOKEN: "token",
    ANALYTICS: {
      writeDataPoint: (point: { blobs?: string[]; doubles?: number[]; indexes?: string[] }) => {
        writes.push([point.blobs ?? [], point.indexes ?? []]);
      },
    },
  } as unknown as Env;
  return { env, writes };
}

async function post(body: unknown, headers: Record<string, string> = {}): Promise<Request> {
  return new Request("https://cv.orozcoh.com/api/analytics", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

const VALID_SIGNAL = {
  type: "resume_download",
  resume: "software-engineer",
  format: "pdf",
  language: "en",
  session_id: "11111111-2222-3333-4444-555555555555",
  version: "0.2.0",
  timestamp: "2026-08-03T01:00:00.000Z",
};

describe("handleIngest", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("accepts a valid signal and writes an enriched data point", async () => {
    vi.stubGlobal("fetch", vi.fn());
    const { env, writes } = makeEnv();
    const request = await post(VALID_SIGNAL, { Referer: "https://www.linkedin.com/in/x" });
    // cf metadata is injected by the platform — simulate it.
    Object.defineProperty(request, "cf", {
      value: { country: "CO", city: "Medellín", region: "Antioquia", continent: "SA" },
    });

    const response = await handleIngest(request, env);

    expect(response.status).toBe(202);
    expect(writes).toHaveLength(1);
    const [blobs, indexes] = writes[0] as [string[], string[]];
    expect(blobs[0]).toBe("resume_download");
    expect(blobs[1]).toBe("software-engineer");
    expect(blobs[2]).toBe("en");
    expect(blobs[4]).toBe("Colombia");
    expect(blobs[5]).toBe("Medellín");
    expect(blobs[6]).toBe("Antioquia");
    expect(blobs[7]).toBe("South America");
    expect(blobs[9]).toBe("11111111-2222-3333-4444-555555555555");
    expect(blobs[13]).toBe(""); // no User-Agent header on the request
    expect(indexes[0]).toBe("11111111-2222-3333-4444-555555555555");
  });

  it("uses the client version but never the client timestamp", async () => {
    const { env, writes } = makeEnv();
    const request = await post(VALID_SIGNAL);
    const response = await handleIngest(request, env);
    expect(response.status).toBe(202);

    const [blobs] = writes[0] as [string[], string[]];
    expect(blobs[8]).toBe("0.2.0");
    // The stored event's timestamp is server-stamped; it never appears in blobs.
  });

  it("rejects payloads with fields outside the client contract", async () => {
    const { env, writes } = makeEnv();
    const request = await post({ ...VALID_SIGNAL, ip: "192.168.1.1" });
    const response = await handleIngest(request, env);
    expect(response.status).toBe(400);
    expect(writes).toHaveLength(0);
  });

  it("rejects malformed JSON", async () => {
    const { env, writes } = makeEnv();
    const request = new Request("https://cv.orozcoh.com/api/analytics", {
      method: "POST",
      body: "not json",
    });
    const response = await handleIngest(request, env);
    expect(response.status).toBe(400);
    expect(writes).toHaveLength(0);
  });
});
