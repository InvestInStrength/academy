import { afterEach, describe, expect, it, vi } from "vitest";

import {
  buildPipelineBody,
  extractCount,
  inMemoryRateLimit,
  rateLimit,
  redisRestCredentials,
} from "../rate-limit";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("redisRestCredentials — both naming conventions", () => {
  it("reads the explicit Upstash names", () => {
    expect(
      redisRestCredentials({
        UPSTASH_REDIS_REST_URL: "https://a.upstash.io",
        UPSTASH_REDIS_REST_TOKEN: "tok-a",
      }),
    ).toEqual({ url: "https://a.upstash.io", token: "tok-a" });
  });

  it("reads the Vercel Marketplace KV names (the production case)", () => {
    expect(
      redisRestCredentials({
        KV_REST_API_URL: "https://b.upstash.io",
        KV_REST_API_TOKEN: "tok-b",
      }),
    ).toEqual({ url: "https://b.upstash.io", token: "tok-b" });
  });

  it("prefers the explicit Upstash names when both are present", () => {
    expect(
      redisRestCredentials({
        UPSTASH_REDIS_REST_URL: "https://explicit.upstash.io",
        UPSTASH_REDIS_REST_TOKEN: "tok-explicit",
        KV_REST_API_URL: "https://kv.upstash.io",
        KV_REST_API_TOKEN: "tok-kv",
      }),
    ).toEqual({ url: "https://explicit.upstash.io", token: "tok-explicit" });
  });

  it("strips a trailing slash so `${url}/pipeline` never double-slashes", () => {
    expect(
      redisRestCredentials({
        KV_REST_API_URL: "https://c.upstash.io/",
        KV_REST_API_TOKEN: "tok-c",
      })?.url,
    ).toBe("https://c.upstash.io");
  });

  it("returns null when either half is missing or empty", () => {
    expect(redisRestCredentials({})).toBeNull();
    expect(
      redisRestCredentials({ KV_REST_API_URL: "https://d.upstash.io" }),
    ).toBeNull();
    expect(
      redisRestCredentials({
        KV_REST_API_URL: "",
        KV_REST_API_TOKEN: "tok-d",
      }),
    ).toBeNull();
  });

  it("never falls back to the read-only token (INCR would fail)", () => {
    expect(
      redisRestCredentials({
        KV_REST_API_URL: "https://e.upstash.io",
        KV_REST_API_READ_ONLY_TOKEN: "tok-readonly",
      }),
    ).toBeNull();
  });
});

describe("inMemoryRateLimit", () => {
  it("allows up to the limit then denies within the window", () => {
    const key = `mem-${Math.random()}`;
    expect(inMemoryRateLimit(key, 3, 60_000)).toBe(true);
    expect(inMemoryRateLimit(key, 3, 60_000)).toBe(true);
    expect(inMemoryRateLimit(key, 3, 60_000)).toBe(true);
    expect(inMemoryRateLimit(key, 3, 60_000)).toBe(false);
  });

  it("keeps counters independent per key", () => {
    expect(inMemoryRateLimit(`a-${Math.random()}`, 1, 60_000)).toBe(true);
    expect(inMemoryRateLimit(`b-${Math.random()}`, 1, 60_000)).toBe(true);
  });
});

describe("buildPipelineBody", () => {
  it("namespaces nothing itself but bumps then sets TTL once", () => {
    expect(buildPipelineBody("k", 60_000)).toEqual([
      ["INCR", "k"],
      ["PEXPIRE", "k", 60_000, "NX"],
    ]);
  });
});

describe("extractCount", () => {
  it("reads the INCR result from a pipeline response", () => {
    expect(extractCount([{ result: 4 }, { result: 1 }])).toBe(4);
  });

  it("returns null on unexpected shapes", () => {
    expect(extractCount(null)).toBeNull();
    expect(extractCount([])).toBeNull();
    expect(extractCount([{ error: "boom" }])).toBeNull();
    expect(extractCount("nope")).toBeNull();
  });
});

describe("rateLimit — durable backend", () => {
  function stubUpstash(fetchImpl: typeof fetch) {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://example.upstash.io");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "tok");
    vi.stubGlobal("fetch", fetchImpl);
  }

  it("allows when the durable count is within the limit", async () => {
    stubUpstash(
      vi.fn(async () =>
        new Response(JSON.stringify([{ result: 2 }, { result: 1 }]), {
          status: 200,
        }),
      ) as unknown as typeof fetch,
    );
    expect(await rateLimit("durable-ok", 5, 60_000)).toBe(true);
  });

  it("denies when the durable count exceeds the limit", async () => {
    stubUpstash(
      vi.fn(async () =>
        new Response(JSON.stringify([{ result: 6 }, { result: 0 }]), {
          status: 200,
        }),
      ) as unknown as typeof fetch,
    );
    expect(await rateLimit("durable-over", 5, 60_000)).toBe(false);
  });

  it("falls back to in-memory when the Redis call throws", async () => {
    stubUpstash(
      vi.fn(async () => {
        throw new Error("network down");
      }) as unknown as typeof fetch,
    );
    // First call allowed via the in-memory fallback.
    expect(await rateLimit(`durable-fail-${Math.random()}`, 1, 60_000)).toBe(true);
  });

  it("falls back to in-memory on a non-OK HTTP response", async () => {
    stubUpstash(
      vi.fn(async () => new Response("nope", { status: 500 })) as unknown as typeof fetch,
    );
    expect(await rateLimit(`durable-500-${Math.random()}`, 1, 60_000)).toBe(true);
  });
});

describe("rateLimit — no Upstash configured", () => {
  it("uses the in-memory backend", async () => {
    // Clear BOTH naming conventions: leaving KV_* unstubbed would let a
    // developer machine with the Vercel integration pulled locally hit real
    // Redis and make this test pass for the wrong reason.
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
    vi.stubEnv("KV_REST_API_URL", "");
    vi.stubEnv("KV_REST_API_TOKEN", "");
    const key = `unset-${Math.random()}`;
    expect(await rateLimit(key, 1, 60_000)).toBe(true);
    expect(await rateLimit(key, 1, 60_000)).toBe(false);
  });
});
