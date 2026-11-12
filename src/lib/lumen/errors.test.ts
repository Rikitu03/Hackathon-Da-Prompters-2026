import { describe, expect, it } from "vitest";
import { LumenError, classifyLumenError, lumenErrorToHttp } from "./errors";

describe("classifyLumenError", () => {
  it.each([
    [401, "INVALID_API_CREDENTIALS", "auth"],
    [403, "ACCESS_DENIED", "auth"],
    [403, "SESSION_NOT_OWNED", "auth"],
    [403, "API_CREDITS_INSUFFICIENT", "credits"],
    [403, "LC_INSUFFICIENT", "credits"],
    [429, "AI_CHAT_MODEL_RATE_LIMITED", "rate_limited"],
    [504, "AI_CHAT_REPLY_TIMEOUT", "timeout"],
    [503, "OCR_READ_QUEUE_FULL", "unavailable"],
    [404, "AI_CHAT_SESSION_NOT_FOUND", "not_found"],
    [400, "AI_CHAT_QUERY_TOO_LONG", "bad_request"],
    [409, "AI_CHAT_CONFLICT", "bad_request"],
    [502, "AI_CHAT_MODEL_UPSTREAM_ERROR", "upstream"],
    [500, undefined, "upstream"],
  ] as const)("%i %s -> %s", (status, code, kind) => {
    expect(classifyLumenError(status, code)).toBe(kind);
  });
});

describe("lumenErrorToHttp", () => {
  it("hides credential problems behind a generic 502", () => {
    expect(lumenErrorToHttp(new LumenError("auth", 401))).toEqual({ status: 502, message: "AI service unavailable." });
  });
  it("maps credits and unavailability to 503", () => {
    expect(lumenErrorToHttp(new LumenError("credits", 403)).status).toBe(503);
    expect(lumenErrorToHttp(new LumenError("unavailable", 503)).status).toBe(503);
    expect(lumenErrorToHttp(new LumenError("unconfigured")).status).toBe(503);
  });
  it("maps rate limits to 429 and timeouts to 504", () => {
    expect(lumenErrorToHttp(new LumenError("rate_limited", 429)).status).toBe(429);
    expect(lumenErrorToHttp(new LumenError("timeout")).status).toBe(504);
  });
  it("treats our own bad request as a 500", () => {
    expect(lumenErrorToHttp(new LumenError("bad_request", 400)).status).toBe(500);
  });
});
