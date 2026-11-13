import { describe, expect, it } from "vitest";
import { clientKey, createRateLimiter } from "./rate-limit";

describe("createRateLimiter", () => {
  it("allows `limit` takes, then blocks with retryAfterSec, per key, and resets after the window", () => {
    let t = 1_000;
    const rl = createRateLimiter({ limit: 2, windowMs: 60_000, now: () => t });
    expect(rl.take("a")).toEqual({ ok: true });
    expect(rl.take("a")).toEqual({ ok: true });
    t += 10_500;
    expect(rl.take("a")).toEqual({ ok: false, retryAfterSec: 50 });
    expect(rl.take("b")).toEqual({ ok: true });
    t += 50_000;
    expect(rl.take("a")).toEqual({ ok: true });
  });
});

describe("clientKey", () => {
  it("uses the first x-forwarded-for entry, trimmed", () => {
    const req = new Request("http://x.test", { headers: { "x-forwarded-for": " 203.0.113.9 , 10.0.0.1" } });
    expect(clientKey(req)).toBe("203.0.113.9");
  });
  it("falls back to unknown", () => {
    expect(clientKey(new Request("http://x.test"))).toBe("unknown");
  });
});
